/**
 * Типы данных для синхронизации с API
 * Определяют структуру событий, статусы и контракты с сервером
 */

/**
 * Статус синхронизации события
 */
export type SyncStatus = 'pending_sync' | 'synced' | 'error' | 'requires_review' | 'conflict';

/**
 * Тип события рабочего времени
 */
export type WorkEventType = 'start' | 'break_start' | 'break_end' | 'temporary_exit_start' | 'temporary_exit_end' | 'end' | 'return';

/**
 * Статус рабочего дня
 */
export type WorkDayStatus = 'not_started' | 'working' | 'on_break' | 'on_temporary_exit' | 'completed';

/**
 * Временной интервал
 */
export interface TimeInterval {
  start: string; // ISO 8601
  end: string | null; // ISO 8601 или null если интервал открыт
  duration_seconds: number; // Продолжительность в секундах
}

/**
 * Событие рабочего времени (локальное)
 */
export interface WorkEvent {
  id: string; // Уникальный ID события (UUID)
  client_event_id: string; // ID для идемпотентности (генерируется на клиенте)
  type: WorkEventType;
  timestamp: string; // ISO 8601
  duration_seconds?: number; // Для перерывов и выходов
  notes?: string;
  sync_status: SyncStatus;
  sync_error?: string; // Текст ошибки если sync_status === 'error'
  server_event_id?: string; // ID события на сервере после синхронизации
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * Рабочий день (локальное представление)
 */
export interface WorkDay {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  status: WorkDayStatus;
  events: WorkEvent[];
  work_intervals: TimeInterval[]; // Интервалы работы
  break_intervals: TimeInterval[]; // Интервалы перерывов
  temporary_exit_intervals: TimeInterval[]; // Интервалы временных выходов
  total_work_seconds: number; // Общее время работы
  total_break_seconds: number; // Общее время перерывов
  total_temporary_exit_seconds: number; // Общее время временных выходов
  sync_status: SyncStatus; // Статус синхронизации дня
  last_sync_at?: string; // ISO 8601
  server_sync_id?: string; // ID синхронизации на сервере
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * Событие для отправки на сервер
 */
export interface SyncEventPayload {
  client_event_id: string; // Для идемпотентности
  user_id: string;
  date: string; // YYYY-MM-DD
  type: WorkEventType;
  timestamp: string; // ISO 8601
  duration_seconds?: number;
  notes?: string;
  device_id?: string; // ID устройства
  app_version?: string;
}

/**
 * Ответ сервера для события
 */
export interface SyncEventResponse {
  server_event_id: string;
  client_event_id: string;
  status: 'accepted' | 'conflict' | 'rejected';
  error?: string;
  conflict_details?: {
    reason: string;
    expected_status: WorkDayStatus;
    actual_status: WorkDayStatus;
  };
}

/**
 * Сводка рабочего дня (ответ сервера)
 */
export interface WorkDaySummary {
  date: string; // YYYY-MM-DD
  status: WorkDayStatus;
  total_work_seconds: number;
  total_break_seconds: number;
  total_temporary_exit_seconds: number;
  work_intervals: TimeInterval[];
  break_intervals: TimeInterval[];
  temporary_exit_intervals: TimeInterval[];
  events: Array<{
    server_event_id: string;
    type: WorkEventType;
    timestamp: string;
    duration_seconds?: number;
  }>;
  last_sync_at: string; // ISO 8601
  requires_review: boolean; // Требуется проверка конфликтов
  conflicts?: Array<{
    event_id: string;
    reason: string;
  }>;
}

/**
 * Запрос синхронизации событий
 */
export interface SyncRequest {
  user_id: string;
  device_id: string;
  events: SyncEventPayload[];
  app_version: string;
  timestamp: string; // ISO 8601
}

/**
 * Ответ синхронизации
 */
export interface SyncResponse {
  success: boolean;
  events: SyncEventResponse[];
  workday_summary?: WorkDaySummary;
  server_timestamp: string; // ISO 8601
  next_sync_in_seconds?: number; // Рекомендуемое время следующей синхронизации
  errors?: Array<{
    code: string;
    message: string;
  }>;
}

/**
 * Очередь синхронизации
 */
export interface SyncQueue {
  id: string;
  user_id: string;
  events: WorkEvent[]; // События, ожидающие синхронизации
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  last_sync_attempt_at?: string; // ISO 8601
  sync_attempts: number; // Количество попыток синхронизации
  last_error?: string; // Последняя ошибка
}

/**
 * Статус синхронизации (для UI)
 */
export interface SyncStatusInfo {
  status: SyncStatus;
  message: string;
  icon: 'check' | 'clock' | 'error' | 'alert' | 'sync';
  color: string; // Цвет для UI
  is_syncing: boolean;
  last_sync_at?: string; // ISO 8601
  pending_count: number; // Количество ожидающих событий
  error_count: number; // Количество событий с ошибками
}

/**
 * Конфигурация синхронизации
 */
export interface SyncConfig {
  api_base_url: string;
  api_timeout_ms: number;
  max_retry_attempts: number;
  retry_delay_ms: number;
  retry_backoff_multiplier: number;
  batch_size: number; // Максимальное количество событий в одном запросе
  auto_sync_enabled: boolean;
  auto_sync_interval_ms: number;
  sync_on_network_change: boolean;
}

/**
 * Результат синхронизации
 */
export interface SyncResult {
  success: boolean;
  synced_count: number;
  failed_count: number;
  conflict_count: number;
  errors: Array<{
    event_id: string;
    error: string;
  }>;
  workday_summary?: WorkDaySummary;
  timestamp: string; // ISO 8601
}
