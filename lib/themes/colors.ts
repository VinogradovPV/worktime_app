/**
 * Единая цветовая палитра приложения Worktime
 * Содержит темные и светлые темы со всеми необходимыми цветами
 */

export const colors = {
  dark: {
    background: '#0B0F12',
    surface: '#151B21',
    surfaceElevated: '#1B232B',
    surfaceMuted: '#202832',

    textPrimary: '#F5F7FA',
    textSecondary: '#AAB4C0',
    textMuted: '#6F7A86',
    textInverse: '#081016',

    border: '#29323D',
    divider: '#26303A',

    accent: '#0EA5E9',
    accentSoft: '#082F49',

    success: '#22C55E',
    successSoft: '#123C25',

    warning: '#F59E0B',
    warningSoft: '#3A2A0A',

    orange: '#F97316',
    orangeSoft: '#3A1F0A',

    danger: '#EF4444',
    dangerSoft: '#3A1111',

    info: '#38BDF8',
    infoSoft: '#0C3346',

    purple: '#A855F7',
    purpleSoft: '#2B1744',

    calendarWorkday: '#14532D',
    calendarWorked: '#16A34A',
    calendarWeekend: '#2A2F36',
    calendarHoliday: '#7F1D1D',
    calendarVacation: '#075985',
    calendarSick: '#581C87',
    calendarReview: '#92400E',
    calendarSelected: '#0EA5E9',
    calendarToday: '#38BDF8',
    calendarCurrentWeek: 'rgba(14, 165, 233, 0.12)',

    chartPrimary: '#0EA5E9',
    chartSuccess: '#22C55E',
    chartWarning: '#F59E0B',
    chartDanger: '#EF4444',
    chartMuted: '#64748B',

    tabBarBackground: '#0B0F12',
    tabBarBorder: '#1E2933',
    tabActive: '#0EA5E9',
    tabInactive: '#7B8794',
  },

  light: {
    background: '#F6F8FB',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#F1F5F9',

    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textInverse: '#FFFFFF',

    border: '#D7DEE8',
    divider: '#E2E8F0',

    accent: '#0284C7',
    accentSoft: '#E0F2FE',

    success: '#16A34A',
    successSoft: '#DCFCE7',

    warning: '#D97706',
    warningSoft: '#FEF3C7',

    orange: '#EA580C',
    orangeSoft: '#FFEDD5',

    danger: '#DC2626',
    dangerSoft: '#FEE2E2',

    info: '#0284C7',
    infoSoft: '#E0F2FE',

    purple: '#9333EA',
    purpleSoft: '#F3E8FF',

    calendarWorkday: '#DCFCE7',
    calendarWorked: '#22C55E',
    calendarWeekend: '#E5E7EB',
    calendarHoliday: '#FEE2E2',
    calendarVacation: '#DBEAFE',
    calendarSick: '#F3E8FF',
    calendarReview: '#FEF3C7',
    calendarSelected: '#0284C7',
    calendarToday: '#0EA5E9',
    calendarCurrentWeek: 'rgba(2, 132, 199, 0.10)',

    chartPrimary: '#0284C7',
    chartSuccess: '#16A34A',
    chartWarning: '#D97706',
    chartDanger: '#DC2626',
    chartMuted: '#94A3B8',

    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    tabActive: '#0284C7',
    tabInactive: '#64748B',
  },
};

export type ThemeMode = 'light' | 'dark';
export type ColorPalette = typeof colors.dark;
