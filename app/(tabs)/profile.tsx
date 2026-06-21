import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useUserProfile } from "@/hooks/useUserProfile";
import { EditProfileForm } from "@/components/EditProfileForm";
import { useState } from "react";

export default function ProfileScreen() {
  const colors = useColors();
  const {
    profile,
    structure,
    loading,
    error,
    updateProfile,
    createProfile,
    addDepartment,
    removeDepartment,
    addInspection,
    removeInspection,
    getInspectionsByDepartment,
  } = useUserProfile();

  const [isEditing, setIsEditing] = useState(false);

  if (loading) {
    return (
      <ScreenContainer className="flex items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer className="flex items-center justify-center">
        <Text className="text-foreground text-center">{error}</Text>
      </ScreenContainer>
    );
  }

  if (isEditing) {
    return (
      <ScreenContainer className="flex-1">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-foreground">Редактирование профиля</Text>
          <TouchableOpacity
            className="p-2 rounded-lg"
            style={{ backgroundColor: colors.surface }}
            onPress={() => setIsEditing(false)}
          >
            <Text className="text-sm font-semibold text-foreground">Закрыть</Text>
          </TouchableOpacity>
        </View>

        <EditProfileForm
          profile={profile}
          departments={structure.departments}
          inspections={structure.inspections}
          onSave={updateProfile}
          onAddDepartment={addDepartment}
          onAddInspection={addInspection}
          onRemoveDepartment={removeDepartment}
          onRemoveInspection={removeInspection}
          onGetInspections={getInspectionsByDepartment}
        />
      </ScreenContainer>
    );
  }

  if (!profile) {
    return (
      <ScreenContainer className="flex items-center justify-center">
        <View className="gap-4">
          <Text className="text-xl font-bold text-foreground text-center">Профиль не создан</Text>
          <TouchableOpacity
            className="p-3 rounded-lg items-center"
            style={{ backgroundColor: colors.primary }}
            onPress={() => setIsEditing(true)}
          >
            <Text className="text-base font-semibold text-white">Создать профиль</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1 gap-4">
      {/* Заголовок профиля */}
      <View className="gap-2 mb-4">
        <Text className="text-3xl font-bold text-foreground">
          {profile.firstName} {profile.lastName}
        </Text>
        <Text className="text-base text-muted">{profile.position}</Text>
      </View>

      {/* Информация о структуре */}
      {profile.departmentId && (
        <View
          className="p-4 rounded-lg gap-2"
          style={{ backgroundColor: colors.surface }}
        >
          <Text className="text-sm font-semibold text-muted">СТРУКТУРА ОРГАНИЗАЦИИ</Text>
          <Text className="text-base font-semibold text-foreground">
            Департамент: {profile.departmentName || "Не указан"}
          </Text>
          {profile.inspectionId && (
            <Text className="text-base font-semibold text-foreground">
              Инспекция: {profile.inspectionName || "Не указана"}
            </Text>
          )}
        </View>
      )}

      {/* Контактная информация */}
      <View
        className="p-4 rounded-lg gap-3"
        style={{ backgroundColor: colors.surface }}
      >
        <Text className="text-sm font-semibold text-muted">КОНТАКТНАЯ ИНФОРМАЦИЯ</Text>
        <View>
          <Text className="text-xs text-muted mb-1">Email</Text>
          <Text className="text-base text-foreground">{profile.email}</Text>
        </View>
        {profile.phone && (
          <View>
            <Text className="text-xs text-muted mb-1">Телефон</Text>
            <Text className="text-base text-foreground">{profile.phone}</Text>
          </View>
        )}
      </View>

      {/* Настройки приложения */}
      <View
        className="p-4 rounded-lg gap-3"
        style={{ backgroundColor: colors.surface }}
      >
        <Text className="text-sm font-semibold text-muted">НАСТРОЙКИ ПРИЛОЖЕНИЯ</Text>
        <View className="flex-row justify-between">
          <View>
            <Text className="text-xs text-muted mb-1">Язык</Text>
            <Text className="text-base text-foreground">
              {profile.language === "ru" ? "Русский" : "English"}
            </Text>
          </View>
          <View>
            <Text className="text-xs text-muted mb-1">Тема</Text>
            <Text className="text-base text-foreground">
              {profile.theme === "auto" ? "Автоматически" : profile.theme === "light" ? "Светлая" : "Темная"}
            </Text>
          </View>
        </View>
      </View>

      {/* Кнопка редактирования */}
      <TouchableOpacity
        className="p-4 rounded-lg items-center mt-4"
        style={{ backgroundColor: colors.primary }}
        onPress={() => setIsEditing(true)}
      >
        <Text className="text-base font-semibold text-white">Редактировать профиль</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}
