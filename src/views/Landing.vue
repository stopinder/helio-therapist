<template>
  <main class="landing-shell">
    <header class="landing-header">
      <div class="landing-container header-inner">
        <router-link to="/" class="brand" aria-label="Helios home">
          <span class="brand-mark-dot" aria-hidden="true" />
          <span>helios.</span>
        </router-link>

        <nav class="header-nav" aria-label="Landing page sections">
          <a href="#workspace">Workspace</a>
          <a href="#ask-helios">Ask Helios</a>
          <a href="#reflect">Reflect</a>
          <a href="#capture">Session Capture</a>
          <a href="#pricing">Pricing</a>
        </nav>

        <nav class="account-nav" aria-label="Account access">
          <router-link to="/sign-in" class="sign-in-link">Sign in</router-link>
          <router-link to="/get-started" class="header-cta">Create your workspace →</router-link>
        </nav>
      </div>
    </header>

    <section class="hero-section" aria-label="Welcome to Helios">
      <img :src="openingImage" alt="Sunlit workspace looking out over a distant horizon" class="hero-background" fetchpriority="high" />
      <div class="hero-overlay hero-overlay-side" aria-hidden="true" />
      <div class="hero-overlay hero-overlay-bottom" aria-hidden="true" />
      <div class="landing-container hero-layout">
        <div class="hero-copy">
          <p class="eyebrow eyebrow-light">Helios · Clinical workspace for therapists</p>
          <h1>Keep the thread of the work together.</h1>
          <p class="hero-lede">Clients, sessions, clinical thinking, documents, reflection and research — connected without turning your practice into administration.</p>
          <div class="hero-actions">
            <router-link to="/get-started" class="button button-light">Create your workspace →</router-link>
            <a href="#workspace" class="button button-ghost">See how Helios works ↓</a>
          </div>
        </div>
      </div>
    </section>

    <section id="workspace" class="workspace-section">
      <div class="landing-container workspace-intro">
        <div>
          <p class="eyebrow">The clinical workspace</p>
          <h2>Start with the client. Keep the whole thread in view.</h2>
        </div>
        <p>Helios brings the useful parts of the work back together around the client — what matters now, what happened recently and what needs carrying forward.</p>
      </div>

      <div class="landing-container workspace-proof">
        <div class="workspace-screen">
          <img
            :src="clientWorkspace"
            alt="Helios Client Workspace showing current focus, aims, recent work and clinical actions"
            class="workspace-screenshot"
          />
        </div>

        <div class="clinical-thread" aria-label="Clinical workflow stages">
          <article v-for="stage in clinicalStages" :key="stage.number">
            <span class="stage-number">{{ stage.number }}</span>
            <div>
              <h3>{{ stage.title }}</h3>
              <p>{{ stage.body }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section id="ask-helios" class="ask-section">
      <div class="landing-container ask-layout">
        <div class="ask-copy">
          <p class="eyebrow eyebrow-light">Ask Helios</p>
          <h2>One assistant. Three deliberate ways to think.</h2>
          <p class="ask-lede">Built into the workspace rather than bolted on beside it. Choose the kind of thinking you need, then keep control of the context.</p>

          <div class="ask-mode-list">
            <article v-for="mode in askModes" :key="mode.number">
              <span class="stage-number">{{ mode.number }}</span>
              <div>
                <h3>{{ mode.title }}</h3>
                <p>{{ mode.body }}</p>
              </div>
            </article>
          </div>

          <p class="boundary-copy">Ask Helios is not a supervisor, autonomous clinician or clinical-record author. You decide the context and what happens next.</p>
        </div>

        <div class="ask-panel" aria-label="Ask Helios illustration">
          <div class="ask-panel-top">
            <span class="mini-label">Ask Helios</span>
            <span class="pill">Private workspace</span>
          </div>
          <div class="ask-tabs" aria-hidden="true">
            <span class="active">Workspace</span>
            <span>Research</span>
            <span>Reflect</span>
          </div>
          <div class="ask-query">
            <span class="mini-label">You</span>
            <p>What pattern seems to be emerging across the recent work?</p>
          </div>
          <div class="ask-answer">
            <span class="mini-label">Helios</span>
            <h3>What is recorded</h3>
            <p>Recent sessions repeatedly return to the same area of concern, with some variation in how it is described.</p>
            <h3>What may deserve attention</h3>
            <p>It may be useful to distinguish what is recurring from what is new, and to keep alternative explanations open.</p>
            <div class="pill-row">
              <span class="pill">Recorded context</span>
              <span class="pill">Therapist remains responsible</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="reflect" class="reflect-section">
      <div class="landing-container reflect-layout">
        <div class="reflect-copy">
          <p class="eyebrow">Reflect</p>
          <h2>A space to think about the work — not document it.</h2>
          <p class="reflect-lede">Reflect gives you somewhere to capture what stayed with you after a session, notice what keeps returning, and become more curious about how you work as a therapist.</p>
          <p class="reflect-boundary">It stays separate from the clinical record. Nothing moves into client documentation unless you deliberately put it there.</p>

          <div class="reflect-feature-list">
            <article v-for="item in reflectFeatures" :key="item.title">
              <h3>{{ item.title }}</h3>
              <p>{{ item.body }}</p>
            </article>
          </div>
        </div>

        <div class="reflect-workspace" aria-label="Reflect workspace illustration">
          <section class="latest-reflection">
            <div class="reflect-workspace-label">
              <span class="mini-label">Latest reflection</span>
              <span class="reflect-meta">Private reflection · Saved today</span>
            </div>
            <h3>What stayed with you from this session?</h3>
            <blockquote>
              I noticed how quickly I moved toward reassurance when the client became uncertain.
              <br />
              I’m wondering what I was trying to settle — for them or for me.
            </blockquote>
          </section>

          <div class="reflect-workspace-grid">
            <section class="practice-map-card">
              <span class="mini-label">Practice Map</span>
              <h3>What keeps returning?</h3>
              <div class="theme-chips" aria-label="Example recurring themes">
                <span>Rescuing</span>
                <span>Uncertainty</span>
                <span>Responsibility</span>
                <span>Holding back</span>
              </div>
              <p>Themes begin to surface as they recur across your reflections.</p>
            </section>

            <section class="stance-summary-card">
              <span class="mini-label">Therapist Stance</span>
              <h3>How do you tend to meet the work?</h3>
              <p>A structured reflection across 15 common practice situations.</p>
              <div class="stance-indicators">
                <span>Relational</span>
                <span>Exploratory</span>
                <span>Active when needed</span>
              </div>
              <p class="stance-boundary">A snapshot for reflection, not a measure of competence.</p>
            </section>
          </div>

          <section class="learning-edge-card">
            <div class="learning-edge-head">
              <span class="mini-label">Learning Edge</span>
              <span>Questions shaped by your reflection history</span>
            </div>
            <h3>The questions become more specific as your reflections accumulate.</h3>
            <div class="learning-edge-question">
              <span>A question emerging from your recent reflections</span>
              <p>You’ve returned several times to moments when you felt responsible for restoring calm. What happens in you when you allow uncertainty to remain in the room?</p>
            </div>
            <p class="learning-edge-note">Learning Edge draws on recurring themes in your saved practice reflections. It does not change the 15 Therapist Stance situations; it changes the inquiry around the work as your reflection history develops.</p>
          </section>
        </div>
      </div>
    </section>

    <section id="capture" class="capture-section">
      <div class="landing-container capture-layout">
        <div class="capture-copy">
          <p class="eyebrow">Session material</p>
          <h2>From transcript to something clinically useful.</h2>
          <p class="capture-lede">Transcript Inbox is a triage queue, not another place to read everything. Bring the material in, identify the likely client, then shape the output deliberately before anything becomes part of the record.</p>

          <div class="capture-steps">
            <article v-for="step in captureSteps" :key="step.number">
              <span class="stage-number">{{ step.number }}</span>
              <div>
                <h3>{{ step.title }}</h3>
                <p>{{ step.body }}</p>
              </div>
            </article>
          </div>

          <p class="capture-boundary">The workflow keeps speed and judgement separate: Helios can help organise and draft, but you remain responsible for the clinical interpretation and what is ultimately recorded.</p>
        </div>

        <div class="session-workspace" aria-label="Transcript Inbox and Session Capture illustration">
          <div class="session-workspace-top">
            <div>
              <span class="mini-label">Transcript Inbox</span>
              <h3>Find the right client without opening everything.</h3>
            </div>
            <span class="pill">4 unassigned</span>
          </div>

          <div class="transcript-queue">
            <article v-for="item in transcriptRows" :key="item.title" :class="{ active: item.active }">
              <div class="transcript-row-main">
                <div>
                  <h4>{{ item.title }}</h4>
                  <p>{{ item.meta }}</p>
                </div>
                <span :class="['pill', item.active ? 'assigned' : '']">{{ item.client }}</span>
              </div>
              <div v-if="item.active" class="transcript-row-actions">
                <span>Assigned to Jen</span>
                <span>Open in Session Capture →</span>
              </div>
            </article>
          </div>

          <div class="session-capture-card">
            <div class="session-capture-head">
              <div>
                <span class="mini-label">Session Capture</span>
                <h3>Shape the draft before it goes anywhere.</h3>
              </div>
              <span class="capture-status">Editable draft</span>
            </div>

            <div class="capture-choice-grid">
              <div>
                <span class="capture-choice-label">Summary approach</span>
                <strong>Integrative</strong>
                <span>Choose the lens that fits the work.</span>
              </div>
              <div>
                <span class="capture-choice-label">Continuity window</span>
                <strong>Recent 3 sessions</strong>
                <span>Keep the current thread in view.</span>
              </div>
            </div>

            <div class="capture-draft-preview">
              <span class="mini-label">Draft preview</span>
              <p>The recent work continues to centre on relational safety and regulation, with a clearer pattern emerging around responsibility and reassurance...</p>
            </div>

            <div class="capture-record-boundary">
              <span>Nothing silently becomes a Clinical Record.</span>
              <strong>You review, edit and approve what belongs there.</strong>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="tools" class="tools-section">
      <div class="landing-container">
        <div class="split-heading tools-heading">
          <div>
            <p class="eyebrow">The supporting layer</p>
            <h2>The practical tools stay in their place.</h2>
          </div>
          <p>Useful infrastructure should support the clinical work, not become the product story.</p>
        </div>

        <div class="tool-clusters">
          <article v-for="cluster in toolClusters" :key="cluster.label" :class="['tool-cluster', cluster.tone]">
            <p class="eyebrow">{{ cluster.label }}</p>
            <h3>{{ cluster.title }}</h3>
            <div v-for="item in cluster.items" :key="item.title" class="cluster-item">
              <h4>{{ item.title }}</h4>
              <p>{{ item.body }}</p>
            </div>
          </article>
        </div>

        <div class="tools-note">
          <strong>Useful infrastructure stays quieter than the clinical work.</strong>
          <p>The tools are grouped by what they help you do, rather than presented as six separate product features.</p>
        </div>
      </div>
    </section>

    <section id="pricing" class="trust-section">
      <div class="landing-container">
        <div class="split-heading trust-heading">
          <div>
            <p class="eyebrow eyebrow-light">Therapist-controlled by design</p>
            <h2>AI where it helps. Boundaries where they matter.</h2>
          </div>
          <p>Helios is designed around clinical work, privacy and therapist control rather than engagement or ad targeting.</p>
        </div>

        <div class="trust-list">
          <article v-for="item in trustPrinciples" :key="item.title">
            <h3>{{ item.title }}</h3>
            <p>{{ item.body }}</p>
          </article>
        </div>

        <div class="pricing-cta">
          <div>
            <p class="eyebrow eyebrow-light">Simple pricing</p>
            <h3>Free forever. Professional when you need it.</h3>
            <p>Free: five active clients and five short text-AI actions monthly, with no payment card required. Professional is optional at £29/month or £290/year paid upfront, with unlimited active clients. Dictation is available across plans subject to fair use.</p>
          </div>
          <router-link to="/get-started" class="button button-light pricing-button">Start Free — no card required →</router-link>
        </div>
      </div>
    </section>

    <footer class="landing-footer">
      <div class="landing-container footer-inner">
        <div>
          <router-link to="/" class="footer-brand">helios.</router-link>
          <p>Clinical workspace software for therapists.</p>
        </div>
        <nav aria-label="Legal, data and support">
          <router-link to="/privacy">Privacy</router-link>
          <router-link to="/ai-data">AI &amp; data</router-link>
          <router-link to="/cookies">Cookies</router-link>
          <router-link to="/terms">Terms</router-link>
          <router-link to="/support">Support</router-link>
        </nav>
      </div>
      <div class="landing-container footer-bottom">
        <span>Helios is operated by Chrysalis Therapy Services.</span>
        <span>© {{ new Date().getFullYear() }} Helios</span>
      </div>
    </footer>
  </main>
</template>

<script setup>
import openingImage from '../assets/helios-opening-light.webp'
import clientWorkspace from '../assets/client-workspace-section.png'

const clinicalStages = [
  { number: '01', title: 'Before the session', body: 'Current focus, aims, follow-ups and recent work stay close enough to be useful.' },
  { number: '02', title: 'During and after', body: 'Bring in transcript material and shape the session record deliberately.' },
  { number: '03', title: 'Carry it forward', body: 'Return to Therapy Focus, documents and the next session with the wider thread intact.' },
]

const askModes = [
  { number: '01', title: 'Workspace', body: 'Ask about recorded work, what needs attention or what is available in the workspace.' },
  { number: '02', title: 'Research', body: 'Investigate therapeutic questions against published evidence, with links to real sources.' },
  { number: '03', title: 'Reflect', body: 'Explore uncertainty, a difficult interaction or a professional question in a separate reflective space.' },
]

const reflectFeatures = [
  { title: 'Reflections', body: 'Capture the thoughts, feelings, uncertainties or moments that stayed with you.' },
  { title: 'Practice Map', body: 'As reflections accumulate, Helios helps recurring themes and inner positions become visible.' },
  { title: 'Therapist Stance', body: 'Explore how you tend to respond to common clinical situations — not as a score, but as a way of seeing your habitual stance more clearly.' },
  { title: 'Learning Edge', body: 'Your saved reflections inform the questions Helios raises next, helping you notice where your practice may be asking something more of you.' },
]

const captureSteps = [
  { number: '01', title: 'Bring the material in', body: 'Zoom transcript text, pasted text or transcript files enter one queue.' },
  { number: '02', title: 'Assign without losing your place', body: 'Use identity clues and assign from the row rather than opening every transcript.' },
  { number: '03', title: 'Shape the output deliberately', body: 'Choose the summary approach, review editable drafts and keep Clinical Record approval explicit.' },
]

const transcriptRows = [
  { title: 'Emotional regulation and HRT cessation', client: 'Likely Jen', meta: 'Today · 10:02 · identity clues found', active: true },
  { title: 'Repair after conflict', client: 'Likely Hannah + Simon', meta: 'Yesterday · 15:30 · preview only if needed', active: false },
  { title: 'Returning to work after injury', client: 'Likely Alex', meta: '28 Oct · 12:10 · preview only if needed', active: false },
]

const toolClusters = [
  {
    label: 'Practice',
    title: 'Keep the day organised.',
    tone: 'practice',
    items: [
      { title: 'Calendar', body: 'See the clinical day alongside Google Calendar.' },
      { title: 'Documents', body: 'Keep agreements, summaries and resources around the work.' },
    ],
  },
  {
    label: 'Capture',
    title: 'Get material in without fuss.',
    tone: 'capture',
    items: [
      { title: 'Dictation', body: 'Speak your own text into supported fields, then review it.' },
      { title: 'Zoom', body: 'Bring available transcript text into the workflow.' },
    ],
  },
  {
    label: 'Connect',
    title: 'Carry only what matters forward.',
    tone: 'connect',
    items: [
      { title: 'Supervision', body: 'Select the reflective material you deliberately want to take forward.' },
      { title: 'Integrations', body: 'Keep existing tools connected without making them the centre of practice.' },
    ],
  },
]

const trustPrinciples = [
  { title: 'Nothing silently becomes a Clinical Record.', body: 'AI-assisted drafts remain reviewable and editable until you take the deliberate record action.' },
  { title: 'Research stays separate from client context.', body: 'Published-evidence questions use a distinct Research mode rather than quietly carrying private clinical records into the request.' },
  { title: 'Reflection stays therapist-owned.', body: 'Private reflective material is not automatically copied into client summaries or formal records.' },
]
</script>

<style scoped>
.landing-shell {
  --landing-ink: #18333c;
  --landing-deep: #17323b;
  --landing-deep-2: #213f46;
  --landing-cream: #f6f2e8;
  --landing-paper: #f3f1eb;
  --landing-sage: #d7dfd7;
  --landing-warm: #e7e0d5;
  --landing-copper: #a47756;
  --landing-muted: #5f6d67;
  --landing-muted-2: #77817c;
  overflow: hidden;
  background: var(--landing-paper);
  color: var(--landing-ink);
  font-family: var(--font-ui);
}

.landing-container {
  width: min(1248px, calc(100% - 64px));
  margin: 0 auto;
}

.landing-header {
  height: 82px;
  background: var(--landing-cream);
}

.header-inner {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.brand,
.footer-brand {
  font-family: var(--font-editorial);
  font-weight: 500;
  letter-spacing: -.035em;
  color: var(--landing-ink);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 34px;
  line-height: 1;
}

.brand-mark-dot {
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: 999px;
  background: var(--landing-copper);
}

.header-nav,
.account-nav {
  display: flex;
  align-items: center;
}

.header-nav {
  gap: 28px;
  margin-left: auto;
}

.header-nav a,
.sign-in-link {
  color: var(--landing-muted);
  font-size: 12px;
  font-weight: 600;
}

.account-nav {
  gap: 18px;
  margin-left: 12px;
}

.header-cta {
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--landing-ink);
  color: var(--landing-cream);
  font-size: 12px;
  font-weight: 600;
}

.hero-section {
  position: relative;
  min-height: min(720px, 82vh);
  display: flex;
  align-items: flex-start;
  overflow: hidden;
  background: #efe8dc;
  color: var(--landing-cream);
}

.hero-background,
.hero-overlay {
  position: absolute;
  inset: 0;
}

.hero-background {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(1.04) saturate(.84) contrast(.98);
}

.hero-overlay {
  pointer-events: none;
}

.hero-overlay-side {
  background: linear-gradient(90deg, rgba(18,45,54,.82) 0%, rgba(18,45,54,.56) 39%, rgba(18,45,54,.14) 68%, transparent 87%);
}

.hero-overlay-bottom {
  background: linear-gradient(0deg, rgba(20,48,56,.3), transparent 54%);
}

.hero-layout {
  position: relative;
  z-index: 2;
  width: min(1248px, calc(100% - 64px));
  padding-top: 92px;
  padding-bottom: 84px;
}

.hero-copy {
  max-width: 760px;
}

.hero-copy h1,
.workspace-intro h2,
.ask-copy h2,
.reflect-copy h2,
.capture-copy h2,
.trust-heading h2 {
  font-family: var(--font-editorial);
  font-weight: 500;
  letter-spacing: -.04em;
}

.hero-copy h1 {
  max-width: 760px;
  margin: 20px 0 0;
  font-size: clamp(54px, 5.7vw, 82px);
  line-height: 1.01;
}

.hero-lede {
  max-width: 650px;
  margin-top: 24px;
  color: rgba(248,244,234,.96);
  font-size: 18px;
  line-height: 1.65;
}

.eyebrow,
.mini-label {
  font-weight: 600;
  text-transform: uppercase;
  color: var(--landing-copper);
}

.eyebrow {
  font-size: 11px;
  line-height: 1.1;
  letter-spacing: .16em;
}

.eyebrow-light {
  color: #e7b877;
}

.mini-label {
  font-size: 9px;
  letter-spacing: .1em;
}

.hero-actions {
  display: flex;
  gap: 10px;
  margin-top: 28px;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 12px 17px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.button-light {
  background: var(--landing-cream);
  color: var(--landing-ink);
}

.button-ghost {
  border: 1px solid rgba(246,242,232,.62);
  background: rgba(18,45,54,.14);
  color: var(--landing-cream);
}

.pill,
.ask-tabs span {
  display: inline-flex;
  align-items: center;
  min-height: 25px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #e9ede8;
  color: var(--landing-muted);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.1;
}

.pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hairline {
  width: 100%;
  height: 1px;
  background: #bcc6bf;
}

.workspace-section {
  padding: 58px 0 68px;
  background: #e7e9e3;
}

.workspace-intro {
  display: grid;
  grid-template-columns: minmax(0, 760px) minmax(300px, 390px);
  gap: 72px;
  align-items: end;
  justify-content: space-between;
}

.workspace-intro h2 {
  max-width: 760px;
  margin-top: 12px;
  font-size: clamp(46px, 4vw, 56px);
  line-height: 1.03;
}

.workspace-intro > p {
  color: var(--landing-muted);
  font-size: 14px;
  line-height: 1.65;
}

.workspace-proof {
  margin-top: 30px;
}

.workspace-screen {
  position: relative;
  overflow: hidden;
  padding: 10px;
  border: 1.3px solid #aab7ad;
  border-radius: 18px;
  background: #cfd8d0;
  box-shadow: 0 20px 46px rgba(32,51,44,.08);
}

.workspace-screenshot {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid #b7c3ba;
  border-radius: 10px;
  background: #f4f3ee;
}

.clinical-thread {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-top: 20px;
  border-top: 1px solid #b4beb6;
  border-bottom: 1px solid #b4beb6;
}

.clinical-thread article {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 14px;
  min-height: 108px;
  padding: 19px 24px;
}

.clinical-thread article:first-child {
  padding-left: 0;
}

.clinical-thread article + article {
  border-left: 1px solid #b4beb6;
}

.stage-number {
  color: var(--landing-copper);
  font-family: var(--font-editorial);
  font-size: 15px;
}

.clinical-thread h3,
.ask-mode-list h3,
.capture-steps h3 {
  margin-top: 0;
  font-family: var(--font-editorial);
  font-size: 21px;
  font-weight: 500;
  line-height: 1.15;
}

.clinical-thread p,
.ask-mode-list p,
.capture-steps p {
  margin-top: 5px;
  color: var(--landing-muted);
  font-size: 11px;
  line-height: 1.55;
}

.ask-section {
  padding: 68px 0 72px;
  background: var(--landing-deep);
  color: var(--landing-cream);
}

.ask-layout {
  display: grid;
  grid-template-columns: minmax(0, 520px) minmax(0, 660px);
  gap: 64px;
  align-items: start;
}

.ask-copy h2 {
  max-width: 510px;
  margin-top: 14px;
  font-size: clamp(48px, 4.1vw, 58px);
  line-height: 1.03;
}

.ask-lede {
  max-width: 500px;
  margin-top: 16px;
  color: #c5ceca;
  font-size: 14px;
  line-height: 1.65;
}

.ask-mode-list {
  margin-top: 14px;
  border-top: 1px solid #516b67;
}

.ask-mode-list article {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 16px;
  padding: 14px 0;
}

.ask-mode-list h3 {
  margin-top: 0;
  color: var(--landing-cream);
  font-size: 23px;
}

.ask-mode-list p {
  margin-top: 5px;
  color: #b6c2be;
  font-size: 11px;
}

.boundary-copy {
  max-width: 500px;
  margin-top: 8px;
  color: #93a6a0;
  font-size: 10px;
  line-height: 1.6;
}

.ask-panel {
  min-height: 560px;
  padding: 18px;
  border: 1.5px solid #617a74;
  border-radius: 20px;
  background: #e8ece7;
  color: var(--landing-ink);
}

.ask-panel-top {
  min-height: 28px;
}

.ask-tabs {
  display: flex;
  gap: 7px;
  margin-top: 12px;
  padding: 8px;
  border-radius: 12px;
  background: #e3e7e2;
}

.ask-tabs span {
  border-radius: 8px;
  background: transparent;
}

.ask-tabs .active {
  border: 1px solid #ccd4cd;
  background: #fcfbf7;
  color: var(--landing-ink);
}

.ask-query,
.ask-answer {
  border-radius: 14px;
}

.ask-query {
  max-width: 500px;
  margin-top: 12px;
  padding: 14px 15px;
  background: #dce5de;
}

.ask-query p {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.5;
}

.ask-answer {
  margin-top: 12px;
  padding: 16px;
  border: 1.1px solid #b9c5bc;
  background: #f5f4ef;
}

.ask-answer h3 {
  margin-top: 12px;
  font-family: var(--font-editorial);
  font-size: 18px;
  font-weight: 500;
}

.ask-answer > p {
  margin-top: 5px;
  color: var(--landing-muted);
  font-size: 11px;
  line-height: 1.55;
}

.ask-answer .pill-row {
  margin-top: 14px;
}

.reflect-section {
  padding: 58px 0 64px;
  background: #d5ddd5;
}

.reflect-layout {
  display: grid;
  grid-template-columns: minmax(0, .84fr) minmax(620px, 1.16fr);
  gap: 52px;
  align-items: start;
}

.reflect-copy {
  padding-top: 4px;
}

.reflect-copy h2 {
  max-width: 500px;
  margin-top: 14px;
  font-size: clamp(46px, 4vw, 58px);
  line-height: 1.02;
}

.reflect-lede,
.reflect-boundary {
  max-width: 500px;
  color: var(--landing-muted);
  line-height: 1.7;
}

.reflect-lede {
  margin-top: 18px;
  font-size: 14px;
}

.reflect-boundary {
  margin-top: 12px;
  font-size: 12px;
}

.reflect-feature-list {
  display: grid;
  gap: 0;
  margin-top: 24px;
  border-top: 1px solid #aebbb0;
}

.reflect-feature-list article {
  padding: 14px 0;
  border-bottom: 1px solid #aebbb0;
}

.reflect-feature-list h3 {
  font-family: var(--font-editorial);
  font-size: 19px;
  font-weight: 500;
  line-height: 1.15;
}

.reflect-feature-list p {
  max-width: 470px;
  margin-top: 5px;
  color: #56665e;
  font-size: 11px;
  line-height: 1.55;
}

.reflect-workspace {
  padding: 18px;
  border: 1.4px solid #9cac9f;
  border-radius: 20px;
  background: #ece9e1;
  box-shadow: 0 18px 40px rgba(34,54,47,.07);
}

.latest-reflection,
.practice-map-card,
.stance-summary-card,
.learning-edge-card {
  border: 1px solid #bdc7bf;
  border-radius: 15px;
}

.latest-reflection {
  padding: 18px 20px;
  background: #f5f2ea;
}

.reflect-workspace-label,
.learning-edge-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.reflect-meta,
.learning-edge-head > span:last-child {
  color: #728078;
  font-size: 9px;
}

.latest-reflection h3 {
  margin-top: 12px;
  font-family: var(--font-editorial);
  font-size: 24px;
  font-weight: 500;
  line-height: 1.1;
}

.latest-reflection blockquote {
  margin: 14px 0 0;
  padding-left: 14px;
  border-left: 2px solid #b48562;
  color: #42564e;
  font-family: var(--font-editorial);
  font-size: 15px;
  line-height: 1.55;
}

.reflect-workspace-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}

.practice-map-card,
.stance-summary-card {
  min-height: 220px;
  padding: 17px;
}

.practice-map-card {
  background: #dfe7df;
}

.stance-summary-card {
  background: #e7e2d8;
}

.practice-map-card h3,
.stance-summary-card h3,
.learning-edge-card h3 {
  margin-top: 10px;
  font-family: var(--font-editorial);
  font-weight: 500;
  line-height: 1.12;
}

.practice-map-card h3,
.stance-summary-card h3 {
  font-size: 20px;
}

.practice-map-card > p,
.stance-summary-card > p {
  margin-top: 10px;
  color: #5e6c66;
  font-size: 10px;
  line-height: 1.55;
}

.theme-chips,
.stance-indicators {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}

.theme-chips span,
.stance-indicators span {
  display: inline-flex;
  align-items: center;
  min-height: 25px;
  padding: 6px 9px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 600;
}

.theme-chips span {
  border: 1px solid #b3c0b6;
  background: #eef2ed;
  color: #526259;
}

.stance-indicators span {
  border: 1px solid #c6b9a8;
  background: #f2ece4;
  color: #655b50;
}

.stance-boundary {
  color: #766f66 !important;
  font-style: italic;
}

.learning-edge-card {
  margin-top: 12px;
  padding: 18px 20px;
  border-color: #879a8c;
  background: #becbbf;
}

.learning-edge-card h3 {
  max-width: 590px;
  font-size: 24px;
}

.learning-edge-question {
  margin-top: 14px;
  padding: 14px 15px;
  border: 1px solid #a0b0a3;
  border-radius: 12px;
  background: rgba(244,247,242,.58);
}

.learning-edge-question > span {
  color: #6a786f;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.learning-edge-question p {
  margin-top: 7px;
  color: #314a40;
  font-family: var(--font-editorial);
  font-size: 16px;
  line-height: 1.45;
}

.learning-edge-note {
  margin-top: 11px;
  color: #4f6258;
  font-size: 10px;
  line-height: 1.55;
}

.capture-section {
  padding: 58px 0 64px;
  background: #e6dfd4;
}

.capture-layout {
  display: grid;
  grid-template-columns: minmax(0, .78fr) minmax(650px, 1.22fr);
  gap: 52px;
  align-items: start;
}

.capture-copy {
  padding-top: 4px;
}

.capture-copy h2 {
  max-width: 500px;
  margin-top: 14px;
  font-size: clamp(46px, 4vw, 58px);
  line-height: 1.02;
}

.capture-lede {
  max-width: 500px;
  margin-top: 18px;
  color: var(--landing-muted);
  font-size: 14px;
  line-height: 1.7;
}

.capture-steps {
  display: grid;
  gap: 0;
  margin-top: 24px;
  border-top: 1px solid #b7aa9b;
}

.capture-steps article {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid #b7aa9b;
}

.capture-steps h3 {
  margin-top: 0;
  font-size: 19px;
}

.capture-steps p {
  margin-top: 5px;
  color: #655f57;
  font-size: 11px;
  line-height: 1.55;
}

.capture-boundary {
  max-width: 500px;
  margin-top: 18px;
  color: #6f685f;
  font-size: 11px;
  line-height: 1.6;
}

.session-workspace {
  padding: 18px;
  border: 1.4px solid #a89a8a;
  border-radius: 20px;
  background: #eee9e1;
  box-shadow: 0 18px 40px rgba(57,47,38,.07);
}

.session-workspace-top,
.session-capture-head,
.transcript-row-main,
.capture-record-boundary {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.session-workspace-top,
.session-capture-head {
  align-items: flex-start;
}

.session-workspace-top h3,
.session-capture-head h3 {
  max-width: 480px;
  margin-top: 8px;
  font-family: var(--font-editorial);
  font-weight: 500;
  line-height: 1.1;
}

.session-workspace-top h3 {
  font-size: 23px;
}

.session-capture-head h3 {
  font-size: 22px;
}

.transcript-queue {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}

.transcript-queue article {
  padding: 13px 14px;
  border: 1px solid #c7bcaf;
  border-radius: 12px;
  background: #f6f2ea;
}

.transcript-queue article.active {
  border-color: #9eac9f;
  background: #e5ebe4;
}

.transcript-row-main {
  align-items: flex-start;
}

.transcript-row-main h4 {
  font-family: var(--font-editorial);
  font-size: 16px;
  font-weight: 500;
  line-height: 1.15;
}

.transcript-row-main p {
  margin-top: 5px;
  color: #7b746c;
  font-size: 9px;
  line-height: 1.4;
}

.pill.assigned {
  border: 1px solid #a9b6ab;
  background: #d9e3da;
  color: #4d6156;
}

.transcript-row-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #c5d0c6;
  color: #53655b;
  font-size: 9px;
  font-weight: 600;
}

.session-capture-card {
  margin-top: 12px;
  padding: 17px;
  border: 1px solid #a8b5aa;
  border-radius: 15px;
  background: #d8e1d9;
}

.capture-status {
  display: inline-flex;
  align-items: center;
  min-height: 25px;
  padding: 6px 9px;
  border: 1px solid #9dad9f;
  border-radius: 999px;
  background: #ecf1eb;
  color: #53655b;
  font-size: 9px;
  font-weight: 700;
}

.capture-choice-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 14px;
}

