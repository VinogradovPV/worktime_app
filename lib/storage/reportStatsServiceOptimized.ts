import { WorkDay } from '@/shared/types/workday';
import { statsCacheService } from './statsCacheService';
import { calculateWorkDayStats } from './workdayStatsService';
import { getProductionCalendar, getVacationPeriods } from './notificationSettings';
import { getWorkDay } from './workdayService';

// Используем интерфейс из reportStatsService
import { ReportDayStats as OriginalReportDayStats, ReportPeriodStats as OriginalReportPeriodStats } from './reportStatsService';
export type ReportDayStats = OriginalReportDayStats;
export type ReportPeriodStats = OriginalReportPeriodStats;

/**
 * Получает статистику за период с кэшированием
 */
export async function getPeriodStatsOptimized(
  startDate: string,
  endDate: string,
  mode: 'day' | 'week' | 'month' | 'quarter' | 'year'
): Promise<ReportPeriodStats> {
  // Проверяем кэш
  const cached = await statsCacheService.getCachedPeriodStats(startDate, endDate, mode);
  if (cached) {
    return cached;
  }

  // Вычисляем статистику
  const stats = await computePeriodStats(startDate, endDate);

  // Сохраняем в кэш
  // Для больших периодов используем более длительный TTL
  const ttl = mode === 'year' ? 10 * 60 * 1000 : 5 * 60 * 1000; // 10 мин для года, 5 мин для остального
  await statsCacheService.setCachedPeriodStats(startDate, endDate, mode, stats, ttl);

  return stats;
}

/**
 * Вычисляет статистику за период
 */
async function computePeriodStats(
  startDate: string,
  endDate: string
): Promise<ReportPeriodStats> {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Получаем дневную статистику
  const dayStats = await getDayStatsForPeriodOptimized(startDate, endDate);

  // Вычисляем агрегированные метрики
  let totalWorkedMs = 0;
  let totalBreakMs = 0;
  let totalTemporaryExitMs = 0;
  let totalWork95Ms = 0;
  let workdaysInCalendar = 0;
  let weekendCount = 0;
  let holidayCount = 0;
  let vacationCount = 0;
  let requiresCheckCount = 0;
  let workedDays = 0;

  for (const day of dayStats) {
    totalWorkedMs += day.workedMs;
    totalBreakMs += day.breakMs;
    totalTemporaryExitMs += day.temporaryExitMs;
    totalWork95Ms += day.work95Ms;

    if (day.hasData) {
      workedDays++;
    }

    if (day.requiresCheck) {
      requiresCheckCount++;
    }

    switch (day.dayType) {
      case 'workday':
        workdaysInCalendar++;
        break;
      case 'weekend':
        weekendCount++;
        break;
      case 'holiday':
        holidayCount++;
        break;
      case 'vacation':
        vacationCount++;
        break;
    }
  }

  const averageWorkedMs = workedDays > 0 ? totalWorkedMs / workedDays : 0;

  return {
    totalDays: dayStats.length,
    workdaysInCalendar,
    workedDays,
    totalWorkedMs,
    totalBreakMs,
    totalTemporaryExitMs,
    totalWork95Ms,
    weekends: weekendCount,
    holidays: holidayCount,
    vacationDays: vacationCount,
    requiresCheckDays: requiresCheckCount,
    averageWorkedMs,
  };
}

/**
 * Получает дневную статистику за период с оптимизацией
 */
async function getDayStatsForPeriodOptimized(
  startDate: string,
  endDate: string
): Promise<ReportDayStats[]> {
  // Проверяем кэш дневной статистики
  const cached = await statsCacheService.getCachedDayStats(startDate, endDate);
  if (cached) {
    return cached;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const dayStats: ReportDayStats[] = [];

  // Получить производственный календарь и отпуска
  const calendar = await getProductionCalendar(start.getFullYear());
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
    const vacStart = new Date(period.startDate);
    const vacEnd = new Date(period.endDate);
    let vacCurrent = new Date(vacStart);
    while (vacCurrent <= vacEnd) {
      const vacDateStr = vacCurrent.toISOString().split('T')[0];
      vacationMap.set(vacDateStr, true);
      vacCurrent.setDate(vacCurrent.getDate() + 1);
    }
  });

  // Обрабатываем дни периода
  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];

    // Определить тип дня
    const isHoliday = holidaysMap.has(dateStr);
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;
    const isVacation = vacationMap.has(dateStr);

    let dayType: 'workday' | 'weekend' | 'holiday' | 'vacation' | 'shortened_workday' = 'workday';
    if (isVacation) {
      dayType = 'vacation';
    } else if (isHoliday) {
      dayType = 'holiday';
    } else if (isWeekend) {
      dayType = 'weekend';
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
      if (dayType === 'workday' && !hasData) {
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

  // Сохраняем в кэш
  const ttl = (end.getTime() - start.getTime()) > 30 * 24 * 60 * 60 * 1000 
    ? 10 * 60 * 1000 
    : 5 * 60 * 1000;
  await statsCacheService.setCachedDayStats(startDate, endDate, dayStats, ttl);

  return dayStats;
}

/**
 * Инвалидирует кэш при изменении рабочего дня
 */
export async function invalidateCacheForDate(date: string): Promise<void> {
  // Инвалидируем кэш для всех периодов, содержащих эту дату
  const dateObj = new Date(date);

  // Инвалидируем кэш дня
  await statsCacheService.invalidateDayStatsCache(date, date);

  // Инвалидируем кэш недели
  const weekStart = new Date(dateObj);
  weekStart.setDate(dateObj.getDate() - dateObj.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  await statsCacheService.invalidatePeriodCache(
    weekStart.toISOString().split('T')[0],
    weekEnd.toISOString().split('T')[0],
    'week'
  );

  // Инвалидируем кэш месяца
  const monthStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
  const monthEnd = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
  await statsCacheService.invalidatePeriodCache(
    monthStart.toISOString().split('T')[0],
    monthEnd.toISOString().split('T')[0],
    'month'
  );

  // Инвалидируем кэш квартала
  const quarter = Math.floor(dateObj.getMonth() / 3);
  const quarterStart = new Date(dateObj.getFullYear(), quarter * 3, 1);
  const quarterEnd = new Date(dateObj.getFullYear(), quarter * 3 + 3, 0);
  await statsCacheService.invalidatePeriodCache(
    quarterStart.toISOString().split('T')[0],
    quarterEnd.toISOString().split('T')[0],
    'quarter'
  );

  // Инвалидируем кэш года
  const yearStart = new Date(dateObj.getFullYear(), 0, 1);
  const yearEnd = new Date(dateObj.getFullYear(), 11, 31);
  await statsCacheService.invalidatePeriodCache(
    yearStart.toISOString().split('T')[0],
    yearEnd.toISOString().split('T')[0],
    'year'
  );
}
