import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  cancelAnimation,
  interpolateColor,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/use-colors';

type TimerStatus = 'idle' | 'working' | 'break' | 'exit';

interface AnimatedTimerProps {
  time: string;
  isRunning: boolean;
  status?: TimerStatus;
  size?: number;
}

/**
 * Анимированный таймер с пульсацией при работе и цветовым переходом при смене статуса.
 * - working: зелёный пульс
 * - break: жёлтый, без пульсации
 * - exit: синий, без пульсации
 * - idle: серый, уменьшен
 */
export function AnimatedTimer({ time, isRunning, status = 'idle', size = 200 }: AnimatedTimerProps) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isRunning ? 1 : 0.75);
  const colorProgress = useSharedValue(0);
  const prevStatus = useRef<TimerStatus>(status);

  // Цвета по статусу
  const getStatusColor = (s: TimerStatus): string => {
    switch (s) {
      case 'working': return colors.success;
      case 'break': return colors.warning;
      case 'exit': return colors.primary;
      default: return colors.muted;
    }
  };

  // Анимация при смене статуса
  useEffect(() => {
    const changed = prevStatus.current !== status;
    prevStatus.current = status;

    if (status === 'working') {
      // Пульсирующая анимация при работе
      scale.value = withSequence(
        withTiming(1.06, { duration: 200, easing: Easing.out(Easing.ease) }),
        withTiming(1.0, { duration: 200, easing: Easing.in(Easing.ease) })
      );
      opacity.value = withTiming(1, { duration: 300 });

      // Лёгкая постоянная пульсация
      scale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.97, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else if (status === 'break') {
      cancelAnimation(scale);
      if (changed) {
        // Bounce при переходе в перерыв
        scale.value = withSequence(
          withTiming(0.88, { duration: 120, easing: Easing.out(Easing.ease) }),
          withTiming(1.0, { duration: 200, easing: Easing.out(Easing.back(1.5)) })
        );
      } else {
        scale.value = withTiming(1.0, { duration: 300 });
      }
      opacity.value = withTiming(0.9, { duration: 300 });
    } else if (status === 'exit') {
      cancelAnimation(scale);
      scale.value = withTiming(0.95, { duration: 300 });
      opacity.value = withTiming(0.85, { duration: 300 });
    } else {
      // idle
      cancelAnimation(scale);
      scale.value = withTiming(0.9, { duration: 400, easing: Easing.inOut(Easing.ease) });
      opacity.value = withTiming(0.65, { duration: 400 });
    }
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const bgColor = getStatusColor(status);

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
          alignItems: 'center',
          justifyContent: 'center',
          // Тень для глубины
          shadowColor: bgColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: status === 'working' ? 0.4 : 0.15,
          shadowRadius: 12,
          elevation: status === 'working' ? 8 : 3,
        },
        animatedStyle,
      ]}
    >
      {/* Внутренний круг для глубины */}
      <View
        style={{
          position: 'absolute',
          width: size * 0.88,
          height: size * 0.88,
          borderRadius: (size * 0.88) / 2,
          backgroundColor: 'rgba(255,255,255,0.08)',
        }}
      />

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.4}
        style={{
          fontSize: size * 0.18,
          fontWeight: 'bold',
          color: 'white',
          paddingHorizontal: size * 0.05,
          width: size * 0.88,
          textAlign: 'center',
          letterSpacing: -0.5,
        }}
      >
        {time}
      </Text>

      {/* Метка статуса под временем */}
      {status !== 'idle' && (
        <Text
          style={{
            fontSize: size * 0.075,
            color: 'rgba(255,255,255,0.8)',
            marginTop: size * 0.02,
            fontWeight: '600',
            letterSpacing: 0.5,
          }}
        >
          {status === 'working' ? '● РАБОТА' : status === 'break' ? '⏸ ПЕРЕРЫВ' : '↗ ВЫХОД'}
        </Text>
      )}
    </Animated.View>
  );
}
