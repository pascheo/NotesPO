import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f1115',
          raised: '#161922',
          card: '#1c202b',
          border: '#2a2f3c',
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
