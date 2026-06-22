import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationSettings {
  workStartEnabled: boolean;
  workEndEnabled: boolean;
  breakRemindersEnabled: boolean;
  goalAchievementEnabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  workStartEnabled: true,
  workEndEnabled: true,
  breakRemindersEnabled: true,
  goalAchievementEnabled: true,
};

export const notificationService = {
  async init() {
    try {
      // Запросить разрешение на уведомления
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
      }

      // Установить обработчик для уведомлений
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  },

  async getSettings(): Promise<NotificationSettings> {
    try {
      const saved = await AsyncStorage.getItem('notificationSettings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return DEFAULT_SETTINGS;
    }
  },

  async updateSettings(settings: Partial<NotificationSettings>) {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(updated));
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  },

  async sendWorkStartNotification() {
    try {
      const settings = await this.getSettings();
      if (!settings.workStartEnabled) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Начало рабочего дня',
          body: 'Пора начинать работу! 💼',
          sound: 'default',
          badge: 1,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending work start notification:', error);
    }
  },

  async sendWorkEndNotification(totalHours: number, totalMinutes: number) {
    try {
      const settings = await this.getSettings();
      if (!settings.workEndEnabled) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Конец рабочего дня',
          body: `Вы отработали ${totalHours}ч ${totalMinutes}м. Отличная работа! ✨`,
          sound: 'default',
          badge: 1,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending work end notification:', error);
    }
  },

  async sendBreakReminder(hoursSinceLastBreak: number) {
    try {
      const settings = await this.getSettings();
      if (!settings.breakRemindersEnabled) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Пора на перерыв',
          body: `Вы работаете уже ${hoursSinceLastBreak} часов. Пора отдохнуть! ☕`,
          sound: 'default',
          badge: 1,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending break reminder notification:', error);
    }
  },

  async sendGoalAchievementNotification(goal: string, percentage: number) {
    try {
      const settings = await this.getSettings();
      if (!settings.goalAchievementEnabled) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Цель достигнута!',
          body: `${goal}: ${percentage}% ✅`,
          sound: 'default',
          badge: 1,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending goal achievement notification:', error);
    }
  },

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  },
};
