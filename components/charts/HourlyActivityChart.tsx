import React, { useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { HourlyActivity } from '@/lib/services/analyticsService';

interface HourlyActivityChartProps {
  data: HourlyActivity[];
}

/**
 * График активности по часам суток.
 * Показывает, в какое время дня чаще всего начинается/ведётся работа.
 */
export function HourlyActivityChart({ data }: HourlyActivityChartProps) {
  const colors = useColors();
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 64; // padding
  const chartHeight = 100;

  // Фильтруем рабочие часы (6-22)
  const workHours = data.filter(d => d.hour >= 6 && d.hour <= 22);
  const maxCount = Math.max(...workHours.map(d => d.count), 1);

  const barWidth = chartWidth / workHours.length - 2;

  const getBarColor = (hour: number, isSelected: boolean): string => {
    if (isSelected) return colors.primary;
    if (hour >= 9 && hour <= 12) return colors.success + 'CC';
    if (hour >= 13 && hour <= 17) return colors.primary + 'CC';
    if (hour >= 18 && hour <= 20) return colors.warning + 'CC';
    return colors.muted + '80';
  };

  const selected = selectedHour !== null ? workHours.find(d => d.hour === selectedHour) : null;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 4 }}>
        Активность по времени суток
      </Text>
      <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 16 }}>
        Нажмите на столбец для подробностей
      </Text>

      {/* Подсказка при выборе */}
      {selected && (
        <View
          style={{
            padding: 10,
            backgroundColor: colors.background,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>
            {`${String(selected.hour).padStart(2, '0')}:00 – ${String(selected.hour + 1).padStart(2, '0')}:00`}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
            {selected.count > 0
              ? `Активных дней: ${selected.count} · ${selected.percentage.toFixed(0)}% от всех дней`
              : 'Нет активности в этот час'}
          </Text>
        </View>
      )}

      {/* График */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartHeight }}>
        {workHours.map((item) => {
          const barHeight = maxCount > 0 ? (item.count / maxCount) * chartHeight : 0;
          const isSelected = selectedHour === item.hour;

          return (
            <Pressable
              key={item.hour}
              onPress={() => setSelectedHour(isSelected ? null : item.hour)}
              style={({ pressed }) => ({
                flex: 1,
                marginHorizontal: 1,
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  width: '100%',
                  height: Math.max(barHeight, item.count > 0 ? 4 : 0),
                  backgroundColor: getBarColor(item.hour, isSelected),
                  borderRadius: 3,
                  borderWidth: isSelected ? 1.5 : 0,
                  borderColor: isSelected ? colors.primary : 'transparent',
                }}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Метки часов */}
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        {workHours.map((item) => (
          <View key={item.hour} style={{ flex: 1, alignItems: 'center' }}>
            {item.hour % 3 === 0 && (
              <Text style={{ fontSize: 9, color: colors.muted }}>
                {String(item.hour).padStart(2, '0')}
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Легенда */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {[
          { color: colors.success + 'CC', label: 'Утро (9-12)' },
          { color: colors.primary + 'CC', label: 'День (13-17)' },
          { color: colors.warning + 'CC', label: 'Вечер (18-20)' },
        ].map(({ color, label }) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
            <Text style={{ fontSize: 10, color: colors.muted }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
