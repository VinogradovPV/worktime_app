import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { PeriodComparison, formatWorkHours } from '@/lib/services/analyticsService';

interface ComparisonChartProps {
  data: PeriodComparison;
  height?: number;
}

export function ComparisonChart({ data, height = 200 }: ComparisonChartProps) {
  const colors = useColors();
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 40;
  const chartHeight = height;
  const barWidth = (chartWidth - 80) / 2;
  const padding = 30;

  const maxWork = Math.max(data.avgWork1, data.avgWork2);
  const bar1Height = maxWork > 0 ? (data.avgWork1 / maxWork) * (chartHeight - 60) : 0;
  const bar2Height = maxWork > 0 ? (data.avgWork2 / maxWork) * (chartHeight - 60) : 0;

  const trendColor = data.trend === 'up' ? colors.success : 
                     data.trend === 'down' ? colors.error : 
                     colors.warning;

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
        📊 Сравнение периодов
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
          {/* Первый период */}
          <View
            style={{
              alignItems: 'center',
              width: barWidth,
            }}
          >
            <View
              style={{
                width: barWidth - 8,
                height: bar1Height,
                backgroundColor: colors.primary,
                borderRadius: 4,
              }}
            />
            <Text
              style={{
                fontSize: 10,
                color: colors.foreground,
                marginTop: 4,
                fontWeight: '500',
              }}
            >
              {formatWorkHours(data.avgWork1)}ч
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: colors.muted,
                marginTop: 2,
                textAlign: 'center',
              }}
            >
              Период 1
            </Text>
          </View>

          {/* Второй период */}
          <View
            style={{
              alignItems: 'center',
              width: barWidth,
            }}
          >
            <View
              style={{
                width: barWidth - 8,
                height: bar2Height,
                backgroundColor: trendColor,
                borderRadius: 4,
              }}
            />
            <Text
              style={{
                fontSize: 10,
                color: colors.foreground,
                marginTop: 4,
                fontWeight: '500',
              }}
            >
              {formatWorkHours(data.avgWork2)}ч
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: colors.muted,
                marginTop: 2,
                textAlign: 'center',
              }}
            >
              Период 2
            </Text>
          </View>
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
          gap: 8,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 12, color: colors.muted }}>Разница:</Text>
          <Text
            style={{
              fontSize: 12,
              color: trendColor,
              fontWeight: '600',
            }}
          >
            {data.difference >= 0 ? '+' : ''}{formatWorkHours(data.difference)}ч ({data.percentChange.toFixed(1)}%)
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 12, color: colors.muted }}>Тренд:</Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: trendColor,
                fontWeight: '600',
              }}
            >
              {data.trend === 'up' ? '📈 Рост' : data.trend === 'down' ? '📉 Снижение' : '➡️ Стабильно'}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 12, color: colors.muted }}>Период 1:</Text>
          <Text style={{ fontSize: 12, color: colors.foreground, fontWeight: '500' }}>
            {data.period1}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 12, color: colors.muted }}>Период 2:</Text>
          <Text style={{ fontSize: 12, color: colors.foreground, fontWeight: '500' }}>
            {data.period2}
          </Text>
        </View>
      </View>
    </View>
  );
}
