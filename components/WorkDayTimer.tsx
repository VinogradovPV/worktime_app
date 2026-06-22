import React, { useState, useEffect } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { WorkDay } from '@/shared/types/workday';
import { calculateWorkDayStats, formatTime, formatTimeShort, getWorkDayStatusText, getWorkDayStatusColor } from '@/lib/storage/workdayStatsService';
import { getActiveBreakInterval, getActiveTemporaryExitInterval } from '@/lib/storage/workdayService';
import { AnimatedTimer } from './AnimatedTimer';

interface WorkDayTimerProps {
  workDay: WorkDay | null;
}

const WORK_DAY_NORM_MS = 8 * 60 * 60 * 1000; // 8 часов

export function WorkDayTimer({ workDay }: WorkDayTimerProps) {
  const colors = useColors();
  const [now, setNow] = useState(new Date());
  const screenWidth = Dimensions.get('window').width;

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

  const activeBreak = getActiveBreakInterval(workDay);
  const activeExit = getActiveTemporaryExitInterval(workDay);

  let activeIntervalMs = 0;
  if (activeBreak) {
    activeIntervalMs = now.getTime() - new Date(activeBreak.startAt).getTime();
  } else if (activeExit) {
    activeIntervalMs = now.getTime() - new Date(activeExit.startAt).getTime();
  }

  // Прогресс нормы рабочего дня (0..1)
  const normProgress = Math.min(stats.totalWorkMs / WORK_DAY_NORM_MS, 1);
  const normPercent = Math.round(normProgress * 100);
  const normColor = normProgress >= 1 ? colors.success : normProgress >= 0.75 ? colors.primary : normProgress >= 0.5 ? colors.warning : colors.muted;

  // Размер таймера — больше на главном экране
  const timerSize = Math.min(screenWidth - 64, 240);

  return (
    <View style={{ gap: 20 }}>
      {/* Статус */}
      <View style={{ alignItems: 'center', gap: 6 }}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: `${statusColor}20`,
          }}
        >
          <Text style={{ fontWeight: '600', fontSize: 15, color: statusColor }}>
            {statusText}
          </Text>
        </View>
      </View>

      {/* Главный таймер — увеличен */}
      <View style={{ alignItems: 'center', gap: 8 }}>
        <AnimatedTimer
          time={formatTime(stats.totalWorkMs)}
          isRunning={workDay.status === 'working'}
          status={
            workDay.status === 'working' ? 'working' :
            workDay.status === 'on_break' ? 'break' :
            workDay.status === 'on_temporary_exit' ? 'exit' : 'idle'
          }
          size={timerSize}
        />
      </View>

      {/* Прогресс нормы рабочего дня */}
      {workDay.status !== 'not_started' && (
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted }}>
              Норма рабочего дня
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: normColor }}>
              {normPercent}% · {formatTimeShort(stats.totalWorkMs)} / 8ч
            </Text>
          </View>
          <View
            style={{
              height: 6,
              backgroundColor: colors.border,
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${normPercent}%`,
                backgroundColor: normColor,
                borderRadius: 3,
              }}
            />
          </View>
        </View>
      )}

      {/* Активный перерыв/выход */}
      {(activeBreak || activeExit) && (
        <View
          style={{
            alignItems: 'center',
            gap: 4,
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 14,
          }}
        >
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {activeBreak ? '⏸ Перерыв' : '↗ Временный выход'}
          </Text>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.foreground }}>
            {formatTime(activeIntervalMs)}
          </Text>
        </View>
      )}

      {/* Статистика — три карточки */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 12,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '600', color: colors.muted, marginBottom: 4 }}>Перерывы</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>
            {formatTimeShort(stats.totalBreakMs)}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 12,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '600', color: colors.muted, marginBottom: 4 }}>Выходы</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>
            {formatTimeShort(stats.totalTemporaryExitMs)}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 12,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '600', color: colors.muted, marginBottom: 4 }}>95% нормы</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>
            {formatTimeShort(stats.work95Ms)}
          </Text>
        </View>
      </View>
    </View>
  );
}
