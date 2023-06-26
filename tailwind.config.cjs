/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Rubik", ...defaultTheme.fontFamily.sans],
        'display': ['Bungee', ...defaultTheme.fontFamily.sans],
        'emphatic': ['Bungee Shade', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}
