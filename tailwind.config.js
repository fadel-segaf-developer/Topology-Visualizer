/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './app/**/*.{js,jsx,ts,tsx}',
    './cli/**/*.{js,jsx,ts,tsx}',
    './agent/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  darkMode: 'class',
  plugins: [
    require('@tailwindcss/typography')
  ]
};
