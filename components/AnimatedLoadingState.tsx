import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/use-colors';

interface AnimatedLoadingStateProps {
  message?: string;
}

export function AnimatedLoadingState({ message = 'Загрузка данных...' }: AnimatedLoadingStateProps) {
  const colors = useColors();
  const dotOpacity = useSharedValue(0.3);
  const spinValue = useSharedValue(0);
  const slideValue = useSharedValue(0);

  useEffect(() => {
    // Анимация мигающих точек
    dotOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 400 }),
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      true
    );

    // Анимация вращения
    spinValue.value = withRepeat(
      withTiming(360, {
        duration: 2000,
        easing: Easing.linear,
      }),
      -1,
      true
    );

    // Анимация скользящего индикатора
    slideValue.value = withRepeat(
      withSequence(
        withTiming(-128, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  const spinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinValue.value}deg` }],
  }));

  const slideAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideValue.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      className="flex-1 items-center justify-center gap-4"
    >
      {/* Вращающийся индикатор */}
      <Animated.View
        style={[
          spinAnimatedStyle,
          {
            width: 48,
            height: 48,
            borderRadius: 24,
            borderWidth: 4,
            borderColor: colors.primary + '40',
            borderTopColor: colors.primary,
            borderRightColor: colors.primary,
          },
        ]}
      />

      {/* Сообщение с мигающими точками */}
      <View className="flex-row items-center gap-1">
        <Text className="text-muted">{message}</Text>
        <Animated.Text style={dotAnimatedStyle} className="text-muted">
          •
        </Animated.Text>
        <Animated.Text style={dotAnimatedStyle} className="text-muted">
          •
        </Animated.Text>
        <Animated.Text style={dotAnimatedStyle} className="text-muted">
          •
        </Animated.Text>
      </View>

      {/* Прогресс бар */}
      <View
        className="w-32 h-1 rounded-full overflow-hidden"
        style={{ backgroundColor: colors.border }}
      >
        <Animated.View
          style={[
            {
              width: '100%',
              height: '100%',
              backgroundColor: colors.primary,
            },
            slideAnimatedStyle,
          ]}
        />
      </View>
    </Animated.View>
  );
}
