import React, { useMemo } from 'react';
import { View, Text, FlatList } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/use-colors';
import { ReportDayStats, formatWorkedTime, formatWorkedHours } from '@/lib/storage/reportStatsService';

interface AnimatedDetailsListProps {
  dayStats: ReportDayStats[];
}

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

const getDayTypeColor = (dayType: string, colors: any): string => {
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

interface DayItemProps {
  item: ReportDayStats;
  index: number;
  borderColor: string;
  getDayTypeColor: (dayType: string) => string;
}

function AnimatedDayItem({ item, index, borderColor, getDayTypeColor }: DayItemProps) {
  const colors = useColors();
  const scaleValue = useSharedValue(0.95);

  React.useEffect(() => {
    scaleValue.value = withTiming(1, { duration: 300 });
  }, []);

  const scaleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 30).duration(300)}
      style={[scaleAnimatedStyle, { borderBottomColor: borderColor }]}
      className="py-3 border-b"
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground">
            {new Date(item.date).toLocaleDateString('ru-RU', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </Text>
          <Text
            className="text-xs mt-1"
            style={{ color: getDayTypeColor(item.dayType) }}
          >
            {getDayTypeLabel(item.dayType)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-sm font-semibold text-foreground">
            {formatWorkedHours(item.workedMs)} ч
          </Text>
          {item.requiresCheck && (
            <View className="mt-1 px-2 py-1 rounded" style={{ backgroundColor: colors.error + '20' }}>
              <Text className="text-xs" style={{ color: colors.error }}>
                ⚠️ Требует проверки
              </Text>
            </View>
          )}
        </View>
      </View>

      {item.hasData && (
        <View className="flex-row gap-3 text-xs">
          <View className="flex-1">
            <Text className="text-xs text-muted">☕ Перерывы</Text>
            <Text className="text-xs font-semibold text-foreground mt-1">
              {formatWorkedTime(item.breakMs)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-muted">🚪 Выходы</Text>
            <Text className="text-xs font-semibold text-foreground mt-1">
              {formatWorkedTime(item.temporaryExitMs)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-muted">⏱️ Норма 95%</Text>
            <Text className="text-xs font-semibold text-foreground mt-1">
              {formatWorkedHours(item.workedMs * 0.95)} ч
            </Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

export function AnimatedDetailsList({ dayStats }: AnimatedDetailsListProps) {
  const colors = useColors();

  const memoizedDayStats = useMemo(() => dayStats, [dayStats]);

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      className="rounded-lg p-4 mb-6"
      style={{ backgroundColor: colors.surface }}
    >
      <Text className="text-sm font-semibold text-foreground mb-4">📋 Детали по дням</Text>

      <FlatList
        data={memoizedDayStats}
        keyExtractor={(item) => item.date}
        scrollEnabled={false}
        renderItem={({ item, index }) => (
          <AnimatedDayItem
            item={item}
            index={index}
            borderColor={colors.border}
            getDayTypeColor={(dayType) => getDayTypeColor(dayType, colors)}
          />
        )}
      />
    </Animated.View>
  );
}
