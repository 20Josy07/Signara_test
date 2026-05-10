/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Signara palette (from brand reference)
        signara: {
          blue: '#1F40C2',       // primary deep blue
          sky: '#9DCDF7',        // light sky blue
          navy: '#1F2675',       // navy
          purple: '#7060A8',     // mid purple
          lilac: '#B5A3D2'       // soft lilac
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      backgroundImage: {
        'signara-gradient':
          'linear-gradient(135deg, #1F40C2 0%, #1F2675 35%, #7060A8 70%, #B5A3D2 100%)',
        'signara-gradient-soft':
          'linear-gradient(135deg, #9DCDF7 0%, #B5A3D2 100%)',
        'signara-text':
          'linear-gradient(90deg, #1F40C2 0%, #7060A8 100%)'
      },
      boxShadow: {
        soft: '0 10px 40px -10px rgba(31, 38, 117, 0.35)',
        glow: '0 0 60px -10px rgba(112, 96, 168, 0.5)'
      },
      borderRadius: {
        '4xl': '2rem'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(1.6)', opacity: '0' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'pulse-ring': 'pulse-ring 1.4s cubic-bezier(0.4,0,0.6,1) infinite',
        float: 'float 4s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
