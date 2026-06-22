import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import Animated, {
  withSpring,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { syncService, SyncStatus } from "@/lib/sync/syncService";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

interface SyncStatusIndicatorProps {
  onSyncPress?: () => void;
  showDetails?: boolean;
}

export function SyncStatusIndicator({
  onSyncPress,
  showDetails = false,
}: SyncStatusIndicatorProps) {
  const colors = useColors();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());
  const scaleAnim = useSharedValue(1);

  useEffect(() => {
    const unsubscribe = syncService.subscribe((status: SyncStatus) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSyncPress = () => {
    scaleAnim.value = withSpring(0.95);
    setTimeout(() => {
      scaleAnim.value = withSpring(1);
    }, 100);

    onSyncPress?.();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const getStatusColor = () => {
    if (syncStatus.isSyncing) return colors.primary;
    if (syncStatus.error) return colors.error;
    if (syncStatus.pendingChanges > 0) return colors.warning;
    return colors.success;
  };

  const getStatusText = () => {
    if (syncStatus.isSyncing) return "Синхронизация...";
    if (syncStatus.error) return "Ошибка синхронизации";
    if (syncStatus.pendingChanges > 0) {
      return `${syncStatus.pendingChanges} изменений`;
    }
    return "Синхронизировано";
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handleSyncPress}
        disabled={syncStatus.isSyncing}
      >
        <View
          className={cn(
            "flex-row items-center gap-2 px-3 py-2 rounded-full",
            syncStatus.isSyncing ? "bg-primary/10" : "bg-surface border border-border"
          )}
        >
          {syncStatus.isSyncing ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ width: 16, height: 16 }}
            />
          ) : (
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getStatusColor() }}
            />
          )}

          <Text
            className={cn(
              "text-xs font-medium",
              syncStatus.isSyncing ? "text-primary" : "text-muted"
            )}
          >
            {getStatusText()}
          </Text>

          {syncStatus.pendingChanges > 0 && !syncStatus.isSyncing && (
            <View
              className="w-5 h-5 rounded-full items-center justify-center ml-1"
              style={{ backgroundColor: colors.warning }}
            >
              <Text className="text-xs font-bold text-background">
                {syncStatus.pendingChanges > 9 ? "9+" : syncStatus.pendingChanges}
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      {showDetails && syncStatus.lastSyncTime && (
        <Text className="text-xs text-muted mt-2">
          Последняя синхронизация:{" "}
          {syncStatus.lastSyncTime.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      )}

      {showDetails && syncStatus.error && (
        <Text className="text-xs text-error mt-2">{syncStatus.error}</Text>
      )}

      {showDetails && syncStatus.syncProgress > 0 && syncStatus.syncProgress < 100 && (
        <View className="mt-2">
          <View className="h-1 bg-border rounded-full overflow-hidden">
            <View
              className="h-full bg-primary"
              style={{ width: `${syncStatus.syncProgress}%` }}
            />
          </View>
          <Text className="text-xs text-muted mt-1">
            Прогресс: {syncStatus.syncProgress}%
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
