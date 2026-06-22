import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { getWorkDay, saveWorkDay } from "@/lib/storage/workdayService";
import { calculateWorkDayStats, formatTime, formatTimeShort } from "@/lib/storage/workdayStatsService";
import { useState, useEffect } from "react";
import { WorkDay } from "@/shared/types/workday";
import { WorkDayEventEditor } from "@/components/WorkDayEventEditor";

interface DayDetailModalProps {
  visible: boolean;
  date: Date | null;
  dayType: "weekend" | "holiday" | "vacation" | "workday";
  vacationType?: "vacation" | "sick_leave" | "unpaid_leave";
  onClose: () => void;
}

export function DayDetailModal({ visible, date, dayType, vacationType, onClose }: DayDetailModalProps) {
  const colors = useColors();
  const [workDay, setWorkDay] = useState<WorkDay | null>(null);
  const [dayStats, setDayStats] = useState({
    totalWorkTime: 0,
    breakTime: 0,
    temporaryExitTime: 0,
    work95Time: 0,
    eventsCount: 0,
  });
  const [editorVisible, setEditorVisible] = useState(false);

  useEffect(() => {
    if (visible && date) {
      calculateDayStats();
    }
  }, [visible, date]);

  const calculateDayStats = async () => {
    if (!date) return;

    const dateStr = formatDate(date.getFullYear(), date.getMonth(), date.getDate());
    try {
      const day = await getWorkDay(dateStr);
      setWorkDay(day);

      if (day) {
        const stats = calculateWorkDayStats(day);
        setDayStats({
          totalWorkTime: stats.totalWorkMs,
          breakTime: stats.totalBreakMs,
          temporaryExitTime: stats.totalTemporaryExitMs,
          work95Time: stats.work95Ms,
          eventsCount: day.events.length,
        });
      } else {
        setDayStats({
          totalWorkTime: 0,
          breakTime: 0,
          temporaryExitTime: 0,
          work95Time: 0,
          eventsCount: 0,
        });
      }
    } catch (error) {
      console.error("Ошибка при загрузке данных дня:", error);
    }
  };

  const handleSaveWorkDay = async (updatedWorkDay: WorkDay) => {
    try {
      await saveWorkDay(updatedWorkDay);
      setWorkDay(updatedWorkDay);
      const stats = calculateWorkDayStats(updatedWorkDay);
      setDayStats({
        totalWorkTime: stats.totalWorkMs,
        breakTime: stats.totalBreakMs,
        temporaryExitTime: stats.totalTemporaryExitMs,
        work95Time: stats.work95Ms,
        eventsCount: updatedWorkDay.events.length,
      });
    } catch (error) {
      console.error("Ошибка при сохранении рабочего дня:", error);
      throw error;
    }
  };

  const formatDate = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const formatDateTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  const getEventTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      work_start: "Начало работы",
      work_end: "Конец работы",
      break_start: "Начало перерыва",
      break_end: "Конец перерыва",
      temporary_exit_start: "Начало выхода",
      temporary_exit_end: "Конец выхода",
    };
    return typeMap[type] || type;
  };

  const getEventTypeColor = (type: string): string => {
    switch (type) {
      case "work_start":
      case "work_end":
        return colors.success;
      case "break_start":
      case "break_end":
        return colors.warning;
      case "temporary_exit_start":
      case "temporary_exit_end":
        return "#F97316"; // orange
      default:
        return colors.foreground;
    }
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
    <>
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
                    <Text className="text-2xl font-bold text-success">{formatTimeShort(dayStats.totalWorkTime)}</Text>
                  </View>
                  <View className="flex-1 mx-1">
                    <Text className="text-xs text-muted mb-1">95% норма</Text>
                    <Text className="text-2xl font-bold text-primary">{formatTimeShort(dayStats.work95Time)}</Text>
                  </View>
                  <View className="flex-1 ml-2">
                    <Text className="text-xs text-muted mb-1">Перерывы</Text>
                    <Text className="text-2xl font-bold text-warning">{formatTimeShort(dayStats.breakTime)}</Text>
                  </View>
                </View>

                {dayStats.temporaryExitTime > 0 && (
                  <View className="mb-4 p-3 rounded-lg" style={{ backgroundColor: colors.background }}>
                    <Text className="text-xs text-muted mb-1">Временные выходы</Text>
                    <Text className="text-lg font-bold" style={{ color: "#F97316" }}>
                      {formatTimeShort(dayStats.temporaryExitTime)}
                    </Text>
                  </View>
                )}

                <View className="p-3 rounded-lg" style={{ backgroundColor: colors.background }}>
                  <Text className="text-xs text-muted">Событий: {dayStats.eventsCount}</Text>
                </View>
              </View>
            )}

            {/* Список событий */}
            {workDay && workDay.events.length > 0 && (
              <View className="mb-6">
                <Text className="text-sm font-semibold text-foreground mb-3">История событий</Text>

                {workDay.events.map((event, index) => (
                  <View
                    key={event.id}
                    className="mb-3 p-3 rounded-lg border"
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    }}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-foreground">
                          {index + 1}. {getEventTypeLabel(event.type)}
                        </Text>
                      </View>
                      <Text className="text-xs text-muted">{formatDateTime(event.timestamp)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Пустое состояние */}
            {workDay && workDay.events.length === 0 && dayType === "workday" && (
              <View className="mb-6 p-4 rounded-lg items-center" style={{ backgroundColor: colors.surface }}>
                <Text className="text-sm text-muted">Нет данных о рабочих событиях</Text>
              </View>
            )}

            {/* Информация */}
            <View className="mb-6 p-4 rounded-lg" style={{ backgroundColor: colors.surface }}>
              <Text className="text-xs text-muted">
                {dayType === "workday"
                  ? "Здесь отображается информация о рабочих событиях и времени, проведенном на работе в этот день."
                  : "В этот день рабочие события не отслеживаются."}
              </Text>
            </View>
          </ScrollView>

          {/* Кнопка редактирования событий (только для рабочих дней) */}
          {dayType === "workday" && workDay && (
            <View className="px-4 py-4 border-t" style={{ borderTopColor: colors.border }}>
              <TouchableOpacity
                onPress={() => setEditorVisible(true)}
                className="py-3 rounded-lg items-center"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="text-background font-semibold">✏️ Редактировать события</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Редактор событий рабочего дня */}
      {workDay && (
        <WorkDayEventEditor
          visible={editorVisible}
          workDay={workDay}
          onClose={() => setEditorVisible(false)}
          onSave={async (updated) => {
            await handleSaveWorkDay(updated);
            setEditorVisible(false);
          }}
        />
      )}
    </>
  );
}
