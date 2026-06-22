import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, LayoutChangeEvent } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/use-colors';
import { ReportDayStats } from '@/lib/storage/reportStatsService';

interface InteractiveWorkChartProps {
  dayStats: ReportDayStats[];
  onDayPress?: (day: ReportDayStats) => void;
}

interface TooltipPosition {
  x: number;
  y: number;
  visible: boolean;
  data: ReportDayStats | null;
}

export function InteractiveWorkChart({ dayStats, onDayPress }: InteractiveWorkChartProps) {
  const colors = useColors();
  const [tooltip, setTooltip] = useState<TooltipPosition>({
    x: 0,
    y: 0,
    visible: false,
    data: null,
  });
  const [containerWidth, setContainerWidth] = useState(0);
  const tooltipOpacity = useSharedValue(0);

  // Вычисляем максимальное значение для масштабирования
  const maxHours = useMemo(() => {
    if (dayStats.length === 0) return 8;
    const maxMs = Math.max(...dayStats.map((d) => d.workedMs));
    return Math.max(maxMs / (1000 * 3600), 8); // минимум 8 часов для шкалы
  }, [dayStats]);

  const handleBarPress = useCallback((day: ReportDayStats, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    const hours = (day.workedMs / (1000 * 3600)).toFixed(1);
    
    setTooltip({
      x: pageX,
      y: pageY,
      visible: true,
      data: day,
    });

    tooltipOpacity.value = withTiming(1, { duration: 200 });
    
    if (onDayPress) {
      onDayPress(day);
    }
  }, [onDayPress, tooltipOpacity]);

  const handleBarHoverOut = useCallback(() => {
    tooltipOpacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => {
      setTooltip((prev) => ({ ...prev, visible: false }));
    }, 200);
  }, [tooltipOpacity]);

  const tooltipAnimatedStyle = useAnimatedStyle(() => ({
    opacity: tooltipOpacity.value,
  }));

  const getDayTypeColor = (dayType: string): string => {
    switch (dayType) {
      case 'workday':
        return colors.success;
      case 'weekend':
        return colors.muted;
      case 'holiday':
        return colors.error;
      case 'vacation':
        return colors.primary;
      case 'shortened_workday':
        return colors.warning;
      default:
        return colors.foreground;
    }
  };

  const getDayTypeLabel = (dayType: string): string => {
    switch (dayType) {
      case 'workday':
        return 'Рабочий день';
      case 'weekend':
        return 'Выходной';
      case 'holiday':
        return 'Праздник';
      case 'vacation':
        return 'Отпуск';
      case 'shortened_workday':
        return 'Сокращенный день';
      default:
        return dayType;
    }
  };

  const formatHours = (ms: number): string => {
    const hours = ms / (1000 * 3600);
    return hours.toFixed(1);
  };

  return (
    <View>
      {/* Легенда с шкалой */}
      <View className="flex-row justify-between px-2 mb-2">
        <Text className="text-xs text-muted">{maxHours.toFixed(0)}ч</Text>
        <Text className="text-xs text-muted">0ч</Text>
      </View>

      {/* График */}
      <Animated.View
        entering={FadeIn.duration(300)}
        onLayout={(event: LayoutChangeEvent) => {
          setContainerWidth(event.nativeEvent.layout.width);
        }}
        className="flex-row items-end gap-1 h-40 px-2"
      >
        {dayStats.map((item, index) => {
          const hours = item.workedMs / (1000 * 3600);
          const heightPercent = (hours / maxHours) * 100;
          const barColor = getDayTypeColor(item.dayType);

          return (
            <Animated.View
              key={index}
              entering={ZoomIn.delay(index * 30).duration(300)}
              className="flex-1 items-center"
            >
              <Pressable
                onPress={(e) => handleBarPress(item, e)}
                onPressOut={handleBarHoverOut}
                className="w-full rounded-t"
                style={{
                  height: `${Math.max(heightPercent, 4)}%`,
                  backgroundColor: barColor,
                  opacity: item.hasData ? 1 : 0.3,
                }}
              >
                {/* Подсказка при наведении */}
                {tooltip.visible && tooltip.data?.date === item.date && (
                  <Animated.View
                    style={tooltipAnimatedStyle}
                    className="absolute -top-12 left-1/2 -translate-x-1/2 bg-foreground rounded-lg px-2 py-1 z-10 min-w-max"
                  >
                    <Text className="text-xs font-semibold text-background">
                      {formatHours(item.workedMs)}ч
                    </Text>
                  </Animated.View>
                )}
              </Pressable>

              {/* День месяца */}
              <Text className="text-xs text-muted mt-2">
                {new Date(item.date).getDate()}
              </Text>
            </Animated.View>
          );
        })}
      </Animated.View>

      {/* Информационная подсказка */}
      {tooltip.visible && tooltip.data && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          className="mt-4 p-3 rounded-lg"
          style={{ backgroundColor: colors.surface }}
        >
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-semibold text-foreground">
              {new Date(tooltip.data.date).toLocaleDateString('ru-RU', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </Text>
            <Text
              className="text-xs font-semibold px-2 py-1 rounded"
              style={{
                backgroundColor: getDayTypeColor(tooltip.data.dayType) + '20',
                color: getDayTypeColor(tooltip.data.dayType),
              }}
            >
              {getDayTypeLabel(tooltip.data.dayType)}
            </Text>
          </View>

          <View className="flex-row justify-between gap-4">
            <View>
              <Text className="text-xs text-muted mb-1">Отработано</Text>
              <Text className="text-lg font-bold text-success">
                {formatHours(tooltip.data.workedMs)}ч
              </Text>
            </View>
            <View>
              <Text className="text-xs text-muted mb-1">Перерывы</Text>
              <Text className="text-lg font-bold text-warning">
                {formatHours(tooltip.data.breakMs)}ч
              </Text>
            </View>
            <View>
              <Text className="text-xs text-muted mb-1">Выходы</Text>
              <Text className="text-lg font-bold" style={{ color: '#F97316' }}>
                {formatHours(tooltip.data.temporaryExitMs)}ч
              </Text>
            </View>
          </View>

          {tooltip.data.requiresCheck && (
            <View className="mt-2 p-2 rounded" style={{ backgroundColor: colors.error + '15' }}>
              <Text className="text-xs" style={{ color: colors.error }}>
                ⚠️ День требует проверки
              </Text>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}
