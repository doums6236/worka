export const theme = {
  colors: {
    primary: '#1A6FFF',
    primaryDark: '#0038C4',
    primaryLight: '#4A90FF',
    bg: '#F4F7FF',
    bgLight: '#EEF3FF',
    surface: '#FFFFFF',
    text: '#111111',
    textSecondary: '#8A8A8A',
    textMuted: '#aaaaaa',
    border: '#E0E8FF',
    success: '#00C47C',
    warning: '#FFB800',
    danger: '#FF4040',
    premium: '#F5A623',
  },
  fonts: {
    light: 'Sora_300Light',
    regular: 'Sora_400Regular',
    medium: 'Sora_500Medium',
    semibold: 'Sora_600SemiBold',
    bold: 'Sora_700Bold',
    extrabold: 'Sora_800ExtraBold',
  },
  radius: { sm: 8, md: 14, lg: 18, xl: 28, full: 9999 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  durations: { fast: 150, base: 200, slow: 300 },
} as const;

export type Theme = typeof theme;
