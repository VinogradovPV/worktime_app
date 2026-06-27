/**
 * Утилиты для работы с интервалами, пересекающими полночь
 */

/**
 * Проверяет, пересекает ли интервал полночь
 * @param startAt ISO 8601 строка начала интервала
 * @param endAt ISO 8601 строка конца интервала
 * @returns true если интервал пересекает полночь
 */
export function isIntervalCrossesMidnight(startAt: string, endAt: string): boolean {
  const start = new Date(startAt);
  const end = new Date(endAt);
  
  // Получаем дату начала и конца (без времени)
  const startDate = start.toISOString().split('T')[0];
  const endDate = end.toISOString().split('T')[0];
  
  // Если даты разные, то интервал пересекает полночь
  return startDate !== endDate;
}

/**
 * Получает дату в формате YYYY-MM-DD из ISO 8601 строки
 */
export function getDateFromISO(isoString: string): string {
  return isoString.split('T')[0];
}

/**
 * Получает начало дня (00:00:00) в ISO 8601 формате
 */
export function getStartOfDay(date: string): string {
  return `${date}T00:00:00.000Z`;
}

/**
 * Получает конец дня (23:59:59) в ISO 8601 формате
 */
export function getEndOfDay(date: string): string {
  return `${date}T23:59:59.999Z`;
}

/**
 * Получает дату следующего дня в формате YYYY-MM-DD
 */
export function getNextDay(date: string): string {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

/**
 * Получает дату предыдущего дня в формате YYYY-MM-DD
 */
export function getPreviousDay(date: string): string {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

/**
 * Интервал, распределенный по календарным дням
 */
export interface SplitInterval {
  date: string; // YYYY-MM-DD
  startAt: string; // ISO 8601
  endAt: string; // ISO 8601
  durationMs: number; // Длительность в миллисекундах
}

/**
 * Распределяет интервал по календарным дням
 * 
 * Пример: интервал с 23:00 одного дня до 02:00 следующего дня
 * будет разделен на два интервала:
 * - День 1: 23:00 - 23:59:59
 * - День 2: 00:00:00 - 02:00
 * 
 * @param startAt ISO 8601 строка начала интервала
 * @param endAt ISO 8601 строка конца интервала
 * @returns Массив интервалов, распределенных по дням
 */
export function splitIntervalByCalendarDays(startAt: string, endAt: string): SplitInterval[] {
  const start = new Date(startAt);
  const end = new Date(endAt);
  
  if (start >= end) {
    return [];
  }
  
  const result: SplitInterval[] = [];
  let current = new Date(start);
  
  while (current < end) {
    // Получаем дату текущего дня
    const currentDate = current.toISOString().split('T')[0];
    
    // Конец текущего дня (23:59:59)
    const endOfCurrentDay = new Date(currentDate);
    endOfCurrentDay.setDate(endOfCurrentDay.getDate() + 1);
    endOfCurrentDay.setMilliseconds(-1);
    
    // Определяем конец интервала для текущего дня
    const intervalEnd = end < endOfCurrentDay ? end : endOfCurrentDay;
    
    // Вычисляем длительность
    const durationMs = intervalEnd.getTime() - current.getTime();
    
    if (durationMs > 0) {
      result.push({
        date: currentDate,
        startAt: current.toISOString(),
        endAt: intervalEnd.toISOString(),
        durationMs,
      });
    }
    
    // Переходим к следующему дню
    current = new Date(intervalEnd.getTime() + 1);
  }
  
  return result;
}

/**
 * Вычисляет длительность интервала в миллисекундах
 * @param startAt ISO 8601 строка начала интервала
 * @param endAt ISO 8601 строка конца интервала
 * @returns Длительность в миллисекундах
 */
export function calculateIntervalDuration(startAt: string, endAt: string): number {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  return Math.max(0, end - start);
}

/**
 * Преобразует миллисекунды в часы
 */
export function msToHours(ms: number): number {
  return ms / (1000 * 60 * 60);
}

/**
 * Преобразует миллисекунды в минуты
 */
export function msToMinutes(ms: number): number {
  return ms / (1000 * 60);
}

/**
 * Форматирует длительность в формате HH:MM:SS
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Проверяет, находится ли интервал полностью в одном дне
 */
export function isIntervalInSingleDay(startAt: string, endAt: string): boolean {
  return !isIntervalCrossesMidnight(startAt, endAt);
}

/**
 * Получает количество дней, на которые распределяется интервал
 */
export function getIntervalDayCount(startAt: string, endAt: string): number {
  const splits = splitIntervalByCalendarDays(startAt, endAt);
  return splits.length;
}
