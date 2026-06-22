import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { TrendChart } from '@/components/charts/TrendChart';
import { WeeklyDistributionChart } from '@/components/charts/WeeklyDistributionChart';
import { ComparisonChart } from '@/components/charts/ComparisonChart';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
import { HourlyActivityChart } from '@/components/charts/HourlyActivityChart';
import { RecommendationCard } from '@/components/RecommendationCard';
import { ExportOptionsModal } from '@/components/ExportOptionsModal';
import {
  calculateTrend,
  comparePeriods,
  calculateWeeklyDistribution,
  calculateHourlyActivity,
  generateRecommendations,
  TrendData,
  WeeklyDistribution,
  PeriodComparison,
  Recommendation,
  HourlyActivity,
} from '@/lib/services/analyticsService';
import {
  getPeriodStart,
  getPeriodEnd,
  getDayStatsForPeriod,
} from '@/lib/storage/reportStatsService';
import { exportAnalyticsToPDF, exportAnalyticsToCSV } from '@/lib/export/analyticsExportService';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';

type AnalyticsTab = 'trends' | 'distribution' | 'comparison' | 'heatmap' | 'recommendations';

export default function AnalyticsScreen() {
  const colors = useColors();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(
    section === 'recommendations' ? 'recommendations' : 'trends'
  );

  // Обновить вкладку при изменении параметра section (навигация из главного экрана)
  useEffect(() => {
    if (section === 'recommendations') {
      setActiveTab('recommendations');
    }
  }, [section]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Данные для графиков
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [weeklyDist, setWeeklyDist] = useState<WeeklyDistribution[]>([]);
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [hourlyActivity, setHourlyActivity] = useState<HourlyActivity[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Загрузка данных
  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod, currentDate]);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);

      // Получаем текущий период
      const periodType = selectedPeriod === 'week' ? 'week' : selectedPeriod === 'month' ? 'month' : 'year';
      const startDate = getPeriodStart(currentDate, periodType as any);
      const endDate = getPeriodEnd(currentDate, periodType as any);

      // Получаем предыдущий период для сравнения
      const prevDate = new Date(currentDate);
      if (selectedPeriod === 'week') {
        prevDate.setDate(prevDate.getDate() - 7);
      } else if (selectedPeriod === 'month') {
        prevDate.setMonth(prevDate.getMonth() - 1);
      } else {
        prevDate.setFullYear(prevDate.getFullYear() - 1);
      }

      const prevStartDate = getPeriodStart(prevDate, periodType as any);
      const prevEndDate = getPeriodEnd(prevDate, periodType as any);

      // Загружаем данные
      const currentDayStats = await getDayStatsForPeriod(startDate, endDate, currentDate.getFullYear());
      const prevDayStats = await getDayStatsForPeriod(prevStartDate, prevEndDate, prevDate.getFullYear());
      
      // Преобразуем в WorkDay для анализа
      const currentWorkDays = currentDayStats.map(stat => ({
        date: stat.date,
        totalWorkMs: stat.workedMs,
        totalBreakMs: stat.breakMs,
        totalTemporaryExitMs: stat.temporaryExitMs,
      })) as any[];
      
      const prevWorkDays = prevDayStats.map(stat => ({
        date: stat.date,
        totalWorkMs: stat.workedMs,
        totalBreakMs: stat.breakMs,
        totalTemporaryExitMs: stat.temporaryExitMs,
      })) as any[];

      // Рассчитываем аналитику
      const trend = calculateTrend(currentWorkDays);
      const weekly = calculateWeeklyDistribution(currentWorkDays);
      const comp = comparePeriods(prevWorkDays, currentWorkDays);
      const recs = generateRecommendations(currentWorkDays, weekly, trend);

      const hourly = calculateHourlyActivity(currentWorkDays);

      setTrendData(trend);
      setWeeklyDist(weekly);
      setComparison(comp);
      setRecommendations(recs);
      setHourlyActivity(hourly);
    } catch (error) {
      console.error('Ошибка при загрузке аналитики:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousPeriod = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDate = new Date(currentDate);
    if (selectedPeriod === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (selectedPeriod === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNextPeriod = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDate = new Date(currentDate);
    if (selectedPeriod === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (selectedPeriod === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleTabChange = (tab: AnalyticsTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const getPeriodLabel = (): string => {
    const startDate = getPeriodStart(currentDate, selectedPeriod === 'week' ? 'week' : selectedPeriod === 'month' ? 'month' : 'year');
    const endDate = getPeriodEnd(currentDate, selectedPeriod === 'week' ? 'week' : selectedPeriod === 'month' ? 'month' : 'year');

    if (selectedPeriod === 'week') {
      return `${startDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
      })} - ${endDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}`;
    } else if (selectedPeriod === 'month') {
      return currentDate.toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric',
      });
    } else {
      return currentDate.getFullYear().toString();
    }
  };

  const handleExport = useCallback(async (format: 'csv' | 'pdf') => {
    try {
      setIsExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const reportData = {
        period: getPeriodLabel(),
        trendData,
        weeklyDistribution: weeklyDist,
        comparison,
        recommendations,
        generatedAt: new Date().toLocaleString('ru-RU'),
      };
      if (format === 'pdf') {
        await exportAnalyticsToPDF(reportData);
      } else {
        await exportAnalyticsToCSV(reportData);
      }
    } catch (error) {
      console.error('Ошибка при экспорте аналитики:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [trendData, weeklyDist, comparison, recommendations, getPeriodLabel]);

  return (
    <ScreenContainer className="p-4">
      {/* Заголовок */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: colors.foreground,
              marginBottom: 4,
            }}
          >
            📊 Аналитика
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            Анализ тенденций и рекомендации по оптимизации
          </Text>
        </View>
        {/* Кнопка экспорта */}
        <Pressable
          onPress={() => setShowExportModal(true)}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: 4 }]}
        >
          <View
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: colors.primary,
            }}
          >
            <Text style={{ fontSize: 16 }}>📥</Text>
          </View>
        </Pressable>
      </View>

      {/* Модальное окно экспорта */}
      <ExportOptionsModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        isLoading={isExporting}
      />

      {/* Выбор периода */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,
        }}
      >
        {/* Кнопки периода */}
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            marginBottom: 12,
          }}
        >
          {(['week', 'month', 'year'] as const).map((period) => (
            <Pressable
              key={period}
              onPress={() => setSelectedPeriod(period)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor:
                    selectedPeriod === period ? colors.primary : colors.background,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: '600',
                  color:
                    selectedPeriod === period ? colors.background : colors.foreground,
                }}
              >
                {period === 'week' ? 'Неделя' : period === 'month' ? 'Месяц' : 'Год'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Навигация по датам */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Pressable
            onPress={handlePreviousPeriod}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={{ fontSize: 18, color: colors.primary }}>←</Text>
          </Pressable>

          <Pressable
            onPress={handleToday}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Text
              style={{
                fontSize: 12,
                color: colors.foreground,
                fontWeight: '600',
              }}
            >
              {getPeriodLabel()}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleNextPeriod}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={{ fontSize: 18, color: colors.primary }}>→</Text>
          </Pressable>
        </View>
      </View>

      {/* Вкладки */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
        contentContainerStyle={{
          gap: 6,
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 4,
        }}
      >
        {[
          { id: 'trends' as const, label: 'Тренды' },
          { id: 'distribution' as const, label: 'Распределение' },
          { id: 'comparison' as const, label: 'Сравнение' },
          { id: 'heatmap' as const, label: 'Тепловая карта' },
          { id: 'recommendations' as const, label: 'Советы' },
        ].map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => handleTabChange(tab.id)}
            style={({ pressed }) => [
              {
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 8,
                backgroundColor: activeTab === tab.id ? colors.primary : 'transparent',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={{
                textAlign: 'center',
                fontSize: 12,
                fontWeight: '600',
                color: activeTab === tab.id ? colors.background : colors.foreground,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Содержимое */}
      {isLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 40,
          }}
        >
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ marginTop: 12, color: colors.muted }}>Загрузка аналитики...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {activeTab === 'trends' && (
            <View>
              <TrendChart data={trendData} />
            </View>
          )}

          {activeTab === 'distribution' && (
            <View>
              <WeeklyDistributionChart data={weeklyDist} />
            </View>
          )}

          {activeTab === 'comparison' && comparison && (
            <View>
              <ComparisonChart data={comparison} />
            </View>
          )}

          {activeTab === 'heatmap' && (
            <View>
              <HeatmapChart data={trendData} />
              <HourlyActivityChart data={hourlyActivity} />
            </View>
          )}

          {activeTab === 'recommendations' && (
            <View>
              {recommendations.length > 0 ? (
                <View>
                  {recommendations.map((rec) => (
                    <RecommendationCard key={rec.id} recommendation={rec} />
                  ))}
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: 24,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>✨</Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: colors.foreground,
                      marginBottom: 4,
                    }}
                  >
                    Отлично!
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.muted,
                      textAlign: 'center',
                    }}
                  >
                    У вас нет рекомендаций. Ваш рабочий график оптимален!
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
