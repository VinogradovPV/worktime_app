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
  requiresCheck?: number;
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

  const progressPercent = stats.workdays > 0
    ? Math.min(Math.round((stats.workedDays / stats.workdays) * 100), 100)
    : 0;

  const progressColor = progressPercent >= 100 ? colors.success
    : progressPercent >= 75 ? colors.primary
    : progressPercent >= 50 ? colors.warning
    : colors.muted;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
      activeOpacity={0.7}
    >
      {/* Заголовок месяца */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View>
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}>{monthName}</Text>
          <Text style={{ fontSize: 11, color: colors.muted }}>{month}/{year}</Text>
        </View>
        {stats.requiresCheck !== undefined && stats.requiresCheck > 0 && (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
              backgroundColor: colors.warning + "20",
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "600", color: colors.warning }}>
              ⚠ {stats.requiresCheck} на проверке
            </Text>
          </View>
        )}
      </View>

      {/* Статистика в 3 колонки */}
      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 2 }}>Рабочих</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.success }}>{stats.workdays}</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 2 }}>Выходных</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.muted }}>{stats.weekends}</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 2 }}>Праздников</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.error }}>{stats.holidays}</Text>
        </View>
        {stats.vacation > 0 && (
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 2 }}>Отпуск</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.primary }}>{stats.vacation}</Text>
          </View>
        )}
      </View>

      {/* Отработано + прогресс-бар */}
      <View
        style={{
          backgroundColor: colors.background,
          borderRadius: 8,
          padding: 10,
          marginBottom: 10,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
          <Text style={{ fontSize: 11, color: colors.muted }}>
            Отработано {stats.workedDays} из {stats.workdays} дней
          </Text>
          <Text style={{ fontSize: 11, fontWeight: "700", color: progressColor }}>
            {progressPercent}%
          </Text>
        </View>
        <View
          style={{
            height: 5,
            backgroundColor: colors.border,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${progressPercent}%`,
              backgroundColor: progressColor,
              borderRadius: 3,
            }}
          />
        </View>
        {stats.workedHours > 0 && (
          <Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
            {stats.workedHours}ч зафиксировано
          </Text>
        )}
      </View>

      {/* Кнопка открытия месячного вида */}
      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600", textAlign: "center" }}>
        Открыть месячный вид →
      </Text>
    </TouchableOpacity>
  );
}
