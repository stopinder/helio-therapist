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
})
