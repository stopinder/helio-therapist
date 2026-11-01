import { test, describe } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

describe('Landing Page Direction', () => {
  const landingPath = path.join(process.cwd(), 'src', 'views', 'Landing.vue')
  const landingSource = fs.readFileSync(landingPath, 'utf8')

  test('restores the light photographic splash while keeping the clinical-workspace positioning', () => {
    assert.match(landingSource, /Keep the thread of the work together\./)
    assert.match(landingSource, /Clients, sessions, clinical thinking, documents, reflection and research/)
    assert.match(landingSource, /Helios · Clinical workspace for therapists/)
    assert.match(landingSource, /helios-opening-light\.webp/)
    assert.match(landingSource, /class="hero-background"/)
    assert.match(landingSource, /hero-overlay-side/)
    assert.doesNotMatch(landingSource, /A place for your whole practice\./)
  })

  test('makes section two a concise product-proof continuation rather than another synthetic hero', () => {
    assert.match(landingSource, /id="workspace"/)
    assert.match(landingSource, /Start with the client\. Keep the whole thread in view\./)
    assert.match(landingSource, /client-workspace-section\.png/)
    assert.match(landingSource, /class="workspace-screenshot"/)
    for (const label of ['Before the session', 'During and after', 'Carry it forward']) {
      assert.ok(landingSource.includes(label), `Missing clinical-thread stage: ${label}`)
    }
    assert.doesNotMatch(landingSource, /workspace-summary-grid/)
    assert.doesNotMatch(landingSource, /workspace-sidebar/)
  })

  test('gives Ask Helios its approved dark two-column treatment', () => {
    assert.match(landingSource, /id="ask-helios"/)
    assert.match(landingSource, /One assistant\. Three deliberate ways to think\./)
    for (const mode of ['Workspace', 'Research', 'Reflect']) {
      assert.ok(landingSource.includes(`title: '${mode}'`), `Missing Ask Helios mode: ${mode}`)
    }
    assert.match(landingSource, /not a supervisor, autonomous clinician or clinical-record author/)
    assert.match(landingSource, /ask-panel/)
  })

  test('presents Reflect as an information-rich workspace with Therapist Stance and Learning Edge', () => {
    assert.match(landingSource, /id="reflect"/)
    assert.match(landingSource, /A space to think about the work — not document it\./)
    for (const label of ['Reflections', 'Practice Map', 'Therapist Stance', 'Learning Edge']) {
      assert.ok(landingSource.includes(`title: '${label}'`), `Missing Reflect concept: ${label}`)
    }
    assert.match(landingSource, /Latest reflection/)
    assert.match(landingSource, /What stayed with you from this session\?/)
    assert.match(landingSource, /What keeps returning\?/)
    assert.match(landingSource, /How do you tend to meet the work\?/)
    assert.match(landingSource, /The questions become more specific as your reflections accumulate\./)
    assert.match(landingSource, /Learning Edge draws on recurring themes in your saved practice reflections/)
    assert.match(landingSource, /It does not change the 15 Therapist Stance situations/)
    assert.doesNotMatch(landingSource, />02 · Growth</)
  })

  test('presents Session Material as a vivid triage-to-draft workflow', () => {
    assert.match(landingSource, /id="capture"/)
    assert.match(landingSource, /From transcript to something clinically useful\./)
    assert.match(landingSource, /Assign without losing your place/)
    assert.match(landingSource, /Shape the output deliberately/)
    assert.match(landingSource, /Transcript Inbox is a triage queue/)
    assert.match(landingSource, /Find the right client without opening everything\./)
    assert.match(landingSource, /Open in Session Capture →/)
    assert.match(landingSource, /Shape the draft before it goes anywhere\./)
    assert.match(landingSource, /Summary approach/)
    assert.match(landingSource, /Continuity window/)
    assert.match(landingSource, /Editable draft/)
    assert.match(landingSource, /Nothing silently becomes a Clinical Record\./)
    assert.match(landingSource, /You review, edit and approve what belongs there\./)
    assert.doesNotMatch(landingSource, /transcript-panel/)
  })

  test('uses the approved clustered supporting-tools layout without page-wide ledger rows', () => {
    assert.match(landingSource, /id="tools"/)
    assert.match(landingSource, /The practical tools stay in their place\./)
    for (const group of ['Practice', 'Capture', 'Connect']) {
      assert.ok(landingSource.includes(`label: '${group}'`), `Missing tool cluster: ${group}`)
    }
    for (const tool of ['Calendar', 'Documents', 'Dictation', 'Zoom', 'Supervision', 'Integrations']) {
      assert.ok(landingSource.includes(`title: '${tool}'`), `Missing supporting tool: ${tool}`)
    }
    assert.match(landingSource, /grid-template-columns: repeat\(3, 1fr\)/)
    assert.doesNotMatch(landingSource, /tool-grid/)
    assert.doesNotMatch(landingSource, /documents-band/)
  })

  test('matches the approved tonal system and panel definition', () => {
    assert.match(landingSource, /--landing-deep: #17323b/)
    assert.match(landingSource, /--landing-sage: #d7dfd7/)
    assert.match(landingSource, /--landing-warm: #e7e0d5/)
    assert.match(landingSource, /tool-cluster\.practice[^}]*border: 1\.25px solid #87998b/)
    assert.match(landingSource, /tool-cluster\.capture[^}]*background: #c6d0c8/)
    assert.match(landingSource, /tool-cluster\.connect[^}]*background: #afbdb2/)
    assert.match(landingSource, /reflect-workspace[^}]*border: 1\.4px solid #9cac9f/)
    assert.match(landingSource, /latest-reflection[^}]*background: #f5f2ea/)
    assert.match(landingSource, /learning-edge-card[^}]*background: #becbbf/)
    assert.match(landingSource, /ask-panel[^}]*border: 1\.5px solid #617a74/)
  })

  test('retains therapist-control and current pricing boundaries', () => {
    assert.match(landingSource, /Therapist-controlled by design/)
    assert.match(landingSource, /Nothing silently becomes a Clinical Record/)
    assert.match(landingSource, /Research stays separate from client context/)
    assert.match(landingSource, /Reflection stays therapist-owned/)
    assert.match(landingSource, /Free: five active clients and five short text-AI actions monthly, with no payment card required/)
    assert.match(landingSource, /Professional is optional at £29\/month or £290\/year paid upfront/)
    assert.match(landingSource, /Dictation is available across plans subject to fair use/)
  })

  test('header and footer retain account, legal and support routes', () => {
    for (const route of ['sign-in', 'get-started', 'privacy', 'ai-data', 'cookies', 'terms', 'support']) {
      assert.ok(landingSource.includes(`to="/${route}"`), `Landing must retain /${route}`)
    }
  })

  test('uses the corporate Helios identity rather than founder-led positioning', () => {
    assert.doesNotMatch(landingSource, /Robert Ormiston MBACP/)
    assert.doesNotMatch(landingSource, /Psychotherapist · Founder of Helios/)
    assert.doesNotMatch(landingSource, /Independent, therapist-built practice software/)
    assert.match(landingSource, /Clinical workspace software for therapists\./)
    assert.match(landingSource, /Helios is operated by Chrysalis Therapy Services\./)
  })
})
