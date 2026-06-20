import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Task {
  id: string;
  title: string;
  description: string;
  timeSpent: number; // в минутах
  status: "active" | "paused" | "completed";
  createdAt: string; // ISO 8601 format
  updatedAt: string;
  dueDate?: string; // YYYY-MM-DD
  priority: "low" | "medium" | "high";
  tags?: string[];
}

const TASKS_KEY = "worktime_tasks";

/**
 * Сохраняет задачу в локальное хранилище
 */
export async function saveTask(task: Task): Promise<void> {
  try {
    const tasks = await getAllTasks();
    const existingIndex = tasks.findIndex((t) => t.id === task.id);

    if (existingIndex >= 0) {
      tasks[existingIndex] = task;
    } else {
      tasks.push(task);
    }

    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Ошибка при сохранении задачи:", error);
    throw error;
  }
}

/**
 * Получает все задачи
 */
export async function getAllTasks(): Promise<Task[]> {
  try {
    const data = await AsyncStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Ошибка при получении задач:", error);
    return [];
  }
}

/**
 * Получает задачи по статусу
 */
export async function getTasksByStatus(status: Task["status"]): Promise<Task[]> {
  try {
    const tasks = await getAllTasks();
    return tasks.filter((t) => t.status === status);
  } catch (error) {
    console.error("Ошибка при получении задач по статусу:", error);
    return [];
  }
}

/**
 * Получает активные задачи
 */
export async function getActiveTasks(): Promise<Task[]> {
  try {
    const tasks = await getAllTasks();
    return tasks.filter((t) => t.status !== "completed").sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  } catch (error) {
    console.error("Ошибка при получении активных задач:", error);
    return [];
  }
}

/**
 * Получает завершенные задачи
 */
export async function getCompletedTasks(): Promise<Task[]> {
  try {
    const tasks = await getAllTasks();
    return tasks.filter((t) => t.status === "completed");
  } catch (error) {
    console.error("Ошибка при получении завершенных задач:", error);
    return [];
  }
}

/**
 * Получает задачу по ID
 */
export async function getTaskById(id: string): Promise<Task | null> {
  try {
    const tasks = await getAllTasks();
    return tasks.find((t) => t.id === id) || null;
  } catch (error) {
    console.error("Ошибка при получении задачи:", error);
    return null;
  }
}

/**
 * Обновляет статус задачи
 */
export async function updateTaskStatus(id: string, status: Task["status"]): Promise<void> {
  try {
    const task = await getTaskById(id);
    if (task) {
      task.status = status;
      task.updatedAt = new Date().toISOString();
      await saveTask(task);
    }
  } catch (error) {
    console.error("Ошибка при обновлении статуса задачи:", error);
    throw error;
  }
}

/**
 * Обновляет время, потраченное на задачу
 */
export async function updateTaskTimeSpent(id: string, minutes: number): Promise<void> {
  try {
    const task = await getTaskById(id);
    if (task) {
      task.timeSpent += minutes;
      task.updatedAt = new Date().toISOString();
      await saveTask(task);
    }
  } catch (error) {
    console.error("Ошибка при обновлении времени задачи:", error);
    throw error;
  }
}

/**
 * Удаляет задачу
 */
export async function deleteTask(id: string): Promise<void> {
  try {
    const tasks = await getAllTasks();
    const filtered = tasks.filter((t) => t.id !== id);
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Ошибка при удалении задачи:", error);
    throw error;
  }
}

/**
 * Получает задачи за определенный день
 */
export async function getTasksByDate(date: string): Promise<Task[]> {
  try {
    const tasks = await getAllTasks();
    return tasks.filter((t) => {
      const taskDate = t.createdAt.split("T")[0];
      return taskDate === date;
    });
  } catch (error) {
    console.error("Ошибка при получении задач за день:", error);
    return [];
  }
}

/**
 * Получает статистику по задачам
 */
export async function getTasksStatistics(): Promise<{
  total: number;
  active: number;
  completed: number;
  totalTimeSpent: number;
}> {
  try {
    const tasks = await getAllTasks();
    const active = tasks.filter((t) => t.status !== "completed").length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const totalTimeSpent = tasks.reduce((sum, t) => sum + t.timeSpent, 0);

    return {
      total: tasks.length,
      active,
      completed,
      totalTimeSpent,
    };
  } catch (error) {
    console.error("Ошибка при получении статистики задач:", error);
    return {
      total: 0,
      active: 0,
      completed: 0,
      totalTimeSpent: 0,
    };
  }
}

/**
 * Очищает все задачи (для отладки)
 */
export async function clearAllTasks(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TASKS_KEY);
  } catch (error) {
    console.error("Ошибка при очистке задач:", error);
    throw error;
  }
}
