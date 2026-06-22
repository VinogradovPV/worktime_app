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
  avgWorkHours: number;
  totalWorkHours: number;
  workedDays: number;
  workdaysInCalendar: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  bestDay: string | null;
  normWeekMs: number;        // Норма за неделю (рабочих дней × 8ч)
  totalWorkMs: number;       // Фактически отработано за неделю
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

      const weekStart = getPeriodStart(now, 'week' as any);
      const weekEnd = getPeriodEnd(now, 'week' as any);
      const currentWeekStats = await getDayStatsForPeriod(weekStart, weekEnd, year);

      const prevWeekEnd = new Date(weekStart);
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
      const prevWeekStart = getPeriodStart(prevWeekEnd, 'week' as any);
      const prevWeekStats = await getDayStatsForPeriod(prevWeekStart, prevWeekEnd, year);

      const workdays = currentWeekStats.filter(
        (d) => d.dayType === 'workday' || d.dayType === 'shortened_workday'
      );
      const workedDays = currentWeekStats.filter((d) => d.workedMs > 0);
      const totalWorkMs = workedDays.reduce((sum, d) => sum + d.workedMs, 0);
      const avgWorkMs = workedDays.length > 0 ? totalWorkMs / workedDays.length : 0;

      // Норма недели = рабочих дней × 8ч
      const normWeekMs = workdays.length * 8 * 3_600_000;

      let bestDay: string | null = null;
      if (workedDays.length > 0) {
        const best = workedDays.reduce((a, b) => (a.workedMs > b.workedMs ? a : b));
        const d = new Date(best.date);
        bestDay = DAY_NAMES_SHORT[d.getDay()];
      }

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
        normWeekMs,
        totalWorkMs,
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
    return null;
  }

  const trendIcon = metrics.trend === 'up' ? '↑' : metrics.trend === 'down' ? '↓' : '→';
  const trendColor =
    metrics.trend === 'up' ? colors.success : metrics.trend === 'down' ? colors.error : colors.muted;

  const normProgress = metrics.normWeekMs > 0
    ? Math.min(metrics.totalWorkMs / metrics.normWeekMs, 1)
    : 0;
  const normPercent = Math.round(normProgress * 100);
  const normColor = normProgress >= 1 ? colors.success
    : normProgress >= 0.75 ? colors.primary
    : normProgress >= 0.5 ? colors.warning
    : colors.muted;

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
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
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
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.primary }}>
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
          <Text style={{ fontSize: 17, fontWeight: '700', color: trendColor }}>
            {trendIcon}{metrics.trendPercent > 0 ? ` ${metrics.trendPercent}%` : ''}
          </Text>
          <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2, textAlign: 'center' }}>
            к прошлой неделе
          </Text>
        </View>

        {/* Дней отработано */}
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
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.success }}>
                {metrics.bestDay}
              </Text>
              <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2, textAlign: 'center' }}>
                лучший день
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground }}>
                {metrics.workedDays}/{metrics.workdaysInCalendar}
              </Text>
              <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2, textAlign: 'center' }}>
                дней отработано
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Прогресс-бар нормы недели */}
      {metrics.normWeekMs > 0 && (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 11, color: colors.muted }}>
              {formatHours(metrics.totalWorkMs)} из {formatHours(metrics.normWeekMs)} нормы
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: normColor }}>
              {normPercent}%
            </Text>
          </View>
          <View
            style={{
              height: 4,
              backgroundColor: colors.border,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${normPercent}%`,
                backgroundColor: normColor,
                borderRadius: 2,
              }}
            />
          </View>
        </View>
      )}
    </Pressable>
  );
}
