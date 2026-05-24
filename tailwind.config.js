/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        signara: {
          blue: '#1F40C2',
          sky: '#9DCDF7',
          navy: '#1F2675',
          purple: '#7060A8',
          lilac: '#B5A3D2',
        },
        palette: {
          pearl: '#EEEDF3',
          surface: '#FFFFFF',
          ink: '#161920',
          iris: '#934CFF',
          azure: '#2E7CF8',
          mist: '#77AAF9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      backgroundImage: {
        'signara-gradient':
          'linear-gradient(135deg, #1F40C2 0%, #1F2675 35%, #7060A8 70%, #B5A3D2 100%)',
        'signara-gradient-soft':
          'linear-gradient(135deg, #9DCDF7 0%, #B5A3D2 100%)',
        'signara-text':
          'linear-gradient(90deg, #1F40C2 0%, #7060A8 100%)',
        halo:
          'linear-gradient(135deg, #934CFF 0%, #2E7CF8 100%)',
      },
      boxShadow: {
        soft: '0 10px 40px -10px rgba(31, 38, 117, 0.35)',
        glow: '0 0 60px -10px rgba(112, 96, 168, 0.5)',
        halo: '0 8px 32px -4px rgba(147, 76, 255, 0.45)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.25', transform: 'scale(1)' },
          '50%': { opacity: '0.45', transform: 'scale(1.05)' },
        },
        'halo-shift': {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1) rotate(0deg)' },
          '50%': { opacity: '0.45', transform: 'scale(1.08) rotate(3deg)' },
        },
        'glow-drift-1': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(5%, 8%) scale(1.1)' },
        },
        'glow-drift-2': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-8%, 5%) scale(1.08)' },
        },
        'glow-drift-3': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(6%, -6%) scale(1.05)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s ease-out both',
        'pulse-ring': 'pulse-ring 1.4s cubic-bezier(0.4,0,0.6,1) infinite',
        float: 'float 5s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 4s ease-in-out infinite',
        'halo-shift': 'halo-shift 12s ease-in-out infinite',
        'glow-drift-1': 'glow-drift-1 20s ease-in-out infinite',
        'glow-drift-2': 'glow-drift-2 24s ease-in-out infinite',
        'glow-drift-3': 'glow-drift-3 18s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
