<template>
  <main class="min-h-screen bg-surface-canvas text-ink">
    <header class="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <router-link to="/" class="flex items-center gap-2.5" aria-label="Helios home">
        <span class="brand-accent-surface brand-mark flex h-9 w-9 items-center justify-center rounded-pill border border-brand-amber/40 text-xl" aria-hidden="true">☼</span>
        <span class="font-serif text-2xl font-semibold tracking-tight">Helios</span>
      </router-link>
      <nav class="flex items-center gap-2" aria-label="Account access">
        <router-link to="/sign-in" class="button-secondary">Sign in</router-link>
        <router-link to="/get-started" class="button-primary">Get started</router-link>
      </nav>
    </header>

    <section class="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-14 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[1.02fr_.98fr] lg:items-center lg:gap-14 lg:pb-18">
      <div class="max-w-2xl">
        <p class="type-eyebrow text-action-link">Therapist workspace</p>
        <h1 class="mt-4 font-serif text-5xl font-semibold leading-[1.04] tracking-[-0.035em] text-ink sm:text-6xl">A calmer place for the work around therapy.</h1>
        <p class="mt-6 max-w-xl text-lg leading-8 text-ink-secondary">Bring appointments, session preparation, working notes, Clinical Records and private reflection into one focused professional workspace.</p>
        <div class="mt-8 flex flex-wrap gap-3">
          <router-link to="/get-started" class="button-primary">Get started</router-link>
          <router-link to="/sign-in" class="button-secondary">Sign in</router-link>
        </div>
        <p class="mt-5 max-w-lg text-sm leading-6 text-ink-muted">Built for therapists managing the practical and reflective work around client sessions — not as a replacement for clinical judgement.</p>
      </div>

      <aside class="surface-card overflow-hidden" aria-label="A session in Helios">
        <div class="border-b border-border-muted bg-surface-muted px-5 py-4 sm:px-6">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="type-eyebrow text-ink-muted">Next session</p>
              <p class="mt-1 type-subsection text-ink">Prepare with context, not clutter</p>
            </div>
            <span class="rounded-pill bg-state-success-surface px-3 py-1 text-xs font-medium text-state-success">Today</span>
          </div>
        </div>
        <div class="grid sm:grid-cols-2">
          <div class="p-5 sm:p-6">
            <p class="type-eyebrow text-ink-muted">Before</p>
            <p class="mt-2 type-body text-ink">See the current focus, recent clinically useful context and anything outstanding before the appointment.</p>
          </div>
          <div class="border-t border-border-muted p-5 sm:border-l sm:border-t-0 sm:p-6">
            <p class="type-eyebrow text-ink-muted">After</p>
            <p class="mt-2 type-body text-ink">Keep an editable draft, review it deliberately, then approve the Clinical Record when you are ready.</p>
          </div>
        </div>
        <div class="border-t border-border-muted px-5 py-4 sm:px-6">
          <div class="flex items-start gap-3">
            <span class="brand-accent-surface mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-pill text-sm" aria-hidden="true">✦</span>
            <p class="text-sm leading-6 text-ink-secondary"><strong class="font-medium text-ink">AI when you choose it.</strong> Transcript and AI-assisted drafts remain material for therapist review — they do not become Clinical Records automatically.</p>
          </div>
        </div>
      </aside>
    </section>

    <section class="mx-auto flex w-full max-w-6xl items-center gap-5 px-5 pb-14 sm:px-8" aria-label="Helios placeholder brand mark">
      <div class="h-px flex-1 bg-border-muted"></div>
      <div class="flex items-center gap-3 text-ink-muted">
        <svg class="h-9 w-9 text-brand-amber" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M10 31h28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M15 31a9 9 0 0 1 18 0" stroke="currentColor" stroke-width="2"/>
          <path d="M24 8v7M9.5 14.5l5 5M38.5 14.5l-5 5M5 26h7M36 26h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span class="font-serif text-2xl font-semibold tracking-tight text-ink">Helios</span>
      </div>
      <div class="h-px flex-1 bg-border-muted"></div>
    </section>

    <section class="border-y border-border-muted bg-surface-elevated">
      <div class="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div class="max-w-2xl">
          <p class="type-eyebrow text-action-link">Around the working day</p>
          <h2 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Keep the thread of the work close.</h2>
          <p class="mt-4 text-lg leading-8 text-ink-secondary">Helios is organised around what therapists need before, around and after sessions rather than a disconnected list of tools.</p>
        </div>

        <div class="mt-10 divide-y divide-border-muted border-y border-border-muted lg:grid lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          <article class="py-6 lg:pr-8">
            <p class="type-eyebrow text-ink-muted">Before the session</p>
            <h3 class="mt-3 type-subsection text-ink">Know what needs your attention.</h3>
            <p class="mt-2 type-body text-ink-secondary">Work from your appointments and client context, revisit the current focus and see outstanding session work before you begin.</p>
          </article>
          <article class="py-6 lg:px-8">
            <p class="type-eyebrow text-ink-muted">Around the session</p>
            <h3 class="mt-3 type-subsection text-ink">Capture working material as a draft.</h3>
            <p class="mt-2 type-body text-ink-secondary">Write or dictate editable material. Where you invoke AI or transcription, its output stays assistive and available for your review.</p>
          </article>
          <article class="py-6 lg:pl-8">
            <p class="type-eyebrow text-ink-muted">After and between sessions</p>
            <h3 class="mt-3 type-subsection text-ink">Separate record keeping from reflection.</h3>
            <p class="mt-2 type-body text-ink-secondary">Approve a Clinical Record deliberately, while keeping professional reflection in its own private workspace outside the client record.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.88fr_1.12fr] lg:items-center lg:gap-16">
      <div>
        <p class="type-eyebrow text-action-link">A tangible workspace</p>
        <h2 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">The distinction between draft and record stays visible.</h2>
        <p class="mt-4 text-lg leading-8 text-ink-secondary">Session work can remain editable while you are thinking. Creating a Clinical Record is a separate, explicit review and approval step.</p>
        <p class="mt-4 type-body text-ink-secondary">Once approved, the Clinical Record is treated as immutable; later corrections are added as amendments rather than silently rewriting the approved record.</p>
      </div>

      <div class="surface-card overflow-hidden" aria-label="Representative Clinical Record workflow">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border-muted px-5 py-4 sm:px-6">
          <div>
            <p class="type-eyebrow text-ink-muted">Session workspace</p>
            <p class="mt-1 font-medium text-ink">Clinical summary</p>
          </div>
          <span class="rounded-pill bg-state-selected px-3 py-1 text-xs font-medium text-action-link">Draft · editable</span>
        </div>
        <div class="space-y-4 p-5 sm:p-6">
          <div class="rounded-control border border-border-muted bg-surface-muted p-4">
            <p class="type-eyebrow text-ink-muted">Working draft</p>
            <div class="mt-3 space-y-2" aria-hidden="true">
              <div class="h-2.5 w-full rounded-pill bg-border-muted"></div>
              <div class="h-2.5 w-11/12 rounded-pill bg-border-muted"></div>
              <div class="h-2.5 w-3/4 rounded-pill bg-border-muted"></div>
            </div>
            <p class="mt-3 text-xs text-ink-muted">Editable therapist-authored material. Dictation can add draft text for review.</p>
          </div>
          <div class="rounded-control border border-action-link/20 bg-state-selected p-4">
            <p class="font-medium text-ink">Ready when you are</p>
            <p class="mt-1 text-sm leading-6 text-ink-secondary">Review the summary, confirm it represents the session, then choose whether to approve the Clinical Record.</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span class="button-primary pointer-events-none">Approve Clinical Record</span>
              <span class="button-secondary pointer-events-none">Return to draft</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-surface-muted">
      <div class="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-16">
        <div>
          <p class="type-eyebrow text-action-link">Therapist control</p>
          <h2 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Assistance without handing over judgement.</h2>
          <p class="mt-4 text-lg leading-8 text-ink-secondary">Helios can help with working material when you deliberately ask it to. The therapist remains responsible for reviewing, editing and deciding what belongs in the clinical record.</p>
        </div>
        <div class="divide-y divide-border-muted border-y border-border-muted">
          <div class="py-5">
            <h3 class="type-subsection text-ink">Drafts stay drafts</h3>
            <p class="mt-1 type-body text-ink-secondary">Editable session material is not a Clinical Record until you explicitly review and approve it.</p>
          </div>
          <div class="py-5">
            <h3 class="type-subsection text-ink">Reflection has its own place</h3>
            <p class="mt-1 type-body text-ink-secondary">Private therapist reflection is separate working material and is not automatically included in a client’s clinical record.</p>
          </div>
          <div class="py-5">
            <h3 class="type-subsection text-ink">AI is optional and triggered by you</h3>
            <p class="mt-1 type-body text-ink-secondary">Use AI-supported reflection, transcription or draft assistance when useful; review the result before deciding what to keep.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
      <div class="grid gap-8 border-b border-border-muted pb-16 lg:grid-cols-[.9fr_1.1fr] lg:items-start lg:gap-16">
        <div>
          <p class="type-eyebrow text-action-link">Who Helios is for</p>
          <h2 class="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">A professional workspace for therapists.</h2>
        </div>
        <div class="space-y-4 text-lg leading-8 text-ink-secondary">
          <p>Helios is for therapists who want the practical work of appointments, clients, session preparation, notes, records and professional reflection to feel more coherent.</p>
          <p>It is not a consumer wellness app and it does not try to practise therapy on your behalf. It gives you a workspace in which your professional judgement remains central.</p>
        </div>
      </div>

      <div class="py-16 text-center sm:py-20">
        <p class="type-eyebrow text-action-link">Start with your own workspace</p>
        <h2 class="mx-auto mt-3 max-w-2xl font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">See whether Helios gives the work around therapy a calmer shape.</h2>
        <p class="mx-auto mt-4 max-w-xl type-body text-ink-secondary">Create an account and explore the workspace for yourself.</p>
        <router-link to="/get-started" class="button-primary mt-7 inline-flex">Get started</router-link>
      </div>
    </section>

    <footer class="border-t border-border-muted">
      <nav class="mx-auto flex w-full max-w-6xl flex-wrap gap-x-5 gap-y-2 px-5 py-6 text-sm text-ink-secondary sm:px-8" aria-label="Legal and support">
        <router-link to="/terms" class="hover:text-ink">Terms</router-link>
        <router-link to="/privacy" class="hover:text-ink">Privacy</router-link>
        <router-link to="/ai-data" class="hover:text-ink">AI & data</router-link>
        <router-link to="/cookies" class="hover:text-ink">Cookies</router-link>
        <router-link to="/support" class="hover:text-ink">Support</router-link>
      </nav>
    </footer>
  </main>
</template>
