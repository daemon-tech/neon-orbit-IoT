/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tech: {
          bg: '#050810',
          panel: '#0a1410',
          border: '#1a3a2e',
          primary: '#4ade80',
          secondary: '#60a5fa',
          accent: '#4ade80',
          warning: '#ff6b35',
          error: '#ff6b35',
          text: '#d1fae5',
          'text-muted': '#64748b',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Fira Code', 'Consolas', 'Monaco', 'monospace'],
      },
    },
  },
  plugins: [],
}

