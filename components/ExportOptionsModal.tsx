import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Animated } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { cn } from '@/lib/utils';
import * as Haptics from 'expo-haptics';

export interface ExportOption {
  id: 'csv' | 'pdf';
  label: string;
  description: string;
  icon: string;
}

interface ExportOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onExport: (format: 'csv' | 'pdf') => Promise<void>;
  isLoading?: boolean;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'csv',
    label: 'CSV',
    description: 'Таблица для Excel и Google Sheets',
    icon: '📊',
  },
  {
    id: 'pdf',
    label: 'PDF',
    description: 'Красивый отчет для печати и архива',
    icon: '📄',
  },
];

/**
 * Модальное окно для выбора формата экспорта
 */
export function ExportOptionsModal({
  visible,
  onClose,
  onExport,
  isLoading = false,
}: ExportOptionsModalProps) {
  const colors = useColors();
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'pdf' | null>(null);
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, scaleAnim]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      setSelectedFormat(format);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await onExport(format);
      Alert.alert('✅ Успешно', `Отчет экспортирован в формате ${format.toUpperCase()}`);
      onClose();
    } catch (error) {
      Alert.alert('❌ Ошибка', 'Не удалось экспортировать отчет. Попробуйте еще раз.');
      console.error('Ошибка при экспорте:', error);
    } finally {
      setSelectedFormat(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            backgroundColor: colors.surface,
          }}
          className="w-4/5 rounded-2xl p-6"
        >
          {/* Заголовок */}
          <Text className="text-2xl font-bold text-foreground mb-2">📥 Экспортировать отчет</Text>
          <Text className="text-sm text-muted mb-6">
            Выберите формат для сохранения отчета о рабочем времени
          </Text>

          {/* Опции экспорта */}
          <View className="gap-3 mb-6">
            {EXPORT_OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                onPress={() => handleExport(option.id)}
                disabled={isLoading}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <View
                  className={cn(
                    'flex-row items-center p-4 rounded-xl border-2 gap-3',
                    selectedFormat === option.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background'
                  )}
                >
                  {selectedFormat === option.id && isLoading ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <Text className="text-2xl">{option.icon}</Text>
                  )}

                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">{option.label}</Text>
                    <Text className="text-xs text-muted mt-1">{option.description}</Text>
                  </View>

                  {selectedFormat === option.id && isLoading ? (
                    <Text className="text-sm text-muted">Экспортирую...</Text>
                  ) : (
                    <Text className="text-lg">→</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>

          {/* Кнопка отмены */}
          <Pressable
            onPress={onClose}
            disabled={isLoading}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View className="py-3 px-4 rounded-xl bg-border/30 items-center">
              <Text className="text-base font-semibold text-foreground">Отмена</Text>
            </View>
          </Pressable>

          {/* Информация */}
          <View className="mt-6 p-3 bg-warning/10 rounded-lg border border-warning/20">
            <Text className="text-xs text-warning font-semibold">💡 Совет</Text>
            <Text className="text-xs text-muted mt-1">
              Экспортированные файлы сохраняются в хранилище устройства и могут быть поделены через
              почту, облако или другие приложения.
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