.capture-choice-grid > div {
  min-height: 92px;
  padding: 13px;
  border: 1px solid #b6c2b8;
  border-radius: 11px;
  background: #eef2ed;
}

.capture-choice-label {
  display: block;
  color: #748078;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.capture-choice-grid strong {
  display: block;
  margin-top: 7px;
  font-family: var(--font-editorial);
  font-size: 17px;
  font-weight: 500;
}

.capture-choice-grid > div > span:last-child {
  display: block;
  margin-top: 4px;
  color: #69766f;
  font-size: 9px;
  line-height: 1.45;
}

.capture-draft-preview {
  margin-top: 10px;
  padding: 13px 14px;
  border: 1px solid #b3beb5;
  border-radius: 11px;
  background: #edf0ea;
}

.capture-draft-preview p {
  margin-top: 7px;
  color: #465a50;
  font-family: var(--font-editorial);
  font-size: 14px;
  line-height: 1.48;
}

.capture-record-boundary {
  align-items: center;
  margin-top: 11px;
  padding-top: 11px;
  border-top: 1px solid #aab7ac;
  color: #55675d;
  font-size: 9px;
}

.capture-record-boundary strong {
  max-width: 330px;
  color: #324b3f;
  text-align: right;
}

.tools-section {
  padding: 60px 0 68px;
  background: #c4cec6;
}

