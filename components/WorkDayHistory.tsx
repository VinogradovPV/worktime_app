import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { WorkDay, WorkEvent } from '@/shared/types/workday';
import { formatTime } from '@/lib/storage/workdayStatsService';
import { getActiveBreakInterval, getActiveTemporaryExitInterval } from '@/lib/storage/workdayService';

interface WorkDayHistoryProps {
  workDay: WorkDay | null;
}

const EVENT_LABELS: Record<WorkEvent['type'], string> = {
  work_start: 'Начало работы',
  work_end: 'Завершение работы',
  break_start: 'Начало перерыва',
  break_end: 'Конец перерыва',
  temporary_exit_start: 'Начало выхода',
  temporary_exit_end: 'Возврат',
};

const EVENT_COLORS: Record<WorkEvent['type'], string> = {
  work_start: '#22C55E',
  work_end: '#0a7ea4',
  break_start: '#F59E0B',
  break_end: '#22C55E',
  temporary_exit_start: '#F97316',
  temporary_exit_end: '#22C55E',
};

export function WorkDayHistory({ workDay }: WorkDayHistoryProps) {
  const colors = useColors();

  if (!workDay || workDay.events.length === 0) {
    return (
      <View className="items-center justify-center py-8">
        <Text className="text-muted text-sm">История событий пуста</Text>
      </View>
    );
  }

  // Сортируем события по времени
  const sortedEvents = [...workDay.events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Получаем активные интервалы
  const activeBreak = getActiveBreakInterval(workDay);
  const activeExit = getActiveTemporaryExitInterval(workDay);

  return (
    <ScrollView className="gap-2">
      {sortedEvents.map((event, index) => {
        const label = EVENT_LABELS[event.type];
        const color = EVENT_COLORS[event.type];
        const timestamp = new Date(event.timestamp);
        const timeStr = timestamp.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        // Проверяем, активен ли этот интервал
        let isActive = false;
        let duration = '';

        if (event.type === 'break_start' && activeBreak?.startAt === event.timestamp) {
          isActive = true;
          const now = new Date();
          const startTime = new Date(event.timestamp);
          const durationMs = now.getTime() - startTime.getTime();
          duration = ` (идет ${formatTime(durationMs)})`;
        } else if (event.type === 'temporary_exit_start' && activeExit?.startAt === event.timestamp) {
          isActive = true;
          const now = new Date();
          const startTime = new Date(event.timestamp);
          const durationMs = now.getTime() - startTime.getTime();
          duration = ` (идет ${formatTime(durationMs)})`;
        }

        return (
          <View
            key={event.id}
            className="flex-row items-center gap-3 bg-surface rounded-lg p-3"
          >
            {/* Индикатор цвета */}
            <View
              className="w-1 h-12 rounded-full"
              style={{ backgroundColor: color }}
            />

            {/* Содержимое */}
            <View className="flex-1">
              <Text className="font-semibold text-foreground">
                {label}
                {isActive && <Text className="text-primary"> (идет...)</Text>}
              </Text>
              <Text className="text-xs text-muted mt-1">
                {timeStr}
                {duration}
              </Text>
            </View>

            {/* Номер события */}
            <View
              className="w-6 h-6 rounded-full items-center justify-center"
              style={{ backgroundColor: `${color}20` }}
            >
              <Text className="text-xs font-bold" style={{ color }}>
                {index + 1}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
