import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/hooks/useI18n';
import { useWorkDay } from '@/hooks/useWorkDay';
import { WorkDayTimer } from '@/components/WorkDayTimer';
import { WorkDayActions } from '@/components/WorkDayActions';
import { WorkDayHistory } from '@/components/WorkDayHistory';
import { RecommendationsSummary } from '@/components/RecommendationsSummary';
import { WeeklyAnalyticsWidget } from '@/components/WeeklyAnalyticsWidget';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
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
    <ScreenContainer className="px-4">
      <ScrollView 
        contentContainerStyle={{ 
          flexGrow: 1,
          paddingBottom: 88 + insets.bottom,
        }} 
        showsVerticalScrollIndicator={false}
      >
        {/* Заголовок */}
        <View className="flex-row justify-between items-center mb-6" style={{ marginTop: insets.top + 8 }}>
          <View>
            <Text className="text-3xl font-bold text-foreground mt-2">{t('home.title')}</Text>
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

        {/* Виджет аналитики недели */}
        <View className="mb-6">
          <WeeklyAnalyticsWidget />
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

        {/* Рекомендации */}
        <View className="mb-8">
          <RecommendationsSummary />
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

        <View style={{ height: 20 }} />
      </ScrollView>
    </ScreenContainer>
  );
}
