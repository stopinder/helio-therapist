module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'surface-canvas': 'var(--surface-canvas)', surface: 'var(--surface)', 'surface-raised': 'var(--surface-raised)', 'surface-muted': 'var(--surface-muted)', 'surface-subtle': 'var(--surface-subtle)', 'surface-elevated': 'var(--surface-elevated)', 'surface-overlay': 'var(--surface-overlay)',
        text: 'var(--text-primary)', ink: 'var(--text-primary)', 'text-muted': 'var(--text-muted)', 'ink-secondary': 'var(--text-secondary)', 'ink-muted': 'var(--text-muted)', 'ink-subtle': 'var(--text-subtle)', 'on-action': 'var(--text-on-action)',
        accent: 'var(--accent)', 'accent-hover': 'var(--accent-hover)', focus: 'var(--focus)', 'action-primary': 'var(--action-primary)', 'action-primary-hover': 'var(--action-primary-hover)', 'action-link': 'var(--action-link)', 'action-link-hover': 'var(--action-link-hover)',
        border: 'var(--border)', 'border-muted': 'var(--border-muted)', 'border-strong': 'var(--border-strong)',
        success: 'var(--state-success)', warning: 'var(--state-warning)', danger: 'var(--state-danger)', 'state-hover': 'var(--state-hover)', 'state-active': 'var(--state-active)', 'state-selected': 'var(--state-selected)', 'state-focus-ring': 'var(--state-focus-ring)', 'state-disabled': 'var(--state-disabled)', 'state-loading': 'var(--state-loading)', 'state-success': 'var(--state-success)', 'state-warning': 'var(--state-warning)', 'state-danger': 'var(--state-danger)', 'state-recording': 'var(--state-recording)', 'state-ai-working': 'var(--state-ai-working)', 'state-success-surface': 'var(--state-success-surface)', 'state-warning-surface': 'var(--state-warning-surface)', 'state-danger-surface': 'var(--state-danger-surface)',
        reflection: 'var(--surface-reflection)', 'reflection-hover': 'var(--surface-reflection-hover)', 'border-reflection': 'var(--border-reflection)', 'border-reflection-tag': 'var(--border-reflection-tag)', 'state-reflection-focus': 'var(--state-reflection-focus)',
        sidebar: 'var(--surface-sidebar)', avatar: 'var(--surface-avatar)', backdrop: 'var(--surface-backdrop)', 'brand-amber': 'var(--brand-amber)', 'brand-amber-soft': 'var(--brand-amber-soft)', 'brand-sage-soft': 'var(--brand-sage-soft)',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], serif: ['Newsreader', 'Georgia', 'serif'] },
      fontSize: {
        display: ['2.625rem', { lineHeight: '2.9rem', letterSpacing: '-0.035em' }], h1: ['2rem', { lineHeight: '2.35rem', letterSpacing: '-0.025em' }], h2: ['1.375rem', { lineHeight: '1.8rem', letterSpacing: '-0.015em' }], h3: ['1.0625rem', { lineHeight: '1.5rem' }], body: ['0.9375rem', { lineHeight: '1.55rem' }], 'body-long': ['1rem', { lineHeight: '1.8rem' }], 'body-sm': ['0.8125rem', { lineHeight: '1.3rem' }], caption: ['0.75rem', { lineHeight: '1.05rem' }], overline: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.11em' }],
      },
      minWidth: { 'calendar-grid': '800px' },
      spacing: { 'inline-xs': 'var(--space-inline-xs)', 'inline-sm': 'var(--space-inline-sm)', 'inline-md': 'var(--space-inline-md)', 'inline-lg': 'var(--space-inline-lg)', 'stack-xs': 'var(--space-stack-xs)', 'stack-sm': 'var(--space-stack-sm)', 'stack-md': 'var(--space-stack-md)', 'stack-lg': 'var(--space-stack-lg)', 'stack-xl': 'var(--space-stack-xl)', 'stack-2xl': 'var(--space-stack-2xl)', section: 'var(--space-section)', page: 'var(--space-page)' },
      boxShadow: { elevated: 'var(--shadow-elevated)', overlay: 'var(--shadow-overlay)' }, borderRadius: { control: 'var(--radius-control)', panel: 'var(--radius-panel)', pill: 'var(--radius-pill)' }, minHeight: { touch: 'var(--control-target)' }, backdropBlur: { soft: '2px' }, transitionDuration: { fast: 'var(--motion-fast)', standard: 'var(--motion-standard)', slow: 'var(--motion-slow)' },
    },
  },
  plugins: [],
}
