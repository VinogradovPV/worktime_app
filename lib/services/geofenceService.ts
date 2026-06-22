import {
  GeofenceZone,
  GeofenceEvent,
  GeofenceMode,
  getZones,
  saveZone,
  getActiveZone,
  saveGeofenceEvent,
  getGeolocationSettings,
} from "@/lib/storage/geofenceStorage";
import {
  getCurrentLocation,
  isInsideGeofence,
  isAccuracyAcceptable,
  GeoPosition,
} from "@/lib/services/geolocationService";
import { WorkDayStatus } from "@/shared/types/workday";

// ─── Генерация ID ─────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Типы промптов ────────────────────────────────────────────────────────────

export type GeofencePromptType =
  | "enter_not_started"
  | "enter_on_exit"
  | "exit_working"
  | "exit_on_break"
  | "low_accuracy";

export interface GeofencePrompt {
  type: GeofencePromptType;
  zone: GeofenceZone;
  event: GeofenceEvent;
}

// ─── Создание зон ─────────────────────────────────────────────────────────────

export async function createZoneFromCurrentLocation(
  name: string,
  radiusMeters: number = 150,
  mode: GeofenceMode = "combined"
): Promise<GeofenceZone | null> {
  const location = await getCurrentLocation();
  if (!location) return null;

  return createZoneManually({
    name,
    latitude: location.latitude,
    longitude: location.longitude,
    radiusMeters,
    mode,
  });
}

export async function createZoneManually(params: {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  mode?: GeofenceMode;
}): Promise<GeofenceZone> {
  const zones = await getZones();
  for (const z of zones) {
    if (z.isActive) {
      await saveZone({ ...z, isActive: false, updatedAt: new Date().toISOString() });
    }
  }

  const now = new Date().toISOString();
  const zone: GeofenceZone = {
    id: generateId(),
    name: params.name,
    latitude: params.latitude,
    longitude: params.longitude,
    radiusMeters: params.radiusMeters,
    isActive: true,
    mode: params.mode ?? "combined",
    createdAt: now,
    updatedAt: now,
  };

  await saveZone(zone);
  return zone;
}

// ─── Проверка геозоны ─────────────────────────────────────────────────────────

export async function checkGeofenceStatus(
  workDayStatus: WorkDayStatus,
  previouslyInside: boolean | null
): Promise<GeofencePrompt | null> {
  const settings = await getGeolocationSettings();
  if (!settings.enabled) return null;

  const zone = await getActiveZone();
  if (!zone) return null;

  const location = await getCurrentLocation();
  if (!location) return null;

  const accuracyOk = await isAccuracyAcceptable(
    location.accuracyMeters,
    settings.accuracyThresholdMeters
  );
  if (!accuracyOk) {
    const event = buildGeofenceEvent(zone, location, "geofence_enter");
    return { type: "low_accuracy", zone, event };
  }

  const currentlyInside = isInsideGeofence(location, zone);

  if (previouslyInside !== null && previouslyInside === currentlyInside) {
    return null;
  }

  const event = buildGeofenceEvent(
    zone,
    location,
    currentlyInside ? "geofence_enter" : "geofence_exit"
  );

  await saveGeofenceEvent(event);

  if (currentlyInside) {
    if (workDayStatus === "not_started") {
      return { type: "enter_not_started", zone, event };
    }
    if (workDayStatus === "on_temporary_exit") {
      return { type: "enter_on_exit", zone, event };
    }
    return null;
  } else {
    if (workDayStatus === "working") {
      return { type: "exit_working", zone, event };
    }
    if (workDayStatus === "on_break") {
      return { type: "exit_on_break", zone, event };
    }
    return null;
  }
}

function buildGeofenceEvent(
  zone: GeofenceZone,
  location: GeoPosition,
  type: GeofenceEvent["type"]
): GeofenceEvent {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    zoneId: zone.id,
    type,
    timestamp: now,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracyMeters: location.accuracyMeters,
    processed: false,
    createdAt: now,
  };
}
