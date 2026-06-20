import { useState, useEffect, useCallback } from "react";
import {
  WorkSession,
  DailyWorkStats,
  saveWorkSession,
  getCurrentSession,
  saveCurrentSession,
  getWorkSessionsByDate,
  calculateDailyStats,
} from "@/lib/storage/workSessionStorage";

export function useWorkSessions() {
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyWorkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем текущую сессию при инициализации
  useEffect(() => {
    loadCurrentSession();
  }, []);

  // Загружаем статистику за сегодня
  useEffect(() => {
    loadDailyStats();
  }, []);

  const loadCurrentSession = useCallback(async () => {
    try {
      const session = await getCurrentSession();
      setCurrentSession(session);
    } catch (error) {
      console.error("Ошибка при загрузке текущей сессии:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDailyStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const stats = await calculateDailyStats(today);
      setDailyStats(stats);
    } catch (error) {
      console.error("Ошибка при загрузке статистики за день:", error);
    }
  }, []);

  const startWorkSession = useCallback(async () => {
    try {
      const newSession: WorkSession = {
        id: Date.now().toString(),
        startTime: new Date().toISOString(),
        breaks: [],
        totalBreakTime: 0,
        status: "active",
        date: new Date().toISOString().split("T")[0],
      };

      await saveCurrentSession(newSession);
      setCurrentSession(newSession);
      return newSession;
    } catch (error) {
      console.error("Ошибка при начале рабочей сессии:", error);
      throw error;
    }
  }, []);

  const endWorkSession = useCallback(async () => {
    try {
      if (!currentSession) return;

      const completedSession: WorkSession = {
        ...currentSession,
        endTime: new Date().toISOString(),
        status: "completed",
      };

      await saveWorkSession(completedSession);
      await saveCurrentSession(null);
      setCurrentSession(null);
      await loadDailyStats();
      return completedSession;
    } catch (error) {
      console.error("Ошибка при завершении рабочей сессии:", error);
      throw error;
    }
  }, [currentSession]);

  const startBreak = useCallback(async () => {
    try {
      if (!currentSession) return;

      const updatedSession: WorkSession = {
        ...currentSession,
        status: "paused",
        breaks: [
          ...currentSession.breaks,
          {
            startTime: new Date().toISOString(),
          },
        ],
      };

      await saveCurrentSession(updatedSession);
      setCurrentSession(updatedSession);
      return updatedSession;
    } catch (error) {
      console.error("Ошибка при начале перерыва:", error);
      throw error;
    }
  }, [currentSession]);

  const endBreak = useCallback(async () => {
    try {
      if (!currentSession || currentSession.breaks.length === 0) return;

      const lastBreakIndex = currentSession.breaks.length - 1;
      const lastBreak = currentSession.breaks[lastBreakIndex];

      if (!lastBreak.endTime) {
        const breakStart = new Date(lastBreak.startTime).getTime();
        const breakEnd = new Date().getTime();
        const breakDuration = Math.round((breakEnd - breakStart) / (1000 * 60)); // в минутах

        const updatedSession: WorkSession = {
          ...currentSession,
          status: "active",
          breaks: [
            ...currentSession.breaks.slice(0, lastBreakIndex),
            {
              ...lastBreak,
              endTime: new Date().toISOString(),
            },
          ],
          totalBreakTime: currentSession.totalBreakTime + breakDuration,
        };

        await saveCurrentSession(updatedSession);
        setCurrentSession(updatedSession);
        return updatedSession;
      }
    } catch (error) {
      console.error("Ошибка при завершении перерыва:", error);
      throw error;
    }
  }, [currentSession]);

  const getSessionsForDate = useCallback(async (date: string) => {
    try {
      return await getWorkSessionsByDate(date);
    } catch (error) {
      console.error("Ошибка при получении сессий за день:", error);
      return [];
    }
  }, []);

  const refreshDailyStats = useCallback(async () => {
    await loadDailyStats();
  }, []);

  return {
    currentSession,
    dailyStats,
    isLoading,
    startWorkSession,
    endWorkSession,
    startBreak,
    endBreak,
    getSessionsForDate,
    refreshDailyStats,
  };
}
