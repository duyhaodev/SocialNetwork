/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Vì app bạn dùng dark mode
  theme: {
    extend: {
      colors: {
        background: 'hsl(0 0% 0%)',
        foreground: 'hsl(0 0% 100%)',
        muted: {
          DEFAULT: 'hsl(0 0% 10%)',
          foreground: 'hsl(0 0% 60%)',
        },
        border: 'hsl(0 0% 15%)',
      },
    },
  },
  plugins: [],
}