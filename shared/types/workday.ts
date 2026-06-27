/**
 * Типы данных для системы учета рабочего времени
 */

export type WorkDayStatus =
  | 'not_started'
  | 'working'
  | 'on_break'
  | 'on_temporary_exit'
  | 'completed'
  | 'requires_review';

export type WorkEventType =
  | 'work_start'
  | 'work_end'
  | 'break_start'
  | 'break_end'
  | 'temporary_exit_start'
  | 'temporary_exit_end';

export interface TimeInterval {
  id: string;
  type: 'break' | 'temporary_exit';
  startAt: string; // ISO 8601
  endAt: string | null; // ISO 8601 or null if active
}

export interface WorkEvent {
  id: string;
  type: WorkEventType;
  timestamp: string; // ISO 8601
  createdAt: string; // ISO 8601
}

export interface WorkDay {
  id: string;
  date: string; // YYYY-MM-DD (deprecated, use businessDate instead)
  businessDate: string; // YYYY-MM-DD - дата начала рабочего дня
  status: WorkDayStatus;

  workStartAt: string | null; // ISO 8601
  workEndAt: string | null; // ISO 8601

  breakIntervals: TimeInterval[];
  temporaryExitIntervals: TimeInterval[];

  events: WorkEvent[];

  totalWorkMs: number;
  totalBreakMs: number;
  totalTemporaryExitMs: number;
  work95Ms: number;

  // Признак того, что рабочий день пересекает полночь
  crossesMidnight: boolean;

  // Требует проверки (если работал более 24 часов)
  requires_review: boolean;
  reviewReason?: string; // Причина требования проверки

  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Результат расчета статистики рабочего дня
 */
export interface WorkDayStats {
  totalWorkMs: number;
  totalBreakMs: number;
  totalTemporaryExitMs: number;
  work95Ms: number;
}
