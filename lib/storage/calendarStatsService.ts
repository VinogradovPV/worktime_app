import { getWorkSessionsByDate, WorkSession } from "./workSessionStorage";
import { getProductionCalendar, getVacationPeriods } from "./notificationSettings";

export interface CalendarStats {
  totalDays: number; // Всего дней в периоде
  workdaysInCalendar: number; // Рабочих дней по производственному календарю
  workedDays: number; // Дней с рабочими событиями
  workedHours: number; // Всего отработано часов (в секундах)
  weekends: number; // Выходных дней
  holidays: number; // Праздничных дней
  vacationDays: number; // Дней отпуска
  requiresCheckDays: number; // Дней требующих проверки
}

export interface DayStats {
  date: string; // YYYY-MM-DD
  dayType: "workday" | "weekend" | "holiday" | "vacation" | "shortened_workday";
  workedHours: number; // В секундах
  hasData: boolean;
  requiresCheck: boolean;
}

/**
 * Получить статистику за период
 */
export async function getPeriodStats(startDate: Date, endDate: Date, year: number): Promise<CalendarStats> {
  const stats: CalendarStats = {
    totalDays: 0,
    workdaysInCalendar: 0,
    workedDays: 0,
    workedHours: 0,
    weekends: 0,
    holidays: 0,
    vacationDays: 0,
    requiresCheckDays: 0,
  };

  // Получить производственный календарь
  const calendar = await getProductionCalendar(year);
  const vacations = await getVacationPeriods();

  // Создать map праздничных дней
  const holidaysMap = new Map<string, boolean>();
  if (calendar?.holidays) {
    calendar.holidays.forEach((h) => {
      holidaysMap.set(h.date, true);
    });
  }

  // Создать map отпусков
  const vacationMap = new Map<string, boolean>();
  vacations.forEach((period) => {
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    let current = new Date(start);

    while (current <= end) {
      const dateStr = formatDateForCalendar(current);
      vacationMap.set(dateStr, true);
      current.setDate(current.getDate() + 1);
    }
  });

  // Итерировать по дням в периоде
  let current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = formatDateForCalendar(current);
    stats.totalDays++;

    // Определить тип дня
    const isHoliday = holidaysMap.has(dateStr);
    const isWeekend = isWeekendDay(current);
    const isVacation = vacationMap.has(dateStr);

    if (isVacation) {
      stats.vacationDays++;
    } else if (isHoliday) {
      stats.holidays++;
    } else if (isWeekend) {
      stats.weekends++;
    } else {
      stats.workdaysInCalendar++;
    }

    // Получить рабочие сессии за день
    try {
      const sessions = await getWorkSessionsByDate(dateStr);
      if (sessions.length > 0) {
        stats.workedDays++;

        // Рассчитать отработанные часы
        sessions.forEach((session: any) => {
          const workDuration = session.workDuration || 0;
          const breakDuration = session.breakDuration || 0;
          const netWorkTime = workDuration - breakDuration;

          if (netWorkTime > 0) {
            stats.workedHours += netWorkTime;
          }
        });
      }
    } catch (error) {
      console.error(`Ошибка при получении сессий для ${dateStr}:`, error);
    }

    current.setDate(current.getDate() + 1);
  }

  return stats;
}

/**
 * Получить статистику для каждого дня в периоде
 */
export async function getDayStatsForPeriod(
  startDate: Date,
  endDate: Date,
  year: number
): Promise<DayStats[]> {
  const dayStats: DayStats[] = [];

  // Получить производственный календарь
  const calendar = await getProductionCalendar(year);
  const vacations = await getVacationPeriods();

  // Создать map праздничных дней
  const holidaysMap = new Map<string, boolean>();
  if (calendar?.holidays) {
    calendar.holidays.forEach((h) => {
      holidaysMap.set(h.date, true);
    });
  }

  // Создать map отпусков
  const vacationMap = new Map<string, boolean>();
  vacations.forEach((period) => {
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    let current = new Date(start);

    while (current <= end) {
      const dateStr = formatDateForCalendar(current);
      vacationMap.set(dateStr, true);
      current.setDate(current.getDate() + 1);
    }
  });

  // Итерировать по дням в периоде
  let current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = formatDateForCalendar(current);

    // Определить тип дня
    const isHoliday = holidaysMap.has(dateStr);
    const isWeekend = isWeekendDay(current);
    const isVacation = vacationMap.has(dateStr);

    let dayType: "workday" | "weekend" | "holiday" | "vacation" | "shortened_workday" = "workday";

    if (isVacation) {
      dayType = "vacation";
    } else if (isHoliday) {
      dayType = "holiday";
    } else if (isWeekend) {
      dayType = "weekend";
    }

    // Получить рабочие сессии за день
    let workedHours = 0;
    let hasData = false;
    let requiresCheck = false;

    try {
      const sessions = await getWorkSessionsByDate(dateStr);
      if (sessions.length > 0) {
        hasData = true;

        // Рассчитать отработанные часы
        sessions.forEach((session: any) => {
          const workDuration = session.workDuration || 0;
          const breakDuration = session.breakDuration || 0;
          const netWorkTime = workDuration - breakDuration;

          if (netWorkTime > 0) {
            workedHours += netWorkTime;
          }
        });
      }

      // Проверить, требует ли день проверки
      // День требует проверки если это рабочий день, но нет данных
      if (dayType === "workday" && !hasData) {
        requiresCheck = true;
      }
    } catch (error) {
      console.error(`Ошибка при получении сессий для ${dateStr}:`, error);
    }

    dayStats.push({
      date: dateStr,
      dayType,
      workedHours,
      hasData,
      requiresCheck,
    });

    current.setDate(current.getDate() + 1);
  }

  return dayStats;
}

/**
 * Проверить, является ли день выходным (суббота или воскресенье)
 */
function isWeekendDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * Форматировать дату в YYYY-MM-DD
 */
function formatDateForCalendar(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Форматировать количество секунд в строку "X ч Y мин"
 */
export function formatWorkedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes} мин`;
  }

  if (minutes === 0) {
    return `${hours} ч`;
  }

  return `${hours} ч ${minutes} мин`;
}

/**
 * Получить начало периода (месяца, квартала, года, недели)
 */
export function getPeriodStart(date: Date, mode: "month" | "quarter" | "year" | "week"): Date {
  const result = new Date(date);

  switch (mode) {
    case "month":
      result.setDate(1);
      break;

    case "quarter": {
      const quarter = Math.floor(date.getMonth() / 3);
      result.setMonth(quarter * 3);
      result.setDate(1);
      break;
    }

    case "year":
      result.setMonth(0);
      result.setDate(1);
      break;

    case "week": {
      const dayOfWeek = result.getDay();
      const diff = result.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      result.setDate(diff);
      break;
    }
  }

  return result;
}

/**
 * Получить конец периода (месяца, квартала, года, недели)
 */
export function getPeriodEnd(date: Date, mode: "month" | "quarter" | "year" | "week"): Date {
  const result = new Date(date);

  switch (mode) {
    case "month":
      result.setMonth(result.getMonth() + 1);
      result.setDate(0);
      break;

    case "quarter": {
      const quarter = Math.floor(date.getMonth() / 3);
      result.setMonth((quarter + 1) * 3);
      result.setDate(0);
      break;
    }

    case "year":
      result.setMonth(11);
      result.setDate(31);
      break;

    case "week": {
      const dayOfWeek = result.getDay();
      const diff = result.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      result.setDate(diff + 6);
      break;
    }
  }

  return result;
}
