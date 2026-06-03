/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1D1D1F',
          hover: '#000000',
          light: '#F5F5F7',
          accent: '#6E6E73',
        },
        bg: {
          main: '#F8FAFC',
          card: 'rgba(255, 255, 255, 0.8)',
        }
      },
      borderRadius: {
        'radius': '12px',
      }
    },
  },
  plugins: [],
}
