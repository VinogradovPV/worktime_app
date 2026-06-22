import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { WorkDay, WorkEventType } from '@/shared/types/workday';
import { WorkDayEventEditor } from '@/components/WorkDayEventEditor';
import { saveWorkDay } from '@/lib/storage/workdayService';

interface TodayEventsCardProps {
  workDay: WorkDay | null;
  onWorkDayUpdated?: () => void;
}

const EVENT_ICONS: Record<WorkEventType, string> = {
  work_start: '▶',
  work_end: '⏹',
  break_start: '⏸',
  break_end: '▶',
  temporary_exit_start: '↗',
  temporary_exit_end: '↩',
};

const EVENT_LABELS: Record<WorkEventType, string> = {
  work_start: 'Начало',
  work_end: 'Конец',
  break_start: 'Перерыв',
  break_end: 'Возврат',
  temporary_exit_start: 'Выход',
  temporary_exit_end: 'Возврат',
};

/**
 * Карточка «События дня» — компактный таймлайн событий текущего рабочего дня
 * с кнопкой для открытия редактора событий.
 */
export function TodayEventsCard({ workDay, onWorkDayUpdated }: TodayEventsCardProps) {
  const colors = useColors();
  const [editorVisible, setEditorVisible] = useState(false);

  if (!workDay || workDay.events.length === 0) return null;

  const sortedEvents = [...workDay.events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const formatTime = (iso: string): string => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getEventColor = (type: WorkEventType): string => {
    switch (type) {
      case 'work_start': return colors.success;
      case 'work_end': return colors.error;
      case 'break_start':
      case 'break_end': return colors.warning;
      default: return colors.primary;
    }
  };

  const handleSave = async (updated: WorkDay) => {
    await saveWorkDay(updated);
    onWorkDayUpdated?.();
    setEditorVisible(false);
  };

  // Показываем максимум 4 события, остальные скрываем
  const visibleEvents = sortedEvents.slice(0, 4);
  const hiddenCount = sortedEvents.length - visibleEvents.length;

  return (
    <>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {/* Заголовок */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            📋 События дня
          </Text>
          <TouchableOpacity
            onPress={() => setEditorVisible(true)}
            style={[styles.editButton, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
          >
            <Text style={[styles.editButtonText, { color: colors.primary }]}>
              ✏️ Редактировать
            </Text>
          </TouchableOpacity>
        </View>

        {/* Таймлайн событий */}
        <View style={styles.timeline}>
          {visibleEvents.map((event, idx) => {
            const color = getEventColor(event.type);
            const isLast = idx === visibleEvents.length - 1 && hiddenCount === 0;

            return (
              <View key={event.id} style={styles.timelineRow}>
                {/* Линия и точка */}
                <View style={styles.timelineLeft}>
                  <View style={[styles.dot, { backgroundColor: color }]}>
                    <Text style={styles.dotIcon}>{EVENT_ICONS[event.type]}</Text>
                  </View>
                  {!isLast && (
                    <View style={[styles.line, { backgroundColor: colors.border }]} />
                  )}
                </View>

                {/* Контент */}
                <View style={styles.timelineContent}>
                  <Text style={[styles.eventLabel, { color: colors.foreground }]}>
                    {EVENT_LABELS[event.type]}
                  </Text>
                  <Text style={[styles.eventTime, { color: colors.muted }]}>
                    {formatTime(event.timestamp)}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Скрытые события */}
          {hiddenCount > 0 && (
            <TouchableOpacity
              onPress={() => setEditorVisible(true)}
              style={styles.moreButton}
            >
              <Text style={[styles.moreText, { color: colors.primary }]}>
                +{hiddenCount} ещё...
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Итог */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.muted }]}>
            Всего событий: {sortedEvents.length}
          </Text>
          {workDay.totalWorkMs > 0 && (
            <Text style={[styles.footerText, { color: colors.primary }]}>
              {Math.floor(workDay.totalWorkMs / 3600000)}ч{' '}
              {Math.floor((workDay.totalWorkMs % 3600000) / 60000)}м
            </Text>
          )}
        </View>
      </View>

      {/* Редактор событий */}
      <WorkDayEventEditor
        visible={editorVisible}
        workDay={workDay}
        onClose={() => setEditorVisible(false)}
        onSave={handleSave}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeline: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 44,
  },
  timelineLeft: {
    width: 28,
    alignItems: 'center',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  dotIcon: {
    fontSize: 9,
    color: '#fff',
    fontWeight: 'bold',
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 2,
    marginBottom: 2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 12,
    justifyContent: 'center',
  },
  eventLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  eventTime: {
    fontSize: 12,
    marginTop: 1,
  },
  moreButton: {
    paddingVertical: 6,
    paddingLeft: 38,
  },
  moreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
  },
});
