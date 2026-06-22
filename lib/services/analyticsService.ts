import { WorkDay } from '@/shared/types/workday';

/**
 * Интерфейс для данных тренда
 */
export interface TrendData {
  date: string;
  workedMs: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

/**
 * Интерфейс для пиков активности
 */
export interface ActivityPeak {
  dayOfWeek: string;
  hour: number;
  count: number;
  percentage: number;
}

/**
 * Интерфейс для сравнения периодов
 */
export interface PeriodComparison {
  period1: string;
  period2: string;
  avgWork1: number;
  avgWork2: number;
  difference: number;
  percentChange: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Интерфейс для распределения по дням недели
 */
export interface WeeklyDistribution {
  dayName: string;
  dayOfWeek: number;
  avgWorkedMs: number;
  totalWorkedMs: number;
  dayCount: number;
}

/**
 * Интерфейс для активности по часам
 */
export interface HourlyActivity {
  hour: number;
  count: number;
  avgWorkedMs: number;
  percentage: number;
}

/**
 * Интерфейс для рекомендации
 */
export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  action?: string;
}

/**
 * Рассчитывает тренд рабочего времени за период
 */
export function calculateTrend(workDays: WorkDay[]): TrendData[] {
  const trendData: TrendData[] = [];
  
  // Группируем по дням
  const dayMap = new Map<string, number>();
  for (const day of workDays) {
    dayMap.set(day.date, day.totalWorkMs);
  }

  // Сортируем по дате
  const sortedDates = Array.from(dayMap.keys()).sort();
  
  // Рассчитываем тренд
  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i];
    const currentWork = dayMap.get(date) || 0;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercent = 0;

    if (i > 0) {
      const prevWork = dayMap.get(sortedDates[i - 1]) || 0;
      if (prevWork > 0) {
        trendPercent = ((currentWork - prevWork) / prevWork) * 100;
        if (trendPercent > 5) trend = 'up';
        else if (trendPercent < -5) trend = 'down';
      }
    }

    trendData.push({
      date,
      workedMs: currentWork,
      trend,
      trendPercent,
    });
  }

  return trendData;
}

/**
 * Выявляет пики активности по дням недели
 */
export function identifyActivityPeaks(workDays: WorkDay[]): ActivityPeak[] {
  const peakMap = new Map<string, number>();
  let totalDays = 0;

  for (const day of workDays) {
    if (day.totalWorkMs > 0) {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();
      const dayName = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][dayOfWeek];
      const key = `${dayName}-${dayOfWeek}`;

      peakMap.set(key, (peakMap.get(key) || 0) + 1);
      totalDays++;
    }
  }

  const peaks: ActivityPeak[] = [];
  peakMap.forEach((count, key) => {
    const [dayName, dayOfWeekStr] = key.split('-');
    const dayOfWeek = parseInt(dayOfWeekStr);
    peaks.push({
      dayOfWeek: dayName,
      hour: dayOfWeek,
      count,
      percentage: totalDays > 0 ? (count / totalDays) * 100 : 0,
    });
  });

  return peaks.sort((a, b) => b.count - a.count);
}

/**
 * Сравнивает два периода
 */
export function comparePeriods(
  workDays1: WorkDay[],
  workDays2: WorkDay[]
): PeriodComparison {
  const totalWork1 = workDays1.reduce((sum, day) => sum + day.totalWorkMs, 0);
  const totalWork2 = workDays2.reduce((sum, day) => sum + day.totalWorkMs, 0);

  const avgWork1 = workDays1.length > 0 ? totalWork1 / workDays1.length : 0;
  const avgWork2 = workDays2.length > 0 ? totalWork2 / workDays2.length : 0;

  const difference = avgWork2 - avgWork1;
  const percentChange = avgWork1 > 0 ? (difference / avgWork1) * 100 : 0;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (percentChange > 5) trend = 'up';
  else if (percentChange < -5) trend = 'down';

  return {
    period1: `Период 1 (${workDays1.length} дней)`,
    period2: `Период 2 (${workDays2.length} дней)`,
    avgWork1,
    avgWork2,
    difference,
    percentChange,
    trend,
  };
}

/**
 * Рассчитывает распределение рабочего времени по дням недели
 */
export function calculateWeeklyDistribution(workDays: WorkDay[]): WeeklyDistribution[] {
  const dayMap = new Map<number, { total: number; count: number }>();

  for (const day of workDays) {
    const date = new Date(day.date);
    const dayOfWeek = date.getDay();

    if (!dayMap.has(dayOfWeek)) {
      dayMap.set(dayOfWeek, { total: 0, count: 0 });
    }

    const data = dayMap.get(dayOfWeek)!;
    data.total += day.totalWorkMs;
    data.count += 1;
  }

  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const distribution: WeeklyDistribution[] = [];

  for (let i = 0; i < 7; i++) {
    const data = dayMap.get(i);
    distribution.push({
      dayName: dayNames[i],
      dayOfWeek: i,
      avgWorkedMs: data ? data.total / data.count : 0,
      totalWorkedMs: data ? data.total : 0,
      dayCount: data ? data.count : 0,
    });
  }

  return distribution;
}

/**
 * Рассчитывает активность по часам (на основе типов дней)
 */
