/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' }
        }
      },
      animation: {
        'fade-out': 'fade-out 500s ease-in-out forwards',
      },
    },
  },
  plugins: [],
};

