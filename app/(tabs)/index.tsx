import { ScrollView, Text, View, TouchableOpacity, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";
import * as Haptics from "expo-haptics";
import { useWorkSessions } from "@/hooks/useWorkSessions";

export default function HomeScreen() {
  const colors = useColors();
  const { currentSession, dailyStats, startWorkSession, endWorkSession, startBreak, endBreak } =
    useWorkSessions();
  const [workStatus, setWorkStatus] = useState<"idle" | "working" | "break">("idle");
  const [elapsedTime, setElapsedTime] = useState(0); // в секундах

  useEffect(() => {
    if (currentSession) {
      setWorkStatus(currentSession.status === "active" ? "working" : "break");
    } else {
      setWorkStatus("idle");
    }
  }, [currentSession]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (workStatus !== "idle" && currentSession) {
      const startTime = new Date(currentSession.startTime).getTime();
      interval = setInterval(() => {
        const now = new Date().getTime();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [workStatus, currentSession]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleStartWork = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await startWorkSession();
    } catch (error) {
      console.error("Ошибка при начале работы:", error);
    }
  };

  const handleEndWork = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await endWorkSession();
      setElapsedTime(0);
    } catch (error) {
      console.error("Ошибка при завершении работы:", error);
    }
  };

  const handleStartBreak = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await startBreak();
      setWorkStatus("break");
      setElapsedTime(0);
    } catch (error) {
      console.error("Ошибка при начале перерыва:", error);
    }
  };

  const handleEndBreak = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await endBreak();
      setWorkStatus("working");
      setElapsedTime(0);
    } catch (error) {
      console.error("Ошибка при завершении перерыва:", error);
    }
  };

  const getStatusText = () => {
    switch (workStatus) {
      case "idle":
        return "Не на работе";
      case "working":
        return "На работе";
      case "break":
        return "На перерыве";
      default:
        return "Неизвестно";
    }
  };

  const getStatusColor = () => {
    switch (workStatus) {
      case "idle":
        return colors.muted;
      case "working":
        return colors.success;
      case "break":
        return colors.warning;
      default:
        return colors.muted;
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 gap-6">
          {/* Статус */}
          <View className="items-center gap-2">
            <Text className="text-4xl font-bold text-foreground">Worktime</Text>
            <View
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: getStatusColor() + "20" }}
            >
              <Text className="text-lg font-semibold" style={{ color: getStatusColor() }}>
                {getStatusText()}
              </Text>
            </View>
          </View>

          {/* Таймер */}
          <View className="items-center">
            <Text className="text-6xl font-bold text-foreground font-mono">
              {formatTime(elapsedTime)}
            </Text>
            <Text className="text-sm text-muted mt-2">
              {workStatus === "working" && "Время на работе"}
              {workStatus === "break" && "Время перерыва"}
              {workStatus === "idle" && "Рабочий день не начат"}
            </Text>
          </View>

          {/* Информация о дне */}
          <View className="bg-surface rounded-lg p-4 border border-border">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm font-semibold text-muted">Сегодня отработано</Text>
              <Text className="text-2xl font-bold text-foreground">
                {dailyStats ? dailyStats.totalWorkTime.toFixed(1) : "0.0"} ч
              </Text>
            </View>
            <View className="w-full h-2 bg-border rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${dailyStats ? (dailyStats.totalWorkTime / 8) * 100 : 0}%`,
                  backgroundColor: colors.primary,
                }}
              />
            </View>
            <Text className="text-xs text-muted mt-2">Норма: 8 часов</Text>
          </View>

          {/* Кнопки действий */}
          <View className="gap-3">
            {workStatus === "idle" ? (
              <Pressable
                onPress={handleStartWork}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.success,
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
                className="py-4 rounded-lg items-center justify-center"
              >
                <Text className="text-lg font-bold text-white">Начать работу</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleEndWork}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.error,
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
                className="py-4 rounded-lg items-center justify-center"
              >
                <Text className="text-lg font-bold text-white">Завершить работу</Text>
              </Pressable>
            )}

            {workStatus === "working" ? (
              <Pressable
                onPress={handleStartBreak}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.warning,
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
                className="py-4 rounded-lg items-center justify-center"
              >
                <Text className="text-lg font-bold text-white">Начать перерыв</Text>
              </Pressable>
            ) : workStatus === "break" ? (
              <Pressable
                onPress={handleEndBreak}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.warning,
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}
                className="py-4 rounded-lg items-center justify-center"
              >
                <Text className="text-lg font-bold text-white">Завершить перерыв</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              className="py-4 rounded-lg items-center justify-center"
            >
              <Text className="text-lg font-bold text-white">Мои задачи</Text>
            </Pressable>
          </View>

          {/* Быстрая информация */}
          <View className="gap-2">
            <View className="flex-row gap-2">
              <View className="flex-1 bg-surface rounded-lg p-3 border border-border">
                <Text className="text-xs text-muted">Перерывов</Text>
                <Text className="text-xl font-bold text-foreground mt-1">
                  {currentSession ? currentSession.breaks.length : "0"}
                </Text>
              </View>
              <View className="flex-1 bg-surface rounded-lg p-3 border border-border">
                <Text className="text-xs text-muted">Время перерыва</Text>
                <Text className="text-xl font-bold text-foreground mt-1">
                  {currentSession ? Math.floor(currentSession.totalBreakTime / 60) : "0"}м
                </Text>
              </View>
              <View className="flex-1 bg-surface rounded-lg p-3 border border-border">
                <Text className="text-xs text-muted">Статус</Text>
                <Text className="text-xl font-bold text-foreground mt-1">ОК</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
