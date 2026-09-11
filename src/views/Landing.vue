<template>
  <main class="min-h-screen bg-surface-canvas text-ink helios-teal-prototype">
    <header class="border-b border-border-muted bg-surface-canvas">
      <div class="mx-auto flex w-full max-w-[1540px] items-center justify-between px-5 py-4 sm:px-8 xl:px-12">
        <router-link to="/" class="flex items-center gap-3" aria-label="Helios home">
          <svg class="h-9 w-9 text-accent" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M9 31h30" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M15 31a9 9 0 0 1 18 0" stroke="currentColor" stroke-width="2"/>
            <path d="M24 8v7M9.5 14.5l5 5M38.5 14.5l-5 5M5 26h7M36 26h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span class="text-xl font-semibold tracking-[-0.02em]">Helios</span>
        </router-link>
        <nav class="hidden items-center gap-7 text-sm font-medium text-ink-secondary lg:flex" aria-label="Landing page sections">
          <a href="#clients" class="hover:text-ink">Clients</a>
          <a href="#sessions" class="hover:text-ink">Sessions</a>
          <a href="#continuity" class="hover:text-ink">Continuity</a>
          <a href="#integrations" class="hover:text-ink">Integrations</a>
          <a href="#reflect" class="hover:text-ink">Reflect</a>
        </nav>
        <nav class="flex items-center gap-2" aria-label="Account access">
          <router-link to="/sign-in" class="rounded-control px-4 py-2 text-sm font-semibold text-ink-secondary hover:bg-surface-muted hover:text-ink">Sign in</router-link>
          <router-link to="/get-started" class="rounded-control bg-action-primary px-4 py-2 text-sm font-semibold text-on-action hover:bg-action-primary-hover">Get started</router-link>
        </nav>
      </div>
    </header>

    <section class="overflow-hidden border-b border-border-muted">
      <div class="mx-auto w-full max-w-[1540px] px-5 pt-8 sm:px-8 lg:pt-10 xl:px-12">
        <div class="grid items-end gap-7 lg:grid-cols-[minmax(0,0.72fr)_minmax(420px,0.48fr)] xl:grid-cols-[minmax(0,0.8fr)_minmax(460px,0.42fr)]">
          <div class="max-w-[820px] pb-1">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Psychotherapy practice</p>
            <h1 class="mt-4 max-w-[820px] text-[3rem] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-[3.5rem] lg:text-[3.8rem] xl:text-[4.1rem]">See your clients. Helios remembers what matters.</h1>
          </div>
          <div class="pb-2 lg:pb-1">
            <p class="max-w-[520px] text-base leading-7 text-ink-secondary">A calm workspace for sessions, continuity and clinical understanding — without the administrative weight of a traditional EHR.</p>
            <p class="mt-3 max-w-[520px] text-sm leading-6 text-ink-secondary">Spend less time rebuilding context between sessions. Helios keeps notes, summaries, transcripts and the developing clinical picture together around each client.</p>
            <div class="mt-5 flex flex-wrap gap-3">
              <router-link to="/get-started" class="rounded-control bg-action-primary px-5 py-3 text-sm font-semibold text-on-action hover:bg-action-primary-hover">Get started</router-link>
              <a href="#platform" class="rounded-control border border-border px-5 py-3 text-sm font-semibold text-ink-secondary hover:bg-surface-muted hover:text-ink">See how Helios works</a>
            </div>
          </div>
        </div>
        <div class="mt-7 lg:-mr-12 xl:mt-8" aria-label="Representative Helios therapist workspace">
          <div class="overflow-hidden rounded-tl-panel border border-b-0 border-border bg-surface-raised">
            <div class="flex h-10 items-center justify-between border-b border-border-muted bg-surface-muted px-4 text-[11px] text-ink-muted">
              <div class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-accent"></span>
                <span class="font-semibold text-ink-secondary">Helios workspace</span>
              </div>
              <span>Monday · 7 September</span>
            </div>
            <div class="grid min-h-[430px] grid-cols-[148px_minmax(0,1fr)] lg:grid-cols-[170px_minmax(0,1fr)]">
              <aside class="border-r border-border-muted bg-surface-sidebar p-3 lg:p-4 text-on-surface-sidebar">
                <div class="mb-4 flex items-center gap-2 border-b border-border-muted pb-4">
                  <span class="flex h-8 w-8 items-center justify-center rounded-control bg-accent/20 text-accent text-lg">☼</span>
                  <div>
                    <p class="text-xs font-semibold text-on-surface-sidebar">Practice</p>
                    <p class="text-[10px] text-on-surface-sidebar/60">Workspace</p>
                  </div>
                </div>
                <nav class="space-y-0.5 text-xs" aria-label="Representative workspace navigation">
                  <div class="rounded-control bg-accent/20 px-3 py-2 font-semibold text-accent">Today</div>
                  <div class="px-3 py-2 text-on-surface-sidebar/70">Clients</div>
                  <div class="px-3 py-2 text-on-surface-sidebar/70">Calendar</div>
                  <div class="px-3 py-2 text-on-surface-sidebar/70">Reflect</div>
                </nav>
                <div class="mt-5 border-t border-border-muted pt-4 text-[10px] leading-4 text-on-surface-sidebar/50">
                  <p class="font-semibold uppercase tracking-[0.12em]">Connected</p>
                  <p class="mt-2">Google Calendar</p>
                  <p>Zoom</p>
                </div>
              </aside>
              <div class="min-w-0 bg-surface-raised">
                <div class="flex items-center justify-between border-b border-border-muted px-5 py-3 lg:px-6 text-ink">
                  <div>
                    <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Today</p>
                    <p class="mt-0.5 text-lg font-semibold">Good morning. Here’s what matters today.</p>
                  </div>
                </div>
                <div class="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(250px,.72fr)] lg:p-5">
                  <section class="min-w-0">
                    <div class="flex items-center justify-between">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Next client</p>
                    </div>
                    <div class="mt-2 overflow-hidden rounded-control border border-border-muted bg-surface">
                      <div class="px-3 py-3 border-b border-border-muted">
                        <div class="flex items-center justify-between">
                          <p class="text-xs font-semibold">Client B · 11:30</p>
                          <span class="text-[10px] text-accent font-medium">Continuity cue available</span>
                        </div>
                        <p class="mt-1.5 text-[11px] text-ink-secondary leading-relaxed">Recent thread: Avoidance in professional relationships. A shift emerged last session.</p>
                      </div>
                      <div class="px-3 py-2.5 flex items-center justify-between bg-surface-muted/30">
                        <span class="rounded-control bg-action-primary px-2 py-0.5 text-[10px] font-medium text-white">Prepare</span>
                      </div>
                    </div>
                    <div class="mt-4 article rounded-control border border-border-muted bg-surface p-3">
                      <p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Recent development</p>
                      <p class="mt-2 text-xs font-medium text-ink">Therapeutic focus has shifted toward autonomy</p>
                      <p class="mt-1 text-[10px] text-ink-secondary leading-relaxed">Themes: Autonomy, boundaries, self-regulation.</p>
                    </div>
                  </section>
                  <section class="space-y-3">
                    <article class="rounded-control border border-border-muted bg-surface p-3">
                      <p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Zoom notes</p>
                      <p class="mt-2 text-xs font-medium">1 note needs matching</p>
                      <p class="mt-1 text-[10px] leading-4 text-ink-muted">Source material ready to assign to client context.</p>
                    </article>
                    <article class="rounded-control border border-accent/20 bg-accent/5 p-3">
                      <p class="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">Clinical understanding</p>
                      <p class="mt-2 text-xs font-medium text-ink">Unfinished thread from Client A</p>
                      <p class="mt-1 text-[10px] leading-4 text-ink-secondary">Exception noted during reflection.</p>
                    </article>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="platform" class="scroll-mt-6 border-b border-border-muted bg-surface-raised">
      <div class="mx-auto grid w-full max-w-[1540px] px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 xl:px-12">
        <div class="border-b border-border-muted py-6 sm:border-r lg:border-b-0 lg:pr-6 text-ink">
          <p class="type-eyebrow text-accent">Client continuity</p>
          <p class="mt-2 text-sm text-ink-secondary">The relevant thread stays with the client across sessions.</p>
        </div>
        <div class="border-b border-border-muted py-6 sm:pl-6 lg:border-b-0 lg:border-r lg:pr-6 text-ink">
          <p class="type-eyebrow text-accent">Session understanding</p>
          <p class="mt-2 text-sm text-ink-secondary">Turn a session into thoughtful, editable material you can actually use.</p>
        </div>
        <div class="border-b border-border-muted py-6 sm:border-b-0 sm:border-r lg:pl-6 lg:pr-6 text-ink">
          <p class="type-eyebrow text-accent">Contextual capture</p>
          <p class="mt-2 text-sm text-ink-secondary">Zoom notes and transcripts return to the relevant client context.</p>
        </div>
        <div class="py-6 sm:pl-6 text-ink">
          <p class="type-eyebrow text-accent">Therapist judgement</p>
          <p class="mt-2 text-sm text-ink-secondary">Helios surfaces possibilities. You decide what they mean.</p>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 lg:py-20 text-ink">
      <div class="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:gap-16">
        <div>
          <p class="type-eyebrow text-accent">Practice flow</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Continuity across the therapist’s day.</h2>
          <p class="mt-4 type-body-long text-ink-secondary">Helios keeps the client relationship in view before, after and across sessions.</p>
        </div>
        <div class="grid gap-px overflow-hidden rounded-panel border border-border bg-border sm:grid-cols-2">
          <article class="bg-surface-raised p-6">
            <p class="type-eyebrow text-ink-muted">Before the session</p>
            <h3 class="mt-2 type-subsection">Continuity cue</h3>
            <p class="mt-3 type-body text-ink-secondary">See the recent thread, current focus and anything unfinished.</p>
          </article>
          <article class="bg-surface-raised p-6">
            <p class="type-eyebrow text-ink-muted">After the session</p>
            <h3 class="mt-2 type-subsection">Session Summaries</h3>
            <p class="mt-3 type-body text-ink-secondary">Turn source material into an editable Session Summary you can review and use.</p>
          </article>
          <article class="bg-surface-raised p-6">
            <p class="type-eyebrow text-ink-muted">Across sessions</p>
            <h3 class="mt-2 type-subsection">Longitudinal themes</h3>
            <p class="mt-3 type-body text-ink-secondary">Keep themes, shifts, exceptions and unfinished threads visible over time.</p>
          </article>
          <article class="bg-surface-raised p-6">
            <p class="type-eyebrow text-ink-muted">For your practice</p>
            <h3 class="mt-2 type-subsection">Private reflection</h3>
            <p class="mt-3 type-body text-ink-secondary">Reflect on recurring themes in your own work, separate from the client record.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="clients" class="scroll-mt-6 border-y border-border-muted bg-surface-elevated text-ink">
      <div class="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 lg:py-20">
        <div class="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p class="type-eyebrow text-accent">Client-centred workspace</p>
            <h2 class="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">The client stays at the centre.</h2>
            <p class="mt-4 type-body-long text-ink-secondary">The client is the long-running workspace. Sessions add to a developing picture rather than becoming separate pieces of admin.</p>
            <div class="mt-8 grid grid-cols-2 gap-4">
              <div>
                <p class="font-semibold text-sm">Overview</p>
                <p class="text-xs text-ink-secondary mt-1">Current focus and recent threads.</p>
              </div>
              <div>
                <p class="font-semibold text-sm">Sessions</p>
                <p class="text-xs text-ink-secondary mt-1">Chronological history of work.</p>
              </div>
              <div>
                <p class="font-semibold text-sm">Insights</p>
                <p class="text-xs text-ink-secondary mt-1">Recurring themes and shifts.</p>
              </div>
              <div>
                <p class="font-semibold text-sm">Files</p>
                <p class="text-xs text-ink-secondary mt-1">Supporting clinical material.</p>
              </div>
            </div>
          </div>
          <div class="rounded-panel border border-border bg-surface shadow-sm overflow-hidden">
             <div class="bg-surface-muted border-b border-border px-4 py-2 text-[10px] font-medium text-ink-muted uppercase tracking-wider">Client Workspace · Overview</div>
             <div class="p-6">
                <div class="flex items-center gap-3 mb-6 text-ink">
                  <div class="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold">JD</div>
                  <div>
                    <p class="font-semibold">Jane Doe</p>
                    <p class="text-[11px] text-ink-muted italic leading-none mt-0.5">Therapy since March 2026</p>
                  </div>
                </div>
                <div class="space-y-4">
                  <div class="p-3 rounded-control bg-surface-muted/50 border border-border-muted/50 text-ink">
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1">Therapeutic Focus</p>
                    <p class="text-xs">Developing agency in self-regulation and interpersonal boundaries.</p>
                  </div>
                  <div class="p-3 rounded-control border border-border-muted/50 text-ink">
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1">Recent Continuity Thread</p>
                    <p class="text-xs text-ink-secondary leading-relaxed">Shifting from external validation toward internal markers of safety. Exception noted in session #12.</p>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </section>

    <section id="sessions" class="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 lg:py-20 text-ink">
      <div class="grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
        <div class="order-2 lg:order-1">
          <div class="rounded-panel border border-border bg-surface-raised p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-accent">Session Summary</p>
              <span class="text-[10px] text-ink-muted">Editable Draft</span>
            </div>
            <div class="space-y-3 font-serif">
              <p class="text-sm font-semibold">Summary of session #14</p>
              <p class="text-xs leading-relaxed text-ink-secondary">We explored the tension between your desire for connection and the fear of vulnerability. You noticed that when you feel unheard, you tend to withdraw rather than state your needs directly...</p>
              <p class="text-[11px] italic text-ink-muted mt-4 border-t border-border pt-3 text-ink">"A clear summary of what you explored together, ready for your therapist to review and edit."</p>
            </div>
            <div class="mt-6 flex justify-end gap-2">
              <span class="rounded-control border border-border px-3 py-1 text-[10px] font-medium">Edit Summary</span>
              <span class="rounded-control bg-accent px-3 py-1 text-[10px] font-medium text-white">Review & Copy</span>
            </div>
          </div>
        </div>
        <div class="order-1 lg:order-2">
          <p class="type-eyebrow text-accent">Session understanding</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">From a session to something genuinely useful.</h2>
          <p class="mt-4 type-body-long text-ink-secondary">Helios can turn session source material into a thoughtful client-facing Session Summary. You review and edit it before deciding how to use it.</p>
          <ul class="mt-6 space-y-3 text-sm text-ink-secondary">
            <li class="flex items-start gap-2">
              <span class="text-accent mt-0.5">·</span>
              <span>Review a clinically thoughtful summary</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-accent mt-0.5">·</span>
              <span>Edit it in your therapeutic voice</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-accent mt-0.5">·</span>
              <span>Copy it deliberately when you are ready</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section id="continuity" class="border-y border-border-muted bg-surface-elevated text-ink">
      <div class="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 lg:py-20">
        <div class="max-w-3xl">
          <p class="type-eyebrow text-accent">Longitudinal view</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Notice what is changing across therapy.</h2>
          <p class="mt-4 type-body-long text-ink-secondary">Helios can bring recurring themes, shifts, exceptions and unfinished threads back into view across sessions — while keeping interpretation and clinical judgement with you.</p>
        </div>
        <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <article class="p-6 rounded-panel bg-surface-raised border border-border text-ink">
            <h3 class="font-semibold text-sm">Themes & Shifts</h3>
            <p class="mt-2 text-xs text-ink-secondary leading-relaxed">Notice recurring patterns and the moments when something genuinely changes.</p>
          </article>
          <article class="p-6 rounded-panel bg-surface-raised border border-border text-ink">
            <h3 class="font-semibold text-sm">Unfinished Threads</h3>
            <p class="mt-2 text-xs text-ink-secondary leading-relaxed">Bring forward questions and exceptions that might otherwise be lost.</p>
          </article>
          <article class="p-6 rounded-panel bg-surface-raised border border-border text-ink">
             <h3 class="font-semibold text-sm">Provisional Observations</h3>
             <p class="mt-2 text-xs text-ink-secondary leading-relaxed">Helios surfaces possibilities for you to evaluate. Interpretation remains yours.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="capture" class="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 lg:py-20 text-ink">
      <div class="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
        <div>
          <p class="type-eyebrow text-accent">Source material</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Your session happens where therapy happens.</h2>
          <p class="mt-4 type-body-long text-ink-secondary">Bring source material back into the relevant client and session context through Zoom, file import or pasted text.</p>
        </div>
        <div class="grid gap-3">
          <div class="grid grid-cols-[110px_minmax(0,1fr)] items-center rounded-control border border-border-muted bg-surface-raised p-4">
            <p class="text-sm font-semibold text-ink">Zoom</p>
            <p class="text-sm text-ink-secondary">Supported Zoom and My Notes transcripts return to the relevant client context.</p>
          </div>
          <div class="grid grid-cols-[110px_minmax(0,1fr)] items-center rounded-control border border-border-muted bg-surface-raised p-4 text-ink">
            <p class="text-sm font-semibold">Flexible Import</p>
            <p class="text-sm text-ink-secondary">Import .vtt/.txt files or paste transcript text from other settings.</p>
          </div>
          <div class="grid grid-cols-[110px_minmax(0,1fr)] items-center rounded-control border border-accent/20 bg-accent/5 p-4 text-ink">
            <p class="text-sm font-semibold text-accent">Contextual</p>
            <p class="text-sm text-ink-secondary">Captured material stays with the client rather than becoming another admin destination.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="integrations" class="scroll-mt-6 border-y border-border-muted bg-surface-elevated text-ink">
      <div class="mx-auto w-full max-w-[1200px] px-5 py-16 sm:px-8 text-ink">
        <div class="max-w-3xl">
          <p class="type-eyebrow text-accent">Connected practice</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Helios sits around the tools you already use.</h2>
          <p class="mt-4 type-body-long text-ink-secondary">Scheduling and video systems support your professional context instead of creating more technology layers to manage.</p>
        </div>
        <div class="mt-9 grid gap-px overflow-hidden rounded-panel border border-border bg-border md:grid-cols-3">
          <article class="bg-surface-raised p-6">
            <p class="type-eyebrow text-ink-muted">Google Calendar</p>
            <h3 class="mt-2 type-subsection">Schedule in context</h3>
            <p class="mt-3 type-body text-ink-secondary">Bring calendar events into the working day so preparation and follow-through stay close to the relevant work.</p>
          </article>
          <article class="bg-surface-raised p-6">
            <p class="type-eyebrow text-ink-muted">Zoom</p>
            <h3 class="mt-2 type-subsection">Contextual capture</h3>
            <p class="mt-3 type-body text-ink-secondary">Connect video consultations and bring supported Zoom transcript workflows back into the client workspace.</p>
          </article>
          <article class="bg-surface-raised p-6">
            <p class="type-eyebrow text-ink-muted">Calendly</p>
            <h3 class="mt-2 type-subsection">Secure connection</h3>
            <p class="mt-3 type-body text-ink-secondary">Connect your Calendly account securely. Broader booking synchronisation is still developing.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="reflect" class="mx-auto w-full max-w-[1200px] scroll-mt-6 px-5 py-16 sm:px-8 lg:py-20 text-ink">
      <div class="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p class="type-eyebrow text-accent">Professional development</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Your own work deserves continuity too.</h2>
          <p class="mt-4 type-body-long text-ink-secondary">Keep private reflection and supervision preparation in their own professional space, separate from client records.</p>
        </div>
        <div class="grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-border bg-border text-ink">
          <div class="bg-surface-raised p-5">
            <p class="font-semibold text-sm">Reflection</p>
            <p class="mt-1 text-xs text-ink-muted">Private therapist reflection for your clinical thoughts.</p>
          </div>
          <div class="bg-surface-raised p-5 text-ink">
            <p class="font-semibold text-sm">Supervision</p>
            <p class="mt-1 text-xs text-ink-muted">Prepare for professional supervision.</p>
          </div>
          <div class="bg-surface-raised p-5 text-ink">
            <p class="font-semibold text-sm">Themes</p>
            <p class="mt-1 text-xs text-ink-muted">See themes you have recorded recur across your reflections.</p>
          </div>
          <div class="bg-surface-raised p-5 text-ink">
            <p class="font-semibold text-sm">Privacy</p>
            <p class="mt-1 text-xs text-ink-muted">Kept separate from client records.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="trust" class="scroll-mt-6 border-y border-border-muted bg-surface-raised text-ink">
      <div class="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8">
        <div class="max-w-3xl">
          <p class="type-eyebrow text-accent">Trust &amp; control</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-[-0.03em]">Your clinical work stays under your control.</h2>
          <p class="mt-3 text-sm leading-6 text-ink-secondary">Helios is designed so useful assistance does not quietly become a clinical decision.</p>
        </div>
        <div class="mt-8 grid gap-px overflow-hidden rounded-panel border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          <article class="bg-surface-raised p-5">
            <p class="font-semibold text-sm">Therapist-owned access</p>
            <p class="mt-2 text-xs text-ink-secondary leading-relaxed">Your workspace is protected around the authenticated therapist account and its owned records.</p>
          </article>
          <article class="bg-surface-raised p-5">
            <p class="font-semibold text-sm">Summaries stay editable</p>
            <p class="mt-2 text-xs text-ink-secondary leading-relaxed">Client-facing summaries stay editable until you decide they are ready.</p>
          </article>
          <article class="bg-surface-raised p-5">
            <p class="font-semibold text-sm">Clinical Records are protected</p>
            <p class="mt-2 text-xs text-ink-secondary leading-relaxed">Once approved, Clinical Records are protected from ordinary editing; later corrections use the amendment history.</p>
          </article>
          <article class="bg-surface-raised p-5">
            <p class="font-semibold text-sm">Reflections stay separate</p>
            <p class="mt-2 text-xs text-ink-secondary leading-relaxed">Private professional reflection remains separate from client-facing material and the formal Clinical Record.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="border-b border-border-muted bg-surface-elevated text-ink">
      <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="type-eyebrow text-accent">Simple pricing</p>
          <p class="mt-2 text-xl font-semibold">Independent therapists · £49/month</p>
          <p class="mt-1 text-sm text-ink-secondary">One therapist workspace. No complicated feature tiers at launch.</p>
        </div>
        <router-link to="/get-started" class="w-fit rounded-control border border-border px-5 py-3 text-sm font-semibold text-ink-secondary hover:bg-surface-muted hover:text-ink">Get started</router-link>
      </div>
    </section>

    <section class="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between text-ink">
      <div>
        <p class="type-eyebrow text-accent">Helios</p>
        <h2 class="mt-2 text-3xl font-semibold tracking-[-0.03em]">Spend more attention on the client, and less on reconstructing the work.</h2>
      </div>
      <router-link to="/get-started" class="w-fit rounded-control bg-action-primary px-6 py-3 text-sm font-semibold text-on-action hover:bg-action-primary-hover shadow-sm">Get started</router-link>
    </section>

    <footer class="border-t border-border-muted bg-surface-raised text-ink">
      <div class="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.35fr_.65fr] lg:items-end">
        <div class="max-w-2xl text-ink">
          <div class="flex items-center gap-3">
            <svg class="h-8 w-8 text-accent" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <path d="M9 31h30" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M15 31a9 9 0 0 1 18 0" stroke="currentColor" stroke-width="2"/>
              <path d="M24 8v7M9.5 14.5l5 5M38.5 14.5l-5 5M5 26h7M36 26h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span class="text-lg font-semibold tracking-[-0.02em]">Helios</span>
          </div>
          <h2 class="mt-6 text-xl font-semibold tracking-[-0.02em]">Built from clinical practice, for clinical practice.</h2>
          <p class="mt-3 max-w-xl text-sm leading-6 text-ink-secondary">
            Helios is developed through Chrysalis Therapy Services by Robert Ormston, a practising psychotherapist. It is shaped by the realities of therapeutic work — continuity, reflection, and professional responsibility.
          </p>
          <div class="mt-6 border-l-2 border-accent pl-4">
            <p class="text-sm font-semibold">Robert Ormston</p>
            <p class="mt-1 text-sm text-ink-secondary">Chrysalis Therapy Services</p>
            <p class="mt-1 text-sm text-ink-secondary">Member of the British Association for Counselling and Psychotherapy (BACP)</p>
          </div>
        </div>
        <div class="lg:text-right">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Helios clinical workspace</p>
          <nav class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-secondary lg:justify-end" aria-label="Legal and support">
            <router-link to="/privacy" class="hover:text-ink">Privacy</router-link>
            <router-link to="/terms" class="hover:text-ink">Terms</router-link>
            <router-link to="/ai-data" class="hover:text-ink">AI &amp; data</router-link>
            <router-link to="/support" class="hover:text-ink">Support</router-link>
          </nav>
          <p class="mt-6 text-xs leading-5 text-ink-muted">© {{ new Date().getFullYear() }} Helios. Built by therapists, for therapists.</p>
        </div>
      </div>
    </footer>
  </main>
</template>
