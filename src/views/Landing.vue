<template>
  <main class="landing-shell">
    <header class="landing-header">
      <div class="header-inner">
        <router-link to="/" class="brand" aria-label="Helios home">
          <span class="brand-sun" aria-hidden="true"><span class="sun-disc" /><span class="sun-line" /></span>
          <span>helios<span class="brand-dot">.</span></span>
        </router-link>

        <nav class="header-nav" aria-label="Landing page sections">
          <a href="#workspace">Workspace</a>
          <a href="#ask-helios">Ask Helios</a>
          <a href="#reflect">Reflect</a>
          <a href="#capture">Session Capture</a>
          <a href="#tools">Tools</a>
          <a href="#pricing">Pricing</a>
        </nav>

        <nav class="account-nav" aria-label="Account access">
          <router-link to="/sign-in" class="sign-in-link">Sign in</router-link>
          <router-link to="/get-started" class="header-cta">Create your workspace <ArrowUpRight :size="16" /></router-link>
        </nav>
      </div>
    </header>

    <section class="opening-splash" aria-label="Welcome to Helios">
      <img :src="openingImage" alt="Sunlit workspace looking out over a distant horizon" class="opening-image" fetchpriority="high" />
      <div class="opening-shade opening-shade-side" />
      <div class="opening-shade opening-shade-bottom" />
      <div class="opening-copy">
        <p class="opening-eyebrow">Helios · Clinical workspace for therapists</p>
        <h1>Keep the thread of the work together.</h1>
        <p>Clients, sessions, clinical thinking, documents, reflection and research — connected without turning your practice into administration.</p>
        <div class="opening-actions">
          <router-link to="/get-started" class="opening-button primary">Create your workspace <ArrowUpRight :size="17" /></router-link>
          <a href="#workspace" class="opening-button secondary">See how Helios works <span aria-hidden="true">↓</span></a>
        </div>
      </div>
    </section>

    <section id="workspace" class="workspace-section">
      <div class="section-container">
        <div class="section-heading split-heading">
          <div>
            <p class="section-eyebrow">THE CLINICAL WORKSPACE</p>
            <h2>The work has a thread. <em>Helios keeps hold of it.</em></h2>
          </div>
          <p>Start with the client, move into the session, and come back to the wider direction of the work without rebuilding context each time.</p>
        </div>

        <div class="clinical-showcase">
          <img
            :src="clientWorkspace"
            class="clinical-screenshot"
            alt="Helios Client Workspace showing a client, current focus, aims, recent work and clinical actions"
          />
        </div>

        <div class="thread-grid" aria-label="The clinical thread">
          <article>
            <span>01</span>
            <h3>Before the session</h3>
            <p>Current focus, aims, follow-ups and recent work stay close enough to be useful.</p>
          </article>
          <article>
            <span>02</span>
            <h3>During and after</h3>
            <p>Open the Clinical Workspace, bring in transcript material and shape the session record deliberately.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Carry it forward</h3>
            <p>Return to Therapy Focus, documents and the next session with the wider clinical thread still intact.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="ask-helios" class="ask-section">
      <div class="section-container ask-layout">
        <div class="ask-copy">
          <p class="section-eyebrow light">ASK HELIOS</p>
          <h2>One assistant. <em>Three deliberate ways to think.</em></h2>
          <p class="ask-lede">Ask Helios is built into the workspace rather than bolted on beside it. Choose the kind of thinking you need, then keep control of the context.</p>

          <div class="mode-list">
            <article>
              <span class="mode-index">01</span>
              <div>
                <h3>Workspace</h3>
                <p>Ask about what has been recorded, what needs attention or what is available in your workspace.</p>
              </div>
            </article>
            <article>
              <span class="mode-index">02</span>
              <div>
                <h3>Research</h3>
                <p>Investigate therapeutic questions against published clinical evidence, with links to real sources.</p>
              </div>
            </article>
            <article>
              <span class="mode-index">03</span>
              <div>
                <h3>Reflect</h3>
                <p>Explore uncertainty, a difficult interaction or a professional question in a separate reflective space.</p>
              </div>
            </article>
          </div>

          <p class="boundary-note">Ask Helios is not a supervisor, autonomous clinician or clinical-record author. You decide the context and what happens next.</p>
        </div>

        <div class="ask-product" aria-label="Ask Helios product illustration">
          <div class="ask-panel">
            <div class="ask-panel-header">
              <div>
                <span class="ask-kicker">ASK HELIOS</span>
                <strong>Clinical thinking, when you need it</strong>
              </div>
              <span class="ask-status">Private workspace</span>
            </div>
            <div class="ask-tabs" aria-hidden="true">
              <span class="active">Workspace</span><span>Research</span><span>Reflect</span>
            </div>
            <div class="ask-context">
              <span>Clinical context</span>
              <div><strong>Perspective</strong><em>Integrative</em></div>
              <div><strong>Evidence</strong><em>Last 3 sessions</em></div>
            </div>
            <div class="ask-question">
              <small>You</small>
              <p>What pattern seems to be emerging across the recent work?</p>
            </div>
            <div class="ask-answer">
              <div class="answer-label"><Sparkles :size="15" /> Helios</div>
              <h4>What is recorded</h4>
              <p>Recent sessions repeatedly return to the same area of concern, with some variation in how it is described.</p>
              <h4>What may deserve attention</h4>
              <p>It may be useful to distinguish what is recurring from what is new, and to keep alternative explanations open.</p>
              <div class="answer-sources"><span>Recorded context</span><span>Therapist remains responsible</span></div>
            </div>
            <div class="ask-composer">What would you like to understand about this work? <ArrowUpRight :size="16" /></div>
          </div>
        </div>
      </div>
    </section>

    <section id="reflect" class="reflect-section">
      <div class="section-container reflect-layout">
        <div class="reflect-product" aria-label="Reflect product illustration">
          <div class="reflect-frame">
            <div class="reflect-topline">
              <div>
                <span class="mini-eyebrow">YOUR PRACTICE</span>
                <h3>Practice</h3>
              </div>
              <p>“The work becomes clearer when there is somewhere to think about it.”</p>
            </div>
            <div class="reflect-cards">
              <article v-for="(item, index) in reflectCards" :key="item.title">
                <span>0{{ index + 1 }}</span>
                <div><h4>{{ item.title }}</h4><p>{{ item.detail }}</p></div>
              </article>
            </div>
            <div class="reflect-discovery">
              <span class="mini-eyebrow">DISCOVERY</span>
              <h4>Notice what is beginning to recur.</h4>
              <p>Practice Map gives repeated themes and inner positions somewhere to take shape without turning reflection into another clinical record.</p>
            </div>
          </div>
        </div>

        <div class="reflect-copy">
          <p class="section-eyebrow">REFLECT</p>
          <h2>A room inside Helios <em>for the therapist, not the record.</em></h2>
          <p>Reflect is deliberately separate from client documentation. Capture what stayed with you, revisit it later, notice recurrence in Practice Map, and explore your therapeutic stance over time.</p>

          <div class="reflect-points">
            <div><strong>Private reflection</strong><span>Keep therapist-owned thinking distinct from the formal clinical record.</span></div>
            <div><strong>Practice Map</strong><span>See recurring language, themes and positions begin to take shape.</span></div>
            <div><strong>Therapist Stance</strong><span>Use structured reflection to look at how you tend to work.</span></div>
            <div><strong>Supervision selection</strong><span>Choose what you want to carry into supervision rather than moving everything automatically.</span></div>
          </div>
        </div>
      </div>

      <div class="section-container reflect-depth">
        <div class="reflect-depth-heading">
          <p class="section-eyebrow">THERAPIST STANCE + GROWTH</p>
          <h3>See how you tend to work — then let the questions <em>evolve with the work.</em></h3>
          <p>Reflect separates a structured snapshot of your therapeutic stance from the longer-term patterns in your own reflection history. One gives you a point-in-time view; the other keeps the inquiry moving.</p>
        </div>

        <div class="reflect-depth-grid">
          <article class="reflect-depth-card stance">
            <span class="reflect-depth-index">01 · THERAPIST STANCE</span>
            <h4>“What kind of therapist are you?”</h4>
            <p>Fifteen hypothetical practice situations ask for your usual first response. Helios looks across those choices for familiar approaches, tensions and questions worth taking into supervision.</p>
            <p>You can read a question-based reflection immediately, or request an optional AI-written integrative reflection. Nothing is added to your reflection library unless you choose to save it.</p>
            <div class="reflect-depth-tags" aria-label="Therapist Stance boundaries">
              <span>15 situations</span>
              <span>Private until saved</span>
              <span>Not a competence score</span>
            </div>
          </article>

          <article class="reflect-depth-card growth">
            <span class="reflect-depth-index">02 · GROWTH</span>
            <h4>Your reflection history changes the next questions.</h4>
            <p>Growth looks across your saved direct practice reflections for recurring themes and mapped inner positions. Stance questionnaire records are deliberately excluded from that analysis.</p>
            <p>When a thread repeats, Helios turns it into a specific learning or supervision question. Once there are at least four dated reflections, it also compares the earlier and more recent halves of your history to show where your attention has shifted.</p>
            <p class="reflect-depth-note">The 15 Stance situations themselves stay stable. What adapts is the inquiry Helios raises from your ongoing reflection history — without deciding that a pattern is good, bad, improvement or deterioration.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="capture" class="capture-section">
      <div class="section-container capture-layout">
        <div class="capture-copy">
          <p class="section-eyebrow">SESSION MATERIAL</p>
          <h2>From transcript to something <em>clinically useful.</em></h2>
          <p>Transcript Inbox is a triage queue, not another place to read everything. Identify the likely source, assign the client, preview only when needed, then move into the clinical workflow.</p>

          <div class="capture-steps">
            <article><span>01</span><div><h3>Bring the material in</h3><p>Zoom transcript text, pasted text or transcript files can enter one queue.</p></div></article>
            <article><span>02</span><div><h3>Assign without losing your place</h3><p>Use the available identity clues and assign from the row rather than opening every transcript.</p></div></article>
            <article><span>03</span><div><h3>Shape the output deliberately</h3><p>Choose the summary approach, review editable drafts and keep formal Clinical Record approval explicit.</p></div></article>
          </div>

          <div class="capture-trust"><ShieldCheck :size="18" /><span><strong>No audio or video is imported.</strong> Helios works with transcript text and only analyses material when you choose an AI action.</span></div>
        </div>

        <div class="transcript-showcase">
          <img :src="transcriptScreenshot" class="transcript-screenshot" alt="Helios Transcript Inbox with transcript triage and import controls" />
        </div>
      </div>
    </section>

    <section id="tools" class="tools-section">
      <div class="section-container">
        <div class="section-heading split-heading compact">
          <div>
            <p class="section-eyebrow">THE SUPPORTING LAYER</p>
            <h2>The practical tools stay <em>in their place.</em></h2>
          </div>
          <p>Useful infrastructure should support the clinical work, not become the product story.</p>
        </div>

        <div class="tool-grid">
          <article v-for="tool in supportingTools" :key="tool.title" class="tool-card">
            <component :is="tool.icon" :size="27" :stroke-width="1.5" />
            <h3>{{ tool.title }}</h3>
            <p>{{ tool.blurb }}</p>
          </article>
        </div>

        <div class="documents-band">
          <div class="documents-band-copy">
            <p class="section-eyebrow">PRACTICE DOCUMENTS</p>
            <h3>Agreements, resources and client-facing documents — organised without becoming the centre of the system.</h3>
            <p>Create, store and reuse the practical material that belongs around the work.</p>
          </div>
          <div class="documents-showcase">
            <img :src="documentsScreenshot" class="documents-screenshot" alt="Helios Documents workspace" />
          </div>
        </div>
      </div>
    </section>

    <section class="trust-section">
      <div class="section-container trust-layout">
        <div>
          <p class="section-eyebrow light">THERAPIST-CONTROLLED BY DESIGN</p>
          <h2>AI where it helps. <em>Boundaries where they matter.</em></h2>
        </div>
        <div class="trust-points">
          <article><strong>Nothing silently becomes a Clinical Record.</strong><p>AI-assisted drafts remain reviewable and editable until you take the deliberate record action.</p></article>
          <article><strong>Research stays separate from client context.</strong><p>Published-evidence questions use a distinct Research mode rather than quietly carrying private clinical records into the request.</p></article>
          <article><strong>Reflection stays therapist-owned.</strong><p>Private reflective material is not automatically copied into client summaries or formal records.</p></article>
          <article><strong>Your workspace is not an advertising product.</strong><p>Helios is designed around clinical work, privacy and therapist control rather than engagement or ad targeting.</p></article>
        </div>
      </div>
    </section>

    <section id="pricing" class="offer-section">
      <div class="section-container offer-inner">
        <div class="offer-copy">
          <p class="section-eyebrow">SIMPLE PRICING</p>
          <h2>Free forever. <em>Professional when you need it.</em></h2>
          <p>Free: five active clients and up to five short text-AI actions monthly, no payment card required. Professional: £29/month or £290/year paid upfront, with unlimited active clients. Dictation is available across plans subject to fair use. For Clinic or Enterprise, <a href="mailto:hello@helio.works?subject=Helios%20Clinic%20enquiry">talk to us</a>.</p>
        </div>
        <router-link to="/get-started" class="offer-button">Start Free — no card required <ArrowUpRight :size="18" /></router-link>
      </div>
    </section>

    <section class="final-section">
      <div class="section-container final-inner">
        <p class="section-eyebrow">A CLINICAL WORKSPACE, NOT ANOTHER ADMIN SYSTEM</p>
        <h2>Keep more of your attention <em>on the work itself.</em></h2>
        <p>Create a workspace free, add your first clients and let Helios stay quiet until you need it.</p>
        <div class="final-actions">
          <router-link to="/get-started" class="primary-button">Create your workspace <ArrowUpRight :size="18" /></router-link>
          <a href="#ask-helios" class="secondary-button">Explore Ask Helios <ArrowRight :size="18" /></a>
        </div>
      </div>
    </section>

    <footer class="landing-footer">
      <div class="section-container footer-inner">
        <div class="footer-brand-block">
          <router-link to="/" class="brand brand-small" aria-label="Helios home">
            <span class="brand-sun" aria-hidden="true"><span class="sun-disc" /><span class="sun-line" /></span>
            <span>helios<span class="brand-dot">.</span></span>
          </router-link>
          <p class="footer-built-title">Clinical workspace software for therapists.</p>
          <p class="footer-built-copy">Designed to keep client work, clinical thinking, reflection and practical administration connected without collapsing them into the same thing.</p>
        </div>

        <div class="footer-trust">
          <p class="footer-kicker">DESIGNED AROUND CLINICAL WORK</p>
          <p>AI-assisted features run when you choose to use them. Drafts remain editable and the therapist remains responsible for clinical decisions and records.</p>
          <p>Google Workspace data is not used to train general-purpose AI models.</p>
        </div>

        <div class="footer-links">
          <p class="footer-kicker">DATA, PRIVACY &amp; SUPPORT</p>
          <nav aria-label="Legal, data and support">
            <router-link to="/privacy">Privacy notice</router-link>
            <router-link to="/ai-data">AI &amp; data processing</router-link>
            <router-link to="/cookies">Cookie information</router-link>
            <router-link to="/terms">Terms of service</router-link>
            <router-link to="/support">Support</router-link>
          </nav>
        </div>

        <div class="footer-offer">
          <p class="footer-kicker">START SMALL</p>
          <p class="footer-built-title">Free for up to five active clients.</p>
          <p class="footer-built-copy">No payment card required. Move to Professional when your practice needs unlimited active clients.</p>
          <p class="footer-built-offer">Professional £29/month or £290/year</p>
        </div>
      </div>
      <div class="section-container footer-bottom">
        <span>Helios is operated by Chrysalis Therapy Services.</span>
        <span class="copyright">© {{ new Date().getFullYear() }} Helios</span>
      </div>
    </footer>
  </main>
