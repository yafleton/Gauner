/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0f1419',
        'dark-card': '#1a1f2e',
        'dark-sidebar': '#161b22',
        'accent-purple': '#8b5cf6',
        'accent-blue': '#3b82f6',
        'text-primary': '#ffffff',
        'text-secondary': '#9ca3af',
        'border-dark': '#374151',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
