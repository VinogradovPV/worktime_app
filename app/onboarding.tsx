import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

const ONBOARDING_KEY = "onboarding_completed";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface SlideData {
  icon: string;
  title: string;
  description: string;
  details?: string[];
}

const SLIDES: SlideData[] = [
  {
    icon: "⏱",
    title: "Добро пожаловать!",
    description:
      "WorkTime — приложение для учёта рабочего времени. Отслеживайте свой рабочий день, перерывы и временные выходы.",
    details: [
      "Точный учёт рабочего времени",
      "Статистика и аналитика",
      "Экспорт отчётов",
    ],
  },
  {
    icon: "▶️",
    title: "Управление рабочим днём",
    description: "Три кнопки для управления статусом рабочего дня:",
    details: [
      "«Начать работу» — отмечает начало рабочего дня",
      "«Перерыв» — фиксирует перерыв (обед, кофе-пауза)",
      "«Временный выход» — короткий выход за пределы рабочего места",
    ],
  },
  {
    icon: "📅",
    title: "Календарь и отчёты",
    description: "Просматривайте историю рабочих дней в удобном формате:",
    details: [
      "Месячный, квартальный и годовой виды",
      "Цветовая кодировка статусов дней",
      "Праздники и выходные выделены отдельно",
    ],
  },
  {
    icon: "📊",
    title: "Аналитика",
    description:
      "Анализируйте свою продуктивность и получайте персональные рекомендации:",
    details: [
      "Тренды рабочего времени",
      "Сравнение периодов",
      "Рекомендации по оптимизации",
    ],
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      await handleFinish();
    }
  };

  const handleSkip = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await handleFinish();
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/(tabs)");
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Кнопка «Пропустить» */}
      {!isLastSlide && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.muted }]}>Пропустить</Text>
        </TouchableOpacity>
      )}

      {/* Слайды */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((slide, index) => (
          <View key={index} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            {/* Иконка */}
            <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={styles.icon}>{slide.icon}</Text>
            </View>

            {/* Заголовок */}
            <Text style={[styles.title, { color: colors.foreground }]}>{slide.title}</Text>

            {/* Описание */}
            <Text style={[styles.description, { color: colors.muted }]}>
              {slide.description}
            </Text>

            {/* Детали */}
            {slide.details && (
              <View style={styles.detailsContainer}>
                {slide.details.map((detail, i) => (
                  <View key={i} style={styles.detailRow}>
                    <View style={[styles.detailDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.detailText, { color: colors.foreground }]}>
                      {detail}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Индикаторы страниц */}
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor:
                  index === currentIndex ? colors.primary : colors.border,
                width: index === currentIndex ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Кнопка «Далее» / «Начать» */}
      <TouchableOpacity
        style={[styles.nextButton, { backgroundColor: colors.primary }]}
        onPress={handleNext}
        activeOpacity={0.85}
      >
        <Text style={styles.nextButtonText}>
          {isLastSlide ? "Начать" : "Далее"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  skipButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 4,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  icon: {
    fontSize: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 36,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  detailsContainer: {
    alignSelf: "stretch",
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  detailDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
    flexShrink: 0,
  },
  detailText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    marginHorizontal: 24,
    marginBottom: 32,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
    alignSelf: "stretch",
    alignItems: "center",
  },
  nextButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
});
