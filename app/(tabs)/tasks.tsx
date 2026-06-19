import { ScrollView, Text, View, TouchableOpacity, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

interface Task {
  id: string;
  title: string;
  description: string;
  timeSpent: number; // в минутах
  status: "active" | "paused" | "completed";
  createdAt: Date;
}

export default function TasksScreen() {
  const colors = useColors();
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Разработка нового функционала",
      description: "Реализовать модуль отчетов",
      timeSpent: 120,
      status: "active",
      createdAt: new Date(),
    },
    {
      id: "2",
      title: "Тестирование приложения",
      description: "Проверить основные функции",
      timeSpent: 45,
      status: "paused",
      createdAt: new Date(),
    },
  ]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return colors.success;
      case "paused":
        return colors.warning;
      case "completed":
        return colors.muted;
      default:
        return colors.muted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Активна";
      case "paused":
        return "Пауза";
      case "completed":
        return "Завершена";
      default:
        return "Неизвестно";
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View
      className="bg-surface rounded-lg p-4 mb-3 border border-border"
      style={{ borderColor: colors.border }}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-foreground">{item.title}</Text>
          <Text className="text-sm text-muted mt-1">{item.description}</Text>
        </View>
        <View
          className="px-3 py-1 rounded-full"
          style={{ backgroundColor: getStatusColor(item.status) + "20" }}
        >
          <Text className="text-xs font-semibold" style={{ color: getStatusColor(item.status) }}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between items-center mt-3">
        <Text className="text-sm font-medium text-foreground">
          Время: {formatTime(item.timeSpent)}
        </Text>
        <View className="flex-row gap-2">
          {item.status === "active" ? (
            <TouchableOpacity
              className="px-3 py-2 rounded-lg"
              style={{ backgroundColor: colors.warning }}
            >
              <Text className="text-white text-sm font-semibold">Пауза</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="px-3 py-2 rounded-lg"
              style={{ backgroundColor: colors.success }}
            >
              <Text className="text-white text-sm font-semibold">Запуск</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className="px-3 py-2 rounded-lg"
            style={{ backgroundColor: colors.error }}
          >
            <Text className="text-white text-sm font-semibold">Удалить</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenContainer className="p-4">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-3xl font-bold text-foreground">Задачи</Text>
        <TouchableOpacity
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-2xl text-white font-bold">+</Text>
        </TouchableOpacity>
      </View>

      {tasks.length > 0 ? (
        <FlatList
          data={tasks}
          renderItem={renderTaskItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-muted">Нет задач</Text>
          <Text className="text-sm text-muted mt-2">Нажмите + для создания новой задачи</Text>
        </View>
      )}
    </ScreenContainer>
  );
}
