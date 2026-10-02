<template>
  <main class="landing-shell">
    <header class="landing-header">
      <div class="header-inner">
        <router-link to="/" class="brand" aria-label="Helios home">
          <span class="brand-mark" aria-hidden="true"><span /></span>
          <span>helios<span class="brand-dot">.</span></span>
        </router-link>

        <nav class="header-nav" aria-label="Landing page sections">
          <a href="#workspace">The workspace</a>
          <a href="#documents">Documents</a>
          <a href="#features">Features</a>
          <a href="#integrations">Integrations</a>
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
        <p class="opening-eyebrow">Helios · Therapist workspace</p>
        <h1>A place for your whole practice.</h1>
        <p>Sessions, clients, calendar, documents and reflection, together in one workspace.</p>
        <a href="#workspace" class="opening-button">Explore the workspace <span aria-hidden="true">↓</span></a>
      </div>
    </section>

    <section id="workspace" class="workspace-section">
      <div class="section-container">
        <div class="editorial-heading">
          <p class="section-eyebrow">THE CLINICAL WORKSPACE</p>
          <h2>The whole thread of the work, <em>in one place.</em></h2>
          <p>Keep each client’s story connected — from the details of a session to the wider direction of the work.</p>
        </div>

        <div class="clinical-showcase">
          <img
            :src="clientWorkspace"
            class="clinical-screenshot"
            alt="Helios Client Workspace showing Alex Morgan, current focus, aims and objectives, supervision actions and clinical workspace access"
          />
        </div>
        <div class="showcase-footnote">
          <span>ONE CONSIDERED PLACE FOR YOUR CLIENT WORK</span>
          <span>01 — Client workspace</span>
        </div>
      </div>
    </section>

    <section id="documents" class="documents-section">
      <div class="section-container documents-layout">
        <div class="documents-copy">
          <p class="section-eyebrow">PRACTICE DOCUMENTS</p>
          <h2>Create, organise and share <em>with ease.</em></h2>
          <p>From the first agreement to the resources you return to most, keep the practical parts of practice beautifully in order.</p>
          <div class="copy-detail"><span /><p>A home for your templates, client resources and everyday documents.</p></div>
        </div>

        <div class="documents-showcase">
          <img
            :src="documentsScreenshot"
            class="documents-screenshot"
            alt="Helios Documents workspace showing the practice library, document creation controls, practice identity, filters and document list"
          />
        </div>
      </div>
    </section>

    <section id="features" class="features-section">
      <div class="section-container">
        <p class="section-eyebrow">BUILT FOR YOUR PRACTICE</p>
        <div class="features-intro">
          <h2>Everything you need, <em>nothing you don’t.</em></h2>
          <p>The essentials, thoughtfully connected. So your tools support your practice, rather than shape it.</p>
        </div>

        <div class="feature-grid">
          <article v-for="(feature, index) in features" :key="feature.title" class="feature-card">
            <div class="feature-top">
              <component :is="feature.icon" :size="34" :stroke-width="1.35" />
              <span>0{{ index + 1 }}</span>
            </div>
            <h3>{{ feature.title }}</h3>
            <p class="feature-detail">{{ feature.detail }}</p>
            <p class="feature-blurb">{{ feature.blurb }}</p>
            <span class="feature-tag">{{ feature.tag }}</span>
          </article>
        </div>
      </div>
    </section>

    <section id="integrations" class="integrations-section">
      <div class="section-container">
        <p class="section-eyebrow light">INTEGRATIONS</p>
        <div class="integrations-intro">
          <h2>Works with the tools <em>you already use.</em></h2>
          <p>Join Zoom meetings from Helios, sync your Google Calendar, and keep the practical side of your work connected. Outlook integration is coming soon.</p>
        </div>

        <div class="integration-grid">
          <article class="integration-card">
            <span class="integration-logo"><Video :size="28" :stroke-width="1.5" /></span>
            <div><h3>Zoom</h3><p>Join from Helios</p></div>
            <ArrowUpRight :size="19" class="integration-arrow" />
          </article>
          <article class="integration-card">
            <span class="integration-logo calendar-logo">31</span>
            <div><h3>Google Calendar</h3><p>Sync your schedule</p></div>
            <ArrowUpRight :size="19" class="integration-arrow" />
          </article>
          <article class="integration-card">
            <span class="integration-logo"><Mail :size="28" :stroke-width="1.5" /></span>
            <div><h3>Outlook</h3><p>Coming soon</p></div>
            <ArrowUpRight :size="19" class="integration-arrow" />
          </article>
          <article class="integration-card">
            <span class="integration-logo"><Plus :size="29" :stroke-width="1.3" /></span>
            <div><h3>More to come</h3><p>Additional integrations</p></div>
            <ArrowUpRight :size="19" class="integration-arrow" />
          </article>
        </div>
      </div>
    </section>

    <section id="get-started" class="final-section">
      <div class="section-container final-inner">
        <p class="section-eyebrow">A CLEARER WAY FORWARD</p>
        <h2>A more focused, organised practice <em>starts here.</em></h2>
        <div class="final-actions">
          <router-link to="/get-started" class="primary-button">Create your workspace <ArrowUpRight :size="18" /></router-link>
          <a href="#workspace" class="secondary-button">See Helios in action <ArrowRight :size="18" /></a>
        </div>
      </div>
    </section>

    <footer class="landing-footer">
      <div class="section-container footer-inner">
        <router-link to="/" class="brand brand-small" aria-label="Helios home">
          <span class="brand-mark" aria-hidden="true"><span /></span>
          <span>helios<span class="brand-dot">.</span></span>
        </router-link>
        <span>Continuity &amp; reflection for therapists.</span>
        <nav aria-label="Legal and support">
          <router-link to="/privacy">Privacy</router-link>
          <router-link to="/ai-data">AI &amp; data</router-link>
          <router-link to="/terms">Terms</router-link>
          <router-link to="/cookies">Cookies</router-link>
          <router-link to="/support">Support</router-link>
        </nav>
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
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Star,
  Users,
  Video,
  RefreshCw,
} from '@lucide/vue'
import openingImage from '../assets/helios-opening.webp'
import clientWorkspace from '../assets/client-workspace-section.png'
import documentsScreenshot1 from '../assets/documents-landing-1.b64?raw'
import documentsScreenshot2 from '../assets/documents-landing-2.b64?raw'
import documentsScreenshot3 from '../assets/documents-landing-3.b64?raw'
import documentsScreenshot4 from '../assets/documents-landing-4.b64?raw'
import documentsScreenshot5 from '../assets/documents-landing-5.b64?raw'

