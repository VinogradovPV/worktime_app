import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { WeeklyDistribution, formatWorkHours } from '@/lib/services/analyticsService';

interface WeeklyDistributionChartProps {
  data: WeeklyDistribution[];
  height?: number;
}

export function WeeklyDistributionChart({ data, height = 200 }: WeeklyDistributionChartProps) {
  const colors = useColors();
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 40;
  const chartHeight = height;
  const barWidth = (chartWidth - 60) / 7;
  const padding = 20;

  if (data.length === 0) {
    return (
      <View
        style={{
          height: chartHeight,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: colors.muted }}>Нет данных для отображения</Text>
      </View>
    );
  }

  // Находим максимум
  const maxWork = Math.max(...data.map(d => d.avgWorkedMs));

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginVertical: 12,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: colors.foreground,
          marginBottom: 12,
        }}
      >
        📅 Распределение по дням недели
      </Text>

      <View
        style={{
          height: chartHeight,
          backgroundColor: colors.background,
          borderRadius: 8,
          overflow: 'hidden',
          position: 'relative',
          paddingLeft: padding,
          paddingRight: padding,
          paddingBottom: 40,
          paddingTop: 10,
        }}
      >
        {/* Сетка */}
        <View
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            justifyContent: 'space-around',
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{
                height: 1,
                backgroundColor: colors.border,
                opacity: 0.3,
              }}
            />
          ))}
        </View>

        {/* Столбцы */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'flex-end',
            flex: 1,
            paddingBottom: 8,
          }}
        >
          {data.map((day, index) => {
            const barHeight = maxWork > 0 ? (day.avgWorkedMs / maxWork) * (chartHeight - 60) : 0;
            const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;

            return (
              <View
                key={index}
                style={{
                  alignItems: 'center',
                  width: barWidth,
                }}
              >
                {/* Столбец */}
                <View
                  style={{
                    width: barWidth - 4,
                    height: barHeight,
                    backgroundColor: isWeekend ? colors.muted : colors.primary,
                    borderRadius: 4,
                    opacity: day.dayCount > 0 ? 1 : 0.3,
                  }}
                />

                {/* Значение */}
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.foreground,
                    marginTop: 4,
                    fontWeight: '500',
                  }}
                >
                  {formatWorkHours(day.avgWorkedMs)}ч
                </Text>

                {/* День недели */}
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.muted,
                    marginTop: 2,
                  }}
                >
                  {day.dayName}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Метки оси Y */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 10,
            width: padding - 4,
            height: chartHeight - 50,
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            paddingRight: 4,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => {
            const value = (maxWork / 4) * (4 - i);
            return (
              <Text
                key={i}
                style={{
                  fontSize: 9,
                  color: colors.muted,
                }}
              >
                {formatWorkHours(value)}ч
              </Text>
            );
          })}
        </View>
      </View>

      {/* Статистика */}
      <View
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        {data.map((day, index) => {
          const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
          if (day.dayCount === 0) return null;

          return (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: colors.foreground,
                }}
              >
                {day.dayName} ({day.dayCount} дн.)
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: isWeekend ? colors.muted : colors.primary,
                  fontWeight: '500',
                }}
              >
                {formatWorkHours(day.avgWorkedMs)}ч в среднем
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
