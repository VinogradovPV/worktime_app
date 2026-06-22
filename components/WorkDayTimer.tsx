import React, { useState, useEffect } from 'react';
import { View, Text, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/use-colors';
import { WorkDay } from '@/shared/types/workday';
import { calculateWorkDayStats, formatTime, formatTimeShort, getWorkDayStatusText, getWorkDayStatusColor } from '@/lib/storage/workdayStatsService';
import { getActiveBreakInterval, getActiveTemporaryExitInterval } from '@/lib/storage/workdayService';
import { AnimatedTimer } from './AnimatedTimer';

interface WorkDayTimerProps {
  workDay: WorkDay | null;
}

export function WorkDayTimer({ workDay }: WorkDayTimerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(new Date());
  const screenWidth = Dimensions.get('window').width;

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
        <AnimatedTimer 
          time={formatTime(stats.totalWorkMs)} 
          isRunning={workDay.status === 'working'}
          status={
            workDay.status === 'working' ? 'working' :
            workDay.status === 'on_break' ? 'break' :
            workDay.status === 'on_temporary_exit' ? 'exit' : 'idle'
          }
          size={Math.min(screenWidth - 32, 200)}
        />
        <Text className="text-lg font-semibold text-foreground">
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
        <View className="flex-1 bg-surface rounded-lg p-4 items-center" style={{ borderColor: colors.border, borderWidth: 1 }}>
          <Text className="text-xs font-semibold text-muted mb-2">Перерывы</Text>
          <Text className="text-xl font-bold text-foreground">
            {formatTimeShort(stats.totalBreakMs)}
          </Text>
        </View>
        <View className="flex-1 bg-surface rounded-lg p-4 items-center" style={{ borderColor: colors.border, borderWidth: 1 }}>
          <Text className="text-xs font-semibold text-muted mb-2">Выходы</Text>
          <Text className="text-xl font-bold text-foreground">
            {formatTimeShort(stats.totalTemporaryExitMs)}
          </Text>
        </View>
        <View className="flex-1 bg-surface rounded-lg p-4 items-center" style={{ borderColor: colors.border, borderWidth: 1 }}>
          <Text className="text-xs font-semibold text-muted mb-2">95% времени</Text>
          <Text className="text-xl font-bold text-foreground">
            {formatTimeShort(stats.work95Ms)}
          </Text>
        </View>
      </View>
    </View>
  );
}
