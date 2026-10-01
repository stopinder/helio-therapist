<script setup>
import clientWorkspace from '@/assets/client-workspace.jpg'
</script>

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

    <section class="overflow-hidden border-b border-border-muted bg-[#F7F3EC]">
      <div class="mx-auto grid w-full max-w-[1280px] gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10 lg:py-24">
        <div class="min-w-0">
          <p class="type-eyebrow text-accent">A calmer way to do the work</p>
          <h1 class="mt-5 max-w-[620px] font-serif text-[3.25rem] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-[4.35rem]">
            Your complete therapist workspace.
          </h1>
          <p class="mt-7 max-w-[560px] text-lg leading-8 text-ink-secondary">
            Helios brings your sessions, notes, clients, documents and CPD together in one secure, intuitive workspace — so you can focus on what matters most.
          </p>

          <div class="mt-8 flex flex-wrap items-center gap-3">
            <a href="#clients" class="rounded-full bg-[#0B2A3A] px-6 py-3 text-sm font-semibold text-[#F7F3EC] shadow-sm transition hover:bg-[#123B50]">
              See Helios in action →
            </a>
            <router-link to="/get-started" class="rounded-full border border-border px-6 py-3 text-sm font-semibold text-ink transition hover:bg-white/50">
              Start free trial
            </router-link>
          </div>

          <div class="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm text-ink-secondary">
            <span>✓ Save time</span>
            <span>✓ Stay organised</span>
            <span>✓ Focus on your clients</span>
          </div>
        </div>

        <div class="relative min-h-[420px] overflow-hidden rounded-[30px] border border-white/60 bg-[radial-gradient(circle_at_72%_24%,rgba(255,255,255,.95),rgba(224,234,236,.84)_28%,rgba(210,222,224,.55)_45%,rgba(235,225,211,.18)_72%),linear-gradient(180deg,#dce8ea_0%,#f3e4d2_100%)] shadow-[0_28px_80px_rgba(30,44,53,.14)]">
          <div class="absolute inset-x-0 bottom-0 h-[46%] bg-[linear-gradient(180deg,rgba(20,59,78,0)_0%,rgba(20,59,78,.07)_100%)]"></div>
          <div class="absolute right-[8%] top-[18%] h-56 w-56 rounded-full bg-white/55 blur-3xl"></div>
          <div class="absolute bottom-[10%] left-[10%] max-w-[420px] rounded-[24px] border border-white/70 bg-white/72 p-6 shadow-xl backdrop-blur">
            <p class="type-eyebrow text-accent">Continuity &amp; reflection for therapists</p>
            <p class="mt-3 font-serif text-3xl font-semibold leading-tight">Less to hold in your head.</p>
            <p class="mt-3 text-sm leading-6 text-ink-secondary">Sessions, reflections and the developing work, connected over time.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="clients" class="scroll-mt-24 border-b border-border-muted bg-[#FBF8F2]">
      <div class="mx-auto grid w-full max-w-[1280px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:px-10 lg:py-28">
        <div class="max-w-[520px]">
          <p class="type-eyebrow text-accent">The Clinical Workspace</p>
          <h2 class="mt-3 font-serif text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            The whole thread of the work, in one place.
          </h2>
          <p class="mt-5 text-base leading-7 text-ink-secondary">
            See upcoming sessions, open client records, capture notes, and access the tools you need — all from a single, focused workspace.
          </p>

          <div class="mt-7 space-y-4 text-sm text-ink-secondary">
            <p class="flex gap-3"><span class="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#DDECF7] text-accent">✓</span><span>Integrated calendar with client details</span></p>
            <p class="flex gap-3"><span class="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#DDECF7] text-accent">✓</span><span>Session capture and AI-assisted summaries</span></p>
            <p class="flex gap-3"><span class="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#DDECF7] text-accent">✓</span><span>Clinical records and longitudinal view</span></p>
            <p class="flex gap-3"><span class="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#DDECF7] text-accent">✓</span><span>Client documents and resources</span></p>
            <p class="flex gap-3"><span class="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#DDECF7] text-accent">✓</span><span>CPD, supervision and personal reflection</span></p>
          </div>

          <a href="#practice" class="mt-7 inline-block text-sm font-semibold text-accent hover:underline">
            Explore all features →
          </a>
        </div>

        <figure class="min-w-0">
          <div class="overflow-hidden rounded-[22px] border border-border bg-white shadow-[0_24px_70px_rgba(32,36,31,.12)]">
            <img
              :src="clientWorkspace"
              alt="Helios client workspace showing Alex Morgan, current focus, aims and objectives, supervision actions and clinical workspace access"
              class="block h-auto w-full"
            />
          </div>
          <figcaption class="mt-3 text-xs leading-5 text-ink-muted">
            Helios Client Workspace — real product interface.
          </figcaption>
        </figure>
      </div>
    </section>

    <section id="sessions" class="scroll-mt-24 border-b border-border-muted">
      <div class="mx-auto grid w-full max-w-[1200px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:py-28">
        <div class="order-2 min-w-0 lg:order-1">
          <figure class="overflow-hidden rounded-panel border border-border bg-surface-raised shadow-sm" aria-label="Illustrative Session Summary and separate Clinical Record workflow">
            <div class="flex flex-wrap items-center justify-between gap-2 bg-sidebar px-5 py-3 text-xs text-sidebar-fg">
              <span class="font-semibold">Sarah M. · Session 14</span>
              <span class="text-sidebar-muted">14 September</span>
            </div>
            <div class="flex flex-wrap gap-2 border-b border-border-muted bg-surface px-4 py-3 text-xs font-semibold">
              <span class="rounded-control bg-state-selected px-3 py-2 text-action-link">Session Summary</span>
              <span class="px-3 py-2 text-ink-secondary">Clinical Record</span>
            </div>

            <div class="border-b border-border-muted px-5 py-4 sm:px-6">
              <p class="text-xs text-ink-muted">Working summary · Editable until finalised</p>
              <div class="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-accent">
                <span>Edit</span><span>Regenerate</span><span>Copy summary</span>
              </div>
            </div>
            <article class="px-5 py-6 sm:px-8">
              <header class="border-b border-border-muted pb-4">
                <h3 class="font-serif text-2xl font-semibold">Session Summary</h3>
                <p class="mt-2 text-xs text-ink-muted">Sarah M. · 14 September</p>
              </header>
              <div class="mt-5 space-y-4 font-serif text-lg leading-7 text-ink-secondary">
                <p>The session explored the difference between setting a boundary and withdrawing from connection. Sarah described one recent interaction where she remained in the conversation, named what felt difficult and noticed less urgency to leave.</p>
                <p>Possible follow-up: what helped her stay present, and whether that felt different from previous attempts to protect herself.</p>
              </div>
            </article>
            <div class="flex flex-wrap gap-x-5 gap-y-2 border-t border-border-muted px-5 py-3 text-xs font-medium text-accent sm:px-6">
              <span>View transcript</span><span>Open in Client Documents →</span>
            </div>

            <div class="border-t-2 border-accent bg-surface px-5 py-5 sm:px-6">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="font-serif text-xl font-semibold">Clinical Record</h3>
                <span class="text-xs text-ink-muted">Separate view / workflow</span>
              </div>
              <p class="mt-2 text-xs leading-5 text-ink-secondary">Prepared and approved separately from the Session Summary.</p>
              <ol class="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-medium text-accent" aria-label="Clinical Record approval workflow">
                <li>Save Draft</li><li aria-hidden="true">→</li>
                <li>Mark Ready for Review</li><li aria-hidden="true">→</li>
                <li>Approve Clinical Record</li>
              </ol>
              <div class="mt-4 border-l-2 border-state-success bg-state-success-surface px-3 py-2">
                <p class="text-xs font-semibold text-state-success">Approved and locked · Read-only</p>
              </div>
              <dl class="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-ink-muted">
                <div><dt class="inline font-semibold">Version: </dt><dd class="inline">1</dd></div>
                <div><dt class="inline font-semibold">Approved by: </dt><dd class="inline">Therapist</dd></div>
                <div><dt class="inline font-semibold">Timestamp: </dt><dd class="inline">14 Sep · 11:15</dd></div>
              </dl>
              <div class="mt-4 border-y border-border-muted py-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Plan for next session</p>
                <p class="mt-2 font-serif text-base leading-6">Review the client’s experience of expressing a boundary while staying in connection.</p>
              </div>
              <p class="mt-3 text-xs font-medium text-accent">Create Record Amendment →</p>
              <p class="mt-2 text-[11px] leading-5 text-ink-muted">Corrections are appended as amendments. The approved record remains unchanged.</p>
            </div>
            <figcaption class="border-t border-border-muted px-5 py-3 text-[11px] leading-5 text-ink-muted sm:px-6">Illustrative views of two distinct documents. Finalised summaries no longer offer Edit or Regenerate.</figcaption>
          </figure>
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
          <h2 class="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">See how the work is developing over time.</h2>
          <p class="mt-5 text-base leading-7 text-ink-secondary">
            Helios brings reviewed session material into a longitudinal view, with links back to the source — helping you revisit changes, open questions and the thread of the work without deciding what they mean for you.
          </p>
        </div>

        <figure class="mt-10 overflow-hidden rounded-panel border border-border bg-surface-raised" aria-label="Illustrative longitudinal review of Sarah M.’s sessions">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-accent/20 bg-state-selected px-5 py-5 sm:px-7">
            <div>
              <p class="type-eyebrow text-accent">Longitudinal review</p>
              <h3 class="mt-1 font-serif text-2xl font-semibold">Sarah M. · Across three sessions</h3>
            </div>
            <p class="text-xs text-ink-secondary">Reviewed source material</p>
          </div>
          <div class="grid lg:grid-cols-[minmax(0,1fr)_300px]">
            <div class="px-5 py-6 sm:px-7">
              <p class="mb-5 text-xs text-ink-muted">Dated observations · Return to the session for context</p>
              <ol class="ml-1 border-l-2 border-accent/30">
                <li class="relative pl-6 pb-7">
                  <span class="absolute -left-[6px] top-1 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true"></span>
                  <div class="flex flex-wrap items-baseline justify-between gap-2">
                    <p class="text-xs font-semibold text-accent">31 Aug · Session 12</p>
                    <span class="text-[11px] text-ink-muted">Reviewed Session Capture</span>
                  </div>
                  <p class="mt-2 font-serif text-xl leading-7">Client described withdrawing after disagreement.</p>
                  <p class="mt-3 text-xs font-medium text-accent">Source: Session 12 · Open session ↗</p>
                </li>
                <li class="relative pl-6 pb-7">
                  <span class="absolute -left-[6px] top-1 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true"></span>
                  <div class="flex flex-wrap items-baseline justify-between gap-2">
                    <p class="text-xs font-semibold text-accent">7 Sep · Session 13</p>
                    <span class="text-[11px] text-ink-muted">Reviewed Session Capture</span>
                  </div>
                  <p class="mt-2 font-serif text-xl leading-7">Client reported staying in the conversation.</p>
                  <p class="mt-3 text-xs font-medium text-accent">Source: Session 13 · Open session ↗</p>
                </li>
                <li class="relative pl-6">
                  <span class="absolute -left-[6px] top-1 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true"></span>
                  <div class="flex flex-wrap items-baseline justify-between gap-2">
                    <p class="text-xs font-semibold text-accent">14 Sep · Session 14</p>
                    <span class="text-[11px] text-ink-muted">Reviewed Session Capture</span>
                  </div>
                  <p class="mt-2 font-serif text-xl leading-7">Follow-up: revisit what made that possible.</p>
                  <p class="mt-3 text-xs font-medium text-accent">Source: Session 14 · Open session ↗</p>
                </li>
              </ol>
            </div>
            <aside class="border-t border-border-muted bg-surface px-5 py-6 sm:px-7 lg:border-l lg:border-t-0">
              <p class="type-eyebrow text-accent">Therapist-authored</p>
              <h3 class="mt-2 font-serif text-xl font-semibold">Current focus</h3>
              <p class="mt-3 text-sm leading-6 text-ink-secondary">Explore how Sarah experiences expressing a boundary while staying in connection.</p>
              <div class="mt-6 border-t border-border pt-5">
                <h4 class="text-sm font-semibold">Open follow-up</h4>
                <div class="mt-3 flex items-start gap-3">
                  <span class="mt-1 h-3.5 w-3.5 shrink-0 rounded-sm border border-border-strong" aria-hidden="true"></span>
                  <p class="text-sm leading-6 text-ink-secondary">Return to the conversation with her sister.</p>
                </div>
              </div>
              <p class="mt-6 text-xs leading-5 text-ink-muted">A focus recorded by the therapist, not a conclusion inferred from these entries.</p>
            </aside>
          </div>
          <figcaption class="border-t border-border-muted px-5 py-4 text-xs leading-5 text-ink-muted sm:px-7">Illustrative review with source-session references. Observations remain material for therapist consideration; their meaning is not determined here.</figcaption>
        </figure>
      </div>
    </section>

    <section id="practice" class="scroll-mt-24 border-b border-border-muted">
      <div class="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
        <div class="max-w-3xl">
            <p class="type-eyebrow text-accent">The wider practice</p>
            <h2 class="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">The practical side of practice, connected to the clinical work.</h2>
            <p class="mt-5 text-base leading-7 text-ink-secondary">
              Appointments, practice documents and the tools you already use sit alongside the clinical workspace — so the operational work and the therapeutic work stay connected without becoming the same thing.
            </p>
        </div>

        <figure class="mt-10 overflow-hidden rounded-panel border border-border bg-surface-raised" aria-label="Illustrative calendar appointment and practice document workspace">
          <div class="grid lg:grid-cols-[1.35fr_1fr]">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center justify-between gap-3 bg-sidebar px-5 py-4 text-sidebar-fg sm:px-7">
                <h3 class="font-serif text-2xl font-semibold">Calendar</h3>
                <p class="text-xs text-sidebar-muted">Tuesday · 15 September 2026</p>
              </div>
              <div class="px-5 py-5 sm:px-7">
                <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border-muted pb-4 text-xs">
                  <p class="font-semibold text-ink"><span class="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-state-success" aria-hidden="true"></span>Google Calendar · Connected</p>
                  <p class="text-ink-muted">Last synced 09:42</p>
                </div>
                <p class="mt-5 type-eyebrow text-ink-muted">Today</p>
                <div class="mt-3 grid grid-cols-[3rem_minmax(0,1fr)] gap-3 sm:gap-5">
                  <p class="pt-4 text-xs tabular-nums text-ink-muted">10:00</p>
                  <div class="overflow-hidden rounded-control border border-accent/30 bg-surface">
                    <div class="border-l-4 border-accent bg-state-selected px-4 py-4">
                      <p class="text-xs font-semibold text-accent">Linked client appointment</p>
                      <p class="mt-2 font-serif text-2xl font-semibold">Sarah M.</p>
                      <p class="mt-1 text-sm text-ink-secondary">10:00–10:50 · Online session</p>
                    </div>
                    <div class="px-4 py-4">
                      <p class="text-sm font-semibold text-accent">Open meeting link ↗</p>
                      <p class="mt-1 text-xs text-ink-muted">Zoom · opens in a separate tab</p>
                      <div class="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
                        <span class="rounded-control border border-border bg-surface-raised px-3 py-2 text-ink">Open Client</span>
                        <span class="rounded-control bg-accent px-3 py-2 text-on-action">Clinical Workspace →</span>
                      </div>
                    </div>
                  </div>
                  <p class="pt-3 text-xs tabular-nums text-ink-muted">12:00</p>
                  <div class="border-y border-border-muted py-3">
                    <p class="text-sm font-semibold">Practice administration</p>
                    <p class="mt-1 text-xs text-ink-muted">Google Calendar · 12:00–12:30</p>
                  </div>
                </div>
                <p class="mt-5 text-sm leading-6 text-ink-secondary">From the day’s appointments straight into the relevant client’s work.</p>
              </div>
            </div>

            <div class="min-w-0 border-t border-border bg-surface-canvas px-5 py-6 sm:px-7 lg:border-l lg:border-t-0">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="type-eyebrow text-ink-muted">Practice library</p>
                  <h3 class="mt-1 font-serif text-2xl font-semibold">Documents</h3>
                </div>
                <span class="rounded-control border border-border bg-surface-raised px-3 py-2 text-xs font-semibold text-accent">Create Document</span>
              </div>
              <div class="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-y border-border py-3 text-xs text-ink-secondary" aria-label="Reusable practice document templates">
                <span class="font-semibold text-accent">Therapy agreement</span>
                <span>Consent form</span>
                <span>Information sheet</span>
              </div>
              <article class="mt-5 border border-border bg-surface-raised px-5 py-6 shadow-sm sm:px-7" aria-label="Illustrative therapy agreement with practice letterhead">
                <header class="border-b border-border pb-4">
                  <p class="font-serif text-lg font-semibold">Willow Practice</p>
                  <p class="mt-1 text-[11px] text-ink-muted">Counselling &amp; psychotherapy</p>
                </header>
                <p class="mt-6 text-[10px] font-semibold uppercase tracking-[.14em] text-ink-muted">Therapy agreement</p>
                <h4 class="mt-2 font-serif text-2xl font-semibold">Our work together</h4>
                <p class="mt-3 text-xs leading-6 text-ink-secondary">This agreement sets out the practical and professional basis for our work together.</p>
                <div class="mt-5 space-y-2 border-t border-border-muted pt-4 text-xs text-ink-secondary">
                  <p>Appointments and cancellations</p>
                  <p>Confidentiality</p>
                  <p>Contact between sessions</p>
                </div>
              </article>
              <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span class="text-ink-muted">Save Draft</span>
                <span class="font-semibold text-accent">Export / Print PDF ↗</span>
              </div>
              <p class="mt-5 text-sm leading-6 text-ink-secondary">Reusable practice material, with your own words and practice identity.</p>
            </div>
          </div>
          <figcaption class="border-t border-border-muted px-5 py-4 text-xs leading-5 text-ink-muted sm:px-7">Illustrative practice workspace. Client actions appear for linked appointments; other calendar events remain part of the day’s schedule.</figcaption>
        </figure>
      </div>
    </section>

    <section id="reflect" class="border-b border-border-muted bg-[#E8F0F2]">
      <div class="mx-auto w-full max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
        <div class="max-w-3xl">
          <p class="type-eyebrow text-accent">Reflection</p>
          <h2 class="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">A private place to think across the work.</h2>
          <p class="mt-5 text-base leading-7 text-ink-secondary">Capture what stayed with you, revisit your own observations over time, and bring selected material into supervision when it is useful — without folding private reflection into the formal clinical record.</p>
        </div>

        <figure class="mt-10 overflow-hidden rounded-panel border border-accent/20 bg-surface-raised shadow-sm" aria-label="Illustrative private reflection workspace with therapist-authored mapping and optional supervision preparation">
          <div class="flex flex-wrap items-center justify-between gap-3 bg-sidebar px-5 py-4 text-sidebar-fg sm:px-7">
            <h3 class="font-serif text-2xl font-semibold">Therapist Reflection</h3>
            <p class="text-xs text-sidebar-muted">Private reflection — not part of the Clinical Record.</p>
          </div>
          <div class="grid lg:grid-cols-[1.45fr_1fr]">
            <article class="min-w-0 px-5 py-6 sm:px-7 sm:py-7" aria-label="Example therapist-authored reflection">
              <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                <p class="font-semibold text-accent">In your own words</p>
                <p>15 September · Private reflection</p>
              </div>
              <h4 class="mt-6 text-sm font-semibold">What did you notice in yourself?</h4>
              <div class="mt-3 border-l-2 border-accent/40 pl-4 sm:pl-5">
                <p class="font-serif text-xl leading-8 text-ink">I noticed an urge to fill the silence and offer reassurance. When I paused, I could stay with the uncertainty for a little longer.</p>
                <p class="mt-4 font-serif text-lg leading-7 text-ink-secondary">I want to return to what made waiting feel difficult for me, without deciding too quickly what it meant.</p>
              </div>
              <div class="mt-6 rounded-control border border-border bg-surface px-4 py-4">
                <h4 class="text-sm font-semibold">What remains uncertain?</h4>
                <p class="mt-2 text-sm leading-6 text-ink-secondary">Was I responding to what was needed in that moment, or to my own discomfort with not knowing?</p>
              </div>
              <div class="mt-6 flex justify-end">
                <span class="rounded-control bg-accent px-4 py-2.5 text-xs font-semibold text-on-action">Save private reflection</span>
              </div>
            </article>

            <aside class="min-w-0 border-t border-border bg-[#EFF3F1] px-5 py-6 sm:px-7 sm:py-7 lg:border-l lg:border-t-0" aria-label="Reflection history and Practice Map">
              <h4 class="font-serif text-xl font-semibold">Review Reflections</h4>
              <div class="mt-3 flex flex-wrap gap-2 text-xs text-ink-muted" aria-label="Illustrative reflection search and theme filter">
                <span class="min-w-0 flex-1 rounded-control border border-border bg-surface-raised px-3 py-2">Search reflections…</span>
                <span class="rounded-control border border-border bg-surface-raised px-3 py-2">All themes ▾</span>
              </div>
              <div class="mt-4 divide-y divide-border border-y border-border">
                <div class="py-3">
                  <p class="text-[11px] text-ink-muted">15 September</p>
                  <p class="mt-1 text-sm font-semibold">Staying with uncertainty</p>
                </div>
                <div class="py-3">
                  <p class="text-[11px] text-ink-muted">8 September</p>
                  <p class="mt-1 text-sm text-ink-secondary">Making room for silence</p>
                </div>
              </div>
              <div class="mt-6">
                <h4 class="font-serif text-xl font-semibold">Practice Map</h4>
                <p class="mt-1 text-xs text-accent">Therapist-authored mapping</p>
                <div class="mt-3 border-l-2 border-accent/40 pl-3">
                  <p class="text-sm font-semibold">Wanting to reassure</p>
                  <p class="mt-1 text-xs leading-5 text-ink-secondary">An inner position you named in 3 mapped reflections.</p>
                </div>
                <p class="mt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Recorded themes</p>
                <p class="mt-1 text-sm text-ink-secondary">Uncertainty · Boundaries</p>
                <p class="mt-3 text-xs leading-5 text-ink-muted">Helios groups the positions and themes you record. Their meaning remains yours to consider.</p>
              </div>
            </aside>
          </div>

          <div class="border-t border-border bg-surface px-5 py-6 sm:px-7">
            <div class="grid gap-5 lg:grid-cols-[.9fr_1.1fr] lg:gap-8">
              <div>
                <p class="type-eyebrow text-ink-muted">When useful · A next step</p>
                <h4 class="mt-2 font-serif text-xl font-semibold">Supervision preparation</h4>
                <p class="mt-2 text-sm leading-6 text-ink-secondary">Bring selected reflections into supervision preparation. Choose what to include and add the questions you want to explore.</p>
              </div>
              <div class="border-l-2 border-accent/30 pl-4 sm:pl-5">
                <p class="text-xs font-semibold text-accent">Selected reflection · Case A</p>
                <p class="mt-2 text-sm text-ink">Preparation note: What helps me stay curious when I feel an urge to reassure?</p>
                <p class="mt-3 text-xs leading-5 text-ink-muted">Privacy review · Client names excluded by default; case aliases used.</p>
                <div class="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-accent"><span>Choose report contents</span><span>Preview</span><span>Copy</span><span>Download PDF</span></div>
              </div>
            </div>
          </div>
          <figcaption class="border-t border-border-muted px-5 py-4 text-xs leading-5 text-ink-muted sm:px-7">Illustrative workspace with therapist-authored material. You remain responsible for interpretation and clinical meaning; private reflection stays separate from Clinical Records.</figcaption>
        </figure>
      </div>
    </section>

    <section class="border-b border-border-muted bg-[#082637] text-[#F6F2EA]">
      <div class="mx-auto w-full max-w-[1280px] px-5 py-16 text-center sm:px-8 lg:px-10 lg:py-20">
        <p class="type-eyebrow text-[#A9C5D2]">Integrations</p>
        <h2 class="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
          Works with the tools you already use.
        </h2>
        <p class="mx-auto mt-4 max-w-3xl text-base leading-7 text-[#C5D4DB]">
          Join Zoom meetings from Helios, sync your Google or Outlook calendar, and keep the practical side of your work connected.
        </p>

        <div class="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-[18px] border border-white/10 bg-white/5 p-5">
            <p class="text-lg font-semibold">Zoom</p>
            <p class="mt-1 text-sm text-[#A9C5D2]">Join from Helios</p>
          </div>
          <div class="rounded-[18px] border border-white/10 bg-white/5 p-5">
            <p class="text-lg font-semibold">Google Calendar</p>
            <p class="mt-1 text-sm text-[#A9C5D2]">Sync your schedule</p>
          </div>
          <div class="rounded-[18px] border border-white/10 bg-white/5 p-5">
            <p class="text-lg font-semibold">Outlook</p>
            <p class="mt-1 text-sm text-[#A9C5D2]">Sync your schedule</p>
          </div>
          <div class="rounded-[18px] border border-white/10 bg-white/5 p-5">
            <p class="text-lg font-semibold">More to come</p>
            <p class="mt-1 text-sm text-[#A9C5D2]">Additional integrations</p>
          </div>
        </div>
      </div>
    </section>

    <section id="trust" class="scroll-mt-24 border-b border-border-muted bg-surface text-ink">
      <div class="mx-auto w-full max-w-[1200px] px-5 py-12 sm:px-8 lg:py-14">
        <p class="type-eyebrow text-accent">Clinical control</p>
        <h2 class="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">AI assists. You remain the clinician.</h2>
        <p class="mt-3 text-base leading-7 text-ink-secondary">You review and approve what becomes a Clinical Record.</p>

        <ul class="mt-6 grid gap-4 border-y border-border py-5 text-sm leading-6 text-ink-secondary md:grid-cols-3 md:gap-6" aria-label="Clinical control commitments">
          <li class="border-l-2 border-accent/30 pl-3">Session Summaries are editable until finalised.</li>
          <li class="border-l-2 border-accent/30 pl-3">Approved Clinical Records are read-only; corrections are added through amendments.</li>
          <li class="border-l-2 border-accent/30 pl-3">Private reflection is not automatically included in Clinical Records.</li>
        </ul>

        <nav class="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-accent" aria-label="Trust information">
          <router-link to="/privacy" class="hover:text-ink hover:underline">Privacy</router-link>
          <router-link to="/ai-data" class="hover:text-ink hover:underline">AI &amp; data</router-link>
          <router-link to="/terms" class="hover:text-ink hover:underline">Terms</router-link>
          <router-link to="/support" class="hover:text-ink hover:underline">Support</router-link>
        </nav>
      </div>
    </section>

    <section class="border-b border-border-muted bg-surface-raised">
      <div class="mx-auto w-full max-w-[1200px] px-5 py-10 sm:px-8 lg:py-12">
        <div class="max-w-3xl">
          <p class="type-eyebrow text-accent">Built from clinical practice</p>
          <h2 class="mt-2 font-serif text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">A practitioner’s perspective.</h2>
          <p class="mt-3 text-base leading-7 text-ink-secondary">
            Helios has been shaped through clinical practice — including the need to keep editable working material, formal Clinical Records and private reflection clearly distinct.
          </p>
          <p class="mt-5 border-l-2 border-accent/30 pl-3 text-sm leading-6 text-ink-secondary">
            <span class="font-semibold text-ink">Developed by Robert Ormiston</span> · Practising psychotherapist · Chrysalis Therapy Services
            <span class="block text-xs leading-5 text-ink-muted">Member of the British Association for Counselling and Psychotherapy (BACP)</span>
          </p>
        </div>
      </div>
    </section>

    <section id="pricing" class="border-b border-border-muted">
      <div class="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:py-24">
        <div>
          <p class="type-eyebrow text-accent">Pricing</p>
          <h2 class="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em]">One workspace. One simple price.</h2>
          <p class="mt-5 text-base leading-7 text-ink-secondary">The full Helios therapist workspace, included.</p>
        </div>
        <div class="rounded-panel border border-border bg-surface-raised p-6 sm:p-8">
          <p class="type-eyebrow text-ink-muted">Launch pricing</p>
          <p class="mt-3 flex items-baseline gap-2"><span class="font-serif text-6xl font-semibold tracking-[-0.04em]">£29</span><span class="text-base text-ink-secondary">/ month</span></p>
          <p class="mt-3 text-base text-ink-secondary">30 days free to try Helios.</p>
          <div class="mt-6 border-y border-border py-5">
            <h3 class="text-lg font-semibold text-accent">Founder offer — £24/month</h3>
            <p class="mt-2 text-sm leading-6 text-ink-secondary">Available to early adopters. Keep the founder rate while you remain continuously subscribed.</p>
          </div>
          <router-link to="/get-started" class="mt-6 inline-flex rounded-control bg-action-primary px-6 py-3 text-sm font-semibold text-on-action hover:bg-action-primary-hover">Create your workspace</router-link>
        </div>
      </div>
    </section>

    <section class="bg-surface-elevated">
      <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div class="max-w-3xl">
          <p class="type-eyebrow text-accent">Helios</p>
          <h2 class="mt-2 font-serif text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">More attention for the client.</h2>
        </div>
        <router-link to="/get-started" class="w-fit rounded-control bg-action-primary px-6 py-3 text-sm font-semibold text-on-action hover:bg-action-primary-hover">Create your workspace</router-link>
      </div>
    </section>

    <footer class="border-t border-border-muted bg-surface-raised">
      <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-5 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div class="flex items-center gap-3">
            <svg class="h-8 w-8 text-accent" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <path d="M9 31h30" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M15 31a9 9 0 0 1 18 0" stroke="currentColor" stroke-width="2"/>
              <path d="M24 8v7M9.5 14.5l5 5M38.5 14.5l-5 5M5 26h7M36 26h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span class="text-lg font-semibold">Helios</span>
          </div>
        </div>

        <div class="lg:text-right">
          <nav class="flex flex-wrap gap-5 text-sm text-ink-secondary lg:justify-end" aria-label="Legal and support">
            <router-link to="/privacy" class="hover:text-ink">Privacy</router-link>
            <router-link to="/terms" class="hover:text-ink">Terms</router-link>
            <router-link to="/ai-data" class="hover:text-ink">AI &amp; data</router-link>
            <router-link to="/cookies" class="hover:text-ink">Cookies</router-link>
            <router-link to="/support" class="hover:text-ink">Support</router-link>
          </nav>
          <p class="mt-4 text-xs text-ink-muted">© {{ new Date().getFullYear() }} Helios.</p>
        </div>
      </div>
    </footer>
  </main>
</template>
