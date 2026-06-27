/**
 * Утилиты для создания отчетов по рабочему времени
 * Поддерживает два режима: по дате начала рабочего дня и по календарным датам
 */

import { WorkDay } from '@/shared/types/workday';
import {
  splitIntervalByCalendarDays,
  calculateIntervalDuration,
  msToHours,
  msToMinutes,
  getDateFromISO,
} from './midnight-utils';

/**
 * Отчет по одному дню (по дате начала рабочего дня)
 */
export interface DayReport {
  businessDate: string; // Дата начала рабочего дня
  workStartAt: string;
  workEndAt: string | null;
  totalWorkMs: number;
  totalBreakMs: number;
  totalTemporaryExitMs: number;
  netWorkMs: number;
  crossesMidnight: boolean;
  status: string;
  requiresReview: boolean;
}

/**
 * Отчет по календарному дню (распределение времени по датам)
 */
export interface CalendarDayReport {
  date: string; // Календарная дата (YYYY-MM-DD)
  workMs: number; // Время работы в этот день
  breakMs: number; // Время перерывов в этот день
  temporaryExitMs: number; // Время временных выходов в этот день
  netWorkMs: number; // Чистое рабочее время
  businessDate: string; // Дата начала рабочего дня
  isPartialDay: boolean; // Это часть многодневной сессии
  startTime?: string; // Время начала в этот день
  endTime?: string; // Время конца в этот день
}

/**
 * Создает отчет по дате начала рабочего дня (основной режим MVP)
 */
export function createDayReport(workDay: WorkDay): DayReport {
  // Импортируем calculateWorkDayStats для расчета
  const stats = { totalWorkMs: 0, totalBreakMs: 0, totalTemporaryExitMs: 0 };
  
  // Расчет рабочего времени
  if (workDay.workStartAt && workDay.workEndAt) {
    stats.totalWorkMs = calculateIntervalDuration(workDay.workStartAt, workDay.workEndAt);
  }
  
  // Расчет перерывов
  for (const breakInterval of workDay.breakIntervals) {
    if (breakInterval.endAt) {
      stats.totalBreakMs += calculateIntervalDuration(breakInterval.startAt, breakInterval.endAt);
    }
  }
  
  // Расчет временных выходов
  for (const exitInterval of workDay.temporaryExitIntervals) {
    if (exitInterval.endAt) {
      stats.totalTemporaryExitMs += calculateIntervalDuration(exitInterval.startAt, exitInterval.endAt);
    }
  }
  
  const totalWorkMs = stats.totalWorkMs;
  const totalBreakMs = stats.totalBreakMs;
  const totalTemporaryExitMs = stats.totalTemporaryExitMs;
  const netWorkMs = totalWorkMs - totalBreakMs - totalTemporaryExitMs;

  return {
    businessDate: workDay.businessDate,
    workStartAt: workDay.workStartAt || '',
    workEndAt: workDay.workEndAt || null,
    totalWorkMs,
    totalBreakMs,
    totalTemporaryExitMs,
    netWorkMs: Math.max(0, netWorkMs),
    crossesMidnight: workDay.crossesMidnight,
    status: workDay.status,
    requiresReview: workDay.requires_review,
  };
}

/**
 * Создает отчет по календарным дням (распределение времени)
 */
export function createCalendarDayReports(workDay: WorkDay): CalendarDayReport[] {
  const reports: CalendarDayReport[] = [];

  if (!workDay.workStartAt || !workDay.workEndAt) {
    return reports;
  }

  // Распределяем основной интервал работы
  const workIntervals = splitIntervalByCalendarDays(workDay.workStartAt, workDay.workEndAt);

  // Распределяем перерывы по дням
  const breaksByDate: Record<string, number> = {};
  for (const breakInterval of workDay.breakIntervals) {
    if (breakInterval.endAt) {
      const intervals = splitIntervalByCalendarDays(breakInterval.startAt, breakInterval.endAt);
      for (const interval of intervals) {
        const date = interval.date;
        const duration = calculateIntervalDuration(interval.startAt, interval.endAt);
        breaksByDate[date] = (breaksByDate[date] || 0) + duration;
      }
    }
  }

  // Распределяем временные выходы по дням
  const exitsByDate: Record<string, number> = {};
  for (const exitInterval of workDay.temporaryExitIntervals) {
    if (exitInterval.endAt) {
      const intervals = splitIntervalByCalendarDays(exitInterval.startAt, exitInterval.endAt);
      for (const interval of intervals) {
        const date = interval.date;
        const duration = calculateIntervalDuration(interval.startAt, interval.endAt);
        exitsByDate[date] = (exitsByDate[date] || 0) + duration;
      }
    }
  }

  // Создаем отчеты по дням
  for (const interval of workIntervals) {
    const date = interval.date;
    const workMs = calculateIntervalDuration(interval.startAt, interval.endAt);
    const breakMs = breaksByDate[date] || 0;
    const temporaryExitMs = exitsByDate[date] || 0;
    const netWorkMs = Math.max(0, workMs - breakMs - temporaryExitMs);

    reports.push({
      date,
      workMs,
      breakMs,
      temporaryExitMs,
      netWorkMs,
      businessDate: workDay.businessDate,
      isPartialDay: workIntervals.length > 1,
      startTime: interval.startAt.split('T')[1]?.substring(0, 5),
      endTime: interval.endAt.split('T')[1]?.substring(0, 5),
    });
  }

  return reports;
}

