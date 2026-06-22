import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import { WorkDay } from '@/shared/types/workday';
import {
  getTodayWorkDay,
  createEmptyWorkDay,
  saveWorkDay,
  getActiveBreakInterval,
  getActiveTemporaryExitInterval,
} from '@/lib/storage/workdayService';
import {
  performAction,
  getAvailableActions,
  StateTransitionError,
} from '@/lib/storage/workdayStateMachine';
import { calculateWorkDayStats } from '@/lib/storage/workdayStatsService';
import { formatDate } from '@/lib/utils/dateUtils';

interface UseWorkDayReturn {
  workDay: WorkDay | null;
  loading: boolean;
  error: string | null;
  stats: ReturnType<typeof calculateWorkDayStats> | null;
  availableActions: string[];
  performAction: (action: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Восстанавливает корректный статус рабочего дня после перезапуска приложения.
 * Если день имеет активный перерыв или выход, но статус не соответствует — исправляем.
 */
function restoreWorkDayState(workDay: WorkDay): WorkDay {
  const activeBreak = getActiveBreakInterval(workDay);
  const activeExit = getActiveTemporaryExitInterval(workDay);

  // Если есть активный перерыв, но статус не on_break — восстанавливаем
  if (activeBreak && workDay.status !== 'on_break') {
    return { ...workDay, status: 'on_break' };
  }

  // Если есть активный выход, но статус не on_temporary_exit — восстанавливаем
  if (activeExit && workDay.status !== 'on_temporary_exit') {
    return { ...workDay, status: 'on_temporary_exit' };
  }

  // Если день начат (workStartAt есть), нет активных интервалов, нет завершения — восстанавливаем working
  if (
    workDay.workStartAt &&
    !workDay.workEndAt &&
    !activeBreak &&
    !activeExit &&
    workDay.status !== 'working' &&
    workDay.status !== 'completed' &&
    workDay.status !== 'not_started'
  ) {
    return { ...workDay, status: 'working' };
  }

  return workDay;
}

/**
 * Хук для управления состоянием рабочего дня.
 * Включает:
 * - Загрузку рабочего дня при монтировании
 * - Восстановление состояния после перезапуска приложения
 * - Обновление при возврате приложения на передний план (AppState)
 * - Валидацию действий с показом ошибок пользователю
 */
export function useWorkDay(): UseWorkDayReturn {
  const [workDay, setWorkDay] = useState<WorkDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);

  // Загружает рабочий день за сегодня и восстанавливает состояние
  const loadWorkDay = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let day = await getTodayWorkDay();
      if (!day) {
        const today = formatDate(new Date());
        day = createEmptyWorkDay(today);
        await saveWorkDay(day);
      } else {
        // Восстанавливаем корректный статус после перезапуска
        const restored = restoreWorkDayState(day);
        if (restored.status !== day.status) {
          await saveWorkDay(restored);
          day = restored;
        }
      }

      setWorkDay(day);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки рабочего дня';
      setError(message);
      console.error('Error loading workday:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Загружает рабочий день при монтировании компонента
  useEffect(() => {
    loadWorkDay();
  }, [loadWorkDay]);

  // Обновляем данные при возврате приложения на передний план
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          // Приложение вернулось на передний план — перезагружаем рабочий день
          loadWorkDay();
        }
        appState.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, [loadWorkDay]);

  // Выполняет действие с валидацией
  const handlePerformAction = useCallback(
    async (action: string) => {
      if (!workDay) {
        setError('Рабочий день не загружен');
        return;
      }

      // Проверяем, доступно ли действие
      const available = getAvailableActions(workDay);
      if (!available.includes(action)) {
        const actionNames: Record<string, string> = {
          start: 'начать работу',
          start_break: 'начать перерыв',
          end_break: 'завершить перерыв',
          start_temporary_exit: 'начать выход',
          end_temporary_exit: 'завершить выход',
          complete: 'завершить день',
        };
        const actionName = actionNames[action] ?? action;

        // Формируем понятное сообщение об ошибке
        let errorMsg = `Невозможно ${actionName} в текущем состоянии.`;
        if (workDay.status === 'completed') {
          errorMsg = 'Рабочий день уже завершён.';
        } else if (action === 'start' && workDay.status !== 'not_started') {
          errorMsg = 'Работа уже начата.';
        } else if (action === 'start_break' && workDay.status === 'on_break') {
          errorMsg = 'Перерыв уже активен.';
        } else if (action === 'start_temporary_exit' && workDay.status === 'on_temporary_exit') {
          errorMsg = 'Временный выход уже активен.';
        } else if (action === 'complete' && workDay.status === 'not_started') {
          errorMsg = 'Сначала начните рабочий день.';
        }

        Alert.alert('Действие недоступно', errorMsg);
        return;
      }

      try {
        setError(null);

        const updated = performAction(workDay, action);
        await saveWorkDay(updated);
        setWorkDay(updated);
      } catch (err) {
        const message =
          err instanceof StateTransitionError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Ошибка выполнения действия';

        // Показываем Alert для критических ошибок
        Alert.alert('Ошибка', message);
        setError(message);
        console.error('Error performing action:', err);
      }
    },
    [workDay]
  );

  // Обновляет рабочий день
  const refresh = useCallback(async () => {
    await loadWorkDay();
  }, [loadWorkDay]);

  // Вычисляет статистику
  const stats = workDay ? calculateWorkDayStats(workDay) : null;

  // Получает доступные действия
  const availableActions = workDay ? getAvailableActions(workDay) : [];

  return {
    workDay,
    loading,
    error,
    stats,
    availableActions,
    performAction: handlePerformAction,
    refresh,
  };
}
