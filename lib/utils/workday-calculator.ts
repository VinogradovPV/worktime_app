/**
 * Алгоритм расчета рабочего времени с поддержкой переходов через полночь
 */

import { WorkDay, TimeInterval } from '@/shared/types/workday';
import {
  isIntervalCrossesMidnight,
  calculateIntervalDuration,
  getDateFromISO,
  msToHours,
} from './midnight-utils';

/**
 * Константы для лимитов активной сессии
 */
export const WORK_SESSION_LIMITS = {
  softWarningAfterHours: 14, // Предупреждение после 14 часов
  maxActiveSessionHours: 24, // Максимум 24 часа без требования проверки
};

/**
 * Результат расчета рабочего времени
 */
export interface WorkDayCalculationResult {
  totalWorkMs: number; // Общее рабочее время в миллисекундах
  totalBreakMs: number; // Общее время перерывов в миллисекундах
  totalTemporaryExitMs: number; // Общее время временных выходов в миллисекундах
  netWorkMs: number; // Чистое рабочее время (работа - перерывы - выходы)
  crossesMidnight: boolean; // Пересекает ли рабочий день полночь
  requiresReview: boolean; // Требует ли проверки (более 24 часов)
  reviewReason?: string; // Причина требования проверки
  warningMessage?: string; // Предупреждение (если более 14 часов)
}

/**
 * Вычисляет общую длительность интервалов
 */
function calculateTotalIntervalDuration(intervals: TimeInterval[]): number {
  let total = 0;
  
  for (const interval of intervals) {
    if (interval.endAt) {
      const duration = calculateIntervalDuration(interval.startAt, interval.endAt);
      total += duration;
    }
  }
  
  return total;
}

/**
 * Основной алгоритм расчета рабочего времени
 * 
 * Требования:
 * 1. Рабочий день хранится как единая сессия с startAt и endAt
 * 2. businessDate = дата начала рабочего дня
 * 3. Переход через полночь не считается ошибкой
 * 4. Рабочее время = endAt - startAt - перерывы - временные выходы
 * 5. Перерывы и временные выходы могут пересекать полночь
 * 6. После 14 часов показывать предупреждение
 * 7. После 24 часов переводить в requires_review
 */
export function calculateWorkDayStats(workDay: WorkDay): WorkDayCalculationResult {
  const result: WorkDayCalculationResult = {
    totalWorkMs: 0,
    totalBreakMs: 0,
    totalTemporaryExitMs: 0,
    netWorkMs: 0,
    crossesMidnight: false,
    requiresReview: false,
  };

  // Если рабочий день не начался или не завершился, возвращаем нулевые значения
  if (!workDay.workStartAt || !workDay.workEndAt) {
    return result;
  }

  // Вычисляем общее рабочее время (от начала до конца)
  const totalWorkMs = calculateIntervalDuration(workDay.workStartAt, workDay.workEndAt);
  result.totalWorkMs = totalWorkMs;

  // Проверяем, пересекает ли рабочий день полночь
  result.crossesMidnight = isIntervalCrossesMidnight(workDay.workStartAt, workDay.workEndAt);

  // Вычисляем время перерывов
  const totalBreakMs = calculateTotalIntervalDuration(workDay.breakIntervals);
  result.totalBreakMs = totalBreakMs;

  // Вычисляем время временных выходов
  const totalTemporaryExitMs = calculateTotalIntervalDuration(workDay.temporaryExitIntervals);
  result.totalTemporaryExitMs = totalTemporaryExitMs;

  // Вычисляем чистое рабочее время
  result.netWorkMs = Math.max(0, totalWorkMs - totalBreakMs - totalTemporaryExitMs);

  // Проверяем лимиты активной сессии
  const workHours = msToHours(totalWorkMs);

  // Проверка на мягкое предупреждение (14 часов)
  if (workHours >= WORK_SESSION_LIMITS.softWarningAfterHours) {
    result.warningMessage = `Рабочий день длится ${Math.floor(workHours)} часов. Пожалуйста, убедитесь, что вы завершили работу.`;
  }

  // Проверка на требование проверки (24 часа)
  if (workHours >= WORK_SESSION_LIMITS.maxActiveSessionHours) {
    result.requiresReview = true;
    result.reviewReason = `Рабочий день длится более ${WORK_SESSION_LIMITS.maxActiveSessionHours} часов (${Math.floor(workHours)} часов). Требуется проверка.`;
  }

  return result;
}

/**
 * Обновляет статистику рабочего дня
 */
export function updateWorkDayStats(workDay: WorkDay): WorkDay {
  const stats = calculateWorkDayStats(workDay);

  return {
    ...workDay,
    totalWorkMs: stats.totalWorkMs,
    totalBreakMs: stats.totalBreakMs,
    totalTemporaryExitMs: stats.totalTemporaryExitMs,
    work95Ms: stats.netWorkMs, // work95Ms хранит чистое рабочее время
    crossesMidnight: stats.crossesMidnight,
    requires_review: stats.requiresReview,
    reviewReason: stats.reviewReason,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Проверяет, может ли пользователь начать новый рабочий день
 * Возвращает false если есть незавершенная сессия
 */
export function canStartNewWorkDay(workDay: WorkDay | null): { canStart: boolean; reason?: string } {
  if (!workDay) {
    return { canStart: true };
  }

  // Если статус не "completed" и не "not_started", то есть активная сессия
  if (workDay.status !== 'completed' && workDay.status !== 'not_started') {
    return {
      canStart: false,
      reason: 'У вас есть незавершенная рабочая сессия. Пожалуйста, завершите текущий рабочий день перед началом нового.',
    };
  }

  return { canStart: true };
}

/**
 * Проверяет, требуется ли завершить рабочий день
 */
export function needsWorkDayCompletion(workDay: WorkDay): {
  needsCompletion: boolean;
  reason?: string;
  suggestedEndTime?: string;
} {
  // Если рабочий день уже завершен, не требуется
  if (workDay.status === 'completed') {
    return { needsCompletion: false };
  }

  // Если рабочий день не начался, не требуется
  if (!workDay.workStartAt) {
    return { needsCompletion: false };
  }

  // Если рабочий день начался но не завершился
  if (!workDay.workEndAt) {
    return {
      needsCompletion: true,
      reason: 'Вы не завершили рабочий день. Укажите время завершения.',
    };
  }

  return { needsCompletion: false };
}

/**
 * Получает информацию о статусе активной сессии
 */
export function getActiveSessionInfo(workDay: WorkDay | null): {
  isActive: boolean;
  startDate?: string;
  startTime?: string;
  currentDurationMs?: number;
  warningMessage?: string;
  requiresReview?: boolean;
} {
  if (!workDay || !workDay.workStartAt) {
    return { isActive: false };
  }

  if (workDay.status === 'completed') {
    return { isActive: false };
  }

  const startDate = getDateFromISO(workDay.workStartAt);
  const startTime = workDay.workStartAt.split('T')[1]?.substring(0, 5) || '';

  // Если рабочий день завершен, используем завершенное время
  // Иначе используем текущее время
  const endTime = workDay.workEndAt || new Date().toISOString();
  const currentDurationMs = calculateIntervalDuration(workDay.workStartAt, endTime);

  const stats = calculateWorkDayStats(workDay);

  return {
    isActive: true,
    startDate,
    startTime,
    currentDurationMs,
    warningMessage: stats.warningMessage,
    requiresReview: stats.requiresReview,
  };
}
