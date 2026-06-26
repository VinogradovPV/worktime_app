import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import * as Font from "expo-font";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { syncService } from "@/lib/sync/syncService";
import { autoSyncService } from "@/lib/sync/autoSyncService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { initializeAdaptiveSyncManager, shutdownAdaptiveSyncManager } from "@/lib/services/adaptive-sync-manager";
import { getAdaptiveSyncConfig } from "@/lib/_core/sync-config";
import { createBackendSyncIntegration } from "@/lib/services/backend-sync-integration";

const ONBOARDING_KEY = "onboarding_completed";

// Mark work day as modified when it changes
const markWorkDayModified = (date: string) => {
  syncService.markWorkDayModified(date);
};

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Предзагрузка шрифта MaterialIcons — не блокируем рендер (иконки появятся после загрузки)
  Font.useFonts(MaterialIcons.font);

  const router = useRouter();

  // Проверка первого запуска — показываем онбординг если не пройден
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!completed) {
          router.replace("/onboarding");
        }
      } catch (error) {
        console.error("Ошибка при проверке онбординга:", error);
      }
    };
    checkOnboarding();
  }, []);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
  }, []);

  // Initialize sync services
  useEffect(() => {
    const initSync = async () => {
      await syncService.init();
      await autoSyncService.init({
        enableAutoSync: true,
        syncOnWifiOnly: false,
        syncInterval: 5 * 60 * 1000, // 5 minutes
      });

      // Initialize AdaptiveSyncManager for battery optimization
      try {
        const userId = await AsyncStorage.getItem('user_id') || 'default_user';
        const config = getAdaptiveSyncConfig();
        await initializeAdaptiveSyncManager(userId, config);
        console.log('[App] AdaptiveSyncManager initialized');
      } catch (error) {
        console.error('[App] Error initializing AdaptiveSyncManager:', error);
      }

      // Initialize Backend Sync Integration
      try {
        const userId = await AsyncStorage.getItem('user_id') || 'default_user';
        const backendSync = createBackendSyncIntegration({
          userId,
          autoSync: true,
          syncInterval: 10 * 60 * 1000, // 10 minutes
        });
        const initialized = await backendSync.initialize();
        if (initialized) {
          console.log('[App] Backend Sync Integration initialized');
        } else {
          console.warn('[App] Backend Sync Integration initialization failed');
        }
      } catch (error) {
        console.error('[App] Error initializing Backend Sync Integration:', error);
      }
    };

    initSync().catch((error) => {
      console.error("Failed to initialize sync services:", error);
    });

    return () => {
      autoSyncService.stop();
      shutdownAdaptiveSyncManager().catch(console.error);
    };
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for mobile
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());



  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {/* Sync context would go here if needed */}
          {/* Default to hiding native headers so raw route segments don't appear (e.g. "(tabs)", "products/[id]"). */}
          {/* Sync services initialized above */}
          {/* If a screen needs the native header, explicitly enable it and set a human title via Stack.Screen options. */}
          {/* in order for ios apps tab switching to work properly, use presentation: "fullScreenModal" for login page, whenever you decide to use presentation: "modal*/}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="oauth/callback" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="geofence-settings" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <I18nProvider>
        <ThemeProvider>
          <SafeAreaProvider initialMetrics={providerInitialMetrics}>
            <SafeAreaFrameContext.Provider value={frame}>
              <SafeAreaInsetsContext.Provider value={insets}>
                {content}
              </SafeAreaInsetsContext.Provider>
            </SafeAreaFrameContext.Provider>
          </SafeAreaProvider>
        </ThemeProvider>
      </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
