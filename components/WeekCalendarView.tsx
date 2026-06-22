import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";

interface WeekDay {
  date: Date;
  dayOfMonth: number;
  dayName: string;
  dayOfWeek: string;
  type: "weekend" | "holiday" | "vacation" | "workday";
  vacationType?: "vacation" | "sick_leave" | "unpaid_leave";
  workHours?: number;
  notes?: string;
}

interface WeekCalendarViewProps {
  currentDate: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  holidays: string[];
  vacationPeriods: any[];
  onDayPress?: (date: Date) => void;
}

export function WeekCalendarView({
  currentDate,
  onPreviousWeek,
  onNextWeek,
  holidays,
  vacationPeriods,
  onDayPress,
}: WeekCalendarViewProps) {
  const colors = useColors();
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);

  useEffect(() => {
    generateWeekDays();
  }, [currentDate]);

  const generateWeekDays = () => {
    const days: WeekDay[] = [];
    const dayOfWeek = currentDate.getDay();
    // Начинаем неделю с понедельника (1), если это воскресенье (0), то начинаем с предыдущего понедельника
    const startDate = new Date(currentDate);
    startDate.setDate(currentDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    const fullDayNames = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dayOfWeekNum = date.getDay();

      const dayType = getDayType(date);

      days.push({
        date,
        dayOfMonth: date.getDate(),
        dayName: dayNames[i],
        dayOfWeek: fullDayNames[i],
        type: dayType,
        workHours: dayType === "workday" ? 8 : 0,
      });
    }

    setWeekDays(days);
  };

  const getDayType = (date: Date): "weekend" | "holiday" | "vacation" | "workday" => {
    const dateStr = formatDate(date.getFullYear(), date.getMonth(), date.getDate());
    const dayOfWeek = date.getDay();

    // Проверяем выходные
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return "weekend";
    }

    // Проверяем праздники
    if (holidays.includes(dateStr)) {
      return "holiday";
    }

    // Проверяем отпуска
    for (const period of vacationPeriods) {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      if (date >= startDate && date <= endDate) {
        return "vacation";
      }
    }

    return "workday";
  };

  const formatDate = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const getTypeColor = (dayInfo: WeekDay) => {
    switch (dayInfo.type) {
      case "weekend":
        return { bg: colors.muted + "20", border: colors.muted, label: "Выходной" };
      case "holiday":
        return { bg: colors.error + "20", border: colors.error, label: "Праздник" };
      case "vacation":
        return { bg: colors.primary + "20", border: colors.primary, label: "Отпуск" };
      case "workday":
      default:
        return { bg: colors.success + "20", border: colors.success, label: "Рабочий день" };
    }
  };

  const getWeekRange = () => {
    if (weekDays.length === 0) return "";
    const start = weekDays[0].date;
    const end = weekDays[6].date;
    const startStr = `${start.getDate()} ${getMonthName(start.getMonth())}`;
    const endStr = `${end.getDate()} ${getMonthName(end.getMonth())}`;
    return `${startStr} - ${endStr}`;
  };

  const getMonthName = (month: number): string => {
    const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    return months[month];
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Навигация по неделям */}
      <View className="flex-row justify-between items-center mb-6 px-4 pt-4">
        <TouchableOpacity onPress={onPreviousWeek}>
          <Text className="text-2xl text-primary font-bold">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-foreground">{getWeekRange()}</Text>
        <TouchableOpacity onPress={onNextWeek}>
          <Text className="text-2xl text-primary font-bold">→</Text>
        </TouchableOpacity>
      </View>

      {/* Дни недели */}
      <View className="px-4 gap-3">
        {weekDays.map((day, index) => {
          const typeColor = getTypeColor(day);
          return (
            <TouchableOpacity
              key={index}
              onPress={() => onDayPress?.(day.date)}
              className="rounded-lg p-4 border"
              style={{
                backgroundColor: typeColor.bg,
                borderColor: typeColor.border,
                borderWidth: 1.5,
              }}
            >
              <View className="flex-row justify-between items-start mb-2">
                <View>
                  <Text className="text-sm font-semibold text-muted">{day.dayName}</Text>
                  <Text className="text-lg font-bold text-foreground">{day.dayOfMonth}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs font-medium text-muted">{typeColor.label}</Text>
                  {day.type === "workday" && (
                    <Text className="text-sm font-semibold text-foreground mt-1">{day.workHours}ч</Text>
                  )}
                </View>
              </View>

              {/* Дополнительная информация */}
              <View className="border-t border-border pt-2 mt-2" style={{ borderTopColor: typeColor.border + "40" }}>
                <Text className="text-xs text-muted">
                  {day.type === "workday" && "Рабочий день"}
                  {day.type === "weekend" && "Выходной день"}
                  {day.type === "holiday" && "Праздничный день"}
                  {day.type === "vacation" && "Период отпуска"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Информация о неделе */}
      <View className="mt-6 mx-4 p-4 rounded-lg" style={{ backgroundColor: colors.surface }}>
        <Text className="text-sm font-semibold text-foreground mb-2">Статистика недели</Text>
        <View className="flex-row justify-between">
          <View>
            <Text className="text-xs text-muted">Рабочих дней</Text>
            <Text className="text-lg font-bold text-success">
              {weekDays.filter((d) => d.type === "workday").length}
            </Text>
          </View>
          <View>
            <Text className="text-xs text-muted">Выходных</Text>
            <Text className="text-lg font-bold text-muted">
              {weekDays.filter((d) => d.type === "weekend").length}
            </Text>
          </View>
          <View>
            <Text className="text-xs text-muted">Праздников</Text>
            <Text className="text-lg font-bold text-error">
              {weekDays.filter((d) => d.type === "holiday").length}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
