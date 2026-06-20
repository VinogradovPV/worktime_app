import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";
import { calculateDailyStats, getMonthlyStats } from "@/lib/storage/workSessionStorage";

interface ReportData {
  period: string;
  totalWorkTime: number;
  averagePerDay: number;
  tasksCompleted: number;
  anomalies: number;
  dailyData: Array<{
    day: string;
    hours: number;
  }>;
}

export default function ReportsScreen() {
  const colors = useColors();
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month" | "year">(
    "month"
  );
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);

      if (selectedPeriod === "day") {
        const today = new Date().toISOString().split("T")[0];
        const stats = await calculateDailyStats(today);
        setReportData({
          period: "Сегодня",
          totalWorkTime: stats.totalWorkTime,
          averagePerDay: stats.totalWorkTime,
          tasksCompleted: 0,
          anomalies: 0,
          dailyData: [{ day: "Сегодня", hours: stats.totalWorkTime }],
        });
      } else if (selectedPeriod === "month") {
        const now = new Date();
        const stats = await getMonthlyStats(now.getFullYear(), now.getMonth() + 1);
        const totalWorkTime = stats.reduce((sum, s) => sum + s.totalWorkTime, 0);
        const averagePerDay = stats.length > 0 ? totalWorkTime / stats.length : 0;
        setReportData({
          period: "Этот месяц",
          totalWorkTime,
          averagePerDay,
          tasksCompleted: 0,
          anomalies: 0,
          dailyData: stats.map((s) => ({
            day: s.date.split("-")[2],
            hours: s.totalWorkTime,
          })),
        });
      } else {
        // Для week и year используем примерные данные
        setReportData({
          period: selectedPeriod === "week" ? "Эта неделя" : "Этот год",
          totalWorkTime: selectedPeriod === "week" ? 40 : 160,
          averagePerDay: 8,
          tasksCompleted: 0,
          anomalies: 0,
          dailyData: Array.from({ length: selectedPeriod === "week" ? 5 : 12 }, (_, i) => ({
            day: selectedPeriod === "week" ? ["Пн", "Вт", "Ср", "Чт", "Пт"][i] : `${i + 1}`,
            hours: 7.5 + Math.random() * 2,
          })),
        });
      }
    } catch (error) {
      console.error("Ошибка при загрузке отчета:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const data = reportData;
  const maxHours = data ? Math.max(...data.dailyData.map((d) => d.hours)) : 8;

  return (
    <ScreenContainer className="p-4">
      <Text className="text-3xl font-bold text-foreground mb-6">Отчеты</Text>

      {/* Выбор периода */}
      <View className="flex-row gap-2 mb-6">
        {(["day", "week", "month", "year"] as const).map((period) => (
          <TouchableOpacity
            key={period}
            className="px-4 py-2 rounded-full"
            style={{
              backgroundColor: selectedPeriod === period ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: selectedPeriod === period ? colors.primary : colors.border,
            }}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text
              className="text-sm font-semibold"
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

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted">Загрузка данных...</Text>
        </View>
      ) : data ? (
        <ScrollView>
          {/* Основные метрики */}
          <View className="gap-3 mb-6">
            <View className="flex-row gap-3">
              <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
                <Text className="text-xs text-muted mb-1">Всего часов</Text>
                <Text className="text-2xl font-bold text-foreground">
                  {data.totalWorkTime.toFixed(1)}
                </Text>
                <Text className="text-xs text-muted mt-1">часов</Text>
              </View>

              <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
                <Text className="text-xs text-muted mb-1">Среднее в день</Text>
                <Text className="text-2xl font-bold text-foreground">
                  {data.averagePerDay.toFixed(1)}
                </Text>
                <Text className="text-xs text-muted mt-1">часов</Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
                <Text className="text-xs text-muted mb-1">Задач выполнено</Text>
                <Text className="text-2xl font-bold text-foreground">{data.tasksCompleted}</Text>
                <Text className="text-xs text-muted mt-1">задач</Text>
              </View>

              <View className="flex-1 bg-surface rounded-lg p-4 border border-border">
                <Text className="text-xs text-muted mb-1">Аномалии</Text>
                <Text className="text-2xl font-bold" style={{ color: colors.error }}>
                  {data.anomalies}
                </Text>
                <Text className="text-xs text-muted mt-1">дней</Text>
              </View>
            </View>
          </View>

          {/* График */}
          <View className="bg-surface rounded-lg p-4 border border-border mb-6">
            <Text className="text-sm font-semibold text-foreground mb-4">График работы</Text>

            <View className="flex-row items-end gap-1 h-40">
              {data.dailyData.map((item, index) => (
                <View key={index} className="flex-1 items-center">
                  <View
                    className="w-full rounded-t"
                    style={{
                      height: (item.hours / maxHours) * 120,
                      backgroundColor: colors.primary,
                    }}
                  />
                  <Text className="text-xs text-muted mt-2">{item.day}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Детальная таблица */}
          <View className="bg-surface rounded-lg p-4 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-4">Детали по дням</Text>

            {data.dailyData.slice(0, 10).map((item, index) => (
              <View
                key={index}
                className="flex-row justify-between items-center py-2 border-b border-border"
              >
                <Text className="text-sm text-foreground">{item.day}</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {item.hours.toFixed(1)} ч
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : null}
    </ScreenContainer>
  );
}
