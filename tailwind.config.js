/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F1ECE0',
        ink: '#23201B',
        petrol: {
          DEFAULT: '#1E4D45',
          dark: '#163A34',
        },
        mustard: {
          DEFAULT: '#E7A929',
          dark: '#8A5F0E',
        },
        rust: {
          DEFAULT: '#C25B3C',
          dark: '#9C4327',
        },
        whatsapp: {
          DEFAULT: '#2F9E6E',
          dark: '#237A54',
        },
      },
      boxShadow: {
        card: '0 12px 32px -16px rgba(35, 32, 27, 0.28), 0 2px 6px -2px rgba(35, 32, 27, 0.08)',
        lift: '0 20px 40px -18px rgba(35, 32, 27, 0.38), 0 4px 10px -4px rgba(35, 32, 27, 0.1)',
        soft: '0 1px 2px rgba(35, 32, 27, 0.06), 0 4px 14px -6px rgba(35, 32, 27, 0.14)',
      },
      fontFamily: {
        display: ['Anton', 'Impact', 'sans-serif'],
        sans: ['"Work Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        stampIn: {
          '0%': { opacity: '0', transform: 'rotate(-12deg) scale(1.8)' },
          '60%': { opacity: '0.95', transform: 'rotate(-12deg) scale(0.94)' },
          '100%': { opacity: '0.92', transform: 'rotate(-12deg) scale(1)' },
        },
        sheetUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        stamp: 'stampIn 0.55s cubic-bezier(0.2, 0.7, 0.3, 1) 0.15s both',
        sheet: 'sheetUp 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        fade: 'fadeIn 0.25s ease-out both',
      },
    },
  },
  plugins: [],
};