/**
 * Форматирует время в часы и минуты
 */
export function formatWorkTime(ms: number): string {
  const hours = Math.floor(msToHours(ms));
  const minutes = Math.floor(msToMinutes(ms) % 60);
  return `${hours}ч ${minutes}м`;
}

/**
 * Форматирует отчет по дню для отображения
 */
export function formatDayReport(report: DayReport): string {
  const lines: string[] = [];

  lines.push(`Дата: ${report.businessDate}`);
  lines.push(`Начало: ${report.workStartAt.split('T')[1]?.substring(0, 5)}`);

  if (report.workEndAt) {
    lines.push(`Конец: ${report.workEndAt.split('T')[1]?.substring(0, 5)}`);
  }

  if (report.crossesMidnight) {
    lines.push(`⚠️ Переход через полночь`);
  }

  lines.push(`Рабочее время: ${formatWorkTime(report.totalWorkMs)}`);
  lines.push(`Перерывы: ${formatWorkTime(report.totalBreakMs)}`);
  lines.push(`Временные выходы: ${formatWorkTime(report.totalTemporaryExitMs)}`);
  lines.push(`Чистое рабочее время: ${formatWorkTime(report.netWorkMs)}`);

  if (report.requiresReview) {
    lines.push(`⚠️ Требует проверки`);
  }

  return lines.join('\n');
}

/**
 * Форматирует отчет по календарному дню
 */
export function formatCalendarDayReport(report: CalendarDayReport): string {
  const lines: string[] = [];

  lines.push(`Дата: ${report.date}`);

  if (report.startTime && report.endTime) {
    lines.push(`Время: ${report.startTime} - ${report.endTime}`);
  }

  if (report.isPartialDay) {
    lines.push(`(Часть многодневной сессии, начало: ${report.businessDate})`);
  }

  lines.push(`Рабочее время: ${formatWorkTime(report.workMs)}`);
  lines.push(`Перерывы: ${formatWorkTime(report.breakMs)}`);
  lines.push(`Временные выходы: ${formatWorkTime(report.temporaryExitMs)}`);
  lines.push(`Чистое рабочее время: ${formatWorkTime(report.netWorkMs)}`);

  return lines.join('\n');
}

/**
 * Суммирует несколько отчетов по дням
 */
export function sumDayReports(reports: DayReport[]): DayReport {
  const totalWorkMs = reports.reduce((sum, r) => sum + r.totalWorkMs, 0);
  const totalBreakMs = reports.reduce((sum, r) => sum + r.totalBreakMs, 0);
  const totalTemporaryExitMs = reports.reduce((sum, r) => sum + r.totalTemporaryExitMs, 0);
  const netWorkMs = Math.max(0, totalWorkMs - totalBreakMs - totalTemporaryExitMs);

  return {
    businessDate: reports[0]?.businessDate || '',
    workStartAt: reports[0]?.workStartAt || '',
    workEndAt: reports[reports.length - 1]?.workEndAt || null,
    totalWorkMs,
    totalBreakMs,
    totalTemporaryExitMs,
    netWorkMs,
    crossesMidnight: reports.some(r => r.crossesMidnight),
    status: 'summary',
    requiresReview: reports.some(r => r.requiresReview),
  };
}

/**
 * Суммирует несколько отчетов по календарным дням
 */
export function sumCalendarDayReports(reports: CalendarDayReport[]): CalendarDayReport {
  const totalWorkMs = reports.reduce((sum, r) => sum + r.workMs, 0);
  const totalBreakMs = reports.reduce((sum, r) => sum + r.breakMs, 0);
  const totalTemporaryExitMs = reports.reduce((sum, r) => sum + r.temporaryExitMs, 0);
  const netWorkMs = Math.max(0, totalWorkMs - totalBreakMs - totalTemporaryExitMs);

  return {
    date: 'summary',
    workMs: totalWorkMs,
    breakMs: totalBreakMs,
    temporaryExitMs: totalTemporaryExitMs,
    netWorkMs,
    businessDate: reports[0]?.businessDate || '',
    isPartialDay: false,
  };
}
