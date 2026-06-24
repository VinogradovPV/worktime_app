/**
 * Компонент для отображения статуса синхронизации
 * Показывает иконку, текст и цвет в зависимости от статуса
 */

import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SyncStatus, SyncStatusInfo } from '@/shared/types/sync';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  pending_count?: number;
  error_count?: number;
  last_sync_at?: string;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  showTimestamp?: boolean;
}

/**
 * Получить информацию о статусе синхронизации
 */
function getSyncStatusInfo(status: SyncStatus, t: (key: string) => string): SyncStatusInfo {
  const statusMap: Record<SyncStatus, SyncStatusInfo> = {
    pending_sync: {
      status: 'pending_sync',
      message: t('sync.pending'),
      icon: 'clock',
      color: '#F59E0B',
      is_syncing: false,
      pending_count: 0,
      error_count: 0,
    },
    synced: {
      status: 'synced',
      message: t('sync.synced'),
      icon: 'check',
      color: '#22C55E',
      is_syncing: false,
      pending_count: 0,
      error_count: 0,
    },
    error: {
      status: 'error',
      message: t('sync.error'),
      icon: 'error',
      color: '#EF4444',
      is_syncing: false,
      pending_count: 0,
      error_count: 0,
    },
    requires_review: {
      status: 'requires_review',
      message: t('sync.requiresReview'),
      icon: 'alert',
      color: '#F59E0B',
      is_syncing: false,
      pending_count: 0,
      error_count: 0,
    },
    conflict: {
      status: 'conflict',
      message: t('conflicts.title'),
      icon: 'alert',
      color: '#F59E0B',
      is_syncing: false,
      pending_count: 0,
      error_count: 0,
    },
  };

  return statusMap[status];
}

/**
 * Получить иконку для статуса
 */
function getStatusIcon(icon: string): keyof typeof MaterialIcons.glyphMap {
  const iconMap: Record<string, keyof typeof MaterialIcons.glyphMap> = {
    check: 'check-circle',
    clock: 'schedule',
    error: 'error',
    alert: 'warning',
    sync: 'sync',
  };

  return iconMap[icon] || 'help';
}

/**
 * Форматировать время последней синхронизации
 */
function formatLastSyncTime(timestamp: string | undefined): string {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Менее 1 минуты
  if (diff < 60000) {
    return 'только что';
  }

  // Менее 1 часа
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} мин назад`;
  }

  // Менее 24 часов
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} ч назад`;
  }

  // Дни
  const days = Math.floor(diff / 86400000);
  return `${days} дн назад`;
}

/**
 * SyncStatusBadge компонент
 */
export function SyncStatusBadge({
  status,
  pending_count = 0,
  error_count = 0,
  last_sync_at,
  size = 'medium',
  showText = true,
  showTimestamp = false,
}: SyncStatusBadgeProps) {
  const colors = useColors();
  const { t } = useI18n();
  const statusInfo = getSyncStatusInfo(status, t);
  const iconName = getStatusIcon(statusInfo.icon);

  const sizeMap = {
    small: { icon: 16, badge: 'px-2 py-1', text: 'text-xs' },
    medium: { icon: 20, badge: 'px-3 py-2', text: 'text-sm' },
    large: { icon: 24, badge: 'px-4 py-3', text: 'text-base' },
  };

  const sizeConfig = sizeMap[size];

  return (
    <View className="flex-row items-center gap-2">
      {/* Основной статус */}
      <View
        className={cn(
          'flex-row items-center gap-2 rounded-full bg-opacity-10',
          sizeConfig.badge
        )}
        style={{ backgroundColor: `${statusInfo.color}20` }}
      >
        {status === 'pending_sync' ? (
          <ActivityIndicator size="small" color={statusInfo.color} />
        ) : (
          <MaterialIcons
            name={iconName}
            size={sizeConfig.icon}
            color={statusInfo.color}
          />
        )}

        {showText && (
          <Text
            className={cn('font-medium', sizeConfig.text)}
            style={{ color: statusInfo.color }}
          >
            {statusInfo.message}
          </Text>
        )}
      </View>

      {/* Счетчик ошибок */}
      {error_count > 0 && (
        <View
          className="rounded-full bg-red-500 px-2 py-1"
          style={{ backgroundColor: '#EF4444' }}
        >
          <Text className="text-xs font-bold text-white">{error_count}</Text>
        </View>
      )}

      {/* Счетчик ожидающих */}
      {pending_count > 0 && status !== 'pending_sync' && (
        <View
          className="rounded-full bg-yellow-500 px-2 py-1"
          style={{ backgroundColor: '#F59E0B' }}
        >
          <Text className="text-xs font-bold text-white">{pending_count}</Text>
        </View>
      )}

      {/* Время последней синхронизации */}
      {showTimestamp && last_sync_at && (
        <Text className="text-xs text-muted">
          {formatLastSyncTime(last_sync_at)}
        </Text>
      )}
    </View>
  );
}

/**
 * Компактный вариант статуса (только иконка)
 */
export function SyncStatusIcon({
  status,
  size = 24,
}: {
  status: SyncStatus;
  size?: number;
}) {
  const { t } = useI18n();
  const statusInfo = getSyncStatusInfo(status, t);
  const iconName = getStatusIcon(statusInfo.icon);

  return status === 'pending_sync' ? (
    <ActivityIndicator size="small" color={statusInfo.color} />
  ) : (
    <MaterialIcons
      name={iconName}
      size={size}
      color={statusInfo.color}
    />
  );
}

/**
 * Компонент для отображения деталей синхронизации
 */
export function SyncStatusDetails({
  status,
  pending_count,
  error_count,
  last_sync_at,
}: {
  status: SyncStatus;
  pending_count: number;
  error_count: number;
  last_sync_at?: string;
}) {
  const colors = useColors();
  const { t } = useI18n();
  const statusInfo = getSyncStatusInfo(status, t);

  return (
    <View className="gap-2 rounded-lg bg-surface p-4">
      {/* Заголовок */}
      <View className="flex-row items-center gap-2">
        <SyncStatusIcon status={status} size={20} />
        <Text className="flex-1 text-base font-semibold text-foreground">
          {statusInfo.message}
        </Text>
      </View>

      {/* Статистика */}
      <View className="gap-1">
        {pending_count > 0 && (
          <Text className="text-sm text-muted">
            Ожидают синхронизации: {pending_count}
          </Text>
        )}

        {error_count > 0 && (
          <Text className="text-sm text-error">
            Ошибок: {error_count}
          </Text>
        )}

        {last_sync_at && (
          <Text className="text-sm text-muted">
            Последняя синхронизация: {formatLastSyncTime(last_sync_at)}
          </Text>
        )}
      </View>
    </View>
  );
}
