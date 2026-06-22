import { View, Text, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { ReportPeriodStats, formatWorkedTime, formatWorkedHours } from "@/lib/storage/reportStatsService";

interface CalendarStatsCardsProps {
  stats: ReportPeriodStats;
  mode: "month" | "week" | "quarter" | "year";
}

export function CalendarStatsCards({ stats, mode }: CalendarStatsCardsProps) {
  const colors = useColors();

  const getModeLabel = (): string => {
    switch (mode) {
      case "year":
        return "года";
      case "quarter":
        return "квартала";
      case "month":
        return "месяца";
      case "week":
        return "недели";
      default:
        return "периода";
    }
  };

  const StatCard = ({ label, value, color, subtext }: { label: string; value: string; color: string; subtext?: string }) => (
    <View
      className="flex-1 p-3 rounded-lg items-center justify-center min-h-24"
      style={{ backgroundColor: color + "15", borderWidth: 1, borderColor: color }}
    >
      <Text className="text-xs text-muted mb-1">{label}</Text>
      <Text className="text-xl font-bold" style={{ color }}>
        {value}
      </Text>
      {subtext && <Text className="text-xs text-muted mt-1">{subtext}</Text>}
    </View>
  );

  return (
    <View className="px-4 py-4">
      <Text className="text-sm font-semibold text-foreground mb-3">Статистика {getModeLabel()}</Text>

      {/* Главная карточка - Отработано */}
      <View
        className="mb-4 p-4 rounded-lg items-center justify-center"
        style={{
          backgroundColor: colors.success + "20",
          borderWidth: 2,
          borderColor: colors.success,
          minHeight: 100,
        }}
      >
        <Text className="text-xs text-muted mb-2">Всего отработано</Text>
        <Text className="text-3xl font-bold text-success">{formatWorkedHours(stats.totalWorkedMs)}</Text>
        <Text className="text-xs text-muted mt-2">
          {stats.workedDays} из {stats.workdaysInCalendar} дней
        </Text>
      </View>

      {/* Сетка карточек */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        <View className="flex-row gap-2">
          <View className="w-24">
            <StatCard label="Всего дней" value={stats.totalDays.toString()} color={colors.foreground} />
          </View>

          <View className="w-24">
            <StatCard label="Рабочих дней" value={stats.workdaysInCalendar.toString()} color={colors.success} />
          </View>

          <View className="w-24">
            <StatCard label="Отработано" value={stats.workedDays.toString()} color={colors.primary} />
          </View>

          <View className="w-24">
            <StatCard label="Выходных" value={stats.weekends.toString()} color={colors.muted} />
          </View>

          <View className="w-24">
            <StatCard label="Праздников" value={stats.holidays.toString()} color={colors.error} />
          </View>

          {stats.vacationDays > 0 && (
            <View className="w-24">
              <StatCard label="Отпусков" value={stats.vacationDays.toString()} color={colors.warning} />
            </View>
          )}

          {stats.requiresCheckDays > 0 && (
            <View className="w-24">
              <StatCard label="Проверка" value={stats.requiresCheckDays.toString()} color={colors.warning} />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Дополнительная информация */}
      {stats.requiresCheckDays > 0 && (
        <View
          className="p-3 rounded-lg"
          style={{
            backgroundColor: colors.warning + "15",
            borderWidth: 1,
            borderColor: colors.warning,
          }}
        >
          <Text className="text-xs text-warning font-semibold">⚠ {stats.requiresCheckDays} дней требуют проверки</Text>
          <Text className="text-xs text-muted mt-1">
            В эти дни не было зафиксировано рабочих сессий. Пожалуйста, проверьте данные.
          </Text>
        </View>
      )}
    </View>
  );
}
