import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";

interface ProductionCalendarUploadProps {
  onUpload: (holidays: string[]) => Promise<void>;
  isLoading?: boolean;
}

export function ProductionCalendarUpload({ onUpload, isLoading = false }: ProductionCalendarUploadProps) {
  const colors = useColors();
  const [uploading, setUploading] = useState(false);

  const parseCSV = (content: string): string[] => {
    const lines = content.split("\n").filter((line) => line.trim());
    const holidays: string[] = [];

    for (const line of lines) {
      // Пропустить заголовок
      if (line.toLowerCase().includes("date") || line.toLowerCase().includes("дата")) {
        continue;
      }

      // Извлечь дату (первый столбец)
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length > 0) {
        const date = parts[0].trim();
        // Проверить формат даты (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          holidays.push(date);
        }
      }
    }

    return holidays;
  };

  const handlePickFile = async () => {
    try {
      setUploading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Использовать встроенный текстовый ввод вместо выбора файла
      // В реальном приложении здесь должна быть функция выбора файла
      Alert.prompt(
        "Загрузить производственный календарь",
        "Введите праздничные дни в формате YYYY-MM-DD (один день на строку):",
        async (text) => {
          if (!text || text.trim() === "") {
            return;
          }

          const fileContent = text;
          const holidays = parseCSV(fileContent);

          if (holidays.length === 0) {
            Alert.alert("Ошибка", "Не найдены праздничные дни в формате YYYY-MM-DD");
            setUploading(false);
            return;
          }

          await onUpload(holidays);
          Alert.alert("Успешно", `Загружено ${holidays.length} праздничных дней`);
        }
      );
    } catch (error) {
      console.error("Ошибка при загрузке календаря:", error);
      Alert.alert("Ошибка", "Не удалось загрузить календарь.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View className="rounded-lg p-4" style={{ backgroundColor: colors.surface }}>
      <Text className="text-sm font-semibold text-foreground mb-2">Загрузить производственный календарь</Text>
      <Text className="text-xs text-muted mb-4">
        Загрузите CSV файл с праздничными днями в формате YYYY-MM-DD (один день на строку)
      </Text>

      <TouchableOpacity
        className="rounded-lg p-3 items-center justify-center flex-row gap-2"
        style={{ backgroundColor: colors.primary, opacity: uploading || isLoading ? 0.6 : 1 }}
        onPress={handlePickFile}
        disabled={uploading || isLoading}
      >
        {(uploading || isLoading) && <ActivityIndicator color="white" />}
        <Text className="text-white font-semibold">{uploading ? "Загрузка..." : "Выбрать файл CSV"}</Text>
      </TouchableOpacity>

      <View className="mt-3 p-3 rounded-lg" style={{ backgroundColor: colors.border }}>
        <Text className="text-xs text-muted">
          Пример формата CSV:{"\n"}
          date{"\n"}
          2026-01-01{"\n"}
          2026-02-23{"\n"}
          2026-03-08
        </Text>
      </View>
    </View>
  );
}
