/**
 * Валидатор для рабочих дней с поддержкой переходов через полночь
 */

import { WorkDay } from '@/shared/types/workday';
import {
  calculateIntervalDuration,
  isIntervalCrossesMidnight,
  msToHours,
  getDateFromISO,
} from './midnight-utils';
import { WORK_SESSION_LIMITS } from './workday-calculator';

/**
 * Результат валидации
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Валидирует рабочий день
 */
export function validateWorkDay(workDay: WorkDay): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Проверка 1: Если рабочий день начался, должна быть дата начала
  if (workDay.status !== 'not_started' && !workDay.workStartAt) {
    errors.push('Рабочий день начался, но не указано время начала');
  }

  // Проверка 2: Если рабочий день завершен, должны быть оба времени
  if (workDay.status === 'completed' && (!workDay.workStartAt || !workDay.workEndAt)) {
    errors.push('Завершенный рабочий день должен иметь время начала и конца');
  }

  // Проверка 3: Время начала не должно быть позже времени конца
  if (workDay.workStartAt && workDay.workEndAt) {
    const startTime = new Date(workDay.workStartAt).getTime();
    const endTime = new Date(workDay.workEndAt).getTime();

    if (startTime > endTime) {
      errors.push('Время начала не может быть позже времени конца');
    }
  }

  // Проверка 4: businessDate должна быть датой начала рабочего дня
  if (workDay.workStartAt) {
    const startDate = getDateFromISO(workDay.workStartAt);
    if (workDay.businessDate !== startDate) {
      errors.push(`businessDate должна быть датой начала рабочего дня (${startDate}), а не ${workDay.businessDate}`);
    }
  }

  // Проверка 5: Признак crossesMidnight должен быть правильным
  if (workDay.workStartAt && workDay.workEndAt) {
    const actualCrossesMidnight = isIntervalCrossesMidnight(workDay.workStartAt, workDay.workEndAt);
    if (workDay.crossesMidnight !== actualCrossesMidnight) {
      warnings.push(`Признак crossesMidnight установлен неправильно (должен быть ${actualCrossesMidnight})`);
    }
  }

  // Проверка 6: Проверка лимитов активной сессии
  if (workDay.workStartAt && workDay.workEndAt && workDay.status !== 'completed') {
    const durationMs = calculateIntervalDuration(workDay.workStartAt, workDay.workEndAt);
    const durationHours = msToHours(durationMs);

    if (durationHours > WORK_SESSION_LIMITS.maxActiveSessionHours) {
      if (!workDay.requires_review) {
        warnings.push(`Активная сессия длится ${Math.floor(durationHours)} часов (более ${WORK_SESSION_LIMITS.maxActiveSessionHours}). Должна быть отмечена как requires_review`);
      }
    }
  }

  // Проверка 7: Интервалы перерывов не должны пересекаться
  for (let i = 0; i < workDay.breakIntervals.length; i++) {
    for (let j = i + 1; j < workDay.breakIntervals.length; j++) {
      const interval1 = workDay.breakIntervals[i];
      const interval2 = workDay.breakIntervals[j];

      if (interval1.endAt && interval2.endAt) {
        const interval1Start = new Date(interval1.startAt).getTime();
        const interval1End = new Date(interval1.endAt).getTime();
        const interval2Start = new Date(interval2.startAt).getTime();
        const interval2End = new Date(interval2.endAt).getTime();

        // Проверяем пересечение
        if (!(interval1End <= interval2Start || interval2End <= interval1Start)) {
          errors.push(`Перерывы пересекаются: ${interval1.id} и ${interval2.id}`);
        }
      }
    }
  }

  // Проверка 8: Интервалы временных выходов не должны пересекаться
  for (let i = 0; i < workDay.temporaryExitIntervals.length; i++) {
    for (let j = i + 1; j < workDay.temporaryExitIntervals.length; j++) {
      const interval1 = workDay.temporaryExitIntervals[i];
      const interval2 = workDay.temporaryExitIntervals[j];

      if (interval1.endAt && interval2.endAt) {
        const interval1Start = new Date(interval1.startAt).getTime();
        const interval1End = new Date(interval1.endAt).getTime();
        const interval2Start = new Date(interval2.startAt).getTime();
        const interval2End = new Date(interval2.endAt).getTime();

        // Проверяем пересечение
        if (!(interval1End <= interval2Start || interval2End <= interval1Start)) {
          errors.push(`Временные выходы пересекаются: ${interval1.id} и ${interval2.id}`);
        }
      }
    }
  }

  // Проверка 9: Перерывы и временные выходы не должны пересекаться друг с другом
  for (const breakInterval of workDay.breakIntervals) {
    if (!breakInterval.endAt) continue;

    const breakStart = new Date(breakInterval.startAt).getTime();
    const breakEnd = new Date(breakInterval.endAt).getTime();

    for (const exitInterval of workDay.temporaryExitIntervals) {
      if (!exitInterval.endAt) continue;

      const exitStart = new Date(exitInterval.startAt).getTime();
      const exitEnd = new Date(exitInterval.endAt).getTime();

      // Проверяем пересечение
      if (!(breakEnd <= exitStart || exitEnd <= breakStart)) {
        errors.push(`Перерыв и временный выход пересекаются: ${breakInterval.id} и ${exitInterval.id}`);
      }
    }
  }

  // Проверка 10: Интервалы не должны выходить за пределы рабочего дня
  if (workDay.workStartAt && workDay.workEndAt) {
    const workStart = new Date(workDay.workStartAt).getTime();
    const workEnd = new Date(workDay.workEndAt).getTime();

    for (const breakInterval of workDay.breakIntervals) {
      const breakStart = new Date(breakInterval.startAt).getTime();
      if (breakStart < workStart) {
        errors.push(`Перерыв начинается раньше рабочего дня: ${breakInterval.id}`);
      }

      if (breakInterval.endAt) {
        const breakEnd = new Date(breakInterval.endAt).getTime();
        if (breakEnd > workEnd) {
          errors.push(`Перерыв заканчивается после рабочего дня: ${breakInterval.id}`);
        }
      }
    }

    for (const exitInterval of workDay.temporaryExitIntervals) {
      const exitStart = new Date(exitInterval.startAt).getTime();
      if (exitStart < workStart) {
        errors.push(`Временный выход начинается раньше рабочего дня: ${exitInterval.id}`);
      }

      if (exitInterval.endAt) {
        const exitEnd = new Date(exitInterval.endAt).getTime();
        if (exitEnd > workEnd) {
          errors.push(`Временный выход заканчивается после рабочего дня: ${exitInterval.id}`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Проверяет, может ли пользователь начать новый рабочий день
 */
export function canStartNewWorkDay(previousWorkDay: WorkDay | null): {
  canStart: boolean;
  reason?: string;
} {
  if (!previousWorkDay) {
    return { canStart: true };
  }

  // Если статус не "completed" и не "not_started", то есть активная сессия
  if (previousWorkDay.status !== 'completed' && previousWorkDay.status !== 'not_started') {
    return {
      canStart: false,
      reason: 'У вас есть незавершенная рабочая сессия. Пожалуйста, завершите текущий рабочий день перед началом нового.',
    };
  }

  // Если рабочий день требует проверки, нужно его завершить
  if (previousWorkDay.requires_review && previousWorkDay.status !== 'completed') {
    return {
      canStart: false,
      reason: 'Предыдущий рабочий день требует проверки. Пожалуйста, завершите его перед началом нового.',
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
 * Получает все ошибки и предупреждения для рабочего дня
 */
export function getWorkDayIssues(workDay: WorkDay): {
  critical: string[]; // Критические ошибки
  warnings: string[]; // Предупреждения
} {
  const validation = validateWorkDay(workDay);
  const critical = [...validation.errors];
  const warnings = [...validation.warnings];

  // Добавляем дополнительные проверки
  if (workDay.requires_review && !workDay.reviewReason) {
    warnings.push('Рабочий день требует проверки, но причина не указана');
  }

  if (needsWorkDayCompletion(workDay).needsCompletion) {
    critical.push('Рабочий день не завершен');
  }

  return { critical, warnings };
}
