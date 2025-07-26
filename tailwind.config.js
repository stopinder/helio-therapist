module.exports = {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'celestial-dusk': '#16243B',   // Sidebar
        'midnight-blue': '#1F3159',    // Canvas
        'lavender-wash': '#C0B8FF',    // Accent
        'fog-white': '#EDEFF2',        // Primary text
        'slate-haze': '#A8AFBE',       // Secondary text
        'violet-glow': '#9CA1FF',      // Hover/CTA
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


