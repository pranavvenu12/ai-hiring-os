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
          DEFAULT: '#3F6F99',
          hover: '#355D80',
          light: '#F5F8FB',
          accent: '#3F9292',
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
