import AsyncStorage from "@react-native-async-storage/async-storage";

export interface WorkSession {
  id: string;
  startTime: string; // ISO 8601 format
  endTime?: string;
  breaks: Array<{
    startTime: string;
    endTime?: string;
  }>;
  totalBreakTime: number; // в минутах
  status: "active" | "paused" | "completed";
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface DailyWorkStats {
  date: string; // YYYY-MM-DD
  totalWorkTime: number; // в часах
  totalBreakTime: number; // в минутах
  sessions: WorkSession[];
  status: "normal" | "anomaly" | "vacation" | "sick";
}

const WORK_SESSIONS_KEY = "worktime_sessions";
const DAILY_STATS_KEY = "worktime_daily_stats";
const CURRENT_SESSION_KEY = "worktime_current_session";

/**
 * Сохраняет рабочую сессию в локальное хранилище
 */
export async function saveWorkSession(session: WorkSession): Promise<void> {
  try {
    const sessions = await getAllWorkSessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);

    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }

    await AsyncStorage.setItem(WORK_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error("Ошибка при сохранении рабочей сессии:", error);
    throw error;
  }
}

/**
 * Получает все рабочие сессии
 */
export async function getAllWorkSessions(): Promise<WorkSession[]> {
  try {
    const data = await AsyncStorage.getItem(WORK_SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Ошибка при получении рабочих сессий:", error);
    return [];
  }
}

/**
 * Получает рабочие сессии за определенный день
 */
export async function getWorkSessionsByDate(date: string): Promise<WorkSession[]> {
  try {
    const sessions = await getAllWorkSessions();
    return sessions.filter((s) => s.date === date);
  } catch (error) {
    console.error("Ошибка при получении сессий за день:", error);
    return [];
  }
}

/**
 * Получает рабочие сессии за период
 */
export async function getWorkSessionsByDateRange(
  startDate: string,
  endDate: string
): Promise<WorkSession[]> {
  try {
    const sessions = await getAllWorkSessions();
    return sessions.filter((s) => s.date >= startDate && s.date <= endDate);
  } catch (error) {
    console.error("Ошибка при получении сессий за период:", error);
    return [];
  }
}

/**
 * Удаляет рабочую сессию
 */
export async function deleteWorkSession(sessionId: string): Promise<void> {
  try {
    const sessions = await getAllWorkSessions();
    const filtered = sessions.filter((s) => s.id !== sessionId);
    await AsyncStorage.setItem(WORK_SESSIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Ошибка при удалении рабочей сессии:", error);
    throw error;
  }
}

/**
 * Сохраняет текущую активную сессию
 */
export async function saveCurrentSession(session: WorkSession | null): Promise<void> {
  try {
    if (session) {
      await AsyncStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
    } else {
      await AsyncStorage.removeItem(CURRENT_SESSION_KEY);
    }
  } catch (error) {
    console.error("Ошибка при сохранении текущей сессии:", error);
    throw error;
  }
}

/**
 * Получает текущую активную сессию
 */
export async function getCurrentSession(): Promise<WorkSession | null> {
  try {
    const data = await AsyncStorage.getItem(CURRENT_SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Ошибка при получении текущей сессии:", error);
    return null;
  }
}

/**
 * Вычисляет статистику за день
 */
export async function calculateDailyStats(date: string): Promise<DailyWorkStats> {
  try {
    const sessions = await getWorkSessionsByDate(date);

    let totalWorkTime = 0;
    let totalBreakTime = 0;

    sessions.forEach((session) => {
      if (session.endTime) {
        const start = new Date(session.startTime).getTime();
        const end = new Date(session.endTime).getTime();
        const workTimeMs = end - start - session.totalBreakTime * 60 * 1000;
        totalWorkTime += workTimeMs / (1000 * 60 * 60); // конвертируем в часы
      }
      totalBreakTime += session.totalBreakTime;
    });

    return {
      date,
      totalWorkTime: Math.round(totalWorkTime * 10) / 10, // округляем до 1 десятой
      totalBreakTime,
      sessions,
      status: "normal",
    };
  } catch (error) {
    console.error("Ошибка при расчете статистики за день:", error);
    return {
      date,
      totalWorkTime: 0,
      totalBreakTime: 0,
      sessions: [],
      status: "normal",
    };
  }
}

/**
 * Получает статистику за месяц
 */
export async function getMonthlyStats(year: number, month: number): Promise<DailyWorkStats[]> {
  try {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

    const sessions = await getWorkSessionsByDateRange(startDate, endDate);
    const dates = new Set(sessions.map((s) => s.date));

    const stats: DailyWorkStats[] = [];
    for (const date of dates) {
      stats.push(await calculateDailyStats(date));
    }

    return stats.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("Ошибка при получении месячной статистики:", error);
    return [];
  }
}

/**
 * Очищает все данные (для отладки)
 */
export async function clearAllWorkData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([WORK_SESSIONS_KEY, CURRENT_SESSION_KEY, DAILY_STATS_KEY]);
  } catch (error) {
    console.error("Ошибка при очистке данных:", error);
    throw error;
  }
}
