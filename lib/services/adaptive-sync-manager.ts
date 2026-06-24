/**
 * AdaptiveSyncManager — управление синхронизацией с адаптивным интервалом
 * для оптимизации потребления батареи
 * 
 * Стратегия:
 * 1. Активная работа (есть события) — синхронизация каждые 30-60 сек
 * 2. Неактивность (нет событий 5+ мин) — синхронизация каждые 5-10 мин
 * 3. Ночное время (00:00-06:00) — синхронизация отключена
 * 4. Event-driven — синхронизация при создании события или восстановлении сети
 */

import { getSyncService } from './sync-service';
import { getPendingEventCount } from './sync-storage';
import * as Network from 'expo-network';

interface AdaptiveSyncConfig {
  active_sync_interval_ms: number;      // 30-60 сек при активности
  idle_sync_interval_ms: number;        // 5-10 мин при неактивности
  idle_threshold_ms: number;            // 5 мин без событий = неактивность
  night_start_hour: number;             // 00:00
  night_end_hour: number;               // 06:00
  enable_night_sync: boolean;           // Отключить синхронизацию ночью
  enable_event_driven_sync: boolean;    // Синхронизировать при событиях
  enable_network_change_sync: boolean;  // Синхронизировать при восстановлении сети
}

type SyncMode = 'active' | 'idle' | 'night' | 'offline';

/**
 * AdaptiveSyncManager класс
 */
export class AdaptiveSyncManager {
  private config: AdaptiveSyncConfig;
  private userId: string;
  private currentMode: SyncMode = 'active';
  private lastEventTime: number = Date.now();
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private networkListener: any = null;
  private isOnline: boolean = true;

  constructor(userId: string, config?: Partial<AdaptiveSyncConfig>) {
    this.userId = userId;
    this.config = {
      active_sync_interval_ms: 60000,      // 60 сек
      idle_sync_interval_ms: 300000,       // 5 мин
      idle_threshold_ms: 300000,           // 5 мин
      night_start_hour: 0,
      night_end_hour: 6,
      enable_night_sync: false,
      enable_event_driven_sync: true,
      enable_network_change_sync: true,
      ...config,
    };
  }

  /**
   * Инициализировать менеджер
   */
  async initialize(): Promise<void> {
    console.log('[AdaptiveSyncManager] Инициализация');

    // Проверить сетевое подключение
    const networkState = await Network.getNetworkStateAsync();
    this.isOnline = networkState.isConnected ?? true;

    // Подписаться на изменения сети
    if (this.config.enable_network_change_sync) {
      this.networkListener = Network.addNetworkStateListener(
        this.handleNetworkChange.bind(this)
      );
    }

    // Запустить адаптивный таймер
    this.startAdaptiveSync();
  }

  /**
   * Завершить работу менеджера
   */
  async shutdown(): Promise<void> {
    console.log('[AdaptiveSyncManager] Завершение работы');
    this.stopAdaptiveSync();

    if (this.networkListener) {
      this.networkListener.remove();
      this.networkListener = null;
    }
  }

  /**
   * Обработать изменение сети
   */
  private async handleNetworkChange(state: any): Promise<void> {
    const wasOnline = this.isOnline;
    this.isOnline = state.isConnected ?? true;

    console.log('[AdaptiveSyncManager] Сеть:', this.isOnline ? 'подключена' : 'отключена');

    if (!wasOnline && this.isOnline) {
      // Восстановлена сеть — синхронизировать немедленно
      console.log('[AdaptiveSyncManager] Восстановлена сеть, синхронизация...');
      await this.syncNow();
    }
  }

  /**
   * Зафиксировать событие (пользователь создал событие)
   */
  recordEvent(): void {
    this.lastEventTime = Date.now();
    console.log('[AdaptiveSyncManager] Событие записано, переход в активный режим');

    if (this.config.enable_event_driven_sync) {
      // Синхронизировать немедленно при создании события
      this.syncNow().catch(console.error);
    }

    // Перезапустить таймер с активным интервалом
    this.restartAdaptiveSync();
  }

  /**
   * Получить текущий режим синхронизации
   */
  private getCurrentMode(): SyncMode {
    if (!this.isOnline) {
      return 'offline';
    }

    const now = new Date();
    const hour = now.getHours();

    // Проверить ночное время
    if (
      this.config.enable_night_sync === false &&
      hour >= this.config.night_start_hour &&
      hour < this.config.night_end_hour
    ) {
      return 'night';
    }

    // Проверить неактивность
    const timeSinceLastEvent = Date.now() - this.lastEventTime;
    if (timeSinceLastEvent > this.config.idle_threshold_ms) {
      return 'idle';
    }

    return 'active';
  }

