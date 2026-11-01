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
      <div class="landing-container">
        <div class="reflect-layout">
          <div class="reflect-copy">
            <p class="eyebrow">Reflect</p>
            <h2>A room inside Helios for the therapist, not the record.</h2>
            <p>Capture what stayed with you, revisit it later, notice recurrence in Practice Map, and explore how your therapeutic stance and learning edge change over time.</p>
          </div>

          <div class="reflect-environment" aria-label="Reflect illustration">
            <div class="reflect-environment-head">
              <span class="mini-label">Your practice</span>
              <strong>Reflect</strong>
            </div>
            <div class="hairline" />
            <div class="reflect-rows">
              <div v-for="row in reflectRows" :key="row.title">
                <strong>{{ row.title }}</strong>
                <span>{{ row.body }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="stance-growth-grid">
          <article class="stance-card">
            <p class="eyebrow">01 · Therapist Stance</p>
            <h3>“What kind of therapist are you?”</h3>
            <p>Fifteen practice situations ask for your usual first response. Helios reflects back familiar approaches, useful tensions and questions worth taking into supervision.</p>
            <div class="pill-row">
              <span class="pill">15 situations</span>
              <span class="pill">Private until saved</span>
              <span class="pill">Not a competence score</span>
            </div>
          </article>

          <article class="growth-card">
            <p class="eyebrow">02 · Growth</p>
            <h3>The reflection history changes the next questions.</h3>
            <p>Growth watches recurring themes and mapped inner positions across saved direct-practice reflections. When a thread repeats, Helios turns it into a more specific supervision or learning question.</p>
            <p class="growth-note">The 15 Stance situations stay stable. Growth follows saved direct-practice reflections rather than the Stance questionnaire itself; what adapts is the inquiry raised from your ongoing reflection history.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="capture" class="capture-section">
      <div class="landing-container capture-layout">
        <div class="capture-copy">
          <p class="eyebrow">Session material</p>
          <h2>From transcript to something clinically useful.</h2>
          <p class="capture-lede">Transcript Inbox is a triage queue, not another place to read everything. Identify the likely source, assign the client, preview only when needed, then move into the clinical workflow.</p>

          <div class="capture-steps">
            <article v-for="step in captureSteps" :key="step.number">
              <span class="stage-number">{{ step.number }}</span>
              <div>
                <h3>{{ step.title }}</h3>
                <p>{{ step.body }}</p>
              </div>
            </article>
          </div>
        </div>

        <div class="transcript-panel" aria-label="Transcript Inbox illustration">
          <div class="transcript-head">
            <h3>Transcript Inbox</h3>
            <span class="pill">4 unassigned</span>
          </div>
          <article v-for="item in transcriptRows" :key="item.title">
            <div>
              <h4>{{ item.title }}</h4>
              <span class="pill">{{ item.client }}</span>
            </div>
            <p>{{ item.meta }} · Preview only if needed</p>
          </article>
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

const reflectRows = [
  { title: 'Reflections', body: 'What has stayed with you.' },
  { title: 'Practice Map', body: 'What is recurring or taking shape.' },
  { title: 'Therapist Stance', body: 'How you tend to work, at this point in your practice.' },
  { title: 'Growth', body: 'Questions grounded in your own reflection history.' },
]

const captureSteps = [
  { number: '01', title: 'Bring the material in', body: 'Zoom transcript text, pasted text or transcript files enter one queue.' },
  { number: '02', title: 'Assign without losing your place', body: 'Use identity clues and assign from the row rather than opening every transcript.' },
  { number: '03', title: 'Shape the output deliberately', body: 'Choose the summary approach, review editable drafts and keep Clinical Record approval explicit.' },
]

const transcriptRows = [
  { title: 'Emotional regulation and HRT cessation', client: 'Likely Jen', meta: 'Today · 10:02' },
  { title: 'Repair after conflict', client: 'Likely Hannah + Simon', meta: 'Yesterday · 15:30' },
  { title: 'Returning to work after injury', client: 'Likely Alex', meta: '28 Oct · 12:10' },
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
  padding: 64px 0 72px;
  background: var(--landing-sage);
}

.reflect-layout {
  display: grid;
  grid-template-columns: minmax(0, 500px) minmax(0, 690px);
  gap: 58px;
  align-items: start;
}

.reflect-copy h2 {
  max-width: 490px;
  margin-top: 14px;
  font-size: clamp(48px, 4vw, 56px);
  line-height: 1.03;
}

.reflect-copy > p:last-child {
  max-width: 480px;
  margin-top: 16px;
  color: var(--landing-muted);
  font-size: 14px;
  line-height: 1.65;
}

.reflect-environment {
  min-height: 430px;
  padding: 24px;
  border: 1.5px solid #8fa194;
  border-radius: 20px;
  background: #c2cec4;
}

.reflect-environment-head strong {
  font-family: var(--font-editorial);
  font-size: 28px;
  font-weight: 500;
}

.reflect-environment > .hairline {
  margin-top: 16px;
  background: #a3b2a6;
}

.reflect-rows {
  margin-top: 8px;
}

.reflect-rows > div {
  display: grid;
  grid-template-columns: 210px 1fr;
  gap: 22px;
  align-items: center;
  min-height: 54px;
}

.reflect-rows strong {
  font-family: var(--font-editorial);
  font-size: 20px;
  font-weight: 500;
}

.reflect-rows span {
  color: var(--landing-muted);
  font-size: 11px;
  text-align: right;
}

.stance-growth-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 40px;
}

