import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import * as Haptics from 'expo-haptics';

interface AnalyticsCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onPeriodSelect: (period: 'week' | 'month' | 'year') => void;
  selectedPeriod: 'week' | 'month' | 'year';
}

export function AnalyticsCalendar({
  selectedDate,
  onDateSelect,
  onPeriodSelect,
  selectedPeriod,
}: AnalyticsCalendarProps) {
  const colors = useColors();
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handleDateSelect = (day: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    onDateSelect(newDate);
  };

  const handleMonthChange = (offset: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + offset);
    onDateSelect(newDate);
  };

  const handleYearChange = (offset: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDate = new Date(selectedDate);
    newDate.setFullYear(newDate.getFullYear() + offset);
    onDateSelect(newDate);
  };

  const handlePeriodSelect = (period: 'week' | 'month' | 'year') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPeriodSelect(period);
  };

  const handleToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDateSelect(new Date());
  };

  // Генерируем дни месяца
  const daysInMonth = getDaysInMonth(selectedDate);
  const firstDay = getFirstDayOfMonth(selectedDate);
  const days: (number | null)[] = [];

  // Добавляем пустые дни в начало
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Добавляем дни месяца
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ];

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      selectedDate.getMonth() === selectedDate.getMonth() &&
      selectedDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      {/* Выбор периода */}
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          marginBottom: 16,
          backgroundColor: colors.background,
          borderRadius: 8,
          padding: 4,
        }}
      >
        {(['week', 'month', 'year'] as const).map((period) => (
          <Pressable
            key={period}
            onPress={() => handlePeriodSelect(period)}
            style={({ pressed }) => [
              {
                flex: 1,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 6,
                backgroundColor: selectedPeriod === period ? colors.primary : 'transparent',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text
              style={{
                textAlign: 'center',
                fontSize: 12,
                fontWeight: '600',
                color: selectedPeriod === period ? colors.background : colors.foreground,
              }}
            >
              {period === 'week' ? 'Неделя' : period === 'month' ? 'Месяц' : 'Год'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Календарь */}
      {viewMode === 'month' ? (
        <View>
          {/* Заголовок месяца */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Pressable
              onPress={() => handleMonthChange(-1)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={{ fontSize: 18, color: colors.primary }}>←</Text>
            </Pressable>

            <Pressable
              onPress={() => setViewMode('year')}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.foreground,
                }}
              >
                {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleMonthChange(1)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={{ fontSize: 18, color: colors.primary }}>→</Text>
            </Pressable>
          </View>

          {/* Дни недели */}
          <View
            style={{
              flexDirection: 'row',
              marginBottom: 8,
              gap: 2,
            }}
          >
            {dayNames.map((day) => (
              <View
                key={day}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: colors.muted,
                  }}
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Дни месяца */}
          <View
            style={{
              gap: 2,
            }}
          >
            {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIndex) => (
              <View
                key={weekIndex}
                style={{
                  flexDirection: 'row',
                  gap: 2,
                }}
              >
                {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => (
                  <Pressable
                    key={dayIndex}
                    onPress={() => day && handleDateSelect(day)}
                    disabled={!day}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        aspectRatio: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderRadius: 6,
                        backgroundColor:
                          day && isSelected(day)
                            ? colors.primary
                            : day && isToday(day)
                            ? colors.border
                            : 'transparent',
                        opacity: pressed && day ? 0.7 : 1,
                      },
                    ]}
                  >
                    {day && (
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: day && isSelected(day) ? '600' : '500',
                          color:
                            day && isSelected(day)
                              ? colors.background
                              : day && isToday(day)
                              ? colors.primary
                              : colors.foreground,
                        }}
                      >
                        {day}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View>
          {/* Выбор года */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <Pressable
              onPress={() => handleYearChange(-1)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={{ fontSize: 18, color: colors.primary }}>←</Text>
            </Pressable>

            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: colors.foreground,
              }}
            >
              {selectedDate.getFullYear()}
            </Text>

            <Pressable
              onPress={() => handleYearChange(1)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={{ fontSize: 18, color: colors.primary }}>→</Text>
            </Pressable>
          </View>

          {/* Месяцы */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {monthNames.map((month, index) => (
              <Pressable
                key={month}
                onPress={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(index);
                  onDateSelect(newDate);
                  setViewMode('month');
                }}
                style={({ pressed }) => [
                  {
                    width: '31%',
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    borderRadius: 6,
                    backgroundColor:
                      index === selectedDate.getMonth() ? colors.primary : colors.background,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: '600',
                    color:
                      index === selectedDate.getMonth() ? colors.background : colors.foreground,
                  }}
                >
                  {month.substring(0, 3)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Быстрые кнопки */}
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          marginTop: 16,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Pressable
          onPress={handleToday}
          style={({ pressed }) => [
            {
              flex: 1,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 6,
              backgroundColor: colors.background,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={{
              textAlign: 'center',
              fontSize: 12,
              fontWeight: '600',
              color: colors.primary,
            }}
          >
            Сегодня
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            onDateSelect(startOfMonth);
            handlePeriodSelect('month');
          }}
          style={({ pressed }) => [
            {
              flex: 1,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 6,
              backgroundColor: colors.background,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={{
              textAlign: 'center',
              fontSize: 12,
              fontWeight: '600',
              color: colors.primary,
            }}
          >
            Этот месяц
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            const now = new Date();
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            onDateSelect(startOfYear);
            handlePeriodSelect('year');
          }}
          style={({ pressed }) => [
            {
              flex: 1,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 6,
              backgroundColor: colors.background,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={{
              textAlign: 'center',
              fontSize: 12,
              fontWeight: '600',
              color: colors.primary,
            }}
          >
            Этот год
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
