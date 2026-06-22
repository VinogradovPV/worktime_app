import { useState, useEffect, useCallback } from 'react';
import { WorkDay } from '@/shared/types/workday';
import {
  getTodayWorkDay,
  createEmptyWorkDay,
  saveWorkDay,
  updateTodayWorkDay,
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
 * Хук для управления состоянием рабочего дня
 */
export function useWorkDay(): UseWorkDayReturn {
  const [workDay, setWorkDay] = useState<WorkDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загружает рабочий день за сегодня
  const loadWorkDay = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let day = await getTodayWorkDay();
      if (!day) {
        const today = formatDate(new Date());
        day = createEmptyWorkDay(today);
        await saveWorkDay(day);
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

  // Выполняет действие
  const handlePerformAction = useCallback(
    async (action: string) => {
      if (!workDay) {
        setError('Рабочий день не загружен');
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
