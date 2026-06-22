import { WorkDay, WorkDayStats } from '@/shared/types/workday';
import { calculateWorkDayStats as calculateWorkDayStatsOriginal } from './workdayStatsService';

/**
 * Оптимизированная версия calculateWorkDayStats с кэшированием
 * Использует простой кэш в памяти для быстрого доступа
 */

// Кэш результатов расчета (дата -> результат)
const workDayStatsCache = new Map<string, WorkDayStats>();

/**
 * Очищает кэш статистики рабочего дня
 */
export function clearWorkDayStatsCache(): void {
  workDayStatsCache.clear();
}

/**
 * Инвалидирует кэш для конкретного дня
 */
export function invalidateWorkDayStatsCache(date: string): void {
  workDayStatsCache.delete(date);
}

/**
 * Вычисляет статистику рабочего дня с кэшированием
 * Результат кэшируется в памяти для быстрого доступа
 */
export function calculateWorkDayStatsOptimized(
  workDay: WorkDay,
  now: Date = new Date()
): WorkDayStats {
  // Проверяем кэш
  const cached = workDayStatsCache.get(workDay.date);
  if (cached) {
    return cached;
  }

  // Вычисляем статистику
  const stats = calculateWorkDayStatsOriginal(workDay, now);

  // Сохраняем в кэш
  workDayStatsCache.set(workDay.date, stats);

  return stats;
}

/**
 * Вычисляет статистику для нескольких рабочих дней
 * Использует пакетную обработку для оптимизации
 */
export function calculateMultipleWorkDaysStats(
  workDays: WorkDay[],
  now: Date = new Date()
): Map<string, WorkDayStats> {
  const results = new Map<string, WorkDayStats>();

  for (const workDay of workDays) {
    const stats = calculateWorkDayStatsOptimized(workDay, now);
    results.set(workDay.date, stats);
  }

  return results;
}

/**
 * Получает общую статистику за период
 * Использует кэшированные результаты для каждого дня
 */
export function getAggregatedStats(
  workDays: WorkDay[],
  now: Date = new Date()
): {
  totalWorkMs: number;
  totalBreakMs: number;
  totalTemporaryExitMs: number;
  totalWork95Ms: number;
  averageWorkMs: number;
  daysWithData: number;
} {
  let totalWorkMs = 0;
  let totalBreakMs = 0;
  let totalTemporaryExitMs = 0;
  let totalWork95Ms = 0;
  let daysWithData = 0;

  for (const workDay of workDays) {
    const stats = calculateWorkDayStatsOptimized(workDay, now);

    if (stats.totalWorkMs > 0) {
      daysWithData++;
    }

    totalWorkMs += stats.totalWorkMs;
    totalBreakMs += stats.totalBreakMs;
    totalTemporaryExitMs += stats.totalTemporaryExitMs;
    totalWork95Ms += stats.work95Ms;
  }

  const averageWorkMs = daysWithData > 0 ? totalWorkMs / daysWithData : 0;

  return {
    totalWorkMs,
    totalBreakMs,
    totalTemporaryExitMs,
    totalWork95Ms,
    averageWorkMs,
    daysWithData,
  };
}

/**
 * Получает информацию о размере кэша
 */
export function getCacheInfo(): {
  size: number;
  entries: string[];
} {
  return {
    size: workDayStatsCache.size,
    entries: Array.from(workDayStatsCache.keys()),
  };
}
