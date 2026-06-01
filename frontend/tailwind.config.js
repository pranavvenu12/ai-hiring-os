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
          DEFAULT: '#2F5F8F',
          hover: '#244A73',
          light: '#F3F7FB',
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
