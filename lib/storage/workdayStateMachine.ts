import { WorkDay, WorkDayStatus } from '@/shared/types/workday';
import {
  addWorkEvent,
  addBreakInterval,
  endActiveBreakInterval,
  addTemporaryExitInterval,
  endActiveTemporaryExitInterval,
  getActiveBreakInterval,
  getActiveTemporaryExitInterval,
} from './workdayService';

/**
 * Ошибка при переходе между состояниями
 */
export class StateTransitionError extends Error {
  constructor(
    public currentState: WorkDayStatus,
    public attemptedAction: string,
    message: string
  ) {
    super(message);
    this.name = 'StateTransitionError';
  }
}

/**
 * Проверяет, может ли быть выполнен переход между состояниями
 */
function canTransition(
  fromState: WorkDayStatus,
  toState: WorkDayStatus
): boolean {
  const validTransitions: Record<WorkDayStatus, WorkDayStatus[]> = {
    not_started: ['working'],
    working: ['on_break', 'on_temporary_exit', 'completed'],
    on_break: ['working'],
    on_temporary_exit: ['working'],
    completed: [],
    requires_review: ['not_started', 'working'],
  };

  return validTransitions[fromState]?.includes(toState) ?? false;
}

/**
 * Начинает рабочий день (переход not_started -> working)
 */
export function startWorkDay(workDay: WorkDay): WorkDay {
  if (workDay.status !== 'not_started') {
    throw new StateTransitionError(
      workDay.status,
      'start',
      `Невозможно начать рабочий день. Текущее состояние: ${workDay.status}`
    );
  }

  const now = new Date().toISOString();

  return {
    ...workDay,
    status: 'working',
    workStartAt: now,
    events: [
      ...workDay.events,
      {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'work_start',
        timestamp: now,
        createdAt: now,
      },
    ],
  };
}

/**
 * Начинает перерыв (переход working -> on_break)
 */
export function startBreak(workDay: WorkDay): WorkDay {
  if (workDay.status !== 'working') {
    throw new StateTransitionError(
      workDay.status,
      'start_break',
      `Невозможно начать перерыв. Текущее состояние: ${workDay.status}`
    );
  }

  if (getActiveBreakInterval(workDay) !== null) {
    throw new StateTransitionError(
      workDay.status,
      'start_break',
      'Перерыв уже активен'
    );
  }

  const now = new Date().toISOString();

  let updated = addBreakInterval(workDay);
  updated = addWorkEvent(updated, 'break_start');
  updated = {
    ...updated,
    status: 'on_break',
  };

  return updated;
}

/**
 * Завершает перерыв (переход on_break -> working)
 */
export function endBreak(workDay: WorkDay): WorkDay {
  if (workDay.status !== 'on_break') {
    throw new StateTransitionError(
      workDay.status,
      'end_break',
      `Невозможно завершить перерыв. Текущее состояние: ${workDay.status}`
    );
  }

  if (getActiveBreakInterval(workDay) === null) {
    throw new StateTransitionError(
      workDay.status,
      'end_break',
      'Активный перерыв не найден'
    );
  }

  const now = new Date().toISOString();

  let updated = endActiveBreakInterval(workDay);
  updated = addWorkEvent(updated, 'break_end');
  updated = {
    ...updated,
    status: 'working',
  };

  return updated;
}

/**
 * Начинает временный выход (переход working -> on_temporary_exit)
 */
export function startTemporaryExit(workDay: WorkDay): WorkDay {
  if (workDay.status !== 'working') {
    throw new StateTransitionError(
      workDay.status,
      'start_temporary_exit',
      `Невозможно начать временный выход. Текущее состояние: ${workDay.status}`
    );
  }

  if (getActiveTemporaryExitInterval(workDay) !== null) {
    throw new StateTransitionError(
      workDay.status,
      'start_temporary_exit',
      'Временный выход уже активен'
    );
  }

  const now = new Date().toISOString();

  let updated = addTemporaryExitInterval(workDay);
  updated = addWorkEvent(updated, 'temporary_exit_start');
  updated = {
    ...updated,
    status: 'on_temporary_exit',
  };

  return updated;
}

/**
 * Завершает временный выход (переход on_temporary_exit -> working)
 */
export function endTemporaryExit(workDay: WorkDay): WorkDay {
  if (workDay.status !== 'on_temporary_exit') {
    throw new StateTransitionError(
      workDay.status,
      'end_temporary_exit',
      `Невозможно завершить временный выход. Текущее состояние: ${workDay.status}`
    );
  }

  if (getActiveTemporaryExitInterval(workDay) === null) {
    throw new StateTransitionError(
      workDay.status,
      'end_temporary_exit',
      'Активный временный выход не найден'
    );
  }

  const now = new Date().toISOString();

  let updated = endActiveTemporaryExitInterval(workDay);
  updated = addWorkEvent(updated, 'temporary_exit_end');
  updated = {
    ...updated,
    status: 'working',
  };

  return updated;
}

/**
 * Завершает рабочий день (переход working -> completed)
 */
export function completeWorkDay(workDay: WorkDay): WorkDay {
  if (workDay.status !== 'working') {
    throw new StateTransitionError(
      workDay.status,
      'complete',
      `Невозможно завершить рабочий день. Текущее состояние: ${workDay.status}`
    );
  }

  // Если есть активный перерыв, завершить его
  let updated = workDay;
  if (getActiveBreakInterval(updated) !== null) {
    updated = endActiveBreakInterval(updated);
  }

  // Если есть активный выход, завершить его
  if (getActiveTemporaryExitInterval(updated) !== null) {
    updated = endActiveTemporaryExitInterval(updated);
  }

  const now = new Date().toISOString();

  updated = {
    ...updated,
    status: 'completed',
    workEndAt: now,
  };

  updated = addWorkEvent(updated, 'work_end');

  return updated;
}

/**
 * Получает список доступных действий для текущего состояния
 */
export function getAvailableActions(workDay: WorkDay): string[] {
  const actions: Record<WorkDayStatus, string[]> = {
    not_started: ['start'],
    working: ['start_break', 'start_temporary_exit', 'complete'],
    on_break: ['end_break'],
    on_temporary_exit: ['end_temporary_exit'],
    completed: [],
    requires_review: ['start', 'complete'],
  };

  return actions[workDay.status] ?? [];
}

/**
 * Получает описание текущего состояния
 */
export function getStatusDescription(status: WorkDayStatus): string {
  const descriptions: Record<WorkDayStatus, string> = {
    not_started: 'Рабочий день не начат',
    working: 'Вы на работе',
    on_break: 'Вы на перерыве',
    on_temporary_exit: 'Вы вышли временно',
    completed: 'Рабочий день завершен',
    requires_review: 'День требует проверки',
  };

  return descriptions[status] ?? status;
}

/**
 * Проверяет, может ли быть выполнено действие
 */
export function canPerformAction(workDay: WorkDay, action: string): boolean {
  return getAvailableActions(workDay).includes(action);
}

/**
 * Выполняет действие на основе текущего состояния
 */
export function performAction(workDay: WorkDay, action: string): WorkDay {
  switch (action) {
    case 'start':
      return startWorkDay(workDay);
    case 'start_break':
      return startBreak(workDay);
    case 'end_break':
      return endBreak(workDay);
    case 'start_temporary_exit':
      return startTemporaryExit(workDay);
    case 'end_temporary_exit':
      return endTemporaryExit(workDay);
    case 'complete':
      return completeWorkDay(workDay);
    default:
      throw new StateTransitionError(
        workDay.status,
        action,
        `Неизвестное действие: ${action}`
      );
  }
}
