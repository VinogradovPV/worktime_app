import { ScrollView, Text, View, TouchableOpacity, Switch } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useState } from "react";

export default function SettingsScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState<"ru" | "en">("ru");
  const [theme, setTheme] = useState<"light" | "dark" | "auto">("auto");

  const SettingItem = ({
    label,
    value,
    onPress,
  }: {
    label: string;
    value?: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      className="flex-row justify-between items-center py-3 px-4 border-b border-border"
      style={{ borderColor: colors.border }}
      onPress={onPress}
    >
      <Text className="text-base text-foreground">{label}</Text>
      {value && <Text className="text-sm text-muted">{value}</Text>}
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="p-0">
      <ScrollView>
        {/* Профиль пользователя */}
        <View className="bg-surface px-4 py-6 border-b border-border" style={{ borderColor: colors.border }}>
          <Text className="text-3xl font-bold text-foreground mb-2">Настройки</Text>
          <Text className="text-sm text-muted">Иван Иванов</Text>
          <Text className="text-xs text-muted mt-1">Сотрудник</Text>
        </View>

        {/* Приложение */}
        <View className="mt-4">
          <Text className="text-sm font-semibold text-muted px-4 py-2">ПРИЛОЖЕНИЕ</Text>

          <View className="bg-surface border-t border-b border-border" style={{ borderColor: colors.border }}>
            <SettingItem
              label="Язык"
              value={language === "ru" ? "Русский" : "English"}
              onPress={() => setLanguage(language === "ru" ? "en" : "ru")}
            />

            <SettingItem
              label="Тема"
              value={
                theme === "light"
                  ? "Светлая"
                  : theme === "dark"
                    ? "Темная"
                    : "Автоматически"
              }
              onPress={() => {
                const themes: Array<"light" | "dark" | "auto"> = ["light", "dark", "auto"];
                const currentIndex = themes.indexOf(theme);
                setTheme(themes[(currentIndex + 1) % themes.length]);
              }}
            />
          </View>
        </View>

        {/* Уведомления */}
        <View className="mt-4">
          <Text className="text-sm font-semibold text-muted px-4 py-2">УВЕДОМЛЕНИЯ</Text>

          <View className="bg-surface border-t border-b border-border" style={{ borderColor: colors.border }}>
            <View className="flex-row justify-between items-center py-3 px-4 border-b border-border" style={{ borderColor: colors.border }}>
              <Text className="text-base text-foreground">Включить уведомления</Text>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor={notifications ? colors.success : colors.muted}
              />
            </View>

            <SettingItem label="Напоминание о начале работы" />
            <SettingItem label="Напоминание о завершении работы" />
            <SettingItem label="Уведомления о перерывах" />
          </View>
        </View>

        {/* Приватность и безопасность */}
        <View className="mt-4">
          <Text className="text-sm font-semibold text-muted px-4 py-2">ПРИВАТНОСТЬ И БЕЗОПАСНОСТЬ</Text>

          <View className="bg-surface border-t border-b border-border" style={{ borderColor: colors.border }}>
            <SettingItem label="Информация о GPS" />
            <SettingItem label="Смена пароля" />
            <SettingItem label="Двухфакторная аутентификация" />
          </View>
        </View>

        {/* О приложении */}
        <View className="mt-4">
          <Text className="text-sm font-semibold text-muted px-4 py-2">О ПРИЛОЖЕНИИ</Text>

          <View className="bg-surface border-t border-b border-border" style={{ borderColor: colors.border }}>
            <SettingItem label="Версия" value="1.0.0" />
            <SettingItem label="Политика конфиденциальности" />
            <SettingItem label="Условия использования" />
          </View>
        </View>

        {/* Действия */}
        <View className="mt-6 px-4 pb-6">
          <TouchableOpacity
            className="w-full py-3 rounded-lg items-center justify-center border border-error"
            style={{ borderColor: colors.error }}
          >
            <Text className="text-base font-semibold" style={{ color: colors.error }}>
              Выход из аккаунта
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
