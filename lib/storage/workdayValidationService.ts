import { WorkDay, WorkEvent, WorkEventType } from '@/shared/types/workday';

export interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Валидирует последовательность событий рабочего дня
 */
export class WorkDayValidator {
  /**
   * Проверяет корректность последовательности событий
   */
  static validateEventSequence(workDay: WorkDay): ValidationError[] {
    const errors: ValidationError[] = [];
    const events = [...workDay.events].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    if (events.length === 0) {
      return errors;
    }

    let hasWorkStart = false;
    let hasWorkEnd = false;
    let isInBreak = false;
    let isInTemporaryExit = false;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      switch (event.type) {
        case 'work_start':
          if (hasWorkStart && !hasWorkEnd) {
            errors.push({
              code: 'DUPLICATE_WORK_START',
              message: 'Работа уже начата. Завершите текущую работу перед началом новой.',
              severity: 'error',
            });
          }
          hasWorkStart = true;
          hasWorkEnd = false;
          break;

        case 'work_end':
          if (!hasWorkStart) {
            errors.push({
              code: 'WORK_END_WITHOUT_START',
              message: 'Сначала добавьте начало работы',
              severity: 'error',
            });
          }
          if (isInBreak) {
            errors.push({
              code: 'WORK_END_DURING_BREAK',
              message: 'Завершите перерыв перед завершением работы',
              severity: 'error',
            });
          }
          if (isInTemporaryExit) {
            errors.push({
              code: 'WORK_END_DURING_EXIT',
              message: 'Завершите временный выход перед завершением работы',
              severity: 'error',
            });
          }
          hasWorkEnd = true;
          break;

        case 'break_start':
          if (!hasWorkStart) {
            errors.push({
              code: 'BREAK_WITHOUT_WORK_START',
              message: 'Начните работу перед началом перерыва',
              severity: 'error',
            });
          }
          if (isInBreak) {
            errors.push({
              code: 'DUPLICATE_BREAK_START',
              message: 'Перерыв уже начат',
              severity: 'error',
            });
          }
          if (isInTemporaryExit) {
            errors.push({
              code: 'BREAK_DURING_EXIT',
              message: 'Нельзя начать перерыв во время временного выхода',
              severity: 'error',
            });
          }
          isInBreak = true;
          break;

        case 'break_end':
          if (!isInBreak) {
            errors.push({
              code: 'BREAK_END_WITHOUT_START',
              message: 'Сначала начните перерыв',
              severity: 'error',
            });
          }
          isInBreak = false;
          break;

        case 'temporary_exit_start':
          if (!hasWorkStart) {
            errors.push({
              code: 'EXIT_WITHOUT_WORK_START',
              message: 'Начните работу перед временным выходом',
              severity: 'error',
            });
          }
          if (isInTemporaryExit) {
            errors.push({
              code: 'DUPLICATE_EXIT_START',
              message: 'Временный выход уже начат',
              severity: 'error',
            });
          }
          if (isInBreak) {
            errors.push({
              code: 'EXIT_DURING_BREAK',
              message: 'Нельзя начать временный выход во время перерыва',
              severity: 'error',
            });
          }
          isInTemporaryExit = true;
          break;

        case 'temporary_exit_end':
          if (!isInTemporaryExit) {
            errors.push({
              code: 'EXIT_END_WITHOUT_START',
              message: 'Сначала начните временный выход',
              severity: 'error',
            });
          }
          isInTemporaryExit = false;
          break;
      }
    }

    // Проверка открытых интервалов в конце дня
    if (isInBreak && !hasWorkEnd) {
      errors.push({
        code: 'UNCLOSED_BREAK',
        message: 'Перерыв не завершен',
        severity: 'warning',
      });
    }

    if (isInTemporaryExit && !hasWorkEnd) {
      errors.push({
        code: 'UNCLOSED_EXIT',
        message: 'Временный выход не завершен',
        severity: 'warning',
      });
    }

