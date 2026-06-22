import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInLeft,
  SlideInRight,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/use-colors';
import * as Haptics from 'expo-haptics';

type ReportMode = 'day' | 'week' | 'month' | 'year';

interface AnimatedPeriodSelectorProps {
  mode: ReportMode;
  onModeChange: (mode: ReportMode) => void;
  periodLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function AnimatedPeriodSelector({
  mode,
  onModeChange,
  periodLabel,
  onPrevious,
  onNext,
  onToday,
}: AnimatedPeriodSelectorProps) {
  const colors = useColors();
  const [animatingMode, setAnimatingMode] = useState(false);
  const [animatingDirection, setAnimatingDirection] = useState<'left' | 'right'>('right');
  const scaleValue = useSharedValue(1);

  const modes: { label: string; value: ReportMode }[] = [
    { label: 'День', value: 'day' },
    { label: 'Неделя', value: 'week' },
    { label: 'Месяц', value: 'month' },
    { label: 'Год', value: 'year' },
  ];

  const handleModeChange = (newMode: ReportMode) => {
    if (newMode === mode) return;

    // Определяем направление анимации
    const currentIndex = modes.findIndex((m) => m.value === mode);
    const newIndex = modes.findIndex((m) => m.value === newMode);
    setAnimatingDirection(newIndex > currentIndex ? 'right' : 'left');

    setAnimatingMode(true);
    scaleValue.value = withTiming(0.95, { duration: 150 }, () => {
      scaleValue.value = withTiming(1, { duration: 150 });
    });

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setTimeout(() => {
      onModeChange(newMode);
      setAnimatingMode(false);
    }, 150);
  };

  const handleNavigation = (direction: 'prev' | 'next') => {
    scaleValue.value = withTiming(0.97, { duration: 100 }, () => {
      scaleValue.value = withTiming(1, { duration: 100 });
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (direction === 'prev') {
      onPrevious();
    } else {
      onNext();
    }
  };

  const scaleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  return (
    <View className="gap-3">
      {/* Переключатель режимов */}
      <View className="flex-row gap-2 justify-center">
        {modes.map((m) => (
          <Pressable
            key={m.value}
            onPress={() => handleModeChange(m.value)}
            className={`px-4 py-2 rounded-full transition-all ${
              mode === m.value ? 'bg-primary' : 'bg-surface border border-border'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                mode === m.value ? 'text-background' : 'text-foreground'
              }`}
            >
              {m.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Период и навигация */}
      <View className="flex-row items-center justify-between px-2">
        {/* Кнопка "Предыдущий" */}
        <Pressable
          onPress={() => handleNavigation('prev')}
          className="p-2 rounded-lg active:bg-surface"
        >
          <Animated.Text
            style={scaleAnimatedStyle}
            className="text-xl font-bold text-primary"
          >
            ←
          </Animated.Text>
        </Pressable>

        {/* Период */}
        <Animated.View
          entering={animatingDirection === 'right' ? SlideInRight.duration(250) : SlideInLeft.duration(250)}
          exiting={FadeOut.duration(150)}
          className="flex-1 items-center"
        >
          <Text className="text-lg font-semibold text-foreground text-center">
            {periodLabel}
          </Text>
        </Animated.View>

        {/* Кнопка "Следующий" */}
        <Pressable
          onPress={() => handleNavigation('next')}
          className="p-2 rounded-lg active:bg-surface"
        >
          <Animated.Text
            style={scaleAnimatedStyle}
            className="text-xl font-bold text-primary"
          >
            →
          </Animated.Text>
        </Pressable>
      </View>

      {/* Кнопка "Сегодня" */}
      <Pressable
        onPress={onToday}
        className="self-center px-4 py-2 rounded-full"
        style={{ backgroundColor: colors.primary + '20' }}
      >
        <Text className="text-sm font-semibold text-primary">Сегодня</Text>
      </Pressable>
    </View>
  );
}
