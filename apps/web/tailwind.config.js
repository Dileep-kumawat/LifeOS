/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary monochrome scale
        canvas: '#FBFBFA',
        bone: '#F7F6F3',
        surface: '#FFFFFF',
        border: '#EAEAEA',
        muted: '#787774',
        charcoal: '#2F3437',
        ink: '#111111',

        // Muted pastel accents (semantic only)
        accent: {
          'red-bg': '#FDEBEC',
          'red-text': '#9F2F2D',
          'blue-bg': '#E1F3FE',
          'blue-text': '#1F6C9F',
          'green-bg': '#EDF3EC',
          'green-text': '#346538',
          'yellow-bg': '#FBF3DB',
          'yellow-text': '#956400',
        },

        // Legacy brand alias (keeps existing imports from breaking)
        brand: {
          50: '#F7F6F3',
          100: '#EAEAEA',
          200: '#D0CFCD',
          300: '#B0AFAC',
          400: '#787774',
          500: '#4A4845',
          600: '#2F3437',
          700: '#1E2224',
          800: '#161819',
          900: '#111111',
          950: '#0A0A0A',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'Helvetica Neue', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      letterSpacing: {
        editorial: '-0.03em',
        tight: '-0.02em',
      },
      lineHeight: {
        editorial: '1.1',
      },
      boxShadow: {
        'editorial': '0 2px 8px rgba(0,0,0,0.04)',
        'editorial-md': '0 4px 16px rgba(0,0,0,0.06)',
        // Keeping glow keys so old code doesn't error
        'glow': '0 0 0 rgba(0,0,0,0)',
        'glow-lg': '0 0 0 rgba(0,0,0,0)',
      },
      animation: {
        'reveal': 'reveal 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'reveal-delay-1': 'reveal 600ms cubic-bezier(0.16, 1, 0.3, 1) 80ms forwards',
        'reveal-delay-2': 'reveal 600ms cubic-bezier(0.16, 1, 0.3, 1) 160ms forwards',
        'reveal-delay-3': 'reveal 600ms cubic-bezier(0.16, 1, 0.3, 1) 240ms forwards',
      },
      keyframes: {
        reveal: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
