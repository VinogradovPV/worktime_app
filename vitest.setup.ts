import { beforeAll, afterAll, vi } from 'vitest';

// Define __DEV__ global variable for Expo compatibility in tests
// @ts-ignore
global.__DEV__ = true;

// Mock the entire 'expo' module to prevent it from loading development-specific modules
vi.mock('expo', () => ({
  __esModule: true,
  default: {},
  isRunningInExpoGo: vi.fn(() => false),
  // Mock any specific exports from 'expo' that might be used in tests if needed
}));

// Mock 'expo-notifications' explicitly
vi.mock('expo-notifications', () => ({
  __esModule: true,
  default: {},
  getPermissionsAsync: vi.fn(() => Promise.resolve({ granted: true, canAskAgain: true, expires: 'never', status: 'granted' })),
  requestPermissionsAsync: vi.fn(() => Promise.resolve({ granted: true, canAskAgain: true, expires: 'never', status: 'granted' })),
  scheduleNotificationAsync: vi.fn(() => Promise.resolve('mock-notification-id')),
  cancelScheduledNotificationAsync: vi.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: vi.fn(() => Promise.resolve()),
  getPresentedNotificationsAsync: vi.fn(() => Promise.resolve([])),
  setNotificationHandler: vi.fn(),
  addNotificationReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
  addNotificationResponseReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
  getLastNotificationResponseAsync: vi.fn(() => Promise.resolve(null)),
  // Add any other exports from expo-notifications that are used in the app
  // For isRunningInExpoGo, it seems to be imported directly from 'expo' in some contexts,
  // but also potentially re-exported or used within 'expo-notifications'.
  // By mocking both, we cover more bases.
}));

const mockSyncNotificationsService = {
  initialize: vi.fn(),
  notifySyncError: vi.fn(),
  notifySyncConflict: vi.fn(),
  notifyQueueFull: vi.fn(),
  notifyNetworkRestored: vi.fn(),
  notifyWarning: vi.fn(),
  clearAllNotifications: vi.fn(),
  getNotificationCount: vi.fn(() => 0),
};

vi.mock("@/lib/services/sync-notifications", () => ({
  getSyncNotificationsService: vi.fn(() => mockSyncNotificationsService),
}));

// Mock any modules that cause issues in the test environment
// For example, if a module tries to access native modules not available in JSDOM
// vi.mock("expo-secure-store", () => ({ // Example
//   getItemAsync: vi.fn(() => Promise.resolve(null)),
//   setItemAsync: vi.fn(() => Promise.resolve()),
//   deleteItemAsync: vi.fn(() => Promise.resolve()),
// }));

// Set environment variables for tests
process.env.EXPO_PUBLIC_API_BASE_URL = 'https://3000-i4ivchcw9o7put2qduidu-48e3bc7d.us1.manus.computer';
process.env.EXPO_PUBLIC_API_TOKEN = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
