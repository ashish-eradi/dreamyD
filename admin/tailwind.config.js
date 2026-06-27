/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f5f0ff',
          100: '#ede5ff',
          200: '#d8ccff',
          300: '#b89fff',
          400: '#9370f8',
          500: '#7b5ea7',
          600: '#6a4d95',
          700: '#5a3e7e',
          800: '#4a3168',
          900: '#3a2552',
        },
      },
    },
  },
  plugins: [],
};
