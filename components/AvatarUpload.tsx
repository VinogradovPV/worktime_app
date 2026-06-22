import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { ScreenContainer } from "./screen-container";
import { useColors } from "@/hooks/use-colors";

interface AvatarUploadProps {
  currentAvatar?: string;
  onAvatarSelected: (avatarBase64: string) => void | Promise<void>;
}

export function AvatarUpload({ currentAvatar, onAvatarSelected }: AvatarUploadProps) {
  const colors = useColors();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = async (type: "library" | "camera"): Promise<boolean> => {
    if (Platform.OS === "web") return true;
    if (type === "library") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === "granted";
    } else {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === "granted";
    }
  };

  const pickFromGallery = async () => {
    try {
      setError(null);
      const granted = await requestPermission("library");
      if (!granted) {
        Alert.alert("Нет доступа", "Разрешите доступ к галерее в настройках устройства.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        setPreviewModalVisible(true);
      }
    } catch (err) {
      setError("Ошибка при выборе изображения из галереи");
      console.error("Gallery picker error:", err);
    }
  };

  const pickFromCamera = async () => {
    try {
      setError(null);
      const granted = await requestPermission("camera");
      if (!granted) {
        Alert.alert("Нет доступа", "Разрешите доступ к камере в настройках устройства.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        setPreviewModalVisible(true);
      }
    } catch (err) {
      setError("Ошибка при съёмке фото");
      console.error("Camera error:", err);
    }
  };

  const pickImage = () => {
    Alert.alert(
      "Загрузить фото",
      "Выберите источник изображения",
      [
        { text: "Отмена", style: "cancel" },
        { text: "Из галереи", onPress: pickFromGallery },
        { text: "Сделать фото", onPress: pickFromCamera },
      ]
    );
  };

  const convertToBase64 = async (uri: string): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${base64}`;
    } catch (err) {
      throw new Error("Ошибка при конвертации изображения");
    }
  };

  const handleSaveAvatar = async () => {
    if (!selectedImage) return;

    try {
      setLoading(true);
      const base64Avatar = await convertToBase64(selectedImage);
      await onAvatarSelected(base64Avatar);
      setPreviewModalVisible(false);
      setSelectedImage(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при сохранении аватара");
      console.error("Save avatar error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="items-center gap-4">
      {/* Current Avatar Display */}
      <View className="relative">
        {currentAvatar ? (
          <Image
            source={{ uri: currentAvatar }}
            className="w-24 h-24 rounded-full bg-surface border-2"
            style={{ borderColor: colors.border }}
          />
        ) : (
          <View
            className="w-24 h-24 rounded-full bg-surface border-2 items-center justify-center"
            style={{ borderColor: colors.border }}
          >
            <Text className="text-muted text-sm">Нет фото</Text>
          </View>
        )}

        {/* Upload Button */}
        <TouchableOpacity
          onPress={pickImage}
          className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary items-center justify-center"
        >
          <Text className="text-background text-lg">+</Text>
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error && (
        <View className="w-full bg-error/10 p-3 rounded-lg">
          <Text className="text-error text-sm">{error}</Text>
        </View>
      )}

      {/* Upload Info Text */}
      <Text className="text-muted text-sm text-center">
        Нажмите на кнопку + чтобы загрузить фотографию профиля
      </Text>

      {/* Preview Modal */}
      <Modal
        visible={previewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !loading && setPreviewModalVisible(false)}
      >
        <ScreenContainer className="justify-between">
          <View className="flex-1 justify-center items-center">
            <Text className="text-lg font-semibold text-foreground mb-4">
              Предварительный просмотр
            </Text>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                className="w-64 h-64 rounded-2xl"
              />
            )}
          </View>

          {/* Action Buttons */}
          <View className="gap-3 pb-4">
            <TouchableOpacity
              onPress={handleSaveAvatar}
              disabled={loading}
              className="bg-primary p-4 rounded-lg items-center"
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text className="text-background font-semibold">Сохранить</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setPreviewModalVisible(false);
                setSelectedImage(null);
              }}
              disabled={loading}
              className="bg-surface p-4 rounded-lg items-center border"
              style={{ borderColor: colors.border }}
            >
              <Text className="text-foreground font-semibold">Отмена</Text>
            </TouchableOpacity>
          </View>
        </ScreenContainer>
      </Modal>
    </View>
  );
}
