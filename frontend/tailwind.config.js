/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0efef',
          200: '#bbdae3',
          300: '#7ab7df',
          400: '#3491c7',
          500: '#0f71ad',
          600: '#0c5a88',
          700: '#0f4d69',
          800: '#124151',
          900: '#0b2531',
        }
      }
    },
  },
  plugins: [],
}