export function calculateHourlyActivity(workDays: WorkDay[]): HourlyActivity[] {
  const hourMap = new Map<number, { count: number; total: number }>();
  let totalDays = 0;

  for (const day of workDays) {
    if (day.totalWorkMs > 0) {
      const date = new Date(day.date);
      const hour = date.getHours();

      if (!hourMap.has(hour)) {
        hourMap.set(hour, { count: 0, total: 0 });
      }

      const data = hourMap.get(hour)!;
      data.count += 1;
      data.total += day.totalWorkMs;
      totalDays++;
    }
  }

  const hourlyActivity: HourlyActivity[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const data = hourMap.get(hour);
    hourlyActivity.push({
      hour,
      count: data ? data.count : 0,
      avgWorkedMs: data ? data.total / data.count : 0,
      percentage: totalDays > 0 ? ((data?.count || 0) / totalDays) * 100 : 0,
    });
  }

  return hourlyActivity;
}

/**
 * Генерирует рекомендации по оптимизации
 */
export function generateRecommendations(
  workDays: WorkDay[],
  weeklyDist: WeeklyDistribution[],
  trend: TrendData[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (workDays.length === 0) {
    return recommendations;
  }

  // Рассчитываем среднее рабочее время
  const totalWork = workDays.reduce((sum, day) => sum + day.totalWorkMs, 0);
  const avgWork = totalWork / workDays.length;
  const avgWorkHours = avgWork / (1000 * 3600);

  // Рекомендация 1: Баланс рабочего времени
  if (avgWorkHours > 10) {
    recommendations.push({
      id: 'overwork',
      title: 'Снизьте рабочую нагрузку',
      description: `Вы работаете в среднем ${avgWorkHours.toFixed(1)} часов в день. Рекомендуется снизить до 8-9 часов для лучшей продуктивности.`,
      priority: 'high',
      icon: '⚠️',
    });
  } else if (avgWorkHours < 6) {
    recommendations.push({
      id: 'underwork',
      title: 'Увеличьте рабочее время',
      description: `Вы работаете в среднем ${avgWorkHours.toFixed(1)} часов в день. Для достижения целей рекомендуется работать 8-9 часов.`,
      priority: 'medium',
      icon: '📈',
    });
  }

  // Рекомендация 2: Распределение по дням
  const maxDay = weeklyDist.reduce((max, day) => 
    day.avgWorkedMs > max.avgWorkedMs ? day : max
  );
  const minDay = weeklyDist.reduce((min, day) => 
    day.dayCount > 0 && day.avgWorkedMs < min.avgWorkedMs ? day : min
  );

  if (maxDay.avgWorkedMs > minDay.avgWorkedMs * 1.5 && minDay.dayCount > 0) {
    recommendations.push({
      id: 'unbalanced',
      title: 'Выровняйте нагрузку по дням',
      description: `${maxDay.dayName} вы работаете значительно больше, чем ${minDay.dayName}. Попробуйте распределить нагрузку равномернее.`,
      priority: 'medium',
      icon: '⚖️',
    });
  }

  // Рекомендация 3: Тренд
  if (trend.length > 7) {
    const recentTrend = trend.slice(-7);
    const upCount = recentTrend.filter(t => t.trend === 'up').length;
    const downCount = recentTrend.filter(t => t.trend === 'down').length;

    if (upCount > downCount + 2) {
      recommendations.push({
        id: 'increasing',
        title: 'Нагрузка растет',
        description: 'За последнюю неделю рабочая нагрузка увеличивается. Убедитесь, что вы не переутомляетесь.',
        priority: 'medium',
        icon: '📊',
      });
    } else if (downCount > upCount + 2) {
      recommendations.push({
        id: 'decreasing',
        title: 'Нагрузка снижается',
        description: 'За последнюю неделю рабочая нагрузка снижается. Проверьте, все ли задачи выполняются.',
        priority: 'low',
        icon: '📉',
      });
    }
  }

  // Рекомендация 4: Перерывы
  const avgBreak = workDays.reduce((sum, day) => sum + day.totalBreakMs, 0) / workDays.length;
  const avgBreakHours = avgBreak / (1000 * 3600);

  if (avgBreakHours < 0.5) {
    recommendations.push({
      id: 'no_breaks',
      title: 'Делайте больше перерывов',
      description: `Вы делаете в среднем ${(avgBreakHours * 60).toFixed(0)} минут перерывов. Рекомендуется 30-60 минут в день.`,
      priority: 'high',
      icon: '☕',
    });
  }

  // Рекомендация 5: Выходные
  const weekendDays = weeklyDist.filter(d => d.dayOfWeek === 0 || d.dayOfWeek === 6);
  const weekendWork = weekendDays.reduce((sum, day) => sum + day.totalWorkedMs, 0);

  if (weekendWork > 0) {
    recommendations.push({
      id: 'weekend_work',
      title: 'Отдыхайте в выходные',
      description: 'Вы работаете в выходные дни. Постарайтесь сохранить выходные для отдыха и восстановления.',
      priority: 'medium',
      icon: '🏖️',
    });
  }

  return recommendations;
}

/**
 * Форматирует миллисекунды в часы и минуты
 */
export function formatWorkTime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 3600));
  const minutes = Math.floor((ms % (1000 * 3600)) / (1000 * 60));
  return `${hours}ч ${minutes}м`;
}

/**
 * Форматирует миллисекунды в часы с десятичной точкой
 */
export function formatWorkHours(ms: number): number {
  return Math.round((ms / (1000 * 3600)) * 10) / 10;
}