    return errors;
  }

  /**
   * Проверяет, может ли быть добавлено событие в указанное время
   */
  static validateEventTime(
    workDay: WorkDay,
    eventType: WorkEventType,
    timestamp: string,
    existingEventId?: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const events = workDay.events
      .filter(e => e.id !== existingEventId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const timestampMs = new Date(timestamp).getTime();

    // Проверка на пересечение времени
    for (const event of events) {
      const eventMs = new Date(event.timestamp).getTime();
      if (eventMs === timestampMs) {
        errors.push({
          code: 'DUPLICATE_TIMESTAMP',
          message: 'В это время уже есть событие',
          severity: 'error',
        });
      }
    }

    // Проверка на логический порядок
    const lastEvent = events[events.length - 1];
    if (lastEvent && timestampMs < new Date(lastEvent.timestamp).getTime()) {
      errors.push({
        code: 'TIME_OUT_OF_ORDER',
        message: 'Время события не может быть раньше предыдущего события',
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Проверяет, может ли быть добавлено событие в указанную дату
   */
  static validateEventDate(eventDate: Date, currentDate: Date): ValidationError[] {
    const errors: ValidationError[] = [];

    // Разрешить редактирование текущего и прошедших дней
    const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    if (eventDateOnly > currentDateOnly) {
      errors.push({
        code: 'FUTURE_DATE',
        message: 'Нельзя добавить рабочее событие в будущую дату',
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Получает все ошибки для рабочего дня
   */
  static validateWorkDay(workDay: WorkDay): ValidationError[] {
    const errors: ValidationError[] = [];

    // Проверка последовательности событий
    errors.push(...this.validateEventSequence(workDay));

    // Проверка на пересечение интервалов
    const intervals = workDay.breakIntervals.concat(workDay.temporaryExitIntervals);
    for (let i = 0; i < intervals.length; i++) {
      for (let j = i + 1; j < intervals.length; j++) {
        const int1 = intervals[i];
        const int2 = intervals[j];

        const int1Start = new Date(int1.startAt).getTime();
        const int1End = int1.endAt ? new Date(int1.endAt).getTime() : Infinity;
        const int2Start = new Date(int2.startAt).getTime();
        const int2End = int2.endAt ? new Date(int2.endAt).getTime() : Infinity;

        // Проверка пересечения
        if (
          (int1Start <= int2Start && int2Start < int1End) ||
          (int2Start <= int1Start && int1Start < int2End)
        ) {
          errors.push({
            code: 'INTERVAL_OVERLAP',
            message: 'Интервалы перекрываются',
            severity: 'error',
          });
        }
      }
    }

    return errors;
  }

  /**
   * Проверяет, может ли быть выполнено действие в текущем состоянии
   */
  static canPerformAction(workDay: WorkDay, action: string): { allowed: boolean; error?: string } {
    const lastEvent = [...workDay.events]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    switch (action) {
      case 'start_work':
        if (lastEvent?.type === 'work_start') {
          return { allowed: false, error: 'Работа уже начата' };
        }
        return { allowed: true };

      case 'start_break':
        if (!lastEvent || lastEvent.type === 'work_end') {
          return { allowed: false, error: 'Сначала начните работу' };
        }
        if (lastEvent.type === 'break_start') {
          return { allowed: false, error: 'Перерыв уже начат' };
        }
        return { allowed: true };

      case 'end_break':
        if (lastEvent?.type !== 'break_start') {
          return { allowed: false, error: 'Перерыв не начат' };
        }
        return { allowed: true };

      case 'start_temporary_exit':
        if (!lastEvent || lastEvent.type === 'work_end') {
          return { allowed: false, error: 'Сначала начните работу' };
        }
        if (lastEvent.type === 'temporary_exit_start') {
          return { allowed: false, error: 'Временный выход уже начат' };
        }
        return { allowed: true };

      case 'end_temporary_exit':
        if (lastEvent?.type !== 'temporary_exit_start') {
          return { allowed: false, error: 'Временный выход не начат' };
        }
        return { allowed: true };

      case 'end_work':
        if (!lastEvent || lastEvent.type === 'work_end') {
          return { allowed: false, error: 'Работа не начата' };
        }
        return { allowed: true };

      default:
        return { allowed: false, error: 'Неизвестное действие' };
    }
  }
}
