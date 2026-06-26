/**
 * WorkDay Sync Service
 * Сервис для синхронизации рабочих дней с backend API
 */

import { WorkDay } from '@/shared/types/workday';
import { getBackendApiClient } from './backend-api-client';
import { getSyncNotificationsService } from './sync-notifications';
import { getTodayWorkDay, saveWorkDay } from '@/lib/storage/workdayService';
import { formatDate } from '@/lib/utils/dateUtils';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

interface SyncConflict {
  date: string;
  local: WorkDay;
  remote: WorkDay;
  resolution: 'local' | 'remote' | 'merge';
}

class WorkDaySyncService {
  private apiClient = getBackendApiClient();
  private notifications = getSyncNotificationsService();
  private userId: string = 'default_user'; // TODO: получать из профиля пользователя

  /**
   * Синхронизировать рабочий день с backend
   */
  async syncWorkDay(workDay: WorkDay): Promise<boolean> {
    try {
      console.log('[WorkDaySync] Syncing workday:', workDay.date);

      // Отправляем рабочий день на backend
      const result = await this.apiClient.saveWorkDay(
        this.userId,
        workDay.date,
        workDay
      );

      console.log('[WorkDaySync] Sync successful:', result);
      return true;
    } catch (error) {
      console.error('[WorkDaySync] Sync failed:', error);
      this.notifications.notifySyncError('Не удалось синхронизировать рабочий день');
      return false;
    }
  }

  /**
   * Получить рабочий день с backend
   */
  async fetchWorkDay(date: string): Promise<WorkDay | null> {
    try {
      console.log('[WorkDaySync] Fetching workday from backend:', date);

      const result = await this.apiClient.getWorkDay(this.userId, date);
      console.log('[WorkDaySync] Fetch successful:', result);

      return result as WorkDay;
    } catch (error) {
      console.error('[WorkDaySync] Fetch failed:', error);
      return null;
    }
  }

  /**
   * Синхронизировать рабочие дни за период
   */
  async syncWorkDaysPeriod(startDate: string, endDate: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    try {
      console.log('[WorkDaySync] Syncing period:', startDate, 'to', endDate);

      // Получаем рабочие дни с backend
      const remoteWorkDays = await this.apiClient.getWorkDays(
        this.userId,
        startDate,
        endDate
      );

      console.log('[WorkDaySync] Received', remoteWorkDays.length, 'workdays from backend');

      // Для каждого дня проверяем конфликты и синхронизируем
      for (const remoteWorkDay of remoteWorkDays) {
        try {
          // Получаем локальный рабочий день
          const localWorkDay = await this.getLocalWorkDay(remoteWorkDay.date);

          if (!localWorkDay) {
            // Если локального дня нет, сохраняем удаленный
            await saveWorkDay(remoteWorkDay);
            result.synced++;
          } else if (this.hasConflict(localWorkDay, remoteWorkDay)) {
            // Если есть конфликт, разрешаем его
            const resolved = await this.resolveConflict(
              localWorkDay,
              remoteWorkDay
            );
            await saveWorkDay(resolved);
            result.synced++;
          } else {
            // Если нет конфликта, используем более новый
            const newer = this.getNewerWorkDay(localWorkDay, remoteWorkDay);
            await saveWorkDay(newer);
            result.synced++;
          }
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to sync ${remoteWorkDay.date}: ${error}`);
        }
      }

      result.success = result.failed === 0;
      console.log('[WorkDaySync] Sync period complete:', result);

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Period sync failed: ${error}`);
      console.error('[WorkDaySync] Period sync error:', error);
      return result;
    }
  }

  /**
   * Получить локальный рабочий день
   */
  private async getLocalWorkDay(date: string): Promise<WorkDay | null> {
    try {
      // Если это сегодня, используем getTodayWorkDay
      const today = formatDate(new Date());
      if (date === today) {
        return await getTodayWorkDay();
      }

      // TODO: реализовать получение рабочего дня за конкретную дату
      return null;
    } catch (error) {
      console.error('[WorkDaySync] Failed to get local workday:', error);
      return null;
    }
  }

  /**
   * Проверить наличие конфликта
   */
  private hasConflict(local: WorkDay, remote: WorkDay): boolean {
    // Конфликт есть, если оба дня были обновлены после последней синхронизации
    // и имеют разные события
    const localUpdated = new Date(local.updatedAt).getTime();
    const remoteUpdated = new Date(remote.updatedAt).getTime();

    // Если оба обновлены в течение последних 5 минут, это конфликт
    const now = Date.now();
    const threshold = 5 * 60 * 1000; // 5 минут

    if (now - localUpdated < threshold && now - remoteUpdated < threshold) {
      // Проверяем, что события отличаются
      return JSON.stringify(local.events) !== JSON.stringify(remote.events);
    }

    return false;
  }

  /**
   * Разрешить конфликт
   */
  private async resolveConflict(local: WorkDay, remote: WorkDay): Promise<WorkDay> {
    // Простая стратегия: используем более новый рабочий день
    return this.getNewerWorkDay(local, remote);
  }

  /**
   * Получить более новый рабочий день
   */
  private getNewerWorkDay(local: WorkDay, remote: WorkDay): WorkDay {
    const localTime = new Date(local.updatedAt).getTime();
    const remoteTime = new Date(remote.updatedAt).getTime();

    return remoteTime > localTime ? remote : local;
  }

  /**
   * Установить userId
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Получить текущий userId
   */
  getUserId(): string {
    return this.userId;
  }
}

// Создаем и экспортируем синглтон
let syncServiceInstance: WorkDaySyncService | null = null;

export function getWorkDaySyncService(): WorkDaySyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new WorkDaySyncService();
  }
  return syncServiceInstance;
}

export type { SyncResult, SyncConflict };
