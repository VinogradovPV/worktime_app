import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

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

  const getReportData = (): ReportData => {
    const reports = {
      day: {
        period: "Сегодня",
        totalWorkTime: 8.5,
        averagePerDay: 8.5,
        tasksCompleted: 5,
        anomalies: 0,
        dailyData: [{ day: "Сегодня", hours: 8.5 }],
      },
      week: {
        period: "Эта неделя",
        totalWorkTime: 40,
        averagePerDay: 8,
        tasksCompleted: 25,
        anomalies: 1,
        dailyData: [
          { day: "Пн", hours: 8 },
          { day: "Вт", hours: 8.5 },
          { day: "Ср", hours: 7.5 },
          { day: "Чт", hours: 8 },
          { day: "Пт", hours: 8 },
        ],
      },
      month: {
        period: "Этот месяц",
        totalWorkTime: 160,
        averagePerDay: 8,
        tasksCompleted: 100,
        anomalies: 3,
        dailyData: Array.from({ length: 20 }, (_, i) => ({
          day: `${i + 1}`,
          hours: 7.5 + Math.random() * 2,
        })),
      },
      year: {
        period: "Этот год",
        totalWorkTime: 1920,
        averagePerDay: 8,
        tasksCompleted: 1200,
        anomalies: 30,
        dailyData: Array.from({ length: 12 }, (_, i) => ({
          day: ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"][
            i
          ],
          hours: 160 + Math.random() * 40,
        })),
      },
    };

    return reports[selectedPeriod];
  };

  const data = getReportData();
  const maxHours = Math.max(...data.dailyData.map((d) => d.hours));

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

      <ScrollView>
        {/* Основные метрики */}
        <View className="grid grid-cols-2 gap-3 mb-6">
          <View className="bg-surface rounded-lg p-4 border border-border">
            <Text className="text-xs text-muted mb-1">Всего часов</Text>
            <Text className="text-2xl font-bold text-foreground">{data.totalWorkTime.toFixed(1)}</Text>
            <Text className="text-xs text-muted mt-1">часов</Text>
          </View>

          <View className="bg-surface rounded-lg p-4 border border-border">
            <Text className="text-xs text-muted mb-1">Среднее в день</Text>
            <Text className="text-2xl font-bold text-foreground">{data.averagePerDay.toFixed(1)}</Text>
            <Text className="text-xs text-muted mt-1">часов</Text>
          </View>

          <View className="bg-surface rounded-lg p-4 border border-border">
            <Text className="text-xs text-muted mb-1">Задач выполнено</Text>
            <Text className="text-2xl font-bold text-foreground">{data.tasksCompleted}</Text>
            <Text className="text-xs text-muted mt-1">задач</Text>
          </View>

          <View className="bg-surface rounded-lg p-4 border border-border">
            <Text className="text-xs text-muted mb-1">Аномалии</Text>
            <Text className="text-2xl font-bold" style={{ color: colors.error }}>
              {data.anomalies}
            </Text>
            <Text className="text-xs text-muted mt-1">дней</Text>
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
            <View key={index} className="flex-row justify-between items-center py-2 border-b border-border">
              <Text className="text-sm text-foreground">{item.day}</Text>
              <Text className="text-sm font-semibold text-foreground">{item.hours.toFixed(1)} ч</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
