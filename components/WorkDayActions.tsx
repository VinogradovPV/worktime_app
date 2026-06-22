import React from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { WorkDay } from '@/shared/types/workday';
import { cn } from '@/lib/utils';

interface WorkDayActionsProps {
  workDay: WorkDay | null;
  availableActions: string[];
  onAction: (action: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  start: { label: 'Начать работу', color: '#22C55E' },
  start_break: { label: 'Перерыв', color: '#F59E0B' },
  end_break: { label: 'Продолжить работу', color: '#22C55E' },
  start_temporary_exit: { label: 'Выход', color: '#F97316' },
  end_temporary_exit: { label: 'Вернуться', color: '#22C55E' },
  complete: { label: 'Завершить день', color: '#0a7ea4' },
};

export function WorkDayActions({
  workDay,
  availableActions,
  onAction,
  loading = false,
  error,
}: WorkDayActionsProps) {
  const colors = useColors();

  if (!workDay) {
    return null;
  }

  return (
    <View className="gap-3">
      {/* Ошибка */}
      {error && (
        <View className="bg-error/10 border border-error rounded-lg p-3">
          <Text className="text-error text-sm">{error}</Text>
        </View>
      )}

      {/* Кнопки действий */}
      <View className="flex-row flex-wrap gap-2">
        {availableActions.map((action) => {
          const config = ACTION_LABELS[action];
          if (!config) return null;

          return (
            <TouchableOpacity
              key={action}
              disabled={loading}
              onPress={() => onAction(action)}
              className="flex-1 min-w-[45%] rounded-lg py-3 px-4 items-center justify-center"
              style={{
                backgroundColor: config.color,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white font-semibold text-center">
                  {config.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
