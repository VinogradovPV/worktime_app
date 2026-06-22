import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { Recommendation } from '@/lib/services/analyticsService';
import * as Haptics from 'expo-haptics';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onAction?: () => void;
}

export function RecommendationCard({
  recommendation,
  onAction,
}: RecommendationCardProps) {
  const colors = useColors();

  const priorityColor =
    recommendation.priority === 'high'
      ? colors.error
      : recommendation.priority === 'medium'
      ? colors.warning
      : colors.success;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAction?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 16,
          marginVertical: 8,
          borderLeftWidth: 4,
          borderLeftColor: priorityColor,
        }}
      >
        {/* Заголовок */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 20 }}>{recommendation.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.foreground,
              }}
            >
              {recommendation.title}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: priorityColor,
                marginTop: 2,
              }}
            >
              {recommendation.priority === 'high'
                ? 'Высокий приоритет'
                : recommendation.priority === 'medium'
                ? 'Средний приоритет'
                : 'Низкий приоритет'}
            </Text>
          </View>
        </View>

        {/* Описание */}
        <Text
          style={{
            fontSize: 13,
            color: colors.muted,
            lineHeight: 18,
            marginBottom: 12,
          }}
        >
          {recommendation.description}
        </Text>

        {/* Кнопка действия */}
        {recommendation.action && (
          <View
            style={{
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: colors.primary,
                fontWeight: '600',
              }}
            >
              {recommendation.action} →
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
