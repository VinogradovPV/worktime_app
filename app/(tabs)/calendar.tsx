import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { getProductionCalendar, getVacationPeriods } from "@/lib/storage/notificationSettings";

interface DayInfo {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  type: "weekend" | "holiday" | "vacation" | "workday";
  vacationType?: "vacation" | "sick_leave" | "unpaid_leave";
}

export default function CalendarScreen() {
  const colors = useColors();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState<string[]>([]);
  const [vacationPeriods, setVacationPeriods] = useState<any[]>([]);

  useEffect(() => {
    loadCalendarData();
  }, [currentDate]);

  const loadCalendarData = async () => {
    try {
      // Загрузить праздничные дни
      const calendar = await getProductionCalendar(currentDate.getFullYear());
      if (calendar?.holidays) {
        setHolidays(calendar.holidays.map((h) => h.date));
      }

      // Загрузить периоды отпусков
      const periods = await getVacationPeriods();
      setVacationPeriods(periods);
    } catch (error) {
      console.error("Ошибка при загрузке данных календаря:", error);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const isWeekend = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 = воскресенье, 6 = суббота
  };

  const isHoliday = (dateStr: string): boolean => {
    return holidays.includes(dateStr);
  };

  const getVacationType = (dateStr: string): string | null => {
    for (const period of vacationPeriods) {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      const checkDate = new Date(dateStr);

      if (checkDate >= startDate && checkDate <= endDate) {
        return period.type;
      }
    }
    return null;
  };

  const getDayType = (day: number): DayInfo => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);

    let type: "weekend" | "holiday" | "vacation" | "workday" = "workday";
    let vacationType: "vacation" | "sick_leave" | "unpaid_leave" | undefined;

    if (isWeekend(date)) {
      type = "weekend";
    } else if (isHoliday(dateStr)) {
      type = "holiday";
    } else {
      const vType = getVacationType(dateStr);
      if (vType) {
        type = "vacation";
        vacationType = vType as any;
      }
    }

    return {
      date: dateStr,
      dayOfMonth: day,
      type,
      vacationType,
    };
  };

  const getTypeColor = (dayInfo: DayInfo) => {
    switch (dayInfo.type) {
      case "weekend":
        return { bg: colors.muted + "20", border: colors.muted, label: "Выходной" };
      case "holiday":
        return { bg: colors.error + "20", border: colors.error, label: "Праздник" };
      case "vacation":
        if (dayInfo.vacationType === "sick_leave") {
          return { bg: colors.warning + "20", border: colors.warning, label: "Больничный" };
        } else if (dayInfo.vacationType === "unpaid_leave") {
          return { bg: colors.primary + "20", border: colors.primary, label: "Неоплачиваемый отпуск" };
        }
        return { bg: colors.primary + "20", border: colors.primary, label: "Отпуск" };
      case "workday":
      default:
        return { bg: colors.success + "20", border: colors.success, label: "Рабочий день" };
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

      <ScrollView showsVerticalScrollIndicator={false}>
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
            const dayInfo = getDayType(day);
            const colors_info = getTypeColor(dayInfo);

            return (
              <TouchableOpacity
                key={day}
                className="w-1/7 aspect-square items-center justify-center rounded-lg mb-1 mx-0.5"
                style={{
                  backgroundColor: colors_info.bg,
                  borderWidth: 1.5,
                  borderColor: colors_info.border,
                }}
              >
                <View className="items-center justify-center">
                  <Text className="text-sm font-semibold text-foreground">{day}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Легенда */}
        <View className="mt-8 p-4 rounded-lg border border-border" style={{ backgroundColor: colors.surface }}>
          <Text className="text-sm font-semibold text-foreground mb-4">Легенда</Text>

          {/* Рабочий день */}
          <View className="flex-row items-center mb-3">
            <View
              className="w-5 h-5 rounded"
              style={{
                backgroundColor: colors.success + "20",
                borderWidth: 1.5,
                borderColor: colors.success,
              }}
            />
            <Text className="text-xs text-foreground ml-3">Рабочий день</Text>
          </View>

          {/* Выходной */}
          <View className="flex-row items-center mb-3">
            <View
              className="w-5 h-5 rounded"
              style={{
                backgroundColor: colors.muted + "20",
                borderWidth: 1.5,
                borderColor: colors.muted,
              }}
            />
            <Text className="text-xs text-foreground ml-3">Выходной (Сб, Вс)</Text>
          </View>

          {/* Праздничный день */}
          <View className="flex-row items-center mb-3">
            <View
              className="w-5 h-5 rounded"
              style={{
                backgroundColor: colors.error + "20",
                borderWidth: 1.5,
                borderColor: colors.error,
              }}
            />
            <Text className="text-xs text-foreground ml-3">Праздничный день</Text>
          </View>

          {/* Отпуск */}
          <View className="flex-row items-center mb-3">
            <View
              className="w-5 h-5 rounded"
              style={{
                backgroundColor: colors.primary + "20",
                borderWidth: 1.5,
                borderColor: colors.primary,
              }}
            />
            <Text className="text-xs text-foreground ml-3">Отпуск</Text>
          </View>

          {/* Больничный */}
          <View className="flex-row items-center">
            <View
              className="w-5 h-5 rounded"
              style={{
                backgroundColor: colors.warning + "20",
                borderWidth: 1.5,
                borderColor: colors.warning,
              }}
            />
            <Text className="text-xs text-foreground ml-3">Больничный лист</Text>
          </View>
        </View>

        {/* Информация */}
        <View className="mt-6 p-4 rounded-lg" style={{ backgroundColor: colors.surface }}>
          <Text className="text-xs text-muted">
            Календарь показывает выходные дни (суббота и воскресенье), праздничные дни из загруженного производственного календаря и ваши периоды отпусков.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
