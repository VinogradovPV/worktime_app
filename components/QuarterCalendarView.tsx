import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";
import { QuarterMonthCard } from "./QuarterMonthCard";

interface QuarterCalendarViewProps {
  currentYear: number;
  currentQuarter: number;
  onPreviousQuarter: () => void;
  onNextQuarter: () => void;
  holidays: string[];
  vacationPeriods: any[];
  onMonthPress?: (month: number) => void;
}

export function QuarterCalendarView({
  currentYear,
  currentQuarter,
  onPreviousQuarter,
  onNextQuarter,
  holidays,
  vacationPeriods,
  onMonthPress,
}: QuarterCalendarViewProps) {
  const colors = useColors();
  const [monthStats, setMonthStats] = useState<any[]>([]);

  useEffect(() => {
    calculateMonthStats();
  }, [currentYear, currentQuarter, holidays, vacationPeriods]);

  const calculateMonthStats = () => {
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
    const stats = [];

    for (let i = 0; i < 3; i++) {
      const month = startMonth + i;
      const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
      let workdays = 0;
      let weekends = 0;
      let holidays_count = 0;
      let vacation_days = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, month, day);
        const dateStr = formatDate(currentYear, month, day);
        const dayOfWeek = date.getDay();

        if (dayOfWeek === 0 || dayOfWeek === 6) {
          weekends++;
        } else if (holidays.includes(dateStr)) {
          holidays_count++;
        } else {
          let isVacation = false;
          for (const period of vacationPeriods) {
            const startDate = new Date(period.startDate);
            const endDate = new Date(period.endDate);
            if (date >= startDate && date <= endDate) {
              vacation_days++;
              isVacation = true;
              break;
            }
          }
          if (!isVacation) {
            workdays++;
          }
        }
      }

      stats.push({
        month: month + 1,
        monthName: monthNames[month],
        workdays,
        weekends,
        holidays: holidays_count,
        vacation: vacation_days,
        workedDays: 0, // TODO: получить из workdayService
        workedHours: 0, // TODO: получить из workdayService
      });
    }

    setMonthStats(stats);
  };

  const formatDate = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const getQuarterLabel = () => {
    return `Q${currentQuarter} ${currentYear}`;
  };

  const getTotalStats = () => {
    return monthStats.reduce(
      (acc, month) => ({
        workdays: acc.workdays + month.workdays,
        weekends: acc.weekends + month.weekends,
        holidays: acc.holidays + month.holidays,
        vacation: acc.vacation + month.vacation,
      }),
      { workdays: 0, weekends: 0, holidays: 0, vacation: 0 }
    );
  };

  const totalStats = getTotalStats();

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Навигация по кварталам */}
      <View className="flex-row justify-between items-center mb-6 px-4 pt-4">
        <TouchableOpacity onPress={onPreviousQuarter} className="p-2">
          <Text className="text-2xl text-primary font-bold">←</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-foreground">{getQuarterLabel()}</Text>
        <TouchableOpacity onPress={onNextQuarter} className="p-2">
          <Text className="text-2xl text-primary font-bold">→</Text>
        </TouchableOpacity>
      </View>

      {/* Карточки месяцев */}
      <View className="px-4 mb-6">
        {monthStats.map((month) => (
          <QuarterMonthCard
            key={month.month}
            monthName={month.monthName}
            month={month.month}
            year={currentYear}
            stats={{
              workdays: month.workdays,
              weekends: month.weekends,
              holidays: month.holidays,
              vacation: month.vacation,
              workedDays: month.workedDays,
              workedHours: month.workedHours,
            }}
            onPress={() => onMonthPress?.(month.month)}
          />
        ))}
      </View>

      {/* Объединённая статистика квартала */}
      <View className="mx-4 p-4 rounded-lg mb-6 border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <Text className="text-sm font-semibold text-foreground mb-4">Статистика квартала</Text>
        <View className="flex-row justify-between">
          <View className="items-center flex-1">
            <Text className="text-xs text-muted mb-1">Рабочих дней</Text>
            <Text className="text-xl font-bold text-success">{totalStats.workdays}</Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-xs text-muted mb-1">Выходных</Text>
            <Text className="text-xl font-bold text-muted">{totalStats.weekends}</Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-xs text-muted mb-1">Праздников</Text>
            <Text className="text-xl font-bold text-error">{totalStats.holidays}</Text>
          </View>
          {totalStats.vacation > 0 && (
            <View className="items-center flex-1">
              <Text className="text-xs text-muted mb-1">Отпусков</Text>
              <Text className="text-xl font-bold text-primary">{totalStats.vacation}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Компактная легенда */}
      <View className="mx-4 p-4 rounded-lg mb-6 border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <Text className="text-sm font-semibold text-foreground mb-3">Легенда</Text>
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <View
              className="w-4 h-4 rounded-sm"
              style={{
                backgroundColor: colors.success + "30",
                borderWidth: 1,
                borderColor: colors.success,
              }}
            />
            <Text className="text-xs text-foreground">Рабочий день</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View
              className="w-4 h-4 rounded-sm"
              style={{
                backgroundColor: colors.muted + "30",
                borderWidth: 1,
                borderColor: colors.muted,
              }}
            />
            <Text className="text-xs text-foreground">Выходной</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View
              className="w-4 h-4 rounded-sm"
              style={{
                backgroundColor: colors.error + "30",
                borderWidth: 1,
                borderColor: colors.error,
              }}
            />
            <Text className="text-xs text-foreground">Праздник</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View
              className="w-4 h-4 rounded-sm"
              style={{
                backgroundColor: colors.primary + "30",
                borderWidth: 1,
                borderColor: colors.primary,
              }}
            />
            <Text className="text-xs text-foreground">Отпуск</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
