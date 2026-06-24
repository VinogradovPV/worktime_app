/**
 * SyncService — главный сервис для управления синхронизацией
 * Отправляет события на API, обрабатывает ошибки, управляет retry логикой
 */

import { 
  SyncEventPayload, 
  SyncResponse, 
  WorkEvent, 
  SyncResult,
  SyncConfig,
} from '@/shared/types/sync';
import {
  buildApiUrl,
  apiEndpoints,
  getApiHeaders,
  getSyncConfig,
} from '@/lib/_core/sync-config';
import {
  getPendingEvents,
  updateEventSyncStatus,
  removeEventFromQueue,
  incrementSyncAttempts,
  saveSyncError,
  updateLastSyncTime,
} from '@/lib/services/sync-storage';

/**
 * Результат попытки синхронизации
 */
interface SyncAttemptResult {
  success: boolean;
  error?: string;
  retryable: boolean; // Можно ли повторить попытку
  statusCode?: number;
}

/**
 * SyncService класс
 */
export class SyncService {
  private config: SyncConfig;
  private userId: string;
  private deviceId: string;
  private appVersion: string = '1.0.0';
  private isSyncing: boolean = false;
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  constructor(userId: string, deviceId: string, config?: SyncConfig) {
    this.userId = userId;
    this.deviceId = deviceId;
    this.config = config || getSyncConfig();
  }

  /**
   * Инициализировать сервис
   */
  async initialize(): Promise<void> {
    console.log('[SyncService] Инициализация для пользователя:', this.userId);
    
    if (this.config.auto_sync_enabled) {
      this.startAutoSync();
    }
  }

  /**
   * Завершить работу сервиса
   */
  async shutdown(): Promise<void> {
    console.log('[SyncService] Завершение работы');
    this.stopAutoSync();
  }

