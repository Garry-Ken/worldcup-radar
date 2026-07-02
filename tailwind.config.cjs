/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text',
          'PingFang SC', 'Helvetica Neue', 'system-ui', 'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
