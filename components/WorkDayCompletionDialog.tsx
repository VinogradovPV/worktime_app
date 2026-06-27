/**
 * Диалог для завершения незавершенного рабочего дня
 * Показывает запрос: "Вы не завершили рабочий день. Укажите время завершения."
 */

import React, { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, Alert } from 'react-native';
import { WorkDay } from '@/shared/types/workday';
import { formatDuration, msToHours } from '@/lib/utils/midnight-utils';
import { calculateWorkDayStats } from '@/lib/utils/workday-calculator';
import { useColors } from '@/hooks/use-colors';

interface WorkDayCompletionDialogProps {
  visible: boolean;
  workDay: WorkDay | null;
  onComplete: (endTime: string) => void;
  onCancel: () => void;
}

/**
 * Компонент диалога для завершения рабочего дня
 */
export function WorkDayCompletionDialog({
  visible,
  workDay,
  onComplete,
  onCancel,
}: WorkDayCompletionDialogProps) {
  const colors = useColors();
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');

  if (!workDay?.workStartAt) {
    return null;
  }

  const handleComplete = () => {
    // Валидация времени
    if (!endTime.trim()) {
      setError('Пожалуйста, укажите время завершения');
      return;
    }

    // Проверяем формат времени (HH:MM или HH:MM:SS)
    const timeRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
    const match = endTime.match(timeRegex);

    if (!match) {
      setError('Неверный формат времени. Используйте HH:MM или HH:MM:SS');
      return;
    }

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = match[3] ? parseInt(match[3], 10) : 0;

    if (hours > 23 || minutes > 59 || seconds > 59) {
      setError('Неверное время');
      return;
    }

    // Получаем дату начала рабочего дня
    const startDate = workDay.workStartAt!.split('T')[0];
    
    // Определяем дату завершения
    // Если время завершения меньше времени начала, то это следующий день
    const startTimeStr = workDay.workStartAt!.split('T')[1];
    const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
    
    let endDate = startDate;
    if (hours < startHours || (hours === startHours && minutes < startMinutes)) {
      // Это следующий день
      const nextDay = new Date(startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      endDate = nextDay.toISOString().split('T')[0];
    }

    // Формируем ISO 8601 строку
    const endTimeISO = `${endDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.000Z`;

    onComplete(endTimeISO);
    setEndTime('');
    setError('');
  };

  const stats = workDay && workDay.workStartAt ? calculateWorkDayStats(workDay) : null;
  const workHours = stats ? msToHours(stats.totalWorkMs) : 0;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/50">
        <View
          className="w-4/5 rounded-lg p-6"
          style={{ backgroundColor: colors.surface }}
        >
          {/* Заголовок */}
          <Text className="mb-4 text-xl font-bold" style={{ color: colors.foreground }}>
            ⚠️ Завершить рабочий день
          </Text>

          {/* Сообщение */}
          <Text className="mb-4 text-base" style={{ color: colors.muted }}>
            Вы не завершили рабочий день. Пожалуйста, укажите время завершения.
          </Text>

          {/* Информация о текущей сессии */}
          <View className="mb-4 rounded-lg bg-opacity-50 p-3" style={{ backgroundColor: colors.primary }}>
            <Text className="text-sm text-white">
              Начало: {workDay.workStartAt?.split('T')[1]?.substring(0, 5)}
            </Text>
            <Text className="text-sm text-white">
              Прошло времени: {formatDuration(stats?.totalWorkMs || 0)}
            </Text>
          </View>

          {/* Поле ввода времени */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-semibold" style={{ color: colors.foreground }}>
              Время завершения (HH:MM):
            </Text>
            <TextInput
              value={endTime}
              onChangeText={(text) => {
                setEndTime(text);
                setError('');
              }}
              placeholder="14:30"
              placeholderTextColor={colors.muted}
              className="rounded-lg border px-3 py-2"
              style={{
                borderColor: error ? colors.error : colors.border,
                borderWidth: 1,
                color: colors.foreground,
              }}
              keyboardType="numbers-and-punctuation"
            />
            {error && (
              <Text className="mt-1 text-xs" style={{ color: colors.error }}>
                {error}
              </Text>
            )}
          </View>

          {/* Кнопки */}
          <View className="flex-row gap-3">
            <Pressable
              onPress={onCancel}
              className="flex-1 rounded-lg border py-3"
              style={{ borderColor: colors.border, borderWidth: 1 }}
            >
              <Text className="text-center font-semibold" style={{ color: colors.foreground }}>
                Отмена
              </Text>
            </Pressable>

            <Pressable
              onPress={handleComplete}
              className="flex-1 rounded-lg py-3"
              style={{ backgroundColor: colors.success }}
            >
              <Text className="text-center font-semibold text-white">
                Завершить
              </Text>
            </Pressable>
          </View>

          {/* Подсказка */}
          <Text className="mt-4 text-xs" style={{ color: colors.muted }}>
            ℹ️ Если время завершения раньше времени начала, день будет завершен на следующие сутки.
          </Text>
        </View>
      </View>
    </Modal>
  );
}
