/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        secondary: '#1a1a1a',
        accent: '#3a3a3a',
      },
      animation: {
        'spin-reverse': 'spin 1s linear infinite reverse',
        'record-peek-out': 'recordPeekOut 0.2s ease-out',
        'record-peek-in': 'recordPeekIn 0.2s ease-out',
        'record-rock': 'recordRock 8.4s ease-in-out infinite',
      },
      keyframes: {
        recordPeekOut: {
          '0%': { transform: 'translateX(0) rotate(0deg)' },
          '100%': { transform: 'translateX(50%) rotate(12deg)' },
        },
        recordPeekIn: {
          '0%': { transform: 'translateX(50%) rotate(12deg)' },
          '100%': { transform: 'translateX(0) rotate(0deg)' },
        },
        recordRock: {
          '0%': { transform: 'rotate(-45deg)' },
          '50%': { transform: 'rotate(45deg)' },
          '100%': { transform: 'rotate(-45deg)' },
        },
      },
    },
  },
  plugins: [],
}
