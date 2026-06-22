import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { cn } from '@/lib/utils';

interface WorkTimeWidgetProps {
  currentTime: string; // HH:MM:SS
  status: 'not_started' | 'working' | 'on_break' | 'completed';
  onStartStop?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export function WorkTimeWidget({
  currentTime,
  status,
  onStartStop,
  size = 'small',
}: WorkTimeWidgetProps) {
  const colors = useColors();

  const statusText = {
    not_started: 'Не на работе',
    working: 'На работе',
    on_break: 'На перерыве',
    completed: 'Завершено',
  };

  const statusColor = {
    not_started: colors.muted,
    working: colors.success,
    on_break: colors.warning,
    completed: colors.border,
  };

  const sizeStyles = {
    small: 'p-3 rounded-lg',
    medium: 'p-4 rounded-xl',
    large: 'p-6 rounded-2xl',
  };

  const textSizes = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-4xl',
  };

  return (
    <View
      className={cn('gap-2', sizeStyles[size])}
      style={{ backgroundColor: colors.surface }}
    >
      {/* Статус */}
      <Text className="text-xs font-semibold text-muted uppercase">
        {statusText[status]}
      </Text>

      {/* Время */}
      <Text className={cn('font-bold text-foreground', textSizes[size])}>
        {currentTime}
      </Text>

      {/* Кнопка старт/стоп */}
      {onStartStop && size !== 'small' && (
        <Pressable
          onPress={onStartStop}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
          })}
          className={cn(
            'mt-2 py-2 px-3 rounded-lg items-center',
            status === 'working' ? 'bg-error' : 'bg-success'
          )}
        >
          <Text className="text-white text-xs font-semibold">
            {status === 'working' ? 'Завершить' : 'Начать'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

interface DailyStatsWidgetProps {
  totalWorkTime: string; // HH:MM
  breakTime: string; // HH:MM
  workPercentage: number; // 0-100
  size?: 'small' | 'medium' | 'large';
}

export function DailyStatsWidget({
  totalWorkTime,
  breakTime,
  workPercentage,
  size = 'medium',
}: DailyStatsWidgetProps) {
  const colors = useColors();

  const sizeStyles = {
    small: 'p-3 rounded-lg gap-2',
    medium: 'p-4 rounded-xl gap-3',
    large: 'p-6 rounded-2xl gap-4',
  };

  return (
    <View
      className={cn('gap-3', sizeStyles[size])}
      style={{ backgroundColor: colors.surface }}
    >
      {/* Заголовок */}
      <Text className="text-xs font-semibold text-muted uppercase">
        Статистика дня
      </Text>

      {/* Рабочее время */}
      <View className="gap-1">
        <Text className="text-xs text-muted">Рабочее время</Text>
        <Text className="text-xl font-bold text-foreground">{totalWorkTime}</Text>
      </View>

      {/* Перерывы */}
      <View className="gap-1">
        <Text className="text-xs text-muted">Перерывы</Text>
        <Text className="text-lg font-semibold text-foreground">{breakTime}</Text>
      </View>

      {/* Прогресс */}
      <View className="gap-1">
        <View className="flex-row justify-between">
          <Text className="text-xs text-muted">Прогресс</Text>
          <Text className="text-xs font-semibold text-foreground">
            {workPercentage}%
          </Text>
        </View>
        <View
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: colors.border }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.min(workPercentage, 100)}%`,
              backgroundColor: colors.success,
            }}
          />
        </View>
      </View>
    </View>
  );
}

interface HourlyActivityWidgetProps {
  hours: number[];
  size?: 'small' | 'medium' | 'large';
}

export function HourlyActivityWidget({
  hours,
  size = 'large',
}: HourlyActivityWidgetProps) {
  const colors = useColors();

  const sizeStyles = {
    small: 'p-3 rounded-lg',
    medium: 'p-4 rounded-xl',
    large: 'p-6 rounded-2xl',
  };

  const maxHours = Math.max(...hours, 1);

  return (
    <View
      className={cn('gap-3', sizeStyles[size])}
      style={{ backgroundColor: colors.surface }}
    >
      {/* Заголовок */}
      <Text className="text-xs font-semibold text-muted uppercase">
        Активность по часам
      </Text>

      {/* График */}
      <View className="flex-row items-end gap-1 h-20">
        {hours.slice(0, 24).map((hour, index) => (
          <View
            key={index}
            className="flex-1 items-center gap-1"
            style={{ height: '100%' }}
          >
            <View
              className="w-full rounded-t"
              style={{
                height: `${(hour / maxHours) * 100}%`,
                backgroundColor: hour > 0 ? colors.primary : colors.border,
              }}
            />
            <Text className="text-xs text-muted">{index}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
