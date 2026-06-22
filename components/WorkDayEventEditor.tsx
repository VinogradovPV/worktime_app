import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { WorkDay, WorkEventType } from '@/shared/types/workday';
import { WorkDayValidator, ValidationError } from '@/lib/storage/workdayValidationService';
import { getTodayWorkDay, addWorkEvent } from '@/lib/storage/workdayService';
import { cn } from '@/lib/utils';

interface WorkDayEventEditorProps {
  visible: boolean;
  workDay: WorkDay;
  onClose: () => void;
  onSave: (updatedWorkDay: WorkDay) => Promise<void>;
}

export function WorkDayEventEditor({ visible, workDay, onClose, onSave }: WorkDayEventEditorProps) {
  const colors = useColors();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingTime, setEditingTime] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [newEventType, setNewEventType] = useState<WorkEventType>('work_start');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const eventTypeLabels: Record<WorkEventType, string> = {
    work_start: 'Начало работы',
    work_end: 'Завершение работы',
    break_start: 'Начало перерыва',
    break_end: 'Завершение перерыва',
    temporary_exit_start: 'Начало временного выхода',
    temporary_exit_end: 'Завершение временного выхода',
  };

  const eventTypeColors: Record<WorkEventType, string> = {
    work_start: colors.success,
    work_end: colors.error,
    break_start: colors.warning,
    break_end: colors.warning,
    temporary_exit_start: colors.primary,
    temporary_exit_end: colors.primary,
  };

  const handleAddEvent = async () => {
    if (!editingTime) {
      Alert.alert('Ошибка', 'Укажите время события');
      return;
    }

    try {
      const [hours, minutes] = editingTime.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        Alert.alert('Ошибка', 'Неверный формат времени (используйте HH:MM)');
        return;
      }

      const today = new Date();
      const eventDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
      const timestamp = eventDate.toISOString();

      // Валидация времени
      const timeErrors = WorkDayValidator.validateEventTime(workDay, newEventType, timestamp);
      if (timeErrors.length > 0) {
        setValidationErrors(timeErrors);
        Alert.alert('Ошибка', timeErrors[0].message);
        return;
      }

      // Добавление события
      let updatedWorkDay = addWorkEvent(workDay, newEventType);
      // Обновить время события
      const lastEvent = updatedWorkDay.events[updatedWorkDay.events.length - 1];
      if (lastEvent) {
        lastEvent.timestamp = timestamp;
      }

      // Валидация последовательности
      const sequenceErrors = WorkDayValidator.validateEventSequence(updatedWorkDay);
      if (sequenceErrors.some(e => e.severity === 'error')) {
        setValidationErrors(sequenceErrors);
        Alert.alert('Ошибка', sequenceErrors[0].message);
        return;
      }

      await onSave(updatedWorkDay);
      setEditingTime('');
      setIsAdding(false);
      setValidationErrors([]);
    } catch (error) {
      console.error('Ошибка при добавлении события:', error);
      Alert.alert('Ошибка', 'Не удалось добавить событие');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    Alert.alert('Удалить событие?', 'Это действие нельзя отменить', [
      { text: 'Отмена', onPress: () => {} },
      {
        text: 'Удалить',
        onPress: async () => {
          try {
            const updatedWorkDay = {
              ...workDay,
              events: workDay.events.filter(e => e.id !== eventId),
            };

            // Валидация после удаления
            const errors = WorkDayValidator.validateEventSequence(updatedWorkDay);
            if (errors.some(e => e.severity === 'error')) {
              setValidationErrors(errors);
              Alert.alert('Ошибка', errors[0].message);
              return;
            }

            await onSave(updatedWorkDay);
            setSelectedEventId(null);
          } catch (error) {
            console.error('Ошибка при удалении события:', error);
            Alert.alert('Ошибка', 'Не удалось удалить событие');
          }
        },
      },
    ]);
  };

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const sortedEvents = [...workDay.events].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        {/* Заголовок */}
        <View className="px-4 py-4 border-b" style={{ borderColor: colors.border }}>
          <View className="flex-row justify-between items-center">
            <Text className="text-xl font-bold text-foreground">События рабочего дня</Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-lg text-primary">✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ошибки валидации */}
        {validationErrors.length > 0 && (
          <View className="mx-4 mt-4 p-3 rounded-lg" style={{ backgroundColor: colors.error + '20' }}>
            {validationErrors.map((error, idx) => (
              <Text key={idx} className="text-sm text-error mb-1">
                • {error.message}
              </Text>
            ))}
          </View>
        )}

        {/* Список событий */}
        <ScrollView className="flex-1 px-4 py-4">
          {sortedEvents.length === 0 ? (
            <Text className="text-center text-muted py-8">Нет событий</Text>
          ) : (
            sortedEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() => setSelectedEventId(selectedEventId === event.id ? null : event.id)}
                className="mb-3 p-4 rounded-lg border"
                style={{
                  backgroundColor: eventTypeColors[event.type] + '10',
                  borderColor: eventTypeColors[event.type],
                }}
              >
                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">
                      {eventTypeLabels[event.type]}
                    </Text>
                    <Text className="text-sm text-muted mt-1">
                      {formatTime(event.timestamp)}
                    </Text>
                  </View>
                  {selectedEventId === event.id && (
                    <TouchableOpacity
                      onPress={() => handleDeleteEvent(event.id)}
                      className="ml-4 p-2"
                    >
                      <Text className="text-lg text-error">🗑</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}

          {/* Форма добавления события */}
          {isAdding && (
            <View className="mt-6 p-4 rounded-lg border" style={{ borderColor: colors.primary }}>
              <Text className="font-semibold text-foreground mb-4">Добавить событие</Text>

              {/* Выбор типа события */}
              <Text className="text-sm text-muted mb-2">Тип события:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {Object.entries(eventTypeLabels).map(([type, label]) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setNewEventType(type as WorkEventType)}
                    className={cn(
                      'mr-2 px-3 py-2 rounded-full border',
                      newEventType === type
                        ? 'bg-primary border-primary'
                        : 'bg-surface border-border'
                    )}
                  >
                    <Text
                      className={cn(
                        'text-xs font-semibold',
                        newEventType === type ? 'text-background' : 'text-foreground'
                      )}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Ввод времени */}
              <Text className="text-sm text-muted mb-2">Время (HH:MM):</Text>
              <TextInput
                placeholder="09:00"
                value={editingTime}
                onChangeText={setEditingTime}
                className="px-3 py-2 rounded-lg border mb-4"
                style={{
                  borderColor: colors.border,
                  color: colors.foreground,
                }}
                placeholderTextColor={colors.muted}
              />

              {/* Кнопки */}
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => {
                    setIsAdding(false);
                    setEditingTime('');
                  }}
                  className="flex-1 py-2 rounded-lg bg-surface border"
                  style={{ borderColor: colors.border }}
                >
                  <Text className="text-center text-foreground font-semibold">Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddEvent}
                  className="flex-1 py-2 rounded-lg"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Text className="text-center text-background font-semibold">Добавить</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Кнопка добавления события */}
        {!isAdding && (
          <View className="px-4 py-4 border-t" style={{ borderColor: colors.border }}>
            <TouchableOpacity
              onPress={() => setIsAdding(true)}
              className="py-3 rounded-lg"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-center text-background font-semibold">+ Добавить событие</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}
