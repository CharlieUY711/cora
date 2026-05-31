/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        core: {
          bg: "#0a0a0a",
          border: "#1a1a1a",
          text: "#e5e5e5",
        }
      }
    },
  },
  plugins: [],
}
