import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, LayoutChangeEvent } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useColors } from '@/hooks/use-colors';
import { ReportDayStats } from '@/lib/storage/reportStatsService';

interface VirtualizedDetailsListProps {
  dayStats: ReportDayStats[];
  onDayPress?: (day: ReportDayStats) => void;
  isLoading?: boolean;
}

/**
 * Компонент виртуализированного списка для отображения деталей по дням
 * Оптимизирован для больших периодов (год, несколько месяцев)
 * 
 * Использует FlatList с виртуализацией для эффективного рендеринга
 */
export function VirtualizedDetailsList({
  dayStats,
  onDayPress,
  isLoading = false,
}: VirtualizedDetailsListProps) {
  const colors = useColors();
  const [containerHeight, setContainerHeight] = useState(0);

  // Мемоизируем данные для оптимизации
  const memoizedData = useMemo(() => dayStats, [dayStats]);

  // Функция для получения цвета типа дня
  const getDayTypeColor = useCallback((dayType: string): string => {
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
  }, [colors]);

  // Функция для получения названия типа дня
  const getDayTypeLabel = useCallback((dayType: string): string => {
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
  }, []);

  // Функция для форматирования времени
  const formatTime = useCallback((ms: number): string => {
    const hours = Math.floor(ms / (1000 * 3600));
    const minutes = Math.floor((ms % (1000 * 3600)) / (1000 * 60));
    if (hours === 0) {
      return `${minutes}м`;
    }
    return `${hours}ч ${minutes}м`;
  }, []);

  // Компонент для отдельной строки
  const renderDayRow = useCallback(
    ({ item, index }: { item: ReportDayStats; index: number }) => {
      const dayColor = getDayTypeColor(item.dayType);
      const dayLabel = getDayTypeLabel(item.dayType);
      const date = new Date(item.date);
      const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' });
      const dayNum = date.getDate();

      return (
        <Animated.View
          entering={FadeInDown.delay(Math.min(index * 20, 200)).duration(300)}
          exiting={FadeOut.duration(200)}
        >
          <Pressable
            onPress={() => onDayPress?.(item)}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
              {/* Дата и день недели */}
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">
                  {dayName}, {dayNum}
                </Text>
              </View>

              {/* Тип дня */}
              <View
                className="px-2 py-1 rounded mr-3"
                style={{
                  backgroundColor: dayColor + '20',
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: dayColor }}
                >
                  {dayLabel}
                </Text>
              </View>

              {/* Отработано */}
              <View className="flex-row items-center gap-3 min-w-max">
                <View className="items-end">
                  <Text className="text-xs text-muted">Отработано</Text>
                  <Text className="text-sm font-semibold text-success">
                    {formatTime(item.workedMs)}
                  </Text>
                </View>

                {/* Требует проверки */}
                {item.requiresCheck && (
                  <View
                    className="w-6 h-6 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.error + '30' }}
                  >
                    <Text className="text-xs">⚠️</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        </Animated.View>
      );
    },
    [getDayTypeColor, getDayTypeLabel, formatTime, onDayPress, colors]
  );

  // Ключ для элемента (важно для виртуализации)
  const keyExtractor = useCallback((item: ReportDayStats, index: number) => {
    return `${item.date}-${index}`;
  }, []);

  // Функция для оптимизации рендеринга
  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: 60, // Примерная высота элемента
      offset: 60 * index,
      index,
    }),
    []
  );

  if (isLoading) {
    return (
      <View className="px-4 py-4">
        <Text className="text-center text-muted">Загрузка данных...</Text>
      </View>
    );
  }

  if (memoizedData.length === 0) {
    return (
      <View className="px-4 py-4">
        <Text className="text-center text-muted">Нет данных для отображения</Text>
      </View>
    );
  }

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => {
        setContainerHeight(event.nativeEvent.layout.height);
      }}
      className="flex-1"
    >
      <FlatList
        data={memoizedData}
        renderItem={renderDayRow}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        initialNumToRender={10}
        maxToRenderPerBatch={20}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={true}
        scrollEventThrottle={16}
        windowSize={10}
        className="flex-1"
      />
    </View>
  );
}
