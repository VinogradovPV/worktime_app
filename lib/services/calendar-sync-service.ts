/**
 * Calendar Sync Service
 * Сервис для синхронизации отпусков и производственного календаря с backend API
 */

import { getBackendApiClient } from './backend-api-client';
import { getSyncNotificationsService } from './sync-notifications';
import { 
  getProductionCalendar as getLocalCalendar,
  saveProductionCalendar as saveLocalCalendar,
} from '@/lib/storage/productionCalendarStorage';
import {
  getVacationPeriods as getLocalVacations,
  addVacationPeriod,
  removeVacationPeriod,
} from '@/lib/storage/notificationSettings';

interface CalendarSyncResult {
  success: boolean;
  vacationsSynced: number;
  calendarUpdated: boolean;
  errors: string[];
}

interface Vacation {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  type: 'vacation' | 'sick_leave' | 'unpaid_leave';
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

class CalendarSyncService {
  private apiClient = getBackendApiClient();
  private notifications = getSyncNotificationsService();
  private userId: string = 'default_user';

  /**
   * Синхронизировать отпуска с backend
   */
  async syncVacations(): Promise<CalendarSyncResult> {
    const result: CalendarSyncResult = {
      success: true,
      vacationsSynced: 0,
      calendarUpdated: false,
      errors: [],
    };

    try {
      console.log('[CalendarSync] Syncing vacations');

      // Получаем локальные отпуска
      const localVacations = await getLocalVacations();

      if (!localVacations || localVacations.length === 0) {
        console.log('[CalendarSync] No local vacations to sync');
        result.vacationsSynced = 0;
        return result;
      }

      // Отправляем каждый отпуск на backend
      for (const vacation of localVacations) {
        try {
          if (vacation.id.startsWith('local_')) {
            // Новый отпуск - создаем на backend
            await this.apiClient.addVacation(this.userId, vacation);
          } else {
            // Существующий отпуск - обновляем на backend
            await this.apiClient.updateVacation(this.userId, vacation.id, vacation);
          }
          result.vacationsSynced++;
        } catch (error) {
          result.errors.push(`Failed to sync vacation ${vacation.id}: ${error}`);
        }
      }

      result.success = result.errors.length === 0;
      console.log('[CalendarSync] Vacations synced:', result);

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(`Vacation sync failed: ${error}`);
      console.error('[CalendarSync] Vacation sync error:', error);
      return result;
    }
  }

  /**
   * Получить отпуска с backend
   */
  async fetchVacations(): Promise<Vacation[] | null> {
    try {
      console.log('[CalendarSync] Fetching vacations from backend');

      const vacations = await this.apiClient.getVacations(this.userId);

      if (vacations && vacations.length > 0) {
        // Сохраняем полученные отпуска локально
        for (const vacation of vacations) {
          await addVacationPeriod(vacation);
        }
        console.log('[CalendarSync] Vacations fetched and saved locally:', vacations.length);
      }

      return vacations || [];
    } catch (error) {
      console.error('[CalendarSync] Fetch vacations failed:', error);
      return null;
    }
  }

  /**
   * Добавить отпуск и синхронизировать
   */
  async addVacation(vacation: Vacation): Promise<boolean> {
    try {
      console.log('[CalendarSync] Adding vacation');

      // Отправляем на backend
      const result = await this.apiClient.addVacation(this.userId, vacation);

      // Обновляем локально
      await addVacationPeriod(result);

      console.log('[CalendarSync] Vacation added successfully');
      return true;
    } catch (error) {
      console.error('[CalendarSync] Add vacation failed:', error);
      return false;
    }
  }

  /**
   * Обновить отпуск и синхронизировать
   */
  async updateVacation(vacationId: string, vacation: Vacation): Promise<boolean> {
    try {
      console.log('[CalendarSync] Updating vacation:', vacationId);

      // Отправляем на backend
      const result = await this.apiClient.updateVacation(this.userId, vacationId, vacation);

      // Удаляем старый и добавляем новый локально
      await removeVacationPeriod(vacationId);
      await addVacationPeriod(result);

      console.log('[CalendarSync] Vacation updated successfully');
      return true;
    } catch (error) {
      console.error('[CalendarSync] Update vacation failed:', error);
      return false;
    }
  }

  /**
   * Удалить отпуск и синхронизировать
   */
  async deleteVacation(vacationId: string): Promise<boolean> {
    try {
      console.log('[CalendarSync] Deleting vacation:', vacationId);

      // Удаляем на backend
      await this.apiClient.deleteVacation(this.userId, vacationId);

      // Удаляем локально
      await removeVacationPeriod(vacationId);

      console.log('[CalendarSync] Vacation deleted successfully');
      return true;
    } catch (error) {
      console.error('[CalendarSync] Delete vacation failed:', error);
      return false;
    }
  }

  /**
   * Синхронизировать производственный календарь
   */
  async syncProductionCalendar(year?: number): Promise<CalendarSyncResult> {
    const result: CalendarSyncResult = {
      success: true,
      vacationsSynced: 0,
      calendarUpdated: false,
      errors: [],
    };

    try {
      console.log('[CalendarSync] Syncing production calendar', year ? `for year ${year}` : '');

      // Получаем производственный календарь с backend
      const calendar = await this.apiClient.getProductionCalendar(year);

      if (calendar) {
        // Сохраняем локально
        await saveLocalCalendar(calendar);
        result.calendarUpdated = true;
        console.log('[CalendarSync] Production calendar synced successfully');
      }

      result.success = true;
      return result;
    } catch (error) {
      console.error('[CalendarSync] Sync vacations failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      this.notifications.notifySyncError('Не удалось синхронизировать отпуска');
      return result;
    }
  }

  /**
   * Получить производственный календарь с backend
   */
  async fetchProductionCalendar(year?: number): Promise<any | null> {
    try {
      console.log('[CalendarSync] Fetching production calendar from backend');

      const calendar = await this.apiClient.getProductionCalendar(year);

      if (calendar) {
        // Сохраняем локально
        await saveLocalCalendar(calendar);
        console.log('[CalendarSync] Production calendar fetched and saved locally');
      }

      return calendar;
    } catch (error) {
      console.error('[CalendarSync] Fetch production calendar failed:', error);
      return null;
    }
  }

  /**
   * Полная синхронизация календаря
   */
  async fullCalendarSync(): Promise<CalendarSyncResult> {
    try {
      console.log('[CalendarSync] Starting full calendar sync');

      // Синхронизировать отпуска
      const vacationResult = await this.syncVacations();

      // Синхронизировать производственный календарь
      const calendarResult = await this.syncProductionCalendar();

      const result: CalendarSyncResult = {
        success: vacationResult.success && calendarResult.success,
        vacationsSynced: vacationResult.vacationsSynced,
        calendarUpdated: calendarResult.calendarUpdated,
        errors: [...vacationResult.errors, ...calendarResult.errors],
      };

      console.log('[CalendarSync] Full calendar sync completed:', result);
      return result;
    } catch (error) {
      console.error('[CalendarSync] Full calendar sync error:', error);
      return {
        success: false,
        vacationsSynced: 0,
        calendarUpdated: false,
        errors: [`Full calendar sync failed: ${error}`],
      };
    }
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
let syncServiceInstance: CalendarSyncService | null = null;

export function getCalendarSyncService(): CalendarSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new CalendarSyncService();
  }
  return syncServiceInstance;
}

export type { CalendarSyncResult, Vacation };
