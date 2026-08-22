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
        <a href="#connected-practice" class="hover:text-ink">Connected practice</a>
        <a href="#development" class="hover:text-ink">Professional development</a>
        <a href="#trust" class="hover:text-ink">Trust &amp; control</a>
      </nav>
      <nav class="flex items-center gap-2" aria-label="Account access">
        <router-link to="/sign-in" class="button-secondary">Sign in</router-link>
        <router-link to="/get-started" class="button-primary">Get started</router-link>
      </nav>
    </header>

    <section class="mx-auto grid w-full max-w-[1480px] gap-10 px-5 pb-10 pt-7 sm:px-8 sm:pt-10 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:gap-12 lg:pb-12 lg:pt-8 xl:gap-16">
      <div class="max-w-2xl lg:pl-4 xl:pl-8">
        <p class="type-eyebrow text-action-link">Therapist workspace</p>
        <h1 class="mt-4 font-serif text-5xl font-semibold leading-[1.04] tracking-[-0.035em] text-ink sm:text-6xl">Less to hold in your head. More space for the therapy.</h1>
        <p class="mt-6 text-lg leading-8 text-ink-secondary">Helios brings your calendar, Zoom consultations, client context, session work, Clinical Records, reflection and professional development into one connected workspace — helping you maintain continuity without carrying the whole practice mentally.</p>
        <div class="mt-8 flex flex-wrap gap-3">
          <router-link to="/get-started" class="button-primary">Get started</router-link>
          <a href="#how-it-works" class="button-secondary">See how it works</a>
        </div>
        <p class="mt-5 text-sm leading-6 text-ink-muted">Therapist judgement stays central. AI and transcript output remain assistive working material until you decide what to keep.</p>
      </div>

      <div class="relative min-w-0 w-full" aria-label="Representative Helios practice workspace">
        <div class="absolute -inset-4 -z-10 rounded-[32px] bg-brand-sage-soft sm:-inset-5" aria-hidden="true"></div>
        <img
          src="/helios-product-preview.svg"
          alt="Helios practice overview showing today's sessions, client preparation and editable working material"
          class="block w-full rounded-[24px] border border-border shadow-elevated"
          width="960"
          height="640"
        />
      </div>
    </section>

    <section id="how-it-works" class="border-y border-border-muted bg-surface-elevated scroll-mt-6">
      <div class="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
        <div class="max-w-2xl">
          <p class="type-eyebrow text-action-link">How Helios fits around therapy</p>
          <h2 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Continuity before, during, after — and between sessions.</h2>
          <p class="mt-4 type-body-long text-ink-secondary">Helios reduces the mental work of remembering context, switching systems and carrying loose ends forward, so the therapist can stay oriented to the clinical work.</p>
        </div>
        <div class="mt-9 grid gap-4 lg:grid-cols-4">
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
          <article class="surface-card p-5 sm:p-6">
            <div class="flex items-center gap-3"><span class="flex h-9 w-9 items-center justify-center rounded-control bg-brand-sage-soft text-action-link" aria-hidden="true">04</span><h3 class="type-subsection text-ink">Between sessions</h3></div>
            <p class="mt-4 type-body text-ink-secondary">Carry forward follow-ups, clinical context, reflection and learning so important threads do not depend on memory alone.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="connected-practice" class="mx-auto grid w-full max-w-6xl scroll-mt-6 gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
      <div>
        <p class="type-eyebrow text-action-link">Connected practice</p>
        <h2 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">The tools you already use, brought back into one clinical flow.</h2>
        <p class="mt-4 type-body-long text-ink-secondary">Google Calendar keeps appointments in context. Zoom connects video consultations and transcript workflows. Helios brings those signals back into the client and session workspace so there is less copying, remembering and switching between systems.</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <article class="surface-card p-5 sm:p-6">
          <p class="type-eyebrow text-ink-muted">Google Calendar</p>
          <h3 class="mt-2 type-subsection text-ink">Your schedule, connected to client work.</h3>
          <p class="mt-3 type-body text-ink-secondary">See appointments in the context of the client and the work you need to prepare for next.</p>
        </article>
        <article class="surface-card p-5 sm:p-6">
          <p class="type-eyebrow text-ink-muted">Zoom</p>
          <h3 class="mt-2 type-subsection text-ink">Video consultations without a separate workflow.</h3>
          <p class="mt-3 type-body text-ink-secondary">Keep meeting links and transcript review connected to the relevant session rather than scattered across tools.</p>
        </article>
        <article class="surface-card p-5 sm:p-6">
          <p class="type-eyebrow text-ink-muted">Google integration</p>
          <h3 class="mt-2 type-subsection text-ink">Less manual coordination.</h3>
          <p class="mt-3 type-body text-ink-secondary">Helios uses connected services to reduce duplicate entry and keep the practice easier to navigate.</p>
        </article>
      </div>
    </section>

    <section id="development" class="border-y border-border-muted bg-surface-muted scroll-mt-6">
      <div class="mx-auto grid w-full max-w-6xl gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
        <div>
          <p class="type-eyebrow text-action-link">Professional development</p>
          <h2 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Your development has continuity too.</h2>
          <p class="mt-4 type-body-long text-ink-secondary">Helios is not only about managing client work. Reflection, supervision material and CPD can form an ongoing professional thread, helping the therapist notice themes, carry learning forward and build a clearer picture of development over time.</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="surface-card p-5"><p class="font-medium text-ink">Reflect</p><p class="mt-2 text-sm leading-6 text-ink-secondary">Keep private professional reflection distinct from the clinical record while still making it useful to you.</p></div>
          <div class="surface-card p-5"><p class="font-medium text-ink">Learn</p><p class="mt-2 text-sm leading-6 text-ink-secondary">Connect insights from practice, supervision and CPD instead of leaving them as isolated notes.</p></div>
          <div class="surface-card p-5"><p class="font-medium text-ink">Develop</p><p class="mt-2 text-sm leading-6 text-ink-secondary">Build continuity in how you work, what you are learning and where you want to grow next.</p></div>
        </div>
      </div>
    </section>

    <section id="workspace" class="mx-auto grid w-full max-w-6xl scroll-mt-6 gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[.72fr_1.25fr_.86fr] lg:items-center">
      <div>
        <p class="type-eyebrow text-action-link">Your workspace</p>
        <h2 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">One place to stay oriented.</h2>
        <p class="mt-4 type-body-long text-ink-secondary">Clients, appointments, drafts and approved records stay visible as distinct parts of the same practice, giving you continuity without flattening everything into one generic notes tool.</p>
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
            <h2 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink">A cognitive-support system for professional practice.</h2>
          </div>
          <div class="grid gap-6 sm:grid-cols-3">
            <div class="border-l border-border px-4"><p class="font-medium text-ink">Less cognitive load</p><p class="mt-1 text-sm text-ink-muted">Reduce remembering, switching and carrying unfinished practice tasks mentally.</p></div>
            <div class="border-l border-border px-4"><p class="font-medium text-ink">More continuity</p><p class="mt-1 text-sm text-ink-muted">Keep client work, clinical context and follow-through connected over time.</p></div>
            <div class="border-l border-border px-4"><p class="font-medium text-ink">Ongoing development</p><p class="mt-1 text-sm text-ink-muted">Give reflection, supervision and CPD a thread you can build on.</p></div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
      <div class="surface-card grid gap-6 px-6 py-7 sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div>
          <p class="font-serif text-2xl font-semibold text-ink">Ready for a practice that asks less of your memory?</p>
          <p class="mt-1 type-body text-ink-secondary">Create your workspace and explore how Helios connects the work around therapy.</p>
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