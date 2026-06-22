import { useState, useEffect, useCallback, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { WorkDayStatus } from "@/shared/types/workday";
import {
  GeolocationSettings,
  GeofenceZone,
  getGeolocationSettings,
  saveGeolocationSettings,
  getActiveZone,
} from "@/lib/storage/geofenceStorage";
import {
  GeofencePrompt,
  checkGeofenceStatus,
} from "@/lib/services/geofenceService";
import {
  requestLocationPermission,
  getCurrentLocation,
  isInsideGeofence,
} from "@/lib/services/geolocationService";

export interface UseGeofenceReturn {
  settings: GeolocationSettings | null;
  activeZone: GeofenceZone | null;
  isInsideZone: boolean | null;
  pendingPrompt: GeofencePrompt | null;
  loading: boolean;
  requestPermission: () => Promise<void>;
  checkLocation: (workDayStatus: WorkDayStatus) => Promise<void>;
  dismissPrompt: () => void;
  updateSettings: (partial: Partial<GeolocationSettings>) => Promise<void>;
  reload: () => Promise<void>;
}

export function useGeofence(workDayStatus: WorkDayStatus): UseGeofenceReturn {
  const [settings, setSettings] = useState<GeolocationSettings | null>(null);
  const [activeZone, setActiveZone] = useState<GeofenceZone | null>(null);
  const [isInsideZone, setIsInsideZone] = useState<boolean | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<GeofencePrompt | null>(null);
  const [loading, setLoading] = useState(true);

  const previouslyInsideRef = useRef<boolean | null>(null);
  const checkingRef = useRef(false);

  const reload = useCallback(async () => {
    try {
      const [s, z] = await Promise.all([
        getGeolocationSettings(),
        getActiveZone(),
      ]);
      setSettings(s);
      setActiveZone(z);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const checkLocation = useCallback(
    async (status: WorkDayStatus) => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        const prompt = await checkGeofenceStatus(status, previouslyInsideRef.current);

        const zone = await getActiveZone();
        if (zone) {
          const loc = await getCurrentLocation();
          if (loc) {
            const inside = isInsideGeofence(loc, zone);
            previouslyInsideRef.current = inside;
            setIsInsideZone(inside);
          }
        }

        if (prompt) {
          setPendingPrompt(prompt);
        }
      } finally {
        checkingRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active" && settings?.enabled) {
        checkLocation(workDayStatus);
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [settings?.enabled, workDayStatus, checkLocation]);

  const requestPermission = useCallback(async () => {
    const status = await requestLocationPermission();
    await updateSettings({ permissionStatus: status });
  }, []);

  const updateSettings = useCallback(
    async (partial: Partial<GeolocationSettings>) => {
      const updated = await saveGeolocationSettings(partial);
      setSettings(updated);
    },
    []
  );

  const dismissPrompt = useCallback(() => {
    setPendingPrompt(null);
  }, []);

  return {
    settings,
    activeZone,
    isInsideZone,
    pendingPrompt,
    loading,
    requestPermission,
    checkLocation,
    dismissPrompt,
    updateSettings,
    reload,
  };
}
