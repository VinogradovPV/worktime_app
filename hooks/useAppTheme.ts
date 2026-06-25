/**
 * Hook для получения текущей темы и цветовой палитры
 * Использует глобальный контекст темы и централизованную палитру
 */

import { useColorScheme } from 'react-native';
import { colors, type ThemeMode, type ColorPalette } from '@/lib/themes/colors';
import { useThemeContext } from '@/lib/theme-provider';

export function useAppTheme() {
  const { colorScheme } = useThemeContext();
  
  // Определяем режим: если colorScheme явно установлен, используем его, иначе системный
  const systemScheme = useColorScheme();
  const mode: ThemeMode = (colorScheme as ThemeMode) || (systemScheme === 'light' ? 'light' : 'dark');

  return {
    mode,
    colors: colors[mode] as ColorPalette,
  };
}
