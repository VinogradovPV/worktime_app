export type ThemeName = 'light' | 'dark' | 'blue' | 'green';

export interface ThemeColors {
  primary: { light: string; dark: string };
  background: { light: string; dark: string };
  surface: { light: string; dark: string };
  foreground: { light: string; dark: string };
  muted: { light: string; dark: string };
  border: { light: string; dark: string };
  success: { light: string; dark: string };
  warning: { light: string; dark: string };
  error: { light: string; dark: string };
}

export const themes: Record<ThemeName, ThemeColors> = {
  light: {
    primary: { light: '#0a7ea4', dark: '#0a7ea4' },
    background: { light: '#ffffff', dark: '#151718' },
    surface: { light: '#f5f5f5', dark: '#1e2022' },
    foreground: { light: '#11181C', dark: '#ECEDEE' },
    muted: { light: '#687076', dark: '#9BA1A6' },
    border: { light: '#E5E7EB', dark: '#334155' },
    success: { light: '#22C55E', dark: '#4ADE80' },
    warning: { light: '#F59E0B', dark: '#FBBF24' },
    error: { light: '#EF4444', dark: '#F87171' },
  },
  dark: {
    primary: { light: '#0ea5e9', dark: '#0ea5e9' },
    background: { light: '#0f172a', dark: '#0f172a' },
    surface: { light: '#1e293b', dark: '#1e293b' },
    foreground: { light: '#f1f5f9', dark: '#f1f5f9' },
    muted: { light: '#94a3b8', dark: '#94a3b8' },
    border: { light: '#334155', dark: '#334155' },
    success: { light: '#10b981', dark: '#10b981' },
    warning: { light: '#f59e0b', dark: '#f59e0b' },
    error: { light: '#ef4444', dark: '#ef4444' },
  },
  blue: {
    primary: { light: '#3b82f6', dark: '#60a5fa' },
    background: { light: '#f0f9ff', dark: '#0c2340' },
    surface: { light: '#e0f2fe', dark: '#1e3a5f' },
    foreground: { light: '#0c2340', dark: '#f0f9ff' },
    muted: { light: '#0369a1', dark: '#7dd3fc' },
    border: { light: '#bae6fd', dark: '#0369a1' },
    success: { light: '#06b6d4', dark: '#22d3ee' },
    warning: { light: '#f59e0b', dark: '#fbbf24' },
    error: { light: '#dc2626', dark: '#fca5a5' },
  },
  green: {
    primary: { light: '#16a34a', dark: '#4ade80' },
    background: { light: '#f0fdf4', dark: '#0f2818' },
    surface: { light: '#dcfce7', dark: '#1b4d2e' },
    foreground: { light: '#15803d', dark: '#f0fdf4' },
    muted: { light: '#22c55e', dark: '#86efac' },
    border: { light: '#bbf7d0', dark: '#22c55e' },
    success: { light: '#059669', dark: '#10b981' },
    warning: { light: '#eab308', dark: '#facc15' },
    error: { light: '#dc2626', dark: '#fca5a5' },
  },
};

export const themeNames: ThemeName[] = ['light', 'dark', 'blue', 'green'];
export const themeLabels: Record<ThemeName, string> = {
  light: 'Светлая',
  dark: 'Темная',
  blue: 'Синяя',
  green: 'Зеленая',
};
