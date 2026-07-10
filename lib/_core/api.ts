import { Platform } from "react-native";
import * as Auth from "./auth";
import { getApiBaseUrl, API_ENDPOINTS } from "./api-config";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

type ApiCallOptions = RequestInit & {
  auth?: boolean;
};

/**
 * Основной метод для API запросов
 * 
 * ВАЖНО: Не использует hardcoded токены.
 * Токен берется из Auth.getSessionToken() после login.
 */
export async function apiCall<T>(endpoint: string, options: ApiCallOptions = {}): Promise<T> {
  const { auth = true, ...requestOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((requestOptions.headers as Record<string, string>) || {}),
  };

  // Добавить Authorization заголовок, если есть сохраненный токен
  if (auth) {
    const sessionToken = await Auth.getSessionToken();
    if (sessionToken) {
      headers["Authorization"] = `Bearer ${sessionToken}`;
    }
  }

  const baseUrl = getApiBaseUrl();
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${cleanBaseUrl}${cleanEndpoint}`;
  
  console.log("[API] Запрос к:", url);

  try {
    const response = await fetch(url, {
      ...requestOptions,
      headers,
      credentials: "include",
    });

    console.log("[API] Статус ответа:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[API] Ошибка ответа:", errorText);
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        // Не JSON, используем текст как есть
      }
      throw new Error(errorMessage || `API запрос не удался: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      console.log("[API] JSON ответ получен");
      return data as T;
    }

    const text = await response.text();
    console.log("[API] Текстовый ответ получен");
    return (text ? JSON.parse(text) : {}) as T;
  } catch (error) {
    console.error("[API] Запрос не удался:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Неизвестная ошибка");
  }
}

/**
 * API вызовы для аутентификации
 */

/**
 * Регистрация нового пользователя
 * 
 * Возвращает статус pending, не токен.
 * Пользователь получит доступ только после подтверждения администратором.
 */