const documentRows = [
  { title: 'Therapy agreement', detail: 'Practice document', type: 'Agreement' },
  { title: 'Consent form', detail: 'Practice document', type: 'Consent' },
  { title: 'Information sheet', detail: 'Practice resource', type: 'Information' },
  { title: 'Session summary template', detail: 'Reusable template', type: 'Template' },
  { title: 'Client information sheet', detail: 'Practice resource', type: 'Information' },
  { title: 'Psychoeducation – Anxiety', detail: 'Client resource', type: 'Resource' },
  { title: 'Working with parts (IFS)', detail: 'Client resource', type: 'Resource' },
]

const documentsScreenshot = `data:image/webp;base64,${[documentsScreenshot1, documentsScreenshot2, documentsScreenshot3, documentsScreenshot4, documentsScreenshot5].join('').trim()}`

const features = [
  { icon: CalendarDays, title: 'Calendar', detail: 'Google Calendar sync', blurb: 'See your week at a glance and keep appointments alongside the rest of your clinical work.', tag: 'Your week, connected' },
  { icon: Sparkles, title: 'Session capture', detail: 'AI-assisted notes', blurb: 'Capture the session, shape the notes and keep continuity without breaking your focus.', tag: 'Stay present in the room' },
  { icon: Users, title: 'Client records', detail: 'The full picture', blurb: 'Bring care direction, session context and relevant documents together around each client.', tag: 'One continuous thread' },
  { icon: FileText, title: 'Documents', detail: 'Templates & resources', blurb: 'Create, store and reuse agreements, resources and everyday practice materials in one place.', tag: 'Ready when you need them' },
  { icon: RefreshCw, title: 'CPD & reflection', detail: 'Track your development', blurb: 'Capture reflections and carry useful learning forward into supervision and ongoing development.', tag: 'Make learning visible' },
  { icon: Link2, title: 'Integrations', detail: 'Zoom, Google and more', blurb: 'Bring the tools you already use into the same working flow, with more integrations to come.', tag: 'Less switching, more flow' },
]
</script>

