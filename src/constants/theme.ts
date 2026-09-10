/**
 * Learnly Tactile Modern Ed-Tech Design System Tokens
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A',
    textSecondary: '#334155',
    background: '#F8FAFC',
    surface: '#F1F5F9',
    card: '#FFFFFF',
    backgroundElement: '#F1F5F9',
    backgroundSelected: '#EDE9FE',
    primary: '#4F46E5',
    primaryDark: '#4338CA',
    secondary: '#8B5CF6',
    secondaryWash: '#EDE9FE',
    xp: '#F59E0B',
    xpWash: '#FEF3C7',
    success: '#10B981',
    successWash: '#D1FAE5',
    retry: '#F43F5E',
    retryWash: '#FFE4E6',
    border: '#E2E8F0',
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    background: '#0F172A',
    surface: '#1E293B',
    card: '#1E293B',
    backgroundElement: '#1E293B',
    backgroundSelected: '#312E81',
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    secondary: '#A78BFA',
    secondaryWash: '#2E1065',
    xp: '#F59E0B',
    xpWash: '#451A03',
    success: '#10B981',
    successWash: '#064E3B',
    retry: '#F43F5E',
    retryWash: '#4C0519',
    border: '#334155',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'Lexend, sans-serif',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
