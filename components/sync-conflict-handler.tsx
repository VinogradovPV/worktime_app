/**
 * SyncConflictHandler — компонент для разрешения конфликтов синхронизации
 * 
 * Отображает модальное окно при наличии конфликтов (requires_review статус)
 * и позволяет пользователю выбрать действие:
 * - Принять локальные изменения
 * - Принять серверные изменения
 * - Пересчитать рабочий день через API
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { cn } from '@/lib/utils';
import { useColors } from '@/hooks/use-colors';
import { SyncStatusInfo } from '@/shared/types/sync';

interface ConflictItem {
  id: string;
  date: string;
  status: 'requires_review' | 'conflict';
  message: string;
  total_events: number;
  synced_count: number;
  failed_count: number;
  last_updated: string;
  error_message?: string;
}

interface SyncConflictHandlerProps {
  visible: boolean;
  conflicts: ConflictItem[];
  onResolve: (conflictId: string, resolution: 'local' | 'server' | 'recalculate') => Promise<void>;
  onClose: () => void;
}

/**
 * SyncConflictHandler компонент
 */
export function SyncConflictHandler({
  visible,
  conflicts,
  onResolve,
  onClose,
}: SyncConflictHandlerProps) {
  const colors = useColors();
  const [resolving, setResolving] = useState<string | null>(null);
  const [selectedConflict, setSelectedConflict] = useState<ConflictItem | null>(null);

  useEffect(() => {
    if (visible && conflicts.length > 0) {
      setSelectedConflict(conflicts[0]);
    }
  }, [visible, conflicts]);

  const handleResolve = async (resolution: 'local' | 'server' | 'recalculate') => {
    if (!selectedConflict) return;

    setResolving(selectedConflict.id);

    try {
      await onResolve(selectedConflict.id, resolution);

      // Переместиться на следующий конфликт или закрыть
      const currentIndex = conflicts.findIndex((c) => c.id === selectedConflict.id);
      if (currentIndex < conflicts.length - 1) {
        setSelectedConflict(conflicts[currentIndex + 1]);
      } else {
        onClose();
      }
    } catch (error) {
      Alert.alert('Ошибка', `Не удалось разрешить конфликт: ${error}`);
    } finally {
      setResolving(null);
    }
  };

  if (!visible || !selectedConflict) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 bg-black/50 justify-end"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        {/* Модальное окно */}
        <View
          className="bg-background rounded-t-3xl p-6"
          style={{ backgroundColor: colors.background }}
        >
          {/* Заголовок */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-foreground mb-2">
              Конфликт синхронизации
            </Text>
            <Text className="text-sm text-muted">
              Найдено {conflicts.length} конфликт(ов). Выберите способ разрешения.
            </Text>
          </View>

          {/* Информация о конфликте */}
          <ScrollView className="mb-6 max-h-48">
            <View
              className="bg-surface rounded-lg p-4 mb-4 border border-border"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <Text className="text-sm font-semibold text-foreground mb-2">
                Дата: {selectedConflict.date}
              </Text>
              <Text className="text-xs text-muted mb-1">
                Статус: {selectedConflict.status === 'requires_review' ? 'Требует проверки' : 'Конфликт'}
              </Text>
              <Text className="text-xs text-muted mb-1">
                Сообщение: {selectedConflict.message}
              </Text>
              <Text className="text-xs text-muted mb-1">
                Последнее обновление: {new Date(selectedConflict.last_updated).toLocaleString()}
              </Text>

              {selectedConflict.error_message && (
                <View className="mt-3 pt-3 border-t border-border">
                  <Text className="text-xs font-semibold text-error mb-1">
                    Ошибка:
                  </Text>
                  <Text className="text-xs text-error">
                    {selectedConflict.error_message}
                  </Text>
                </View>
              )}
            </View>

            {/* Статистика */}
            <View
              className="bg-surface rounded-lg p-4 border border-border"
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            >
              <Text className="text-sm font-semibold text-foreground mb-3">
                Статистика синхронизации:
              </Text>
              <View className="flex-row justify-between mb-2">
                <Text className="text-xs text-muted">Всего событий:</Text>
                <Text className="text-xs font-semibold text-foreground">
                  {selectedConflict.total_events}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-xs text-muted">Синхронизировано:</Text>
                <Text className="text-xs font-semibold text-success">
                  {selectedConflict.synced_count}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-xs text-muted">Ошибок:</Text>
                <Text className="text-xs font-semibold text-error">
                  {selectedConflict.failed_count}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Кнопки действий */}
          <View className="gap-3 mb-4">
            {/* Принять локальные изменения */}
            <TouchableOpacity
              onPress={() => handleResolve('local')}
              disabled={resolving !== null}
              className={cn(
                'py-3 px-4 rounded-lg flex-row items-center justify-center',
                resolving === selectedConflict.id
                  ? 'opacity-50'
                  : 'opacity-100'
              )}
              style={{
                backgroundColor: colors.primary,
              }}
            >
              {resolving === selectedConflict.id ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text className="text-base font-semibold text-background">
                  ✓ Принять локальные изменения
                </Text>
              )}
            </TouchableOpacity>

            {/* Принять серверные изменения */}
            <TouchableOpacity
              onPress={() => handleResolve('server')}
              disabled={resolving !== null}
              className={cn(
                'py-3 px-4 rounded-lg flex-row items-center justify-center border',
                resolving === selectedConflict.id
                  ? 'opacity-50'
                  : 'opacity-100'
              )}
              style={{
                borderColor: colors.border,
              }}
            >
              {resolving === selectedConflict.id ? (
                <ActivityIndicator color={colors.foreground} size="small" />
              ) : (
                <Text className="text-base font-semibold text-foreground">
                  ↻ Принять серверные изменения
                </Text>
              )}
            </TouchableOpacity>

            {/* Пересчитать рабочий день */}
            <TouchableOpacity
              onPress={() => handleResolve('recalculate')}
              disabled={resolving !== null}
              className={cn(
                'py-3 px-4 rounded-lg flex-row items-center justify-center border',
                resolving === selectedConflict.id
                  ? 'opacity-50'
                  : 'opacity-100'
              )}
              style={{
                borderColor: colors.border,
              }}
            >
              {resolving === selectedConflict.id ? (
                <ActivityIndicator color={colors.foreground} size="small" />
              ) : (
                <Text className="text-base font-semibold text-foreground">
                  🔄 Пересчитать рабочий день
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Кнопка закрытия */}
          <TouchableOpacity
            onPress={onClose}
            disabled={resolving !== null}
            className="py-3 px-4 rounded-lg"
            style={{
              backgroundColor: colors.surface,
              opacity: resolving !== null ? 0.5 : 1,
            }}
          >
            <Text className="text-center text-base font-semibold text-foreground">
              Закрыть
            </Text>
          </TouchableOpacity>

          {/* Прогресс */}
          {conflicts.length > 1 && (
            <Text className="text-center text-xs text-muted mt-4">
              Конфликт {conflicts.findIndex((c) => c.id === selectedConflict.id) + 1} из {conflicts.length}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

/**
 * Hook для управления конфликтами синхронизации
 */
export function useSyncConflictHandler() {
  const [visible, setVisible] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);

  const checkConflicts = async (userId: string) => {
    try {
      // TODO: Получить конфликты из API
      // const response = await fetch(`${API_BASE_URL}/api/v1/sync/conflicts?user_id=${userId}`);
      // const data = await response.json();
      // setConflicts(data.conflicts);
      
      console.log('[SyncConflictHandler] Проверка конфликтов для пользователя:', userId);
    } catch (error) {
      console.error('[SyncConflictHandler] Ошибка проверки конфликтов:', error);
    }
  };

  const resolveConflict = async (
    conflictId: string,
    resolution: 'local' | 'server' | 'recalculate'
  ) => {
    try {
      // TODO: Отправить разрешение конфликта на сервер
      // const response = await fetch(`${API_BASE_URL}/api/v1/sync/conflicts/${conflictId}/resolve`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ resolution }),
      // });

      console.log(`[SyncConflictHandler] Разрешение конфликта: ${conflictId} -> ${resolution}`);

      // Обновить список конфликтов
      setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
    } catch (error) {
      console.error('[SyncConflictHandler] Ошибка разрешения конфликта:', error);
      throw error;
    }
  };

  return {
    visible,
    conflicts,
    setVisible,
    checkConflicts,
    resolveConflict,
  };
}
