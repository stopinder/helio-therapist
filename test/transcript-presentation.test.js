import test from 'node:test'
import assert from 'node:assert/strict'
import {
  conversationPreview,
  conversationTurns,
  formatTranscriptTime,
  searchConversationTurns,
  transcriptSpeakerSummary
} from '../src/lib/transcriptPresentation.js'

test('formats Zoom timestamps without milliseconds or leading zero hours', () => {
  assert.equal(formatTranscriptTime('00:00:01.000'), '0:01')
  assert.equal(formatTranscriptTime('00:12:34.500'), '12:34')
  assert.equal(formatTranscriptTime('01:02:03.000'), '1:02:03')
})

test('prefers structured Zoom items and preserves only truthful supplied speaker names', () => {
  const transcript = {
    structuredTranscript: {
      speakers: [
        { speaker_id: '1', display_name: 'Robert Ormiston' },
        { speaker_id: '2', display_name: 'Unknown' }
      ],
      items: [
        { speaker_id: '1', start_time: '00:00:01.000', text: 'Hello?' },
        { speaker_id: '2', start_time: '00:00:02.000', text: 'Hi.' }
      ]
    },
    text: '[00:00:01.000] Wrong fallback: ignored'
  }

  assert.deepEqual(conversationTurns(transcript), [
    {
      key: 'speaker:1',
      speaker: 'Robert Ormiston',
      identified: true,
      time: '0:01',
      text: 'Hello?',
      sourceIndex: 0,
      endTime: '0:01',
      sourceCount: 1
    },
    {
      key: 'speaker:2',
      speaker: 'Unidentified speaker',
      identified: false,
      time: '0:02',
      text: 'Hi.',
      sourceIndex: 1,
      endTime: '0:02',
      sourceCount: 1
    }
  ])
})

test('cleans legacy Unknown raw transcript lines and groups consecutive utterances', () => {
  const transcript = {
    text: '[ ] Unknown: Hello? [ ] Unknown: Caught you staring out the window. [ ] Unknown: Just waiting patiently. [00:00:05.000] Robert Ormiston: Well,'
  }

  const turns = conversationTurns(transcript)
  assert.equal(turns.length, 2)
  assert.equal(turns[0].speaker, 'Unidentified speaker')
  assert.equal(turns[0].text, 'Hello? Caught you staring out the window. Just waiting patiently.')
  assert.equal(turns[1].speaker, 'Robert Ormiston')
  assert.equal(turns[1].time, '0:05')
})

test('preview shows 12 grouped turns by default and up to 30 when expanded', () => {
  const transcript = {
    structuredTranscript: {
      speakers: [
        { speaker_id: '1', display_name: 'Therapist' },
        { speaker_id: '2', display_name: 'Client' }
      ],
      items: Array.from({ length: 40 }, (_, index) => ({
        speaker_id: String((index % 2) + 1),
        start_time: `00:00:${String(index).padStart(2, '0')}.000`,
        text: `Turn ${index + 1}`
      }))
    }
  }

  assert.equal(conversationPreview(transcript).turns.length, 12)
  assert.equal(conversationPreview(transcript).hasMore, true)
  assert.equal(conversationPreview(transcript, { expanded: true }).turns.length, 30)
})

test('speaker summary and search work on the readable conversation model', () => {
  const transcript = {
    structuredTranscript: {
      speakers: [{ speaker_id: '1', display_name: 'Therapist' }],
      items: [
        { speaker_id: '1', text: 'How are you today?' },
        { speaker_id: '2', text: 'I am feeling better.' }
      ]
    }
  }

  assert.deepEqual(transcriptSpeakerSummary(transcript), {
    speakerCount: 2,
    identifiedSpeakers: ['Therapist'],
    hasUnidentified: true,
    turnCount: 2
  })
  assert.equal(searchConversationTurns(conversationTurns(transcript), 'better').length, 1)
  assert.equal(searchConversationTurns(conversationTurns(transcript), 'therapist').length, 1)
})
