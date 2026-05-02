/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
          light: '#EEF2FF',
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
