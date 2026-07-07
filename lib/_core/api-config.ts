/**
 * API Configuration
 * 
 * Управление конфигурацией API endpoints.
 * Base URL берется из переменных окружения, а не захардкожен.
 * Токены хранятся в SecureStore, а не в коде.
 */

import Constants from "expo-constants";

/**
 * Получить base URL для API
 * 
 * Приоритет:
 * 1. Переменная окружения EXPO_PUBLIC_API_BASE_URL (для Expo)
 * 2. Переменная окружения REACT_APP_API_BASE_URL (для web)
 * 3. Значение по умолчанию для разработки
 */
export function getApiBaseUrl(): string {
  // Для Expo приложения
  if (Constants.expoConfig?.extra?.apiBaseUrl) {
    return Constants.expoConfig.extra.apiBaseUrl;
  }

  // Для web приложения
  if (typeof process !== "undefined" && process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }

  // Значение по умолчанию для разработки (локальный сервер)
  return "http://localhost:3000";
}

/**
 * Получить base URL для внешнего API (если нужен)
 * 
 * ВАЖНО: Используется только для справочников и публичных данных.
 * Для аутентификации используется локальный сервер.
 */
export function getExternalApiBaseUrl(): string {
  if (Constants.expoConfig?.extra?.externalApiBaseUrl) {
    return Constants.expoConfig.extra.externalApiBaseUrl;
  }

  if (typeof process !== "undefined" && process.env.REACT_APP_EXTERNAL_API_BASE_URL) {
    return process.env.REACT_APP_EXTERNAL_API_BASE_URL;
  }

  // Значение по умолчанию
  return "https://worktimeapi.duckdns.org";
}

/**
 * API версия
 */
export const API_VERSION = "v1";

/**
 * Endpoints
 */
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: `/api/${API_VERSION}/auth/login`,
    REGISTER: `/api/${API_VERSION}/auth/register`,
    LOGOUT: `/api/${API_VERSION}/auth/logout`,
    ME: `/api/${API_VERSION}/auth/me`,
    REFRESH: `/api/${API_VERSION}/auth/refresh`,
    CHANGE_PASSWORD: `/api/${API_VERSION}/auth/change-password`,
  },

  // Admin endpoints
  ADMIN: {
    USERS: `/api/${API_VERSION}/admin/users`,
    USER_APPROVE: (userId: number) => `/api/${API_VERSION}/admin/users/${userId}/approve`,
    USER_REJECT: (userId: number) => `/api/${API_VERSION}/admin/users/${userId}/reject`,
    USER_BLOCK: (userId: number) => `/api/${API_VERSION}/admin/users/${userId}/block`,
    USER_UNBLOCK: (userId: number) => `/api/${API_VERSION}/admin/users/${userId}/unblock`,
    USER_RESET_PASSWORD: (userId: number) => `/api/${API_VERSION}/admin/users/${userId}/reset-password`,
    USER_ASSIGN_ROLE: (userId: number) => `/api/${API_VERSION}/admin/users/${userId}/assign-role`,
    REGISTRATION_REQUESTS: `/api/${API_VERSION}/admin/registration-requests`,
  },

  // Public directories endpoints
  DIRECTORIES: {
    ORG_UNITS: `/api/${API_VERSION}/directories/org-units`,
    POSITIONS: `/api/${API_VERSION}/directories/positions`,
  },

  // Sync endpoints
  SYNC: {
    UPLOAD_WORKDAYS: `/api/${API_VERSION}/sync/upload-workdays`,
    DOWNLOAD_WORKDAYS: `/api/${API_VERSION}/sync/download-workdays`,
    STATUS: `/api/${API_VERSION}/sync/status`,
  },

  // Health check
  HEALTH: `/api/health`,
};

/**
 * Timeout для API запросов (в миллисекундах)
 */
export const API_TIMEOUT = 30000;

/**
 * Максимальное количество повторных попыток при ошибке сети
 */
export const API_MAX_RETRIES = 3;

/**
 * Время ожидания перед повторной попыткой (в миллисекундах)
 */
export const API_RETRY_DELAY = 1000;
