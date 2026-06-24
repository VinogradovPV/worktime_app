import { ScrollView, Text, View, RefreshControl } from 'react-native';
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
import { TodayEventsCard } from '@/components/TodayEventsCard';
import { GeofencePromptModal } from '@/components/GeofencePromptModal';
import { useGeofence } from '@/hooks/useGeofence';
import * as Haptics from 'expo-haptics';
import { SyncConflictHandler, useSyncConflictHandler } from '@/components/sync-conflict-handler';
import { SyncStatusBadge } from '@/components/sync-status-badge';
import { useEffect, useState } from 'react';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { workDay, loading, error, stats, availableActions, performAction, refresh } = useWorkDay();

  const workDayStatus = workDay?.status ?? 'not_started';
  const { pendingPrompt, dismissPrompt } = useGeofence(workDayStatus);
  const { visible, conflicts, setVisible, checkConflicts, resolveConflict } = useSyncConflictHandler();

  // Проверить конфликты при загрузке экрана
  useEffect(() => {
    const checkForConflicts = async () => {
      try {
        await checkConflicts('default_user');
      } catch (error) {
        console.error('[HomeScreen] Ошибка проверки конфликтов:', error);
      }
    };

    checkForConflicts();
  }, [checkConflicts]);

  const [refreshing, setRefreshing] = useState(false);

  const handleAction = async (action: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await performAction(action);
    } catch (err) {
      console.error('Error performing action:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      // Также проверить конфликты при refresh
      await checkConflicts('default_user');
    } catch (error) {
      console.error('[HomeScreen] Ошибка при refresh:', error);
    } finally {
      setRefreshing(false);
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Заголовок */}
        <View className="flex-row justify-between items-center mb-6" style={{ marginTop: insets.top + 8 }}>
          <View className="flex-1">
            <Text className="text-3xl font-bold text-foreground mt-2">{t('home.title')}</Text>
            <View className="flex-row items-center mt-1 gap-2">
              <Text className="text-sm text-muted">
                {new Date().toLocaleDateString('ru-RU', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              <SyncStatusBadge status="synced" size="small" showText={false} />
            </View>
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

        {/* Карточка событий дня */}
        {workDay && workDay.events.length > 0 && (
          <View className="mb-6">
            <TodayEventsCard workDay={workDay} onWorkDayUpdated={refresh} />
          </View>
        )}

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

      {/* Геозона: предложение действия при входе/выходе */}
      <GeofencePromptModal
        prompt={pendingPrompt}
        onConfirmStart={() => handleAction('start')}
        onConfirmReturn={() => handleAction('end_temporary_exit')}
        onConfirmTempExit={() => handleAction('start_temporary_exit')}
        onConfirmComplete={() => handleAction('complete')}
        onDismiss={dismissPrompt}
      />

      {/* Обработчик конфликтов синхронизации */}
      <SyncConflictHandler
        visible={visible}
        conflicts={conflicts}
        onResolve={resolveConflict}
        onClose={() => setVisible(false)}
      />
    </ScreenContainer>
  );
}
