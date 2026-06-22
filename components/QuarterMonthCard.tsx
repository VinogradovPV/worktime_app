import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface MonthStats {
  workdays: number;
  weekends: number;
  holidays: number;
  vacation: number;
  workedDays: number;
  workedHours: number;
}

interface QuarterMonthCardProps {
  monthName: string;
  month: number;
  year: number;
  stats: MonthStats;
  onPress: () => void;
}

export function QuarterMonthCard({
  monthName,
  month,
  year,
  stats,
  onPress,
}: QuarterMonthCardProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-lg p-4 mb-3 border"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
      }}
      activeOpacity={0.7}
    >
      {/* Заголовок месяца */}
      <View className="mb-4 pb-3 border-b" style={{ borderColor: colors.border }}>
        <Text className="text-lg font-bold text-foreground">{monthName}</Text>
        <Text className="text-xs text-muted">{month}/{year}</Text>
      </View>

      {/* Статистика месяца в 2 колонки */}
      <View className="flex-row gap-6">
        {/* Левая колонка */}
        <View className="flex-1">
          <View className="mb-3">
            <Text className="text-xs text-muted mb-1">Рабочих дней</Text>
            <Text className="text-lg font-bold text-success">{stats.workdays}</Text>
          </View>
          <View className="mb-3">
            <Text className="text-xs text-muted mb-1">Выходных</Text>
            <Text className="text-lg font-bold text-muted">{stats.weekends}</Text>
          </View>
          <View>
            <Text className="text-xs text-muted mb-1">Праздников</Text>
            <Text className="text-lg font-bold text-error">{stats.holidays}</Text>
          </View>
        </View>

        {/* Правая колонка */}
        <View className="flex-1">
          {stats.vacation > 0 && (
            <View className="mb-3">
              <Text className="text-xs text-muted mb-1">Отпусков</Text>
              <Text className="text-lg font-bold text-primary">{stats.vacation}</Text>
            </View>
          )}
          <View className="mb-3">
            <Text className="text-xs text-muted mb-1">Отработано</Text>
            <Text className="text-lg font-bold text-foreground">{stats.workedDays} дн</Text>
          </View>
          <View>
            <Text className="text-xs text-muted mb-1">Часов</Text>
            <Text className="text-lg font-bold text-foreground">{stats.workedHours}ч</Text>
          </View>
        </View>
      </View>

      {/* Кнопка открытия месячного вида */}
      <View className="mt-4 pt-3 border-t" style={{ borderColor: colors.border }}>
        <Text className="text-xs text-primary font-semibold text-center">
          Открыть месячный вид →
        </Text>
      </View>
    </TouchableOpacity>
  );
}
