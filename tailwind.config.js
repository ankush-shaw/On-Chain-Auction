/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#eefbff',
          100: '#d9f5ff',
          200: '#b3ecff',
          300: '#7de0ff',
          400: '#3fcbff',
          500: '#14b1f5',
          600: '#0090d2',
          700: '#0072aa',
          800: '#065f8c',
          900: '#0a4f74',
          950: '#082f49',
        },
        cream: {
          50:  '#fefcf8',  /* cards / panels */
          100: '#faf6ef',  /* page background */
          200: '#f2ead9',  /* secondary areas */
          300: '#e8dbc5',  /* borders */
          400: '#d5c4a3',  /* muted borders */
        },
      },
    },
  },
  plugins: [],
};
