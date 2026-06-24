/**
 * Сервис для работы с локальным хранилищем синхронизации
 * Управляет очередью pending_sync событий
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkEvent, SyncQueue, SyncStatus } from '@/shared/types/sync';
import { generateUUID } from '@/lib/utils';

const STORAGE_KEYS = {
  SYNC_QUEUE: 'worktime_sync_queue',
  PENDING_EVENTS: 'worktime_pending_events',
  SYNC_HISTORY: 'worktime_sync_history',
  LAST_SYNC_TIME: 'worktime_last_sync_time',
} as const;

/**
 * Инициализировать хранилище синхронизации
 */
export async function initializeSyncStorage(): Promise<void> {
  try {
    // Проверить существование очереди
    const queue = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
    if (!queue) {
      const emptyQueue: SyncQueue = {
        id: generateUUID(),
        user_id: '', // Будет установлено при авторизации
        events: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_attempts: 0,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(emptyQueue));
    }
  } catch (error) {
    console.error('[SyncStorage] Ошибка инициализации:', error);
  }
}

/**
 * Получить очередь синхронизации
 */
export async function getSyncQueue(userId: string): Promise<SyncQueue> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
    if (!data) {
      const emptyQueue: SyncQueue = {
        id: generateUUID(),
        user_id: userId,
        events: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_attempts: 0,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(emptyQueue));
      return emptyQueue;
    }

    const queue = JSON.parse(data) as SyncQueue;
    queue.user_id = userId; // Убедиться, что user_id актуален
    return queue;
  } catch (error) {
    console.error('[SyncStorage] Ошибка получения очереди:', error);
    throw error;
  }
}

/**
 * Добавить событие в очередь синхронизации
 */
export async function addEventToSyncQueue(userId: string, event: WorkEvent): Promise<void> {
  try {
    const queue = await getSyncQueue(userId);
    
    // Проверить, что события нет в очереди
    const exists = queue.events.some(e => e.client_event_id === event.client_event_id);
    if (exists) {
      console.warn('[SyncStorage] Событие уже в очереди:', event.client_event_id);
      return;
    }

    queue.events.push(event);
    queue.updated_at = new Date().toISOString();
    
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    console.log('[SyncStorage] Событие добавлено в очередь:', event.client_event_id);
  } catch (error) {
    console.error('[SyncStorage] Ошибка добавления события:', error);
    throw error;
  }
}

/**
 * Получить события, ожидающие синхронизации
 */
export async function getPendingEvents(userId: string): Promise<WorkEvent[]> {
  try {
    const queue = await getSyncQueue(userId);
    return queue.events.filter(e => e.sync_status === 'pending_sync');
  } catch (error) {
    console.error('[SyncStorage] Ошибка получения pending событий:', error);
    return [];
  }
}

/**
 * Обновить статус события в очереди
 */
export async function updateEventSyncStatus(
  userId: string,
  clientEventId: string,
  status: SyncStatus,
  serverEventId?: string,
  error?: string
): Promise<void> {
  try {
    const queue = await getSyncQueue(userId);
    
    const event = queue.events.find(e => e.client_event_id === clientEventId);
    if (!event) {
      console.warn('[SyncStorage] Событие не найдено:', clientEventId);
      return;
    }

    event.sync_status = status;
    event.updated_at = new Date().toISOString();
    
    if (serverEventId) {
      event.server_event_id = serverEventId;
    }
    
    if (error) {
      event.sync_error = error;
    }

    queue.updated_at = new Date().toISOString();
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    
    console.log('[SyncStorage] Статус события обновлен:', clientEventId, status);
  } catch (error) {
    console.error('[SyncStorage] Ошибка обновления статуса:', error);
    throw error;
  }
}

/**
 * Удалить событие из очереди
 */
export async function removeEventFromQueue(userId: string, clientEventId: string): Promise<void> {
  try {
    const queue = await getSyncQueue(userId);
    
    queue.events = queue.events.filter(e => e.client_event_id !== clientEventId);
    queue.updated_at = new Date().toISOString();
    
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    console.log('[SyncStorage] Событие удалено из очереди:', clientEventId);
  } catch (error) {
    console.error('[SyncStorage] Ошибка удаления события:', error);
    throw error;
  }
}

