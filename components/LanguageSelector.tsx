import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useI18n } from '@/hooks/useI18n';
import { useColors } from '@/hooks/use-colors';
import { cn } from '@/lib/utils';

export function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();
  const colors = useColors();

  const languages = [
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  ];

  return (
    <View className="gap-3">
      <Text className="text-lg font-semibold text-foreground mb-2">{t('settings.language')}</Text>
      <View className="gap-2">
        {languages.map((lang) => (
          <Pressable
            key={lang.code}
            onPress={() => setLanguage(lang.code as 'ru')}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View
              className={cn(
                'flex-row items-center gap-3 p-4 rounded-lg border-2',
                language === lang.code
                  ? 'bg-primary/10 border-primary'
                  : 'bg-surface border-border'
              )}
            >
              <Text className="text-3xl">{lang.flag}</Text>
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">{lang.name}</Text>
                <Text className="text-xs text-muted mt-1">
                  {language === lang.code ? 'Выбрано' : 'Нажмите для выбора'}
                </Text>
              </View>
              {language === lang.code && (
                <View
                  className="w-6 h-6 rounded-full bg-primary items-center justify-center"
                >
                  <Text className="text-white font-bold">✓</Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