.stance-card,
.growth-card {
  min-height: 300px;
  padding: 24px;
  border-radius: 18px;
}

.stance-card {
  border: 1.4px solid #9cab9f;
  background: #dde3dd;
}

.growth-card {
  border: 1.4px solid #879a8c;
  background: #bccabd;
}

.stance-card h3,
.growth-card h3 {
  max-width: 540px;
  margin-top: 14px;
  font-family: var(--font-editorial);
  font-size: 29px;
  font-weight: 500;
  line-height: 1.1;
}

.stance-card > p:not(.eyebrow),
.growth-card > p:not(.eyebrow) {
  max-width: 540px;
  margin-top: 12px;
  color: #4e6057;
  font-size: 12px;
  line-height: 1.65;
}

.stance-card .pill-row {
  margin-top: 18px;
}

.growth-note {
  font-weight: 600;
  color: #405249 !important;
}

.capture-section {
  padding: 64px 0 70px;
  background: var(--landing-warm);
}

.capture-layout {
  display: grid;
  grid-template-columns: minmax(0, 470px) minmax(0, 720px);
  gap: 58px;
  align-items: start;
}

.capture-copy h2 {
  max-width: 460px;
  margin-top: 14px;
  font-size: clamp(46px, 3.9vw, 54px);
  line-height: 1.03;
}

.capture-lede {
  max-width: 450px;
  margin-top: 16px;
  color: var(--landing-muted);
  font-size: 14px;
  line-height: 1.65;
}

.capture-steps {
  margin-top: 12px;
}

.capture-steps article {
  display: grid;
  grid-template-columns: 30px 1fr;
  gap: 14px;
  padding: 10px 0;
}

.capture-steps h3 {
  margin-top: 0;
  font-size: 19px;
}

.capture-steps p {
  margin-top: 4px;
  font-size: 10px;
}

.transcript-panel {
  min-height: 500px;
  padding: 18px;
  border: 1.4px solid #a79a8b;
  border-radius: 20px;
  background: #eeeae2;
}

.transcript-head h3 {
  font-family: var(--font-editorial);
  font-size: 28px;
  font-weight: 500;
}

.transcript-panel article {
  min-height: 105px;
  margin-top: 12px;
  padding: 14px 15px;
  border: 1.1px solid #c8bfb4;
  border-radius: 12px;
  background: #f4f0e9;
}

.transcript-panel article > div {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.transcript-panel h4 {
  font-family: var(--font-editorial);
  font-size: 17px;
  font-weight: 500;
  line-height: 1.15;
}

.transcript-panel article > p {
  margin-top: 7px;
  color: var(--landing-muted-2);
  font-size: 9px;
  line-height: 1.4;
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

  .hero-copy,
  .ask-copy,
  .reflect-copy,
  .capture-copy {
    max-width: 720px;
  }

  .hero-product,
  .ask-panel,
  .reflect-environment,
  .transcript-panel {
    width: 100%;
    max-width: 760px;
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

  .reflect-environment {
    min-height: 0;
  }

  .reflect-rows > div {
    grid-template-columns: 1fr;
    gap: 4px;
    padding: 12px 0;
  }

  .reflect-rows span {
    text-align: left;
  }

  .stance-card,
  .growth-card {
    min-height: 0;
  }

  .transcript-panel {
    min-height: 0;
    padding: 14px;
  }

  .transcript-panel article > div {
    flex-direction: column;
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
