/**
 * Backend API Client
 * Клиент для взаимодействия с backend API сервером
 * 
 * Использует переменные окружения:
 * - EXPO_PUBLIC_API_BASE_URL: базовый URL API
 * - EXPO_PUBLIC_API_TOKEN: токен аутентификации
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  statusCode?: number;
}

class BackendApiClient {
  private axiosInstance: AxiosInstance;
  private baseUrl: string;
  private apiToken: string;

  constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
    this.apiToken = (process.env.EXPO_PUBLIC_API_TOKEN || '').replace(/\s/g, '');

    if (!this.baseUrl) {
      throw new Error('EXPO_PUBLIC_API_BASE_URL is not set');
    }

    if (!this.apiToken) {
      throw new Error('EXPO_PUBLIC_API_TOKEN is not set');
    }

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.apiToken}`,
      },
    });

    // Добавляем интерцептор для логирования ошибок
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('[BackendApiClient] API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * GET запрос
   */
  async get<T = any>(endpoint: string, config?: any): Promise<T> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<T>>(endpoint, config);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.error || 'Unknown error');
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * POST запрос
   */
  async post<T = any>(endpoint: string, data?: any, config?: any): Promise<T> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<T>>(endpoint, data, config);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.error || 'Unknown error');
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * PUT запрос
   */
  async put<T = any>(endpoint: string, data?: any, config?: any): Promise<T> {
    try {
      const response = await this.axiosInstance.put<ApiResponse<T>>(endpoint, data, config);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.error || 'Unknown error');
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * DELETE запрос
   */
  async delete<T = any>(endpoint: string, config?: any): Promise<T> {
    try {
      const response = await this.axiosInstance.delete<ApiResponse<T>>(endpoint, config);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.error || 'Unknown error');
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Обработка ошибок
   */
  private handleError(error: any): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data as ApiErrorResponse | undefined;

      if (status === 401) {
        throw new Error('Unauthorized: Invalid API token');
      }

      if (status === 403) {
        throw new Error('Forbidden: Access denied');
      }

      if (status === 404) {
        throw new Error('Not found: Resource not found');
      }

      if (status === 429) {
        throw new Error('Too many requests: Rate limit exceeded');
      }

      if (status === 500) {
        throw new Error('Server error: Internal server error');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      throw new Error(error.message || 'Network error');
    }

    throw error;
  }

  /**
   * Проверка подключения к API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('[BackendApiClient] Health check failed:', error);
      return false;
    }
  }

  /**
   * Получить информацию о пользователе
   */
  async getUserInfo(userId: string): Promise<any> {
    return this.get(`/users/${userId}`);
  }

  /**
   * Получить рабочий день
   */
  async getWorkDay(userId: string, date: string): Promise<any> {
    return this.get(`/users/${userId}/workdays/${date}`);
  }

  /**
   * Сохранить рабочий день
   */
  async saveWorkDay(userId: string, date: string, workDay: any): Promise<any> {
    return this.post(`/users/${userId}/workdays/${date}`, workDay);
  }

  /**
   * Получить список рабочих дней за период
   */
  async getWorkDays(userId: string, startDate: string, endDate: string): Promise<any[]> {
    return this.get(`/users/${userId}/workdays`, {
      params: { startDate, endDate },
    });
  }

  /**
   * Получить профиль пользователя
   */
  async getUserProfile(userId: string): Promise<any> {
    return this.get(`/users/${userId}/profile`);
  }

  /**
   * Обновить профиль пользователя
   */
  async updateUserProfile(userId: string, profile: any): Promise<any> {
    return this.put(`/users/${userId}/profile`, profile);
  }

  /**
   * Получить отпуска пользователя
   */
  async getVacations(userId: string): Promise<any[]> {
    return this.get(`/users/${userId}/vacations`);
  }

  /**
   * Добавить отпуск
   */
  async addVacation(userId: string, vacation: any): Promise<any> {
    return this.post(`/users/${userId}/vacations`, vacation);
  }

  /**
   * Обновить отпуск
   */
  async updateVacation(userId: string, vacationId: string, vacation: any): Promise<any> {
    return this.put(`/users/${userId}/vacations/${vacationId}`, vacation);
  }

  /**
   * Удалить отпуск
   */
  async deleteVacation(userId: string, vacationId: string): Promise<any> {
    return this.delete(`/users/${userId}/vacations/${vacationId}`);
  }

  /**
   * Получить производственный календарь
   */
  async getProductionCalendar(year?: number): Promise<any> {
    const params = year ? { year } : {};
    return this.get('/calendar/production', { params });
  }

  /**
   * Получить синхронизированные события
   */
  async getSyncEvents(userId: string, since?: string): Promise<any[]> {
    const params = since ? { since } : {};
    return this.get(`/users/${userId}/sync/events`, { params });
  }

  /**
   * Отправить события на синхронизацию
   */
  async syncEvents(userId: string, events: any[]): Promise<any> {
    return this.post(`/users/${userId}/sync/events`, { events });
  }
}

// Создаем и экспортируем синглтон
let apiClientInstance: BackendApiClient | null = null;

export function getBackendApiClient(): BackendApiClient {
  if (!apiClientInstance) {
    apiClientInstance = new BackendApiClient();
  }
  return apiClientInstance;
}

export type { ApiResponse, ApiErrorResponse };
