/**
 * API Configuration
 * 
 * Управление конфигурацией API endpoints.
 * Base URL берется из переменных окружения, а не захардкожен.
 * Токены хранятся в SecureStore, а не в коде.
 */

import Constants from "expo-constants";

/**
 * Production FastAPI backend URL
 */
const DEFAULT_API_BASE_URL = "https://worktimeapi.duckdns.org";

/**
 * Получить base URL для API
 * 
 * Приоритет:
 * 1. Constants.expoConfig?.extra?.apiBaseUrl (из app.config.ts extra)
 * 2. process.env.EXPO_PUBLIC_API_BASE_URL (из .env)
 * 3. DEFAULT_API_BASE_URL (production FastAPI backend)
 * 
 * ВАЖНО: Все API endpoints (auth, admin, directories, sync) идут на FastAPI backend.
 */
export function getApiBaseUrl(): string {
  // Для Expo приложения (из app.config.ts extra)
  if (Constants.expoConfig?.extra?.apiBaseUrl) {
    return Constants.expoConfig.extra.apiBaseUrl;
  }

  // Для web приложения (из .env)
  if (typeof process !== "undefined" && process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  // Production: FastAPI backend на Яндекс-сервере
  return DEFAULT_API_BASE_URL;
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
