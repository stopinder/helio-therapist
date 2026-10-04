// Keep semantic colours usable with Tailwind opacity modifiers (e.g. surface/80).
const semanticColor = (token) => ({ opacityValue }) => opacityValue === undefined || Number(opacityValue) === 1
  ? `var(${token})`
  : `color-mix(in srgb, var(${token}) calc(${opacityValue} * 100%), transparent)`

module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'surface-canvas': semanticColor('--surface-canvas'), surface: semanticColor('--surface'), 'surface-raised': semanticColor('--surface-raised'), 'surface-muted': semanticColor('--surface-muted'), 'surface-subtle': semanticColor('--surface-subtle'), 'surface-elevated': semanticColor('--surface-elevated'), 'surface-overlay': semanticColor('--surface-overlay'),
        text: semanticColor('--text-primary'), ink: semanticColor('--text-primary'), 'text-muted': semanticColor('--text-muted'), 'ink-secondary': semanticColor('--text-secondary'), 'ink-muted': semanticColor('--text-muted'), 'ink-subtle': semanticColor('--text-subtle'), 'on-action': semanticColor('--text-on-action'),
        accent: semanticColor('--accent'), 'accent-hover': semanticColor('--accent-hover'), focus: semanticColor('--focus'), 'action-primary': semanticColor('--action-primary'), 'action-primary-hover': semanticColor('--action-primary-hover'), 'action-link': semanticColor('--action-link'), 'action-link-hover': semanticColor('--action-link-hover'),
        border: semanticColor('--border'), 'border-muted': semanticColor('--border-muted'), 'border-strong': semanticColor('--border-strong'),
        success: semanticColor('--state-success'), warning: semanticColor('--state-warning'), danger: semanticColor('--state-danger'), 'state-hover': semanticColor('--state-hover'), 'state-active': semanticColor('--state-active'), 'state-selected': semanticColor('--state-selected'), 'state-focus-ring': semanticColor('--state-focus-ring'), 'state-disabled': semanticColor('--state-disabled'), 'state-loading': semanticColor('--state-loading'), 'state-success': semanticColor('--state-success'), 'state-warning': semanticColor('--state-warning'), 'state-danger': semanticColor('--state-danger'), 'state-recording': semanticColor('--state-recording'), 'state-ai-working': semanticColor('--state-ai-working'), 'state-success-surface': semanticColor('--state-success-surface'), 'state-warning-surface': semanticColor('--state-warning-surface'), 'state-danger-surface': semanticColor('--state-danger-surface'),
        'surface-warm': semanticColor('--surface-warm'), 'surface-warm-muted': semanticColor('--surface-warm-muted'), 'surface-green': semanticColor('--surface-green'), 'surface-teal': semanticColor('--surface-teal'), 'surface-sage': semanticColor('--surface-sage'), 'surface-cream': semanticColor('--surface-cream'), 'accent-bronze': semanticColor('--accent-bronze'), 'accent-bronze-secondary': semanticColor('--accent-bronze-secondary'),
        'surface-reflection': semanticColor('--surface-reflection'), reflection: semanticColor('--surface-reflection'), 'reflection-hover': semanticColor('--surface-reflection-hover'), 'border-reflection': semanticColor('--border-reflection'), 'border-reflection-tag': semanticColor('--border-reflection-tag'), 'state-reflection-focus': semanticColor('--state-reflection-focus'),
        sidebar: semanticColor('--surface-sidebar'),
        'sidebar-fg': semanticColor('--sidebar-foreground'),
        'sidebar-muted': semanticColor('--sidebar-muted'),
        'sidebar-border': semanticColor('--sidebar-border'),
        'sidebar-hover': semanticColor('--sidebar-hover'),
        'sidebar-active': semanticColor('--sidebar-active'),
        avatar: semanticColor('--surface-avatar'), backdrop: semanticColor('--surface-backdrop'), 'brand-amber': semanticColor('--brand-amber'), 'brand-amber-soft': semanticColor('--brand-amber-soft'), 'brand-sage-soft': semanticColor('--brand-sage-soft'),
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
