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
        gold: {
          50: '#FDF9F0',
          100: '#F9F1DC',
          200: '#F3E2B6',
          300: '#EACF8C',
          400: '#E1B85D',
          500: '#D8A64F', // Primary Honey Gold
          600: '#B6852F', // Dark Gold
          700: '#8F6321',
          800: '#6A471A',
          900: '#4A3113',
        },
        cream: {
          bg: '#F8F5EF',
          light: '#FCFBF8',
          soft: '#F3E7D0',
        },
        charcoal: {
          DEFAULT: '#2E2E2E',
          dark: '#1A1A1A',
          light: '#4A4A4A',
        }
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 25px rgba(216, 166, 79, 0.25)',
        'luxury': '0 10px 40px -10px rgba(46, 46, 46, 0.08)',
        'card-hover': '0 20px 40px -15px rgba(216, 166, 79, 0.2)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
