import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useWorkSessions } from "@/hooks/useWorkSessions";
import { useState, useEffect } from "react";
import * as Haptics from "expo-haptics";

export default function HomeScreen() {
  const colors = useColors();
  const { currentSession, dailyStats, startWorkSession, endWorkSession, startBreak, endBreak } =
    useWorkSessions();
  const [currentTime, setCurrentTime] = useState("00:00:00");
  const [elapsedTime, setElapsedTime] = useState(0);

  // Обновление текущего времени и прошедшего времени
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}:${seconds}`);

      // Вычисление прошедшего времени текущей сессии
      if (currentSession && !currentSession.endTime) {
        const elapsed = Math.floor(
          (new Date().getTime() - new Date(currentSession.startTime).getTime()) / 1000
        );
        setElapsedTime(elapsed);
      } else {
        setElapsedTime(0);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [currentSession]);

  const handleStartWork = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await startWorkSession();
    } catch (error) {
      console.error("Ошибка при начале работы:", error);
    }
  };

  const handleEndWork = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await endWorkSession();
    } catch (error) {
      console.error("Ошибка при завершении работы:", error);
    }
  };

  const handleStartBreak = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await startBreak();
    } catch (error) {
      console.error("Ошибка при начале перерыва:", error);
    }
  };

  const handleEndBreak = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await endBreak();
    } catch (error) {
      console.error("Ошибка при завершении перерыва:", error);
    }
  };

  const formatSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ч ${mins}м`;
  };

  const getStatusText = () => {
    if (!currentSession) return "Не на работе";
    if (currentSession.status === "active" && !currentSession.endTime) return "На работе";
    if (currentSession.status === "paused" && !currentSession.endTime) return "Перерыв";
    return "Не на работе";
  };

  const getStatusColor = () => {
    if (!currentSession) return colors.muted;
    if (currentSession.status === "active" && !currentSession.endTime) return colors.success;
    if (currentSession.status === "paused" && !currentSession.endTime) return colors.warning;
    return colors.muted;
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Заголовок с профилем */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-3xl font-bold text-foreground">Worktime</Text>
            <Text className="text-sm text-muted mt-1">{new Date().toLocaleDateString("ru-RU")}</Text>
          </View>
          <View
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-lg font-bold text-white">👤</Text>
          </View>
        </View>

        {/* Статус */}
        <View className="mb-8">
          <View
            className="rounded-lg p-4 items-center"
            style={{ backgroundColor: getStatusColor() + "20" }}
          >
            <Text className="text-sm text-muted mb-2">Статус</Text>
            <Text className="text-2xl font-bold" style={{ color: getStatusColor() }}>
              {getStatusText()}
            </Text>
          </View>
        </View>

        {/* Большая кнопка таймера */}
        <View className="mb-8 items-center">
          <View
            className="w-40 h-40 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-5xl font-bold text-white">{formatSeconds(elapsedTime)}</Text>
          </View>

          {/* Кнопки действий */}
          <View className="flex-row gap-3 justify-center flex-wrap">
            {!currentSession || currentSession.endTime ? (
              <TouchableOpacity
                className="px-8 py-3 rounded-lg items-center justify-center"
                style={{ backgroundColor: colors.success }}
                onPress={handleStartWork}
              >
                <Text className="text-white font-semibold">Начать</Text>
              </TouchableOpacity>
            ) : currentSession.status === "active" ? (
              <>
                <TouchableOpacity
                  className="px-6 py-3 rounded-lg items-center justify-center"
                  style={{ backgroundColor: colors.warning }}
                  onPress={handleStartBreak}
                >
                  <Text className="text-white font-semibold">Перерыв</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="px-6 py-3 rounded-lg items-center justify-center"
                  style={{ backgroundColor: colors.error }}
                  onPress={handleEndWork}
                >
                  <Text className="text-white font-semibold">Завершить</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  className="px-6 py-3 rounded-lg items-center justify-center"
                  style={{ backgroundColor: colors.success }}
                  onPress={handleEndBreak}
                >
                  <Text className="text-white font-semibold">Продолжить</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="px-6 py-3 rounded-lg items-center justify-center"
                  style={{ backgroundColor: colors.error }}
                  onPress={handleEndWork}
                >
                  <Text className="text-white font-semibold">Завершить</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Статистика за день */}
        {dailyStats && (
          <View className="mb-8">
            <Text className="text-lg font-semibold text-foreground mb-4">Сегодня отработано</Text>
            <View className="flex-row gap-3">
              <View className="flex-1 rounded-lg p-4" style={{ backgroundColor: colors.surface }}>
                <Text className="text-xs text-muted mb-2">Рабочее время</Text>
                <Text className="text-xl font-bold text-foreground">
                  {formatMinutes(Math.floor((dailyStats.totalWorkTime || 0) * 60))}
                </Text>
              </View>
              <View className="flex-1 rounded-lg p-4" style={{ backgroundColor: colors.surface }}>
                <Text className="text-xs text-muted mb-2">Перерывы</Text>
                <Text className="text-xl font-bold text-foreground">
                  {formatMinutes(dailyStats.totalBreakTime || 0)}
                </Text>
              </View>
              <View className="flex-1 rounded-lg p-4" style={{ backgroundColor: colors.surface }}>
                <Text className="text-xs text-muted mb-2">Сеансов</Text>
                <Text className="text-xl font-bold text-foreground">{dailyStats.sessions.length}</Text>
              </View>
            </View>
          </View>
        )}

        {/* История сегодня */}
        {dailyStats && (
          <View>
            <Text className="text-lg font-semibold text-foreground mb-4">История сегодня</Text>
            {dailyStats.sessions.length > 0 ? (
              dailyStats.sessions
                .reverse()
                .map((session: any, index: number) => (
                  <View
                    key={index}
                    className="flex-row justify-between items-center p-3 rounded-lg mb-2"
                    style={{ backgroundColor: colors.surface }}
                  >
                    <View>
                      <Text className="font-semibold text-foreground">
                        {session.status === "active" ? "🟢 Работа" : "🟡 Перерыв"}
                      </Text>
                      <Text className="text-xs text-muted mt-1">
                        {new Date(session.startTime).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {session.endTime
                          ? ` - ${new Date(session.endTime).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : " - в процессе"}
                      </Text>
                    </View>
                    <Text className="font-semibold text-foreground">
                      {session.endTime
                        ? formatMinutes(
                            Math.floor(
                              (new Date(session.endTime).getTime() -
                                new Date(session.startTime).getTime()) /
                                60000
                            )
                          )
                        : formatMinutes(
                            Math.floor(
                              (new Date().getTime() - new Date(session.startTime).getTime()) / 60000
                            )
                          )}
                    </Text>
                  </View>
                ))
            ) : (
              <Text className="text-center text-muted py-8">Сегодня еще нет записей</Text>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