export async function register(data: {
  login: string;
  password: string;
  passwordConfirm: string;
  displayName: string;
  orgUnitId: number;
  positionId: number;
  comment?: string;
}): Promise<{ ok: boolean; status: string; message: string }> {
  return apiCall(API_ENDPOINTS.AUTH.REGISTER, {
    auth: false,
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Вход пользователя
 * 
 * Возвращает access_token и refresh_token.
 * Токены сохраняются в SecureStore.
 */
export async function login(
  login: string,
  password: string,
): Promise<{
  ok: boolean;
  access_token: string;
  refresh_token?: string;
  requiresPasswordChange?: boolean;
  user: any;
}> {
  const result = await apiCall<{
    ok: boolean;
    access_token: string;
    refresh_token?: string;
    requiresPasswordChange?: boolean;
    user: any;
  }>(API_ENDPOINTS.AUTH.LOGIN, {
    auth: false,
    method: "POST",
    body: JSON.stringify({ login, password }),
  });

  // Сохранить токены (если требуется смена пароля, refresh_token может быть undefined)
  if (result.access_token) {
    await Auth.setSessionToken(result.access_token);
  }
  if (result.refresh_token) {
    await Auth.setRefreshToken(result.refresh_token);
  }

  return result;
}

/**
 * Обновление access token
 * 
 * Использует refresh_token для получения нового access_token.
 */
export async function refresh(refreshToken: string): Promise<{
  ok: boolean;
  access_token: string;
  refresh_token: string;
}> {
  const result = await apiCall<{
    ok: boolean;
    access_token: string;
    refresh_token: string;
  }>(API_ENDPOINTS.AUTH.REFRESH, {
    auth: false,
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  // Сохранить новые токены
  if (result.access_token) {
    await Auth.setSessionToken(result.access_token);
  }
  if (result.refresh_token) {
    await Auth.setRefreshToken(result.refresh_token);
  }

  return result;
}

/**
 * Выход пользователя
 */
export async function logout(): Promise<void> {
  try {
    await apiCall<void>(API_ENDPOINTS.AUTH.LOGOUT, {
      method: "POST",
    });
  } finally {
    await Auth.removeSessionToken();
    await Auth.removeRefreshToken();
  }
}

/**
 * Получить информацию о текущем пользователе
 */
export async function getMe(): Promise<{
  ok: boolean;
  user: {
    id: number;
    login: string;
    displayName: string | null;
    role: string;
    status: string;
    orgUnitId: number;
    positionId: number;
    managedOrgUnitId: number | null;
  };
} | null> {
  try {
    const result = await apiCall<{
      ok: boolean;
      user: any;
    }>(API_ENDPOINTS.AUTH.ME);
    return result;
  } catch (error) {
    console.error("[API] getMe не удался:", error);
    return null;
  }
}

/**
 * Смена пароля
 * 
 * Отправляет snake_case payload: { current_password, new_password }
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean }> {
  return apiCall(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

/**
 * API вызовы для администратора
 */

/**
 * Получить список заявок на регистрацию
 */
export async function getRegistrationRequests(): Promise<{
  ok: boolean;
  requests: any[];
  total: number;
}> {
  return apiCall(API_ENDPOINTS.ADMIN.REGISTRATION_REQUESTS);
}

/**
 * Получить всех пользователей
 */
export async function getUsers(filters?: {
  role?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ ok: boolean; users: any[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.role) params.append("role", filters.role);
  if (filters?.status) params.append("status", filters.status);
  if (filters?.limit) params.append("limit", String(filters.limit));
  if (filters?.offset) params.append("offset", String(filters.offset));

  const endpoint = params.toString()
    ? `${API_ENDPOINTS.ADMIN.USERS}?${params.toString()}`
    : API_ENDPOINTS.ADMIN.USERS;

  return apiCall(endpoint);
}

/**
 * Подтвердить регистрацию пользователя и назначить роль
 */
export async function approveUser(userId: number, role: string): Promise<{
  ok: boolean;
  user: any;
}> {
  return apiCall(API_ENDPOINTS.ADMIN.USER_APPROVE(userId), {
    method: "POST",
    body: JSON.stringify({ role }),
  });
}

/**
 * Отклонить регистрацию пользователя
 */
export async function rejectUser(userId: number, reason?: string): Promise<{
  ok: boolean;
}> {
  return apiCall(API_ENDPOINTS.ADMIN.USER_REJECT(userId), {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

/**
 * Заблокировать пользователя
 */
export async function blockUser(userId: number): Promise<{ ok: boolean }> {
  return apiCall(API_ENDPOINTS.ADMIN.USER_BLOCK(userId), {
    method: "POST",
  });
}

/**
 * Разблокировать пользователя
 */
export async function unblockUser(userId: number): Promise<{ ok: boolean }> {
  return apiCall(API_ENDPOINTS.ADMIN.USER_UNBLOCK(userId), {
    method: "POST",
  });
}

/**
 * Сбросить пароль пользователя
 * 
 * ИСПРАВЛЕНО: Правильный URL с подстановкой userId
 */
export async function resetPassword(userId: number): Promise<{
  ok: boolean;
  tempPassword: string;
}> {
  return apiCall(API_ENDPOINTS.ADMIN.USER_RESET_PASSWORD(userId), {
    method: "POST",
  });
}

/**
 * Назначить роль пользователю
 */
export async function assignRole(userId: number, role: string): Promise<{
  ok: boolean;
}> {
  return apiCall(API_ENDPOINTS.ADMIN.USER_ASSIGN_ROLE(userId), {
    method: "POST",
    body: JSON.stringify({ role }),
  });
}

/**
 * API вызовы для справочников (публичные)
 */

/**
 * Получить структурные подразделения
 */
export async function getOrgUnits(): Promise<{
  ok: boolean;
  orgUnits: any[];
  total: number;
}> {
  return apiCall(API_ENDPOINTS.DIRECTORIES.ORG_UNITS, { auth: false });
}

/**
 * Создать структурное подразделение (только для администратора)
 */
export async function createOrgUnit(data: {
  name: string;
  shortName: string;
  type: string;
  parentId?: number;
}): Promise<{ ok: boolean; orgUnit: any }> {
  return apiCall(API_ENDPOINTS.DIRECTORIES.ORG_UNITS, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Получить должности
 */
export async function getPositions(): Promise<{
  ok: boolean;
  positions: any[];
  total: number;
}> {
  return apiCall(API_ENDPOINTS.DIRECTORIES.POSITIONS, { auth: false });
}

/**
 * Создать должность (только для администратора)
 */
export async function createPosition(data: {
  name: string;
  shortName: string;
}): Promise<{ ok: boolean; position: any }> {
  return apiCall(API_ENDPOINTS.DIRECTORIES.POSITIONS, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * API вызовы для синхронизации
 */

/**
 * Загрузить рабочие дни
 */
export async function uploadWorkDays(data: { workdays: any[] }): Promise<{
  ok: boolean;
  synced_count: number;
}> {
  return apiCall(API_ENDPOINTS.SYNC.UPLOAD_WORKDAYS, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Загрузить рабочие дни за период
 */
export async function downloadWorkDays(data: { from_date: string; to_date: string }): Promise<{
  ok: boolean;
  workdays: any[];
}> {
  const params = new URLSearchParams({
    from_date: data.from_date,
    to_date: data.to_date,
  });

  return apiCall(`${API_ENDPOINTS.SYNC.DOWNLOAD_WORKDAYS}?${params.toString()}`);
}

/**
 * Получить статус синхронизации
 */
export async function getSyncStatus(): Promise<{
  ok: boolean;
  lastSyncAt: string;
  pendingCount: number;
}> {
  return apiCall(API_ENDPOINTS.SYNC.STATUS);
}

/**
 * OAuth callback handler - exchange code for session token
 */
export async function exchangeOAuthCode(
  code: string,
  state: string,
): Promise<{ sessionToken: string; user: any }> {
  console.log("[API] exchangeOAuthCode called");
  const params = new URLSearchParams({ code, state });
  const endpoint = `/api/oauth/mobile?${params.toString()}`;
  console.log("[API] Calling OAuth mobile endpoint:", endpoint);
  
  try {
    const result = await apiCall<{ app_session_id: string; user: any }>(endpoint);
    const sessionToken = result.app_session_id;
    console.log("[API] OAuth exchange result:", {
      hasSessionToken: !!sessionToken,
      hasUser: !!result.user,
    });
    return {
      sessionToken,
      user: result.user,
    };
  } catch (error) {
    console.error("[API] OAuth exchange failed:", error);
    throw error;
  }
}

/**
 * Проверить соединение с API
 */
export async function testConnection(): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}${API_ENDPOINTS.HEALTH}`);
    return response.ok;
  } catch {
    return false;
  }
}
