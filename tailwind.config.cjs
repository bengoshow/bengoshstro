/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'theme-light': 'hsl(50deg 84% 90%)',
        'theme-dark': 'hsl(240deg 100% 13%)',
        'theme-yellow': 'hsl(55deg 100% 50%)',
      },
      fontFamily: {
        sans: ["Rubik", ...defaultTheme.fontFamily.sans],
        'display': ['Bungee', ...defaultTheme.fontFamily.sans],
        'emphatic': ['Bungee Shade', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}
