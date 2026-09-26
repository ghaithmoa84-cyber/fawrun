/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#E8F8F7',
          100: '#C5EDE9',
          200: '#A0E1DB',
          300: '#7DDDD4',
          400: '#5CCFC5',
          500: '#3ABFB5',
          600: '#2A9E95',
          700: '#1E7A72',
          800: '#135550',
          900: '#0A302D',
        },
        primary: {
          DEFAULT: '#7DDDD4',
          hover: '#5CCFC5',
          dark: '#3ABFB5',
          light: '#E8F8F7',
        },
        secondary: {
          DEFAULT: '#1E3A5F',
          hover: '#2A4E7C',
          dark: '#0F2040',
        },
      },
      fontFamily: {
        sans: ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
