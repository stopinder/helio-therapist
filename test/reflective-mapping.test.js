import { describe, expect, it } from '@jest/globals'
import {
  emptyReflectiveMap,
  normalizeReflectiveMap,
  normalizeWorkspaceReflection,
  workspaceReflectionBody
} from '../src/lib/reflections.js'

describe('reflective mapping', () => {
  it('starts with an empty therapist-authored map', () => {
    expect(emptyReflectiveMap()).toEqual({
      innerPosition: '',
      protectiveIntention: '',
      trigger: '',
      impact: '',
      spaceCreated: '',
      supervisionQuestion: ''
    })
  })

  it('normalizes map values without accepting arbitrary keys', () => {
    expect(normalizeReflectiveMap({ innerPosition: 'The rescuer', trigger: 'Client distress', invented: 'no' })).toEqual({
      innerPosition: 'The rescuer',
      protectiveIntention: '',
      trigger: 'Client distress',
      impact: '',
      spaceCreated: '',
      supervisionQuestion: ''
    })
  })

  it('preserves a reflective map inside workspace content', () => {
    const normalized = normalizeWorkspaceReflection({
      stoodOut: 'A difficult silence',
      reflectiveMap: { innerPosition: 'The organiser', protectiveIntention: 'Keep things moving' }
    })
    expect(normalized.reflectiveMap.innerPosition).toBe('The organiser')
    expect(normalized.reflectiveMap.protectiveIntention).toBe('Keep things moving')
  })

  it('keeps structured mapping out of the generated reflection body', () => {
    const body = workspaceReflectionBody({
      stoodOut: 'A difficult silence',
      reflectiveMap: { innerPosition: 'The organiser' }
    })
    expect(body).toBe('A difficult silence')
    expect(body).not.toContain('The organiser')
  })

  it('does not treat free-text reflection language as structured mapping', () => {
    const normalized = normalizeWorkspaceReflection({
      stoodOut: 'I noticed a part of me wanted to rescue the client.'
    })
    expect(normalized.reflectiveMap).toBeUndefined()
    expect(normalized.stoodOut).toContain('wanted to rescue')
  })

  it('keeps therapist wording intact rather than assigning a predefined position', () => {
    const normalized = normalizeReflectiveMap({
      innerPosition: 'The bit of me that needed to get it right',
      protectiveIntention: 'Avoid letting the client down'
    })
    expect(normalized.innerPosition).toBe('The bit of me that needed to get it right')
    expect(normalized.protectiveIntention).toBe('Avoid letting the client down')
  })
})
