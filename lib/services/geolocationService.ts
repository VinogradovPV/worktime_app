import * as Location from "expo-location";
import { LocationPermissionStatus } from "@/lib/storage/geofenceStorage";

// ─── Типы ─────────────────────────────────────────────────────────────────────

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  timestamp: number;
}

// ─── Разрешения ───────────────────────────────────────────────────────────────

export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      return "granted_foreground";
    }
    if (status === "denied") {
      return "denied";
    }
    return "restricted";
  } catch {
    return "denied";
  }
}

export async function getLocationPermissionStatus(): Promise<LocationPermissionStatus> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === "granted") return "granted_foreground";
    if (status === "denied") return "denied";
    return "unknown";
  } catch {
    return "unknown";
  }
}

// ─── Получение позиции ────────────────────────────────────────────────────────

export async function getCurrentLocation(): Promise<GeoPosition | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracyMeters: location.coords.accuracy ?? undefined,
      timestamp: location.timestamp,
    };
  } catch {
    return null;
  }
}

// ─── Расчёт расстояния (Haversine) ────────────────────────────────────────────

export function calculateDistanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  const R = 6371000; // радиус Земли в метрах
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── Проверка нахождения в геозоне ───────────────────────────────────────────

export function isInsideGeofence(
  position: { latitude: number; longitude: number },
  zone: { latitude: number; longitude: number; radiusMeters: number }
): boolean {
  const distance = calculateDistanceMeters(position, zone);
  return distance <= zone.radiusMeters;
}

// ─── Проверка точности GPS ────────────────────────────────────────────────────

export async function isAccuracyAcceptable(
  accuracyMeters: number | undefined,
  thresholdMeters = 100
): Promise<boolean> {
  if (accuracyMeters === undefined) return true; // нет данных — не блокируем
  return accuracyMeters <= thresholdMeters;
}
