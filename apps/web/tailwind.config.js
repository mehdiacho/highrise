/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Premium-dark table + glass panels
        table: {
          950: '#080b16',
          900: '#0b0f1c',
          800: '#111726',
          700: '#1a2138',
          600: '#2a3352',
        },
        ink: {
          DEFAULT: '#e6ebf7',
          muted: '#8a93ad',
          faint: '#5b6480',
        },
        accent: {
          DEFAULT: '#4f7cff',
          bright: '#6b93ff',
          deep: '#3a5cd0',
        },
        gold: '#f5c542',
        cash: '#3fbf6f',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"Space Grotesk"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(79,124,255,0.55)',
        'glow-sm': '0 0 12px rgba(79,124,255,0.45)',
        'glow-gold': '0 0 18px rgba(245,197,66,0.5)',
        panel: '0 10px 40px rgba(0,0,0,0.5)',
        tile: '0 2px 6px rgba(0,0,0,0.45)',
      },
      keyframes: {
        'dice-tumble': {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '25%': { transform: 'rotate(-18deg) scale(1.12)' },
          '50%': { transform: 'rotate(14deg) scale(1.05)' },
          '75%': { transform: 'rotate(-8deg) scale(1.1)' },
          '100%': { transform: 'rotate(0deg) scale(1)' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(79,124,255,0.55)' },
          '70%': { boxShadow: '0 0 0 10px rgba(79,124,255,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(79,124,255,0)' },
        },
        'rise': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        // Ticker: fade up brightly, hold, then rest at a dim readable level.
        'ticker': {
          '0%': { transform: 'translateY(6px)', opacity: '0' },
          '12%': { transform: 'translateY(0)', opacity: '1' },
          '70%': { opacity: '1' },
          '100%': { opacity: '0.45' },
        },
      },
      animation: {
        'dice-tumble': 'dice-tumble 0.5s ease-in-out',
        'pop-in': 'pop-in 0.28s ease-out',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
        'rise': 'rise 0.25s ease-out',
        'ticker': 'ticker 4.5s ease-out forwards',
      },
    },
  },
  plugins: [],
};
