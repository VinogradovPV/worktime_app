import { ScrollView, Text, View, TouchableOpacity, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";
import {
  getPeriodStats,
  getDayStatsForPeriod,
  formatWorkedTime,
  formatWorkedHours,
  getPeriodStart,
  getPeriodEnd,
  ReportPeriodStats,
  ReportDayStats,
} from "@/lib/storage/reportStatsService";

export default function ReportsScreen() {
  const colors = useColors();
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month" | "year">("month");
  const [periodStats, setPeriodStats] = useState<ReportPeriodStats | null>(null);
  const [dayStats, setDayStats] = useState<ReportDayStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod, currentDate]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);

      const startDate = getPeriodStart(currentDate, selectedPeriod);
      const endDate = getPeriodEnd(currentDate, selectedPeriod);
      const year = currentDate.getFullYear();

      const stats = await getPeriodStats(startDate, endDate, year);
      const days = await getDayStatsForPeriod(startDate, endDate, year);

      setPeriodStats(stats);
      setDayStats(days);
    } catch (error) {
      console.error("Ошибка при загрузке отчета:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousPeriod = () => {
    const newDate = new Date(currentDate);
    if (selectedPeriod === "day") {
      newDate.setDate(newDate.getDate() - 1);
    } else if (selectedPeriod === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else if (selectedPeriod === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (selectedPeriod === "year") {
      newDate.setFullYear(newDate.getFullYear() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(currentDate);
    if (selectedPeriod === "day") {
      newDate.setDate(newDate.getDate() + 1);
    } else if (selectedPeriod === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else if (selectedPeriod === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (selectedPeriod === "year") {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getPeriodLabel = (): string => {
    const startDate = getPeriodStart(currentDate, selectedPeriod);
    const endDate = getPeriodEnd(currentDate, selectedPeriod);

    if (selectedPeriod === "day") {
      return currentDate.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } else if (selectedPeriod === "week") {
      return `${startDate.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
      })} - ${endDate.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`;
    } else if (selectedPeriod === "month") {
      return currentDate.toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric",
      });
    } else {
      return currentDate.getFullYear().toString();
    }
  };

  const getDayTypeLabel = (dayType: string): string => {
    switch (dayType) {
      case "workday":
        return "Рабочий день";
      case "weekend":
        return "Выходной";
      case "holiday":
        return "Праздник";
      case "vacation":
        return "Отпуск";
      case "shortened_workday":
        return "Сокращенный день";
      default:
        return dayType;
    }
  };

  const getDayTypeColor = (dayType: string): string => {
    switch (dayType) {
      case "workday":
        return colors.success;
      case "weekend":
        return colors.muted;
      case "holiday":
        return colors.error;
      case "vacation":
        return colors.primary;
      case "shortened_workday":
        return colors.warning;
      default:
        return colors.foreground;
    }
  };

  return (
    <ScreenContainer className="p-4">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-3xl font-bold text-foreground">Отчеты</Text>
      </View>

      {/* Выбор периода */}
      <View className="flex-row gap-2 mb-4">
        {(["day", "week", "month", "year"] as const).map((period) => (
          <TouchableOpacity
            key={period}
            className="px-3 py-2 rounded-full"
            style={{
              backgroundColor: selectedPeriod === period ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: selectedPeriod === period ? colors.primary : colors.border,
            }}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: selectedPeriod === period ? "#fff" : colors.foreground }}
            >
              {period === "day" && "День"}
              {period === "week" && "Неделя"}
              {period === "month" && "Месяц"}
              {period === "year" && "Год"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Навигация по периодам */}
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity
          className="px-4 py-2 rounded-lg"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          onPress={handlePreviousPeriod}
        >
          <Text className="text-foreground font-semibold">←</Text>
        </TouchableOpacity>

        <Text className="text-sm font-semibold text-foreground text-center flex-1 mx-4">
          {getPeriodLabel()}
        </Text>

        <TouchableOpacity
          className="px-4 py-2 rounded-lg"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          onPress={handleNextPeriod}
        >
          <Text className="text-foreground font-semibold">→</Text>
        </TouchableOpacity>
      </View>

      {/* Кнопка "Сегодня" */}
      <TouchableOpacity
        className="mb-6 px-4 py-2 rounded-lg self-center"
        style={{ backgroundColor: colors.primary }}
        onPress={handleToday}
      >
        <Text className="text-white font-semibold text-sm">Сегодня</Text>
      </TouchableOpacity>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted">Загрузка данных...</Text>
        </View>
      ) : periodStats ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Основные метрики */}
          <View className="gap-3 mb-6">
            {/* Главная карточка - Отработано */}
            <View
              className="rounded-lg p-4 border"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <Text className="text-xs text-muted mb-1">Всего отработано</Text>
              <Text className="text-3xl font-bold text-foreground">
                {formatWorkedHours(periodStats.totalWorkedMs)}
              </Text>
              <Text className="text-xs text-muted mt-1">часов</Text>
            </View>

            {/* Статистика в 2 колонки */}
            <View className="flex-row gap-3">
              <View
                className="flex-1 rounded-lg p-4 border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <Text className="text-xs text-muted mb-1">Среднее в день</Text>
                <Text className="text-2xl font-bold text-foreground">
                  {formatWorkedHours(periodStats.averageWorkedMs)}
                </Text>
                <Text className="text-xs text-muted mt-1">часов</Text>
              </View>

              <View
                className="flex-1 rounded-lg p-4 border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <Text className="text-xs text-muted mb-1">95% норма</Text>
                <Text className="text-2xl font-bold text-foreground">
                  {formatWorkedHours(periodStats.totalWork95Ms)}
                </Text>
                <Text className="text-xs text-muted mt-1">часов</Text>
              </View>
            </View>

            {/* Вторая строка статистики */}
            <View className="flex-row gap-3">
              <View
                className="flex-1 rounded-lg p-4 border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <Text className="text-xs text-muted mb-1">Перерывы</Text>
                <Text className="text-2xl font-bold text-foreground">
                  {formatWorkedTime(periodStats.totalBreakMs)}
                </Text>
              </View>

              <View
                className="flex-1 rounded-lg p-4 border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <Text className="text-xs text-muted mb-1">Выходы</Text>
                <Text className="text-2xl font-bold text-foreground">
                  {formatWorkedTime(periodStats.totalTemporaryExitMs)}
                </Text>
              </View>
            </View>

            {/* Третья строка статистики */}
            <View className="flex-row gap-3">
              <View
                className="flex-1 rounded-lg p-4 border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <Text className="text-xs text-muted mb-1">Рабочих дней</Text>
                <Text className="text-2xl font-bold text-foreground">{periodStats.workedDays}</Text>
                <Text className="text-xs text-muted mt-1">
                  из {periodStats.workdaysInCalendar}
                </Text>
              </View>

              <View
                className="flex-1 rounded-lg p-4 border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <Text className="text-xs text-muted mb-1">Требуют проверки</Text>
                <Text
                  className="text-2xl font-bold"
                  style={{ color: periodStats.requiresCheckDays > 0 ? colors.error : colors.success }}
                >
                  {periodStats.requiresCheckDays}
                </Text>
              </View>
            </View>

            {/* Четвертая строка статистики */}
            <View className="flex-row gap-3">
              <View
                className="flex-1 rounded-lg p-4 border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <Text className="text-xs text-muted mb-1">Выходные</Text>
                <Text className="text-2xl font-bold text-foreground">{periodStats.weekends}</Text>
              </View>

              <View
                className="flex-1 rounded-lg p-4 border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <Text className="text-xs text-muted mb-1">Праздники</Text>
                <Text className="text-2xl font-bold text-foreground">{periodStats.holidays}</Text>
              </View>

              <View
                className="flex-1 rounded-lg p-4 border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <Text className="text-xs text-muted mb-1">Отпуск</Text>
                <Text className="text-2xl font-bold text-foreground">{periodStats.vacationDays}</Text>
              </View>
            </View>
          </View>

          {/* График работы */}
          {dayStats.length > 0 && (
            <View
              className="rounded-lg p-4 border mb-6"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <Text className="text-sm font-semibold text-foreground mb-4">График работы</Text>

              <View className="flex-row items-end gap-1 h-40">
                {dayStats.map((item, index) => {
                  const maxHours = Math.max(
                    ...dayStats.map((d) => d.workedMs / (1000 * 3600))
                  );
                  const hours = item.workedMs / (1000 * 3600);
                  const height = maxHours > 0 ? (hours / maxHours) * 120 : 0;

                  return (
                    <View key={index} className="flex-1 items-center">
                      <View
                        className="w-full rounded-t"
                        style={{
                          height: Math.max(height, 4),
                          backgroundColor:
                            item.dayType === "workday" && item.hasData
                              ? colors.primary
                              : item.dayType === "weekend"
                              ? colors.muted
                              : item.dayType === "holiday"
                              ? colors.error
                              : item.dayType === "vacation"
                              ? colors.primary
                              : colors.warning,
                          opacity: item.hasData ? 1 : 0.3,
                        }}
                      />
                      <Text className="text-xs text-muted mt-2">
                        {new Date(item.date).getDate()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Детальная таблица */}
          {dayStats.length > 0 && (
            <View
              className="rounded-lg p-4 border"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <Text className="text-sm font-semibold text-foreground mb-4">Детали по дням</Text>

              <FlatList
                data={dayStats}
                keyExtractor={(item) => item.date}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View
                    className="py-3 border-b"
                    style={{ borderBottomColor: colors.border }}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-foreground">
                          {new Date(item.date).toLocaleDateString("ru-RU", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </Text>
                        <Text
                          className="text-xs mt-1"
                          style={{ color: getDayTypeColor(item.dayType) }}
                        >
                          {getDayTypeLabel(item.dayType)}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-sm font-semibold text-foreground">
                          {formatWorkedHours(item.workedMs)} ч
                        </Text>
                        {item.requiresCheck && (
                          <Text className="text-xs mt-1" style={{ color: colors.error }}>
                            ⚠️ Требует проверки
                          </Text>
                        )}
                      </View>
                    </View>

                    {item.hasData && (
                      <View className="flex-row gap-4 text-xs">
                        <Text className="text-xs text-muted">
                          Перерывы: {formatWorkedTime(item.breakMs)}
                        </Text>
                        <Text className="text-xs text-muted">
                          Выходы: {formatWorkedTime(item.temporaryExitMs)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              />
            </View>
          )}
        </ScrollView>
      ) : null}
    </ScreenContainer>
  );
}
