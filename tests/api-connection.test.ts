import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getApiBaseUrl } from '@/lib/_core/api-config';
import {
  apiCall,
  changePassword,
  getOrgUnits,
  getPositions,
  login,
  register,
} from '@/lib/_core/api';
import * as Auth from '@/lib/_core/auth';

vi.mock('@/lib/_core/auth', () => ({
  getSessionToken: vi.fn(),
  setSessionToken: vi.fn(),
  setRefreshToken: vi.fn(),
}));

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

const jsonResponse = (data: unknown) =>
  ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: {
      get: () => 'application/json',
    },
    json: async () => data,
    text: async () => JSON.stringify(data),
  }) as Response;

describe('API configuration and authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ok: true })));
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  });

  it('uses the configured API base URL', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://example.invalid';

    expect(getApiBaseUrl()).toBe('https://example.invalid');
  });

  it('uses the production fallback when no API base URL is configured', () => {
    expect(getApiBaseUrl()).toBe('https://worktimeapi.duckdns.org');
  });

  it('does not add Authorization for register, login, or public directories', async () => {
    vi.mocked(Auth.getSessionToken).mockResolvedValue('user-session-token');

    await register({
      login: 'new-user',
      password: 'password',
      passwordConfirm: 'password',
      displayName: 'New User',
      orgUnitId: 1,
      positionId: 2,
    });
    await login('new-user', 'password');
    await getOrgUnits();
    await getPositions();

    const fetchMock = vi.mocked(fetch);
    for (const call of fetchMock.mock.calls) {
      const headers = call[1]?.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    }
  });

  it('does not create Authorization when no session token exists', async () => {
    vi.mocked(Auth.getSessionToken).mockResolvedValue(null);

    await apiCall('/api/v1/protected');

    const headers = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('adds Authorization only from the user session token for protected calls', async () => {
    vi.mocked(Auth.getSessionToken).mockResolvedValue('user-session-token');

    await apiCall('/api/v1/protected');

    const headers = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer user-session-token');
  });

  it('does not log the user session token while building protected calls', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(Auth.getSessionToken).mockResolvedValue('sensitive-user-token');

    await apiCall('/api/v1/protected');

    const messages = [...logSpy.mock.calls, ...errorSpy.mock.calls].flat().join(' ');
    expect(messages).not.toContain('sensitive-user-token');

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('sends snake_case payload when changing password', async () => {
    vi.mocked(Auth.getSessionToken).mockResolvedValue('user-session-token');

    await changePassword('old-password', 'new-password');

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body).toEqual({
      current_password: 'old-password',
      new_password: 'new-password',
    });
  });
});
