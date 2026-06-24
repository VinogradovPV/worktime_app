import { ScrollView, Text, View, TouchableOpacity, TextInput, Switch, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useI18n } from "@/hooks/useI18n";
import { useNotifications } from "@/hooks/useNotifications";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useState, useEffect } from "react";
import * as Haptics from "expo-haptics";
import { getSyncService } from "@/lib/services/sync-service";
import { getAdaptiveSyncManager } from "@/lib/services/adaptive-sync-manager";
import { getPendingEventCount } from "@/lib/services/sync-storage";
import { SyncStatusBadge } from "@/components/sync-status-badge";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { settings, vacationPeriods, updateSettings, addVacation, removeVacation } = useNotifications();
  const [morningTime, setMorningTime] = useState("09:30");
  const [eveningTime, setEveningTime] = useState("10:00");
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [eveningEnabled, setEveningEnabled] = useState(true);
  const [endOfDayEnabled, setEndOfDayEnabled] = useState(true);
  const [endOfDayTime, setEndOfDayTime] = useState("18:00");
  const [vacationStartDate, setVacationStartDate] = useState("");
  const [vacationEndDate, setVacationEndDate] = useState("");
  const [vacationType, setVacationType] = useState<"vacation" | "sick_leave" | "unpaid_leave">("vacation");
  const [syncInfo, setSyncInfo] = useState({
    lastSyncAt: null as string | null,
    pendingCount: 0,
    isOnline: true,
    syncMode: 'active' as 'active' | 'idle' | 'night' | 'offline',
  });
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      setMorningTime(settings.morningNotificationTime);
      setEveningTime(settings.eveningNotificationTime);
      setMorningEnabled(settings.morningNotificationEnabled);
      setEveningEnabled(settings.eveningNotificationEnabled);
      setEndOfDayEnabled(settings.endOfDayReminderEnabled ?? true);
      setEndOfDayTime(settings.endOfDayReminderTime ?? "18:00");
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await updateSettings({
        morningNotificationTime: morningTime,
        eveningNotificationTime: eveningTime,
        morningNotificationEnabled: morningEnabled,
        eveningNotificationEnabled: eveningEnabled,
        endOfDayReminderEnabled: endOfDayEnabled,
        endOfDayReminderTime: endOfDayTime,
      });
      Alert.alert("Успешно", "Настройки уведомлений сохранены");
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось сохранить настройки");
    }
  };

  const handleAddVacation = async () => {
    if (!vacationStartDate || !vacationEndDate) {
      Alert.alert("Ошибка", "Укажите начало и конец отпуска");
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await addVacation(vacationStartDate, vacationEndDate, vacationType);
      setVacationStartDate("");
      setVacationEndDate("");
      Alert.alert("Успешно", "Период отпуска добавлен");
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось добавить период отпуска");
    }
  };

  const handleRemoveVacation = async (periodId: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await removeVacation(periodId);
      Alert.alert("Успешно", "Период отпуска удален");
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось удалить период отпуска");
    }
  };

  const getVacationTypeLabel = (type: string) => {
    switch (type) {
      case "vacation":
        return "Отпуск";
      case "sick_leave":
        return "Больничный";
      case "unpaid_leave":
        return "Неоплачиваемый отпуск";
      default:
        return type;
    }
  };

  const handleManualSync = async () => {
    setSyncLoading(true);
    try {
      const syncService = getSyncService();
      if (syncService) {
        await syncService.sync();
        Alert.alert('Успешно', 'Синхронизация выполнена');
        // Обновить информацию
        const pendingCount = await getPendingEventCount('');
        setSyncInfo(prev => ({ ...prev, pendingCount }));
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Ошибка синхронизации');
      console.error('[SettingsScreen] Ошибка синхронизации:', error);
    } finally {
      setSyncLoading(false);
    }
  };

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Никогда';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;
    
    return date.toLocaleDateString('ru-RU', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Загрузить информацию о синхронизации
  useEffect(() => {
    const loadSyncInfo = async () => {
      try {
        const pendingCount = await getPendingEventCount('');
        
        setSyncInfo({
          lastSyncAt: new Date().toISOString(),
          pendingCount,
          isOnline: true,
          syncMode: 'active',
        });
      } catch (error) {
        console.error('[SettingsScreen] Ошибка загрузки информации о синхронизации:', error);
      }
    };

    loadSyncInfo();
    const interval = setInterval(loadSyncInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Заголовок */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-foreground">{t('settings.title')}</Text>
        </View>

        {/* Выбор языка */}
        <View className="mb-8 rounded-lg p-4" style={{ backgroundColor: colors.surface }}>
          <LanguageSelector />
        </View>

        {/* Выбор темы */}
        <View className="mb-8 rounded-lg p-4" style={{ backgroundColor: colors.surface }}>
          <ThemeSelector />
        </View>

        {/* Раздел уведомлений */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-foreground mb-4">Уведомления</Text>

          {/* Утреннее уведомление */}
          <View className="rounded-lg p-4 mb-4" style={{ backgroundColor: colors.surface }}>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="font-semibold text-foreground">Уведомление о начале дня</Text>
              <Switch
                value={morningEnabled}
                onValueChange={setMorningEnabled}
                trackColor={{ false: colors.border, true: colors.success }}
              />
            </View>
            {morningEnabled && (
              <View>
                <Text className="text-xs text-muted mb-2">Время уведомления (HH:mm)</Text>
                <TextInput
                  value={morningTime}
                  onChangeText={setMorningTime}
                  placeholder="09:30"
                  placeholderTextColor={colors.muted}
                  className="border rounded-lg p-3 text-foreground"
                  style={{ borderColor: colors.border }}
                  maxLength={5}
                />
              </View>
            )}
          </View>

          {/* Вечернее уведомление */}
          <View className="rounded-lg p-4 mb-4" style={{ backgroundColor: colors.surface }}>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="font-semibold text-foreground">Отчет за предыдущий день</Text>
              <Switch
                value={eveningEnabled}
                onValueChange={setEveningEnabled}
                trackColor={{ false: colors.border, true: colors.success }}
              />
            </View>
            {eveningEnabled && (
              <View>
                <Text className="text-xs text-muted mb-2">Время уведомления (HH:mm)</Text>
                <TextInput
                  value={eveningTime}
                  onChangeText={setEveningTime}
                  placeholder="10:00"
                  placeholderTextColor={colors.muted}
                  className="border rounded-lg p-3 text-foreground"
                  style={{ borderColor: colors.border }}
                  maxLength={5}
                />
              </View>
            )}
          </View>

          {/* Напоминание о завершении дня */}
          <View className="rounded-lg p-4 mb-4" style={{ backgroundColor: colors.surface }}>
            <View className="flex-row justify-between items-center mb-3">
              <Text className="font-semibold text-foreground">Напоминание о завершении дня</Text>
              <Switch
                value={endOfDayEnabled}
                onValueChange={setEndOfDayEnabled}
                trackColor={{ false: colors.border, true: colors.success }}
              />
            </View>
            {endOfDayEnabled && (
              <View>
                <Text className="text-xs text-muted mb-2">Время уведомления (HH:mm)</Text>
                <TextInput
                  value={endOfDayTime}
                  onChangeText={setEndOfDayTime}
                  placeholder="18:00"
                  placeholderTextColor={colors.muted}
                  className="border rounded-lg p-3 text-foreground"
                  style={{ borderColor: colors.border }}
                  maxLength={5}
                />
              </View>
            )}
          </View>

          {/* Кнопка сохранения */}
          <TouchableOpacity
            className="rounded-lg p-3 items-center justify-center mb-6"
            style={{ backgroundColor: colors.primary }}
            onPress={handleSaveSettings}
          >
            <Text className="text-white font-semibold">Сохранить настройки</Text>
          </TouchableOpacity>
        </View>

        {/* Раздел отпусков */}
        <View className="mb-8">
          <Text className="text-lg font-semibold text-foreground mb-4">Управление отпусками</Text>

          {/* Форма добавления отпуска */}
          <View className="rounded-lg p-4 mb-4" style={{ backgroundColor: colors.surface }}>
            <Text className="text-sm font-semibold text-foreground mb-3">Добавить период отпуска</Text>

            <View className="mb-3">
              <Text className="text-xs text-muted mb-2">Начало (YYYY-MM-DD)</Text>
              <TextInput
                value={vacationStartDate}
                onChangeText={setVacationStartDate}
                placeholder="2026-06-21"
                placeholderTextColor={colors.muted}
                className="border rounded-lg p-3 text-foreground"
                style={{ borderColor: colors.border }}
              />
            </View>

            <View className="mb-3">
              <Text className="text-xs text-muted mb-2">Конец (YYYY-MM-DD)</Text>
              <TextInput
                value={vacationEndDate}
                onChangeText={setVacationEndDate}
                placeholder="2026-06-28"
                placeholderTextColor={colors.muted}
                className="border rounded-lg p-3 text-foreground"
                style={{ borderColor: colors.border }}
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs text-muted mb-2">Тип отпуска</Text>
              <View className="flex-row gap-2">
                {(["vacation", "sick_leave", "unpaid_leave"] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    className="flex-1 rounded-lg p-2 items-center"
                    style={{
                      backgroundColor: vacationType === type ? colors.primary : colors.border,
                    }}
                    onPress={() => setVacationType(type)}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: vacationType === type ? "white" : colors.foreground }}
                    >
                      {getVacationTypeLabel(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              className="rounded-lg p-3 items-center justify-center"
              style={{ backgroundColor: colors.success }}
              onPress={handleAddVacation}
            >
              <Text className="text-white font-semibold">Добавить</Text>
            </TouchableOpacity>
          </View>

          {/* Список отпусков */}
          {vacationPeriods.length > 0 && (
            <View>
              <Text className="text-sm font-semibold text-foreground mb-2">Активные периоды</Text>
              {vacationPeriods.map((period) => (
                <View
                  key={period.id}
                  className="rounded-lg p-3 mb-2 flex-row justify-between items-center"
                  style={{ backgroundColor: colors.surface }}
                >
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">
                      {getVacationTypeLabel(period.type)}
                    </Text>
                    <Text className="text-xs text-muted mt-1">
                      {period.startDate} - {period.endDate}
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="rounded-lg p-2"
                    style={{ backgroundColor: colors.error }}
                    onPress={() => handleRemoveVacation(period.id)}
                  >
                    <Text className="text-white text-xs font-semibold">Удалить</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Раздел информации */}
        <View className="rounded-lg p-4" style={{ backgroundColor: colors.surface }}>
          <Text className="text-sm font-semibold text-foreground mb-2">Информация</Text>
          <Text className="text-xs text-muted">
            Версия приложения: 1.0.0{"\n"}
            Последнее обновление: 20 июня 2026
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
