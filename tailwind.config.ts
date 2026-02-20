import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        deep: '#050a14',
        primary: '#0a1628',
        card: '#0d1f3c',
        'card-hover': '#112a4a',
        elevated: '#132f52',
        'accent-blue': '#38bdf8',
        'accent-cyan': '#22d3ee',
        'accent-red': '#f43f5e',
        'accent-orange': '#fb923c',
        'accent-yellow': '#facc15',
        'accent-green': '#4ade80',
        'accent-purple': '#a78bfa',
        'accent-pink': '#f472b6',
        'text-primary': '#e2e8f0',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
        'text-bright': '#f8fafc',
      },
      fontFamily: {
        sans: ['var(--font-dm)', 'DM Sans', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
        dm: ['var(--font-dm)', 'DM Sans', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      borderColor: {
        subtle: 'rgba(56, 189, 248, 0.08)',
        glow: 'rgba(56, 189, 248, 0.2)',
      },
    },
  },
  plugins: [],
};

export default config;
