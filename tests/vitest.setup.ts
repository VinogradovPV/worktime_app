import { vi } from "vitest";

vi.mock("expo-notifications", () => ({
  AndroidImportance: {
    DEFAULT: "default",
  },
  dismissAllNotificationsAsync: vi.fn(async () => undefined),
  scheduleNotificationAsync: vi.fn(async () => undefined),
  setNotificationChannelAsync: vi.fn(async () => undefined),
  setNotificationHandler: vi.fn(),
}));

vi.mock("react-native", () => ({
  Platform: {
    OS: "web",
    select: (options: Record<string, unknown>) => options.web ?? options.default,
  },
}));
