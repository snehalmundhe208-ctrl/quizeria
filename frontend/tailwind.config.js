/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#ffffff', // white text highlights
          100: '#0f172a', // dark text (was light slate)
          200: '#1e293b', // titles
          300: '#334155', // body text
          400: '#475569', // subtext
          500: '#64748b', // icons/muted
          600: '#94a3b8',
          700: '#cbd5e1',
          800: '#e2e8f0', // borders
          850: '#f1f5f9', // light card highlight
          900: '#ffffff', // card backgrounds
          950: '#f8fafc', // main container bg
        },
        indigo: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#6366f1',
          400: '#4f46e5',
          500: '#4338ca',
          600: '#3730a3',
          700: '#312e81',
          950: '#eef2ff',
        },
        emerald: {
          50: '#ecfdf5',
          400: '#059669',
          950: '#ecfdf5',
          900: '#d1fae5',
        },
        red: {
          50: '#fef2f2',
          400: '#dc2626',
          950: '#fef2f2',
          900: '#fee2e2',
        },
        amber: {
          50: '#fffbeb',
          400: '#d97706',
          950: '#fffbeb',
          900: '#fef3c7',
        },
        blue: {
          50: '#eff6ff',
          400: '#2563eb',
          950: '#eff6ff',
          900: '#dbeafe',
        }
      }
    },
  },
  plugins: [],
}
