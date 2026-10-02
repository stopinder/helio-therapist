<template>
  <main class="landing-shell">
    <header class="landing-header">
      <div class="header-inner">
        <router-link to="/" class="brand" aria-label="Helios home">
          <span class="brand-sun" aria-hidden="true"><span class="sun-disc" /><span class="sun-line" /></span>
          <span>Helios<span class="brand-dot">.</span></span>
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
        <div class="footer-brand-block">
          <router-link to="/" class="brand brand-small" aria-label="Helios home">
            <span class="brand-sun" aria-hidden="true"><span class="sun-disc" /><span class="sun-line" /></span>
            <span>Helios<span class="brand-dot">.</span></span>
          </router-link>
          <p class="footer-credential">Robert Ormiston MBACP</p>
          <p class="footer-role">Psychotherapist · Founder of Helios</p>
        </div>

        <div class="footer-trust">
          <p class="footer-kicker">THERAPIST-CONTROLLED BY DESIGN</p>
          <p>AI-assisted features run when you choose to use them. Drafts remain editable until you deliberately approve a Clinical Record.</p>
          <p>Helios is not an advertising platform. Google Workspace data is not used to train general-purpose AI models.</p>
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
import openingImage from '../assets/helios-opening-light.webp'
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
  { icon: CalendarDays, title: 'Calendar', detail: 'Google Calendar sync', blurb: 'See your week at a glance and keep appointments alongside the rest of your clinical work.' },
  { icon: Sparkles, title: 'Session capture', detail: 'AI-assisted notes', blurb: 'Capture the session, shape the notes and keep continuity without breaking your focus.' },
  { icon: Users, title: 'Client records', detail: 'The full picture', blurb: 'Bring care direction, session context and relevant documents together around each client.' },
  { icon: FileText, title: 'Documents', detail: 'Templates & resources', blurb: 'Create, store and reuse agreements, resources and everyday practice materials in one place.' },
  { icon: RefreshCw, title: 'CPD & reflection', detail: 'Track your development', blurb: 'Capture reflections and carry useful learning forward into supervision and ongoing development.' },
  { icon: Link2, title: 'Integrations', detail: 'Zoom, Google and more', blurb: 'Bring the tools you already use into the same working flow, with more integrations to come.' },
]
</script>