</template>

<script setup>
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  FileText,
  Link2,
  Mic,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
} from '@lucide/vue'
import openingImage from '../assets/helios-opening-light.webp'
import clientWorkspace from '../assets/client-workspace-section.png'
import transcriptScreenshot from '../assets/transcript-inbox-section.webp'
import documentsScreenshot1 from '../assets/documents-landing-1.b64?raw'
import documentsScreenshot2 from '../assets/documents-landing-2.b64?raw'
import documentsScreenshot3 from '../assets/documents-landing-3.b64?raw'
import documentsScreenshot4 from '../assets/documents-landing-4.b64?raw'
import documentsScreenshot5 from '../assets/documents-landing-5.b64?raw'

const documentsScreenshot = `data:image/webp;base64,${[documentsScreenshot1, documentsScreenshot2, documentsScreenshot3, documentsScreenshot4, documentsScreenshot5].join('').trim()}`

const reflectCards = [
  { title: 'Reflections', detail: 'What has stayed with you.' },
  { title: 'Therapist Stance', detail: 'How you tend to work.' },
  { title: 'Map', detail: 'What is recurring or taking shape.' },
  { title: 'Growth', detail: 'Your learning edge.' },
]

const supportingTools = [
  { icon: CalendarDays, title: 'Calendar', blurb: 'Google Calendar alongside the clinical day, with appointments where you need them.' },
  { icon: FileText, title: 'Documents', blurb: 'Practice documents, client-facing summaries, resources and reusable material.' },
  { icon: Mic, title: 'Dictation', blurb: 'Speak your own text into supported fields, then review and edit it before use.' },
  { icon: Users, title: 'Supervision', blurb: 'Deliberately select reflective material you want to carry into supervision.' },
  { icon: Video, title: 'Zoom', blurb: 'Join meetings from Helios and bring available transcript text into the workflow.' },
  { icon: Link2, title: 'Integrations', blurb: 'Keep the tools you already use connected without making integrations the centre of the practice.' },
]
</script>

