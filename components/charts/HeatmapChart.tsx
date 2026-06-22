import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { TrendData } from '@/lib/services/analyticsService';

interface HeatmapChartProps {
  data: TrendData[];
}

const CELL_SIZE = 14;
const CELL_GAP = 2;
const WEEKS_TO_SHOW = 26; // ~6 месяцев

/**
 * Тепловая карта активности в стиле GitHub contributions.
 * Показывает интенсивность работы за последние 26 недель.
 */
export function HeatmapChart({ data }: HeatmapChartProps) {
  const colors = useColors();
  const [selectedDay, setSelectedDay] = useState<{ date: string; hours: number } | null>(null);

  // Строим карту дата → часы
  const dataMap = new Map<string, number>();
  for (const d of data) {
    dataMap.set(d.date, d.workedMs / (1000 * 3600));
  }

  // Генерируем сетку: последние WEEKS_TO_SHOW недель
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - WEEKS_TO_SHOW * 7);
  // Выравниваем на начало недели (понедельник)
  const dayOfWeek = startDate.getDay(); // 0=Sun
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startDate.setDate(startDate.getDate() - daysToMonday);

  // Группируем по неделям
  const weeks: Array<Array<{ date: string; hours: number; isToday: boolean; isFuture: boolean }>> = [];
  const current = new Date(startDate);

  for (let w = 0; w < WEEKS_TO_SHOW + 1; w++) {
    const week: typeof weeks[0] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = current.toISOString().split('T')[0];
      const isFuture = current > today;
      const isToday = dateStr === today.toISOString().split('T')[0];
      week.push({
        date: dateStr,
        hours: dataMap.get(dateStr) ?? 0,
        isToday,
        isFuture,
      });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }

  // Цвет ячейки по интенсивности
  const getCellColor = (hours: number, isFuture: boolean): string => {
    if (isFuture) return colors.border;
    if (hours <= 0) return colors.surface;
    if (hours < 4) return colors.primary + '40';
    if (hours < 6) return colors.primary + '70';
    if (hours < 8) return colors.primary + 'A0';
    if (hours < 10) return colors.primary + 'C8';
    return colors.primary;
  };

  const dayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  // Метки месяцев
  const monthLabels: Array<{ label: string; weekIndex: number }> = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const month = new Date(week[0].date).getMonth();
    if (month !== lastMonth) {
      monthLabels.push({
        label: new Date(week[0].date).toLocaleDateString('ru-RU', { month: 'short' }),
        weekIndex: wi,
      });
      lastMonth = month;
    }
  });

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 12 }}>
        Тепловая карта активности
      </Text>
      <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 12 }}>
        Последние 6 месяцев
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Метки месяцев */}
          <View style={{ flexDirection: 'row', marginBottom: 4, marginLeft: 28 }}>
            {weeks.map((week, wi) => {
              const label = monthLabels.find(m => m.weekIndex === wi);
              return (
                <View key={wi} style={{ width: CELL_SIZE + CELL_GAP }}>
                  {label && (
                    <Text style={{ fontSize: 9, color: colors.muted }}>{label.label}</Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Сетка */}
          <View style={{ flexDirection: 'row' }}>
            {/* Метки дней недели */}
            <View style={{ marginRight: 4 }}>
              {dayLabels.map((label, i) => (
                <View
                  key={i}
                  style={{
                    width: 22,
                    height: CELL_SIZE,
                    marginBottom: CELL_GAP,
                    justifyContent: 'center',
                  }}
                >
                  {i % 2 === 0 && (
                    <Text style={{ fontSize: 9, color: colors.muted, textAlign: 'right' }}>
                      {label}
                    </Text>
                  )}
                </View>
              ))}
            </View>

            {/* Ячейки */}
            {weeks.map((week, wi) => (
              <View key={wi} style={{ marginRight: CELL_GAP }}>
                {week.map((day, di) => (
                  <Pressable
                    key={di}
                    onPress={() => {
                      if (!day.isFuture) {
                        setSelectedDay(
                          selectedDay?.date === day.date
                            ? null
                            : { date: day.date, hours: day.hours }
                        );
                      }
                    }}
                    style={({ pressed }) => ({
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      borderRadius: 2,
                      backgroundColor: getCellColor(day.hours, day.isFuture),
                      marginBottom: CELL_GAP,
                      opacity: pressed ? 0.7 : 1,
                      borderWidth: day.isToday ? 1.5 : 0,
                      borderColor: day.isToday ? colors.primary : 'transparent',
                    })}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Подсказка при нажатии */}
      {selectedDay && (
        <View
          style={{
            marginTop: 12,
            padding: 10,
            backgroundColor: colors.background,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 12, color: colors.foreground, fontWeight: '600' }}>
            {new Date(selectedDay.date).toLocaleDateString('ru-RU', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
            {selectedDay.hours > 0
              ? `Отработано: ${selectedDay.hours.toFixed(1)} ч`
              : 'Нет данных о работе'}
          </Text>
        </View>
      )}

      {/* Легенда */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 4 }}>
        <Text style={{ fontSize: 10, color: colors.muted, marginRight: 4 }}>Меньше</Text>
        {[0, 2, 4, 6, 8, 10].map((h) => (
          <View
            key={h}
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              backgroundColor: getCellColor(h, false),
            }}
          />
        ))}
        <Text style={{ fontSize: 10, color: colors.muted, marginLeft: 4 }}>Больше</Text>
      </View>
    </View>
  );
}
