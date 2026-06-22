import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";
import * as Haptics from "expo-haptics";
import { Switch } from "react-native";
import { AvatarUpload } from "./AvatarUpload";
import type { UserProfile, Department, Inspection } from "@/lib/storage/userProfileStorage";

interface EditProfileFormProps {
  profile: UserProfile | null;
  departments: Department[];
  inspections: Inspection[];
  onSave: (updates: Partial<UserProfile>) => Promise<any>;
  onAddDepartment: (name: string) => Promise<any>;
  onAddInspection: (departmentId: string, name: string) => Promise<any>;
  onRemoveDepartment: (departmentId: string) => Promise<void>;
  onRemoveInspection: (inspectionId: string) => Promise<void>;
  onGetInspections: (departmentId: string) => Promise<Inspection[]>;
}

export function EditProfileForm({
  profile,
  departments,
  inspections,
  onSave,
  onAddDepartment,
  onAddInspection,
  onRemoveDepartment,
  onRemoveInspection,
  onGetInspections,
}: EditProfileFormProps) {
  const colors = useColors();

  const [firstName, setFirstName] = useState(profile?.firstName || "");
  const [lastName, setLastName] = useState(profile?.lastName || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [position, setPosition] = useState(profile?.position || "");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(profile?.departmentId || "");
  const [selectedInspectionId, setSelectedInspectionId] = useState(profile?.inspectionId || "");
  const [theme, setTheme] = useState<"light" | "dark" | "auto">(profile?.theme || "auto");
  const [isLoading, setIsLoading] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newInspectionName, setNewInspectionName] = useState("");
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [departmentInspections, setDepartmentInspections] = useState<Inspection[]>([]);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showInspectionPicker, setShowInspectionPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [avatar, setAvatar] = useState(profile?.avatar || "");
  const [showNormProgress, setShowNormProgress] = useState<boolean>(profile?.showNormProgress !== false);
  const [normHoursPerDay, setNormHoursPerDay] = useState<string>(String(profile?.normHoursPerDay ?? 8));

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !position.trim()) {
      Alert.alert("Ошибка", "Пожалуйста, заполните все обязательные поля");
      return;
    }

    try {
      setIsLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const normHours = parseFloat(normHoursPerDay);
      await onSave({
        firstName,
        lastName,
        email,
        phone,
        position,
        departmentId: selectedDepartmentId,
        inspectionId: selectedInspectionId,
        language: "ru",
        theme,
        avatar,
        showNormProgress,
        normHoursPerDay: isNaN(normHours) || normHours <= 0 ? 8 : normHours,
      });

      Alert.alert("Успешно", "Профиль обновлен");
    } catch (error) {
      console.error("Ошибка при сохранении профиля:", error);
      Alert.alert("Ошибка", "Не удалось сохранить профиль");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDepartment = async () => {
    if (!newDepartmentName.trim()) {
      Alert.alert("Ошибка", "Введите название департамента");
      return;
    }

    try {
      setIsLoading(true);
      await onAddDepartment(newDepartmentName);
      setNewDepartmentName("");
      setShowDepartmentForm(false);
      Alert.alert("Успешно", "Департамент добавлен");
    } catch (error) {
      console.error("Ошибка при добавлении департамента:", error);
      Alert.alert("Ошибка", "Не удалось добавить департамент");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddInspection = async () => {
    if (!selectedDepartmentId) {
      Alert.alert("Ошибка", "Выберите департамент");
      return;
    }

    if (!newInspectionName.trim()) {
      Alert.alert("Ошибка", "Введите название инспекции");
      return;
    }

    try {
      setIsLoading(true);
      await onAddInspection(selectedDepartmentId, newInspectionName);
      setNewInspectionName("");
      setShowInspectionForm(false);
      Alert.alert("Успешно", "Инспекция добавлена");
    } catch (error) {
      console.error("Ошибка при добавлении инспекции:", error);
      Alert.alert("Ошибка", "Не удалось добавить инспекцию");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepartmentChange = async (departmentId: string) => {
    setSelectedDepartmentId(departmentId);
    setSelectedInspectionId("");

    if (departmentId) {
      try {
        const inspections = await onGetInspections(departmentId);
        setDepartmentInspections(inspections);
      } catch (error) {
        console.error("Ошибка при получении инспекций:", error);
      }
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
      <View className="p-4 gap-4">
        {/* Аватар */}
        <View className="items-center py-4">
          <AvatarUpload
            currentAvatar={avatar}
            onAvatarSelected={setAvatar}
          />
        </View>

        {/* Личные данные */}
        <View>
          <Text className="text-lg font-bold text-foreground mb-3">Личные данные</Text>

          <Text className="text-sm font-semibold text-foreground mb-2">Имя</Text>
          <TextInput
            className="p-3 rounded-lg border text-foreground"
            style={{ borderColor: colors.border, backgroundColor: colors.background }}
            placeholder="Введите имя"
            placeholderTextColor={colors.muted}
            value={firstName}
            onChangeText={setFirstName}
            editable={!isLoading}
          />

          <Text className="text-sm font-semibold text-foreground mb-2 mt-3">Фамилия</Text>
          <TextInput
            className="p-3 rounded-lg border text-foreground"
            style={{ borderColor: colors.border, backgroundColor: colors.background }}
            placeholder="Введите фамилию"
            placeholderTextColor={colors.muted}
            value={lastName}
            onChangeText={setLastName}
            editable={!isLoading}
          />

          <Text className="text-sm font-semibold text-foreground mb-2 mt-3">Email</Text>
          <TextInput
            className="p-3 rounded-lg border text-foreground"
            style={{ borderColor: colors.border, backgroundColor: colors.background }}
            placeholder="example@mail.com"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            editable={!isLoading}
          />

          <Text className="text-sm font-semibold text-foreground mb-2 mt-3">Телефон</Text>
          <TextInput
            className="p-3 rounded-lg border text-foreground"
            style={{ borderColor: colors.border, backgroundColor: colors.background }}
            placeholder="+7 (999) 999-99-99"
            placeholderTextColor={colors.muted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!isLoading}
          />
        </View>

        {/* Должность */}
        <View>
          <Text className="text-lg font-bold text-foreground mb-3">Должность</Text>

          <Text className="text-sm font-semibold text-foreground mb-2">Должность</Text>
          <TextInput
            className="p-3 rounded-lg border text-foreground"
            style={{ borderColor: colors.border, backgroundColor: colors.background }}
            placeholder="Введите должность"
            placeholderTextColor={colors.muted}
            value={position}
            onChangeText={setPosition}
            editable={!isLoading}
          />
        </View>

        {/* Структура организации */}
        <View>
          <Text className="text-lg font-bold text-foreground mb-3">Структура организации</Text>

          <Text className="text-sm font-semibold text-foreground mb-2">Департамент</Text>
          <TouchableOpacity
            className="rounded-lg border p-3"
            style={{ borderColor: colors.border, backgroundColor: colors.background }}
            onPress={() => setShowDepartmentPicker(!showDepartmentPicker)}
          >
            <Text className="text-sm text-foreground">
              {departments.find((d) => d.id === selectedDepartmentId)?.name || "Выберите департамент"}
            </Text>
          </TouchableOpacity>

          {showDepartmentPicker && (
            <View className="mt-2 rounded-lg border" style={{ borderColor: colors.border }}>
              {departments.map((dept) => (
                <TouchableOpacity
                  key={dept.id}
                  className="p-3 border-b"
                  style={{ borderColor: colors.border }}
                  onPress={() => {
                    handleDepartmentChange(dept.id);
                    setShowDepartmentPicker(false);
                  }}
                >
                  <Text className="text-sm text-foreground">{dept.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            className="mt-2 p-2 rounded-lg"
            style={{ backgroundColor: colors.primary + "20" }}
            onPress={() => setShowDepartmentForm(!showDepartmentForm)}
          >
            <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
              + Добавить департамент
            </Text>
          </TouchableOpacity>

          {showDepartmentForm && (
            <View className="mt-3 gap-2">
              <TextInput
                className="p-3 rounded-lg border text-foreground"
                style={{ borderColor: colors.border, backgroundColor: colors.background }}
                placeholder="Название департамента"
                placeholderTextColor={colors.muted}
                value={newDepartmentName}
                onChangeText={setNewDepartmentName}
                editable={!isLoading}
              />
              <TouchableOpacity
                className="p-2 rounded-lg"
                style={{ backgroundColor: colors.primary }}
                onPress={handleAddDepartment}
                disabled={isLoading}
              >
                <Text className="text-sm font-semibold text-white text-center">Добавить</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedDepartmentId && (
            <>
              <Text className="text-sm font-semibold text-foreground mb-2 mt-4">Инспекция/Отдел</Text>
              <TouchableOpacity
                className="rounded-lg border p-3"
                style={{ borderColor: colors.border, backgroundColor: colors.background }}
                onPress={() => setShowInspectionPicker(!showInspectionPicker)}
              >
                <Text className="text-sm text-foreground">
                  {departmentInspections.find((i) => i.id === selectedInspectionId)?.name ||
                    "Выберите инспекцию"}
                </Text>
              </TouchableOpacity>

              {showInspectionPicker && (
                <View className="mt-2 rounded-lg border" style={{ borderColor: colors.border }}>
                  {departmentInspections.map((insp) => (
                    <TouchableOpacity
                      key={insp.id}
                      className="p-3 border-b"
                      style={{ borderColor: colors.border }}
                      onPress={() => {
                        setSelectedInspectionId(insp.id);
                        setShowInspectionPicker(false);
                      }}
                    >
                      <Text className="text-sm text-foreground">{insp.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                className="mt-2 p-2 rounded-lg"
                style={{ backgroundColor: colors.primary + "20" }}
                onPress={() => setShowInspectionForm(!showInspectionForm)}
              >
                <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                  + Добавить инспекцию
                </Text>
              </TouchableOpacity>

              {showInspectionForm && (
                <View className="mt-3 gap-2">
                  <TextInput
                    className="p-3 rounded-lg border text-foreground"
                    style={{ borderColor: colors.border, backgroundColor: colors.background }}
                    placeholder="Название инспекции"
                    placeholderTextColor={colors.muted}
                    value={newInspectionName}
                    onChangeText={setNewInspectionName}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: colors.primary }}
                    onPress={handleAddInspection}
                    disabled={isLoading}
                  >
                    <Text className="text-sm font-semibold text-white text-center">Добавить</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

        {/* Норма рабочего дня */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-foreground mb-3">Норма рабочего дня</Text>

          <View
            className="rounded-lg p-4 mb-3"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text className="text-sm font-semibold text-foreground">Показывать прогресс нормы</Text>
                <Text className="text-xs text-muted mt-1">Прогресс-бар на главном экране</Text>
              </View>
              <Switch
                value={showNormProgress}
                onValueChange={(val) => {
                  setShowNormProgress(val);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                trackColor={{ false: colors.border, true: colors.success }}
              />
            </View>
          </View>

          {showNormProgress && (
            <View
              className="rounded-lg p-4"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            >
              <Text className="text-xs text-muted mb-2">Часов в рабочий день</Text>
              <TextInput
                value={normHoursPerDay}
                onChangeText={setNormHoursPerDay}
                placeholder="8"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                returnKeyType="done"
                className="border rounded-lg p-3 text-foreground"
                style={{ borderColor: colors.border }}
                maxLength={4}
              />
            </View>
          )}
        </View>

        {/* Настройки приложения */}
        <View>
          <Text className="text-lg font-bold text-foreground mb-3">Настройки приложения</Text>

          <Text className="text-sm font-semibold text-foreground mb-2">Тема оформления</Text>
          <TouchableOpacity
            className="rounded-lg border p-3"
            style={{ borderColor: colors.border, backgroundColor: colors.background }}
            onPress={() => setShowThemePicker(!showThemePicker)}
          >
            <Text className="text-sm text-foreground">
              {theme === "auto" ? "Автоматически" : theme === "light" ? "Светлая" : "Темная"}
            </Text>
          </TouchableOpacity>

          {showThemePicker && (
            <View className="mt-2 rounded-lg border" style={{ borderColor: colors.border }}>
              {[
                { label: "Автоматически", value: "auto" as const },
                { label: "Светлая", value: "light" as const },
                { label: "Темная", value: "dark" as const },
              ].map((item) => (
                <TouchableOpacity
                  key={item.value}
                  className="p-3 border-b"
                  style={{ borderColor: colors.border }}
                  onPress={() => {
                    setTheme(item.value);
                    setShowThemePicker(false);
                  }}
                >
                  <Text className="text-sm text-foreground">{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Кнопка сохранения */}
        <TouchableOpacity
          className="p-4 rounded-lg items-center mt-4 mb-4"
          style={{ backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 }}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text className="text-base font-semibold text-white">
            {isLoading ? "Сохранение..." : "Сохранить"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
