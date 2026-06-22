import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/use-colors';

interface AnimatedStatsCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
  isLoading?: boolean;
  delay?: number;
  variant?: 'default' | 'highlight' | 'warning' | 'success';
}

export function AnimatedStatsCard({
  label,
  value,
  unit,
  icon,
  isLoading = false,
  delay = 0,
  variant = 'default',
}: AnimatedStatsCardProps) {
  const colors = useColors();
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (isLoading) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      pulseOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [isLoading]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const getBackgroundColor = () => {
    switch (variant) {
      case 'highlight':
        return colors.primary + '15';
      case 'warning':
        return colors.warning + '15';
      case 'success':
        return colors.success + '15';
      default:
        return colors.surface;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'highlight':
        return colors.primary;
      case 'warning':
        return colors.warning;
      case 'success':
        return colors.success;
      default:
        return colors.foreground;
    }
  };

  return (
    <Animated.View
      entering={ZoomIn.delay(delay).duration(300)}
      exiting={FadeOut.duration(200)}
      className="flex-1 rounded-lg p-4 min-h-24"
      style={{
        backgroundColor: getBackgroundColor(),
      }}
    >
      {isLoading ? (
        <Animated.View style={pulseAnimatedStyle} className="gap-2">
          {/* Skeleton для лейбла */}
          <View className="h-3 rounded bg-muted/30 w-1/2" />
          {/* Skeleton для значения */}
          <View className="h-6 rounded bg-muted/30 w-2/3" />
        </Animated.View>
      ) : (
        <View className="gap-2">
          {/* Лейбл */}
          <View className="flex-row items-center gap-2">
            {icon && <Text className="text-lg">{icon}</Text>}
            <Text className="text-xs text-muted font-medium">{label}</Text>
          </View>

          {/* Значение */}
          <View className="flex-row items-baseline gap-1">
            <Text className="text-2xl font-bold" style={{ color: getTextColor() }}>
              {value}
            </Text>
            {unit && <Text className="text-xs text-muted">{unit}</Text>}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

interface AnimatedStatsGridProps {
  stats: Array<{
    label: string;
    value: string | number;
    unit?: string;
    icon?: string;
    variant?: 'default' | 'highlight' | 'warning' | 'success';
  }>;
  isLoading?: boolean;
  columns?: 2 | 3;
}

export function AnimatedStatsGrid({
  stats,
  isLoading = false,
  columns = 2,
}: AnimatedStatsGridProps) {
  const rows = Math.ceil(stats.length / columns);

  return (
    <View className="gap-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <View key={rowIndex} className="flex-row gap-3">
          {Array.from({ length: columns }).map((_, colIndex) => {
            const index = rowIndex * columns + colIndex;
            const stat = stats[index];

            if (!stat) {
              return <View key={colIndex} className="flex-1" />;
            }

            return (
              <AnimatedStatsCard
                key={index}
                {...stat}
                isLoading={isLoading}
                delay={index * 50}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}
