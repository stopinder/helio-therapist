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

        <div class="documents-showcase" aria-label="Illustrative Helios practice documents library">
          <div class="documents-appbar">
            <div>
              <span class="mini-overline">PRACTICE LIBRARY</span>
              <strong>Documents</strong>
            </div>
            <button type="button" tabindex="-1"><Plus :size="16" /> New document</button>
          </div>
          <div class="documents-tabs" aria-hidden="true">
            <span class="active">All</span><span>Templates</span><span>Shared</span><span>Favourites</span>
          </div>
          <div class="documents-search" aria-hidden="true"><Search :size="15" /> Search practice documents or client records…</div>
          <div class="document-list" aria-hidden="true">
            <div v-for="doc in documentRows" :key="doc.title" class="document-row">
              <span class="document-icon"><FileText :size="17" /></span>
              <div class="document-meta"><strong>{{ doc.title }}</strong><small>{{ doc.detail }}</small></div>
              <span class="document-type">{{ doc.type }}</span>
              <Star :size="15" class="document-star" />
              <MoreHorizontal :size="17" class="document-more" />
            </div>
          </div>
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
            <p>{{ feature.detail }}</p>
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

const documentRows = [
  { title: 'Therapy agreement', detail: 'Practice document', type: 'Agreement' },
  { title: 'Consent form', detail: 'Practice document', type: 'Consent' },
  { title: 'Information sheet', detail: 'Practice resource', type: 'Information' },
  { title: 'Session summary template', detail: 'Reusable template', type: 'Template' },
  { title: 'Client information sheet', detail: 'Practice resource', type: 'Information' },
  { title: 'Psychoeducation – Anxiety', detail: 'Client resource', type: 'Resource' },
  { title: 'Working with parts (IFS)', detail: 'Client resource', type: 'Resource' },
]

