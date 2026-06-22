import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  GeolocationSettings,
  GeofenceZone,
  getGeolocationSettings,
  saveGeolocationSettings,
  getZones,
  deleteZone,
} from "@/lib/storage/geofenceStorage";
import {
  createZoneFromCurrentLocation,
  createZoneManually,
} from "@/lib/services/geofenceService";
import {
  requestLocationPermission,
  getCurrentLocation,
  calculateDistanceMeters,
} from "@/lib/services/geolocationService";

export default function GeofenceSettingsScreen() {
  const colors = useColors();
  const router = useRouter();

  const [settings, setSettings] = useState<GeolocationSettings | null>(null);
  const [zones, setZones] = useState<GeofenceZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [currentLocationInfo, setCurrentLocationInfo] = useState<string | null>(null);

  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState("Офис");
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [manualRadius, setManualRadius] = useState("150");

  const reload = useCallback(async () => {
    const [s, z] = await Promise.all([getGeolocationSettings(), getZones()]);
    setSettings(s);
    setZones(z);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleToggleEnabled = async (value: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (value) {
      const status = await requestLocationPermission();
      if (status === "denied" || status === "restricted") {
        Alert.alert(
          "Разрешение не выдано",
          "Для работы геозон необходимо разрешить доступ к геолокации. Откройте настройки устройства.",
          [
            { text: "Отмена", style: "cancel" },
            { text: "Открыть настройки", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      const updated = await saveGeolocationSettings({ enabled: true, permissionStatus: status });
      setSettings(updated);
    } else {
      const updated = await saveGeolocationSettings({ enabled: false });
      setSettings(updated);
    }
  };

  const handleCheckLocation = async () => {
    setCheckingLocation(true);
    setCurrentLocationInfo(null);
    try {
      const loc = await getCurrentLocation();
      if (!loc) {
        setCurrentLocationInfo("Не удалось получить местоположение. Проверьте разрешения.");
        return;
      }

      const activeZone = zones.find((z) => z.isActive);
      if (!activeZone) {
        setCurrentLocationInfo(
          `📍 Координаты: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}\n` +
            `Точность: ${loc.accuracyMeters ? `±${Math.round(loc.accuracyMeters)} м` : "неизвестна"}\n\n` +
            `Рабочая зона не настроена.`
        );
        return;
      }

      const distance = calculateDistanceMeters(loc, activeZone);
      const inside = distance <= activeZone.radiusMeters;

      setCurrentLocationInfo(
        `📍 Координаты: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}\n` +
          `Точность: ${loc.accuracyMeters ? `±${Math.round(loc.accuracyMeters)} м` : "неизвестна"}\n\n` +
          `Зона «${activeZone.name}»:\n` +
          `Расстояние: ${Math.round(distance)} м (радиус: ${activeZone.radiusMeters} м)\n` +
          `Статус: ${inside ? "✅ Вы внутри зоны" : "❌ Вы вне зоны"}`
      );
    } finally {
      setCheckingLocation(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setCheckingLocation(true);
    try {
      const zone = await createZoneFromCurrentLocation("Офис", 150);
      if (!zone) {
        Alert.alert("Ошибка", "Не удалось получить текущее местоположение. Проверьте разрешения.");
        return;
      }
      await reload();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(
        "Зона создана",
        `Рабочая зона «${zone.name}» установлена по текущему местоположению.\nРадиус: ${zone.radiusMeters} м`
      );
    } finally {
      setCheckingLocation(false);
    }
  };

  const handleCreateManual = async () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    const radius = parseInt(manualRadius, 10);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      Alert.alert("Ошибка", "Введите корректные координаты.");
      return;
    }
    if (isNaN(radius) || radius < 50 || radius > 5000) {
      Alert.alert("Ошибка", "Радиус должен быть от 50 до 5000 метров.");
      return;
    }
    if (!manualName.trim()) {
      Alert.alert("Ошибка", "Введите название зоны.");
      return;
    }

    setCheckingLocation(true);
    try {
      await createZoneManually({
        name: manualName.trim(),
        latitude: lat,
        longitude: lon,
        radiusMeters: radius,
      });
      await reload();
      setShowManualForm(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setCheckingLocation(false);
    }
  };

  const handleDeleteZone = (zone: GeofenceZone) => {
    Alert.alert(
      "Удалить зону",
      `Удалить рабочую зону «${zone.name}»?`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            await deleteZone(zone.id);
            await reload();
          },
        },
      ]
    );
  };

  const permissionLabel = () => {
    switch (settings?.permissionStatus) {
      case "granted_foreground": return "✅ Разрешено (при использовании)";
      case "granted_background": return "✅ Разрешено (всегда)";
      case "denied": return "❌ Запрещено";
      case "restricted": return "⚠️ Ограничено системой";
      default: return "⏳ Не запрошено";
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const activeZone = zones.find((z) => z.isActive);

  return (
    <ScreenContainer>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Заголовок */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.backIcon, { color: colors.foreground }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Геолокация и рабочие зоны
          </Text>
        </View>

        {/* Блок приватности */}
        <View style={[styles.privacyCard, { backgroundColor: "#E6F4FE", borderColor: "#B3D9F5" }]}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={[styles.privacyText, { color: "#1A5276" }]}>
            Геолокация используется только для определения входа и выхода из рабочей зоны. Приложение не сохраняет маршрут и не отслеживает перемещения вне рабочего времени.
          </Text>
        </View>

        {/* Основной переключатель */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>Геолокация включена</Text>
              <Text style={[styles.rowSubtitle, { color: colors.muted }]}>Комбинированный режим учёта</Text>
            </View>
            <Switch
              value={settings?.enabled ?? false}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Статус разрешений */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>РАЗРЕШЕНИЕ НА ГЕОЛОКАЦИЮ</Text>
          <Text style={[styles.permissionLabel, { color: colors.foreground }]}>{permissionLabel()}</Text>
          {(settings?.permissionStatus === "denied" || settings?.permissionStatus === "unknown") && (
            <TouchableOpacity
              style={[styles.linkButton, { borderColor: colors.primary }]}
              onPress={() => {
                if (settings?.permissionStatus === "denied") {
                  Linking.openSettings();
                } else {
                  handleToggleEnabled(true);
                }
              }}
            >
              <Text style={[styles.linkButtonText, { color: colors.primary }]}>
                {settings?.permissionStatus === "denied" ? "Открыть настройки устройства" : "Запросить разрешение"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Рабочая зона */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>РАБОЧАЯ ЗОНА</Text>

          {activeZone ? (
            <View style={styles.zoneInfo}>
              <View style={styles.zoneRow}>
                <Text style={[styles.zoneName, { color: colors.foreground }]}>📍 {activeZone.name}</Text>
                <TouchableOpacity
                  onPress={() => handleDeleteZone(activeZone)}
                  style={[styles.deleteButton, { backgroundColor: "#FEE2E2" }]}
                >
                  <Text style={{ color: "#DC2626", fontSize: 12, fontWeight: "600" }}>Удалить</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.zoneCoords, { color: colors.muted }]}>
                {activeZone.latitude.toFixed(6)}, {activeZone.longitude.toFixed(6)}
              </Text>
              <Text style={[styles.zoneCoords, { color: colors.muted }]}>Радиус: {activeZone.radiusMeters} м</Text>
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.muted }]}>Рабочая зона не настроена</Text>
          )}

          <View style={styles.zoneButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleUseCurrentLocation}
              disabled={checkingLocation}
            >
              {checkingLocation ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>📍 Использовать текущее местоположение</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => setShowManualForm(!showManualForm)}
            >
              <Text style={[styles.actionButtonText, { color: colors.foreground }]}>✏️ Ввести координаты вручную</Text>
            </TouchableOpacity>
          </View>

          {showManualForm && (
            <View style={[styles.manualForm, { borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.muted }]}>Название</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                value={manualName}
                onChangeText={setManualName}
                placeholder="Офис"
                placeholderTextColor={colors.muted}
              />
              <Text style={[styles.formLabel, { color: colors.muted }]}>Широта</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                value={manualLat}
                onChangeText={setManualLat}
                placeholder="55.751244"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
              />
              <Text style={[styles.formLabel, { color: colors.muted }]}>Долгота</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                value={manualLon}
                onChangeText={setManualLon}
                placeholder="37.618423"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
              />
              <Text style={[styles.formLabel, { color: colors.muted }]}>Радиус (метры)</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                value={manualRadius}
                onChangeText={setManualRadius}
                placeholder="150"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateManual}
                disabled={checkingLocation}
              >
                <Text style={styles.actionButtonText}>Создать зону</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Проверить местоположение */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>ПРОВЕРКА МЕСТОПОЛОЖЕНИЯ</Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
            onPress={handleCheckLocation}
            disabled={checkingLocation}
          >
            {checkingLocation ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>🔍 Проверить моё местоположение</Text>
            )}
          </TouchableOpacity>
          {currentLocationInfo && (
            <View style={[styles.locationResult, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.locationResultText, { color: colors.foreground }]}>{currentLocationInfo}</Text>
            </View>
          )}
        </View>

        {/* Точность GPS */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>ТОЧНОСТЬ GPS</Text>
          <Text style={[styles.rowSubtitle, { color: colors.muted }]}>
            Порог точности: {settings?.accuracyThresholdMeters ?? 100} м
          </Text>
          <Text style={[styles.hintText, { color: colors.muted }]}>
            Если GPS определён с погрешностью выше порога, событие не создаётся автоматически. Вы получите предупреждение.
          </Text>
        </View>

        {settings?.enabled && (
          <TouchableOpacity
            style={[styles.disableButton, { borderColor: "#EF4444" }]}
            onPress={() => handleToggleEnabled(false)}
          >
            <Text style={{ color: "#EF4444", fontSize: 15, fontWeight: "600" }}>Отключить геолокацию</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 12 },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 20, fontWeight: "600" },
  headerTitle: { fontSize: 20, fontWeight: "700", flex: 1 },
  privacyCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  privacyIcon: { fontSize: 18, marginTop: 1 },
  privacyText: { flex: 1, fontSize: 13, lineHeight: 18 },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowLeft: { flex: 1, marginRight: 12 },
  rowTitle: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  rowSubtitle: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  permissionLabel: { fontSize: 15, fontWeight: "500", marginBottom: 10 },
  linkButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, alignSelf: "flex-start", marginTop: 4 },
  linkButtonText: { fontSize: 13, fontWeight: "600" },
  emptyText: { fontSize: 14, fontStyle: "italic", marginBottom: 12 },
  zoneInfo: { marginBottom: 12 },
  zoneRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  zoneName: { fontSize: 15, fontWeight: "600" },
  zoneCoords: { fontSize: 12, lineHeight: 18 },
  deleteButton: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  zoneButtons: { gap: 8 },
  actionButton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: "center" },
  actionButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  manualForm: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: 4 },
  formLabel: { fontSize: 12, fontWeight: "600", marginTop: 8, marginBottom: 2 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 4 },
  locationResult: { marginTop: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  locationResultText: { fontSize: 13, lineHeight: 20 },
  hintText: { fontSize: 12, lineHeight: 18, marginTop: 6 },
  disableButton: { marginHorizontal: 16, marginTop: 4, marginBottom: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
});
