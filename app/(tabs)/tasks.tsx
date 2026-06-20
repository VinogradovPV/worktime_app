import { ScrollView, Text, View, TouchableOpacity, FlatList, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useTasks } from "@/hooks/useTasks";
import { AddTaskForm } from "@/components/AddTaskForm";
import { useState } from "react";

export default function TasksScreen() {
  const colors = useColors();
  const { activeTasks, statistics, createTask, changeTaskStatus, removeTask } = useTasks();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleAddTask = async (title: string, description: string) => {
    setIsCreating(true);
    try {
      await createTask(title, description, "medium");
      setShowAddForm(false);
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось создать задачу");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await changeTaskStatus(taskId, "completed");
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось завершить задачу");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    Alert.alert("Удалить задачу?", "Это действие нельзя отменить", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await removeTask(taskId);
          } catch (error) {
            Alert.alert("Ошибка", "Не удалось удалить задачу");
          }
        },
      },
    ]);
  };

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

  const renderTaskItem = ({ item }: { item: any }) => (
    <View
      className="bg-surface rounded-lg p-4 mb-3 border border-border"
      style={{ borderColor: colors.border }}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-foreground">{item.title}</Text>
          {item.description ? (
            <Text className="text-sm text-muted mt-1">{item.description}</Text>
          ) : null}
        </View>
        <View
          className="px-3 py-1 rounded-full ml-2"
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
          {item.status !== "completed" && (
            <TouchableOpacity
              className="px-3 py-2 rounded-lg"
              style={{ backgroundColor: colors.success }}
              onPress={() => handleCompleteTask(item.id)}
            >
              <Text className="text-white text-sm font-semibold">✓</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className="px-3 py-2 rounded-lg"
            style={{ backgroundColor: colors.error }}
            onPress={() => handleDeleteTask(item.id)}
          >
            <Text className="text-white text-sm font-semibold">×</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenContainer className="p-4">
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-3xl font-bold text-foreground">Задачи</Text>
          <Text className="text-sm text-muted mt-1">
            Активных: {statistics.active} | Завершено: {statistics.completed}
          </Text>
        </View>
        <TouchableOpacity
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.primary }}
          onPress={() => setShowAddForm(!showAddForm)}
        >
          <Text className="text-2xl text-white font-bold">{showAddForm ? "−" : "+"}</Text>
        </TouchableOpacity>
      </View>

      {showAddForm && (
        <AddTaskForm
          onAdd={handleAddTask}
          onCancel={() => setShowAddForm(false)}
          isLoading={isCreating}
        />
      )}

      {activeTasks.length > 0 ? (
        <ScrollView>
          <FlatList
            data={activeTasks}
            renderItem={renderTaskItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-muted">Нет активных задач</Text>
          <Text className="text-sm text-muted mt-2">Нажмите + для создания новой задачи</Text>
        </View>
      )}
    </ScreenContainer>
  );
}
