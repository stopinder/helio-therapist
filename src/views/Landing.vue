<template>
  <main class="min-h-screen bg-surface-canvas text-ink">
    <header class="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <router-link to="/" class="flex items-center gap-2.5" aria-label="Helios home">
        <svg class="h-9 w-9 text-brand-amber" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M9 31h30" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M15 31a9 9 0 0 1 18 0" stroke="currentColor" stroke-width="2"/>
          <path d="M24 8v7M9.5 14.5l5 5M38.5 14.5l-5 5M5 26h7M36 26h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span class="font-serif text-2xl font-semibold tracking-tight">Helios</span>
      </router-link>
      <nav class="hidden items-center gap-5 text-sm text-ink-muted lg:flex" aria-label="Landing page sections">
        <a href="#how-it-works" class="hover:text-ink">How it works</a>
        <a href="#workspace" class="hover:text-ink">Your workspace</a>
        <a href="#trust" class="hover:text-ink">Trust &amp; control</a>
        <a href="#for-therapists" class="hover:text-ink">For therapists</a>
      </nav>
      <nav class="flex items-center gap-2" aria-label="Account access">
        <router-link to="/sign-in" class="button-secondary">Sign in</router-link>
        <router-link to="/get-started" class="button-primary">Get started</router-link>
      </nav>
    </header>

    <section class="mx-auto grid w-full max-w-[1480px] gap-8 px-5 pb-14 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-10 lg:pb-16 xl:grid-cols-[1fr_1.05fr_.45fr] xl:gap-7 2xl:gap-9">
      <div class="max-w-xl xl:pl-6 2xl:pl-10">
        <p class="type-eyebrow text-action-link">Therapist workspace</p>
        <h1 class="mt-4 font-serif text-5xl font-semibold leading-[1.04] tracking-[-0.035em] text-ink sm:text-6xl">A calmer place for the work around therapy.</h1>
        <p class="mt-6 text-lg leading-8 text-ink-secondary">Helios brings appointments, client context, session preparation, working notes, Clinical Records and professional reflection into one focused workspace.</p>
        <div class="mt-8 flex flex-wrap gap-3">
          <router-link to="/get-started" class="button-primary">Get started</router-link>
          <a href="#how-it-works" class="button-secondary">See how it works</a>
        </div>
        <p class="mt-5 text-sm leading-6 text-ink-muted">Therapist judgement stays central. AI and transcript output remain assistive working material until you decide what to keep.</p>
      </div>

      <div class="relative" aria-label="Representative Helios practice workspace">
        <div class="absolute -inset-3 -z-10 rounded-[24px] bg-surface-muted/70 sm:-inset-4" aria-hidden="true"></div>
        <div class="surface-card overflow-hidden shadow-elevated">
          <div class="flex items-center justify-between border-b border-border-muted bg-surface-elevated px-4 py-3 sm:px-5">
            <div class="flex items-center gap-2">
              <svg class="h-5 w-5 text-brand-amber" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <path d="M10 31h28M15 31a9 9 0 0 1 18 0M24 10v6M11 18l4 4M37 18l-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span class="font-serif text-lg font-semibold">Helios</span>
            </div>
            <span class="rounded-pill bg-state-selected px-2.5 py-1 text-xs font-medium text-action-link">Practice overview</span>
          </div>

          <div class="grid min-h-[410px] grid-cols-[82px_1fr] sm:grid-cols-[104px_1fr] lg:grid-cols-[108px_1fr]">
            <div class="border-r border-border-muted bg-surface-muted p-3">
              <div class="space-y-1.5 text-[11px] leading-5 text-ink-muted">
                <div class="rounded-control bg-state-selected px-2 py-1.5 font-medium text-action-link">Overview</div>
                <div class="px-2 py-1">Calendar</div>
                <div class="px-2 py-1">Clients</div>
                <div class="px-2 py-1">Sessions</div>
                <div class="px-2 py-1">Documents</div>
                <div class="px-2 py-1">CPD</div>
              </div>
            </div>

            <div class="bg-surface px-4 py-4 sm:px-5 lg:px-5 lg:py-5">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="type-eyebrow text-ink-muted">Today</p>
                  <h2 class="mt-1 type-subsection text-ink">Your practice at a glance</h2>
                </div>
                <span class="hidden rounded-pill bg-brand-sage-soft px-3 py-1 text-[11px] font-medium text-action-link sm:inline-flex">Today</span>
              </div>

              <div class="mt-4 grid gap-3 lg:grid-cols-[1.35fr_.9fr]">
                <section class="space-y-2.5" aria-label="Today's schedule preview">
                  <div class="flex items-center justify-between"><p class="text-xs font-semibold text-ink">Today’s schedule</p><span class="text-[11px] text-action-link">View calendar →</span></div>
                  <div class="rounded-control border border-border-muted bg-surface-elevated p-3">
                    <div class="flex items-center gap-3">
                      <div class="w-12 shrink-0 border-r border-border-muted pr-3"><p class="text-xs font-semibold text-ink">09:00</p><p class="mt-1 text-[10px] text-ink-muted">Session</p></div>
                      <div class="min-w-0 flex-1"><p class="truncate text-xs font-medium text-ink">Client A</p><p class="mt-0.5 text-[11px] text-ink-muted">Preparation available</p></div>
                      <span class="hidden rounded-control border border-border px-2 py-1 text-[10px] font-medium text-ink-secondary sm:inline-flex">Open client</span>
                    </div>
                  </div>
                  <div class="rounded-control border border-action-primary/20 bg-state-selected/50 p-3">
                    <div class="flex items-center gap-3">
                      <div class="w-12 shrink-0 border-r border-border-muted pr-3"><p class="text-xs font-semibold text-ink">11:30</p><p class="mt-1 text-[10px] text-ink-muted">Session</p></div>
                      <div class="min-w-0 flex-1"><p class="truncate text-xs font-medium text-ink">Client B</p><p class="mt-0.5 text-[11px] text-ink-muted">Current focus close to hand</p></div>
                      <span class="hidden rounded-control bg-action-link px-2 py-1 text-[10px] font-medium text-on-action sm:inline-flex">Prepare</span>
                    </div>
                  </div>
                </section>

                <aside class="hidden space-y-3 lg:block" aria-label="Practice work preview">
                  <div>
                    <p class="text-[10px] font-semibold uppercase tracking-[.12em] text-ink-muted">Continue working</p>
                    <div class="mt-2 rounded-control border border-border-muted bg-surface-elevated p-3">
                      <p class="text-xs font-semibold text-ink">Session draft</p>
                      <p class="mt-1 text-[11px] leading-4 text-ink-muted">Editable until you decide it is ready.</p>
                    </div>
                  </div>
                  <div>
                    <p class="text-[10px] font-semibold uppercase tracking-[.12em] text-ink-muted">Next step</p>
                    <div class="mt-2 rounded-control border border-action-primary/10 bg-brand-sage-soft/55 p-3">
                      <p class="text-[11px] leading-4 text-ink-secondary">Review deliberately before approving a Clinical Record.</p>
                    </div>
                  </div>
                </aside>
              </div>

              <div class="mt-4 rounded-control border border-border-muted bg-surface-muted p-3 sm:p-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p class="text-[10px] font-semibold uppercase tracking-[.12em] text-ink-muted">Next client</p>
                    <p class="mt-1 text-xs font-semibold text-ink">Prepare with the context that matters</p>
                  </div>
                  <span class="rounded-pill bg-state-selected px-2.5 py-1 text-[10px] font-medium text-action-link">Before the session</span>
                </div>
                <div class="mt-3 grid gap-2 sm:grid-cols-3">
                  <div class="rounded-control bg-surface-elevated p-2.5"><p class="text-[10px] font-semibold text-ink">Current focus</p><p class="mt-1 text-[10px] leading-4 text-ink-muted">Relevant context nearby</p></div>
                  <div class="rounded-control bg-surface-elevated p-2.5"><p class="text-[10px] font-semibold text-ink">Recent development</p><p class="mt-1 text-[10px] leading-4 text-ink-muted">Clinically useful summary</p></div>
                  <div class="rounded-control bg-surface-elevated p-2.5"><p class="text-[10px] font-semibold text-ink">Preparation</p><p class="mt-1 text-[10px] leading-4 text-ink-muted">Outstanding work surfaced</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside class="surface-card p-5 sm:p-6 lg:col-start-2 xl:col-start-auto xl:self-center" aria-label="Why therapists investigate Helios">
        <p class="type-eyebrow text-action-link">Why Helios</p>
        <div class="mt-4 divide-y divide-border-muted">
          <div class="flex gap-3 pb-4">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-state-selected text-action-link" aria-hidden="true">↗</span>
            <div><h2 class="text-sm font-semibold text-ink">Your practice stays connected</h2><p class="mt-1 text-xs leading-5 text-ink-muted">Appointments, client context and preparation stay close together.</p></div>
          </div>
          <div class="flex gap-3 py-4">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-surface-muted text-action-link" aria-hidden="true">✓</span>
            <div><h2 class="text-sm font-semibold text-ink">Records are deliberate</h2><p class="mt-1 text-xs leading-5 text-ink-muted">Draft first; approve the Clinical Record only when you are ready.</p></div>
          </div>
          <div class="flex gap-3 pt-4">
            <span class="brand-accent-surface flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-brand-amber" aria-hidden="true">✦</span>
            <div><h2 class="text-sm font-semibold text-ink">You remain in control</h2><p class="mt-1 text-xs leading-5 text-ink-muted">AI assistance is therapist-triggered and always subject to your review.</p></div>
          </div>
        </div>
      </aside>
    </section>

    <section id="how-it-works" class="border-y border-border-muted bg-surface-elevated scroll-mt-6">
      <div class="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
        <div class="max-w-2xl">
          <p class="type-eyebrow text-action-link">How Helios fits around therapy</p>
          <h2 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">A workspace for the real flow of your practice.</h2>
        </div>
        <div class="mt-9 grid gap-4 lg:grid-cols-3">
          <article class="surface-card p-5 sm:p-6">
            <div class="flex items-center gap-3"><span class="brand-accent-surface flex h-9 w-9 items-center justify-center rounded-control text-brand-amber" aria-hidden="true">01</span><h3 class="type-subsection text-ink">Before the session</h3></div>
            <p class="mt-4 type-body text-ink-secondary">Review your day, client context, current focus and recent clinically useful developments. See what needs attention before the appointment.</p>
          </article>
          <article class="surface-card p-5 sm:p-6">
            <div class="flex items-center gap-3"><span class="flex h-9 w-9 items-center justify-center rounded-control bg-surface-muted text-action-link" aria-hidden="true">02</span><h3 class="type-subsection text-ink">Around the session</h3></div>
            <p class="mt-4 type-body text-ink-secondary">Write or dictate editable working material. Invoke transcript or AI assistance when useful, with the output remaining available for therapist review.</p>
          </article>
          <article class="surface-card p-5 sm:p-6">
            <div class="flex items-center gap-3"><span class="flex h-9 w-9 items-center justify-center rounded-control bg-state-selected text-action-link" aria-hidden="true">03</span><h3 class="type-subsection text-ink">After the session</h3></div>
            <p class="mt-4 type-body text-ink-secondary">Review the draft, approve a Clinical Record deliberately when ready, and keep professional reflection separate from the client record.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="workspace" class="mx-auto grid w-full max-w-6xl scroll-mt-6 gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[.72fr_1.25fr_.86fr] lg:items-center">
      <div>
        <p class="type-eyebrow text-action-link">Your workspace</p>
        <h2 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">A workspace that feels like yours.</h2>
        <p class="mt-4 type-body-long text-ink-secondary">Clients, appointments, drafts and approved records stay visible as distinct parts of the same practice rather than being flattened into one generic notes tool.</p>
      </div>

      <div class="surface-card overflow-hidden" aria-label="Representative client directory">
        <div class="flex items-center justify-between border-b border-border-muted px-5 py-4">
          <div><p class="type-eyebrow text-ink-muted">Clients</p><p class="mt-1 font-medium text-ink">Your client directory</p></div>
          <span class="rounded-control bg-action-link px-3 py-2 text-xs font-medium text-on-action">Add client</span>
        </div>
        <div class="divide-y divide-border-muted text-sm">
          <div class="grid grid-cols-[1fr_auto_auto] gap-4 bg-surface-muted px-5 py-2 text-xs text-ink-muted"><span>Client</span><span>Last session</span><span>Next session</span></div>
          <div class="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3"><span class="font-medium text-ink">Client A</span><span class="text-ink-muted">14 May</span><span class="text-ink-muted">21 May</span></div>
          <div class="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3"><span class="font-medium text-ink">Client B</span><span class="text-ink-muted">13 May</span><span class="text-ink-muted">20 May</span></div>
          <div class="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3"><span class="font-medium text-ink">Client C</span><span class="text-ink-muted">12 May</span><span class="text-ink-muted">—</span></div>
          <div class="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3"><span class="font-medium text-ink">Client D</span><span class="text-ink-muted">10 May</span><span class="text-ink-muted">19 May</span></div>
        </div>
      </div>

      <aside id="trust" class="surface-card scroll-mt-6 bg-state-selected p-5 sm:p-6" aria-label="Therapist control principles">
        <p class="type-subsection text-ink">Your judgement, always</p>
        <div class="mt-4 space-y-4">
          <div><h3 class="text-sm font-semibold text-ink">AI is assistive</h3><p class="mt-1 text-xs leading-5 text-ink-secondary">You choose when to use it and review what it produces.</p></div>
          <div><h3 class="text-sm font-semibold text-ink">Drafts stay editable</h3><p class="mt-1 text-xs leading-5 text-ink-secondary">Working notes are not Clinical Records until you approve them.</p></div>
          <div><h3 class="text-sm font-semibold text-ink">Clinical Records are deliberate</h3><p class="mt-1 text-xs leading-5 text-ink-secondary">Approved records are immutable; later corrections are append-only amendments.</p></div>
          <div><h3 class="text-sm font-semibold text-ink">Reflections stay separate</h3><p class="mt-1 text-xs leading-5 text-ink-secondary">Private professional reflection is not automatically part of a client record.</p></div>
        </div>
      </aside>
    </section>

    <section id="for-therapists" class="border-y border-border-muted bg-surface-muted scroll-mt-6">
      <div class="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <div class="grid gap-8 lg:grid-cols-[1fr_2fr] lg:items-center">
          <div>
            <p class="type-eyebrow text-action-link">Built for therapists</p>
            <h2 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink">Professional practice, not consumer wellness.</h2>
          </div>
          <div class="grid gap-6 sm:grid-cols-3">
            <div class="border-l border-border px-4"><p class="font-medium text-ink">For therapists</p><p class="mt-1 text-sm text-ink-muted">A professional workspace around clinical work.</p></div>
            <div class="border-l border-border px-4"><p class="font-medium text-ink">For your practice</p><p class="mt-1 text-sm text-ink-muted">Appointments, clients and records stay connected.</p></div>
            <div class="border-l border-border px-4"><p class="font-medium text-ink">For considered work</p><p class="mt-1 text-sm text-ink-muted">Assistive technology without handing over judgement.</p></div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
      <div class="surface-card grid gap-6 px-6 py-7 sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div>
          <p class="font-serif text-2xl font-semibold text-ink">Ready to see more?</p>
          <p class="mt-1 type-body text-ink-secondary">Create your workspace and explore Helios for yourself.</p>
        </div>
        <svg class="hidden h-11 w-11 text-brand-amber lg:block" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M9 31h30M15 31a9 9 0 0 1 18 0M24 8v7M9.5 14.5l5 5M38.5 14.5l-5 5M5 26h7M36 26h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <div class="flex flex-wrap gap-3 lg:justify-end">
          <router-link to="/get-started" class="button-primary">Get started</router-link>
          <router-link to="/sign-in" class="button-secondary">Sign in</router-link>
        </div>
      </div>
    </section>

    <footer class="border-t border-border-muted">
      <nav class="mx-auto flex w-full max-w-6xl flex-wrap gap-x-5 gap-y-2 px-5 py-6 text-sm text-ink-secondary sm:px-8" aria-label="Legal and support">
        <router-link to="/terms" class="hover:text-ink">Terms</router-link>
        <router-link to="/privacy" class="hover:text-ink">Privacy</router-link>
        <router-link to="/ai-data" class="hover:text-ink">AI &amp; data</router-link>
        <router-link to="/cookies" class="hover:text-ink">Cookies</router-link>
        <router-link to="/support" class="hover:text-ink">Support</router-link>
      </nav>
    </footer>
  </main>
</template>