import { ScreenContainer } from "@/components/screen-container";
import { AnimatedPeriodSelector } from "@/components/AnimatedPeriodSelector";
import { InteractiveWorkChart } from "@/components/InteractiveWorkChart";
import { AnimatedStatsGrid, AnimatedStatsCard } from "@/components/AnimatedStatsCard";
import { AnimatedDetailsList } from "@/components/AnimatedDetailsList";
import { AnimatedLoadingState } from "@/components/AnimatedLoadingState";
import { ExportOptionsModal } from "@/components/ExportOptionsModal";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
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
import { exportReportToCSV, shareCSVFile } from "@/lib/export/exportToCSV";
import { exportReportToPDF, sharePDFFile } from "@/lib/export/exportToPDF";

export default function ReportsScreen() {
  const colors = useColors();
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month" | "year">("month");
  const [periodStats, setPeriodStats] = useState<ReportPeriodStats | null>(null);
  const [dayStats, setDayStats] = useState<ReportDayStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleDayPress = useCallback((day: ReportDayStats) => {
    // Обработка нажатия на день графика
    console.log("Выбран день:", day.date);
  }, []);

  const handleExport = useCallback(
    async (format: "csv" | "pdf") => {
      if (!periodStats) return;

      try {
        setIsExporting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const startDate = getPeriodStart(currentDate, selectedPeriod);
        const endDate = getPeriodEnd(currentDate, selectedPeriod);
        const fileName = `report_${startDate.toISOString().split("T")[0]}_${endDate.toISOString().split("T")[0]}.${format}`;

        const statsWithDates = {
          ...periodStats,
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        };

        let filePath: string;
        if (format === "csv") {
          filePath = await exportReportToCSV(statsWithDates, dayStats, fileName);
          await shareCSVFile(filePath, fileName);
        } else {
          filePath = await exportReportToPDF(statsWithDates, dayStats, fileName);
          await sharePDFFile(filePath, fileName);
        }
      } catch (error) {
        console.error("Ошибка при экспорте:", error);
        throw error;
      } finally {
        setIsExporting(false);
      }
    },
    [periodStats, currentDate, selectedPeriod, dayStats]
  );

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

  // Мемоизированные данные для карточек статистики
  const statsData = useMemo(
    () => [
      {
        label: "Всего отработано",
        value: periodStats ? formatWorkedHours(periodStats.totalWorkedMs) : "0",
        unit: "часов",
        icon: "⏱️",
        variant: "highlight" as const,
      },
      {
        label: "Среднее в день",
        value: periodStats ? formatWorkedHours(periodStats.averageWorkedMs) : "0",
        unit: "часов",
        icon: "📊",
      },
      {
        label: "95% норма",
        value: periodStats ? formatWorkedHours(periodStats.totalWork95Ms) : "0",
        unit: "часов",
        icon: "✓",
      },
      {
        label: "Перерывы",
        value: periodStats ? formatWorkedTime(periodStats.totalBreakMs) : "0м",
        icon: "☕",
      },
      {
        label: "Выходы",
        value: periodStats ? formatWorkedTime(periodStats.totalTemporaryExitMs) : "0м",
        icon: "🚪",
      },
      {
        label: "Требуют проверки",
        value: periodStats?.requiresCheckDays ?? 0,
        variant:
          (periodStats?.requiresCheckDays ?? 0) > 0
            ? ("warning" as const)
            : ("success" as const),
        icon: periodStats?.requiresCheckDays ? "⚠️" : "✓",
      },
    ],
    [periodStats]
  );

  const dayTypeStats = useMemo(
    () => [
      {
        label: "Рабочих дней",
        value: periodStats?.workedDays ?? 0,
        unit: `из ${periodStats?.workdaysInCalendar ?? 0}`,
        icon: "💼",
      },
      {
        label: "Выходные",
        value: periodStats?.weekends ?? 0,
        icon: "🏖️",
      },
      {
        label: "Праздники",
        value: periodStats?.holidays ?? 0,
        icon: "🎉",
      },
      {
        label: "Отпуск",
        value: periodStats?.vacationDays ?? 0,
        icon: "✈️",
      },
    ],
    [periodStats]
  );

  return (
    <ScreenContainer className="p-4">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-3xl font-bold text-foreground">Отчеты</Text>
        <Pressable
          onPress={() => setShowExportModal(true)}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <View
            className="p-2 rounded-lg"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-lg">📥</Text>
          </View>
        </Pressable>
      </View>

      <ExportOptionsModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        isLoading={isExporting}
      />

      {/* Анимированный переключатель периодов */}
      <AnimatedPeriodSelector
        mode={selectedPeriod}
        onModeChange={setSelectedPeriod}
        periodLabel={getPeriodLabel()}
        onPrevious={handlePreviousPeriod}
        onNext={handleNextPeriod}
        onToday={handleToday}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center mt-8">
          <AnimatedLoadingState message="Загрузка отчета" />
        </View>
      ) : periodStats ? (
        <ScrollView showsVerticalScrollIndicator={false} className="mt-6">
          {/* Основные метрики с анимацией */}
          <AnimatedStatsGrid stats={statsData} isLoading={false} columns={2} />

          {/* Интерактивный график работы */}
          {dayStats.length > 0 && (
            <View className="mt-6 rounded-lg p-4" style={{ backgroundColor: colors.surface }}>
              <Text className="text-sm font-semibold text-foreground mb-4">
                📊 График работы
              </Text>
              <InteractiveWorkChart dayStats={dayStats} onDayPress={handleDayPress} />
            </View>
          )}

          {/* Статистика по типам дней */}
          <View className="mt-6">
            <Text className="text-sm font-semibold text-foreground mb-3">
              📅 По типам дней
            </Text>
            <AnimatedStatsGrid stats={dayTypeStats} isLoading={false} columns={2} />
          </View>

          {/* Детальная таблица с анимацией */}
          {dayStats.length > 0 && <AnimatedDetailsList dayStats={dayStats} />}
        </ScrollView>
      ) : null}
    </ScreenContainer>
  );
}
