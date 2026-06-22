import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { getWorkSessionsByDate } from "@/lib/storage/workSessionStorage";
import { useState, useEffect } from "react";

interface DayDetailModalProps {
  visible: boolean;
  date: Date | null;
  dayType: "weekend" | "holiday" | "vacation" | "workday";
  vacationType?: "vacation" | "sick_leave" | "unpaid_leave";
  onClose: () => void;
}

export function DayDetailModal({ visible, date, dayType, vacationType, onClose }: DayDetailModalProps) {
  const colors = useColors();
  const [dayStats, setDayStats] = useState({
    totalWorkTime: 0,
    breakTime: 0,
    sessionsCount: 0,
    sessions: [] as any[],
  });

  useEffect(() => {
    if (visible && date) {
      calculateDayStats();
    }
  }, [visible, date]);

  const calculateDayStats = async () => {
    if (!date) return;

    const dateStr = formatDate(date.getFullYear(), date.getMonth(), date.getDate());
    try {
      const daySessions = await getWorkSessionsByDate(dateStr);

      let totalWorkTime = 0;
      let breakTime = 0;

      daySessions.forEach((session: any) => {
        totalWorkTime += session.workDuration || 0;
        breakTime += session.breakDuration || 0;
      });

      setDayStats({
        totalWorkTime,
        breakTime,
        sessionsCount: daySessions.length,
        sessions: daySessions,
      });
    } catch (error) {
      console.error("Ошибка при загрузке данных дня:", error);
    }
  };

  const formatDate = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}ч ${minutes}м`;
  };

  const formatDateTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  const getDayTypeInfo = () => {
    switch (dayType) {
      case "weekend":
        return {
          label: "Выходной день",
          color: colors.muted,
          description: "Суббота или воскресенье",
        };
      case "holiday":
        return {
          label: "Праздничный день",
          color: colors.error,
          description: "Праздничный день согласно производственному календарю",
        };
      case "vacation":
        const vacationLabels = {
          vacation: "Отпуск",
          sick_leave: "Больничный лист",
          unpaid_leave: "Неоплачиваемый отпуск",
        };
        return {
          label: vacationLabels[vacationType as keyof typeof vacationLabels] || "Отпуск",
          color: vacationType === "sick_leave" ? colors.warning : colors.primary,
          description: "Период отпуска",
        };
      case "workday":
      default:
        return {
          label: "Рабочий день",
          color: colors.success,
          description: "Обычный рабочий день",
        };
    }
  };

  const typeInfo = getDayTypeInfo();
  const dateStr = date ? date.toLocaleDateString("ru-RU", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1" style={{ backgroundColor: colors.background + "E6" }}>
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 pt-4 pb-4 border-b" style={{ borderBottomColor: colors.border }}>
          <Text className="text-lg font-bold text-foreground">Детали дня</Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-2xl text-muted">✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-4 py-4">
          {/* Дата и тип дня */}
          <View className="mb-6 p-4 rounded-lg" style={{ backgroundColor: typeInfo.color + "20" }}>
            <Text className="text-xs text-muted mb-1">Дата</Text>
            <Text className="text-xl font-bold text-foreground mb-3 capitalize">{dateStr}</Text>

            <View className="flex-row items-center">
              <View
                className="w-4 h-4 rounded"
                style={{ backgroundColor: typeInfo.color }}
              />
              <Text className="text-sm font-semibold text-foreground ml-2">{typeInfo.label}</Text>
            </View>
            <Text className="text-xs text-muted mt-2">{typeInfo.description}</Text>
          </View>

          {/* Статистика рабочего времени */}
          {dayType === "workday" && (
            <View className="mb-6 p-4 rounded-lg" style={{ backgroundColor: colors.surface }}>
              <Text className="text-sm font-semibold text-foreground mb-4">Статистика рабочего времени</Text>

              <View className="flex-row justify-between mb-4">
                <View className="flex-1 mr-2">
                  <Text className="text-xs text-muted mb-1">Отработано</Text>
                  <Text className="text-2xl font-bold text-success">{formatTime(dayStats.totalWorkTime)}</Text>
                </View>
                <View className="flex-1 ml-2">
                  <Text className="text-xs text-muted mb-1">Перерывы</Text>
                  <Text className="text-2xl font-bold text-warning">{formatTime(dayStats.breakTime)}</Text>
                </View>
              </View>

              <View className="p-3 rounded-lg" style={{ backgroundColor: colors.background }}>
                <Text className="text-xs text-muted">Рабочих сессий: {dayStats.sessionsCount}</Text>
              </View>
            </View>
          )}

          {/* Список сессий */}
          {dayStats.sessions.length > 0 && (
            <View className="mb-6">
              <Text className="text-sm font-semibold text-foreground mb-3">Рабочие сессии</Text>

              {dayStats.sessions.map((session, index) => (
                <View
                  key={index}
                  className="mb-3 p-3 rounded-lg border"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  }}
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-sm font-semibold text-foreground">Сессия {index + 1}</Text>
                    <Text className="text-xs text-muted">{formatTime(session.workDuration || 0)}</Text>
                  </View>

                  {session.startTime && (
                    <Text className="text-xs text-muted mb-1">
                      Начало: {formatDateTime(session.startTime)}
                    </Text>
                  )}
                  {session.endTime && (
                    <Text className="text-xs text-muted mb-1">
                      Конец: {formatDateTime(session.endTime)}
                    </Text>
                  )}
                  {(session.breakDuration || 0) > 0 && (
                    <Text className="text-xs text-muted">
                      Перерыв: {formatTime(session.breakDuration || 0)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Пустое состояние */}
          {dayStats.sessions.length === 0 && dayType === "workday" && (
            <View className="mb-6 p-4 rounded-lg items-center" style={{ backgroundColor: colors.surface }}>
              <Text className="text-sm text-muted">Нет данных о рабочих сессиях</Text>
            </View>
          )}

          {/* Информация */}
          <View className="mb-6 p-4 rounded-lg" style={{ backgroundColor: colors.surface }}>
            <Text className="text-xs text-muted">
              {dayType === "workday"
                ? "Здесь отображается информация о рабочих сессиях и времени, проведенном на работе в этот день."
                : "В этот день рабочие сессии не отслеживаются."}
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
