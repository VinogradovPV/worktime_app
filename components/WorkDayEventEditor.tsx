import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { WorkDay, WorkEventType } from '@/shared/types/workday';
import { WorkDayValidator, ValidationError } from '@/lib/storage/workdayValidationService';
import { addWorkEvent, rebuildWorkDayFromEvents } from '@/lib/storage/workdayService';
import { calculateWorkDayStats, formatTimeShort } from '@/lib/storage/workdayStatsService';
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
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingTime, setEditingTime] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [newEventType, setNewEventType] = useState<WorkEventType>('work_start');
  const [newEventTime, setNewEventTime] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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

  const parseTimeToISO = (timeStr: string, baseDate?: string): string | null => {
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return null;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }
    // Используем дату рабочего дня (workDay.date)
    const dateParts = (baseDate || workDay.date).split('-');
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);
    return new Date(year, month, day, hours, minutes, 0).toISOString();
  };

  const handleAddEvent = async () => {
    if (!newEventTime) {
      Alert.alert('Ошибка', 'Укажите время события');
      return;
    }

    const timestamp = parseTimeToISO(newEventTime);
    if (!timestamp) {
      Alert.alert('Ошибка', 'Неверный формат времени (используйте ЧЧ:ММ)');
      return;
    }

    // Валидация времени
    const timeErrors = WorkDayValidator.validateEventTime(workDay, newEventType, timestamp);
    if (timeErrors.length > 0) {
      setValidationErrors(timeErrors);
      Alert.alert('Ошибка', timeErrors[0].message);
      return;
    }

    // Добавление события с нужным временем
    let updatedWorkDay = {
      ...workDay,
      events: [
        ...workDay.events,
        {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: newEventType,
          timestamp,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    // Валидация последовательности
    const sequenceErrors = WorkDayValidator.validateEventSequence(updatedWorkDay);
    if (sequenceErrors.some(e => e.severity === 'error')) {
      setValidationErrors(sequenceErrors);
      Alert.alert('Ошибка', sequenceErrors[0].message);
      return;
    }

    try {
      setIsSaving(true);
      await onSave(updatedWorkDay);
      setNewEventTime('');
      setIsAdding(false);
      setValidationErrors([]);
    } catch (error) {
      console.error('Ошибка при добавлении события:', error);
      Alert.alert('Ошибка', 'Не удалось добавить событие');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditEvent = async (eventId: string) => {
    if (!editingTime) {
      Alert.alert('Ошибка', 'Укажите время события');
      return;
    }

    const timestamp = parseTimeToISO(editingTime);
    if (!timestamp) {
      Alert.alert('Ошибка', 'Неверный формат времени (используйте ЧЧ:ММ)');
      return;
    }

    // Проверяем валидность нового времени (исключая текущее событие)
    const timeErrors = WorkDayValidator.validateEventTime(
      workDay,
      workDay.events.find(e => e.id === eventId)?.type as WorkEventType,
      timestamp,
      eventId
    );
    if (timeErrors.length > 0) {
      setValidationErrors(timeErrors);
      Alert.alert('Ошибка', timeErrors[0].message);
      return;
    }

    // Предупреждение если время выходит за пределы рабочего дня
    const boundsWarnings = validateTimeOutOfBounds(timestamp);
    if (boundsWarnings.length > 0) {
      setValidationErrors(boundsWarnings);
      // Показываем предупреждение, но не блокируем сохранение
      Alert.alert(
        'Предупреждение',
        boundsWarnings[0].message + '\n\nВы можете продолжить или выбрать другое время.',
        [
          { text: 'Изменить время', style: 'cancel' },
          {
            text: 'Продолжить',
            onPress: async () => {
              const updatedWorkDay = {
                ...workDay,
                events: workDay.events.map(e =>
                  e.id === eventId ? { ...e, timestamp } : e
                ),
              };
              try {
                setIsSaving(true);
                await onSave(updatedWorkDay);
                setEditingEventId(null);
                setEditingTime('');
                setSelectedEventId(null);
                setValidationErrors([]);
              } catch (error) {
                console.error('Ошибка при редактировании события:', error);
                Alert.alert('Ошибка', 'Не удалось сохранить изменения');
              } finally {
                setIsSaving(false);
              }
            },
          },
        ]
      );
      return;
    }

    const updatedWorkDay = {
      ...workDay,
      events: workDay.events.map(e =>
        e.id === eventId ? { ...e, timestamp } : e
      ),
    };

    // Валидация последовательности
    const sequenceErrors = WorkDayValidator.validateEventSequence(updatedWorkDay);
    if (sequenceErrors.some(e => e.severity === 'error')) {
      setValidationErrors(sequenceErrors);
      Alert.alert('Ошибка', sequenceErrors[0].message);
      return;
    }

    try {
      setIsSaving(true);
      await onSave(updatedWorkDay);
      setEditingEventId(null);
      setEditingTime('');
      setSelectedEventId(null);
      setValidationErrors([]);
    } catch (error) {
      console.error('Ошибка при редактировании события:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить изменения');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Вычисляет влияние удаления события на итоговое рабочее время
   */
  const calcDeleteImpact = (eventId: string): string => {
    const statsBefore = calculateWorkDayStats(rebuildWorkDayFromEvents(workDay));
    const afterWorkDay = rebuildWorkDayFromEvents({
      ...workDay,
      events: workDay.events.filter(e => e.id !== eventId),
    });
    const statsAfter = calculateWorkDayStats(afterWorkDay);
    const diffMs = statsBefore.totalWorkMs - statsAfter.totalWorkMs;
    if (diffMs <= 0) return '';
    return `\n\nВлияние на рабочее время: −${formatTimeShort(diffMs)}`;
  };

  /**
   * Проверяет, что новое время не выходит за пределы рабочего дня
   */
  const validateTimeOutOfBounds = (timestamp: string): ValidationError[] => {
    const warnings: ValidationError[] = [];
    const sorted = [...workDay.events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const workStart = sorted.find(e => e.type === 'work_start');
    const workEnd = sorted.find(e => e.type === 'work_end');
    const newMs = new Date(timestamp).getTime();
    if (workStart && newMs < new Date(workStart.timestamp).getTime()) {
      warnings.push({
        code: 'TIME_BEFORE_WORK_START',
        message: 'Время события раньше начала рабочего дня',
        severity: 'warning',
      });
    }
    if (workEnd && newMs > new Date(workEnd.timestamp).getTime()) {
      warnings.push({
        code: 'TIME_AFTER_WORK_END',
        message: 'Время события позже завершения рабочего дня',
        severity: 'warning',
      });
    }
    return warnings;
  };

  const handleDeleteEvent = async (eventId: string) => {
    const impact = calcDeleteImpact(eventId);
    const message = `Это действие нельзя отменить.${impact}`;
    Alert.alert('Удалить событие?', message, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
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
            setEditingEventId(null);
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

  const startEditEvent = (eventId: string, currentTimestamp: string) => {
    setEditingEventId(eventId);
    setEditingTime(formatTime(currentTimestamp));
    setSelectedEventId(eventId);
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingEventId(null);
    setEditingTime('');
    setSelectedEventId(null);
    setValidationErrors([]);
  };

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
          <Text className="text-xs text-muted mt-1">
            {workDay.date} · {sortedEvents.length} событий
          </Text>
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
            <View className="items-center py-12">
              <Text className="text-4xl mb-4">📋</Text>
              <Text className="text-center text-muted">Нет событий</Text>
              <Text className="text-center text-muted text-xs mt-2">
                Добавьте первое событие с помощью кнопки ниже
              </Text>
            </View>
          ) : (
            sortedEvents.map((event) => {
              const isSelected = selectedEventId === event.id;
              const isEditing = editingEventId === event.id;
              const eventColor = eventTypeColors[event.type];

              return (
                <View
                  key={event.id}
                  className="mb-3 rounded-lg border overflow-hidden"
                  style={{
                    backgroundColor: eventColor + '10',
                    borderColor: isSelected ? eventColor : colors.border,
                  }}
                >
                  {/* Строка события */}
                  <TouchableOpacity
                    onPress={() => {
                      if (isEditing) {
                        cancelEdit();
                      } else if (isSelected) {
                        setSelectedEventId(null);
                      } else {
                        setSelectedEventId(event.id);
                        setEditingEventId(null);
                      }
                    }}
                    className="p-4"
                  >
                    <View className="flex-row justify-between items-center">
                      <View className="flex-1">
                        <Text className="font-semibold text-foreground">
                          {eventTypeLabels[event.type]}
                        </Text>
                        <Text className="text-sm mt-1" style={{ color: eventColor }}>
                          {formatTime(event.timestamp)}
                        </Text>
                      </View>
                      <Text className="text-muted text-xs">{isSelected ? '▲' : '▼'}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Панель действий */}
                  {isSelected && !isEditing && (
                    <View
                      className="flex-row gap-2 px-4 pb-4"
                    >
                      <TouchableOpacity
                        onPress={() => startEditEvent(event.id, event.timestamp)}
                        className="flex-1 py-2 rounded-lg items-center"
                        style={{ backgroundColor: colors.primary + '20', borderWidth: 1, borderColor: colors.primary }}
                      >
                        <Text className="text-xs font-semibold text-primary">✏️ Изменить время</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteEvent(event.id)}
                        className="flex-1 py-2 rounded-lg items-center"
                        style={{ backgroundColor: colors.error + '20', borderWidth: 1, borderColor: colors.error }}
                      >
                        <Text className="text-xs font-semibold text-error">🗑 Удалить</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Форма редактирования времени */}
                  {isEditing && (
                    <View className="px-4 pb-4">
                      <Text className="text-xs text-muted mb-2">Новое время (ЧЧ:ММ):</Text>
                      <TextInput
                        value={editingTime}
                        onChangeText={setEditingTime}
                        placeholder="09:00"
                        keyboardType="numbers-and-punctuation"
                        returnKeyType="done"
                        onSubmitEditing={() => handleEditEvent(event.id)}
                        className="px-3 py-2 rounded-lg border mb-3"
                        style={{
                          borderColor: colors.primary,
                          color: colors.foreground,
                          backgroundColor: colors.background,
                        }}
                        placeholderTextColor={colors.muted}
                        autoFocus
                      />
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={cancelEdit}
                          className="flex-1 py-2 rounded-lg items-center bg-surface border"
                          style={{ borderColor: colors.border }}
                        >
                          <Text className="text-xs font-semibold text-foreground">Отмена</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleEditEvent(event.id)}
                          disabled={isSaving}
                          className="flex-1 py-2 rounded-lg items-center"
                          style={{ backgroundColor: colors.primary, opacity: isSaving ? 0.6 : 1 }}
                        >
                          <Text className="text-xs font-semibold text-background">
                            {isSaving ? 'Сохранение...' : 'Сохранить'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}

          {/* Форма добавления события */}
          {isAdding && (
            <View className="mt-4 p-4 rounded-lg border" style={{ borderColor: colors.primary }}>
              <Text className="font-semibold text-foreground mb-4">Добавить событие</Text>

              {/* Выбор типа события */}
              <Text className="text-xs text-muted mb-2">Тип события:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {(Object.entries(eventTypeLabels) as [WorkEventType, string][]).map(([type, label]) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setNewEventType(type)}
                    className="mr-2 px-3 py-2 rounded-full border"
                    style={{
                      backgroundColor: newEventType === type ? colors.primary : colors.surface,
                      borderColor: newEventType === type ? colors.primary : colors.border,
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: newEventType === type ? colors.background : colors.foreground }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Ввод времени */}
              <Text className="text-xs text-muted mb-2">Время (ЧЧ:ММ):</Text>
              <TextInput
                placeholder="09:00"
                value={newEventTime}
                onChangeText={setNewEventTime}
                keyboardType="numbers-and-punctuation"
                returnKeyType="done"
                onSubmitEditing={handleAddEvent}
                className="px-3 py-2 rounded-lg border mb-4"
                style={{
                  borderColor: colors.border,
                  color: colors.foreground,
                  backgroundColor: colors.surface,
                }}
                placeholderTextColor={colors.muted}
              />

              {/* Кнопки */}
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => {
                    setIsAdding(false);
                    setNewEventTime('');
                    setValidationErrors([]);
                  }}
                  className="flex-1 py-2 rounded-lg items-center bg-surface border"
                  style={{ borderColor: colors.border }}
                >
                  <Text className="text-sm font-semibold text-foreground">Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddEvent}
                  disabled={isSaving}
                  className="flex-1 py-2 rounded-lg items-center"
                  style={{ backgroundColor: colors.primary, opacity: isSaving ? 0.6 : 1 }}
                >
                  <Text className="text-sm font-semibold text-background">
                    {isSaving ? 'Добавление...' : 'Добавить'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Кнопка добавления события */}
        {!isAdding && (
          <View className="px-4 py-4 border-t" style={{ borderColor: colors.border }}>
            <TouchableOpacity
              onPress={() => {
                setIsAdding(true);
                setSelectedEventId(null);
                setEditingEventId(null);
              }}
              className="py-3 rounded-lg items-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-background font-semibold">+ Добавить событие</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}
