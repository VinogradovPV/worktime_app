import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";

interface QuarterMonth {
  month: number;
  monthName: string;
  days: QuarterDay[];
}

interface QuarterDay {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  type: "weekend" | "holiday" | "vacation" | "workday";
}

interface QuarterCalendarViewProps {
  currentYear: number;
  currentQuarter: number; // 1, 2, 3, 4
  onPreviousQuarter: () => void;
  onNextQuarter: () => void;
  holidays: string[];
  vacationPeriods: any[];
  onDayPress?: (date: Date) => void;
}

export function QuarterCalendarView({
  currentYear,
  currentQuarter,
  onPreviousQuarter,
  onNextQuarter,
  holidays,
  vacationPeriods,
  onDayPress,
}: QuarterCalendarViewProps) {
  const colors = useColors();
  const [quarterMonths, setQuarterMonths] = useState<QuarterMonth[]>([]);

  useEffect(() => {
    generateQuarterData();
  }, [currentYear, currentQuarter, holidays, vacationPeriods]);

  const generateQuarterData = () => {
    const monthNames = [
      "Январь",
      "Февраль",
      "Март",
      "Апрель",
      "Май",
      "Июнь",
      "Июль",
      "Август",
      "Сентябрь",
      "Октябрь",
      "Ноябрь",
      "Декабрь",
    ];

    const startMonth = (currentQuarter - 1) * 3;
    const months: QuarterMonth[] = [];

    for (let i = 0; i < 3; i++) {
      const month = startMonth + i;
      const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
      const days: QuarterDay[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, month, day);
        const dateStr = formatDate(currentYear, month, day);
        const dayOfWeek = date.getDay();

        let dayType: "weekend" | "holiday" | "vacation" | "workday" = "workday";

        // Проверяем выходные
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          dayType = "weekend";
        } else if (holidays.includes(dateStr)) {
          dayType = "holiday";
        } else {
          // Проверяем отпуска
          for (const period of vacationPeriods) {
            const startDate = new Date(period.startDate);
            const endDate = new Date(period.endDate);
            if (date >= startDate && date <= endDate) {
              dayType = "vacation";
              break;
            }
          }
        }

        days.push({
          date: dateStr,
          dayOfMonth: day,
          type: dayType,
        });
      }

      months.push({
        month: month + 1,
        monthName: monthNames[month],
        days,
      });
    }

    setQuarterMonths(months);
  };

  const formatDate = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const getDayColor = (dayType: string) => {
    switch (dayType) {
      case "weekend":
        return colors.muted + "30";
      case "holiday":
        return colors.error + "30";
      case "vacation":
        return colors.primary + "30";
      case "workday":
      default:
        return colors.success + "30";
    }
  };

  const getDayBorder = (dayType: string) => {
    switch (dayType) {
      case "weekend":
        return colors.muted;
      case "holiday":
        return colors.error;
      case "vacation":
        return colors.primary;
      case "workday":
      default:
        return colors.success;
    }
  };

  const getQuarterLabel = () => {
    return `Q${currentQuarter} ${currentYear}`;
  };

  const getMonthDayLetters = () => {
    return ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  };

  const getFirstDayOfMonth = (month: number) => {
    return new Date(currentYear, month, 1).getDay();
  };

  const renderMonthGrid = (quarterMonth: QuarterMonth) => {
    const firstDay = getFirstDayOfMonth(quarterMonth.month - 1);
    const dayLetters = getMonthDayLetters();
    const emptyDays = Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }, (_, i) => i);

    return (
      <View key={quarterMonth.month} className="flex-1 mx-1">
        {/* Название месяца */}
        <Text className="text-xs font-semibold text-foreground text-center mb-2">{quarterMonth.monthName}</Text>

        {/* Дни недели */}
        <View className="flex-row mb-1">
          {dayLetters.map((day, index) => (
            <View key={index} className="flex-1 items-center">
              <Text className="text-xs font-semibold text-muted">{day}</Text>
            </View>
          ))}
        </View>

        {/* Дни месяца */}
        <View className="flex-row flex-wrap">
          {/* Пустые дни */}
          {emptyDays.map((_, index) => (
            <View key={`empty-${index}`} className="w-1/7 aspect-square" />
          ))}

          {/* Дни месяца */}
          {quarterMonth.days.map((day, index) => (
            <TouchableOpacity
              key={index}
              className="w-1/7 aspect-square items-center justify-center rounded-sm mb-0.5"
              style={{
                backgroundColor: getDayColor(day.type),
                borderWidth: 0.5,
                borderColor: getDayBorder(day.type),
              }}
              onPress={() => onDayPress?.(new Date(day.date))}
            >
              <Text className="text-xs font-semibold text-foreground">{day.dayOfMonth}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const getQuarterStats = () => {
    let workdays = 0;
    let weekends = 0;
    let holidays_count = 0;
    let vacation_days = 0;

    quarterMonths.forEach((month) => {
      month.days.forEach((day) => {
        switch (day.type) {
          case "workday":
            workdays++;
            break;
          case "weekend":
            weekends++;
            break;
          case "holiday":
            holidays_count++;
            break;
          case "vacation":
            vacation_days++;
            break;
        }
      });
    });

    return { workdays, weekends, holidays: holidays_count, vacation: vacation_days };
  };

  const stats = getQuarterStats();

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Навигация по кварталам */}
      <View className="flex-row justify-between items-center mb-6 px-4 pt-4">
        <TouchableOpacity onPress={onPreviousQuarter}>
          <Text className="text-2xl text-primary font-bold">←</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-foreground">{getQuarterLabel()}</Text>
        <TouchableOpacity onPress={onNextQuarter}>
          <Text className="text-2xl text-primary font-bold">→</Text>
        </TouchableOpacity>
      </View>

      {/* Три месячные сетки */}
      <View className="px-4 mb-6 flex-row justify-between">{quarterMonths.map((month) => renderMonthGrid(month))}</View>

      {/* Статистика квартала */}
      <View className="mx-4 p-4 rounded-lg" style={{ backgroundColor: colors.surface }}>
        <Text className="text-sm font-semibold text-foreground mb-4">Статистика квартала</Text>
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-xs text-muted mb-1">Рабочих дней</Text>
            <Text className="text-2xl font-bold text-success">{stats.workdays}</Text>
          </View>
          <View className="items-center">
            <Text className="text-xs text-muted mb-1">Выходных</Text>
            <Text className="text-2xl font-bold text-muted">{stats.weekends}</Text>
          </View>
          <View className="items-center">
            <Text className="text-xs text-muted mb-1">Праздников</Text>
            <Text className="text-2xl font-bold text-error">{stats.holidays}</Text>
          </View>
          {stats.vacation > 0 && (
            <View className="items-center">
              <Text className="text-xs text-muted mb-1">Отпусков</Text>
              <Text className="text-2xl font-bold text-primary">{stats.vacation}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Легенда */}
      <View className="mt-6 mx-4 mb-6 p-4 rounded-lg border border-border" style={{ backgroundColor: colors.surface }}>
        <Text className="text-sm font-semibold text-foreground mb-3">Легенда</Text>
        <View className="flex-row flex-wrap gap-3">
          <View className="flex-row items-center">
            <View
              className="w-4 h-4 rounded-sm"
              style={{
                backgroundColor: colors.success + "30",
                borderWidth: 0.5,
                borderColor: colors.success,
              }}
            />
            <Text className="text-xs text-foreground ml-2">Рабочий</Text>
          </View>
          <View className="flex-row items-center">
            <View
              className="w-4 h-4 rounded-sm"
              style={{
                backgroundColor: colors.muted + "30",
                borderWidth: 0.5,
                borderColor: colors.muted,
              }}
            />
            <Text className="text-xs text-foreground ml-2">Выходной</Text>
          </View>
          <View className="flex-row items-center">
            <View
              className="w-4 h-4 rounded-sm"
              style={{
                backgroundColor: colors.error + "30",
                borderWidth: 0.5,
                borderColor: colors.error,
              }}
            />
            <Text className="text-xs text-foreground ml-2">Праздник</Text>
          </View>
          <View className="flex-row items-center">
            <View
              className="w-4 h-4 rounded-sm"
              style={{
                backgroundColor: colors.primary + "30",
                borderWidth: 0.5,
                borderColor: colors.primary,
              }}
            />
            <Text className="text-xs text-foreground ml-2">Отпуск</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
