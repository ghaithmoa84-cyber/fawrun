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
          50: '#e6faf6',
          100: '#cbf5ee',
          200: '#99ebd9',
          300: '#66e0c5',
          400: '#33d6b0',
          500: '#00C1A7',
          600: '#00a892',
          700: '#008f7a',
          800: '#007563',
          900: '#005c4d',
        },
        primary: {
          DEFAULT: '#00C1A7',
          hover: '#00a892',
          dark: '#008f7a',
          light: '#e6faf6',
        },
      },
      fontFamily: {
        sans: ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
