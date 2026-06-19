import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

interface DayStatus {
  date: Date;
  status: "work" | "anomaly" | "rest" | "vacation" | "sick";
  workTime?: number; // в часах
}

export default function CalendarScreen() {
  const colors = useColors();
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getDayStatus = (day: number): DayStatus => {
    // Пример данных - в реальном приложении будут загружаться из БД
    const status: DayStatus = {
      date: new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
      status: day % 7 === 0 ? "rest" : "work",
      workTime: day % 7 === 0 ? 0 : 8 + Math.random() * 2,
    };

    if (day % 15 === 0) status.status = "vacation";
    if (day % 20 === 0) status.status = "anomaly";

    return status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "work":
        return colors.success;
      case "anomaly":
        return colors.warning;
      case "rest":
        return colors.muted;
      case "vacation":
        return colors.primary;
      case "sick":
        return colors.error;
      default:
        return colors.muted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "work":
        return "Работа";
      case "anomaly":
        return "Аномалия";
      case "rest":
        return "Выходной";
      case "vacation":
        return "Отпуск";
      case "sick":
        return "Больничный";
      default:
        return "Неизвестно";
    }
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const monthName = currentDate.toLocaleString("ru-RU", { month: "long", year: "numeric" });

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  return (
    <ScreenContainer className="p-4">
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={previousMonth}>
          <Text className="text-2xl text-primary font-bold">←</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-foreground capitalize">{monthName}</Text>
        <TouchableOpacity onPress={nextMonth}>
          <Text className="text-2xl text-primary font-bold">→</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* День недели */}
        <View className="flex-row mb-2">
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day, index) => (
            <View key={index} className="flex-1 items-center py-2">
              <Text className="text-xs font-semibold text-muted">{day}</Text>
            </View>
          ))}
        </View>

        {/* Календарь */}
        <View className="flex-row flex-wrap">
          {/* Пустые дни в начале месяца */}
          {emptyDays.map((_, index) => (
            <View key={`empty-${index}`} className="w-1/7 aspect-square" />
          ))}

          {/* Дни месяца */}
          {days.map((day) => {
            const dayStatus = getDayStatus(day);
            const statusColor = getStatusColor(dayStatus.status);

            return (
              <TouchableOpacity
                key={day}
                className="w-1/7 aspect-square items-center justify-center rounded-lg mb-1"
                style={{
                  backgroundColor: statusColor + "20",
                  borderWidth: 1,
                  borderColor: statusColor,
                }}
              >
                <View className="items-center">
                  <Text className="text-sm font-semibold text-foreground">{day}</Text>
                  {dayStatus.workTime !== undefined && dayStatus.status === "work" && (
                    <Text className="text-xs text-muted mt-0.5">
                      {dayStatus.workTime.toFixed(1)}ч
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Легенда */}
        <View className="mt-8 p-4 bg-surface rounded-lg border border-border">
          <Text className="text-sm font-semibold text-foreground mb-3">Легенда</Text>
          {[
            { status: "work", label: "Рабочий день" },
            { status: "anomaly", label: "Аномалия" },
            { status: "rest", label: "Выходной" },
            { status: "vacation", label: "Отпуск" },
            { status: "sick", label: "Больничный" },
          ].map(({ status, label }) => (
            <View key={status} className="flex-row items-center mb-2">
              <View
                className="w-4 h-4 rounded"
                style={{ backgroundColor: getStatusColor(status) }}
              />
              <Text className="text-xs text-muted ml-2">{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
