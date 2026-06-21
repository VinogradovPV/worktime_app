import { useState, useEffect, useCallback } from "react";
import * as Notifications from "expo-notifications";
import {
  NotificationSettings,
  VacationPeriod,
  ProductionCalendar,
  getNotificationSettings,
  saveNotificationSettings,
  getVacationPeriods,
  addVacationPeriod,
  removeVacationPeriod,
  getProductionCalendar,
  saveProductionCalendar,
  isWorkday,
} from "@/lib/storage/notificationSettings";

export function useNotifications() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Загрузить настройки при инициализации
  useEffect(() => {
    loadSettings();
    loadVacations();
    requestNotificationPermissions();
  }, []);

  const requestNotificationPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.warn("Разрешение на уведомления не предоставлено");
      }
    } catch (error) {
      console.error("Ошибка при запросе разрешения на уведомления:", error);
    }
  };

  const loadSettings = useCallback(async () => {
    try {
      const loaded = await getNotificationSettings();
      setSettings(loaded);
    } catch (error) {
      console.error("Ошибка при загрузке настроек уведомлений:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadVacations = useCallback(async () => {
    try {
      const periods = await getVacationPeriods();
      setVacationPeriods(periods);
    } catch (error) {
      console.error("Ошибка при загрузке периодов отпусков:", error);
    }
  }, []);

  const updateSettings = useCallback(
    async (newSettings: Partial<NotificationSettings>) => {
      try {
        if (!settings) return;
        const updated = { ...settings, ...newSettings };
        await saveNotificationSettings(updated);
        setSettings(updated);
      } catch (error) {
        console.error("Ошибка при обновлении настроек уведомлений:", error);
        throw error;
      }
    },
    [settings]
  );

  const addVacation = useCallback(
    async (startDate: string, endDate: string, type: "vacation" | "sick_leave" | "unpaid_leave", notes?: string) => {
      try {
        const period: VacationPeriod = {
          id: Date.now().toString(),
          startDate,
          endDate,
          type,
          notes,
        };
        await addVacationPeriod(period);
        setVacationPeriods([...vacationPeriods, period]);
        return period;
      } catch (error) {
        console.error("Ошибка при добавлении периода отпуска:", error);
        throw error;
      }
    },
    [vacationPeriods]
  );

  const removeVacation = useCallback(
    async (periodId: string) => {
      try {
        await removeVacationPeriod(periodId);
        setVacationPeriods(vacationPeriods.filter((p) => p.id !== periodId));
      } catch (error) {
        console.error("Ошибка при удалении периода отпуска:", error);
        throw error;
      }
    },
    [vacationPeriods]
  );

  const scheduleNotifications = useCallback(async () => {
    try {
      if (!settings) return;

      // Отменить все запланированные уведомления
      await Notifications.cancelAllScheduledNotificationsAsync();

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Проверить, рабочий ли завтрашний день
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      const isTomorrowWorkday = await isWorkday(tomorrowStr);

      if (isTomorrowWorkday && settings.morningNotificationEnabled) {
        // Запланировать утреннее уведомление
        const [hours, minutes] = settings.morningNotificationTime.split(":").map(Number);
        const notificationTime = new Date(tomorrow);
        notificationTime.setHours(hours, minutes, 0, 0);

        if (notificationTime > new Date()) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Начало рабочего дня",
              body: "Не забудьте отметить начало работы",
              sound: "default",
            },
            trigger: {
              type: "timeInterval",
              seconds: Math.max(1, Math.round((notificationTime.getTime() - new Date().getTime()) / 1000)),
            } as any,
          });
        }
      }

      // Проверить, рабочий ли был вчерашний день
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const wasYesterdayWorkday = await isWorkday(yesterdayStr);

      if (wasYesterdayWorkday && settings.eveningNotificationEnabled) {
        // Запланировать утреннее уведомление в 10:00 с отчетом за предыдущий рабочий день
        const [hours, minutes] = settings.eveningNotificationTime.split(":").map(Number);
        const notificationTime = new Date(today);
        notificationTime.setHours(hours, minutes, 0, 0);

        if (notificationTime > new Date()) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Отчет за предыдущий день",
              body: "Посмотрите, сколько часов вы отработали",
              sound: "default",
            },
            trigger: {
              type: "timeInterval",
              seconds: Math.max(1, Math.round((notificationTime.getTime() - new Date().getTime()) / 1000)),
            } as any,
          });
        }
      }
    } catch (error) {
      console.error("Ошибка при планировании уведомлений:", error);
    }
  }, [settings]);

  const uploadProductionCalendar = useCallback(
    async (calendar: ProductionCalendar) => {
      try {
        await saveProductionCalendar(calendar);
        // Перепланировать уведомления после загрузки календаря
        await scheduleNotifications();
      } catch (error) {
        console.error("Ошибка при загрузке производственного календаря:", error);
        throw error;
      }
    },
    [scheduleNotifications]
  );

  return {
    settings,
    vacationPeriods,
    isLoading,
    updateSettings,
    addVacation,
    removeVacation,
    scheduleNotifications,
    uploadProductionCalendar,
  };
}