<style scoped>
.landing-shell { overflow: hidden; background:#f7f5ef; color:#172e38; font-family: "Noto Sans", ui-sans-serif, system-ui, sans-serif; }
.section-container { max-width:1440px; margin:0 auto; padding-left:72px; padding-right:72px; }
.landing-header { height:88px; background:#f7f5ef; border-bottom:1px solid #e8e6df; position:relative; z-index:20; }
.header-inner { max-width:1440px; height:100%; margin:auto; padding:0 72px; display:flex; align-items:center; gap:28px; }
.brand { display:inline-flex; align-items:center; gap:9px; color:#18333c; font-family:Georgia,"Times New Roman",serif; font-size:35px; line-height:1; letter-spacing:-.065em; white-space:nowrap; }
.brand-dot { color:#c58a5c; }
.brand-mark { display:inline-flex; align-items:center; justify-content:center; width:27px; height:27px; border:1.7px solid currentColor; border-radius:50%; position:relative; transform:rotate(-28deg); }
.brand-mark::before,.brand-mark::after { content:""; position:absolute; width:35px; height:1.5px; background:currentColor; }
.brand-mark::after { transform:rotate(90deg); }
.brand-mark span { width:8px; height:8px; background:currentColor; border-radius:50%; z-index:1; box-shadow:0 0 0 3px #f7f5ef; }
.header-nav { display:flex; align-items:center; gap:36px; margin-left:auto; }
.header-nav a,.sign-in-link { font-size:12px; font-weight:650; color:#43565a; white-space:nowrap; }
.account-nav { display:flex; align-items:center; gap:14px; margin-left:20px; }
.header-cta { display:inline-flex; align-items:center; gap:17px; background:#19343e; color:#fffaf1; padding:13px 17px; border-radius:3px; font-size:11px; font-weight:650; white-space:nowrap; }

.opening-splash { position:relative; min-height:min(720px,82vh); display:flex; align-items:flex-start; overflow:hidden; background:#061e29; color:#f4f0e7; }
.opening-image { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.opening-shade { position:absolute; inset:0; }
.opening-shade-side { background:linear-gradient(90deg,rgba(6,30,41,.78),rgba(6,30,41,.25),transparent); }
.opening-shade-bottom { background:linear-gradient(0deg,rgba(6,30,41,.5),transparent 55%); }
.opening-copy { position:relative; z-index:2; width:100%; max-width:1200px; margin:0 auto; padding:80px 40px 64px; }
.opening-eyebrow,.section-eyebrow { font-size:10px; line-height:1.4; font-weight:750; letter-spacing:.19em; text-transform:uppercase; color:#a47756; }
.opening-eyebrow { color:#e7b877; }
.opening-copy h1 { max-width:650px; margin:20px 0 0; font-family:Georgia,"Times New Roman",serif; font-size:clamp(42px,5vw,76px); line-height:1.06; font-weight:400; letter-spacing:-.035em; }
.opening-copy > p:not(.opening-eyebrow) { margin-top:20px; max-width:500px; font-size:18px; line-height:1.55; color:rgba(244,240,231,.95); }
.opening-button { margin-top:32px; display:inline-flex; align-items:center; gap:10px; border:1px solid rgba(244,240,231,.7); background:rgba(6,30,41,.35); padding:12px 20px; border-radius:4px; font-size:15px; font-weight:650; }

.workspace-section { padding:64px 0 54px; background:#eeeee7; }
.editorial-heading { max-width:690px; margin-bottom:20px; }
.editorial-heading h2,.documents-copy h2,.features-intro h2,.integrations-intro h2,.final-inner h2 { font-family:Georgia,"Times New Roman",serif; font-weight:400; letter-spacing:-.035em; }
.editorial-heading h2 { max-width:620px; font-size:clamp(46px,4vw,58px); line-height:1.04; margin:14px 0 12px; }
.editorial-heading h2 em,.documents-copy h2 em,.features-intro h2 em,.final-inner h2 em { color:#a17b60; font-weight:400; }
.editorial-heading > p:last-child { max-width:490px; color:#697674; font-size:14px; line-height:1.75; }
.clinical-showcase { padding:11px; background:#d9ded9; border:1px solid #d3d9d2; box-shadow:0 30px 60px rgba(29,47,45,.09); border-radius:7px; }
.clinical-screenshot { display:block; width:100%; aspect-ratio:1272/652; object-fit:cover; object-position:center top; border:1px solid #cdd5d0; border-radius:5px; }
.showcase-footnote { display:flex; justify-content:space-between; margin-top:17px; font-size:9px; font-weight:700; letter-spacing:.12em; color:#9a9e94; }
.showcase-footnote span:last-child { text-transform:none; font-weight:400; letter-spacing:0; }

.documents-section { background:#f8f6f1; padding:54px 0 38px; }
.documents-layout { display:grid; grid-template-columns:minmax(280px,.48fr) minmax(0,1.52fr); align-items:center; gap:42px; }
.documents-copy h2 { max-width:440px; font-size:clamp(54px,4.6vw,70px); line-height:1.02; margin:18px 0 18px; }
.documents-copy > p { max-width:350px; font-size:14px; line-height:1.8; color:#687a77; }
.copy-detail { margin-top:22px; display:flex; gap:16px; align-items:flex-start; max-width:310px; font-size:11px; line-height:1.7; color:#849089; }
.copy-detail > span { display:block; margin-top:8px; width:28px; height:1px; background:#ad8e70; flex:none; }
.documents-showcase { min-width:0; box-shadow:0 32px 65px rgba(34,57,53,.13); border:8px solid #e6e9e3; border-radius:9px; overflow:hidden; background:#e6e9e3; }
.documents-screenshot { display:block; width:100%; height:auto; aspect-ratio:1594/1000; object-fit:cover; object-position:center top; border:1px solid #cdd5d0; border-radius:5px; }

.features-section { background:#efe8dc; padding:50px 0 70px; }
.features-intro { display:flex; justify-content:space-between; align-items:flex-end; gap:56px; margin:14px 0 30px; }
.features-intro h2 { max-width:740px; font-size:clamp(56px,5vw,76px); line-height:1.03; }
.features-intro > p { width:280px; color:#746f66; font-size:13px; line-height:1.75; padding-bottom:7px; flex:none; }
.feature-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
.feature-card { min-height:300px; padding:28px 28px 26px; position:relative; display:flex; flex-direction:column; border:1px solid rgba(113,103,88,.14); border-radius:24px; box-shadow:0 16px 36px rgba(84,64,44,.055); }
.feature-card:nth-child(1) { background:#f6eadc; }
.feature-card:nth-child(2) { background:#e9efe7; }
.feature-card:nth-child(3) { background:#f3e5de; }
.feature-card:nth-child(4) { background:#f2eadc; }
.feature-card:nth-child(5) { background:#e7ede3; }
.feature-card:nth-child(6) { background:#f1e4dc; }
.feature-top { display:flex; justify-content:space-between; align-items:flex-start; color:#456d60; }
.feature-top svg { box-sizing:content-box; padding:9px; border-radius:14px; background:rgba(255,255,255,.48); }
.feature-top span { font-family:Georgia,serif; color:#a49c8d; font-size:17px; }
.feature-card h3 { margin-top:24px; font-family:Georgia,serif; font-size:34px; font-weight:400; letter-spacing:-.025em; line-height:1.08; color:#243e41; }
.feature-detail { color:#667871; font-size:13px; line-height:1.55; margin-top:9px; font-weight:650; }
.feature-blurb { color:#696b63; font-size:12px; line-height:1.65; margin-top:15px; max-width:31ch; }
.feature-tag { margin-top:auto; padding-top:22px; font-size:10px; line-height:1.4; font-weight:750; letter-spacing:.09em; text-transform:uppercase; color:#9a7358; }

.integrations-section { background:#182f39; color:#f3f0e7; padding:62px 0 70px; }
.section-eyebrow.light { color:#c9aa8c; }
.integrations-intro { display:flex; justify-content:space-between; align-items:flex-end; gap:40px; margin:14px 0 30px; }
.integrations-intro h2 { max-width:700px; font-size:clamp(57px,5.2vw,80px); line-height:1.02; color:#f3f0e7; }
.integrations-intro h2 em { color:#d5b99d; font-weight:400; }
.integrations-intro > p { max-width:310px; color:#aabbb8; font-size:13px; line-height:1.8; padding-bottom:5px; }
.integration-grid { display:grid; grid-template-columns:repeat(4,1fr); border-top:1px solid #45606a; border-bottom:1px solid #45606a; }
.integration-card { min-height:166px; padding:21px 20px 20px 0; display:flex; flex-direction:column; position:relative; }
.integration-card + .integration-card { border-left:1px solid #45606a; padding-left:27px; }
.integration-logo { display:grid; place-items:center; width:49px; height:49px; border:1px solid #5c7479; border-radius:5px; color:#e8e8dd; font-family:Georgia,serif; font-size:26px; }
.integration-card > div { margin-top:auto; }
.integration-card h3 { font-family:Georgia,serif; font-size:27px; font-weight:400; line-height:1; }
.integration-card p { font-size:11px; color:#aabcb9; margin-top:7px; }
.integration-arrow { position:absolute; right:21px; top:29px; color:#8da7a9; }

.final-section { background:#f7f5ef; padding:68px 0 76px; text-align:center; }
.final-inner h2 { max-width:850px; margin:19px auto 0; font-size:clamp(60px,6.3vw,88px); line-height:1.02; }
.final-actions { display:flex; justify-content:center; align-items:center; gap:14px; margin-top:24px; }
.primary-button,.secondary-button { min-width:195px; display:inline-flex; align-items:center; justify-content:space-between; gap:18px; padding:16px 18px; border-radius:3px; font-size:12px; font-weight:650; }
.primary-button { min-width:213px; background:#19343e; color:#fffaf1; border:1px solid #19343e; }
.secondary-button { border:1px solid #bac9c1; color:#25453f; }

.landing-footer { background:#f7f5ef; border-top:1px solid #e5e5dc; }
.footer-inner { min-height:82px; display:flex; align-items:center; gap:24px; color:#909c93; font-size:10px; }
.brand-small { font-size:28px; }
.footer-inner nav { display:flex; flex-wrap:wrap; gap:14px; margin-left:auto; }
.footer-inner nav a:hover { color:#43565a; }
.copyright { white-space:nowrap; }

@media (max-width:1200px) {
  .section-container,.header-inner { padding-left:44px; padding-right:44px; }
  .header-nav { gap:20px; }
  .documents-layout { gap:28px; }
}
@media (max-width:950px) {
  .header-nav { display:none; }
  .documents-layout { display:block; }
  .documents-copy { padding-bottom:28px; }
  .documents-copy h2 { max-width:650px; }
  .documents-copy > p { max-width:540px; }
  .copy-detail { display:none; }
  .features-intro,.integrations-intro { align-items:flex-start; flex-direction:column; gap:20px; }
  .features-intro > p { width:auto; max-width:450px; }
  .integrations-intro > p { max-width:480px; }
  .footer-inner { flex-wrap:wrap; padding-top:24px; padding-bottom:24px; }
  .footer-inner nav { order:4; width:100%; margin-left:0; }
}
@media (max-width:650px) {
  .section-container,.header-inner { padding-left:22px; padding-right:22px; }
  .landing-header { height:72px; }
  .brand { font-size:31px; }
  .sign-in-link { display:none; }
  .header-cta { padding:11px; font-size:0; gap:0; }
  .opening-splash { min-height:570px; }
  .opening-image { object-position:84% center; }
  .opening-copy { padding:55px 22px 60px; }
  .workspace-section { padding:48px 0 42px; }
  .documents-section { padding:42px 0 34px; }
  .features-section { padding:40px 0 54px; }
  .editorial-heading { margin-bottom:20px; }
  .editorial-heading h2 { font-size:clamp(39px,11vw,44px); line-height:1.07; margin:13px 0 12px; }
  .documents-copy h2,.features-intro h2,.integrations-intro h2 { font-size:clamp(49px,10vw,64px); }
  .clinical-showcase { padding:5px; overflow:hidden; }
  .clinical-screenshot { aspect-ratio:950/653; }
  .showcase-footnote { font-size:7px; gap:15px; }
  .documents-showcase { border-width:5px; }
  .documents-screenshot { aspect-ratio:690/619; width:125%; max-width:none; transform:translateX(-10%); }
  .feature-grid,.integration-grid { grid-template-columns:1fr 1fr; }
  .feature-grid { gap:12px; }
  .feature-card { min-height:270px; padding:22px 18px 20px; border-radius:18px; }
  .feature-top svg { padding:7px; border-radius:12px; }
  .feature-card h3 { margin-top:22px; font-size:27px; }
  .feature-detail { font-size:11px; line-height:1.5; }
  .feature-blurb { font-size:10px; line-height:1.55; margin-top:12px; }
  .feature-tag { font-size:8px; padding-top:16px; }
  .integrations-section { padding:50px 0 58px; }
  .integration-card { min-height:170px; }
  .integration-card + .integration-card { border-left:0; padding-left:0; }
  .integration-card:nth-child(even) { border-left:1px solid #45606a; padding-left:18px; }
  .integration-card:nth-child(n+3) { border-top:1px solid #45606a; }
  .integration-card h3 { font-size:23px; }
  .integration-arrow { right:12px; }
  .final-section { padding:56px 0 64px; }
  .final-inner h2 { font-size:clamp(52px,11vw,70px); }
  .final-actions { flex-direction:column; }
  .final-actions a { width:100%; max-width:310px; }
  .footer-inner .brand { width:100%; }
  .copyright { margin-left:0; }
}
</style>
