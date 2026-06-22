import { ScrollView, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useWorkDay } from '@/hooks/useWorkDay';
import { WorkDayTimer } from '@/components/WorkDayTimer';
import { WorkDayActions } from '@/components/WorkDayActions';
import { WorkDayHistory } from '@/components/WorkDayHistory';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const colors = useColors();
  const { workDay, loading, error, stats, availableActions, performAction, refresh } = useWorkDay();

  const handleAction = async (action: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await performAction(action);
    } catch (err) {
      console.error('Error performing action:', err);
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Заголовок */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-3xl font-bold text-foreground">Worktime</Text>
            <Text className="text-sm text-muted mt-1">
              {new Date().toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          <View
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-lg font-bold text-white">👤</Text>
          </View>
        </View>

        {/* Таймер и статистика */}
        <View className="mb-8">
          {loading ? (
            <View className="items-center justify-center py-12">
              <Text className="text-muted">Загрузка...</Text>
            </View>
          ) : (
            <WorkDayTimer workDay={workDay} />
          )}
        </View>

        {/* Кнопки действий */}
        <View className="mb-8">
          <WorkDayActions
            workDay={workDay}
            availableActions={availableActions}
            onAction={handleAction}
            loading={loading}
            error={error}
          />
        </View>

        {/* История событий */}
        {workDay && workDay.events.length > 0 && (
          <View className="mb-8">
            <Text className="text-lg font-semibold text-foreground mb-4">История событий</Text>
            <WorkDayHistory workDay={workDay} />
          </View>
        )}

        {/* Пустое состояние */}
        {workDay && workDay.events.length === 0 && (
          <View className="items-center justify-center py-12">
            <Text className="text-muted text-center">
              Нажмите "Начать работу" чтобы начать отслеживание времени
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
