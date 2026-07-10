import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getApiHeaders, getSyncConfig } from '@/lib/_core/sync-config';
import { getBackendApiClient } from '@/lib/services/backend-api-client';
import { createBackendSyncIntegration } from '@/lib/services/backend-sync-integration';
import * as Auth from '@/lib/_core/auth';
import axios from 'axios';

const integrationMocks = vi.hoisted(() => ({
  workDaySync: {
    setUserId: vi.fn(),
    syncWorkDay: vi.fn(),
    fetchWorkDay: vi.fn(),
  },
  profileSync: {
    setUserId: vi.fn(),
    syncUserProfile: vi.fn(),
    fetchUserProfile: vi.fn(),
  },
  notifications: {
    notifySyncError: vi.fn(),
  },
}));

vi.mock('@/lib/_core/auth', () => ({
  getSessionToken: vi.fn(),
}));

vi.mock('@/lib/services/workday-sync-service', () => ({
  getWorkDaySyncService: vi.fn(() => integrationMocks.workDaySync),
}));

vi.mock('@/lib/services/user-profile-sync-service', () => ({
  getUserProfileSyncService: vi.fn(() => integrationMocks.profileSync),
}));

vi.mock('@/lib/services/sync-notifications', () => ({
  getSyncNotificationsService: vi.fn(() => integrationMocks.notifications),
}));

vi.mock('@/lib/storage/workdayService', () => ({
  getTodayWorkDay: vi.fn(),
}));

vi.mock('@/lib/utils/dateUtils', () => ({
  formatDate: vi.fn(() => '2026-01-01'),
}));

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

vi.mock('axios', () => {
  const interceptors = {
    request: {
      use: vi.fn(),
    },
    response: {
      use: vi.fn(),
    },
  };

  return {
    default: {
      create: vi.fn(() => ({
        defaults: {},
        interceptors,
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      })),
      isAxiosError: vi.fn(),
    },
  };
});

describe('Backend sync API configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  });

  it('builds sync config from the shared API base URL fallback', () => {
    const config = getSyncConfig();

    expect(config.api_base_url).toBe('https://worktimeapi.duckdns.org');
    expect(config.auto_sync_enabled).toBe(true);
    expect(config.batch_size).toBeGreaterThan(0);
  });

  it('builds sync config from a configured mock API URL', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://example.invalid';

    expect(getSyncConfig().api_base_url).toBe('https://example.invalid');
  });

  it('does not add Authorization when no user session token exists', async () => {
    vi.mocked(Auth.getSessionToken).mockResolvedValue(null);

    const headers = await getApiHeaders(true);

    expect(headers.Authorization).toBeUndefined();
  });

  it('adds Authorization from the user session token for sync headers', async () => {
    vi.mocked(Auth.getSessionToken).mockResolvedValue('sync-user-token');

    const headers = await getApiHeaders(true);

    expect(headers.Authorization).toBe('Bearer sync-user-token');
  });

  it('creates backend API client without a public API token and uses the session interceptor', async () => {
    getBackendApiClient();

    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://worktimeapi.duckdns.org',
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      }),
    );
    vi.mocked(Auth.getSessionToken).mockResolvedValue('backend-session-token');

    const createdClient = vi.mocked(axios.create).mock.results[0].value;
    const interceptor = createdClient.interceptors.request.use.mock.calls[0][0];
    const config = await interceptor({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer backend-session-token');
  });

  it('creates backend sync integration with meaningful service methods', () => {
    const integration = createBackendSyncIntegration({
      userId: 'test-user',
      autoSync: false,
      syncInterval: 60000,
    });

    expect(typeof integration.initialize).toBe('function');
    expect(typeof integration.syncTodayWorkDay).toBe('function');
    expect(typeof integration.syncUserProfile).toBe('function');
    expect(typeof integration.fullSync).toBe('function');
  });
});
