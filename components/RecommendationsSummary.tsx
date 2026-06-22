import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { RecommendationCard } from '@/components/RecommendationCard';
import {
  calculateTrend,
  calculateWeeklyDistribution,
  generateRecommendations,
  Recommendation,
} from '@/lib/services/analyticsService';
import { getDayStatsForPeriod, getPeriodStart, getPeriodEnd } from '@/lib/storage/reportStatsService';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

interface RecommendationsSummaryProps {
  onNavigateToAnalytics?: () => void;
}

export function RecommendationsSummary({ onNavigateToAnalytics }: RecommendationsSummaryProps) {
  const colors = useColors();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [topRecommendations, setTopRecommendations] = useState<Recommendation[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setIsLoading(true);

      // Получаем текущий месяц
      const now = new Date();
      const startDate = getPeriodStart(now, 'month' as any);
      const endDate = getPeriodEnd(now, 'month' as any);

      // Загружаем данные
      const dayStats = await getDayStatsForPeriod(startDate, endDate, now.getFullYear());

      // Преобразуем в WorkDay
      const workDays = dayStats.map((stat) => ({
        date: stat.date,
        totalWorkMs: stat.workedMs,
        totalBreakMs: stat.breakMs,
        totalTemporaryExitMs: stat.temporaryExitMs,
      })) as any[];

      // Рассчитываем аналитику
      const trend = calculateTrend(workDays);
      const weekly = calculateWeeklyDistribution(workDays);
      const recs = generateRecommendations(workDays, weekly, trend);

      // Берем топ-3 рекомендации по приоритету
      const sorted = recs.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      setTopRecommendations(sorted.slice(0, 3));
      setTotalCount(recs.length);
    } catch (error) {
      console.error('Ошибка при загрузке рекомендаций:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToAnalytics = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onNavigateToAnalytics) {
      onNavigateToAnalytics();
    } else {
      router.push('/(tabs)/analytics');
    }
  };

  if (isLoading) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 16,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 100,
        }}
      >
        <ActivityIndicator color={colors.primary} size="small" />
        <Text style={{ marginTop: 8, color: colors.muted, fontSize: 12 }}>
          Загрузка рекомендаций...
        </Text>
      </View>
    );
  }

  if (topRecommendations.length === 0) {
    return (
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 16,
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
            marginBottom: 12,
          }}
        >
          У вас нет рекомендаций. Ваш рабочий график оптимален!
        </Text>
        <Pressable
          onPress={handleNavigateToAnalytics}
          style={({ pressed }) => [
            {
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 6,
              backgroundColor: colors.primary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: colors.background,
            }}
          >
            Перейти в аналитику
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
      }}
    >
      {/* Заголовок */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.foreground,
              marginBottom: 2,
            }}
          >
            💡 Рекомендации
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {topRecommendations.length} из {totalCount} рекомендаций
          </Text>
        </View>

        <Pressable
          onPress={handleNavigateToAnalytics}
          style={({ pressed }) => [
            {
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 6,
              backgroundColor: colors.primary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: colors.background,
            }}
          >
            Все →
          </Text>
        </Pressable>
      </View>

      {/* Рекомендации */}
      <View style={{ gap: 8 }}>
        {topRecommendations.map((rec) => (
          <RecommendationCard key={rec.id} recommendation={rec} />
        ))}
      </View>

      {/* Кнопка перейти в аналитику */}
      <Pressable
        onPress={handleNavigateToAnalytics}
        style={({ pressed }) => [
          {
            marginTop: 12,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text
          style={{
            textAlign: 'center',
            fontSize: 13,
            fontWeight: '600',
            color: colors.primary,
          }}
        >
          Открыть полную аналитику
        </Text>
      </Pressable>
    </View>
  );
}
