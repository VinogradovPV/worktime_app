import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";

interface MonthStats {
  month: number;
  monthName: string;
  workdays: number;
  holidays: number;
  weekends: number;
  vacationDays: number;
}

interface YearCalendarViewProps {
  currentYear: number;
  onPreviousYear: () => void;
  onNextYear: () => void;
  holidays: string[];
  vacationPeriods: any[];
  onMonthPress?: (month: number) => void;
}

export function YearCalendarView({
  currentYear,
  onPreviousYear,
  onNextYear,
  holidays,
  vacationPeriods,
  onMonthPress,
}: YearCalendarViewProps) {
  const colors = useColors();
  const [monthStats, setMonthStats] = useState<MonthStats[]>([]);

  useEffect(() => {
    calculateMonthStats();
  }, [currentYear, holidays, vacationPeriods]);

  const calculateMonthStats = () => {
    const stats: MonthStats[] = [];
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

    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
      let workdays = 0;
      let weekends = 0;
      let holidayCount = 0;
      let vacationDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, month, day);
        const dateStr = formatDate(currentYear, month, day);
        const dayOfWeek = date.getDay();

        // Проверяем выходные
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          weekends++;
        } else if (holidays.includes(dateStr)) {
          holidayCount++;
        } else {
          // Проверяем отпуска
          let isVacation = false;
          for (const period of vacationPeriods) {
            const startDate = new Date(period.startDate);
            const endDate = new Date(period.endDate);
            if (date >= startDate && date <= endDate) {
              vacationDays++;
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
        holidays: holidayCount,
        weekends,
        vacationDays,
      });
    }

    setMonthStats(stats);
  };

  const formatDate = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  const getMonthColor = (stat: MonthStats) => {
    // Цвет зависит от количества рабочих дней
    if (stat.workdays > 20) {
      return colors.success;
    } else if (stat.workdays > 15) {
      return colors.primary;
    } else if (stat.workdays > 10) {
      return colors.warning;
    } else {
      return colors.error;
    }
  };

  const getTotalStats = () => {
    return {
      workdays: monthStats.reduce((sum, m) => sum + m.workdays, 0),
      holidays: monthStats.reduce((sum, m) => sum + m.holidays, 0),
      weekends: monthStats.reduce((sum, m) => sum + m.weekends, 0),
      vacationDays: monthStats.reduce((sum, m) => sum + m.vacationDays, 0),
    };
  };

  const totalStats = getTotalStats();

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Навигация по годам */}
      <View className="flex-row justify-between items-center mb-6 px-4 pt-4">
        <TouchableOpacity onPress={onPreviousYear}>
          <Text className="text-2xl text-primary font-bold">←</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-foreground">{currentYear}</Text>
        <TouchableOpacity onPress={onNextYear}>
          <Text className="text-2xl text-primary font-bold">→</Text>
        </TouchableOpacity>
      </View>

      {/* Общая статистика */}
      <View className="mx-4 mb-6 p-4 rounded-lg" style={{ backgroundColor: colors.surface }}>
        <Text className="text-sm font-semibold text-foreground mb-4">Статистика за год</Text>
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-xs text-muted mb-1">Рабочих дней</Text>
            <Text className="text-2xl font-bold text-success">{totalStats.workdays}</Text>
          </View>
          <View className="items-center">
            <Text className="text-xs text-muted mb-1">Выходных</Text>
            <Text className="text-2xl font-bold text-muted">{totalStats.weekends}</Text>
          </View>
          <View className="items-center">
            <Text className="text-xs text-muted mb-1">Праздников</Text>
            <Text className="text-2xl font-bold text-error">{totalStats.holidays}</Text>
          </View>
          <View className="items-center">
            <Text className="text-xs text-muted mb-1">Отпусков</Text>
            <Text className="text-2xl font-bold text-primary">{totalStats.vacationDays}</Text>
          </View>
        </View>
      </View>

      {/* Месячные карточки */}
      <View className="px-4 gap-3 pb-6">
        {monthStats.map((stat, index) => {
          const monthColor = getMonthColor(stat);
          return (
            <TouchableOpacity
              key={index}
              onPress={() => onMonthPress?.(stat.month)}
              className="rounded-lg p-4 border"
              style={{
                backgroundColor: monthColor + "15",
                borderColor: monthColor,
                borderWidth: 1.5,
              }}
            >
              <View className="flex-row justify-between items-start mb-3">
                <View>
                  <Text className="text-sm font-semibold text-muted">Месяц {stat.month}</Text>
                  <Text className="text-lg font-bold text-foreground">{stat.monthName}</Text>
                </View>
                <View
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: monthColor + "30" }}
                >
                  <Text className="text-xs font-semibold" style={{ color: monthColor }}>
                    {stat.workdays} дн.
                  </Text>
                </View>
              </View>

              {/* Статистика месяца */}
              <View className="flex-row justify-between">
                <View>
                  <Text className="text-xs text-muted">Рабочих дней</Text>
                  <Text className="text-sm font-semibold text-success">{stat.workdays}</Text>
                </View>
                <View>
                  <Text className="text-xs text-muted">Выходных</Text>
                  <Text className="text-sm font-semibold text-muted">{stat.weekends}</Text>
                </View>
                <View>
                  <Text className="text-xs text-muted">Праздников</Text>
                  <Text className="text-sm font-semibold text-error">{stat.holidays}</Text>
                </View>
                {stat.vacationDays > 0 && (
                  <View>
                    <Text className="text-xs text-muted">Отпусков</Text>
                    <Text className="text-sm font-semibold text-primary">{stat.vacationDays}</Text>
                  </View>
                )}
              </View>

              {/* Визуальная полоса прогресса */}
              <View className="mt-3 h-1 flex-row rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
                <View
                  className="h-full"
                  style={{
                    width: `${(stat.workdays / (stat.workdays + stat.weekends + stat.holidays)) * 100}%`,
                    backgroundColor: colors.success,
                  }}
                />
                <View
                  className="h-full"
                  style={{
                    width: `${(stat.weekends / (stat.workdays + stat.weekends + stat.holidays)) * 100}%`,
                    backgroundColor: colors.muted,
                  }}
                />
                <View
                  className="h-full"
                  style={{
                    width: `${(stat.holidays / (stat.workdays + stat.weekends + stat.holidays)) * 100}%`,
                    backgroundColor: colors.error,
                  }}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