.tools-heading h2 {
  max-width: 700px;
  font-size: clamp(46px, 3.9vw, 54px);
}

.tools-heading > p {
  color: #52625a;
  font-size: 13px;
}

.tool-clusters {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 30px;
}

.tool-cluster {
  min-height: 280px;
  padding: 24px;
  border-radius: 18px;
}

.tool-cluster.practice {
  border: 1.25px solid #87998b;
  background: #b8c4ba;
}

.tool-cluster.capture {
  border: 1.25px solid #93a297;
  background: #c6d0c8;
}

.tool-cluster.connect {
  border: 1.25px solid #7f9284;
  background: #afbdb2;
}

.tool-cluster > h3 {
  margin-top: 14px;
  font-family: var(--font-editorial);
  font-size: 27px;
  font-weight: 500;
  line-height: 1.08;
}

.cluster-item {
  margin-top: 20px;
}

.cluster-item h4 {
  font-family: var(--font-editorial);
  font-size: 19px;
  font-weight: 500;
  line-height: 1.1;
}

.cluster-item p {
  margin-top: 6px;
  color: #52625a;
  font-size: 11px;
  line-height: 1.5;
}

.tools-note {
  display: grid;
  grid-template-columns: 470px 520px;
  gap: 24px;
  margin-top: 24px;
}

