/**
 * Worka design tokens. Inspired by the Facebook-style flat blue UI but
 * with the brand's lighter cyan-leaning blue from the official logo.
 */
export const theme = {
  colors: {
    // Brand blues
    primary: '#1A91FF', // logo blue (cyan-leaning, like the 'a' bloc)
    primaryDark: '#0966C7',
    primaryLight: '#4FB0FF',
    fbBlue: '#1877F2', // Facebook blue (used for some accents like primary CTAs)

    // Surfaces
    bg: '#F0F2F5', // Facebook-like off-white background
    bgLight: '#E7F3FF', // for highlighted blocks (selected card, etc.)
    surface: '#FFFFFF',
    surfaceMuted: '#F5F6F7',

    // Text
    text: '#050505',
    textSecondary: '#65676B',
    textMuted: '#8A8D91',

    // Lines
    border: '#DDDFE2',
    divider: '#CED0D4',

    // Semantic
    success: '#00C47C',
    warning: '#FFB800',
    danger: '#E41E3F',
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
  radius: { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  durations: { fast: 150, base: 200, slow: 300 },
} as const;

export type Theme = typeof theme;
