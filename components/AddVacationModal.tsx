import { Modal, View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";
import * as Haptics from "expo-haptics";

interface AddVacationModalProps {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  onClose: () => void;
  onAddVacation: (startDate: string, endDate: string, type: "vacation" | "sick_leave" | "unpaid_leave") => Promise<void>;
}

export function AddVacationModal({ visible, selectedDate, onClose, onAddVacation }: AddVacationModalProps) {
  const colors = useColors();
  const [vacationType, setVacationType] = useState<"vacation" | "sick_leave" | "unpaid_leave">("vacation");
  const [endDate, setEndDate] = useState<string>(selectedDate);
  const [isLoading, setIsLoading] = useState(false);

  const formatDateForDisplay = (dateStr: string): string => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" });
  };

  const handleAddDay = () => {
    const date = new Date(endDate);
    date.setDate(date.getDate() + 1);
    const newDate = date.toISOString().split("T")[0];
    setEndDate(newDate);
  };

  const handleRemoveDay = () => {
    if (endDate > selectedDate) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - 1);
      const newDate = date.toISOString().split("T")[0];
      setEndDate(newDate);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await onAddVacation(selectedDate, endDate, vacationType);
      
      Alert.alert("Успешно", "Период добавлен");
      onClose();
    } catch (error) {
      console.error("Ошибка при добавлении периода:", error);
      Alert.alert("Ошибка", "Не удалось добавить период");
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case "vacation":
        return "Отпуск";
      case "sick_leave":
        return "Больничный лист";
      case "unpaid_leave":
        return "Неоплачиваемый отпуск";
      default:
        return "Неизвестно";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "vacation":
        return colors.primary;
      case "sick_leave":
        return colors.warning;
      case "unpaid_leave":
        return colors.primary;
      default:
        return colors.muted;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View
          className="rounded-t-3xl p-6 max-h-96"
          style={{ backgroundColor: colors.surface }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Заголовок */}
            <View className="mb-6">
              <Text className="text-2xl font-bold text-foreground">Добавить период</Text>
              <Text className="text-sm text-muted mt-1">
                Выбранная дата: {formatDateForDisplay(selectedDate)}
              </Text>
            </View>

            {/* Выбор типа */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-foreground mb-3">Тип периода</Text>
              
              {[
                { type: "vacation" as const, label: "Отпуск" },
                { type: "sick_leave" as const, label: "Больничный лист" },
                { type: "unpaid_leave" as const, label: "Неоплачиваемый отпуск" },
              ].map(({ type, label }) => (
                <TouchableOpacity
                  key={type}
                  className="p-3 rounded-lg mb-2 border-2 flex-row items-center"
                  style={{
                    backgroundColor: vacationType === type ? getTypeColor(type) + "20" : "transparent",
                    borderColor: vacationType === type ? getTypeColor(type) : colors.border,
                  }}
                  onPress={() => {
                    setVacationType(type);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View
                    className="w-5 h-5 rounded-full mr-3"
                    style={{
                      backgroundColor: vacationType === type ? getTypeColor(type) : colors.border,
                    }}
                  />
                  <Text className="text-sm text-foreground font-medium">{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Выбор конечной даты */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-foreground mb-3">Конечная дата</Text>
              
              <View className="flex-row items-center justify-between p-3 rounded-lg" style={{ backgroundColor: colors.background }}>
                <View>
                  <Text className="text-xs text-muted mb-1">До</Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {formatDateForDisplay(endDate)}
                  </Text>
                </View>
                
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                    onPress={handleRemoveDay}
                    disabled={endDate === selectedDate}
                  >
                    <Text className="text-lg font-bold text-foreground">−</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: colors.primary }}
                    onPress={handleAddDay}
                  >
                    <Text className="text-lg font-bold text-white">+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text className="text-xs text-muted mt-2">
                Продолжительность: {Math.ceil((new Date(endDate).getTime() - new Date(selectedDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} дн.
              </Text>
            </View>

            {/* Кнопки */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 p-3 rounded-lg items-center"
                style={{ backgroundColor: colors.border }}
                onPress={onClose}
                disabled={isLoading}
              >
                <Text className="text-sm font-semibold text-foreground">Отмена</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-1 p-3 rounded-lg items-center"
                style={{ backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 }}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <Text className="text-sm font-semibold text-white">
                  {isLoading ? "Добавление..." : "Добавить"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
