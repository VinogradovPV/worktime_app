import AsyncStorage from "@react-native-async-storage/async-storage";

export interface NotificationSettings {
  morningNotificationTime: string; // HH:mm формат, по умолчанию "09:30"
  eveningNotificationTime: string; // HH:mm формат, по умолчанию "10:00"
  morningNotificationEnabled: boolean; // Включено ли уведомление о начале дня
  eveningNotificationEnabled: boolean; // Включено ли уведомление о времени работы за предыдущий день
  endOfDayReminderEnabled: boolean; // Напоминание о завершении рабочего дня
  endOfDayReminderTime: string;    // HH:mm формат, по умолчанию "18:00"
}

export interface VacationPeriod {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  type: "vacation" | "sick_leave" | "unpaid_leave";
  notes?: string;
}

export interface ProductionCalendar {
  id: string;
  year: number;
  holidays: Array<{
    date: string; // YYYY-MM-DD
    name: string;
    isMovedWorkday?: boolean; // Перенесенный рабочий день
  }>;
  uploadedAt: string; // ISO 8601
}

const NOTIFICATION_SETTINGS_KEY = "worktime_notification_settings";
const VACATION_PERIODS_KEY = "worktime_vacation_periods";
const PRODUCTION_CALENDAR_KEY = "worktime_production_calendar";

// Получить настройки уведомлений
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const settings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (settings) {
      return JSON.parse(settings);
    }
    // Возвращаем значения по умолчанию
    return {
      morningNotificationTime: "09:30",
      eveningNotificationTime: "10:00",
      morningNotificationEnabled: true,
      eveningNotificationEnabled: true,
      endOfDayReminderEnabled: true,
      endOfDayReminderTime: "18:00",
    };
  } catch (error) {
    console.error("Ошибка при получении настроек уведомлений:", error);
    return {
      morningNotificationTime: "09:30",
      eveningNotificationTime: "10:00",
      morningNotificationEnabled: true,
      eveningNotificationEnabled: true,
      endOfDayReminderEnabled: true,
      endOfDayReminderTime: "18:00",
    };
  }
}

// Сохранить настройки уведомлений
export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Ошибка при сохранении настроек уведомлений:", error);
    throw error;
  }
}

// Получить все периоды отпусков
export async function getVacationPeriods(): Promise<VacationPeriod[]> {
  try {
    const periods = await AsyncStorage.getItem(VACATION_PERIODS_KEY);
    return periods ? JSON.parse(periods) : [];
  } catch (error) {
    console.error("Ошибка при получении периодов отпусков:", error);
    return [];
  }
}

// Добавить период отпуска
export async function addVacationPeriod(period: VacationPeriod): Promise<void> {
  try {
    const periods = await getVacationPeriods();
    periods.push(period);
    await AsyncStorage.setItem(VACATION_PERIODS_KEY, JSON.stringify(periods));
  } catch (error) {
    console.error("Ошибка при добавлении периода отпуска:", error);
    throw error;
  }
}

