import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkDay, WorkDayStatus, WorkEvent, TimeInterval } from '@/shared/types/workday';

/**
 * Генерирует уникальный ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const WORKDAY_KEY_PREFIX = 'worktime:workday:';

/**
 * Форматирует дату в строку YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Получает ключ для хранения рабочего дня
 */
function getWorkdayKey(date: string | Date): string {
  const dateStr = typeof date === 'string' ? date : formatDate(date);
  return `${WORKDAY_KEY_PREFIX}${dateStr}`;
}

/**
 * Создает пустой рабочий день
 */
export function createEmptyWorkDay(date: string): WorkDay {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    date,
    status: 'not_started',
    workStartAt: null,
    workEndAt: null,
    breakIntervals: [],
    temporaryExitIntervals: [],
    events: [],
    totalWorkMs: 0,
    totalBreakMs: 0,
    totalTemporaryExitMs: 0,
    work95Ms: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Получает рабочий день за сегодня
 */
export async function getTodayWorkDay(): Promise<WorkDay | null> {
  const today = formatDate(new Date());
  return getWorkDay(today);
}

/**
 * Получает рабочий день по дате
 */
export async function getWorkDay(date: string): Promise<WorkDay | null> {
  try {
    const key = getWorkdayKey(date);
    const data = await AsyncStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as WorkDay;
  } catch (error) {
    console.error('Error getting workday:', error);
    return null;
  }
}

/**
 * Сохраняет рабочий день
 */
export async function saveWorkDay(workDay: WorkDay): Promise<void> {
  try {
    const key = getWorkdayKey(workDay.date);
    workDay.updatedAt = new Date().toISOString();
    await AsyncStorage.setItem(key, JSON.stringify(workDay));
  } catch (error) {
    console.error('Error saving workday:', error);
    throw error;
  }
}

/**
 * Обновляет рабочий день за сегодня
 */
export async function updateTodayWorkDay(
  updater: (day: WorkDay) => WorkDay
): Promise<WorkDay> {
  const today = formatDate(new Date());
  let workDay = await getWorkDay(today);
  
  if (!workDay) {
    workDay = createEmptyWorkDay(today);
  }
  
  const updated = updater(workDay);
  await saveWorkDay(updated);
  return updated;
}

/**
 * Добавляет событие в рабочий день
 */
export function addWorkEvent(workDay: WorkDay, type: WorkEvent['type']): WorkDay {
  const event: WorkEvent = {
    id: generateId(),
    type,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  
  return {
    ...workDay,
    events: [...workDay.events, event],
  };
}

/**
 * Добавляет интервал перерыва
 */
export function addBreakInterval(workDay: WorkDay): WorkDay {
  const interval: TimeInterval = {
    id: generateId(),
    type: 'break',
    startAt: new Date().toISOString(),
    endAt: null,
  };
  
  return {
    ...workDay,
    breakIntervals: [...workDay.breakIntervals, interval],
  };
}

/**
 * Завершает активный интервал перерыва
 */
export function endActiveBreakInterval(workDay: WorkDay, endTime?: string): WorkDay {
  const breakIntervals = workDay.breakIntervals.map((interval) => {
    if (interval.endAt === null) {
      return {
        ...interval,
        endAt: endTime || new Date().toISOString(),
      };
    }
    return interval;
  });
  
  return {
    ...workDay,
    breakIntervals,
  };
}

/**
 * Добавляет интервал временного выхода
 */
export function addTemporaryExitInterval(workDay: WorkDay): WorkDay {
  const interval: TimeInterval = {
    id: generateId(),
    type: 'temporary_exit',
    startAt: new Date().toISOString(),
    endAt: null,
  };
  
  return {
    ...workDay,
    temporaryExitIntervals: [...workDay.temporaryExitIntervals, interval],
  };
}

/**
 * Завершает активный интервал временного выхода
 */
export function endActiveTemporaryExitInterval(workDay: WorkDay, endTime?: string): WorkDay {
  const temporaryExitIntervals = workDay.temporaryExitIntervals.map((interval) => {
    if (interval.endAt === null) {
      return {
        ...interval,
        endAt: endTime || new Date().toISOString(),
      };
    }
    return interval;
  });
  
  return {
    ...workDay,
    temporaryExitIntervals,
  };
}

/**
 * Получает активный интервал перерыва
 */
export function getActiveBreakInterval(workDay: WorkDay): TimeInterval | null {
  return workDay.breakIntervals.find((interval) => interval.endAt === null) || null;
}

/**
 * Получает активный интервал временного выхода
 */
export function getActiveTemporaryExitInterval(workDay: WorkDay): TimeInterval | null {
  return workDay.temporaryExitIntervals.find((interval) => interval.endAt === null) || null;
}

/**
 * Проверяет, есть ли активный перерыв
 */
export function hasActiveBreak(workDay: WorkDay): boolean {
  return getActiveBreakInterval(workDay) !== null;
}

/**
 * Проверяет, есть ли активный временный выход
 */
export function hasActiveTemporaryExit(workDay: WorkDay): boolean {
  return getActiveTemporaryExitInterval(workDay) !== null;
}

/**
 * Удаляет все рабочие дни (для тестирования)
 */
export async function clearAllWorkDays(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const workdayKeys = keys.filter((key) => key.startsWith(WORKDAY_KEY_PREFIX));
    await AsyncStorage.multiRemove(workdayKeys);
  } catch (error) {
    console.error('Error clearing workdays:', error);
    throw error;
  }
}
