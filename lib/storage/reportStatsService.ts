import { WorkDay } from "@/shared/types/workday";
import { getWorkDay } from "./workdayService";
import { calculateWorkDayStats } from "./workdayStatsService";
import { getProductionCalendar, getVacationPeriods } from "./notificationSettings";

export interface ReportDayStats {
  date: string; // YYYY-MM-DD
  dayType: "workday" | "weekend" | "holiday" | "vacation" | "shortened_workday";
  workedMs: number; // Отработано в миллисекундах
  breakMs: number; // Перерывы в миллисекундах
  temporaryExitMs: number; // Временные выходы в миллисекундах
  work95Ms: number; // 95% норма в миллисекундах
  hasData: boolean; // Есть ли данные о работе
  requiresCheck: boolean; // Требует ли проверки
}

export interface ReportPeriodStats {
  totalDays: number; // Всего дней в периоде
  workdaysInCalendar: number; // Рабочих дней по производственному календарю
  workedDays: number; // Дней с рабочими событиями
  totalWorkedMs: number; // Всего отработано (в миллисекундах)
  totalBreakMs: number; // Всего перерывов (в миллисекундах)
  totalTemporaryExitMs: number; // Всего временных выходов (в миллисекундах)
  totalWork95Ms: number; // Всего 95% норма (в миллисекундах)
  weekends: number; // Выходных дней
  holidays: number; // Праздничных дней
  vacationDays: number; // Дней отпуска
  requiresCheckDays: number; // Дней требующих проверки
  averageWorkedMs: number; // Среднее отработано в день (в миллисекундах)
}

/**
 * Форматировать дату в YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Проверить, является ли день выходным (суббота или воскресенье)
 */
function isWeekendDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * Получить статистику за период
 */
export async function getPeriodStats(
  startDate: Date,
  endDate: Date,
  year: number
): Promise<ReportPeriodStats> {
  const stats: ReportPeriodStats = {
    totalDays: 0,
    workdaysInCalendar: 0,
    workedDays: 0,
    totalWorkedMs: 0,
    totalBreakMs: 0,
    totalTemporaryExitMs: 0,
    totalWork95Ms: 0,
    weekends: 0,
    holidays: 0,
    vacationDays: 0,
    requiresCheckDays: 0,
    averageWorkedMs: 0,
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
      const dateStr = formatDate(current);
      vacationMap.set(dateStr, true);
      current.setDate(current.getDate() + 1);
    }
  });

  // Итерировать по дням в периоде
  let current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = formatDate(current);
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

    // Получить рабочий день
    try {
      const workDay = await getWorkDay(dateStr);
      if (workDay) {
        stats.workedDays++;

        // Рассчитать статистику
        const dayStats = calculateWorkDayStats(workDay);
        stats.totalWorkedMs += dayStats.totalWorkMs;
        stats.totalBreakMs += dayStats.totalBreakMs;
        stats.totalTemporaryExitMs += dayStats.totalTemporaryExitMs;
        stats.totalWork95Ms += dayStats.work95Ms;
      }

      // Проверить, требует ли день проверки
      // День требует проверки если это рабочий день, но нет данных
      if (!isVacation && !isHoliday && !isWeekend && !workDay) {
        stats.requiresCheckDays++;
      }
    } catch (error) {
      console.error(`Ошибка при получении рабочего дня для ${dateStr}:`, error);
    }

    current.setDate(current.getDate() + 1);
  }

  // Рассчитать среднее
  if (stats.workedDays > 0) {
    stats.averageWorkedMs = Math.round(stats.totalWorkedMs / stats.workedDays);
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
): Promise<ReportDayStats[]> {
  const dayStats: ReportDayStats[] = [];

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
      const dateStr = formatDate(current);
      vacationMap.set(dateStr, true);
      current.setDate(current.getDate() + 1);
    }
  });

  // Итерировать по дням в периоде
  let current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = formatDate(current);

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

    // Получить рабочий день
    let workedMs = 0;
    let breakMs = 0;
    let temporaryExitMs = 0;
    let work95Ms = 0;
    let hasData = false;
    let requiresCheck = false;

    try {
      const workDay = await getWorkDay(dateStr);
      if (workDay) {
        hasData = true;

        // Рассчитать статистику
        const stats = calculateWorkDayStats(workDay);
        workedMs = stats.totalWorkMs;
        breakMs = stats.totalBreakMs;
        temporaryExitMs = stats.totalTemporaryExitMs;
        work95Ms = stats.work95Ms;
      }

      // Проверить, требует ли день проверки
      // День требует проверки если это рабочий день, но нет данных
      if (dayType === "workday" && !hasData) {
        requiresCheck = true;
      }
    } catch (error) {
      console.error(`Ошибка при получении рабочего дня для ${dateStr}:`, error);
    }

    dayStats.push({
      date: dateStr,
      dayType,
      workedMs,
      breakMs,
      temporaryExitMs,
      work95Ms,
      hasData,
      requiresCheck,
    });

    current.setDate(current.getDate() + 1);
  }

  return dayStats;
}

/**
 * Форматировать количество миллисекунд в строку "X ч Y мин"
 */
export function formatWorkedTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
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
 * Форматировать количество миллисекунд в часы (с одной десятичной)
 */
export function formatWorkedHours(ms: number): number {
  const seconds = ms / 1000;
  const hours = seconds / 3600;
  return Math.round(hours * 10) / 10;
}

/**
 * Получить начало периода (месяца, квартала, года, недели, дня)
 */
export function getPeriodStart(date: Date, period: "day" | "week" | "month" | "quarter" | "year"): Date {
  const d = new Date(date);

  if (period === "day") {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  } else if (period === "week") {
    // Начало недели (понедельник) — без мутации d
    const dayOfWeek = d.getDay();
    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff);
  } else if (period === "month") {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  } else if (period === "quarter") {
    const quarter = Math.floor(d.getMonth() / 3);
    return new Date(d.getFullYear(), quarter * 3, 1);
  } else if (period === "year") {
    return new Date(d.getFullYear(), 0, 1);
  }

  return d;
}

/**
 * Получить конец периода (месяца, квартала, года, недели, дня)
 */
export function getPeriodEnd(date: Date, period: "day" | "week" | "month" | "quarter" | "year"): Date {
  const d = new Date(date);

  if (period === "day") {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  } else if (period === "week") {
    // Конец недели (воскресенье) — без мутации d
    const dayOfWeek = d.getDay();
    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? 0 : 7);
    return new Date(d.getFullYear(), d.getMonth(), diff, 23, 59, 59);
  } else if (period === "month") {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  } else if (period === "quarter") {
    const quarter = Math.floor(d.getMonth() / 3);
    return new Date(d.getFullYear(), (quarter + 1) * 3, 0);
  } else if (period === "year") {
    return new Date(d.getFullYear(), 11, 31);
  }

  return d;
}
