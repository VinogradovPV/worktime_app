/**
 * Backend Sync Integration
 * Интеграция синхронизации с backend API
 * 
 * Этот сервис объединяет:
 * - WorkDaySyncService для синхронизации рабочих дней
 * - UserProfileSyncService для синхронизации профиля
 * - AdaptiveSyncManager для адаптивной синхронизации
 */

import { getWorkDaySyncService } from './workday-sync-service';
import { getUserProfileSyncService } from './user-profile-sync-service';
import { getBackendApiClient } from './backend-api-client';
import { getTodayWorkDay } from '@/lib/storage/workdayService';
import { formatDate } from '@/lib/utils/dateUtils';

interface BackendSyncConfig {
  userId: string;
  autoSync: boolean;
  syncInterval: number; // ms
}

class BackendSyncIntegration {
  private workDaySync = getWorkDaySyncService();
  private profileSync = getUserProfileSyncService();
  private apiClient = getBackendApiClient();
  private config: BackendSyncConfig;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;

  constructor(config: BackendSyncConfig) {
    this.config = config;
    this.workDaySync.setUserId(config.userId);
    this.profileSync.setUserId(config.userId);
  }

  /**
   * Инициализировать интеграцию
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('[BackendSyncIntegration] Инициализация');

      // Проверить подключение к API
      const isHealthy = await this.apiClient.healthCheck();

      if (!isHealthy) {
        console.warn('[BackendSyncIntegration] API health check failed');
        return false;
      }

      console.log('[BackendSyncIntegration] API health check passed');

      // Если автосинхронизация включена, запустить таймер
      if (this.config.autoSync) {
        this.startAutoSync();
      }

      return true;
    } catch (error) {
      console.error('[BackendSyncIntegration] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Синхронизировать текущий рабочий день
   */
  async syncTodayWorkDay(): Promise<boolean> {
    try {
      console.log('[BackendSyncIntegration] Syncing today workday');

      const workDay = await getTodayWorkDay();

      if (!workDay) {
        console.warn('[BackendSyncIntegration] No workday found for today');
        return false;
      }

      const result = await this.workDaySync.syncWorkDay(workDay);
      return result;
    } catch (error) {
      console.error('[BackendSyncIntegration] Sync failed:', error);
      return false;
    }
  }

  /**
   * Синхронизировать профиль пользователя
   */
  async syncUserProfile(): Promise<boolean> {
    try {
      console.log('[BackendSyncIntegration] Syncing user profile');

      const result = await this.profileSync.syncUserProfile();
      return result.success;
    } catch (error) {
      console.error('[BackendSyncIntegration] Profile sync failed:', error);
      return false;
    }
  }

  /**
   * Полная синхронизация
   */
  async fullSync(): Promise<boolean> {
    if (this.isSyncing) {
      console.warn('[BackendSyncIntegration] Sync already in progress');
      return false;
    }

    try {
      this.isSyncing = true;
      console.log('[BackendSyncIntegration] Starting full sync');

      // Синхронизировать рабочий день
      const workDayResult = await this.syncTodayWorkDay();
      console.log('[BackendSyncIntegration] WorkDay sync:', workDayResult);

      // Синхронизировать профиль
      const profileResult = await this.syncUserProfile();
      console.log('[BackendSyncIntegration] Profile sync:', profileResult);

      // Получить обновления с backend
      await this.fetchRemoteUpdates();

      console.log('[BackendSyncIntegration] Full sync completed');
      return workDayResult && profileResult;
    } catch (error) {
      console.error('[BackendSyncIntegration] Full sync failed:', error);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Получить обновления с backend
   */
  private async fetchRemoteUpdates(): Promise<void> {
    try {
      console.log('[BackendSyncIntegration] Fetching remote updates');

      // Получить рабочий день с backend
      const today = formatDate(new Date());
      const remoteWorkDay = await this.workDaySync.fetchWorkDay(today);

      if (remoteWorkDay) {
        console.log('[BackendSyncIntegration] Remote workday fetched');
      }

      // Получить профиль с backend
      const remoteProfile = await this.profileSync.fetchUserProfile();

      if (remoteProfile) {
        console.log('[BackendSyncIntegration] Remote profile fetched');
      }
    } catch (error) {
      console.error('[BackendSyncIntegration] Fetch remote updates failed:', error);
    }
  }

  /**
   * Запустить автоматическую синхронизацию
   */
  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    console.log('[BackendSyncIntegration] Starting auto sync with interval:', this.config.syncInterval);

    this.syncTimer = setInterval(async () => {
      await this.fullSync();
    }, this.config.syncInterval);
  }

  /**
   * Остановить автоматическую синхронизацию
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('[BackendSyncIntegration] Auto sync stopped');
    }
  }

  /**
   * Завершить работу интеграции
   */
  async shutdown(): Promise<void> {
    console.log('[BackendSyncIntegration] Shutting down');
    this.stopAutoSync();
  }

  /**
   * Получить статус синхронизации
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Установить userId
   */
  setUserId(userId: string): void {
    this.config.userId = userId;
    this.workDaySync.setUserId(userId);
    this.profileSync.setUserId(userId);
  }
}

// Создаем и экспортируем синглтон
let integrationInstance: BackendSyncIntegration | null = null;

export function getBackendSyncIntegration(config?: BackendSyncConfig): BackendSyncIntegration {
  if (!integrationInstance && config) {
    integrationInstance = new BackendSyncIntegration(config);
  }
  return integrationInstance!;
}

export function createBackendSyncIntegration(config: BackendSyncConfig): BackendSyncIntegration {
  return new BackendSyncIntegration(config);
}
