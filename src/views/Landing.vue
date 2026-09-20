<template>
  <main class="min-h-screen bg-surface-canvas text-ink">
    <header class="sticky top-0 z-20 border-b border-border-muted bg-surface-canvas/95 backdrop-blur">
      <div class="mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 xl:px-12">
        <router-link to="/" class="flex items-center gap-3" aria-label="Helios home">
          <svg class="h-9 w-9 text-accent" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M9 31h30" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M15 31a9 9 0 0 1 18 0" stroke="currentColor" stroke-width="2"/>
            <path d="M24 8v7M9.5 14.5l5 5M38.5 14.5l-5 5M5 26h7M36 26h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span class="text-xl font-semibold tracking-[-0.02em]">Helios</span>
        </router-link>

        <nav class="hidden items-center gap-6 text-sm font-medium text-ink-secondary lg:flex" aria-label="Landing page sections">
          <a href="#clients" class="hover:text-ink">Clients</a>
          <a href="#sessions" class="hover:text-ink">Sessions</a>
          <a href="#continuity" class="hover:text-ink">Continuity</a>
          <a href="#practice" class="hover:text-ink">Practice</a>
          <a href="#trust" class="hover:text-ink">Trust</a>
        </nav>

        <nav class="flex items-center gap-2" aria-label="Account access">
          <router-link to="/sign-in" class="rounded-control px-4 py-2 text-sm font-semibold text-ink-secondary hover:bg-surface-muted hover:text-ink">Sign in</router-link>
          <router-link to="/get-started" class="rounded-control border border-border px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-muted">Create workspace</router-link>
        </nav>
      </div>
    </header>

    <section class="overflow-hidden border-b border-border-muted">
      <div class="mx-auto w-full max-w-[1440px] px-5 pb-0 pt-14 sm:px-8 lg:pt-20 xl:px-12">
        <div class="grid gap-10 lg:grid-cols-[minmax(0,.9fr)_minmax(380px,.55fr)] lg:items-end">
          <div class="max-w-[820px]">
            <p class="type-eyebrow text-accent">Therapist workspace</p>
            <h1 class="mt-4 max-w-[860px] font-serif text-[3rem] font-semibold leading-[.98] tracking-[-0.045em] sm:text-[4rem] lg:text-[4.7rem]">
              Your therapy practice, with the clinical context kept together.
            </h1>
          </div>

          <div class="pb-2">
            <p class="max-w-[540px] text-lg leading-8 text-ink-secondary">
              Helios brings your clients, appointments, sessions, notes, transcripts and developing clinical picture into one calm therapist workspace.
            </p>
            <p class="mt-4 max-w-[540px] text-sm leading-6 text-ink-secondary">
              See what matters before a session, turn session material into editable working notes, and carry the thread forward without rebuilding context from scratch.
            </p>
            <div class="mt-6 flex flex-wrap gap-3">
              <a href="#product-tour" class="rounded-control bg-action-primary px-5 py-3 text-sm font-semibold text-on-action hover:bg-action-primary-hover">See Helios in action</a>
              <router-link to="/get-started" class="rounded-control border border-border px-5 py-3 text-sm font-semibold text-ink-secondary hover:bg-surface-muted hover:text-ink">Create workspace</router-link>
            </div>
            <p class="mt-4 text-xs text-ink-muted">30-day free trial · £49/month afterwards · Cancel anytime</p>
          </div>
        </div>

        <div id="product-tour" class="mt-10 scroll-mt-24 lg:mt-14" aria-label="Representative Helios therapist workspace">
          <div class="overflow-hidden rounded-t-panel border border-b-0 border-border bg-surface-raised shadow-[0_18px_60px_rgba(32,36,31,.08)]">
            <div class="flex items-center justify-between border-b border-border-muted bg-surface-muted px-4 py-3 text-[11px] text-ink-muted">
              <div class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-state-success"></span>
                <span class="font-semibold text-ink-secondary">Helios · Today</span>
              </div>
              <span>Monday · 21 September</span>
            </div>

            <div class="grid min-h-[520px] md:grid-cols-[176px_minmax(0,1fr)]">
              <aside class="hidden border-r border-sidebar-border bg-surface-sidebar p-4 text-on-surface-sidebar md:block">
                <div class="mb-5 flex items-center gap-3 border-b border-sidebar-border pb-4">
                  <span class="flex h-9 w-9 items-center justify-center rounded-control bg-white/10 text-lg">☼</span>
                  <div>
                    <p class="text-xs font-semibold">My practice</p>
                    <p class="text-[10px] text-sidebar-muted">Therapist workspace</p>
                  </div>
                </div>
                <nav class="space-y-1 text-xs" aria-label="Representative workspace navigation">
                  <div class="rounded-control bg-white/10 px-3 py-2.5 font-semibold">Today</div>
                  <div class="px-3 py-2.5 text-sidebar-muted">Clients</div>
                  <div class="px-3 py-2.5 text-sidebar-muted">Calendar</div>
                  <div class="px-3 py-2.5 text-sidebar-muted">Documents</div>
                  <div class="px-3 py-2.5 text-sidebar-muted">Transcripts</div>
                  <div class="mt-5 border-t border-sidebar-border pt-4 px-3 py-2.5 text-sidebar-muted">Supervision &amp; CPD</div>
                </nav>
              </aside>

              <div class="min-w-0 bg-surface-canvas">
                <div class="border-b border-border-muted bg-surface-raised px-5 py-5 sm:px-7">
                  <p class="type-eyebrow text-ink-muted">Today</p>
                  <h2 class="mt-1 font-serif text-2xl font-semibold tracking-[-0.025em]">Good morning, Robert.</h2>
                  <p class="mt-1 text-sm text-ink-secondary">Three appointments today. One session is waiting for review.</p>
                </div>

                <div class="grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,.72fr)]">
                  <section>
                    <div class="flex items-center justify-between">
                      <p class="type-eyebrow text-ink-muted">Today’s schedule</p>
                      <span class="text-xs font-medium text-action-link">View calendar →</span>
                    </div>

                    <div class="mt-3 space-y-3">
                      <article class="rounded-panel border border-accent/20 bg-surface-raised p-4">
                        <div class="flex flex-wrap items-start justify-between gap-3">
                          <div class="flex min-w-0 gap-4">
                            <div class="w-14 shrink-0 border-r border-border-muted pr-3">
                              <p class="text-sm font-semibold">10:00</p>
                              <p class="mt-1 text-[10px] text-ink-muted">60 min</p>
                            </div>
                            <div>
                              <p class="text-sm font-semibold">Sarah M.</p>
                              <p class="mt-1 text-xs text-ink-secondary">Individual therapy · Online</p>
                              <p class="mt-2 text-[11px] leading-5 text-ink-muted">Recent thread: setting boundaries without withdrawing.</p>
                            </div>
                          </div>
                          <span class="rounded-control bg-action-primary px-3 py-2 text-[11px] font-semibold text-white">Open client</span>
                        </div>
                      </article>

                      <article class="rounded-panel border border-border-muted bg-surface-raised p-4">
                        <div class="flex items-center gap-4">
                          <div class="w-14 shrink-0 border-r border-border-muted pr-3">
                            <p class="text-sm font-semibold">13:30</p>
                            <p class="mt-1 text-[10px] text-ink-muted">60 min</p>
                          </div>
                          <div>
                            <p class="text-sm font-semibold">David R.</p>
                            <p class="mt-1 text-xs text-ink-secondary">Individual therapy · In person</p>
                          </div>
                        </div>
                      </article>
                    </div>
                  </section>

                  <aside class="space-y-3">
                    <article class="rounded-panel border border-accent/20 bg-accent/5 p-4">
                      <p class="type-eyebrow text-accent">Continue working</p>
                      <p class="mt-2 text-sm font-semibold">Session summary ready to review</p>
                      <p class="mt-1 text-xs leading-5 text-ink-secondary">Client A · yesterday at 16:00</p>
                      <p class="mt-3 text-[11px] font-semibold text-action-link">Open session →</p>
                    </article>

                    <article class="rounded-panel border border-border-muted bg-surface-raised p-4">
                      <p class="type-eyebrow text-ink-muted">Connected</p>
                      <div class="mt-3 space-y-2 text-xs text-ink-secondary">
                        <div class="flex items-center justify-between"><span>Google Calendar</span><span class="text-state-success">Connected</span></div>
                        <div class="flex items-center justify-between"><span>Zoom</span><span class="text-state-success">Connected</span></div>
                      </div>
                    </article>
                  </aside>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="clients" class="scroll-mt-24 border-b border-border-muted bg-surface-elevated">
      <div class="mx-auto grid w-full max-w-[1200px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[.82fr_1.18fr] lg:items-center lg:py-28">
        <div>
          <p class="type-eyebrow text-accent">Before the session</p>
          <h2 class="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">Start your day knowing where you left off.</h2>
          <p class="mt-5 max-w-xl text-base leading-7 text-ink-secondary">
            You shouldn’t have to reconstruct weeks of therapy from scattered notes before a client walks in. Helios keeps the current work around the client.
          </p>
          <div class="mt-7 space-y-3 text-sm text-ink-secondary">
            <p><span class="font-semibold text-ink">Current care focus.</span> What you are working on now.</p>
            <p><span class="font-semibold text-ink">Follow-ups.</span> What needs returning to next time.</p>
            <p><span class="font-semibold text-ink">Recent sessions.</span> The recent history in one place.</p>
          </div>
        </div>

        <div class="overflow-hidden rounded-panel border border-border bg-surface-raised shadow-sm">
          <div class="border-b border-border-muted bg-surface-muted px-5 py-3 text-[11px] font-semibold uppercase tracking-[.12em] text-ink-muted">Client workspace</div>
          <div class="p-5 sm:p-6">
            <div class="flex items-start justify-between gap-4 border-b border-border-muted pb-5">
              <div class="flex items-center gap-3">
                <div class="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">SM</div>
                <div>
                  <p class="font-semibold">Sarah M.</p>
                  <p class="mt-1 text-xs text-ink-muted">Next appointment · Tue 10:00</p>
                </div>
              </div>
              <span class="rounded-control bg-action-primary px-3 py-2 text-[11px] font-semibold text-white">Clinical Workspace</span>
            </div>

            <div class="mt-5">
              <p class="font-serif text-xl font-semibold">Before next session</p>
              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <article class="rounded-control border border-accent/20 bg-accent/5 p-4">
                  <p class="type-eyebrow text-accent">Current care focus</p>
                  <p class="mt-2 text-sm font-medium">Boundaries without withdrawal</p>
                  <p class="mt-2 text-xs leading-5 text-ink-secondary">Developing ways to stay present while expressing disagreement.</p>
                </article>
                <article class="rounded-control border border-border-muted bg-surface p-4">
                  <p class="type-eyebrow text-ink-muted">Follow-up</p>
                  <p class="mt-2 text-sm font-medium">Return to the conversation with her sister</p>
                  <p class="mt-2 text-xs leading-5 text-ink-secondary">Client noticed she stayed engaged instead of leaving the interaction.</p>
                </article>
              </div>
            </div>

            <div class="mt-5 rounded-control border border-border-muted bg-surface p-4">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="type-eyebrow text-ink-muted">Recent sessions</p>
                  <p class="mt-2 text-sm font-medium">14 Sep · Session summary reviewed</p>
                </div>
                <span class="text-xs font-medium text-action-link">Open summary</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="sessions" class="scroll-mt-24 border-b border-border-muted">
      <div class="mx-auto grid w-full max-w-[1200px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:py-28">
        <div class="order-2 lg:order-1">
          <div class="overflow-hidden rounded-panel border border-border bg-surface-raised shadow-sm">
            <div class="flex items-center gap-2 border-b border-border-muted bg-surface px-4 py-3">
              <span class="rounded-control bg-state-selected px-3 py-2 text-xs font-semibold text-action-link">Session Summary</span>
              <span class="rounded-control px-3 py-2 text-xs font-semibold text-ink-secondary">Clinical Record</span>
            </div>
            <div class="p-5 sm:p-6">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p class="font-serif text-xl font-semibold">Session summary</p>
                  <p class="mt-1 text-xs text-ink-muted">Editable working material · Saved in Client Documents</p>
                </div>
                <div class="flex gap-2">
                  <span class="rounded-control border border-border px-3 py-1.5 text-[11px] font-medium">Edit</span>
                  <span class="rounded-control border border-border px-3 py-1.5 text-[11px] font-medium">Copy summary</span>
                </div>
              </div>

              <article class="mt-5 rounded-control border border-border-muted bg-surface p-5">
                <p class="text-sm font-semibold">Session 14 · 14 September</p>
                <p class="mt-3 text-sm leading-7 text-ink-secondary">
                  The session explored the difference between setting a boundary and withdrawing from connection. Sarah described one recent interaction where she remained in the conversation, named what felt difficult and noticed less urgency to leave.
                </p>
                <p class="mt-4 text-sm leading-7 text-ink-secondary">
                  Possible follow-up: what helped her stay present, and whether that felt different from previous attempts to protect herself.
                </p>
              </article>

              <div class="mt-5 rounded-control border border-state-success/20 bg-state-success-surface p-4">
                <p class="text-sm font-semibold">Clinical Record</p>
                <p class="mt-1 text-xs leading-5 text-ink-secondary">A separate formal record can be reviewed and approved. Once approved, it is protected from ordinary editing and later corrections use amendments.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="order-1 lg:order-2">
          <p class="type-eyebrow text-accent">After the session</p>
          <h2 class="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">The session doesn’t disappear when the call ends.</h2>
          <p class="mt-5 text-base leading-7 text-ink-secondary">
            Bring in transcript material, create an editable Session Summary, shape it in your own voice, and keep formal Clinical Records distinct from working notes.
          </p>
          <p class="mt-5 text-sm leading-6 text-ink-secondary">
            Helios supports the documentation process. You remain responsible for what is clinically meaningful and what belongs in the record.
          </p>
        </div>
      </div>
    </section>

    <section id="continuity" class="scroll-mt-24 border-b border-border-muted bg-surface-elevated">
      <div class="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
        <div class="max-w-3xl">
          <p class="type-eyebrow text-accent">Across sessions</p>
          <h2 class="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">Helios helps you carry the thread forward.</h2>
          <p class="mt-5 text-base leading-7 text-ink-secondary">
            The work changes over time. Helios keeps recent themes, shifts, exceptions and unfinished questions close enough to be useful without deciding what they mean for you.
          </p>
        </div>

        <div class="mt-10 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.15fr] lg:items-stretch">
          <article class="rounded-panel border border-border bg-surface-raised p-5">
            <p class="type-eyebrow text-ink-muted">Session 12</p>
            <p class="mt-3 text-sm font-semibold">Boundary attempts lead to withdrawal</p>
            <p class="mt-2 text-xs leading-5 text-ink-secondary">Client describes leaving conversations when disagreement feels unsafe.</p>
          </article>
          <div class="hidden items-center text-ink-muted lg:flex">→</div>
          <article class="rounded-panel border border-border bg-surface-raised p-5">
            <p class="type-eyebrow text-ink-muted">Session 13</p>
            <p class="mt-3 text-sm font-semibold">An exception appears</p>
            <p class="mt-2 text-xs leading-5 text-ink-secondary">She names discomfort and stays in the conversation for longer.</p>
          </article>
          <div class="hidden items-center text-ink-muted lg:flex">→</div>
          <article class="rounded-panel border border-border bg-surface-raised p-5">
            <p class="type-eyebrow text-ink-muted">Session 14</p>
            <p class="mt-3 text-sm font-semibold">A different response feels possible</p>
            <p class="mt-2 text-xs leading-5 text-ink-secondary">The session explores what made staying present feel safer.</p>
          </article>
          <div class="hidden items-center text-ink-muted lg:flex">→</div>
          <article class="rounded-panel border border-accent/20 bg-accent/5 p-5">
            <p class="type-eyebrow text-accent">Current care focus</p>
            <p class="mt-3 text-sm font-semibold">Boundaries without withdrawal</p>
            <p class="mt-2 text-xs leading-5 text-ink-secondary">A thread to return to, not a conclusion generated for you.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="practice" class="scroll-mt-24 border-b border-border-muted">
      <div class="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
        <div class="grid gap-12 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
          <div>
            <p class="type-eyebrow text-accent">The wider practice</p>
            <h2 class="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">More than an AI notes tool.</h2>
            <p class="mt-5 text-base leading-7 text-ink-secondary">
              Helios is designed as a working home for an individual therapist practice, so the practical parts of the day sit around the clinical work rather than beside it.
            </p>
          </div>

          <div class="grid gap-px overflow-hidden rounded-panel border border-border bg-border sm:grid-cols-2">
            <article class="bg-surface-raised p-6">
              <p class="type-eyebrow text-ink-muted">Calendar</p>
              <h3 class="mt-2 text-base font-semibold">See the working day in context</h3>
              <p class="mt-2 text-sm leading-6 text-ink-secondary">Appointments stay close to the relevant client and session workspace.</p>
            </article>
            <article class="bg-surface-raised p-6">
              <p class="type-eyebrow text-ink-muted">Documents</p>
              <h3 class="mt-2 text-base font-semibold">Keep client material together</h3>
              <p class="mt-2 text-sm leading-6 text-ink-secondary">Session summaries and supporting documents live with the client rather than across separate systems.</p>
            </article>
            <article class="bg-surface-raised p-6">
              <p class="type-eyebrow text-ink-muted">Transcripts</p>
              <h3 class="mt-2 text-base font-semibold">Bring session source material in</h3>
              <p class="mt-2 text-sm leading-6 text-ink-secondary">Paste transcript text, import supported files, or use supported Zoom workflows.</p>
            </article>
            <article class="bg-surface-raised p-6">
              <p class="type-eyebrow text-ink-muted">Connected tools</p>
              <h3 class="mt-2 text-base font-semibold">Work around your existing setup</h3>
              <p class="mt-2 text-sm leading-6 text-ink-secondary">Google Calendar and Zoom can connect directly, with other workflows remaining available where supported.</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section id="reflect" class="border-b border-border-muted bg-surface-elevated">
      <div class="mx-auto grid w-full max-w-[1200px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-28">
        <div>
          <p class="type-eyebrow text-accent">Reflection &amp; supervision</p>
          <h2 class="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">Your work as a therapist has a history too.</h2>
          <p class="mt-5 text-base leading-7 text-ink-secondary">
            Keep private professional reflection and supervision preparation in their own space, separate from client records, while noticing themes in your own practice over time.
          </p>
        </div>

        <div class="overflow-hidden rounded-panel border border-border bg-surface-raised">
          <div class="border-b border-border-muted bg-surface-muted px-5 py-3 text-[11px] font-semibold uppercase tracking-[.12em] text-ink-muted">Supervision &amp; CPD</div>
          <div class="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <article class="rounded-control border border-border-muted bg-surface p-4">
              <p class="type-eyebrow text-ink-muted">Private reflection</p>
              <p class="mt-2 text-sm font-semibold">A pattern I’m noticing in my own work</p>
              <p class="mt-2 text-xs leading-5 text-ink-secondary">Keep professional reflection separate from the formal client record.</p>
            </article>
            <article class="rounded-control border border-accent/20 bg-accent/5 p-4">
              <p class="type-eyebrow text-accent">Supervision preparation</p>
              <p class="mt-2 text-sm font-semibold">Themes to bring to supervision</p>
              <p class="mt-2 text-xs leading-5 text-ink-secondary">Prepare questions and recurring themes without turning private reflection into client documentation.</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section id="trust" class="scroll-mt-24 border-b border-border-muted bg-surface-sidebar text-on-surface-sidebar">
      <div class="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 lg:py-24">
        <div class="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <p class="type-eyebrow text-sidebar-muted">Clinical control</p>
            <h2 class="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">AI assists. You remain the clinician.</h2>
            <p class="mt-5 max-w-xl text-base leading-7 text-sidebar-muted">
              Helios is built to support review, continuity and documentation without quietly converting assistance into a clinical decision.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <article class="rounded-panel border border-white/10 bg-white/5 p-5">
              <p class="text-sm font-semibold">You review clinical material</p>
              <p class="mt-2 text-xs leading-5 text-sidebar-muted">Generated working material is there for you to assess, edit and decide how to use.</p>
            </article>
            <article class="rounded-panel border border-white/10 bg-white/5 p-5">
              <p class="text-sm font-semibold">Session Summaries stay editable</p>
              <p class="mt-2 text-xs leading-5 text-sidebar-muted">Working summaries remain separate from a formal approved Clinical Record.</p>
            </article>
            <article class="rounded-panel border border-white/10 bg-white/5 p-5">
              <p class="text-sm font-semibold">Approved Clinical Records are protected</p>
              <p class="mt-2 text-xs leading-5 text-sidebar-muted">Once approved, later corrections use amendments rather than silently rewriting the original record.</p>
            </article>
            <article class="rounded-panel border border-white/10 bg-white/5 p-5">
              <p class="text-sm font-semibold">Reflection remains separate</p>
              <p class="mt-2 text-xs leading-5 text-sidebar-muted">Private professional reflection is kept apart from client-facing and formal record material.</p>
            </article>
          </div>
        </div>

        <nav class="mt-10 flex flex-wrap gap-5 text-sm font-medium text-sidebar-muted" aria-label="Trust information">
          <router-link to="/privacy" class="hover:text-white">Privacy</router-link>
          <router-link to="/ai-data" class="hover:text-white">AI &amp; data</router-link>
          <router-link to="/terms" class="hover:text-white">Terms</router-link>
          <router-link to="/support" class="hover:text-white">Support</router-link>
        </nav>
      </div>
    </section>

    <section class="border-b border-border-muted bg-surface-raised">
      <div class="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:py-24">
        <div>
          <p class="type-eyebrow text-accent">Built from clinical practice</p>
          <h2 class="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em]">For the realities of therapeutic work.</h2>
          <p class="mt-5 max-w-2xl text-base leading-7 text-ink-secondary">
            Helios is developed through Chrysalis Therapy Services by Robert Ormston, a practising psychotherapist. The product is shaped by continuity, reflection, documentation and professional responsibility as they actually show up in day-to-day practice.
          </p>
        </div>
        <div class="rounded-panel border border-border bg-surface p-6">
          <p class="text-lg font-semibold">Robert Ormston</p>
          <p class="mt-2 text-sm text-ink-secondary">Chrysalis Therapy Services</p>
          <p class="mt-1 text-sm text-ink-secondary">Member of the British Association for Counselling and Psychotherapy (BACP)</p>
        </div>
      </div>
    </section>

    <section class="border-b border-border-muted">
      <div class="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:py-24">
        <div>
          <p class="type-eyebrow text-accent">Simple pricing</p>
          <h2 class="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em]">Try the complete Helios workspace.</h2>
        </div>
        <div class="rounded-panel border border-border bg-surface-raised p-6 sm:p-8">
          <p class="text-2xl font-semibold">30 days free</p>
          <p class="mt-2 text-base text-ink-secondary">£49/month afterwards · Cancel anytime</p>
          <p class="mt-4 text-sm leading-6 text-ink-secondary">Explore the real therapist workspace before deciding whether Helios belongs in your practice.</p>
          <router-link to="/get-started" class="mt-6 inline-flex rounded-control bg-action-primary px-6 py-3 text-sm font-semibold text-on-action hover:bg-action-primary-hover">Create your workspace</router-link>
        </div>
      </div>
    </section>

    <section class="bg-surface-elevated">
      <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div class="max-w-3xl">
          <p class="type-eyebrow text-accent">Helios</p>
          <h2 class="mt-2 font-serif text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Spend more attention on the client, and less on reconstructing the work.</h2>
        </div>
        <router-link to="/get-started" class="w-fit rounded-control bg-action-primary px-6 py-3 text-sm font-semibold text-on-action hover:bg-action-primary-hover">Create your workspace</router-link>
      </div>
    </section>

    <footer class="border-t border-border-muted bg-surface-raised">
      <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-5 py-10 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div class="flex items-center gap-3">
            <svg class="h-8 w-8 text-accent" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <path d="M9 31h30" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M15 31a9 9 0 0 1 18 0" stroke="currentColor" stroke-width="2"/>
              <path d="M24 8v7M9.5 14.5l5 5M38.5 14.5l-5 5M5 26h7M36 26h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span class="text-lg font-semibold">Helios</span>
          </div>
          <p class="mt-3 text-sm text-ink-secondary">A therapist workspace built around continuity, reflection and clinical responsibility.</p>
        </div>

        <div class="lg:text-right">
          <nav class="flex flex-wrap gap-5 text-sm text-ink-secondary lg:justify-end" aria-label="Legal and support">
            <router-link to="/privacy" class="hover:text-ink">Privacy</router-link>
            <router-link to="/terms" class="hover:text-ink">Terms</router-link>
            <router-link to="/ai-data" class="hover:text-ink">AI &amp; data</router-link>
            <router-link to="/support" class="hover:text-ink">Support</router-link>
          </nav>
          <p class="mt-4 text-xs text-ink-muted">© {{ new Date().getFullYear() }} Helios. Built by therapists, for therapists.</p>
        </div>
      </div>
    </footer>
  </main>
</template>
