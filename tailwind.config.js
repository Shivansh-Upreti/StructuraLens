/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Developer-tool typography: a clean grotesque for UI and headings, a strict monospace for metrics, counters and tags.
      // System stacks only (no webfont download, so the strict CSP and offline use keep working); Inter / Geist /
      // JetBrains Mono are used automatically when installed.
      fontFamily: {
        sans: ['Inter', 'Geist', '"Geist Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Geist Mono"', '"Fira Code"', 'ui-monospace', '"Cascadia Code"', 'Consolas', 'Menlo', 'monospace'],
      },
      // Palette: neutral greys (Tailwind zinc/slate defaults) plus ONE sharp accent. Components reach for `green` by habit,
      // so remapping that single scale to emerald re-themes every active state, link and focus ring at once.
      colors: {
        green: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' },
      },
    },
  },
  plugins: [],
};
