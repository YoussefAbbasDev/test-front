/** SEEDA design tokens live in src/styles/index.css as CSS variables; Tailwind maps to them so the brand can be
 *  re-themed from one place. */
const withVar = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: withVar('--brand-50'), 100: withVar('--brand-100'), 200: withVar('--brand-200'), 300: withVar('--brand-300'), 400: withVar('--brand-400'),
          500: withVar('--brand-500'), 600: withVar('--brand-600'), 700: withVar('--brand-700'), 800: withVar('--brand-800'), 900: withVar('--brand-900'),
        },
        navy: { 500: withVar('--navy-500'), 600: withVar('--navy-600'), 700: withVar('--navy-700'), 800: withVar('--navy-800'), 900: withVar('--navy-900') },
        surface: withVar('--surface'),
        canvas: withVar('--canvas'),
        line: withVar('--line'),
        ink: { DEFAULT: withVar('--ink'), soft: withVar('--ink-soft'), muted: withVar('--ink-muted') },
        success: withVar('--success'), warning: withVar('--warning'), danger: withVar('--danger'), info: withVar('--info'),
      },
      fontFamily: { sans: ['Poppins', 'Tajawal', 'system-ui', 'sans-serif'], arabic: ['Tajawal', 'Poppins', 'sans-serif'] },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
      boxShadow: { card: '0 1px 2px rgba(45,61,98,.04), 0 4px 16px rgba(45,61,98,.06)', pop: '0 12px 40px rgba(45,61,98,.16)' },
    },
  },
  plugins: [],
};
