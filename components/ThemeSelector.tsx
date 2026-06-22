import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useThemeContext } from '@/lib/theme-provider';
import { useColors } from '@/hooks/use-colors';
import { themeNames, themeLabels, themes } from '@/lib/themes/themeDefinitions';
import { cn } from '@/lib/utils';

export function ThemeSelector() {
  const { colorScheme, setColorScheme } = useThemeContext();
  const colors = useColors();

  return (
    <View className="gap-3">
      <Text className="text-lg font-semibold text-foreground mb-2">Выберите тему</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
        {themeNames.map((themeName) => {
          const themeColors = themes[themeName];
          const isSelected = colorScheme === themeName;

          return (
            <Pressable
              key={themeName}
              onPress={() => setColorScheme(themeName as any)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                className={cn(
                  'rounded-lg p-4 items-center gap-2 border-2 min-w-24',
                  isSelected ? 'border-primary' : 'border-border'
                )}
                style={{
                  backgroundColor: themeColors.background.light,
                }}
              >
                {/* Предпросмотр цветов */}
                <View className="flex-row gap-1">
                  <View
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: themeColors.primary.light }}
                  />
                  <View
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: themeColors.success.light }}
                  />
                  <View
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: themeColors.error.light }}
                  />
                </View>

                {/* Название темы */}
                <Text
                  className="text-xs font-semibold"
                  style={{ color: themeColors.foreground.light }}
                >
                  {themeLabels[themeName]}
                </Text>

                {/* Галочка если выбрана */}
                {isSelected && (
                  <View className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary items-center justify-center">
                    <Text className="text-white text-xs font-bold">✓</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
