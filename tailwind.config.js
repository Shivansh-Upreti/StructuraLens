/** @type {import('tailwindcss').Config} */

/* StructuraLens palette. One accent, neutrals, one error colour. Nothing else.
     canvas  #0A0A0A   panel  #121212 / #171717   border  #27272A
     accent  #22D3EE   done   #27272A border + #A1A1AA text
     text    #E4E4E7   muted  #71717A             error   #EF4444
   Legacy colour families used across older components are folded onto these
   scales here, so a stray `violet-500` or `amber-400` can never reintroduce a
   rainbow: every hue below resolves to accent, neutral or error. */
const accent = { 50: '#ECFEFF', 100: '#CFFAFE', 200: '#A5F3FC', 300: '#67E8F9', 400: '#22D3EE', 500: '#22D3EE', 600: '#0891B2', 700: '#0E7490', 800: '#155E75', 900: '#164E63', 950: '#083344' };
// "Attention" without hue: what used to be amber/orange highlights becomes bright neutral.
const attention = { 50: '#FAFAFA', 100: '#F4F4F5', 200: '#E4E4E7', 300: '#E4E4E7', 400: '#D4D4D8', 500: '#A1A1AA', 600: '#71717A', 700: '#52525B', 800: '#3F3F46', 900: '#27272A', 950: '#171717' };
const error = { 50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 300: '#FCA5A5', 400: '#EF4444', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C', 800: '#991B1B', 900: '#7F1D1D', 950: '#450A0A' };
const zinc = { 50: '#FAFAFA', 100: '#F4F4F5', 200: '#E4E4E7', 300: '#D4D4D8', 400: '#A1A1AA', 500: '#71717A', 600: '#52525B', 700: '#3F3F46', 800: '#27272A', 900: '#171717', 950: '#121212' };
const sharp = '2px';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    // Sharp corners everywhere: every radius utility (including `rounded-full`) resolves to 0-2px.
    borderRadius: { none: '0', sm: sharp, DEFAULT: sharp, md: sharp, lg: sharp, xl: sharp, '2xl': sharp, '3xl': sharp, full: sharp },
    // No elevation: depth comes from the panel tone and the 1px border, never from shadows.
    boxShadow: { none: 'none', sm: 'none', DEFAULT: 'none', md: 'none', lg: 'none', xl: 'none', '2xl': 'none', inner: 'none' },
    extend: {
      fontFamily: {
        sans: ['Inter', 'Geist', '"Geist Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Geist Mono"', '"Fira Code"', 'ui-monospace', '"Cascadia Code"', 'Consolas', 'Menlo', 'monospace'],
      },
      colors: {
        // Semantic tokens: prefer these in new code.
        canvas: '#0A0A0A',
        panel: { DEFAULT: '#121212', 2: '#171717' },
        line: '#27272A',
        accent: { DEFAULT: '#22D3EE', ...accent },
        fg: { DEFAULT: '#E4E4E7', muted: '#71717A', done: '#A1A1AA' },
        danger: '#EF4444',
        black: '#0A0A0A',
        zinc,
        // Legacy families -> palette.
        green: accent, emerald: accent, teal: accent, cyan: accent, sky: accent, blue: accent, indigo: accent, violet: accent, purple: accent, fuchsia: accent, pink: accent, lime: accent,
        amber: attention, yellow: attention, orange: attention,
        red: error, rose: error,
      },
      keyframes: { shimmer: { '0%, 100%': { opacity: '0.45' }, '50%': { opacity: '0.8' } } },
      animation: { skeleton: 'shimmer 1.4s ease-in-out infinite' },
    },
  },
  plugins: [],
};
