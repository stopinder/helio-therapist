module.exports = {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic surface hierarchy. Source values live in main.css so the
        // same layers are available to component CSS and Tailwind utilities.
        'surface-canvas': 'var(--surface-canvas)',
        surface: 'var(--surface)',
        'surface-muted': 'var(--surface-muted)',
        'surface-subtle': 'var(--surface-subtle)',
        'surface-elevated': 'var(--surface-elevated)',
        'surface-overlay': 'var(--surface-overlay)',
        border: 'var(--border)',
        'border-muted': 'var(--border-muted)',
        'border-strong': 'var(--border-strong)',
        'state-hover': 'var(--state-hover)',
        'state-active': 'var(--state-active)',
        'state-selected': 'var(--state-selected)',
        'state-focus-ring': 'var(--state-focus-ring)',
        'state-disabled': 'var(--state-disabled)',
        'state-loading': 'var(--state-loading)',
        'state-success': 'var(--state-success)',
        'state-warning': 'var(--state-warning)',
        'state-danger': 'var(--state-danger)',
        'state-recording': 'var(--state-recording)',
        'state-ai-working': 'var(--state-ai-working)',
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
      spacing: {
        // Semantic spacing aliases. Values remain defined in main.css so CSS
        // variables are the source of truth across Tailwind and component CSS.
        'inline-xs': 'var(--space-inline-xs)',
        'inline-sm': 'var(--space-inline-sm)',
        'inline-md': 'var(--space-inline-md)',
        'inline-lg': 'var(--space-inline-lg)',
        'stack-xs': 'var(--space-stack-xs)',
        'stack-sm': 'var(--space-stack-sm)',
        'stack-md': 'var(--space-stack-md)',
        'stack-lg': 'var(--space-stack-lg)',
        'stack-xl': 'var(--space-stack-xl)',
        'stack-2xl': 'var(--space-stack-2xl)',
        section: 'var(--space-section)',
        page: 'var(--space-page)',
      },
      boxShadow: {
        elevated: 'var(--shadow-elevated)',
        overlay: 'var(--shadow-overlay)',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        standard: 'var(--motion-standard)',
        slow: 'var(--motion-slow)',
      },
    },
  },
  plugins: [],
}
