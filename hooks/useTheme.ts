import { useContext } from 'react';
import { useThemeContext } from '@/lib/theme-provider';

export function useTheme() {
  return useThemeContext();
}