const features = [
  { icon: CalendarDays, title: 'Calendar', detail: 'Google Calendar sync' },
  { icon: Sparkles, title: 'Session capture', detail: 'AI-assisted notes' },
  { icon: Users, title: 'Client records', detail: 'The full picture' },
  { icon: FileText, title: 'Documents', detail: 'Templates & resources' },
  { icon: RefreshCw, title: 'CPD & reflection', detail: 'Track your development' },
  { icon: Link2, title: 'Integrations', detail: 'Zoom, Google and more' },
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

.workspace-section { padding:88px 0 92px; background:#eeeee7; }
.editorial-heading { max-width:735px; margin-bottom:32px; }
.editorial-heading h2,.documents-copy h2,.features-intro h2,.integrations-intro h2,.final-inner h2 { font-family:Georgia,"Times New Roman",serif; font-weight:400; letter-spacing:-.035em; }
.editorial-heading h2 { max-width:650px; font-size:clamp(54px,5vw,72px); line-height:1.02; margin:20px 0 15px; }
.editorial-heading h2 em,.documents-copy h2 em,.features-intro h2 em,.final-inner h2 em { color:#a17b60; font-weight:400; }
.editorial-heading > p:last-child { max-width:490px; color:#697674; font-size:14px; line-height:1.75; }
.clinical-showcase { padding:11px; background:#d9ded9; border:1px solid #d3d9d2; box-shadow:0 30px 60px rgba(29,47,45,.09); border-radius:7px; }
.clinical-screenshot { display:block; width:100%; aspect-ratio:1272/652; object-fit:cover; object-position:center top; border:1px solid #cdd5d0; border-radius:5px; }
.showcase-footnote { display:flex; justify-content:space-between; margin-top:17px; font-size:9px; font-weight:700; letter-spacing:.12em; color:#9a9e94; }
.showcase-footnote span:last-child { text-transform:none; font-weight:400; letter-spacing:0; }

.documents-section { background:#f8f6f1; padding:86px 0 92px; }
.documents-layout { display:grid; grid-template-columns:minmax(280px,.48fr) minmax(0,1.52fr); align-items:center; gap:42px; }
.documents-copy h2 { max-width:440px; font-size:clamp(54px,4.6vw,70px); line-height:1.02; margin:18px 0 18px; }
.documents-copy > p { max-width:350px; font-size:14px; line-height:1.8; color:#687a77; }
.copy-detail { margin-top:27px; display:flex; gap:16px; align-items:flex-start; max-width:310px; font-size:11px; line-height:1.7; color:#849089; }
.copy-detail > span { display:block; margin-top:8px; width:28px; height:1px; background:#ad8e70; flex:none; }
.documents-showcase { min-width:0; background:#fff; box-shadow:0 32px 65px rgba(34,57,53,.13); border:8px solid #e6e9e3; border-radius:9px; overflow:hidden; }
.documents-appbar { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:22px 24px 18px; border-bottom:1px solid #e1e5df; }
.documents-appbar strong { display:block; margin-top:4px; font-family:Georgia,serif; font-size:27px; font-weight:400; color:#203842; }
.mini-overline { font-size:8px; font-weight:700; letter-spacing:.14em; color:#87948d; }
.documents-appbar button { display:inline-flex; align-items:center; gap:7px; border:0; border-radius:3px; background:#19343e; color:#fffaf1; padding:10px 12px; font-size:10px; font-weight:650; }
.documents-tabs { display:flex; gap:22px; padding:12px 24px 0; font-size:10px; color:#78857f; border-bottom:1px solid #e4e7e2; }
.documents-tabs span { padding:0 0 11px; }
.documents-tabs .active { color:#203842; border-bottom:2px solid #a77d60; font-weight:700; }
.documents-search { margin:15px 24px 12px; display:flex; align-items:center; gap:9px; padding:10px 12px; border:1px solid #dde2dc; border-radius:4px; color:#9aa39e; font-size:10px; }
.document-row { display:grid; grid-template-columns:32px minmax(0,1fr) 90px 20px 20px; align-items:center; gap:10px; padding:12px 24px; border-top:1px solid #edf0ec; }
.document-icon { width:29px; height:29px; display:grid; place-items:center; border-radius:4px; background:#edf1ed; color:#456d60; }
.document-meta strong { display:block; font-size:10px; color:#2e4549; }
.document-meta small { display:block; margin-top:3px; font-size:8px; color:#8a9690; }
.document-type { font-size:8px; color:#7a8882; }
.document-star,.document-more { color:#a2aaa5; }

.features-section { background:#f2f1eb; padding:92px 0 100px; }
.features-intro { display:flex; justify-content:space-between; align-items:flex-end; gap:64px; margin:18px 0 38px; }
.features-intro h2 { max-width:740px; font-size:clamp(56px,5vw,76px); line-height:1.03; }
.features-intro > p { width:280px; color:#79857f; font-size:13px; line-height:1.75; padding-bottom:7px; flex:none; }
.feature-grid { display:grid; grid-template-columns:repeat(3,1fr); border-top:1px solid #cdd5cb; }
.feature-card { min-height:218px; padding:27px 32px 25px 0; border-bottom:1px solid #cdd5cb; position:relative; }
.feature-card:not(:nth-child(3n+1)) { padding-left:38px; border-left:1px solid #cdd5cb; }
.feature-top { display:flex; justify-content:space-between; align-items:flex-start; color:#456d60; }
.feature-top span { font-family:Georgia,serif; color:#a3afa3; font-size:19px; }
.feature-card h3 { margin-top:31px; font-family:Georgia,serif; font-size:34px; font-weight:400; letter-spacing:-.025em; line-height:1.1; color:#243e41; }
.feature-card p { color:#71827a; font-size:13px; margin-top:9px; }

.integrations-section { background:#182f39; color:#f3f0e7; padding:92px 0 100px; }
.section-eyebrow.light { color:#c9aa8c; }
.integrations-intro { display:flex; justify-content:space-between; align-items:flex-end; gap:44px; margin:16px 0 42px; }
.integrations-intro h2 { max-width:700px; font-size:clamp(57px,5.2vw,80px); line-height:1.02; color:#f3f0e7; }
.integrations-intro h2 em { color:#d5b99d; font-weight:400; }
.integrations-intro > p { max-width:310px; color:#aabbb8; font-size:13px; line-height:1.8; padding-bottom:5px; }
.integration-grid { display:grid; grid-template-columns:repeat(4,1fr); border-top:1px solid #45606a; border-bottom:1px solid #45606a; }
.integration-card { min-height:184px; padding:23px 20px 22px 0; display:flex; flex-direction:column; position:relative; }
.integration-card + .integration-card { border-left:1px solid #45606a; padding-left:27px; }
.integration-logo { display:grid; place-items:center; width:49px; height:49px; border:1px solid #5c7479; border-radius:5px; color:#e8e8dd; font-family:Georgia,serif; font-size:26px; }
.integration-card > div { margin-top:auto; }
.integration-card h3 { font-family:Georgia,serif; font-size:27px; font-weight:400; line-height:1; }
.integration-card p { font-size:11px; color:#aabcb9; margin-top:7px; }
.integration-arrow { position:absolute; right:21px; top:29px; color:#8da7a9; }

.final-section { background:#f7f5ef; padding:96px 0 104px; text-align:center; }
.final-inner h2 { max-width:850px; margin:19px auto 0; font-size:clamp(60px,6.3vw,88px); line-height:1.02; }
.final-actions { display:flex; justify-content:center; align-items:center; gap:14px; margin-top:30px; }
.primary-button,.secondary-button { min-width:195px; display:inline-flex; align-items:center; justify-content:space-between; gap:18px; padding:16px 18px; border-radius:3px; font-size:12px; font-weight:650; }
.primary-button { min-width:213px; background:#19343e; color:#fffaf1; border:1px solid #19343e; }
.secondary-button { border:1px solid #bac9c1; color:#25453f; }

.landing-footer { background:#f7f5ef; border-top:1px solid #e5e5dc; }
.footer-inner { min-height:94px; display:flex; align-items:center; gap:24px; color:#909c93; font-size:10px; }
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
  .documents-copy { padding-bottom:38px; }
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
  .workspace-section,.documents-section,.features-section { padding:66px 0 72px; }
  .editorial-heading h2,.documents-copy h2,.features-intro h2,.integrations-intro h2 { font-size:clamp(49px,10vw,64px); }
  .clinical-showcase { padding:5px; overflow:hidden; }
  .clinical-screenshot { aspect-ratio:950/653; }
  .showcase-footnote { font-size:7px; gap:15px; }
  .documents-showcase { border-width:5px; }
  .document-row { grid-template-columns:30px minmax(0,1fr) 20px; padding-left:14px; padding-right:14px; }
  .document-type,.document-star { display:none; }
  .documents-appbar,.documents-tabs { padding-left:14px; padding-right:14px; }
  .documents-search { margin-left:14px; margin-right:14px; }
  .feature-grid,.integration-grid { grid-template-columns:1fr 1fr; }
  .feature-card { min-height:205px; padding:26px 10px 24px 0; }
  .feature-card:not(:nth-child(3n+1)) { border-left:0; padding-left:0; }
  .feature-card:nth-child(even) { border-left:1px solid #cdd5cb; padding-left:19px; }
  .feature-card h3 { margin-top:27px; font-size:27px; }
  .feature-card p { font-size:11px; line-height:1.45; }
  .integrations-section { padding:68px 0 74px; }
  .integration-card { min-height:170px; }
  .integration-card + .integration-card { border-left:0; padding-left:0; }
  .integration-card:nth-child(even) { border-left:1px solid #45606a; padding-left:18px; }
  .integration-card:nth-child(n+3) { border-top:1px solid #45606a; }
  .integration-card h3 { font-size:23px; }
  .integration-arrow { right:12px; }
  .final-section { padding:72px 0 80px; }
  .final-inner h2 { font-size:clamp(52px,11vw,70px); }
  .final-actions { flex-direction:column; }
  .final-actions a { width:100%; max-width:310px; }
  .footer-inner .brand { width:100%; }
  .copyright { margin-left:0; }
}
</style>
