import { type Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ffffff',
          100: '#fafafa',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#262626',
          800: '#171717',
          900: '#000000',
        },
        silver: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        status: {
          success: '#22c55e',
          warning: '#eab308',
          error: '#ef4444',
          successBg: '#14532d',
          warningBg: '#713f12',
          errorBg: '#7f1d1d',
        },
        glass: {
          white: 'rgba(255, 255, 255, 0.1)',
          black: 'rgba(0, 0, 0, 0.1)',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system', 
          'BlinkMacSystemFont', 
          '"Segoe UI"', 
          'Roboto', 
          'Helvetica', 
          'Arial', 
          'sans-serif'
        ],
        serif: [
          'Georgia', 
          'Cambria', 
          '"Times New Roman"', 
          'Times', 
          'serif'
        ],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      minWidth: {
        'sidebar': '280px',
      },
      maxWidth: {
        'sidebar': '280px',
      },
      height: {
        'player': '80px',
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
      },
      scale: {
        '102': '1.02',
        '98': '0.98',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
} satisfies Config