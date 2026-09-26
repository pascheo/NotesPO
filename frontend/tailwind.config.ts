import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1a1d24',
          raised: '#22262f',
          card: '#2a2f3a',
          border: '#3d4453',
        },
        equipe: {
          infrastructure: '#FF6B6B',
          developpement: '#4ECDC4',
          reseau: '#45B7D1',
          exploitation: '#FFA07A',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
