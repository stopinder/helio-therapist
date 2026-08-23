<template>
  <main class="min-h-screen bg-surface-canvas text-ink">
    <header class="border-b border-border-muted bg-surface-canvas">
      <div class="mx-auto flex w-full max-w-[1440px] items-center justify-between px-8 py-4 xl:px-12">
        <router-link to="/" class="flex items-center gap-3" aria-label="Helios home">
          <svg class="h-9 w-9 text-brand-amber" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M9 31h30" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M15 31a9 9 0 0 1 18 0" stroke="currentColor" stroke-width="2"/>
            <path d="M24 8v7M9.5 14.5l5 5M38.5 14.5l-5 5M5 26h7M36 26h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span class="text-xl font-semibold tracking-[-0.02em]">Helios</span>
        </router-link>

        <nav class="hidden items-center gap-7 text-sm font-medium text-ink-secondary lg:flex" aria-label="Landing page sections">
          <a href="#platform" class="transition-colors hover:text-ink">Platform</a>
          <a href="#connected-practice" class="transition-colors hover:text-ink">Integrations</a>
          <a href="#development" class="transition-colors hover:text-ink">CPD</a>
          <a href="#trust" class="transition-colors hover:text-ink">Trust &amp; control</a>
        </nav>

        <nav class="flex items-center gap-2.5" aria-label="Account access">
          <router-link to="/sign-in" class="rounded-lg px-4 py-2 text-sm font-semibold text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink">Sign in</router-link>
          <router-link to="/get-started" class="rounded-lg bg-action-primary px-4 py-2 text-sm font-semibold text-on-action transition-colors hover:bg-action-primary-hover">Get started</router-link>
        </nav>
      </div>
    </header>

    <section class="mx-auto w-full max-w-[1440px] px-8 pb-5 pt-7 xl:px-12">
      <div class="grid grid-cols-1 items-center gap-y-9 lg:grid-cols-12 lg:gap-x-8">
        <div class="lg:col-span-5">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-action-link">Clinical workspace for therapists</p>
          <h1 class="mt-5 max-w-[700px] text-[3.25rem] font-semibold leading-[0.98] tracking-[-0.042em] text-ink sm:text-[3.75rem] lg:text-[4rem] xl:text-[4.35rem]">
            The clinical workspace for modern psychotherapy.
          </h1>
          <p class="mt-6 max-w-xl text-lg leading-7 text-ink-secondary">
            Helios brings the working context around a therapist's practice together, with AI support available when useful and always subject to therapist review.
          </p>
          <div class="mt-8 flex flex-wrap items-center gap-3">
            <router-link to="/get-started" class="rounded-lg bg-action-primary px-5 py-3 text-sm font-semibold text-on-action transition-colors hover:bg-action-primary-hover">Get started</router-link>
            <a href="#how-it-works" class="rounded-lg border border-border px-5 py-3 text-sm font-semibold text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink">See how Helio works</a>
          </div>
          <p class="mt-6 max-w-lg text-sm leading-6 text-ink-muted">Designed to reduce switching, preserve continuity and keep therapist judgement at the centre of the work.</p>
        </div>

        <div class="hidden lg:block lg:col-span-1" aria-hidden="true"></div>

        <div class="lg:col-span-6" aria-label="Representative Helios therapist workspace">
          <div class="overflow-hidden rounded-lg border border-border bg-surface">
            <div class="grid min-h-[500px] grid-cols-[150px_1fr] xl:grid-cols-[170px_1fr]">
              <aside class="border-r border-border-muted bg-surface-muted p-4">
                <div class="flex items-center gap-2.5 border-b border-border-muted pb-4">
                  <span class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-amber-soft text-brand-amber">☼</span>
                  <div><p class="text-sm font-semibold text-ink">Helios</p><p class="text-[10px] uppercase tracking-[0.16em] text-ink-muted">Practice</p></div>
                </div>
                <nav class="mt-5 space-y-1 text-xs" aria-label="Representative workspace navigation">
                  <div class="rounded-md bg-state-selected px-3 py-2 font-semibold text-ink">Overview</div>
                  <div class="px-3 py-2 text-ink-secondary">Calendar</div>
                  <div class="px-3 py-2 text-ink-secondary">Clients</div>
                  <div class="px-3 py-2 text-ink-secondary">Transcripts</div>
                  <div class="px-3 py-2 text-ink-secondary">Documents</div>
                  <div class="px-3 py-2 text-ink-secondary">CPD</div>
                </nav>
              </aside>

              <div class="min-w-0 bg-surface">
                <div class="flex items-center justify-between border-b border-border-muted px-5 py-4">
                  <div><p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Today</p><p class="mt-1 text-lg font-semibold text-ink">Practice overview</p></div>
                  <span class="rounded-md border border-border-muted bg-surface-muted px-2.5 py-1.5 text-[11px] font-medium text-ink-secondary">09:42</span>
                </div>

                <div class="grid gap-4 p-5 xl:grid-cols-[1.15fr_.85fr]">
                  <section>
                    <div class="flex items-center justify-between"><p class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Today's work</p><p class="text-xs text-ink-muted">3 items</p></div>
                    <div class="mt-3 space-y-2.5">
                      <div class="grid grid-cols-[62px_1fr_auto] items-center gap-3 rounded-md border border-border-muted p-3">
                        <p class="text-sm font-semibold text-ink">09:00</p>
                        <div><p class="text-sm font-semibold text-ink">Client A</p><p class="mt-0.5 text-xs text-ink-muted">Context ready for review</p></div>
                        <span class="rounded-md border border-border-muted px-2 py-1 text-[10px] font-semibold text-ink-secondary">Open</span>
                      </div>
                      <div class="grid grid-cols-[62px_1fr_auto] items-center gap-3 rounded-md border border-accent/30 bg-state-selected p-3">
                        <p class="text-sm font-semibold text-ink">11:30</p>
                        <div><p class="text-sm font-semibold text-ink">Client B</p><p class="mt-0.5 text-xs text-ink-muted">Session preparation available</p></div>
                        <span class="rounded-md bg-action-primary px-2 py-1 text-[10px] font-semibold text-on-action">Prepare</span>
                      </div>
                      <div class="grid grid-cols-[62px_1fr_auto] items-center gap-3 rounded-md border border-border-muted p-3">
                        <p class="text-sm font-semibold text-ink">15:00</p>
                        <div><p class="text-sm font-semibold text-ink">Client C</p><p class="mt-0.5 text-xs text-ink-muted">Scheduled appointment</p></div>
                        <span class="rounded-md border border-border-muted px-2 py-1 text-[10px] font-semibold text-ink-secondary">Later</span>
                      </div>
                    </div>

                    <div class="mt-4 rounded-md border border-border-muted bg-surface-muted p-4">
                      <div class="flex items-center justify-between"><p class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Client context</p><span class="text-[10px] text-ink-muted">Client B</span></div>
                      <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div class="rounded-md bg-surface p-3"><p class="font-semibold text-ink">Current focus</p><p class="mt-1 text-ink-muted">Therapist-entered context</p></div>
                        <div class="rounded-md bg-surface p-3"><p class="font-semibold text-ink">Recent work</p><p class="mt-1 text-ink-muted">Previous session available</p></div>
                      </div>
                    </div>
                  </section>

                  <section class="space-y-3">
                    <div class="rounded-md border border-border-muted p-4">
                      <p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Work requiring attention</p>
                      <p class="mt-2 text-sm font-semibold text-ink">Session draft</p>
                      <p class="mt-1 text-xs leading-5 text-ink-muted">Editable working material remains separate from the Clinical Record.</p>
                      <div class="mt-3 h-1.5 w-full rounded-full bg-surface-muted"><div class="h-1.5 w-2/3 rounded-full bg-accent"></div></div>
                    </div>

                    <div class="rounded-md border border-accent/30 bg-state-selected p-4">
                      <div class="flex items-center justify-between gap-3"><p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">AI support</p><span class="rounded-md bg-surface px-2 py-1 text-[10px] font-medium text-ink-secondary">Therapist-triggered</span></div>
                      <p class="mt-2 text-sm font-semibold text-ink">Assist with working material</p>
                      <p class="mt-1 text-xs leading-5 text-ink-muted">Suggestions remain reviewable and editable until the therapist decides what to keep.</p>
                    </div>

                    <div class="rounded-md border border-border-muted p-4">
                      <p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Clinical Record</p>
                      <div class="mt-2 flex items-center justify-between gap-3"><div><p class="text-sm font-semibold text-ink">Review required</p><p class="mt-1 text-xs text-ink-muted">Approval is deliberate.</p></div><span class="rounded-md border border-border-muted px-2 py-1 text-[10px] font-semibold text-ink-secondary">Not approved</span></div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="platform" class="border-y border-border-muted bg-surface scroll-mt-6">
      <div class="mx-auto grid w-full max-w-[1440px] grid-cols-2 divide-x divide-border-muted px-8 sm:grid-cols-3 lg:grid-cols-6 xl:px-12">
        <div class="py-4 pr-4"><p class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Calendar</p><p class="mt-1 text-sm text-ink-secondary">Today's work in context</p></div>
        <div class="px-4 py-4"><p class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Clients</p><p class="mt-1 text-sm text-ink-secondary">Clinical continuity</p></div>
        <div class="px-4 py-4"><p class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Sessions</p><p class="mt-1 text-sm text-ink-secondary">Working material</p></div>
        <div class="px-4 py-4"><p class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Records</p><p class="mt-1 text-sm text-ink-secondary">Deliberate approval</p></div>
        <div class="px-4 py-4"><p class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Follow-through</p><p class="mt-1 text-sm text-ink-secondary">Loose ends carried forward</p></div>
        <div class="py-4 pl-4"><p class="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">CPD</p><p class="mt-1 text-sm text-ink-secondary">Development continuity</p></div>
      </div>
    </section>

    <section id="how-it-works" class="border-b border-border-muted bg-surface-elevated scroll-mt-6">
      <div class="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
        <div class="max-w-2xl">
          <p class="type-eyebrow text-action-link">How Helios fits around therapy</p>
          <h2 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Continuity before, during, after — and between sessions.</h2>
          <p class="mt-4 type-body-long text-ink-secondary">Helios reduces the mental work of remembering context, switching systems and carrying loose ends forward, so the therapist can stay oriented to the clinical work.</p>
        </div>
        <div class="mt-9 grid gap-4 lg:grid-cols-4">
          <article class="surface-card p-5 sm:p-6"><div class="flex items-center gap-3"><span class="brand-accent-surface flex h-9 w-9 items-center justify-center rounded-control text-brand-amber" aria-hidden="true">01</span><h3 class="type-subsection text-ink">Before the session</h3></div><p class="mt-4 type-body text-ink-secondary">Review your day, client context, current focus and recent clinically useful developments. See what needs attention before the appointment.</p></article>
          <article class="surface-card p-5 sm:p-6"><div class="flex items-center gap-3"><span class="flex h-9 w-9 items-center justify-center rounded-control bg-surface-muted text-action-link" aria-hidden="true">02</span><h3 class="type-subsection text-ink">Around the session</h3></div><p class="mt-4 type-body text-ink-secondary">Write or dictate editable working material. Invoke transcript or AI assistance when useful, with the output remaining available for therapist review.</p></article>
          <article class="surface-card p-5 sm:p-6"><div class="flex items-center gap-3"><span class="flex h-9 w-9 items-center justify-center rounded-control bg-state-selected text-action-link" aria-hidden="true">03</span><h3 class="type-subsection text-ink">After the session</h3></div><p class="mt-4 type-body text-ink-secondary">Review the draft, approve a Clinical Record deliberately when ready, and keep professional reflection separate from the client record.</p></article>
          <article class="surface-card p-5 sm:p-6"><div class="flex items-center gap-3"><span class="flex h-9 w-9 items-center justify-center rounded-control bg-brand-sage-soft text-action-link" aria-hidden="true">04</span><h3 class="type-subsection text-ink">Between sessions</h3></div><p class="mt-4 type-body text-ink-secondary">Carry forward follow-ups, clinical context, reflection and learning so important threads do not depend on memory alone.</p></article>
        </div>
      </div>
    </section>

    <section id="connected-practice" class="mx-auto grid w-full max-w-6xl scroll-mt-6 gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
      <div><p class="type-eyebrow text-action-link">Connected practice</p><h2 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">The tools you already use, brought back into one clinical flow.</h2><p class="mt-4 type-body-long text-ink-secondary">Google Calendar keeps appointments in context. Zoom connects video consultations and transcript workflows. Helios brings those signals back into the client and session workspace so there is less copying, remembering and switching between systems.</p></div>
      <div class="grid gap-4 sm:grid-cols-3">
        <article class="surface-card p-5 sm:p-6"><p class="type-eyebrow text-ink-muted">Google Calendar</p><h3 class="mt-2 type-subsection text-ink">Your schedule, connected to client work.</h3><p class="mt-3 type-body text-ink-secondary">See appointments in the context of the client and the work you need to prepare for next.</p></article>
        <article class="surface-card p-5 sm:p-6"><p class="type-eyebrow text-ink-muted">Zoom</p><h3 class="mt-2 type-subsection text-ink">Video consultations without a separate workflow.</h3><p class="mt-3 type-body text-ink-secondary">Keep meeting links and transcript review connected to the relevant session rather than scattered across tools.</p></article>
        <article class="surface-card p-5 sm:p-6"><p class="type-eyebrow text-ink-muted">Google integration</p><h3 class="mt-2 type-subsection text-ink">Less manual coordination.</h3><p class="mt-3 type-body text-ink-secondary">Helios uses connected services to reduce duplicate entry and keep the practice easier to navigate.</p></article>
      </div>
    </section>

    <section id="development" class="border-y border-border-muted bg-surface-muted scroll-mt-6">
      <div class="mx-auto grid w-full max-w-6xl gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
        <div><p class="type-eyebrow text-action-link">Professional development</p><h2 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Your development has continuity too.</h2><p class="mt-4 type-body-long text-ink-secondary">Helios is not only about managing client work. Reflection, supervision material and CPD can form an ongoing professional thread, helping the therapist notice themes, carry learning forward and build a clearer picture of development over time.</p></div>
        <div class="grid gap-4 sm:grid-cols-3"><div class="surface-card p-5"><p class="font-medium text-ink">Reflect</p><p class="mt-2 text-sm leading-6 text-ink-secondary">Keep private professional reflection distinct from the clinical record while still making it useful to you.</p></div><div class="surface-card p-5"><p class="font-medium text-ink">Learn</p><p class="mt-2 text-sm leading-6 text-ink-secondary">Connect insights from practice, supervision and CPD instead of leaving them as isolated notes.</p></div><div class="surface-card p-5"><p class="font-medium text-ink">Develop</p><p class="mt-2 text-sm leading-6 text-ink-secondary">Build continuity in how you work, what you are learning and where you want to grow next.</p></div></div>
      </div>
    </section>

    <section id="workspace" class="mx-auto grid w-full max-w-6xl scroll-mt-6 gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[.72fr_1.25fr_.86fr] lg:items-center">
      <div><p class="type-eyebrow text-action-link">Your workspace</p><h2 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">One place to stay oriented.</h2><p class="mt-4 type-body-long text-ink-secondary">Clients, appointments, drafts and approved records stay visible as distinct parts of the same practice, giving you continuity without flattening everything into one generic notes tool.</p></div>
      <div class="surface-card overflow-hidden" aria-label="Representative client directory"><div class="flex items-center justify-between border-b border-border-muted px-5 py-4"><div><p class="type-eyebrow text-ink-muted">Clients</p><p class="mt-1 font-medium text-ink">Your client directory</p></div><span class="rounded-control bg-action-link px-3 py-2 text-xs font-medium text-on-action">Add client</span></div><div class="divide-y divide-border-muted text-sm"><div class="grid grid-cols-[1fr_auto_auto] gap-4 bg-surface-muted px-5 py-2 text-xs text-ink-muted"><span>Client</span><span>Last session</span><span>Next session</span></div><div class="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3"><span class="font-medium text-ink">Client A</span><span class="text-ink-muted">14 May</span><span class="text-ink-muted">21 May</span></div><div class="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3"><span class="font-medium text-ink">Client B</span><span class="text-ink-muted">13 May</span><span class="text-ink-muted">20 May</span></div><div class="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3"><span class="font-medium text-ink">Client C</span><span class="text-ink-muted">12 May</span><span class="text-ink-muted">—</span></div><div class="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3"><span class="font-medium text-ink">Client D</span><span class="text-ink-muted">10 May</span><span class="text-ink-muted">19 May</span></div></div></div>
      <aside id="trust" class="surface-card scroll-mt-6 bg-state-selected p-5 sm:p-6" aria-label="Therapist control principles"><p class="type-subsection text-ink">Your judgement, always</p><div class="mt-4 space-y-4"><div><h3 class="text-sm font-semibold text-ink">AI is assistive</h3><p class="mt-1 text-xs leading-5 text-ink-secondary">You choose when to use it and review what it produces.</p></div><div><h3 class="text-sm font-semibold text-ink">Drafts stay editable</h3><p class="mt-1 text-xs leading-5 text-ink-secondary">Working notes are not Clinical Records until you approve them.</p></div><div><h3 class="text-sm font-semibold text-ink">Clinical Records are deliberate</h3><p class="mt-1 text-xs leading-5 text-ink-secondary">Approved records are immutable; later corrections are append-only amendments.</p></div><div><h3 class="text-sm font-semibold text-ink">Reflections stay separate</h3><p class="mt-1 text-xs leading-5 text-ink-secondary">Private professional reflection is not automatically part of a client record.</p></div></div></aside>
    </section>

    <section id="for-therapists" class="border-y border-border-muted bg-surface-muted scroll-mt-6"><div class="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8"><div class="grid gap-8 lg:grid-cols-[1fr_2fr] lg:items-center"><div><p class="type-eyebrow text-action-link">Built for therapists</p><h2 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink">A cognitive-support system for professional practice.</h2></div><div class="grid gap-6 sm:grid-cols-3"><div class="border-l border-border px-4"><p class="font-medium text-ink">Less cognitive load</p><p class="mt-1 text-sm text-ink-muted">Reduce remembering, switching and carrying unfinished practice tasks mentally.</p></div><div class="border-l border-border px-4"><p class="font-medium text-ink">More continuity</p><p class="mt-1 text-sm text-ink-muted">Keep client work, clinical context and follow-through connected over time.</p></div><div class="border-l border-border px-4"><p class="font-medium text-ink">Ongoing development</p><p class="mt-1 text-sm text-ink-muted">Give reflection, supervision and CPD a thread you can build on.</p></div></div></div></div></section>

    <section class="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-12"><div class="surface-card grid gap-6 px-6 py-7 sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center"><div><p class="font-serif text-2xl font-semibold text-ink">Ready for a practice that asks less of your memory?</p><p class="mt-1 type-body text-ink-secondary">Create your workspace and explore how Helios connects the work around therapy.</p></div><svg class="hidden h-11 w-11 text-brand-amber lg:block" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M9 31h30M15 31a9 9 0 0 1 18 0M24 8v7M9.5 14.5l5 5M38.5 14.5l-5 5M5 26h7M36 26h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><div class="flex flex-wrap gap-3 lg:justify-end"><router-link to="/get-started" class="button-primary">Get started</router-link><router-link to="/sign-in" class="button-secondary">Sign in</router-link></div></div></section>

    <footer class="border-t border-border-muted"><nav class="mx-auto flex w-full max-w-6xl flex-wrap gap-x-5 gap-y-2 px-5 py-6 text-sm text-ink-secondary sm:px-8" aria-label="Legal and support"><router-link to="/terms" class="hover:text-ink">Terms</router-link><router-link to="/privacy" class="hover:text-ink">Privacy</router-link><router-link to="/ai-data" class="hover:text-ink">AI &amp; data</router-link><router-link to="/cookies" class="hover:text-ink">Cookies</router-link><router-link to="/support" class="hover:text-ink">Support</router-link></nav></footer>
  </main>
</template>