// Удалить период отпуска
export async function removeVacationPeriod(periodId: string): Promise<void> {
  try {
    const periods = await getVacationPeriods();
    const filtered = periods.filter((p) => p.id !== periodId);
    await AsyncStorage.setItem(VACATION_PERIODS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Ошибка при удалении периода отпуска:", error);
    throw error;
  }
}

// Проверить, находится ли дата в периоде отпуска
export async function isDateInVacation(date: string): Promise<boolean> {
  try {
    const periods = await getVacationPeriods();
    const checkDate = new Date(date);

    for (const period of periods) {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);

      if (checkDate >= startDate && checkDate <= endDate) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Ошибка при проверке даты в отпуске:", error);
    return false;
  }
}

/**
 * Встроенный производственный календарь РФ 2026.
 * Источник: Постановление Правительства РФ о переносе выходных дней.
 * Включает официальные праздники и перенесённые рабочие дни.
 */
const BUILTIN_CALENDAR_2026: ProductionCalendar = {
  id: "builtin_2026",
  year: 2026,
  uploadedAt: "2026-01-01T00:00:00.000Z",
  holidays: [
    // Январь: Новый год и Рождество
    { date: "2026-01-01", name: "Новый год" },
    { date: "2026-01-02", name: "Новогодние каникулы" },
    { date: "2026-01-05", name: "Новогодние каникулы" },
    { date: "2026-01-06", name: "Новогодние каникулы" },
    { date: "2026-01-07", name: "Рождество Христово" },
    { date: "2026-01-08", name: "Новогодние каникулы" },
    { date: "2026-01-09", name: "Новогодние каникулы" },
    // Февраль: День защитника Отечества
    { date: "2026-02-23", name: "День защитника Отечества" },
    // Март: Международный женский день
    { date: "2026-03-09", name: "Международный женский день (перенос с 8 марта)" },
    // Май: Праздники
    { date: "2026-05-01", name: "Праздник Весны и Труда" },
    { date: "2026-05-04", name: "Праздник Весны и Труда (перенос)" },
    { date: "2026-05-11", name: "День Победы (перенос с 9 мая)" },
    // Июнь: День России
    { date: "2026-06-12", name: "День России" },
    // Ноябрь: День народного единства
    { date: "2026-11-04", name: "День народного единства" },
  ],
};

// Получить производственный календарь
export async function getProductionCalendar(year: number): Promise<ProductionCalendar | null> {
  try {
    const calendars = await AsyncStorage.getItem(PRODUCTION_CALENDAR_KEY);
    if (calendars) {
      const parsed: ProductionCalendar[] = JSON.parse(calendars);
      const userCalendar = parsed.find((c) => c.year === year);
      if (userCalendar) return userCalendar;
    }

    // Возвращаем встроенный календарь, если пользовательский не загружен
    if (year === 2026) return BUILTIN_CALENDAR_2026;

    return null;
  } catch (error) {
    console.error("Ошибка при получении производственного календаря:", error);
    // В случае ошибки возвращаем встроенный для 2026
    if (year === 2026) return BUILTIN_CALENDAR_2026;
    return null;
  }
}

// Сохранить производственный календарь
export async function saveProductionCalendar(calendar: ProductionCalendar): Promise<void> {
  try {
    let calendars: ProductionCalendar[] = [];
    const existing = await AsyncStorage.getItem(PRODUCTION_CALENDAR_KEY);

    if (existing) {
      calendars = JSON.parse(existing);
      // Удалить старый календарь для этого года
      calendars = calendars.filter((c) => c.year !== calendar.year);
    }

    calendars.push(calendar);
    await AsyncStorage.setItem(PRODUCTION_CALENDAR_KEY, JSON.stringify(calendars));
  } catch (error) {
    console.error("Ошибка при сохранении производственного календаря:", error);
    throw error;
  }
}

// Проверить, является ли дата праздничным днем
export async function isHoliday(date: string): Promise<boolean> {
  try {
    const year = parseInt(date.split("-")[0]);
    const calendar = await getProductionCalendar(year);

    if (!calendar) return false;

    return calendar.holidays.some((h) => h.date === date && !h.isMovedWorkday);
  } catch (error) {
    console.error("Ошибка при проверке праздничного дня:", error);
    return false;
  }
}

// Проверить, является ли день выходным (суббота или воскресенье)
export function isWeekend(date: string): boolean {
  const d = new Date(date);
  const day = d.getDay();
  return day === 0 || day === 6; // 0 = воскресенье, 6 = суббота
}

// Проверить, рабочий ли день
export async function isWorkday(date: string): Promise<boolean> {
  // Проверяем, не выходной ли это день
  if (isWeekend(date)) {
    return false;
  }

  // Проверяем, не праздничный ли это день
  const holiday = await isHoliday(date);
  if (holiday) {
    return false;
  }

  // Проверяем, не в отпуске ли
  const inVacation = await isDateInVacation(date);
  if (inVacation) {
    return false;
  }

  return true;
}