  /**
   * Начать автоматическую синхронизацию
   */
  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      const pending = await getPendingEvents(this.userId);
      if (pending.length > 0) {
        await this.sync();
      }
    }, this.config.auto_sync_interval_ms);

    console.log('[SyncService] Автосинхронизация запущена');
  }

  /**
   * Остановить автоматическую синхронизацию
   */
  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('[SyncService] Автосинхронизация остановлена');
    }
  }

  /**
   * Выполнить синхронизацию
   */
  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.warn('[SyncService] Синхронизация уже в процессе');
      return {
        success: false,
        synced_count: 0,
        failed_count: 0,
        conflict_count: 0,
        errors: [],
        timestamp: new Date().toISOString(),
      };
    }

    this.isSyncing = true;
    console.log('[SyncService] Начало синхронизации');

    try {
      const pending = await getPendingEvents(this.userId);
      
      if (pending.length === 0) {
        console.log('[SyncService] Нет событий для синхронизации');
        return {
          success: true,
          synced_count: 0,
          failed_count: 0,
          conflict_count: 0,
          errors: [],
          timestamp: new Date().toISOString(),
        };
      }

      // Разделить события на батчи
      const batches = this.splitIntoBatches(pending, this.config.batch_size);
      const result: SyncResult = {
        success: true,
        synced_count: 0,
        failed_count: 0,
        conflict_count: 0,
        errors: [],
        timestamp: new Date().toISOString(),
      };

      // Отправить каждый батч
      for (const batch of batches) {
        const batchResult = await this.syncBatch(batch);
        
        result.synced_count += batchResult.synced_count;
        result.failed_count += batchResult.failed_count;
        result.conflict_count += batchResult.conflict_count;
        result.errors.push(...batchResult.errors);
        result.workday_summary = batchResult.workday_summary;

        if (!batchResult.success) {
          result.success = false;
        }
      }

      await updateLastSyncTime(this.userId);
      console.log('[SyncService] Синхронизация завершена:', result);

      return result;
    } catch (error) {
      console.error('[SyncService] Ошибка синхронизации:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      await saveSyncError(this.userId, errorMessage);

      return {
        success: false,
        synced_count: 0,
        failed_count: 0,
        conflict_count: 0,
        errors: [{
          event_id: 'sync_error',
          error: errorMessage,
        }],
        timestamp: new Date().toISOString(),
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Синхронизировать батч событий
   */
  private async syncBatch(events: WorkEvent[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced_count: 0,
      failed_count: 0,
      conflict_count: 0,
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // Построить payload
      const payload = {
        user_id: this.userId,
        device_id: this.deviceId,
        events: events.map(e => this.eventToPayload(e)),
        app_version: this.appVersion,
        timestamp: new Date().toISOString(),
      };

      // Отправить на сервер
      const response = await this.sendRequest(payload);

      if (!response) {
        result.success = false;
        result.failed_count = events.length;
        return result;
      }

      // Обработать ответ
      for (const eventResponse of response.events) {
        const event = events.find(e => e.client_event_id === eventResponse.client_event_id);
        
        if (!event) {
          console.warn('[SyncService] Событие не найдено в батче:', eventResponse.client_event_id);
          continue;
        }

        if (eventResponse.status === 'accepted') {
          await updateEventSyncStatus(
            this.userId,
            event.client_event_id,
            'synced',
            eventResponse.server_event_id
          );
          result.synced_count += 1;
        } else if (eventResponse.status === 'conflict') {
          await updateEventSyncStatus(
            this.userId,
            event.client_event_id,
            'requires_review',
            undefined,
            eventResponse.error || 'Конфликт синхронизации'
          );
          result.conflict_count += 1;
        } else {
          await updateEventSyncStatus(
            this.userId,
            event.client_event_id,
            'error',
            undefined,
            eventResponse.error || 'Ошибка сервера'
          );
          result.failed_count += 1;
          result.errors.push({
            event_id: event.id,
            error: eventResponse.error || 'Ошибка сервера',
          });
        }
      }

      if (response.workday_summary) {
        result.workday_summary = response.workday_summary;
      }

      return result;
    } catch (error) {
      console.error('[SyncService] Ошибка отправки батча:', error);
      result.success = false;
      result.failed_count = events.length;
      result.errors = events.map(e => ({
        event_id: e.id,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      }));
      return result;
    }
  }

  /**
   * Отправить запрос на сервер
   */
  private async sendRequest(payload: any): Promise<SyncResponse | null> {
    const url = buildApiUrl(apiEndpoints.syncEvents);
    const headers = getApiHeaders(true);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        timeout: this.config.api_timeout_ms,
      } as any);

      if (!response.ok) {
        console.error('[SyncService] Ошибка HTTP:', response.status, response.statusText);
        
        if (response.status === 401 || response.status === 403) {
          console.error('[SyncService] Ошибка авторизации');
          return null;
        }

        if (response.status >= 500) {
          console.error('[SyncService] Ошибка сервера');
          return null;
        }

        return null;
      }

      const data = await response.json() as SyncResponse;
      return data;
    } catch (error) {
      console.error('[SyncService] Ошибка сетевого запроса:', error);
      
      if (error instanceof TypeError && error.message.includes('Network')) {
        console.log('[SyncService] Сеть недоступна');
      }

      return null;
    }
  }

  /**
   * Преобразовать WorkEvent в SyncEventPayload
   */
  private eventToPayload(event: WorkEvent): SyncEventPayload {
    return {
      client_event_id: event.client_event_id,
      user_id: this.userId,
      date: event.timestamp.split('T')[0], // Извлечь дату из ISO timestamp
      type: event.type,
      timestamp: event.timestamp,
      duration_seconds: event.duration_seconds,
      notes: event.notes,
      device_id: this.deviceId,
      app_version: this.appVersion,
    };
  }

  /**
   * Разделить события на батчи
   */
  private splitIntoBatches(events: WorkEvent[], batchSize: number): WorkEvent[][] {
    const batches: WorkEvent[][] = [];
    for (let i = 0; i < events.length; i += batchSize) {
      batches.push(events.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Проверить здоровье API
   */
  async checkHealth(): Promise<boolean> {
    try {
      const url = buildApiUrl(apiEndpoints.health);
      const response = await fetch(url, {
        method: 'GET',
        timeout: 5000,
      } as any);

      return response.ok;
    } catch (error) {
      console.error('[SyncService] Ошибка проверки здоровья:', error);
      return false;
    }
  }

  /**
   * Получить статус синхронизации
   */
  getStatus(): {
    is_syncing: boolean;
    user_id: string;
    device_id: string;
    auto_sync_enabled: boolean;
  } {
    return {
      is_syncing: this.isSyncing,
      user_id: this.userId,
      device_id: this.deviceId,
      auto_sync_enabled: this.config.auto_sync_enabled,
    };
  }

  /**
   * Установить конфигурацию
   */
  setConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[SyncService] Конфигурация обновлена');
  }
}

/**
 * Глобальный экземпляр SyncService
 */
let globalSyncService: SyncService | null = null;

/**
 * Инициализировать глобальный SyncService
 */
export async function initializeSyncService(userId: string, deviceId: string): Promise<SyncService> {
  if (globalSyncService) {
    console.warn('[SyncService] SyncService уже инициализирован');
    return globalSyncService;
  }

  globalSyncService = new SyncService(userId, deviceId);
  await globalSyncService.initialize();
  return globalSyncService;
}

/**
 * Получить глобальный SyncService
 */
export function getSyncService(): SyncService | null {
  return globalSyncService;
}

/**
 * Завершить глобальный SyncService
 */
export async function shutdownSyncService(): Promise<void> {
  if (globalSyncService) {
    await globalSyncService.shutdown();
    globalSyncService = null;
  }
}
