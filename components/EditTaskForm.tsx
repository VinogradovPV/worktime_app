import { View, TextInput, TouchableOpacity, Text, KeyboardAvoidingView, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";
import { Task } from "@/lib/storage/taskStorage";

interface EditTaskFormProps {
  task: Task;
  onSave: (title: string, description: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EditTaskForm({ task, onSave, onCancel, isLoading = false }: EditTaskFormProps) {
  const colors = useColors();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
  }, [task]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Пожалуйста, введите название задачи");
      return;
    }

    setError("");

    try {
      await onSave(title, description);
    } catch (err) {
      setError("Ошибка при сохранении задачи");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="bg-surface rounded-lg p-4 mb-4 border border-border"
      style={{ borderColor: colors.border }}
    >
      <Text className="text-sm font-semibold text-foreground mb-3">Редактировать задачу</Text>

      {/* Поле для названия */}
      <View className="mb-3">
        <Text className="text-xs text-muted mb-1">Название *</Text>
        <TextInput
          placeholder="Введите название задачи..."
          placeholderTextColor={colors.muted}
          value={title}
          onChangeText={setTitle}
          editable={!isLoading}
          className="border rounded-lg px-3 py-2 text-foreground"
          style={{
            borderColor: colors.border,
            color: colors.foreground,
            backgroundColor: colors.background,
          }}
          maxLength={100}
        />
      </View>

      {/* Поле для описания */}
      <View className="mb-3">
        <Text className="text-xs text-muted mb-1">Описание</Text>
        <TextInput
          placeholder="Введите описание задачи..."
          placeholderTextColor={colors.muted}
          value={description}
          onChangeText={setDescription}
          editable={!isLoading}
          multiline
          numberOfLines={3}
          className="border rounded-lg px-3 py-2 text-foreground"
          style={{
            borderColor: colors.border,
            color: colors.foreground,
            backgroundColor: colors.background,
            textAlignVertical: "top",
          }}
          maxLength={500}
        />
      </View>

      {/* Информация о задаче */}
      <View className="mb-3 p-2 rounded bg-muted/10">
        <Text className="text-xs text-muted">
          Статус: {task.status === "active" ? "Активна" : task.status === "paused" ? "Пауза" : "Завершена"}
        </Text>
        <Text className="text-xs text-muted mt-1">
          Время потрачено: {Math.floor(task.timeSpent / 60)}ч {task.timeSpent % 60}м
        </Text>
        <Text className="text-xs text-muted mt-1">
          Создана: {new Date(task.createdAt).toLocaleDateString("ru-RU")}
        </Text>
      </View>

      {/* Сообщение об ошибке */}
      {error ? (
        <Text className="text-xs text-error mb-3" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}

      {/* Кнопки действий */}
      <View className="flex-row gap-2">
        <TouchableOpacity
          className="flex-1 py-2 rounded-lg items-center justify-center"
          style={{ backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 }}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text className="text-white text-sm font-semibold">
            {isLoading ? "Сохранение..." : "Сохранить"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 py-2 rounded-lg border items-center justify-center"
          style={{ borderColor: colors.border }}
          onPress={onCancel}
          disabled={isLoading}
        >
          <Text className="text-foreground text-sm font-semibold">Отмена</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
