/**
 * Компонент для отображения активной рабочей сессии
 * Показывает активную сессию, даже если она начата вчера
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { WorkDay } from '@/shared/types/workday';
import {
  formatDuration,
  msToHours,
  getDateFromISO,
} from '@/lib/utils/midnight-utils';
import {
  getActiveSessionInfo,
  calculateWorkDayStats,
  WORK_SESSION_LIMITS,
} from '@/lib/utils/workday-calculator';
import { useColors } from '@/hooks/use-colors';

interface ActiveWorkSessionCardProps {
  workDay: WorkDay | null;
  onEndWorkDay?: () => void;
  onTakeBreak?: () => void;
  onTemporaryExit?: () => void;
}

/**
 * Компонент для отображения активной рабочей сессии
 */
export function ActiveWorkSessionCard({
  workDay,
  onEndWorkDay,
  onTakeBreak,
  onTemporaryExit,
}: ActiveWorkSessionCardProps) {
  const colors = useColors();
  const [elapsedMs, setElapsedMs] = useState(0);

  // Обновляем прошедшее время каждую секунду
  useEffect(() => {
    if (!workDay?.workStartAt || workDay.status === 'completed') {
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const startTime = new Date(workDay.workStartAt!).getTime();
      setElapsedMs(Math.max(0, now - startTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [workDay?.workStartAt, workDay?.status]);

  if (!workDay || !workDay.workStartAt || workDay.status === 'completed') {
    return null;
  }

  const sessionInfo = getActiveSessionInfo(workDay);
  const stats = calculateWorkDayStats(workDay);
  const workHours = msToHours(stats.totalWorkMs);
  const isCrossingMidnight = sessionInfo.startDate && getDateFromISO(new Date().toISOString()) !== sessionInfo.startDate;

  // Определяем цвет карточки в зависимости от статуса
  let cardBackgroundColor = colors.surface;
  let borderColor = colors.border;
  let statusTextColor = colors.foreground;

  if (stats.requiresReview) {
    cardBackgroundColor = colors.error;
    borderColor = colors.error;
    statusTextColor = '#ffffff';
  } else if (stats.warningMessage) {
    cardBackgroundColor = colors.warning;
    borderColor = colors.warning;
    statusTextColor = '#ffffff';
  }

  return (
    <View
      className="mx-4 mb-4 rounded-lg border p-4"
      style={{
        backgroundColor: cardBackgroundColor,
        borderColor: borderColor,
        borderWidth: 1,
      }}
    >
      {/* Заголовок */}
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-lg font-bold" style={{ color: statusTextColor }}>
          {isCrossingMidnight ? '🌙 Активная сессия' : '⏱️ Рабочий день'}
        </Text>
        {stats.requiresReview && (
          <Text className="text-sm font-semibold" style={{ color: statusTextColor }}>
            ⚠️ Требует проверки
          </Text>
        )}
      </View>

      {/* Информация о времени */}
      <View className="mb-3 gap-2">
        <View className="flex-row justify-between">
          <Text style={{ color: statusTextColor }}>Начало:</Text>
          <Text className="font-semibold" style={{ color: statusTextColor }}>
            {sessionInfo.startDate} {sessionInfo.startTime}
          </Text>
        </View>

        {isCrossingMidnight && (
          <View className="flex-row justify-between">
            <Text style={{ color: statusTextColor }}>Дата начала:</Text>
            <Text className="font-semibold" style={{ color: statusTextColor }}>
              {sessionInfo.startDate}
            </Text>
          </View>
        )}

        <View className="flex-row justify-between">
          <Text style={{ color: statusTextColor }}>Прошло времени:</Text>
          <Text className="font-semibold" style={{ color: statusTextColor }}>
            {formatDuration(elapsedMs)}
          </Text>
        </View>

        {workDay.status === 'on_break' && (
          <View className="flex-row justify-between">
            <Text style={{ color: statusTextColor }}>Статус:</Text>
            <Text className="font-semibold" style={{ color: statusTextColor }}>
              ☕ На перерыве
            </Text>
          </View>
        )}

        {workDay.status === 'on_temporary_exit' && (
          <View className="flex-row justify-between">
            <Text style={{ color: statusTextColor }}>Статус:</Text>
            <Text className="font-semibold" style={{ color: statusTextColor }}>
              🚪 Временный выход
            </Text>
          </View>
        )}
      </View>

      {/* Предупреждение или сообщение об ошибке */}
      {stats.warningMessage && (
        <View className="mb-3 rounded bg-opacity-20 p-2" style={{ backgroundColor: statusTextColor }}>
          <Text className="text-sm" style={{ color: statusTextColor }}>
            {stats.warningMessage}
          </Text>
        </View>
      )}

      {stats.requiresReview && stats.reviewReason && (
        <View className="mb-3 rounded bg-opacity-20 p-2" style={{ backgroundColor: statusTextColor }}>
          <Text className="text-sm font-semibold" style={{ color: statusTextColor }}>
            {stats.reviewReason}
          </Text>
        </View>
      )}

      {/* Кнопки действий */}
      <View className="gap-2">
        {workDay.status === 'working' && (
          <>
            <Pressable
              onPress={onTakeBreak}
              className="rounded-lg bg-opacity-80 py-2"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-center font-semibold text-white">☕ Начать перерыв</Text>
            </Pressable>

            <Pressable
              onPress={onTemporaryExit}
              className="rounded-lg bg-opacity-80 py-2"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-center font-semibold text-white">🚪 Временный выход</Text>
            </Pressable>

            <Pressable
              onPress={onEndWorkDay}
              className="rounded-lg bg-opacity-80 py-2"
              style={{ backgroundColor: colors.success }}
            >
              <Text className="text-center font-semibold text-white">✓ Завершить день</Text>
            </Pressable>
          </>
        )}

        {workDay.status === 'on_break' && (
          <Pressable
            onPress={onEndWorkDay}
            className="rounded-lg bg-opacity-80 py-2"
            style={{ backgroundColor: colors.success }}
          >
            <Text className="text-center font-semibold text-white">✓ Продолжить работу</Text>
          </Pressable>
        )}

        {workDay.status === 'on_temporary_exit' && (
          <Pressable
            onPress={onEndWorkDay}
            className="rounded-lg bg-opacity-80 py-2"
            style={{ backgroundColor: colors.success }}
          >
            <Text className="text-center font-semibold text-white">✓ Вернуться</Text>
          </Pressable>
        )}
      </View>

      {/* Информация о пересечении полночи */}
      {isCrossingMidnight && (
        <View className="mt-3 border-t border-opacity-30 pt-3" style={{ borderColor: statusTextColor }}>
          <Text className="text-xs" style={{ color: statusTextColor }}>
            ℹ️ Рабочий день начался {sessionInfo.startDate} и продолжается на следующие сутки
          </Text>
        </View>
      )}
    </View>
  );
}
