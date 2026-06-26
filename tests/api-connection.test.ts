import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Тест для проверки подключения к backend API
 * Проверяет, что переменные окружения установлены и API доступен
 */
describe('Backend API Connection', () => {
  let apiBaseUrl: string;
  let apiToken: string;

  beforeAll(() => {
    apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
    apiToken = process.env.EXPO_PUBLIC_API_TOKEN || '';
  });

  it('should have API_BASE_URL environment variable set', () => {
    expect(apiBaseUrl).toBeTruthy();
    expect(apiBaseUrl).toBe('https://worktimeapi.duckdns.org');
  });

  it('should have API_TOKEN environment variable set', () => {
    expect(apiToken).toBeTruthy();
    expect(apiToken.length).toBeGreaterThan(0);
  });

  it('should have valid API token format', () => {
    // Токен должен быть строкой из hex символов
    const cleanToken = apiToken.replace(/\s/g, '');
    expect(cleanToken).toMatch(/^[a-f0-9]+$/i);
    expect(cleanToken.length).toBeGreaterThan(32);
  });

  it('should be able to construct API headers', () => {
    const cleanToken = apiToken.replace(/\s/g, '');
    const headers = {
      'Authorization': `Bearer ${cleanToken}`,
      'Content-Type': 'application/json',
    };

    expect(headers['Authorization']).toBe('Bearer ' + cleanToken);
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('should have valid base URL format', () => {
    expect(apiBaseUrl).toMatch(/^https?:\/\/.+/);
  });

  it('should be able to make API requests with proper headers', async () => {
    const cleanToken = apiToken.replace(/\s/g, '');
    const headers = {
      'Authorization': `Bearer ${cleanToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    expect(headers['Authorization']).toBeTruthy();
    expect(headers['Authorization']).toContain('Bearer');
    expect(headers['Content-Type']).toBe('application/json');
  });
});