<style scoped>
.landing-shell { overflow: hidden; background:#f7f5ef; color:#172e38; font-family: "Noto Sans", ui-sans-serif, system-ui, sans-serif; }
.section-container { max-width:1440px; margin:0 auto; padding-left:72px; padding-right:72px; }
.landing-header { height:88px; background:#f7f5ef; border-bottom:1px solid #e8e6df; position:relative; z-index:20; }
.header-inner { max-width:1440px; height:100%; margin:auto; padding:0 72px; display:flex; align-items:center; gap:28px; }
.brand { display:inline-flex; align-items:center; gap:9px; color:#18333c; font-family:Georgia,"Times New Roman",serif; font-size:35px; line-height:1; letter-spacing:-.065em; white-space:nowrap; }
.brand-dot { color:#c58a5c; }
.brand-sun { position:relative; width:31px; height:25px; display:inline-block; flex:none; }
.sun-disc { position:absolute; left:7px; bottom:5px; width:17px; height:9px; border-radius:17px 17px 0 0; background:#c58a5c; }
.sun-line { position:absolute; left:1px; right:1px; bottom:4px; height:1.5px; background:#18333c; border-radius:99px; }
.brand-sun::before,.brand-sun::after { content:""; position:absolute; bottom:15px; width:1.5px; height:6px; background:#c58a5c; border-radius:99px; }
.brand-sun::before { left:7px; transform:rotate(-42deg); }
.brand-sun::after { right:7px; transform:rotate(42deg); }
.header-nav { display:flex; align-items:center; gap:36px; margin-left:auto; }
.header-nav a,.sign-in-link { font-size:12px; font-weight:650; color:#43565a; white-space:nowrap; }
.account-nav { display:flex; align-items:center; gap:14px; margin-left:20px; }
.header-cta { display:inline-flex; align-items:center; gap:17px; background:#19343e; color:#fffaf1; padding:13px 17px; border-radius:3px; font-size:11px; font-weight:650; white-space:nowrap; }

.opening-splash { position:relative; min-height:min(700px,80vh); display:flex; align-items:flex-start; overflow:hidden; background:#efe8dc; color:#f8f4ea; }
.opening-image { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:brightness(1.04) saturate(.9) contrast(.96); }
.opening-shade { position:absolute; inset:0; }
.opening-shade-side { background:linear-gradient(90deg,rgba(20,48,56,.68) 0%,rgba(20,48,56,.42) 34%,rgba(20,48,56,.08) 64%,transparent 82%); }
.opening-shade-bottom { background:linear-gradient(0deg,rgba(20,48,56,.22),transparent 48%); }
.opening-copy { position:relative; z-index:2; width:100%; max-width:1200px; margin:0 auto; padding:80px 40px 64px; }
.opening-eyebrow,.section-eyebrow { font-size:10px; line-height:1.4; font-weight:750; letter-spacing:.19em; text-transform:uppercase; color:#a47756; }
.opening-eyebrow { color:#e7b877; }
.opening-copy h1 { max-width:650px; margin:20px 0 0; font-family:Georgia,"Times New Roman",serif; font-size:clamp(42px,5vw,76px); line-height:1.06; font-weight:400; letter-spacing:-.035em; }
.opening-copy > p:not(.opening-eyebrow) { margin-top:20px; max-width:500px; font-size:18px; line-height:1.55; color:rgba(248,244,234,.96); }
.opening-button { margin-top:32px; display:inline-flex; align-items:center; gap:10px; border:1px solid rgba(248,244,234,.72); background:rgba(24,51,60,.24); backdrop-filter:blur(2px); padding:12px 20px; border-radius:8px; font-size:15px; font-weight:650; }

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

.features-section { background:#f3efe6; padding:48px 0 62px; }
.features-intro { display:flex; justify-content:space-between; align-items:flex-end; gap:56px; margin:14px 0 28px; }
.features-intro h2 { max-width:740px; font-size:clamp(56px,5vw,76px); line-height:1.03; }
.features-intro > p { width:280px; color:#70786f; font-size:13px; line-height:1.75; padding-bottom:7px; flex:none; }
.feature-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
.feature-card { min-height:224px; padding:22px 24px 23px; position:relative; border:1px solid rgba(59,78,70,.09); border-radius:20px; box-shadow:0 10px 24px rgba(48,62,56,.04); }
.feature-card:nth-child(1) { background:#dfe7dc; }
.feature-card:nth-child(2) { background:#eee6d3; }
.feature-card:nth-child(3) { background:#dce7e3; }
.feature-card:nth-child(4) { background:#e9e3d2; }
.feature-card:nth-child(5) { background:#e3e6d6; }
.feature-card:nth-child(6) { background:#dbe5df; }
.feature-top { display:flex; justify-content:space-between; align-items:flex-start; color:#3f6c5c; }
.feature-top svg { box-sizing:content-box; padding:7px; border-radius:12px; background:rgba(250,248,241,.55); }
.feature-top span { font-family:Georgia,serif; color:#9a917f; font-size:16px; }
.feature-card h3 { margin-top:17px; font-family:Georgia,serif; font-size:30px; font-weight:400; letter-spacing:-.025em; line-height:1.06; color:#203a3d; }
.feature-detail { color:#536d64; font-size:12px; line-height:1.45; margin-top:7px; font-weight:700; }
.feature-blurb { color:#5f665f; font-size:11.5px; line-height:1.55; margin-top:11px; max-width:34ch; }

.integrations-section { background:#eee9df; color:#203a3d; padding:54px 0 64px; }
.section-eyebrow.light { color:#9a7358; }
.integrations-intro { display:flex; justify-content:space-between; align-items:flex-end; gap:40px; margin:14px 0 28px; }
.integrations-intro h2 { max-width:700px; font-size:clamp(54px,5vw,74px); line-height:1.03; color:#203a3d; }
.integrations-intro h2 em { color:#8f6d52; font-weight:400; }
.integrations-intro > p { max-width:350px; color:#65716b; font-size:13px; line-height:1.75; padding-bottom:5px; }
.integration-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.integration-card { min-height:176px; padding:20px 20px 19px; display:flex; flex-direction:column; position:relative; border:1px solid rgba(59,78,70,.09); border-radius:19px; box-shadow:0 10px 24px rgba(48,62,56,.035); }
.integration-card:nth-child(1) { background:#dfe7dc; }
.integration-card:nth-child(2) { background:#eee6d3; }
.integration-card:nth-child(3) { background:#dce7e3; }
.integration-card:nth-child(4) { background:#e3e6d6; }
.integration-logo { display:grid; place-items:center; width:44px; height:44px; border:0; border-radius:12px; background:rgba(250,248,241,.58); color:#3f6c5c; font-family:Georgia,serif; font-size:23px; }
.integration-card > div { margin-top:auto; }
.integration-card h3 { font-family:Georgia,serif; font-size:29px; font-weight:400; letter-spacing:-.025em; line-height:1.02; color:#203a3d; }
.integration-card p { font-size:11.5px; line-height:1.5; color:#5f6b64; margin-top:7px; }
.integration-arrow { position:absolute; right:17px; top:19px; color:#81938a; }

.final-section { background:#f7f5ef; padding:68px 0 76px; text-align:center; }
.final-inner h2 { max-width:850px; margin:19px auto 0; font-size:clamp(60px,6.3vw,88px); line-height:1.02; }
.final-actions { display:flex; justify-content:center; align-items:center; gap:14px; margin-top:24px; }
.primary-button,.secondary-button { min-width:195px; display:inline-flex; align-items:center; justify-content:space-between; gap:18px; padding:16px 18px; border-radius:3px; font-size:12px; font-weight:650; }
.primary-button { min-width:213px; background:#19343e; color:#fffaf1; border:1px solid #19343e; }
.secondary-button { border:1px solid #bac9c1; color:#25453f; }

.landing-footer { background:#eee9df; border-top:1px solid rgba(59,78,70,.1); color:#203a3d; }
.footer-inner { display:grid; grid-template-columns:minmax(220px,.9fr) minmax(320px,1.35fr) minmax(230px,.85fr); gap:54px; padding-top:42px; padding-bottom:34px; }
.footer-brand-block,.footer-trust,.footer-links { min-width:0; }
.brand-small { font-size:30px; }
.footer-credential { margin-top:19px; font-family:Georgia,serif; font-size:19px; color:#284548; }
.footer-role { margin-top:4px; font-size:11px; line-height:1.55; color:#748078; }
.footer-kicker { margin-bottom:12px; color:#9a7358; font-size:9px; font-weight:750; letter-spacing:.16em; }
.footer-trust > p:not(.footer-kicker) { max-width:48ch; color:#657069; font-size:11px; line-height:1.72; }
.footer-trust > p + p { margin-top:8px; }
.footer-links nav { display:grid; gap:8px; }
.footer-links nav a { width:max-content; max-width:100%; color:#526861; font-size:11px; line-height:1.45; }
.footer-links nav a:hover { color:#203a3d; }
.footer-bottom { min-height:52px; display:flex; align-items:center; justify-content:space-between; gap:24px; border-top:1px solid rgba(59,78,70,.1); color:#899087; font-size:9px; }
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
  .footer-inner { grid-template-columns:1fr 1fr; gap:34px; padding-top:36px; padding-bottom:30px; }
  .footer-brand-block { grid-column:1 / -1; }
  .footer-bottom { padding-top:14px; padding-bottom:14px; }
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
  .feature-card { min-height:218px; padding:19px 16px 18px; border-radius:17px; }
  .feature-top svg { padding:6px; border-radius:11px; }
  .feature-card h3 { margin-top:16px; font-size:25px; }
  .feature-detail { font-size:10.5px; line-height:1.4; }
  .feature-blurb { font-size:9.5px; line-height:1.5; margin-top:9px; }
  .integrations-section { padding:44px 0 52px; }
  .integration-grid { gap:12px; }
  .integration-card { min-height:160px; padding:17px 15px 16px; border-radius:17px; }
  .integration-logo { width:40px; height:40px; border-radius:11px; font-size:21px; }
  .integration-card h3 { font-size:24px; }
  .integration-card p { font-size:10px; }
  .integration-arrow { right:12px; top:16px; }
  .final-section { padding:56px 0 64px; }
  .final-inner h2 { font-size:clamp(52px,11vw,70px); }
  .final-actions { flex-direction:column; }
  .final-actions a { width:100%; max-width:310px; }
  .footer-inner { grid-template-columns:1fr; gap:28px; padding-top:32px; padding-bottom:28px; }
  .footer-brand-block { grid-column:auto; }
  .footer-bottom { min-height:0; align-items:flex-start; flex-direction:column; gap:6px; padding-top:14px; padding-bottom:18px; }
  .copyright { margin-left:0; }
}
</style>
