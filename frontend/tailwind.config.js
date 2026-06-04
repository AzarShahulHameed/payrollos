/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"',
          '"SF Pro Text"', '"Helvetica Neue"', 'Arial', 'sans-serif',
        ],
        mono: ['"SF Mono"', '"Fira Code"', 'monospace'],
      },
      colors: {
        // Apple iOS/macOS system grays
        apple: {
          50:  '#FAFAFA',
          100: '#F5F5F7',   // macOS background
          200: '#E8E8ED',   // separator
          300: '#D1D1D6',
          400: '#AEAEB2',   // tertiary label
          500: '#8E8E93',   // secondary label
          600: '#636366',   // label
          700: '#48484A',
          800: '#3A3A3C',
          900: '#1C1C1E',   // primary label
        },
        brand: {
          50:  '#EBF4FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',   // primary brand
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
      },
      borderRadius: {
        'sm':  '6px',
        DEFAULT: '10px',
        'md':  '10px',
        'lg':  '14px',
        'xl':  '20px',
        '2xl': '28px',
      },
      boxShadow: {
        'xs':  '0 1px 2px rgba(0,0,0,0.06)',
        'sm':  '0 1px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
        DEFAULT:'0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
        'md':  '0 4px 16px rgba(0,0,0,0.09), 0 2px 4px rgba(0,0,0,0.06)',
        'lg':  '0 8px 32px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)',
      },
      fontSize: {
        '2xs':  ['10px', { lineHeight: '14px' }],
        'xs':   ['12px', { lineHeight: '16px' }],
        'sm':   ['13px', { lineHeight: '18px' }],
        'base': ['15px', { lineHeight: '22px' }],
        'lg':   ['17px', { lineHeight: '24px' }],
        'xl':   ['20px', { lineHeight: '28px' }],
        '2xl':  ['24px', { lineHeight: '32px' }],
        '3xl':  ['28px', { lineHeight: '36px' }],
      },
    },
  },
  plugins: [],
};