/**
 * Получить количество событий в очереди
 */
export async function getPendingEventCount(userId: string): Promise<number> {
  try {
    const queue = await getSyncQueue(userId);
    return queue.events.filter(e => e.sync_status === 'pending_sync').length;
  } catch (error) {
    console.error('[SyncStorage] Ошибка получения количества:', error);
    return 0;
  }
}

/**
 * Получить количество событий с ошибками
 */
export async function getErrorEventCount(userId: string): Promise<number> {
  try {
    const queue = await getSyncQueue(userId);
    return queue.events.filter(e => e.sync_status === 'error').length;
  } catch (error) {
    console.error('[SyncStorage] Ошибка получения количества ошибок:', error);
    return 0;
  }
}

/**
 * Очистить очередь синхронизации
 */
export async function clearSyncQueue(userId: string): Promise<void> {
  try {
    const emptyQueue: SyncQueue = {
      id: generateUUID(),
      user_id: userId,
      events: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_attempts: 0,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(emptyQueue));
    console.log('[SyncStorage] Очередь очищена');
  } catch (error) {
    console.error('[SyncStorage] Ошибка очистки очереди:', error);
    throw error;
  }
}

/**
 * Обновить время последней синхронизации
 */
export async function updateLastSyncTime(userId: string): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    await AsyncStorage.setItem(`${STORAGE_KEYS.LAST_SYNC_TIME}_${userId}`, timestamp);
  } catch (error) {
    console.error('[SyncStorage] Ошибка обновления времени синхронизации:', error);
  }
}

/**
 * Получить время последней синхронизации
 */
export async function getLastSyncTime(userId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`${STORAGE_KEYS.LAST_SYNC_TIME}_${userId}`);
  } catch (error) {
    console.error('[SyncStorage] Ошибка получения времени синхронизации:', error);
    return null;
  }
}

/**
 * Увеличить счетчик попыток синхронизации
 */
export async function incrementSyncAttempts(userId: string): Promise<void> {
  try {
    const queue = await getSyncQueue(userId);
    queue.sync_attempts += 1;
    queue.last_sync_attempt_at = new Date().toISOString();
    queue.updated_at = new Date().toISOString();
    
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error('[SyncStorage] Ошибка увеличения счетчика:', error);
  }
}

/**
 * Сохранить ошибку синхронизации
 */
export async function saveSyncError(userId: string, error: string): Promise<void> {
  try {
    const queue = await getSyncQueue(userId);
    queue.last_error = error;
    queue.updated_at = new Date().toISOString();
    
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error('[SyncStorage] Ошибка сохранения ошибки:', error);
  }
}

/**
 * Получить статистику синхронизации
 */
export async function getSyncStats(userId: string): Promise<{
  total_events: number;
  pending_events: number;
  synced_events: number;
  error_events: number;
  requires_review_events: number;
  last_sync_at: string | null;
  sync_attempts: number;
}> {
  try {
    const queue = await getSyncQueue(userId);
    const lastSync = await getLastSyncTime(userId);

    return {
      total_events: queue.events.length,
      pending_events: queue.events.filter(e => e.sync_status === 'pending_sync').length,
      synced_events: queue.events.filter(e => e.sync_status === 'synced').length,
      error_events: queue.events.filter(e => e.sync_status === 'error').length,
      requires_review_events: queue.events.filter(e => e.sync_status === 'requires_review').length,
      last_sync_at: lastSync,
      sync_attempts: queue.sync_attempts,
    };
  } catch (error) {
    console.error('[SyncStorage] Ошибка получения статистики:', error);
    return {
      total_events: 0,
      pending_events: 0,
      synced_events: 0,
      error_events: 0,
      requires_review_events: 0,
      last_sync_at: null,
      sync_attempts: 0,
    };
  }
}
