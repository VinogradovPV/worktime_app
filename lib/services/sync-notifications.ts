/**
 * Sync Notifications Service
 * Отправка push-уведомлений о важных событиях синхронизации
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface NotificationOptions {
  title: string;
  body: string;
  badge?: number;
  sound?: 'default' | 'none';
  priority?: 'default' | 'high';
}

class SyncNotificationsService {
  private isInitialized = false;
  private notificationCount = 0;

  /**
   * Инициализировать сервис уведомлений
   */
  async initialize(): Promise<void> {
    try {
      // Создать notification channel для Android
      if (Platform.OS === 'android') {
        await this.createNotificationChannel();
      }

      // Установить обработчик уведомлений
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      this.isInitialized = true;
      console.log('[SyncNotifications] Initialized');
    } catch (error) {
      console.error('[SyncNotifications] Initialization failed:', error);
    }
  }

  /**
   * Создать notification channel для Android
   */
  private async createNotificationChannel(): Promise<void> {
    try {
      await Notifications.setNotificationChannelAsync('sync-channel', {
        name: 'Синхронизация',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
      });

      console.log('[SyncNotifications] Notification channel created');
    } catch (error) {
      console.error('[SyncNotifications] Failed to create notification channel:', error);
    }
  }



  /**
   * Отправить уведомление об ошибке синхронизации
   */
  async notifySyncError(errorMessage: string): Promise<void> {
    try {
      const title = 'Ошибка синхронизации';
      const body = errorMessage || 'Не удалось синхронизировать данные';

      await this.sendNotification({
        title,
        body,
        badge: 1,
        sound: 'default',
        priority: 'high',
      });

      console.log('[SyncNotifications] Error notification sent');
    } catch (error) {
      console.error('[SyncNotifications] Failed to send error notification:', error);
    }
  }

  /**
   * Отправить уведомление о конфликтах синхронизации
   */
  async notifySyncConflict(conflictCount: number): Promise<void> {
    try {
      const title = 'Конфликты синхронизации';
      const body = `Обнаружено ${conflictCount} конфликт${this.getPluralForm(conflictCount)}. Требуется ваше внимание`;

      await this.sendNotification({
        title,
        body,
        badge: conflictCount,
        sound: 'default',
        priority: 'high',
      });

      console.log('[SyncNotifications] Conflict notification sent');
    } catch (error) {
      console.error('[SyncNotifications] Failed to send conflict notification:', error);
    }
  }

  /**
   * Отправить уведомление о переполнении очереди
   */
  async notifyQueueFull(queueLength: number): Promise<void> {
    try {
      const title = 'Очередь синхронизации переполнена';
      const body = `В очереди ${queueLength} запросов. Проверьте соединение`;

      await this.sendNotification({
        title,
        body,
        badge: queueLength,
        sound: 'default',
        priority: 'high',
      });

      console.log('[SyncNotifications] Queue full notification sent');
    } catch (error) {
      console.error('[SyncNotifications] Failed to send queue full notification:', error);
    }
  }

  /**
   * Отправить уведомление о восстановлении сети
   */
  async notifyNetworkRestored(): Promise<void> {
    try {
      const title = 'Соединение восстановлено';
      const body = 'Начинается синхронизация отложенных данных';

      await this.sendNotification({
        title,
        body,
        badge: 0,
        sound: 'default',
        priority: 'default',
      });

      console.log('[SyncNotifications] Network restored notification sent');
    } catch (error) {
      console.error('[SyncNotifications] Failed to send network restored notification:', error);
    }
  }

  /**
   * Отправить уведомление о начале синхронизации
   */
  async notifySyncStarted(): Promise<void> {
    try {
      const title = 'Синхронизация';
      const body = 'Начинается синхронизация данных...';

      await this.sendNotification({
        title,
        body,
        sound: 'none',
        priority: 'default',
      });

      console.log('[SyncNotifications] Sync started notification sent');
    } catch (error) {
      console.error('[SyncNotifications] Failed to send sync started notification:', error);
    }
  }

  /**
   * Отправить уведомление о предупреждении
   */
  async notifyWarning(title: string, message: string): Promise<void> {
    try {
      await this.sendNotification({
        title,
        body: message,
        sound: 'default',
        priority: 'high',
      });

      console.log('[SyncNotifications] Warning notification sent');
    } catch (error) {
      console.error('[SyncNotifications] Failed to send warning notification:', error);
    }
  }

  /**
   * Отправить уведомление
   */
  private async sendNotification(options: NotificationOptions): Promise<void> {
    try {
      this.notificationCount++;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: options.title,
          body: options.body,
          badge: options.badge,
          sound: options.sound || 'default',
          priority: options.priority || 'default',
          data: {
            syncNotification: true,
            timestamp: Date.now(),
          },
        },
        trigger: null, // Отправить сразу
      });

      console.log('[SyncNotifications] Notification sent:', options.title);
    } catch (error) {
      console.error('[SyncNotifications] Failed to send notification:', error);
    }
  }

  /**
   * Очистить все уведомления
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      this.notificationCount = 0;
      console.log('[SyncNotifications] All notifications cleared');
    } catch (error) {
      console.error('[SyncNotifications] Failed to clear notifications:', error);
    }
  }

  /**
   * Получить количество уведомлений
   */
  getNotificationCount(): number {
    return this.notificationCount;
  }

  /**
   * Получить форму множественного числа
   */
  private getPluralForm(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) {
      return '';
    }
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
      return 'а';
    }
    return 'ов';
  }
}

// Синглтон
let notificationsInstance: SyncNotificationsService | null = null;

export function getSyncNotificationsService(): SyncNotificationsService {
  if (!notificationsInstance) {
    notificationsInstance = new SyncNotificationsService();
  }
  return notificationsInstance;
}
