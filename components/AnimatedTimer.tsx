import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/use-colors';

interface AnimatedTimerProps {
  time: string;
  isRunning: boolean;
  size?: number;
}

export function AnimatedTimer({ time, isRunning, size = 200 }: AnimatedTimerProps) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isRunning ? 1 : 0.8);

  // Анимация при запуске/остановке таймера
  useEffect(() => {
    if (isRunning) {
      // Пульсирующая анимация при работе
      scale.value = withTiming(1.05, {
        duration: 600,
        easing: Easing.inOut(Easing.ease),
      });
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.inOut(Easing.ease),
      });
    } else {
      // Плавное уменьшение при остановке
      scale.value = withTiming(0.95, {
        duration: 400,
        easing: Easing.inOut(Easing.ease),
      });
      opacity.value = withTiming(0.7, {
        duration: 400,
        easing: Easing.inOut(Easing.ease),
      });
    }
  }, [isRunning]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        },
        animatedStyle,
      ]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        style={{
          fontSize: 48,
          fontWeight: 'bold',
          color: 'white',
          paddingHorizontal: 12,
        }}
      >
        {time}
      </Text>
    </Animated.View>
  );
}
