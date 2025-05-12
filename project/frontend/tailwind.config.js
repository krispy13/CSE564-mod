/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'montserrat': ['Montserrat', 'system-ui', 'sans-serif'],
        'dm-sans': ['DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} 