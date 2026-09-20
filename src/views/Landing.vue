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
      <div class="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 md:py-10 lg:px-10">
        <div class="grid gap-10 md:grid-cols-[320px_minmax(0,1fr)] md:items-start md:gap-6 lg:grid-cols-[380px_minmax(0,680px)] lg:gap-14">
          <div class="min-w-0 pt-1">
            <p class="type-eyebrow text-accent">Continuity &amp; reflection for therapists</p>

            <h1 class="mt-5 max-w-[340px] font-serif text-[3rem] font-semibold leading-[.98] tracking-[-0.04em] sm:text-[3.5rem] lg:max-w-[380px] lg:text-[4rem]">
              Less to hold in your head. More space for the work that matters.
            </h1>

            <p class="mt-7 max-w-[330px] text-[15px] leading-6 text-ink-secondary lg:max-w-[380px]">
              Helios is a continuity and reflection system for therapists. It connects sessions, reflections and the developing work over time.
            </p>

            <p class="mt-5 max-w-[330px] text-sm leading-6 text-ink-secondary lg:max-w-[380px]">
              AI carries more of the remembering, organising and synthesis — so you can prepare faster, notice what’s changing, and bring better material into supervision.
            </p>

            <div class="mt-7 flex flex-wrap items-center gap-3">
              <router-link to="/get-started" class="rounded-control bg-[#061E29] px-4 py-2 text-sm font-semibold text-[#F4F0E7] hover:bg-[#1D546D]">
                Create your workspace
              </router-link>
            </div>

            <p class="mt-5 max-w-[340px] text-[10px] leading-4 text-ink-muted">
              Private therapist workspace · Database-level access controls · Built for individual practice
            </p>
          </div>

          <div id="product-tour" class="min-w-0 scroll-mt-24" aria-label="Representative Helios therapist workspace">
            <a href="#product-tour" class="mb-2 inline-block text-sm font-semibold text-accent underline-offset-4 hover:underline">
              See Helios in action →
            </a>
            <div class="mx-auto w-full max-w-[680px] overflow-hidden rounded-[18px] border border-border bg-[#FBF8F2] shadow-[0_18px_55px_rgba(32,36,31,.14)]">
              <div class="flex h-11 items-center justify-between border-b border-white/10 bg-[#061E29] px-4 text-[10px] text-[#9BB5C0]">
                <div class="flex items-center gap-1.5">
                  <span class="h-1.5 w-1.5 rounded-full bg-[#9BB5C0]"></span>
                  <span class="h-1.5 w-1.5 rounded-full bg-[#9BB5C0]"></span>
                  <span class="h-1.5 w-1.5 rounded-full bg-[#9BB5C0]"></span>
                </div>
                <span class="font-semibold text-[#F4F0E7]">Helios · Continuity</span>
                <span>● Private</span>
              </div>

              <div class="grid min-h-[400px] sm:grid-cols-[152px_minmax(0,1fr)] md:grid-cols-[104px_minmax(0,1fr)] lg:grid-cols-[152px_minmax(0,1fr)]">
                <aside class="hidden bg-[#061E29] p-4 text-[#F4F0E7] sm:block md:p-2 lg:p-4">
                  <div class="mb-5 flex items-center gap-2 px-1">
                    <span class="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">H</span>
                    <span class="text-xs font-semibold">helios</span>
                  </div>

                  <nav class="space-y-1 text-[11px]" aria-label="Representative workspace navigation">
                    <div class="px-2.5 py-2 text-[#9BB5C0]">Today</div>
                    <div class="rounded-control border-l-2 border-[#C9774A] bg-[#1D546D] px-2.5 py-2 font-semibold text-white">Clients</div>
                    <div class="px-2.5 py-2 text-[#9BB5C0]">Calendar</div>
                    <div class="px-2.5 py-2 text-[#9BB5C0]">Sessions</div>
                    <div class="px-2.5 py-2 text-[#9BB5C0]">Transcripts</div>
                    <div class="px-2.5 py-2 text-[#9BB5C0]">Documents</div>
                    <div class="px-2.5 py-2 text-[#9BB5C0]">Reflect</div>
                  </nav>

                  <div class="mt-5 rounded-control bg-white/5 p-2.5">
                    <p class="text-[9px] font-semibold uppercase tracking-[.12em] text-[#9BB5C0]">Up next</p>
                    <p class="mt-1.5 text-[10px] font-semibold">Sarah M. · 10:00</p>
                  </div>
                </aside>

                <div class="min-w-0 bg-[#FBF8F2] p-5 md:p-3 lg:p-5">
                  <div class="flex flex-wrap items-start justify-between gap-3 border-b border-border-muted pb-4">
                    <div>
                      <p class="text-[9px] font-semibold uppercase tracking-[.12em] text-accent">Upcoming client</p>
                      <p class="mt-1 font-serif text-[22px] font-semibold leading-tight">Sarah M. · 10:00</p>
                      <p class="mt-2 text-[10px] text-ink-secondary">Current thread: Boundaries without withdrawal</p>
                    </div>
                    <span class="rounded-control bg-[#E8F0F2] px-2.5 py-1.5 text-[9px] font-semibold text-accent">Next session</span>
                  </div>

                  <div class="mt-4 grid gap-3 sm:grid-cols-2">
                    <article class="rounded-control border border-border-muted bg-white/40 p-3.5">
                      <p class="text-[9px] font-semibold uppercase tracking-[.1em] text-ink-muted">Latest session</p>
                      <p class="mt-1.5 text-xs font-semibold">Session 13</p>
                      <p class="mt-1 text-[10px] text-ink-secondary">Transcript attached</p>
                    </article>

                    <article class="rounded-control border border-accent/20 bg-[#E8F0F2] p-3.5">
                      <p class="text-[9px] font-semibold uppercase tracking-[.1em] text-accent">Session summary</p>
                      <p class="mt-1.5 text-xs font-semibold">Ready to review</p>
                      <p class="mt-1 text-[10px] text-ink-secondary">New material connected</p>
                    </article>
                  </div>

                  <article class="mt-4 rounded-control border border-[#C9774A]/40 bg-[#061E29] p-4 text-[#F4F0E7]">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="text-[9px] font-semibold uppercase tracking-[.11em] text-[#C9774A]">Continuity engine</p>
                      <span class="text-[9px] text-[#9BB5C0]">For therapist consideration</span>
                    </div>

                    <div class="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] text-[#9BB5C0]">
                      <span>Session 12</span><span>→</span><span>Session 13</span><span>→</span><span>Reflection</span><span>→</span><span>Current pattern</span>
                    </div>

                    <p class="mt-3 font-serif text-[18px] font-semibold leading-[1.15]">
                      Possible recurring pattern: a pull to rescue when clients become distant.
                    </p>

                    <p class="mt-2 text-[10px] text-[#9BB5C0]">For therapist consideration — not a conclusion.</p>
                  </article>

                  <div class="mt-4 grid gap-3 sm:grid-cols-2">
                    <article class="rounded-control border border-border-muted bg-white/40 p-3">
                      <p class="text-[9px] font-semibold uppercase tracking-[.1em] text-ink-muted">Documents / record</p>
                      <p class="mt-1 text-[10px] font-medium text-ink">Session Summary · Clinical Record</p>
                    </article>

                    <article class="rounded-control border border-border-muted bg-[#F4F0E7] p-3">
                      <p class="text-[9px] font-semibold uppercase tracking-[.1em] text-ink-muted">Reflect</p>
                      <p class="mt-1 text-[10px] font-medium text-ink">Why did I feel an urge to reassure here?</p>
                    </article>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="clients" class="scroll-mt-24 border-b border-border-muted bg-surface-elevated">
      <div class="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 lg:pb-28 lg:pt-20">
        <div class="max-w-3xl">
          <p class="type-eyebrow text-accent">The Clinical Workspace</p>
          <h2 class="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">The whole thread of the work, in one place.</h2>
          <p class="mt-5 max-w-2xl text-base leading-7 text-ink-secondary">
            Helios brings sessions, transcripts, documents, follow-ups and the developing clinical picture into one workspace — so you can return to a client without rebuilding the story from memory.
          </p>
        </div>

        <figure class="mt-10">
          <div class="overflow-hidden rounded-panel border border-border bg-surface-canvas shadow-sm md:grid md:grid-cols-[144px_minmax(0,1fr)] lg:grid-cols-[176px_minmax(0,1fr)]" aria-label="Representative client workspace for Sarah M.">
            <aside class="bg-sidebar p-4 text-sidebar-fg sm:p-5">
              <p class="font-serif text-2xl font-semibold">Helios</p>
              <div class="mt-4 flex flex-wrap gap-2 text-xs md:mt-8 md:block md:space-y-2" aria-label="Illustrative application navigation">
                <p class="px-3 py-2 text-sidebar-muted">Today</p>
                <p class="rounded-control bg-accent px-3 py-2 font-semibold">Clients</p>
                <p class="px-3 py-2 text-sidebar-muted">Calendar</p>
                <p class="px-3 py-2 text-sidebar-muted">Reflect</p>
              </div>
              <div class="mt-8 hidden border-t border-sidebar-border pt-5 md:block">
                <p class="text-[10px] font-semibold uppercase tracking-[.12em] text-sidebar-muted">Current client</p>
                <p class="mt-3 text-sm font-semibold">Sarah M.</p>
                <p class="mt-1 text-xs text-sidebar-muted">Client workspace</p>
              </div>
            </aside>

            <div class="min-w-0">
              <div class="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface-raised p-5 sm:px-6">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-avatar text-sm font-semibold">SM</div>
                  <div>
                    <p class="font-serif text-2xl font-semibold">Sarah M.</p>
                    <p class="mt-1 text-xs text-ink-secondary">Next appointment · Tue 10:00</p>
                  </div>
                </div>
                <span class="rounded-control bg-accent px-3 py-2 text-xs font-semibold text-on-action">Clinical Workspace</span>
              </div>

              <div class="p-4 sm:p-6">
                <h3 class="font-serif text-2xl font-semibold">Before next session</h3>
                <div class="mt-4 border-l-4 border-accent bg-state-selected p-4">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <p class="text-sm font-semibold text-accent">Current focus</p>
                    <span class="text-[11px] text-ink-secondary">Therapist note · For consideration</span>
                  </div>
                  <p class="mt-2 text-sm leading-6">Return to what helped Sarah stay present when she expressed disagreement.</p>
                </div>

                <div class="mt-5 grid gap-5 lg:grid-cols-2">
                  <div class="border-t border-border pt-4">
                    <p class="text-sm font-semibold">Aims and objectives</p>
                    <p class="mt-2 text-sm leading-6 text-ink-secondary">Develop ways to express a boundary while staying in connection.</p>
                  </div>
                  <div class="border-t border-border pt-4">
                    <p class="text-sm font-semibold">Follow-ups</p>
                    <div class="mt-2 flex items-start gap-3">
                      <span class="mt-1 h-3.5 w-3.5 shrink-0 rounded-sm border border-border-strong" aria-hidden="true"></span>
                      <p class="text-sm leading-6 text-ink-secondary">Return to the conversation with her sister.</p>
                    </div>
                  </div>
                </div>

                <div class="mt-6 border-y border-border bg-surface-raised">
                  <h3 class="px-4 pt-4 font-serif text-xl font-semibold">Recent sessions</h3>
                  <div class="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border-muted px-4 py-3">
                    <div>
                      <p class="text-sm font-semibold">14 Sep · Session 14</p>
                      <p class="mt-1 text-xs text-ink-secondary">Session Summary · Editable working material</p>
                    </div>
                    <div class="flex flex-wrap gap-4 text-xs font-semibold text-accent"><span>Open summary →</span><span>Transcript</span></div>
                  </div>
                  <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border-muted px-4 py-3">
                    <div>
                      <p class="text-sm font-semibold">7 Sep · Session 13</p>
                      <p class="mt-1 text-xs text-ink-secondary">Session Summary · Saved in Client Documents</p>
                    </div>
                    <div class="flex flex-wrap gap-4 text-xs font-semibold text-accent"><span>Open summary →</span><span>Transcript</span></div>
                  </div>
                  <div class="border-t border-border-muted px-4 py-3 text-xs leading-5 text-ink-secondary">
                    <span class="font-semibold text-accent">Session workspace → Clinical Record</span>
                    <p class="mt-1">Separate from the editable summary. Approved records are read-only; corrections use amendments.</p>
                  </div>
                </div>

                <div class="mt-6">
                  <h3 class="type-eyebrow text-ink-muted">Supporting material</h3>
                  <div class="mt-3 grid gap-4 sm:grid-cols-2">
                    <div class="border-t border-border pt-3">
                      <p class="text-sm font-semibold">Documents</p>
                      <p class="mt-1 text-xs leading-5 text-ink-secondary">Session summaries, letters and reports</p>
                    </div>
                    <div class="border-t border-border pt-3">
                      <p class="text-sm font-semibold">Transcripts</p>
                      <p class="mt-1 text-xs leading-5 text-ink-secondary">Original source material linked to this client</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <figcaption class="mt-3 text-xs leading-5 text-ink-muted">Illustrative client workspace. Clinical material remains for the therapist to review and interpret.</figcaption>
        </figure>
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

    <section id="reflect" class="border-b border-border-muted bg-[#E8F0F2]">
      <div class="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
        <div class="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <p class="type-eyebrow text-accent">Reflection &amp; supervision</p>
            <h2 class="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">Think across the work, not only one session at a time.</h2>
            <p class="mt-5 text-base leading-7 text-ink-secondary">
              Reflection is a core part of Helios. The continuity engine can bring together themes, sequences, shifts and recurring relational patterns across sessions and your own reflections, giving you more to think with and less to reconstruct from memory.
            </p>
            <p class="mt-4 text-sm leading-6 text-ink-secondary">
              That can reduce cognitive load between sessions and help make the work more sustainable over time.
            </p>
          </div>

          <div class="overflow-hidden rounded-panel border border-accent/20 bg-surface-raised shadow-sm">
            <div class="flex items-center justify-between border-b border-border-muted bg-[#061E29] px-5 py-3 text-[#F4F0E7]">
              <span class="text-[11px] font-semibold uppercase tracking-[.12em]">Supervision &amp; CPD</span>
              <span class="text-[10px] text-[#9BB5C0]">Prepared before the meeting</span>
            </div>
            <div class="p-5 sm:p-6">
              <article class="rounded-control border border-accent/20 bg-accent/5 p-5">
                <p class="type-eyebrow text-accent">Supervision preparation</p>
                <p class="mt-2 text-base font-semibold">Arrive at supervision already prepared.</p>
                <p class="mt-2 text-sm leading-6 text-ink-secondary">
                  Bring forward recurring themes, unresolved questions, possible transference dynamics and patterns across the work so less of the session is spent reconstructing the story and more can be spent on the meat of supervision.
                </p>
              </article>

              <div class="mt-4 grid gap-4 sm:grid-cols-2">
                <article class="rounded-control border border-border-muted bg-surface p-4">
                  <p class="type-eyebrow text-ink-muted">Across reflections</p>
                  <p class="mt-2 text-sm font-semibold">A recurring pull to rescue</p>
                  <p class="mt-2 text-xs leading-5 text-ink-secondary">A pattern appears across several reflections and can be explored rather than rediscovered.</p>
                </article>
                <article class="rounded-control border border-border-muted bg-surface p-4">
                  <p class="type-eyebrow text-ink-muted">For supervision</p>
                  <p class="mt-2 text-sm font-semibold">What changes when the client becomes distant?</p>
                  <p class="mt-2 text-xs leading-5 text-ink-secondary">Helios surfaces the sequence for you and your supervisor to consider together.</p>
                </article>
              </div>

              <p class="mt-4 text-xs leading-5 text-ink-muted">
                Helios can surface possibilities and patterns; interpretation remains with you and your supervisor.
              </p>
            </div>
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
