import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useRouter } from 'expo-router';
import {
  getDayStatsForPeriod,
  getPeriodStart,
  getPeriodEnd,
} from '@/lib/storage/reportStatsService';
import * as Haptics from 'expo-haptics';

interface WeekMetrics {
  avgWorkHours: number;       // Среднее время работы в день (в часах)
  totalWorkHours: number;     // Всего часов за неделю
  workedDays: number;         // Дней с данными
  workdaysInCalendar: number; // Рабочих дней по календарю
  trend: 'up' | 'down' | 'stable'; // Тренд по сравнению с прошлой неделей
  trendPercent: number;       // Процент изменения
  bestDay: string | null;     // Лучший день (самый продуктивный)
}

function formatHours(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h === 0) return `${m}м`;
  if (m === 0) return `${h}ч`;
  return `${h}ч ${m}м`;
}

const DAY_NAMES_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export function WeeklyAnalyticsWidget() {
  const colors = useColors();
  const router = useRouter();
  const [metrics, setMetrics] = useState<WeekMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      const now = new Date();
      const year = now.getFullYear();

      // Текущая неделя
      const weekStart = getPeriodStart(now, 'week' as any);
      const weekEnd = getPeriodEnd(now, 'week' as any);
      const currentWeekStats = await getDayStatsForPeriod(weekStart, weekEnd, year);

      // Прошлая неделя
      const prevWeekEnd = new Date(weekStart);
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
      const prevWeekStart = getPeriodStart(prevWeekEnd, 'week' as any);
      const prevWeekStats = await getDayStatsForPeriod(prevWeekStart, prevWeekEnd, year);

      // Считаем метрики текущей недели
      const workdays = currentWeekStats.filter(
        (d) => d.dayType === 'workday' || d.dayType === 'shortened_workday'
      );
      const workedDays = currentWeekStats.filter((d) => d.workedMs > 0);
      const totalWorkMs = workedDays.reduce((sum, d) => sum + d.workedMs, 0);
      const avgWorkMs = workedDays.length > 0 ? totalWorkMs / workedDays.length : 0;

      // Лучший день
      let bestDay: string | null = null;
      if (workedDays.length > 0) {
        const best = workedDays.reduce((a, b) => (a.workedMs > b.workedMs ? a : b));
        const d = new Date(best.date);
        bestDay = DAY_NAMES_SHORT[d.getDay()];
      }

      // Тренд: сравниваем среднее с прошлой неделей
      const prevWorked = prevWeekStats.filter((d) => d.workedMs > 0);
      const prevAvgMs =
        prevWorked.length > 0
          ? prevWorked.reduce((sum, d) => sum + d.workedMs, 0) / prevWorked.length
          : 0;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercent = 0;
      if (prevAvgMs > 0 && avgWorkMs > 0) {
        trendPercent = Math.round(((avgWorkMs - prevAvgMs) / prevAvgMs) * 100);
        if (trendPercent > 3) trend = 'up';
        else if (trendPercent < -3) trend = 'down';
      }

      setMetrics({
        avgWorkHours: avgWorkMs / 3_600_000,
        totalWorkHours: totalWorkMs / 3_600_000,
        workedDays: workedDays.length,
        workdaysInCalendar: workdays.length,
        trend,
        trendPercent: Math.abs(trendPercent),
        bestDay,
      });
    } catch (err) {
      console.error('WeeklyAnalyticsWidget: ошибка загрузки', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/(tabs)/analytics', params: { section: 'trends' } });
  };

  if (isLoading) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          minHeight: 80,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: colors.muted, fontSize: 12 }}>Загрузка аналитики...</Text>
      </View>
    );
  }

  if (!metrics || (metrics.workedDays === 0 && metrics.workdaysInCalendar === 0)) {
    return null; // Не показываем виджет если данных совсем нет
  }

  const trendIcon = metrics.trend === 'up' ? '↑' : metrics.trend === 'down' ? '↓' : '→';
  const trendColor =
    metrics.trend === 'up' ? colors.success : metrics.trend === 'down' ? colors.error : colors.muted;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        {
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Заголовок */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>
          📈 Аналитика недели
        </Text>
        <Text style={{ fontSize: 11, color: colors.muted }}>Подробнее →</Text>
      </View>

      {/* Три метрики */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/* Среднее время */}
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            borderRadius: 10,
            padding: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary }}>
            {formatHours(metrics.avgWorkHours * 3_600_000)}
          </Text>
          <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2, textAlign: 'center' }}>
            среднее в день
          </Text>
        </View>

        {/* Тренд */}
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            borderRadius: 10,
            padding: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: trendColor }}>
            {trendIcon}
            {metrics.trendPercent > 0 ? ` ${metrics.trendPercent}%` : ''}
          </Text>
          <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2, textAlign: 'center' }}>
            к прошлой неделе
          </Text>
        </View>

        {/* Лучший день / дней отработано */}
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            borderRadius: 10,
            padding: 10,
            alignItems: 'center',
          }}
        >
          {metrics.bestDay ? (
            <>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.success }}>
                {metrics.bestDay}
              </Text>
              <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2, textAlign: 'center' }}>
                лучший день
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>
                {metrics.workedDays}/{metrics.workdaysInCalendar}
              </Text>
              <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2, textAlign: 'center' }}>
                дней отработано
              </Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}
