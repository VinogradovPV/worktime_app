import { useState, useEffect, useCallback } from "react";
import {
  Task,
  getAllTasks,
  getActiveTasks,
  getCompletedTasks,
  saveTask,
  deleteTask,
  updateTaskStatus,
  updateTaskTimeSpent,
  getTasksStatistics,
} from "@/lib/storage/taskStorage";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    completed: 0,
    totalTimeSpent: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Загружаем задачи при инициализации
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const [allTasks, active, completed, stats] = await Promise.all([
        getAllTasks(),
        getActiveTasks(),
        getCompletedTasks(),
        getTasksStatistics(),
      ]);

      setTasks(allTasks);
      setActiveTasks(active);
      setCompletedTasks(completed);
      setStatistics(stats);
    } catch (error) {
      console.error("Ошибка при загрузке задач:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTask = useCallback(
    async (
      title: string,
      description: string,
      priority: Task["priority"] = "medium",
      dueDate?: string
    ): Promise<Task> => {
      try {
        const newTask: Task = {
          id: Date.now().toString(),
          title,
          description,
          timeSpent: 0,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          priority,
          dueDate,
          tags: [],
        };

        await saveTask(newTask);
        await loadTasks();
        return newTask;
      } catch (error) {
        console.error("Ошибка при создании задачи:", error);
        throw error;
      }
    },
    []
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>): Promise<void> => {
      try {
        const existingTask = tasks.find((t) => t.id === id);
        if (existingTask) {
          const updatedTask: Task = {
            ...existingTask,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          await saveTask(updatedTask);
          await loadTasks();
        }
      } catch (error) {
        console.error("Ошибка при обновлении задачи:", error);
        throw error;
      }
    },
    [tasks]
  );

  const changeTaskStatus = useCallback(
    async (id: string, status: Task["status"]): Promise<void> => {
      try {
        await updateTaskStatus(id, status);
        await loadTasks();
      } catch (error) {
        console.error("Ошибка при изменении статуса задачи:", error);
        throw error;
      }
    },
    []
  );

  const addTimeToTask = useCallback(
    async (id: string, minutes: number): Promise<void> => {
      try {
        await updateTaskTimeSpent(id, minutes);
        await loadTasks();
      } catch (error) {
        console.error("Ошибка при добавлении времени к задаче:", error);
        throw error;
      }
    },
    []
  );

  const removeTask = useCallback(
    async (id: string): Promise<void> => {
      try {
        await deleteTask(id);
        await loadTasks();
      } catch (error) {
        console.error("Ошибка при удалении задачи:", error);
        throw error;
      }
    },
    []
  );

  const completeTask = useCallback(
    async (id: string): Promise<void> => {
      try {
        await changeTaskStatus(id, "completed");
      } catch (error) {
        console.error("Ошибка при завершении задачи:", error);
        throw error;
      }
    },
    [changeTaskStatus]
  );

  const pauseTask = useCallback(
    async (id: string): Promise<void> => {
      try {
        await changeTaskStatus(id, "paused");
      } catch (error) {
        console.error("Ошибка при паузе задачи:", error);
        throw error;
      }
    },
    [changeTaskStatus]
  );

  const resumeTask = useCallback(
    async (id: string): Promise<void> => {
      try {
        await changeTaskStatus(id, "active");
      } catch (error) {
        console.error("Ошибка при возобновлении задачи:", error);
        throw error;
      }
    },
    [changeTaskStatus]
  );

  const refreshTasks = useCallback(async () => {
    await loadTasks();
  }, []);

  return {
    tasks,
    activeTasks,
    completedTasks,
    statistics,
    isLoading,
    createTask,
    updateTask,
    changeTaskStatus,
    addTimeToTask,
    removeTask,
    completeTask,
    pauseTask,
    resumeTask,
    refreshTasks,
  };
}
