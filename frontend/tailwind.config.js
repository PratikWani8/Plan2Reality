/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          50: '#FDFDFC',
          100: '#FAF8F5',
          200: '#F4EFEA',
          300: '#EAE2D8',
          400: '#DCD3C6',
        },
        forest: {
          50: '#F2F6F4',
          100: '#E1EBE6',
          200: '#C2D6CD',
          300: '#9DBEB0',
          400: '#6E9C88',
          500: '#467A65',
          600: '#34604F',
          700: '#2A4D3F',
          800: '#1E372D',
          900: '#13241E',
          950: '#0B1511',
        },
        sage: {
          50: '#F4F7F5',
          100: '#E5EBE7',
          200: '#CAD6CE',
          300: '#A9BDB0',
          400: '#84A18F',
          500: '#648571',
          600: '#4D6857',
          700: '#3D5245',
          800: '#324138',
          900: '#2A362F',
        },
        stone: {
          100: '#F5F4F0',
          200: '#E8E6DF',
          300: '#D5D2C7',
          400: '#B8B3A4',
          500: '#948E7E',
          600: '#736E60',
          700: '#555146',
          800: '#3D3A32',
          900: '#23221C',
        },
        charcoal: {
          50: '#F6F6F6',
          100: '#E7E7E7',
          200: '#D1D1D1',
          300: '#B0B0B0',
          400: '#888888',
          500: '#6D6D6D',
          600: '#5D5D5D',
          700: '#4F4F4F',
          800: '#2B2C2B',
          900: '#1A1C1A',
          950: '#111311',
        },
        terracotta: {
          DEFAULT: '#C27D56',
          hover: '#AD6B46',
          light: '#F8EFEA',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        'subtle': '0 2px 10px rgba(19, 36, 30, 0.04)',
        'elevated': '0 12px 30px -8px rgba(19, 36, 30, 0.08)',
        'card': '0 4px 20px -2px rgba(19, 36, 30, 0.05)',
        'card-hover': '0 20px 35px -10px rgba(19, 36, 30, 0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
