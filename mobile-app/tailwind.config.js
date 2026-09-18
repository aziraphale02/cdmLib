/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#106A2E",
        secondary: "#0D7856",
        accent: "#F4D35E",
      },
    },
  },
  plugins: [],
}
