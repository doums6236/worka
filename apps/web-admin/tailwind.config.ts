import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Worka palette (aligné avec le mobile)
        primary: {
          DEFAULT: '#1A91FF',
          dark: '#0966C7',
          light: '#4FB0FF',
        },
        fb: '#1877F2',
        ink: {
          DEFAULT: '#050505',
          secondary: '#65676B',
          muted: '#8A8D91',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F5F6F7',
          bg: '#F0F2F5',
          bgLight: '#E7F3FF',
        },
        line: {
          DEFAULT: '#DDDFE2',
          strong: '#CED0D4',
        },
        success: '#00C47C',
        warning: '#FFB800',
        danger: '#E41E3F',
        premium: '#F5A623',
      },
      fontFamily: {
        sans: ['var(--font-sora)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
