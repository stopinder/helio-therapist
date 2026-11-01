import { test, describe } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

describe('Landing Page Direction', () => {
  const landingPath = path.join(process.cwd(), 'src', 'views', 'Landing.vue')
  const landingSource = fs.readFileSync(landingPath, 'utf8')

  test('positions Helios as a clinical workspace rather than a generic practice manager', () => {
    assert.match(landingSource, /Keep the thread of the work together\./)
    assert.match(landingSource, /Clients, sessions, clinical thinking, documents, reflection and research/)
    assert.match(landingSource, /A CLINICAL WORKSPACE, NOT ANOTHER ADMIN SYSTEM/)
    assert.doesNotMatch(landingSource, /A place for your whole practice\./)
  })

  test('makes the clinical thread the primary product story', () => {
    assert.match(landingSource, /id="workspace"/)
    assert.match(landingSource, /The work has a thread\. <em>Helios keeps hold of it\.<\/em>/)
    for (const label of ['Before the session', 'During and after', 'Carry it forward']) {
      assert.ok(landingSource.includes(label), `Missing clinical-thread stage: ${label}`)
    }
    assert.match(landingSource, /client-workspace-section\.png/)
  })

  test('gives Ask Helios a first-class section with three deliberate modes', () => {
    assert.match(landingSource, /id="ask-helios"/)
    assert.match(landingSource, /One assistant\. <em>Three deliberate ways to think\.<\/em>/)
    for (const mode of ['Workspace', 'Research', 'Reflect']) {
      assert.ok(landingSource.includes(`<h3>${mode}</h3>`) || landingSource.includes(`>${mode}<`), `Missing Ask Helios mode: ${mode}`)
    }
    assert.match(landingSource, /not a supervisor, autonomous clinician or clinical-record author/)
  })

  test('presents Reflect as a private therapist workspace rather than a minor CPD feature', () => {
    assert.match(landingSource, /id="reflect"/)
    assert.match(landingSource, /A room inside Helios <em>for the therapist, not the record\.<\/em>/)
    for (const label of ['Reflections', 'Therapist Stance', 'Map', 'Growth', 'Practice Map', 'Supervision selection']) {
      assert.ok(landingSource.includes(label), `Missing Reflect concept: ${label}`)
    }
    assert.doesNotMatch(landingSource, /CPD & reflection/)
  })

  test('describes Transcript Inbox and Session Capture as a deliberate workflow', () => {
    assert.match(landingSource, /id="capture"/)
    assert.match(landingSource, /From transcript to something <em>clinically useful\.<\/em>/)
    assert.match(landingSource, /Assign without losing your place/)
    assert.match(landingSource, /Shape the output deliberately/)
    assert.match(landingSource, /No audio or video is imported/)
    assert.match(landingSource, /transcript-inbox-section\.webp/)
  })

  test('keeps ordinary tools in a supporting layer', () => {
    assert.match(landingSource, /id="tools"/)
    assert.match(landingSource, /The practical tools stay <em>in their place\.<\/em>/)
    for (const label of ['Calendar', 'Documents', 'Dictation', 'Supervision', 'Zoom', 'Integrations']) {
      assert.ok(landingSource.includes(`title: '${label}'`), `Missing supporting tool: ${label}`)
    }
  })

  test('retains therapist-control and pricing boundaries', () => {
    assert.match(landingSource, /THERAPIST-CONTROLLED BY DESIGN/)
    assert.match(landingSource, /Nothing silently becomes a Clinical Record/)
    assert.match(landingSource, /Research stays separate from client context/)
    assert.match(landingSource, /Free: five active clients and up to five short text-AI actions monthly/)
    assert.match(landingSource, /Professional: £29\/month or £290\/year/)
    assert.match(landingSource, /Dictation is available across plans subject to fair use/)
  })


  test('uses a consistent section rhythm instead of stacked dead space', () => {
    assert.match(landingSource, /--section-space: clamp\(52px, 5vw, 68px\)/)
    assert.match(landingSource, /--section-space-tight: clamp\(42px, 4vw, 54px\)/)
    assert.match(landingSource, /ask-layout[^}]*align-items: start/)
    assert.match(landingSource, /reflect-layout[^}]*align-items: start/)
    assert.match(landingSource, /capture-layout[^}]*align-items: start/)
    assert.match(landingSource, /reflect-section[^}]*background: #f2f2ed/)
    assert.match(landingSource, /tools-section[^}]*background: #f4f3ee/)
  })

  test('header and footer retain account, legal and support routes', () => {
    for (const route of ['sign-in', 'get-started', 'privacy', 'ai-data', 'terms', 'cookies', 'support']) {
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
