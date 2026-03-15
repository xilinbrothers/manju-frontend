/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sidebar-active': '#2563eb', // bg-blue-600
        'primary-blue': '#3B82F6',
        'secondary-orange': '#F97316',
        'dark-bg': '#0F172A',
        'card-bg': '#111827',
        'tg-blue': '#24A1DE',
        'success-green': '#00B127',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
