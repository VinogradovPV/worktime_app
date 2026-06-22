import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { TrendData, formatWorkHours } from '@/lib/services/analyticsService';

interface TrendChartProps {
  data: TrendData[];
  height?: number;
}

export function TrendChart({ data, height = 250 }: TrendChartProps) {
  const colors = useColors();
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 40;
  const chartHeight = height;
  const padding = 40;

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

  // Находим минимум и максимум
  const maxWork = Math.max(...data.map(d => d.workedMs));
  const minWork = Math.min(...data.map(d => d.workedMs));
  const range = maxWork - minWork || maxWork;

  // Рассчитываем координаты точек
  const points = data.map((d, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * (chartWidth - 2 * padding);
    const y = chartHeight - padding - ((d.workedMs - minWork) / range) * (chartHeight - 2 * padding);
    return { x, y, data: d };
  });

  // Создаем SVG-подобный путь для линии
  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

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
        📈 Тренд рабочего времени
      </Text>

      <View
        style={{
          height: chartHeight,
          backgroundColor: colors.background,
          borderRadius: 8,
          overflow: 'hidden',
          position: 'relative',
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

        {/* Линия тренда */}
        <View
          style={{
            position: 'absolute',
            width: chartWidth,
            height: chartHeight,
            left: 0,
            top: 0,
          }}
        >
          {points.map((p, i) => {
            if (i === 0) return null;
            const prevP = points[i - 1];
            const dx = p.x - prevP.x;
            const dy = p.y - prevP.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: prevP.x,
                  top: prevP.y,
                  width: length,
                  height: 2,
                  backgroundColor: colors.primary,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: '0 0',
                }}
              />
            );
          })}
        </View>

        {/* Точки данных */}
        {points.map((p, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: p.x - 6,
              top: p.y - 6,
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: p.data.trend === 'up' ? colors.success : 
                               p.data.trend === 'down' ? colors.error : 
                               colors.warning,
              borderWidth: 2,
              borderColor: colors.background,
            }}
          />
        ))}

        {/* Метки оси Y */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: padding,
            width: padding - 8,
            height: chartHeight - 2 * padding,
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            paddingRight: 4,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => {
            const value = minWork + (range / 4) * (4 - i);
            return (
              <Text
                key={i}
                style={{
                  fontSize: 10,
                  color: colors.muted,
                }}
              >
                {formatWorkHours(value)}ч
              </Text>
            );
          })}
        </View>

        {/* Метки оси X */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: padding,
            right: padding,
            height: padding,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingTop: 4,
          }}
        >
          {points.map((p, i) => {
            if (i % Math.ceil(data.length / 5) !== 0 && i !== data.length - 1) {
              return null;
            }
            const date = new Date(p.data.date);
            const label = `${date.getDate()}.${date.getMonth() + 1}`;
            return (
              <Text
                key={i}
                style={{
                  fontSize: 10,
                  color: colors.muted,
                }}
              >
                {label}
              </Text>
            );
          })}
        </View>
      </View>

      {/* Легенда */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.success,
            }}
          />
          <Text style={{ fontSize: 12, color: colors.muted }}>Рост</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.warning,
            }}
          />
          <Text style={{ fontSize: 12, color: colors.muted }}>Стабильно</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.error,
            }}
          />
          <Text style={{ fontSize: 12, color: colors.muted }}>Снижение</Text>
        </View>
      </View>
    </View>
  );
}