<style scoped>
.landing-shell {
  --section-space: clamp(52px, 5vw, 68px);
  --section-space-tight: clamp(42px, 4vw, 54px);
  overflow: hidden;
  background: #f7f5ef;
  color: #172e38;
  font-family: "Noto Sans", ui-sans-serif, system-ui, sans-serif;
}
.section-container { max-width: 1440px; margin: 0 auto; padding-left: 72px; padding-right: 72px; }
.landing-header { height: 84px; background: rgba(247,245,239,.96); border-bottom: 1px solid #e8e6df; position: relative; z-index: 20; backdrop-filter: blur(14px); }
.header-inner { max-width: 1440px; height: 100%; margin: auto; padding: 0 72px; display: flex; align-items: center; gap: 28px; }
.brand { display: inline-flex; align-items: center; gap: 9px; color: #18333c; font-family: Georgia, "Times New Roman", serif; font-size: 35px; line-height: 1; letter-spacing: -.065em; white-space: nowrap; }
.brand-dot { color: #c58a5c; }
.brand-sun { position: relative; width: 31px; height: 25px; display: inline-block; flex: none; }
.sun-disc { position: absolute; left: 7px; bottom: 5px; width: 17px; height: 9px; border-radius: 17px 17px 0 0; background: #c58a5c; }
.sun-line { position: absolute; left: 1px; right: 1px; bottom: 4px; height: 1.5px; background: #18333c; border-radius: 99px; }
.brand-sun::before, .brand-sun::after { content: ""; position: absolute; bottom: 15px; width: 1.5px; height: 6px; background: #c58a5c; border-radius: 99px; }
.brand-sun::before { left: 7px; transform: rotate(-42deg); }
.brand-sun::after { right: 7px; transform: rotate(42deg); }
.header-nav { display: flex; align-items: center; gap: 30px; margin-left: auto; }
.header-nav a, .sign-in-link { font-size: 12px; font-weight: 650; color: #43565a; white-space: nowrap; }
.account-nav { display: flex; align-items: center; gap: 14px; margin-left: 18px; }
.header-cta { display: inline-flex; align-items: center; gap: 14px; background: #19343e; color: #fffaf1; padding: 13px 17px; border-radius: 14px; font-size: 11px; font-weight: 650; white-space: nowrap; }

.opening-splash { position: relative; min-height: min(720px, 82vh); display: flex; align-items: flex-start; overflow: hidden; background: #efe8dc; color: #f8f4ea; }
.opening-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: brightness(1.02) saturate(.86) contrast(.98); }
.opening-shade { position: absolute; inset: 0; }
.opening-shade-side { background: linear-gradient(90deg, rgba(18,45,54,.8) 0%, rgba(18,45,54,.55) 38%, rgba(18,45,54,.14) 67%, transparent 86%); }
.opening-shade-bottom { background: linear-gradient(0deg, rgba(20,48,56,.28), transparent 52%); }
.opening-copy { position: relative; z-index: 2; width: 100%; max-width: 1280px; margin: 0 auto; padding: 92px 44px 72px; }
.opening-eyebrow, .section-eyebrow, .mini-eyebrow { font-size: 10px; line-height: 1.4; font-weight: 750; letter-spacing: .19em; text-transform: uppercase; color: #a47756; }
.opening-eyebrow { color: #e7b877; }
.opening-copy h1 { max-width: 760px; margin: 21px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: clamp(48px, 5.7vw, 82px); line-height: 1.01; font-weight: 400; letter-spacing: -.045em; }
.opening-copy > p:not(.opening-eyebrow) { margin-top: 24px; max-width: 650px; font-size: 18px; line-height: 1.65; color: rgba(248,244,234,.96); }
.opening-actions { margin-top: 34px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.opening-button { display: inline-flex; align-items: center; gap: 12px; padding: 13px 19px; border-radius: 14px; font-size: 13px; font-weight: 650; }
.opening-button.primary { background: #f7f3e9; color: #18333c; border: 1px solid rgba(255,255,255,.6); }
.opening-button.secondary { border: 1px solid rgba(248,244,234,.62); background: rgba(24,51,60,.24); color: #fff; backdrop-filter: blur(3px); }

.section-heading { margin-bottom: 28px; }
.split-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 60px; }
.section-heading h2, .ask-copy h2, .reflect-copy h2, .capture-copy h2, .trust-layout h2, .offer-copy h2, .final-inner h2 { font-family: Georgia, "Times New Roman", serif; font-weight: 400; letter-spacing: -.04em; }
.section-heading h2 { max-width: 760px; margin-top: 14px; font-size: clamp(48px, 4.7vw, 68px); line-height: 1.03; }
.section-heading h2 em, .ask-copy h2 em, .reflect-copy h2 em, .capture-copy h2 em, .trust-layout h2 em, .offer-copy h2 em, .final-inner h2 em { color: #98745b; font-weight: 400; }
.split-heading > p { max-width: 430px; padding-bottom: 5px; color: #687671; font-size: 14px; line-height: 1.75; }

.workspace-section { padding: var(--section-space) 0; background: #eeeee7; }
.clinical-showcase { padding: 10px; background: #d9ded9; border: 1px solid #d3d9d2; box-shadow: 0 28px 60px rgba(29,47,45,.08); border-radius: 10px; }
.clinical-screenshot { display: block; width: 100%; aspect-ratio: 1272/652; object-fit: cover; object-position: center top; border: 1px solid #cdd5d0; border-radius: 7px; }
.thread-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin-top: 26px; background: #d5d8d0; border: 1px solid #d5d8d0; border-radius: 16px; overflow: hidden; }
.thread-grid article { min-height: 170px; padding: 24px; background: #f7f5ef; }
.thread-grid span, .capture-steps > article > span { color: #9b7b62; font-family: Georgia, serif; font-size: 16px; }
.thread-grid h3 { margin-top: 25px; font-family: Georgia, serif; font-size: 24px; font-weight: 400; letter-spacing: -.02em; }
.thread-grid p { margin-top: 8px; color: #66736e; font-size: 12px; line-height: 1.65; }

.ask-section { padding: var(--section-space) 0 var(--section-space-tight); background: #17323b; color: #f8f4ea; }
.section-eyebrow.light { color: #e2ad75; }
.ask-layout { display: grid; grid-template-columns: minmax(0,.92fr) minmax(480px,1.08fr); gap: 62px; align-items: start; }
.ask-copy h2 { margin-top: 15px; max-width: 620px; font-size: clamp(54px, 5vw, 74px); line-height: 1.01; }
.ask-copy h2 em { color: #d9aa7c; }
.ask-lede { margin-top: 20px; max-width: 570px; color: #c9d1cd; font-size: 14px; line-height: 1.78; }
.mode-list { margin-top: 30px; border-top: 1px solid rgba(255,255,255,.13); }
.mode-list article { display: grid; grid-template-columns: 44px 1fr; gap: 14px; padding: 18px 0; border-bottom: 1px solid rgba(255,255,255,.13); }
.mode-index { color: #e2ad75; font-family: Georgia, serif; font-size: 14px; }
.mode-list h3 { font-family: Georgia, serif; font-size: 24px; font-weight: 400; }
.mode-list p { margin-top: 5px; max-width: 520px; color: #bfc9c5; font-size: 12px; line-height: 1.65; }
.boundary-note { margin-top: 22px; max-width: 560px; color: #9fb0aa; font-size: 11px; line-height: 1.65; }
.ask-product { min-width: 0; padding-top: 14px; }
.ask-panel { border: 1px solid rgba(255,255,255,.16); background: #f8f6f0; color: #18333c; border-radius: 22px; box-shadow: 0 36px 80px rgba(0,0,0,.2); overflow: hidden; }
.ask-panel-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; padding: 20px 22px 16px; border-bottom: 1px solid #e1e3dd; }
.ask-panel-header > div { display: grid; gap: 4px; }
.ask-kicker { color: #9b745a; font-size: 9px; font-weight: 750; letter-spacing: .16em; }
.ask-panel-header strong { font-family: Georgia, serif; font-size: 22px; font-weight: 400; }
.ask-status { padding: 6px 9px; border: 1px solid #d5d9d2; border-radius: 999px; color: #66756f; font-size: 9px; }
.ask-tabs { display: flex; gap: 7px; padding: 13px 18px; border-bottom: 1px solid #e5e5df; background: #f1f2ed; }
.ask-tabs span { padding: 7px 10px; border-radius: 9px; color: #78837e; font-size: 10px; font-weight: 700; }
.ask-tabs .active { background: #fff; color: #21463e; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.ask-context { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; padding: 14px 18px; border-bottom: 1px solid #e5e5df; color: #6d7a75; font-size: 9px; }
.ask-context > span { align-self: center; font-weight: 750; text-transform: uppercase; letter-spacing: .08em; }
.ask-context div { display: grid; gap: 2px; padding-left: 10px; border-left: 1px solid #dde0db; }
.ask-context strong { color: #41544e; font-size: 9px; }
.ask-context em { font-style: normal; }
.ask-question { margin: 18px 20px 0 88px; padding: 12px 14px; background: #e6ece8; border-radius: 14px 14px 4px 14px; }
.ask-question small { color: #6f7d77; font-size: 9px; }
.ask-question p { margin-top: 4px; font-size: 11px; line-height: 1.55; }
.ask-answer { margin: 12px 54px 20px 20px; padding: 16px; border: 1px solid #e0e1dc; border-radius: 16px 16px 16px 4px; background: #fff; }
.answer-label { display: flex; align-items: center; gap: 6px; color: #9b745a; font-size: 9px; font-weight: 750; text-transform: uppercase; letter-spacing: .08em; }
.ask-answer h4 { margin-top: 13px; font-family: Georgia, serif; font-size: 15px; font-weight: 400; }
.ask-answer p { margin-top: 4px; color: #65736e; font-size: 10px; line-height: 1.55; }
.answer-sources { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
.answer-sources span { padding: 5px 8px; border-radius: 999px; background: #f1f2ed; color: #71807a; font-size: 8px; }
.ask-composer { margin: 0 18px 18px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px; border: 1px solid #d6dbd5; border-radius: 13px; color: #8a938e; font-size: 10px; }

.reflect-section { padding: var(--section-space-tight) 0 var(--section-space); background: #f2f2ed; border-top: 1px solid rgba(59,78,70,.06); }
.reflect-layout { display: grid; grid-template-columns: minmax(0,1.05fr) minmax(390px,.95fr); gap: 60px; align-items: start; }
.reflect-product { padding-top: 10px; }
.reflect-frame { padding: 28px; border: 1.5px solid #bcc7be; border-radius: 22px; background: #edf1ec; box-shadow: 0 22px 48px rgba(42,56,51,.065); }
.reflect-topline { display: flex; align-items: flex-end; justify-content: space-between; gap: 30px; padding-bottom: 22px; border-bottom: 1px solid #dde0db; }
.reflect-topline h3 { margin-top: 5px; font-family: Georgia, serif; font-size: 34px; font-weight: 400; }
.reflect-topline p { max-width: 320px; text-align: right; color: #68756f; font-family: Georgia, serif; font-size: 13px; line-height: 1.55; }
.reflect-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; }
.reflect-cards article { min-height: 140px; display: flex; flex-direction: column; justify-content: space-between; padding: 17px; border: 1.5px solid #c2ccc4; border-radius: 14px; background: #e4eae4; }
.reflect-cards article > span { color: #9b745a; font-family: Georgia, serif; font-size: 13px; }
.reflect-cards h4 { font-family: Georgia, serif; font-size: 21px; font-weight: 400; }
.reflect-cards p { margin-top: 5px; color: #78837e; font-size: 10px; line-height: 1.5; }
.reflect-discovery { margin-top: 12px; padding: 19px; border: 1px solid #c4cec6; border-radius: 14px; background: #dce5dd; }
.reflect-discovery h4 { margin-top: 6px; font-family: Georgia, serif; font-size: 21px; font-weight: 400; }
.reflect-discovery p { margin-top: 6px; color: #65726c; font-size: 10px; line-height: 1.6; }
.reflect-copy h2 { max-width: 600px; margin-top: 13px; font-size: clamp(48px, 4.35vw, 64px); line-height: 1.04; }
.reflect-copy > p:not(.section-eyebrow) { margin-top: 16px; max-width: 570px; color: #67746f; font-size: 14px; line-height: 1.78; }
.reflect-points { margin-top: 22px; display: grid; gap: 11px; }
.reflect-points > div { display: grid; grid-template-columns: 150px 1fr; gap: 18px; padding-top: 13px; border-top: 1px solid #dedfd9; }
.reflect-points strong { font-family: Georgia, serif; font-size: 15px; font-weight: 400; }
.reflect-points span { color: #75807b; font-size: 11px; line-height: 1.6; }

.reflect-depth { margin-top: 44px; }
.reflect-depth-heading { display: grid; grid-template-columns: minmax(0,.9fr) minmax(320px,1.1fr); column-gap: 56px; row-gap: 12px; align-items: end; padding-top: 34px; border-top: 1px solid #c5cec7; }
.reflect-depth-heading .section-eyebrow { grid-column: 1 / -1; }
.reflect-depth-heading h3 { max-width: 700px; font-family: Georgia, "Times New Roman", serif; font-size: clamp(38px, 3.5vw, 52px); line-height: 1.05; font-weight: 400; letter-spacing: -.035em; }
.reflect-depth-heading h3 em { color: #98745b; font-weight: 400; }
.reflect-depth-heading > p:last-child { max-width: 560px; color: #61706a; font-size: 13px; line-height: 1.72; padding-bottom: 4px; }
.reflect-depth-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 26px; }
.reflect-depth-card { min-height: 330px; padding: 26px; border: 1.5px solid #b9c5bc; border-radius: 20px; background: #e3e9e3; }
.reflect-depth-card.growth { background: #d5dfd7; border-color: #abb9ae; }
.reflect-depth-index { display: block; color: #8e6d57; font-size: 9px; line-height: 1.4; font-weight: 800; letter-spacing: .15em; }
.reflect-depth-card h4 { margin-top: 18px; max-width: 520px; font-family: Georgia, "Times New Roman", serif; font-size: 29px; line-height: 1.12; font-weight: 400; letter-spacing: -.025em; }
.reflect-depth-card > p { margin-top: 13px; max-width: 60ch; color: #5c6a64; font-size: 12px; line-height: 1.7; }
.reflect-depth-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 20px; }
.reflect-depth-tags span { padding: 6px 9px; border: 1px solid #bdc8bf; border-radius: 999px; background: #edf0ec; color: #5d6b65; font-size: 9px; font-weight: 700; }
.reflect-depth-note { margin-top: 18px !important; padding-top: 16px; border-top: 1px solid #b7c3ba; color: #465a51 !important; font-weight: 600; }

.capture-section { padding: var(--section-space) 0; background: #ece9e1; border-top: 1px solid rgba(59,78,70,.06); }
.capture-layout { display: grid; grid-template-columns: minmax(350px,.88fr) minmax(0,1.12fr); gap: 52px; align-items: start; }
.capture-copy h2 { max-width: 620px; margin-top: 13px; font-size: clamp(48px, 4.35vw, 64px); line-height: 1.04; }
.capture-copy > p:not(.section-eyebrow) { margin-top: 16px; max-width: 570px; color: #69746f; font-size: 14px; line-height: 1.75; }
.capture-steps { margin-top: 26px; display: grid; gap: 10px; }
.capture-steps article { display: grid; grid-template-columns: 42px 1fr; gap: 13px; padding: 14px 0; border-top: 1px solid #dad5cb; }
.capture-steps h3 { font-family: Georgia, serif; font-size: 19px; font-weight: 400; }
.capture-steps p { margin-top: 4px; color: #737d77; font-size: 11px; line-height: 1.55; }
.capture-trust { margin-top: 20px; display: flex; align-items: flex-start; gap: 10px; padding: 13px 14px; border: 1px solid #ced9cf; border-radius: 14px; background: #e3e9e1; color: #4d6158; font-size: 11px; line-height: 1.55; }
.capture-trust svg { flex: none; margin-top: 1px; }
.transcript-showcase { min-width: 0; margin-top: 10px; padding: 9px; border: 1px solid #d8d1c5; border-radius: 22px; background: #f8f4ec; box-shadow: 0 26px 58px rgba(32,50,45,.1); overflow: hidden; }
.transcript-screenshot { display: block; width: 100%; height: auto; aspect-ratio: 2048/1277; object-fit: cover; object-position: center top; border-radius: 15px; }

.tools-section { padding: var(--section-space) 0; background: #e4e8e2; border-top: 1px solid rgba(59,78,70,.08); border-bottom: 1px solid rgba(59,78,70,.08); }
.section-heading.compact h2 { max-width: 680px; }
.tools-section .split-heading > p { color: #5f6d67; }
.tool-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.tool-card { min-height: 190px; padding: 22px; border: 1.5px solid #b6c2b8; border-radius: 18px; background: #dfe6df; box-shadow: 0 8px 22px rgba(35,55,49,.045); }
.tool-card svg { color: #41665a; }
.tool-card h3 { margin-top: 25px; font-family: Georgia, serif; font-size: 25px; font-weight: 400; }
.tool-card p { margin-top: 8px; max-width: 33ch; color: #62706a; font-size: 11px; line-height: 1.6; }
.documents-band { margin-top: 42px; display: grid; grid-template-columns: minmax(280px,.65fr) minmax(0,1.35fr); gap: 40px; align-items: start; padding: 30px; border: 1.5px solid #b4c0b6; border-radius: 20px; background: #ccd6ce; }
.documents-band-copy h3 { margin-top: 14px; max-width: 520px; font-family: Georgia, serif; font-size: clamp(36px,3.4vw,50px); line-height: 1.06; font-weight: 400; letter-spacing: -.035em; }
.documents-band-copy > p:last-child { margin-top: 15px; max-width: 430px; color: #5f6d67; font-size: 12px; line-height: 1.68; }
.documents-showcase { min-width: 0; box-shadow: 0 20px 42px rgba(34,57,53,.09); border: 8px solid #bfcac1; border-radius: 10px; overflow: hidden; background: #bfcac1; }
.documents-screenshot { display: block; width: 100%; height: auto; aspect-ratio: 1594/1000; object-fit: cover; object-position: center top; border: 1px solid #cdd5d0; border-radius: 5px; }

.trust-section { padding: var(--section-space) 0; background: #213f46; color: #f8f4ea; }
.trust-layout { display: grid; grid-template-columns: minmax(300px,.82fr) minmax(0,1.18fr); gap: 62px; align-items: start; }
.trust-layout h2 { margin-top: 14px; max-width: 600px; font-size: clamp(48px,4.35vw,64px); line-height: 1.04; }
.trust-layout h2 em { color: #dfad7d; }
.trust-points { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.15); border-radius: 17px; overflow: hidden; }
.trust-points article { min-height: 190px; padding: 23px; background: #294950; }
.trust-points strong { font-family: Georgia, serif; font-size: 18px; font-weight: 400; line-height: 1.3; }
.trust-points p { margin-top: 10px; color: #bcc9c5; font-size: 11px; line-height: 1.65; }

.offer-section { background: #eee9df; border-bottom: 1px solid rgba(59,78,70,.1); }
.offer-inner { display: flex; align-items: end; justify-content: space-between; gap: 48px; padding-top: var(--section-space-tight); padding-bottom: var(--section-space-tight); }
.offer-copy { max-width: 830px; }
.offer-copy h2 { margin-top: 14px; font-size: clamp(46px,4.8vw,66px); line-height: 1.02; }
.offer-copy > p:not(.section-eyebrow) { max-width: 710px; margin-top: 15px; color: #66716a; font-size: 13px; line-height: 1.7; }
.offer-copy a { text-decoration: underline; text-underline-offset: 3px; }
.offer-button { min-width: 238px; display: inline-flex; align-items: center; justify-content: space-between; gap: 18px; padding: 16px 18px; border: 1px solid #19343e; border-radius: 14px; background: #19343e; color: #fffaf1; font-size: 12px; font-weight: 650; }

.final-section { background: #f5f4ef; padding: var(--section-space) 0; text-align: center; }
.final-inner h2 { max-width: 910px; margin: 17px auto 0; font-size: clamp(54px,5.6vw,78px); line-height: 1.03; }
.final-inner > p:not(.section-eyebrow) { max-width: 570px; margin: 18px auto 0; color: #6d7973; font-size: 13px; line-height: 1.7; }
.final-actions { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 28px; }
.primary-button, .secondary-button { min-width: 205px; display: inline-flex; align-items: center; justify-content: space-between; gap: 18px; padding: 16px 18px; border-radius: 14px; font-size: 12px; font-weight: 650; }
.primary-button { background: #19343e; color: #fffaf1; border: 1px solid #19343e; }
.secondary-button { border: 1px solid #bac9c1; color: #25453f; }

.landing-footer { background: #eee9df; border-top: 1px solid rgba(59,78,70,.1); color: #203a3d; }
.footer-inner { display: grid; grid-template-columns: minmax(0,1.15fr) minmax(260px,.85fr); column-gap: 96px; row-gap: 48px; padding-top: 42px; padding-bottom: 34px; }
.footer-brand-block { grid-column: 1; grid-row: 1; }
.footer-offer { grid-column: 2; grid-row: 1; }
.footer-trust { grid-column: 1; grid-row: 2; }
.footer-links { grid-column: 2; grid-row: 2; }
.brand-small { font-size: 30px; }
.footer-kicker { margin-bottom: 12px; color: #9a7358; font-size: 9px; font-weight: 750; letter-spacing: .16em; }
.footer-built-title { max-width: 26ch; margin-top: 18px; color: #284548; font-family: Georgia, serif; font-size: 19px; line-height: 1.3; }
.footer-built-copy { max-width: 42ch; margin-top: 8px; color: #657069; font-size: 11px; line-height: 1.68; }
.footer-built-offer { margin-top: 13px; color: #526861; font-size: 10px; font-weight: 650; }
.footer-trust > p:not(.footer-kicker) { max-width: 52ch; color: #657069; font-size: 11px; line-height: 1.72; }
.footer-trust > p + p { margin-top: 8px; }
.footer-links nav { display: grid; gap: 8px; }
.footer-links nav a { width: max-content; max-width: 100%; color: #526861; font-size: 11px; line-height: 1.45; }
.footer-bottom { min-height: 52px; display: flex; align-items: center; justify-content: space-between; gap: 24px; border-top: 1px solid rgba(59,78,70,.1); color: #899087; font-size: 9px; }
.copyright { white-space: nowrap; }

@media (max-width: 1200px) {
  .section-container, .header-inner { padding-left: 44px; padding-right: 44px; }
  .header-nav { gap: 19px; }
  .ask-layout, .reflect-layout { gap: 46px; }
}
@media (max-width: 1020px) {
  .header-nav { display: none; }
  .account-nav { margin-left: auto; }
  .workspace-section, .ask-section, .reflect-section, .capture-section, .tools-section, .trust-section { padding-top: 50px; padding-bottom: 52px; }
  .ask-layout, .reflect-layout, .capture-layout, .trust-layout { grid-template-columns: 1fr; gap: 32px; }
  .reflect-depth-heading, .reflect-depth-grid { grid-template-columns: 1fr; }
  .reflect-depth-heading { gap: 14px; }
  .reflect-depth-heading > p:last-child { max-width: 700px; }
  .ask-product, .reflect-product { padding-top: 0; }
  .transcript-showcase { margin-top: 0; }
  .section-heading h2, .ask-copy h2, .reflect-copy h2, .capture-copy h2, .trust-layout h2 { font-size: clamp(44px, 6vw, 58px); }
  .ask-copy, .reflect-copy, .capture-copy { max-width: 780px; }
  .reflect-product { order: 2; }
  .reflect-copy { order: 1; }
  .split-heading { align-items: flex-start; flex-direction: column; gap: 18px; }
  .split-heading > p { max-width: 600px; }
  .documents-band { grid-template-columns: 1fr; padding: 24px; }
  .offer-inner { align-items: flex-start; flex-direction: column; gap: 26px; }
}
@media (max-width: 760px) {
  .thread-grid, .tool-grid { grid-template-columns: 1fr 1fr; }
  .trust-points { grid-template-columns: 1fr; }
  .footer-inner { grid-template-columns: 1fr; gap: 28px; }
  .footer-brand-block, .footer-offer, .footer-trust, .footer-links { grid-column: auto; grid-row: auto; }
}
@media (max-width: 650px) {
  .section-container, .header-inner { padding-left: 22px; padding-right: 22px; }
  .landing-header { height: 72px; }
  .brand { font-size: 31px; }
  .sign-in-link { display: none; }
  .header-cta { padding: 11px; font-size: 0; gap: 0; }
  .opening-splash { min-height: 620px; }
  .opening-image { object-position: 82% center; }
  .opening-copy { padding: 62px 22px 60px; }
  .opening-copy h1 { font-size: clamp(46px, 13vw, 62px); }
  .opening-copy > p:not(.opening-eyebrow) { font-size: 15px; }
  .opening-actions { align-items: stretch; flex-direction: column; max-width: 320px; }
  .opening-button { justify-content: space-between; }
  .workspace-section, .ask-section, .reflect-section, .capture-section, .tools-section, .trust-section { padding: 44px 0 46px; }
  .section-heading h2, .ask-copy h2, .reflect-copy h2, .capture-copy h2, .trust-layout h2 { font-size: clamp(40px, 10.5vw, 54px); line-height: 1.05; }
  .clinical-showcase { padding: 5px; overflow: hidden; }
  .clinical-screenshot { width: 118%; max-width: none; transform: translateX(-7.5%); aspect-ratio: 900/620; }
  .thread-grid { grid-template-columns: 1fr; }
  .thread-grid article { min-height: 140px; }
  .ask-panel { border-radius: 17px; }
  .ask-context { grid-template-columns: 1fr 1fr; }
  .ask-context > span { grid-column: 1 / -1; }
  .ask-question { margin-left: 52px; }
  .ask-answer { margin-right: 18px; }
  .reflect-frame { padding: 17px; }
  .reflect-topline { align-items: flex-start; flex-direction: column; gap: 10px; }
  .reflect-topline p { text-align: left; }
  .reflect-cards { grid-template-columns: 1fr; }
  .reflect-cards article { min-height: 120px; }
  .reflect-points > div { grid-template-columns: 1fr; gap: 4px; }
  .reflect-depth { margin-top: 34px; }
  .reflect-depth-heading { padding-top: 28px; }
  .reflect-depth-heading h3 { font-size: clamp(34px, 9vw, 46px); }
  .reflect-depth-card { min-height: 0; padding: 20px; border-radius: 16px; }
  .reflect-depth-card h4 { font-size: 25px; }
  .transcript-showcase { padding: 5px; border-radius: 18px; }
  .transcript-screenshot { width: 124%; max-width: none; transform: translateX(-9.5%); aspect-ratio: 900/730; object-position: center top; }
  .tool-grid { grid-template-columns: 1fr; }
  .tool-card { min-height: 160px; }
  .documents-band { padding: 18px; border-radius: 16px; }
  .documents-showcase { border-width: 5px; }
  .documents-screenshot { aspect-ratio: 690/619; width: 125%; max-width: none; transform: translateX(-10%); }
  .offer-inner { padding-top: 38px; padding-bottom: 40px; }
  .offer-copy h2 { font-size: clamp(42px,11vw,56px); }
  .offer-button { width: 100%; min-width: 0; }
  .final-section { padding: 50px 0 56px; }
  .final-inner h2 { font-size: clamp(50px,11vw,68px); }
  .final-actions { flex-direction: column; }
  .final-actions a { width: 100%; max-width: 310px; }
  .footer-bottom { min-height: 0; align-items: flex-start; flex-direction: column; gap: 6px; padding-top: 14px; padding-bottom: 18px; }
}
</style>