.tools-note strong {
  font-family: var(--font-editorial);
  font-size: 22px;
  font-weight: 500;
  line-height: 1.2;
}

.tools-note p {
  color: #53635b;
  font-size: 11px;
  line-height: 1.55;
}

.trust-section {
  padding: 64px 0 74px;
  background: var(--landing-deep-2);
  color: var(--landing-cream);
}

.trust-heading h2 {
  max-width: 660px;
  font-size: clamp(46px, 3.9vw, 54px);
}

.trust-heading > p {
  color: #bbc7c2;
  font-size: 13px;
}

.trust-list {
  margin-top: 28px;
  border-top: 1px solid rgba(88,112,108,.9);
}

.trust-list article {
  display: grid;
  grid-template-columns: minmax(0, 470px) minmax(0, 560px);
  gap: 54px;
  justify-content: space-between;
  padding: 18px 0;
  border-bottom: 1px solid rgba(88,112,108,.9);
}

.trust-list h3 {
  font-family: var(--font-editorial);
  font-size: 21px;
  font-weight: 500;
  line-height: 1.2;
}

.trust-list p {
  color: #b5c2bd;
  font-size: 11px;
  line-height: 1.6;
  text-align: right;
}

.pricing-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 34px;
  min-height: 200px;
  margin-top: 0;
  padding: 28px;
  border: 1.4px solid #5e7872;
  border-radius: 18px;
  background: #28484f;
}

