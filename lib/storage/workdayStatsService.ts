import { WorkDay, WorkDayStats } from '@/shared/types/workday';

/**
 * Вычисляет статистику рабочего дня
 */
export function calculateWorkDayStats(workDay: WorkDay, now: Date = new Date()): WorkDayStats {
  // Если рабочий день не начат
  if (!workDay.workStartAt) {
    return {
      totalWorkMs: 0,
      totalBreakMs: 0,
      totalTemporaryExitMs: 0,
      work95Ms: 0,
    };
  }

  // Определяем конец периода (завершение дня или текущее время)
  const endTime = workDay.workEndAt ? new Date(workDay.workEndAt) : now;
  const startTime = new Date(workDay.workStartAt);

  // Базовая длительность периода
  let baseDurationMs = endTime.getTime() - startTime.getTime();

  // Вычисляем общее время перерывов
  let totalBreakMs = 0;
  for (const breakInterval of workDay.breakIntervals) {
    const breakStart = new Date(breakInterval.startAt);
    const breakEnd = breakInterval.endAt ? new Date(breakInterval.endAt) : now;
    totalBreakMs += breakEnd.getTime() - breakStart.getTime();
  }

  // Вычисляем общее время временных выходов
  let totalTemporaryExitMs = 0;
  for (const exitInterval of workDay.temporaryExitIntervals) {
    const exitStart = new Date(exitInterval.startAt);
    const exitEnd = exitInterval.endAt ? new Date(exitInterval.endAt) : now;
    totalTemporaryExitMs += exitEnd.getTime() - exitStart.getTime();
  }

  // Вычисляем фактически отработанное время
  let totalWorkMs = baseDurationMs - totalBreakMs - totalTemporaryExitMs;
  if (totalWorkMs < 0) {
    totalWorkMs = 0;
  }

  // Вычисляем 95% рабочего времени
  const totalWorkMinutes = Math.floor(totalWorkMs / 60000);
  const work95Minutes = Math.floor(totalWorkMinutes * 0.95);
  const work95Ms = work95Minutes * 60000;

  return {
    totalWorkMs,
    totalBreakMs,
    totalTemporaryExitMs,
    work95Ms,
  };
}

/**
 * Форматирует миллисекунды в строку вида "HH:MM:SS"
 */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');
  const s = String(seconds).padStart(2, '0');

  return `${h}:${m}:${s}`;
}

/**
 * Форматирует миллисекунды в строку вида "Xч YYм" (на русском)
 */
export function formatTimeShort(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}м`;
  }

  if (minutes === 0) {
    return `${hours}ч`;
  }

  return `${hours}ч ${minutes}м`;
}

/**
 * Получает статус рабочего дня в виде текста
 */
export function getWorkDayStatusText(status: WorkDay['status']): string {
  const statusMap: Record<WorkDay['status'], string> = {
    not_started: 'Не на работе',
    working: 'На работе',
    on_break: 'Перерыв',
    on_temporary_exit: 'Временный выход',
    completed: 'Рабочий день завершен',
    requires_review: 'Требует проверки',
  };

  return statusMap[status] || status;
}

/**
 * Получает цвет статуса
 */
export function getWorkDayStatusColor(status: WorkDay['status']): string {
  const colorMap: Record<WorkDay['status'], string> = {
    not_started: '#9BA1A6', // muted
    working: '#22C55E', // success (green)
    on_break: '#F59E0B', // warning (yellow)
    on_temporary_exit: '#F97316', // orange
    completed: '#0a7ea4', // primary (blue)
    requires_review: '#EF4444', // error (red)
  };

  return colorMap[status] || '#9BA1A6';
}
