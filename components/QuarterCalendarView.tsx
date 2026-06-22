import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";
import { QuarterMonthCard } from "./QuarterMonthCard";
import { getPeriodStats } from "@/lib/storage/reportStatsService";

interface QuarterCalendarViewProps {
  currentYear: number;
  currentQuarter: number;
  onPreviousQuarter: () => void;
  onNextQuarter: () => void;
  holidays: string[];
  vacationPeriods: any[];
  onMonthPress?: (month: number) => void;
}

interface MonthData {
  month: number;
  monthName: string;
  workdays: number;
  weekends: number;
  holidays: number;
  vacation: number;
  workedDays: number;
  workedHours: number;
  requiresCheck: number;
}

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

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
  const [monthStats, setMonthStats] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonthStats();
  }, [currentYear, currentQuarter, holidays, vacationPeriods]);

  const loadMonthStats = async () => {
    setLoading(true);
    try {
      const startMonth = (currentQuarter - 1) * 3;
      const results: MonthData[] = [];

      for (let i = 0; i < 3; i++) {
        const month = startMonth + i;
        const startDate = new Date(currentYear, month, 1);
        const endDate = new Date(currentYear, month + 1, 0);

        const stats = await getPeriodStats(startDate, endDate, currentYear);

        results.push({
          month: month + 1,
          monthName: MONTH_NAMES[month],
          workdays: stats.workdaysInCalendar,
          weekends: stats.weekends,
          holidays: stats.holidays,
          vacation: stats.vacationDays,
          workedDays: stats.workedDays,
          workedHours: Math.round(stats.totalWorkedMs / 3_600_000 * 10) / 10,
          requiresCheck: stats.requiresCheckDays,
        });
      }

      setMonthStats(results);
    } catch (err) {
      console.error("QuarterCalendarView: ошибка загрузки", err);
    } finally {
      setLoading(false);
    }
  };

  const getQuarterLabel = () => `Q${currentQuarter} ${currentYear}`;

  const totalStats = monthStats.reduce(
    (acc, m) => ({
      workdays: acc.workdays + m.workdays,
      weekends: acc.weekends + m.weekends,
      holidays: acc.holidays + m.holidays,
      vacation: acc.vacation + m.vacation,
      workedDays: acc.workedDays + m.workedDays,
      workedHours: acc.workedHours + m.workedHours,
      requiresCheck: acc.requiresCheck + m.requiresCheck,
    }),
    { workdays: 0, weekends: 0, holidays: 0, vacation: 0, workedDays: 0, workedHours: 0, requiresCheck: 0 }
  );

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
        {loading ? (
          <View style={{ padding: 32, alignItems: "center" }}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Загрузка данных...</Text>
          </View>
        ) : (
          monthStats.map((month) => (
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
                requiresCheck: month.requiresCheck,
              }}
              onPress={() => onMonthPress?.(month.month)}
            />
          ))
        )}
      </View>

      {/* Объединённая статистика квартала */}
      <View
        className="mx-4 p-4 rounded-xl mb-6 border"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <Text className="text-sm font-semibold text-foreground mb-4">Статистика квартала</Text>
        <View className="flex-row flex-wrap gap-y-4">
          <View className="items-center" style={{ width: "25%" }}>
            <Text className="text-xs text-muted mb-1 text-center">Рабочих{"\n"}дней</Text>
            <Text className="text-xl font-bold text-success">{totalStats.workdays}</Text>
          </View>
          <View className="items-center" style={{ width: "25%" }}>
            <Text className="text-xs text-muted mb-1 text-center">Выходных</Text>
            <Text className="text-xl font-bold text-muted">{totalStats.weekends}</Text>
          </View>
          <View className="items-center" style={{ width: "25%" }}>
            <Text className="text-xs text-muted mb-1 text-center">Праздников</Text>
            <Text className="text-xl font-bold text-error">{totalStats.holidays}</Text>
          </View>
          <View className="items-center" style={{ width: "25%" }}>
            <Text className="text-xs text-muted mb-1 text-center">Отработано{"\n"}дней</Text>
            <Text className="text-xl font-bold text-primary">{totalStats.workedDays}</Text>
          </View>
          <View className="items-center" style={{ width: "25%" }}>
            <Text className="text-xs text-muted mb-1 text-center">Часов</Text>
            <Text className="text-xl font-bold text-foreground">{totalStats.workedHours}ч</Text>
          </View>
          {totalStats.vacation > 0 && (
            <View className="items-center" style={{ width: "25%" }}>
              <Text className="text-xs text-muted mb-1 text-center">Отпусков</Text>
              <Text className="text-xl font-bold text-primary">{totalStats.vacation}</Text>
            </View>
          )}
          {totalStats.requiresCheck > 0 && (
            <View className="items-center" style={{ width: "25%" }}>
              <Text className="text-xs text-muted mb-1 text-center">Требует{"\n"}проверки</Text>
              <Text className="text-xl font-bold text-warning">{totalStats.requiresCheck}</Text>
            </View>
          )}
        </View>

        {/* Прогресс-бар квартала */}
        {totalStats.workdays > 0 && (
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 11, color: colors.muted }}>
                Отработано {totalStats.workedDays} из {totalStats.workdays} рабочих дней
              </Text>
              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "600" }}>
                {Math.round((totalStats.workedDays / totalStats.workdays) * 100)}%
              </Text>
            </View>
            <View
              style={{
                height: 6,
                backgroundColor: colors.border,
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${Math.min((totalStats.workedDays / totalStats.workdays) * 100, 100)}%`,
                  backgroundColor: colors.primary,
                  borderRadius: 3,
                }}
              />
            </View>
          </View>
        )}
      </View>

      {/* Компактная легенда */}
      <View
        className="mx-4 p-4 rounded-xl mb-6 border"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <Text className="text-sm font-semibold text-foreground mb-3">Легенда</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[
            { color: colors.success, label: "Рабочий день" },
            { color: colors.muted, label: "Выходной" },
            { color: colors.error, label: "Праздник" },
            { color: colors.primary, label: "Отпуск" },
            { color: colors.warning, label: "Требует проверки" },
          ].map(({ color, label }) => (
            <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginRight: 8 }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: color + "30",
                  borderWidth: 1,
                  borderColor: color,
                }}
              />
              <Text style={{ fontSize: 11, color: colors.foreground }}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
