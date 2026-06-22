import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { WorkDay } from '@/shared/types/workday';
import { calculateWorkDayStats, formatTime, formatTimeShort, getWorkDayStatusText, getWorkDayStatusColor } from '@/lib/storage/workdayStatsService';
import { getActiveBreakInterval, getActiveTemporaryExitInterval } from '@/lib/storage/workdayService';

interface WorkDayTimerProps {
  workDay: WorkDay | null;
}

export function WorkDayTimer({ workDay }: WorkDayTimerProps) {
  const colors = useColors();
  const [now, setNow] = useState(new Date());

  // Обновляем текущее время каждую секунду
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!workDay) {
    return null;
  }

  const stats = calculateWorkDayStats(workDay, now);
  const statusText = getWorkDayStatusText(workDay.status);
  const statusColor = getWorkDayStatusColor(workDay.status);

  // Получаем активный перерыв или выход
  const activeBreak = getActiveBreakInterval(workDay);
  const activeExit = getActiveTemporaryExitInterval(workDay);

  // Вычисляем время активного перерыва/выхода
  let activeIntervalMs = 0;
  if (activeBreak) {
    const startTime = new Date(activeBreak.startAt);
    activeIntervalMs = now.getTime() - startTime.getTime();
  } else if (activeExit) {
    const startTime = new Date(activeExit.startAt);
    activeIntervalMs = now.getTime() - startTime.getTime();
  }

  return (
    <View className="gap-6">
      {/* Статус */}
      <View className="items-center gap-2">
        <Text className="text-sm text-muted">Статус</Text>
        <View
          className="px-4 py-2 rounded-full"
          style={{ backgroundColor: `${statusColor}20` }}
        >
          <Text
            className="font-semibold text-base"
            style={{ color: statusColor }}
          >
            {statusText}
          </Text>
        </View>
      </View>

      {/* Главный таймер */}
      <View className="items-center gap-3">
        <Text className="text-sm text-muted">Отработано</Text>
        <View
          className="w-40 h-40 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-5xl font-bold text-white">
            {formatTime(stats.totalWorkMs)}
          </Text>
        </View>
        <Text className="text-2xl font-bold text-foreground">
          {formatTimeShort(stats.totalWorkMs)}
        </Text>
      </View>

      {/* Дополнительный таймер для активного перерыва/выхода */}
      {(activeBreak || activeExit) && (
        <View className="items-center gap-2 bg-surface rounded-lg p-4">
          <Text className="text-sm text-muted">
            {activeBreak ? 'Перерыв' : 'Временный выход'}
          </Text>
          <Text className="text-3xl font-bold text-foreground">
            {formatTime(activeIntervalMs)}
          </Text>
        </View>
      )}

      {/* Статистика */}
      <View className="flex-row gap-3">
        <View className="flex-1 bg-surface rounded-lg p-3 items-center">
          <Text className="text-xs text-muted mb-1">Перерывы</Text>
          <Text className="text-lg font-bold text-foreground">
            {formatTimeShort(stats.totalBreakMs)}
          </Text>
        </View>
        <View className="flex-1 bg-surface rounded-lg p-3 items-center">
          <Text className="text-xs text-muted mb-1">Выходы</Text>
          <Text className="text-lg font-bold text-foreground">
            {formatTimeShort(stats.totalTemporaryExitMs)}
          </Text>
        </View>
        <View className="flex-1 bg-surface rounded-lg p-3 items-center">
          <Text className="text-xs text-muted mb-1">95% норма</Text>
          <Text className="text-lg font-bold text-foreground">
            {formatTimeShort(stats.work95Ms)}
          </Text>
        </View>
      </View>
    </View>
  );
}
