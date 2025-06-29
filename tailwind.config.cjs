/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5865f2',
          hover: '#4f5cda',
          light: '#a5b4fc',
          dark: '#3730a3',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}