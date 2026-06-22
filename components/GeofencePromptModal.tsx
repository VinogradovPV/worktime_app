import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { GeofencePrompt } from "@/lib/services/geofenceService";
import { useColors } from "@/hooks/use-colors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface GeofencePromptModalProps {
  prompt: GeofencePrompt | null;
  onConfirmStart: () => void;
  onConfirmReturn: () => void;
  onConfirmTempExit: () => void;
  onConfirmComplete: () => void;
  onDismiss: () => void;
}

export function GeofencePromptModal({
  prompt,
  onConfirmStart,
  onConfirmReturn,
  onConfirmTempExit,
  onConfirmComplete,
  onDismiss,
}: GeofencePromptModalProps) {
  const colors = useColors();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (prompt) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [prompt]);

  if (!prompt) return null;

  const content = getPromptContent(prompt.type, prompt.zone.name);

  return (
    <Modal
      visible={!!prompt}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onDismiss}
      />

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <View style={[styles.iconContainer, { backgroundColor: content.iconBg }]}>
          <Text style={styles.iconText}>{content.icon}</Text>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          {content.title}
        </Text>

        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {content.subtitle}
        </Text>

        <View style={styles.buttonsContainer}>
          {content.buttons.map((btn, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.button,
                {
                  backgroundColor: btn.primary ? colors.primary : colors.background,
                  borderColor: colors.border,
                  borderWidth: btn.primary ? 0 : 1,
                },
              ]}
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                btn.action();
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: btn.primary ? "#FFFFFF" : colors.foreground,
                    fontWeight: btn.primary ? "600" : "400",
                  },
                ]}
              >
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={[styles.dismissText, { color: colors.muted }]}>
              Не сейчас
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );

  function getPromptContent(
    type: GeofencePrompt["type"],
    zoneName: string
  ): {
    icon: string;
    iconBg: string;
    title: string;
    subtitle: string;
    buttons: { label: string; primary: boolean; action: () => void }[];
  } {
    switch (type) {
      case "enter_not_started":
        return {
          icon: "🏢",
          iconBg: "#E6F4FE",
          title: `Вы вошли в зону «${zoneName}»`,
          subtitle: "Начать учёт рабочего времени?",
          buttons: [
            {
              label: "Начать работу",
              primary: true,
              action: () => { onConfirmStart(); onDismiss(); },
            },
          ],
        };

      case "enter_on_exit":
        return {
          icon: "↩️",
          iconBg: "#E6F4FE",
          title: `Вы вернулись в зону «${zoneName}»`,
          subtitle: "Зафиксировать возвращение на работу?",
          buttons: [
            {
              label: "Вернуться на работу",
              primary: true,
              action: () => { onConfirmReturn(); onDismiss(); },
            },
          ],
        };

      case "exit_working":
        return {
          icon: "🚶",
          iconBg: "#FFF3E0",
          title: `Вы вышли из зоны «${zoneName}»`,
          subtitle: "Что зафиксировать?",
          buttons: [
            {
              label: "Временный выход",
              primary: false,
              action: () => { onConfirmTempExit(); onDismiss(); },
            },
            {
              label: "Завершить работу",
              primary: true,
              action: () => { onConfirmComplete(); onDismiss(); },
            },
          ],
        };

      case "exit_on_break":
        return {
          icon: "☕",
          iconBg: "#F3F4F6",
          title: `Вы вышли из зоны «${zoneName}»`,
          subtitle: "Вы вышли из рабочей зоны во время перерыва.",
          buttons: [],
        };

      case "low_accuracy":
        return {
          icon: "📡",
          iconBg: "#FFF3E0",
          title: "Геолокация определена неточно",
          subtitle: "GPS-сигнал слабый. Проверьте событие вручную или подождите улучшения сигнала.",
          buttons: [],
        };

      default:
        return {
          icon: "📍",
          iconBg: "#F3F4F6",
          title: "Геозона",
          subtitle: "",
          buttons: [],
        };
    }
  }
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconText: { fontSize: 28 },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonsContainer: { width: "100%", gap: 10 },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { fontSize: 16, lineHeight: 20 },
  dismissButton: { paddingVertical: 12, alignItems: "center", marginTop: 4 },
  dismissText: { fontSize: 15, lineHeight: 20 },
});
