import { View, TextInput, TouchableOpacity, Text, KeyboardAvoidingView, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

interface AddTaskFormProps {
  onAdd: (title: string, description: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AddTaskForm({ onAdd, onCancel, isLoading = false }: AddTaskFormProps) {
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const handleAdd = async () => {
    if (!title.trim()) {
      setError("Пожалуйста, введите название задачи");
      return;
    }

    setError("");

    try {
      await onAdd(title, description);
      setTitle("");
      setDescription("");
    } catch (err) {
      setError("Ошибка при создании задачи");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="bg-surface rounded-lg p-4 mb-4 border border-border"
      style={{ borderColor: colors.border }}
    >
      <Text className="text-sm font-semibold text-foreground mb-3">Новая задача</Text>

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
          onPress={handleAdd}
          disabled={isLoading}
        >
          <Text className="text-white text-sm font-semibold">
            {isLoading ? "Создание..." : "Создать"}
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
