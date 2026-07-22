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
      fontSize: {
        // Semantic scale. Components should use the `type-*` classes in
        // main.css, rather than choosing an arbitrary pixel value.
        display: ['2.25rem', { lineHeight: '2.625rem', letterSpacing: '-0.03em' }],
        h1: ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.02em' }],
        h2: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        h3: ['1.0625rem', { lineHeight: '1.5rem' }],
        body: ['0.9375rem', { lineHeight: '1.5rem' }],
        'body-long': ['1rem', { lineHeight: '1.75rem' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.25rem' }],
        caption: ['0.75rem', { lineHeight: '1rem' }],
        overline: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
      },
    },
  },
  plugins: [],
}