.pricing-cta > div {
  max-width: 760px;
}

.pricing-cta h3 {
  margin-top: 8px;
  font-family: var(--font-editorial);
  font-size: 34px;
  font-weight: 500;
  line-height: 1.05;
}

.pricing-cta > div > p:last-child {
  max-width: 700px;
  margin-top: 8px;
  color: #c2cec9;
  font-size: 11px;
  line-height: 1.65;
}

.pricing-button {
  flex: none;
}

.landing-footer {
  background: #ddd7cc;
  color: var(--landing-muted);
}

.footer-inner {
  min-height: 110px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 36px;
}

.footer-brand {
  display: block;
  font-size: 28px;
  line-height: 1;
}

.footer-inner p {
  margin-top: 6px;
  font-size: 10px;
  line-height: 1.4;
}

.footer-inner nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 14px;
  font-size: 10px;
  font-weight: 600;
}

.footer-bottom {
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-top: 1px solid rgba(95,109,103,.2);
  color: #738078;
  font-size: 9px;
}

@media (max-width: 1120px) {
  .landing-container {
    width: min(100% - 48px, 960px);
  }

  .header-nav {
    display: none;
  }

  .ask-layout,
  .reflect-layout,
  .capture-layout {
    grid-template-columns: 1fr;
    gap: 38px;
  }

  .reflect-workspace,
  .session-workspace {
    max-width: 780px;
  }

  .hero-copy,
  .ask-copy,
  .reflect-copy,
  .capture-copy {
    max-width: 720px;
  }

  .ask-panel,
  .session-workspace {
    width: 100%;
    max-width: 780px;
  }

  .split-heading,
  .workspace-intro {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .split-heading > p,
  .workspace-intro > p {
    max-width: 620px;
  }

  .tool-clusters {
    grid-template-columns: 1fr;
  }

  .tool-cluster {
    min-height: 0;
  }

  .stance-growth-grid {
    grid-template-columns: 1fr;
  }

  .tools-note,
  .trust-list article {
    grid-template-columns: 1fr;
  }

  .trust-list p {
    max-width: 640px;
    text-align: left;
  }
}

@media (max-width: 720px) {
  .landing-container {
    width: calc(100% - 36px);
  }

  .landing-header {
    height: 72px;
  }

  .brand {
    font-size: 30px;
  }

  .brand-mark-dot {
    width: 20px;
    height: 20px;
  }

  .sign-in-link {
    display: none;
  }

  .header-cta {
    padding: 11px 13px;
    font-size: 11px;
  }

  .workspace-section,
  .ask-section,
  .reflect-section,
  .capture-section,
  .tools-section,
  .trust-section {
    padding-top: 46px;
    padding-bottom: 50px;
  }

  .hero-section {
    min-height: 650px;
  }

  .hero-layout {
    width: calc(100% - 36px);
    padding-top: 72px;
    padding-bottom: 68px;
  }

  .hero-copy h1 {
    font-size: clamp(46px, 13vw, 60px);
  }

  .hero-lede {
    font-size: 15px;
  }

  .hero-actions {
    flex-direction: column;
  }

  .hero-actions .button {
    width: 100%;
  }

  .split-heading h2,
  .ask-copy h2,
  .reflect-copy h2,
  .capture-copy h2,
  .trust-heading h2,
  .tools-heading h2 {
    font-size: clamp(40px, 11vw, 50px);
  }

  .clinical-thread {
    grid-template-columns: 1fr;
  }

  .clinical-thread article {
    padding: 18px 0;
  }

  .clinical-thread article + article {
    border-top: 1px solid #b4beb6;
    border-left: 0;
  }

  .ask-panel {
    min-height: 0;
  }

  .ask-query {
    max-width: none;
  }

  .reflect-workspace {
    padding: 14px;
  }

  .reflect-workspace-grid {
    grid-template-columns: 1fr;
  }

  .reflect-workspace-label,
  .learning-edge-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .session-workspace {
    padding: 14px;
  }

  .capture-choice-grid {
    grid-template-columns: 1fr;
  }

  .session-workspace-top,
  .session-capture-head,
  .transcript-row-main,
  .transcript-row-actions,
  .capture-record-boundary {
    align-items: flex-start;
    flex-direction: column;
  }

  .capture-record-boundary strong {
    max-width: none;
    text-align: left;
  }

  .tools-note {
    grid-template-columns: 1fr;
  }

  .pricing-cta {
    align-items: flex-start;
    flex-direction: column;
    min-height: 0;
  }

  .pricing-button {
    width: 100%;
  }

  .footer-inner,
  .footer-bottom {
    align-items: flex-start;
    flex-direction: column;
  }

  .footer-inner {
    padding-top: 28px;
    padding-bottom: 28px;
  }

  .footer-inner nav {
    justify-content: flex-start;
  }

  .footer-bottom {
    padding-top: 12px;
    padding-bottom: 14px;
  }
}
</style>
