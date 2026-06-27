/**
 * Тесты для алгоритма учета рабочего времени с переходом через полночь
 */

import { describe, it, expect } from 'vitest';
import {
  isIntervalCrossesMidnight,
  splitIntervalByCalendarDays,
  calculateIntervalDuration,
  msToHours,
  msToMinutes,
} from '@/lib/utils/midnight-utils';
import {
  calculateWorkDayStats,
  WORK_SESSION_LIMITS,
} from '@/lib/utils/workday-calculator';
import {
  validateWorkDay,
  canStartNewWorkDay,
  needsWorkDayCompletion,
} from '@/lib/utils/workday-validator';
import {
  createDayReport,
  createCalendarDayReports,
  formatWorkTime,
} from '@/lib/utils/workday-reports';
import { WorkDay } from '@/shared/types/workday';

describe('Midnight Crossing Algorithm', () => {
  // ===== Тесты для определения пересечения полночи =====
  // Helper function to create a complete WorkDay
  function createTestWorkDay(overrides: Partial<WorkDay> = {}): WorkDay {
    const now = new Date().toISOString();
    return {
      id: '1',
      date: '2024-01-15',
      businessDate: '2024-01-15',
      status: 'completed',
      workStartAt: '2024-01-15T09:00:00.000Z',
      workEndAt: '2024-01-15T17:00:00.000Z',
      breakIntervals: [],
      temporaryExitIntervals: [],
      events: [],
      totalWorkMs: 0,
      totalBreakMs: 0,
      totalTemporaryExitMs: 0,
      work95Ms: 0,
      crossesMidnight: false,
      requires_review: false,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  describe('isIntervalCrossesMidnight', () => {
    it('должен определить пересечение полночи', () => {
      const start = '2024-01-15T22:00:00.000Z';
      const end = '2024-01-16T02:00:00.000Z';
      expect(isIntervalCrossesMidnight(start, end)).toBe(true);
    });

    it('не должен определить пересечение полночи в пределах одного дня', () => {
      const start = '2024-01-15T09:00:00.000Z';
      const end = '2024-01-15T17:00:00.000Z';
      expect(isIntervalCrossesMidnight(start, end)).toBe(false);
    });

    it('должен определить пересечение полночи в конце дня', () => {
      const start = '2024-01-15T23:00:00.000Z';
      const end = '2024-01-16T01:00:00.000Z';
      expect(isIntervalCrossesMidnight(start, end)).toBe(true);
    });
  });

  // ===== Тесты для распределения интервалов по дням =====
  describe('splitIntervalByCalendarDays', () => {
    it('должен распределить интервал, пересекающий полночь', () => {
      const start = '2024-01-15T22:00:00.000Z';
      const end = '2024-01-16T02:00:00.000Z';
      const intervals = splitIntervalByCalendarDays(start, end);

      expect(intervals).toHaveLength(2);
      expect(intervals[0].date).toBe('2024-01-15');
      expect(intervals[1].date).toBe('2024-01-16');
    });

    it('не должен разделять интервал в пределах одного дня', () => {
      const start = '2024-01-15T09:00:00.000Z';
      const end = '2024-01-15T17:00:00.000Z';
      const intervals = splitIntervalByCalendarDays(start, end);

      expect(intervals).toHaveLength(1);
      expect(intervals[0].date).toBe('2024-01-15');
    });

    it('должен корректно распределить интервал, пересекающий несколько дней', () => {
      const start = '2024-01-15T22:00:00.000Z';
      const end = '2024-01-17T02:00:00.000Z';
      const intervals = splitIntervalByCalendarDays(start, end);

      expect(intervals).toHaveLength(3);
      expect(intervals[0].date).toBe('2024-01-15');
      expect(intervals[1].date).toBe('2024-01-16');
      expect(intervals[2].date).toBe('2024-01-17');
    });
  });

  // ===== Тесты для расчета длительности =====
  describe('calculateIntervalDuration', () => {
    it('должен корректно рассчитать длительность в пределах одного дня', () => {
      const start = '2024-01-15T09:00:00.000Z';
      const end = '2024-01-15T17:00:00.000Z';
      const duration = calculateIntervalDuration(start, end);

      expect(msToHours(duration)).toBe(8);
    });

    it('должен корректно рассчитать длительность, пересекающую полночь', () => {
      const start = '2024-01-15T22:00:00.000Z';
      const end = '2024-01-16T02:00:00.000Z';
      const duration = calculateIntervalDuration(start, end);

      expect(msToHours(duration)).toBe(4);
    });

    it('должен корректно рассчитать длительность 14 часов', () => {
      const start = '2024-01-15T09:00:00.000Z';
      const end = '2024-01-15T23:00:00.000Z';
      const duration = calculateIntervalDuration(start, end);

      expect(msToHours(duration)).toBe(14);
    });

    it('должен корректно рассчитать длительность 24 часа', () => {
      const start = '2024-01-15T09:00:00.000Z';
      const end = '2024-01-16T09:00:00.000Z';
      const duration = calculateIntervalDuration(start, end);

      expect(msToHours(duration)).toBe(24);
    });
  });

  // ===== Тесты для расчета рабочего времени =====
  describe('calculateWorkDayStats', () => {
    it('должен корректно рассчитать рабочее время без перерывов', () => {
      const workDay = createTestWorkDay({
        workStartAt: '2024-01-15T09:00:00.000Z',
        workEndAt: '2024-01-15T17:00:00.000Z',
      });

      const stats = calculateWorkDayStats(workDay);
      expect(msToHours(stats.totalWorkMs)).toBe(8);
      expect(msToHours(stats.netWorkMs)).toBe(8);
    });

    it('должен корректно рассчитать рабочее время с перерывом', () => {
      const workDay = createTestWorkDay({
        workStartAt: '2024-01-15T09:00:00.000Z',
        workEndAt: '2024-01-15T17:00:00.000Z',
        breakIntervals: [
          {
            id: 'break1',
            type: 'break',
            startAt: '2024-01-15T12:00:00.000Z',
            endAt: '2024-01-15T13:00:00.000Z',
          },
        ],
      });

      const stats = calculateWorkDayStats(workDay);
      expect(msToHours(stats.totalWorkMs)).toBe(8);
      expect(msToHours(stats.totalBreakMs)).toBe(1);
      expect(msToHours(stats.netWorkMs)).toBe(7);
    });

    it('должен определить пересечение полночи', () => {
      const workDay = createTestWorkDay({
        workStartAt: '2024-01-15T22:00:00.000Z',
        workEndAt: '2024-01-16T02:00:00.000Z',
        crossesMidnight: true,
      });

      const stats = calculateWorkDayStats(workDay);
      expect(stats.crossesMidnight).toBe(true);
      expect(msToHours(stats.netWorkMs)).toBe(4);
    });

    it('должен выдать предупреждение после 14 часов', () => {
      const workDay = createTestWorkDay({
        workStartAt: '2024-01-15T09:00:00.000Z',
        workEndAt: '2024-01-15T23:00:00.000Z',
        status: 'working',
      });

      const stats = calculateWorkDayStats(workDay);
      expect(stats.warningMessage).toBeDefined();
      expect(stats.warningMessage).toContain('14');
    });

    it('должен требовать проверки после 24 часов', () => {
      const workDay = createTestWorkDay({
        workStartAt: '2024-01-15T09:00:00.000Z',
        workEndAt: '2024-01-16T09:00:00.000Z',
        status: 'working',
        crossesMidnight: true,
      });

      const stats = calculateWorkDayStats(workDay);
      expect(stats.requiresReview).toBe(true);
    });
  });

  // ===== Тесты для валидации =====
  describe('validateWorkDay', () => {
    it('должен валидировать корректный рабочий день', () => {
      const workDay = createTestWorkDay({
        workStartAt: '2024-01-15T09:00:00.000Z',
        workEndAt: '2024-01-15T17:00:00.000Z',
      });

      const result = validateWorkDay(workDay);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('должен обнаружить ошибку, если время начала позже времени конца', () => {
      const workDay = createTestWorkDay({
        workStartAt: '2024-01-15T17:00:00.000Z',
        workEndAt: '2024-01-15T09:00:00.000Z',
      });

      const result = validateWorkDay(workDay);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ===== Тесты для проверки возможности начать новый день =====
  describe('canStartNewWorkDay', () => {
    it('должен разрешить начать новый день, если нет предыдущего', () => {
      const result = canStartNewWorkDay(null);
      expect(result.canStart).toBe(true);
    });

    it('должен разрешить начать новый день, если предыдущий завершен', () => {
      const workDay = createTestWorkDay({
        workStartAt: '2024-01-15T09:00:00.000Z',
        workEndAt: '2024-01-15T17:00:00.000Z',
      });

      const result = canStartNewWorkDay(workDay);
      expect(result.canStart).toBe(true);
    });

    it('не должен разрешить начать новый день, если есть активная сессия', () => {
      const workDay = createTestWorkDay({
        workStartAt: '2024-01-15T09:00:00.000Z',
        workEndAt: null,
        status: 'working',
      });

      const result = canStartNewWorkDay(workDay);
      expect(result.canStart).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  // ===== Тесты для отчетов =====
  describe('createDayReport', () => {
    it('должен создать отчет по дню', () => {
      const workDay = createTestWorkDay({
        workStartAt: '2024-01-15T09:00:00.000Z',
        workEndAt: '2024-01-15T17:00:00.000Z',
      });

      const report = createDayReport(workDay);
      expect(report.businessDate).toBe('2024-01-15');
      expect(msToHours(report.netWorkMs)).toBe(8);
    });
  });

  describe('createCalendarDayReports', () => {
    it('должен распределить рабочее время по календарным дням', () => {
      const workDay = createTestWorkDay({
        workStartAt: '2024-01-15T22:00:00.000Z',
        workEndAt: '2024-01-16T02:00:00.000Z',
        crossesMidnight: true,
      });

      const reports = createCalendarDayReports(workDay);
      expect(reports).toHaveLength(2);
      expect(reports[0].date).toBe('2024-01-15');
      expect(reports[1].date).toBe('2024-01-16');
    });
  });

  // ===== Тесты для форматирования =====
  describe('formatWorkTime', () => {
    it('должен форматировать время в часы и минуты', () => {
      const ms = 3600000 + 1800000; // 1.5 часа
      expect(formatWorkTime(ms)).toBe('1ч 30м');
    });

    it('должен форматировать 8 часов', () => {
      const ms = 8 * 3600000;
      expect(formatWorkTime(ms)).toBe('8ч 0м');
    });
  });
});
