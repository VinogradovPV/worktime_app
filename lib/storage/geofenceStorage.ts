import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Типы ─────────────────────────────────────────────────────────────────────

export type GeofenceMode = "combined" | "manual";

export type LocationPermissionStatus =
  | "unknown"
  | "granted_foreground"
  | "granted_background"
  | "denied"
  | "restricted";

export interface GeofenceZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  mode: GeofenceMode;
  createdAt: string;
  updatedAt: string;
}

export interface GeofenceEvent {
  id: string;
  zoneId: string;
  type: "geofence_enter" | "geofence_exit";
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  processed: boolean;
  createdAt: string;
}

export interface GeolocationSettings {
  enabled: boolean;
  permissionStatus: LocationPermissionStatus;
  accuracyThresholdMeters: number;
  promptOnEnter: boolean;
  promptOnExit: boolean;
  updatedAt: string;
}

// ─── Ключи хранилища ──────────────────────────────────────────────────────────

const KEYS = {
  ZONES: "geofence_zones",
  EVENTS: "geofence_events",
  SETTINGS: "geolocation_settings",
} as const;

// ─── Настройки по умолчанию ───────────────────────────────────────────────────

const DEFAULT_SETTINGS: GeolocationSettings = {
  enabled: false,
  permissionStatus: "unknown",
  accuracyThresholdMeters: 100,
  promptOnEnter: true,
  promptOnExit: true,
  updatedAt: new Date().toISOString(),
};

// ─── Зоны ─────────────────────────────────────────────────────────────────────

export async function getZones(): Promise<GeofenceZone[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ZONES);
    return raw ? (JSON.parse(raw) as GeofenceZone[]) : [];
  } catch {
    return [];
  }
}

export async function saveZone(zone: GeofenceZone): Promise<void> {
  const zones = await getZones();
  const idx = zones.findIndex((z) => z.id === zone.id);
  if (idx >= 0) {
    zones[idx] = zone;
  } else {
    zones.push(zone);
  }
  await AsyncStorage.setItem(KEYS.ZONES, JSON.stringify(zones));
}

export async function deleteZone(zoneId: string): Promise<void> {
  const zones = await getZones();
  const filtered = zones.filter((z) => z.id !== zoneId);
  await AsyncStorage.setItem(KEYS.ZONES, JSON.stringify(filtered));
}

export async function getActiveZone(): Promise<GeofenceZone | null> {
  const zones = await getZones();
  return zones.find((z) => z.isActive) ?? null;
}

// ─── События ──────────────────────────────────────────────────────────────────

export async function getGeofenceEvents(limit = 50): Promise<GeofenceEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.EVENTS);
    const events: GeofenceEvent[] = raw ? JSON.parse(raw) : [];
    return events.slice(-limit);
  } catch {
    return [];
  }
}

export async function saveGeofenceEvent(event: GeofenceEvent): Promise<void> {
  const events = await getGeofenceEvents(200);
  events.push(event);
  const trimmed = events.slice(-200);
  await AsyncStorage.setItem(KEYS.EVENTS, JSON.stringify(trimmed));
}

// ─── Настройки ────────────────────────────────────────────────────────────────

export async function getGeolocationSettings(): Promise<GeolocationSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveGeolocationSettings(
  partial: Partial<GeolocationSettings>
): Promise<GeolocationSettings> {
  const current = await getGeolocationSettings();
  const updated: GeolocationSettings = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
  return updated;
}
