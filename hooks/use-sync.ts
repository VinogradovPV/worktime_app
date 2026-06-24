/**
 * Хук для управления синхронизацией
 * Предоставляет доступ к SyncService и статусу синхронизации
 */

import { useEffect, useState, useCallback } from 'react';
import { 
  SyncStatus, 
  SyncResult,
} from '@/shared/types/sync';
import {
  getSyncService,
  initializeSyncService,
  shutdownSyncService,
} from '@/lib/services/sync-service';
import {
  getPendingEventCount,
  getErrorEventCount,
  getLastSyncTime,
  getSyncStats,
} from '@/lib/services/sync-storage';
import { generateUUID } from '@/lib/utils';

interface UseSyncState {
  status: SyncStatus;
  is_syncing: boolean;
  pending_count: number;
  error_count: number;
  last_sync_at: string | null;
  api_available: boolean;
  error: string | null;
}

/**
 * Хук для использования синхронизации
 */
export function useSync(userId: string) {
  const [state, setState] = useState<UseSyncState>({
    status: 'pending_sync',
    is_syncing: false,
    pending_count: 0,
    error_count: 0,
    last_sync_at: null,
    api_available: true,
    error: null,
  });

  const [deviceId] = useState(() => {
    // Генерировать или получить device ID
    return generateUUID();
  });

  // Инициализировать SyncService
  useEffect(() => {
    const initialize = async () => {
      try {
        const syncService = await initializeSyncService(userId, deviceId);
        
        // Проверить доступность API
        const isHealthy = await syncService.checkHealth();
        
        // Обновить статистику
        const stats = await getSyncStats(userId);
        const lastSync = await getLastSyncTime(userId);

        setState(prev => ({
          ...prev,
          api_available: isHealthy,
          pending_count: stats.pending_events,
          error_count: stats.error_events,
          last_sync_at: lastSync,
          status: stats.error_events > 0 ? 'error' : 'pending_sync',
        }));
      } catch (error) {
        console.error('[useSync] Ошибка инициализации:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        }));
      }
    };

    initialize();

    // Очистка при размонтировании
    return () => {
      shutdownSyncService().catch(console.error);
    };
  }, [userId, deviceId]);

  // Периодически обновлять статистику
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const stats = await getSyncStats(userId);
        const lastSync = await getLastSyncTime(userId);

        setState(prev => ({
          ...prev,
          pending_count: stats.pending_events,
          error_count: stats.error_events,
          last_sync_at: lastSync,
          status: stats.error_events > 0 ? 'error' : 
                  stats.pending_events > 0 ? 'pending_sync' : 'synced',
        }));
      } catch (error) {
        console.error('[useSync] Ошибка обновления статистики:', error);
      }
    }, 5000); // Обновлять каждые 5 секунд

    return () => clearInterval(interval);
  }, [userId]);

  // Выполнить синхронизацию
  const sync = useCallback(async (): Promise<SyncResult | null> => {
    const syncService = getSyncService();
    if (!syncService) {
      console.error('[useSync] SyncService не инициализирован');
      return null;
    }

    setState(prev => ({ ...prev, is_syncing: true, error: null }));

    try {
      const result = await syncService.sync();

      // Обновить статистику
      const stats = await getSyncStats(userId);
      const lastSync = await getLastSyncTime(userId);

      setState(prev => ({
        ...prev,
        is_syncing: false,
        pending_count: stats.pending_events,
        error_count: stats.error_events,
        last_sync_at: lastSync,
        status: result.success ? 'synced' : 'error',
        api_available: true,
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setState(prev => ({
        ...prev,
        is_syncing: false,
        status: 'error',
        error: errorMessage,
        api_available: false,
      }));
      return null;
    }
  }, [userId]);

  // Проверить доступность API
  const checkHealth = useCallback(async (): Promise<boolean> => {
    const syncService = getSyncService();
    if (!syncService) {
      return false;
    }

    try {
      const isHealthy = await syncService.checkHealth();
      setState(prev => ({ ...prev, api_available: isHealthy }));
      return isHealthy;
    } catch (error) {
      console.error('[useSync] Ошибка проверки здоровья:', error);
      setState(prev => ({ ...prev, api_available: false }));
      return false;
    }
  }, []);

  // Получить статус синхронизации
  const getStatus = useCallback(() => {
    return state;
  }, [state]);

  return {
    ...state,
    sync,
    checkHealth,
    getStatus,
    deviceId,
  };
}

/**
 * Хук для отслеживания статуса одного события
 */
export function useSyncEventStatus(userId: string, clientEventId: string) {
  const [status, setStatus] = useState<SyncStatus>('pending_sync');

  useEffect(() => {
    // TODO: Реализовать отслеживание статуса события
  }, [userId, clientEventId]);

  return status;
}
