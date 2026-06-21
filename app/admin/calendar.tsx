import { ScrollView, Text, View, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { ProductionCalendarUpload } from "@/components/ProductionCalendarUpload";
import { useNotifications } from "@/hooks/useNotifications";
import { useState, useEffect } from "react";
import { getProductionCalendar } from "@/lib/storage/notificationSettings";

interface Holiday {
  date: string;
  name: string;
  isMovedWorkday?: boolean;
}

export default function AdminCalendarScreen() {
  const colors = useColors();
  const { uploadProductionCalendar } = useNotifications();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    try {
      const calendar = await getProductionCalendar(new Date().getFullYear());
      if (calendar && calendar.holidays) {
        setHolidays(calendar.holidays);
      }
    } catch (error) {
      console.error("Ошибка при загрузке праздничных дней:", error);
    }
  };

  const handleUpload = async (newHolidayDates: string[]) => {
    try {
      setIsLoading(true);
      const newHolidays: Holiday[] = newHolidayDates.map((date) => ({
        date,
        name: "Праздник",
      }));
      await uploadProductionCalendar({
        id: Date.now().toString(),
        year: new Date().getFullYear(),
        holidays: newHolidays,
        uploadedAt: new Date().toISOString(),
      });
      setHolidays(newHolidays);
      await loadHolidays();
    } catch (error) {
      console.error("Ошибка при загрузке календаря:", error);
      Alert.alert("Ошибка", "Не удалось загрузить производственный календарь");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Заголовок */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-foreground">Администратор</Text>
          <Text className="text-sm text-muted mt-2">Управление производственным календарем</Text>
        </View>

        {/* Загрузка календаря */}
        <View className="mb-8">
          <ProductionCalendarUpload onUpload={handleUpload} isLoading={isLoading} />
        </View>

        {/* Список загруженных праздничных дней */}
        {holidays.length > 0 && (
          <View>
            <Text className="text-lg font-semibold text-foreground mb-4">Загруженные праздничные дни</Text>
            <View className="rounded-lg p-4" style={{ backgroundColor: colors.surface }}>
              <Text className="text-sm text-muted mb-3">Всего дней: {holidays.length}</Text>

              {/* Первые 10 дней */}
              <View className="mb-4">
                <Text className="text-xs font-semibold text-foreground mb-2">Первые 10 дней:</Text>
                {holidays.slice(0, 10).map((holiday, index) => (
                  <Text key={index} className="text-xs text-muted py-1">
                    • {holiday.date} - {holiday.name}
                  </Text>
                ))}
              </View>

              {holidays.length > 10 && (
                <Text className="text-xs text-muted">
                  ... и еще {holidays.length - 10} дней
                </Text>
              )}
            </View>

            {/* Информация */}
            <View className="mt-6 rounded-lg p-4" style={{ backgroundColor: colors.surface }}>
              <Text className="text-sm font-semibold text-foreground mb-2">Информация</Text>
              <Text className="text-xs text-muted">
                Загруженный производственный календарь используется для исключения праздничных дней из расчета рабочего времени и отправки уведомлений.
              </Text>
            </View>
          </View>
        )}

        {holidays.length === 0 && (
          <View className="rounded-lg p-4 items-center" style={{ backgroundColor: colors.surface }}>
            <Text className="text-sm text-muted">Производственный календарь еще не загружен</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
