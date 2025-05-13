/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'theme': {
          'bg': '#000000',
          'surface': '#24283b',
          'border': '#2f334d',
          'text': '#a9b1d6',
          'muted': '#787c99',
        }
      },
    },
  },
  plugins: [],
} 