  /**
   * Получить интервал синхронизации в зависимости от режима
   */
  private getSyncInterval(): number {
    const mode = this.getCurrentMode();

    switch (mode) {
      case 'active':
        return this.config.active_sync_interval_ms;
      case 'idle':
        return this.config.idle_sync_interval_ms;
      case 'night':
        return this.config.idle_sync_interval_ms * 2; // 10 мин ночью
      case 'offline':
        return this.config.idle_sync_interval_ms * 3; // 15 мин без сети
      default:
        return this.config.active_sync_interval_ms;
    }
  }

  /**
   * Запустить адаптивную синхронизацию
   */
  private startAdaptiveSync(): void {
    console.log('[AdaptiveSyncManager] Запуск адаптивной синхронизации');

    this.syncTimer = setInterval(async () => {
      const mode = this.getCurrentMode();
      const interval = this.getSyncInterval();

      console.log(
        `[AdaptiveSyncManager] Режим: ${mode}, интервал: ${(interval / 1000).toFixed(0)}s`
      );

      // Пропустить синхронизацию в ночное время
      if (mode === 'night') {
        console.log('[AdaptiveSyncManager] Ночное время, синхронизация пропущена');
        return;
      }

      // Пропустить синхронизацию без сети
      if (mode === 'offline') {
        console.log('[AdaptiveSyncManager] Нет сети, синхронизация пропущена');
        return;
      }

      // Выполнить синхронизацию только если есть pending события
      const pendingCount = await getPendingEventCount(this.userId);
      if (pendingCount > 0) {
        console.log(
          `[AdaptiveSyncManager] Синхронизация ${pendingCount} событий...`
        );
        await this.syncNow();
      } else {
        console.log('[AdaptiveSyncManager] Нет событий для синхронизации');
      }
    }, this.config.active_sync_interval_ms);
  }

  /**
   * Перезапустить адаптивную синхронизацию
   */
  private restartAdaptiveSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.startAdaptiveSync();
  }

  /**
   * Остановить адаптивную синхронизацию
   */
  private stopAdaptiveSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('[AdaptiveSyncManager] Адаптивная синхронизация остановлена');
    }
  }

  /**
   * Синхронизировать немедленно
   */
  async syncNow(): Promise<void> {
    const syncService = getSyncService();
    if (!syncService) {
      console.error('[AdaptiveSyncManager] SyncService не инициализирован');
      return;
    }

    try {
      const result = await syncService.sync();
      console.log('[AdaptiveSyncManager] Синхронизация завершена:', {
        success: result?.success,
        synced: result?.synced_count,
        failed: result?.failed_count,
      });
    } catch (error) {
      console.error('[AdaptiveSyncManager] Ошибка синхронизации:', error);
    }
  }

  /**
   * Получить статистику
   */
  getStats(): {
    mode: SyncMode;
    interval_ms: number;
    is_online: boolean;
    time_since_last_event_ms: number;
  } {
    return {
      mode: this.getCurrentMode(),
      interval_ms: this.getSyncInterval(),
      is_online: this.isOnline,
      time_since_last_event_ms: Date.now() - this.lastEventTime,
    };
  }

  /**
   * Обновить конфигурацию
   */
  updateConfig(config: Partial<AdaptiveSyncConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[AdaptiveSyncManager] Конфигурация обновлена');
    this.restartAdaptiveSync();
  }
}

/**
 * Глобальный экземпляр AdaptiveSyncManager
 */
let globalAdaptiveSyncManager: AdaptiveSyncManager | null = null;

/**
 * Инициализировать глобальный AdaptiveSyncManager
 */
export async function initializeAdaptiveSyncManager(
  userId: string,
  config?: Partial<AdaptiveSyncConfig>
): Promise<AdaptiveSyncManager> {
  if (globalAdaptiveSyncManager) {
    console.warn('[AdaptiveSyncManager] Менеджер уже инициализирован');
    return globalAdaptiveSyncManager;
  }

  globalAdaptiveSyncManager = new AdaptiveSyncManager(userId, config);
  await globalAdaptiveSyncManager.initialize();
  return globalAdaptiveSyncManager;
}

/**
 * Получить глобальный AdaptiveSyncManager
 */
export function getAdaptiveSyncManager(): AdaptiveSyncManager | null {
  return globalAdaptiveSyncManager;
}

/**
 * Завершить глобальный AdaptiveSyncManager
 */
export async function shutdownAdaptiveSyncManager(): Promise<void> {
  if (globalAdaptiveSyncManager) {
    await globalAdaptiveSyncManager.shutdown();
    globalAdaptiveSyncManager = null;
  }
}

/**
 * Зафиксировать событие в глобальном менеджере
 */
export function recordSyncEvent(): void {
  if (globalAdaptiveSyncManager) {
    globalAdaptiveSyncManager.recordEvent();
  }
}
