/**
 * Конфигурация синхронизации API
 */

import { SyncConfig } from '@/shared/types/sync';

/**
 * Получить базовый URL API
 * Используется из переменных окружения или конфига
 */
export function getApiBaseUrl(): string {
  // В production это должно быть из .env
  // Для разработки используем localhost
  if (process.env.NODE_ENV === 'development') {
    return process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  }

  return process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.example.com';
}

/**
 * Получить токен авторизации
 */
export function getAuthToken(): string {
  // TODO: Получить из SecureStore после реализации авторизации
  return process.env.EXPO_PUBLIC_API_TOKEN || '';
}

/**
 * Конфигурация синхронизации по умолчанию
 */
export const defaultSyncConfig: SyncConfig = {
  api_base_url: getApiBaseUrl(),
  api_timeout_ms: 30000, // 30 секунд
  max_retry_attempts: 3,
  retry_delay_ms: 1000, // 1 секунда
  retry_backoff_multiplier: 2, // Экспоненциальная задержка: 1s, 2s, 4s
  batch_size: 50, // Максимум 50 событий в одном запросе
  auto_sync_enabled: true,
  auto_sync_interval_ms: 30000, // 30 секунд
  sync_on_network_change: true,
};

/**
 * API endpoints
 */
export const apiEndpoints = {
  // Health check
  health: '/health',
  
  // Синхронизация
  syncEvents: '/api/v1/sync/events',
  syncStatus: '/api/v1/sync/status',
  
  // Рабочие дни
  workday: (date: string) => `/api/v1/workdays/${date}`,
  workdayRange: (startDate: string, endDate: string) => 
    `/api/v1/workdays?start_date=${startDate}&end_date=${endDate}`,
  
  // Пользователь
  userProfile: '/api/v1/user/profile',
  userSettings: '/api/v1/user/settings',
  
  // Устройство
  deviceRegister: '/api/v1/device/register',
  deviceSync: '/api/v1/device/sync',
} as const;

/**
 * HTTP headers для API запросов
 */
export function getApiHeaders(includeAuth: boolean = true): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Worktime-Mobile/1.0.0',
  };

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

/**
 * Построить полный URL для API запроса
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${endpoint}`;
}

/**
 * Получить конфигурацию синхронизации
 */
export function getSyncConfig(): SyncConfig {
  return {
    ...defaultSyncConfig,
    api_base_url: getApiBaseUrl(),
  };
}

/**
 * Валидировать конфигурацию
 */
export function validateSyncConfig(config: SyncConfig): boolean {
  if (!config.api_base_url) {
    console.error('[SyncConfig] API base URL не установлен');
    return false;
  }

  if (config.api_timeout_ms < 5000) {
    console.warn('[SyncConfig] API timeout слишком мал (< 5s)');
  }

  if (config.batch_size < 1 || config.batch_size > 100) {
    console.warn('[SyncConfig] Batch size должен быть между 1 и 100');
  }

  return true;
}
