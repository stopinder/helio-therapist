function cleanSpeakerName(value) {
  const name = String(value || '').replace(/\s+/g, ' ').trim()
  if (!name) return ''
  if (/^unknown$/i.test(name)) return ''
  if (/^speaker\s*\d+$/i.test(name)) return ''
  if (/^unidentified(?:\s+speaker)?$/i.test(name)) return ''
  return name
}

function speakerKey(value) {
  const id = String(value || '').trim()
  return id ? `speaker:${id}` : 'speaker:unidentified'
}

export function formatTranscriptTime(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const match = raw.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\.\d+)?$/)
  if (!match) return raw
  const hours = Number(match[1] || 0)
  const minutes = Number(match[2] || 0)
  const seconds = Number(match[3] || 0)
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function structuredTurns(transcript) {
  const structured = transcript?.structuredTranscript
  const items = Array.isArray(structured?.items) ? structured.items : []
  if (!items.length) return []

  const names = new Map(
    (Array.isArray(structured?.speakers) ? structured.speakers : [])
      .filter(item => item?.speaker_id != null)
      .map(item => [String(item.speaker_id), cleanSpeakerName(item.display_name)])
  )

  return items.map((item, index) => {
    const id = item?.speaker_id != null ? String(item.speaker_id) : ''
    const supplied = names.get(id) || ''
    return {
      key: speakerKey(id),
      speaker: supplied || 'Unidentified speaker',
      identified: Boolean(supplied),
      time: formatTranscriptTime(item?.start_time),
      text: String(item?.text || '').replace(/\s+/g, ' ').trim(),
      sourceIndex: index
    }
  }).filter(turn => turn.text)
}

function rawTurns(text) {
  const raw = String(text || '').replace(/\r/g, '').trim()
  if (!raw) return []

  const normalized = raw.replace(/\s+(?=\[\s*[^\]]*\]\s*[^:\n]{1,80}:)/g, '\n')
  const lines = normalized.split(/\n+/).map(line => line.trim()).filter(Boolean)
  const parsed = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const match = line.match(/^\[\s*([^\]]*)\]\s*([^:]+):\s*(.*)$/)
    if (match) {
      const supplied = cleanSpeakerName(match[2])
      parsed.push({
        key: supplied ? `speaker-name:${supplied.toLowerCase()}` : 'speaker:unidentified',
        speaker: supplied || 'Unidentified speaker',
        identified: Boolean(supplied),
        time: formatTranscriptTime(match[1]),
        text: String(match[3] || '').replace(/\s+/g, ' ').trim(),
        sourceIndex: index
      })
      continue
    }

    const plain = line.match(/^([^:]{1,80}):\s*(.+)$/)
    if (plain) {
      const supplied = cleanSpeakerName(plain[1])
      parsed.push({
        key: supplied ? `speaker-name:${supplied.toLowerCase()}` : 'speaker:unidentified',
        speaker: supplied || 'Unidentified speaker',
        identified: Boolean(supplied),
        time: '',
        text: String(plain[2] || '').replace(/\s+/g, ' ').trim(),
        sourceIndex: index
      })
      continue
    }

    parsed.push({
      key: 'speaker:unidentified',
      speaker: 'Unidentified speaker',
      identified: false,
      time: '',
      text: line.replace(/\s+/g, ' ').trim(),
      sourceIndex: index
    })
  }

  return parsed.filter(turn => turn.text)
}

function groupConsecutiveTurns(turns, maxCharacters = 420) {
  const grouped = []

  for (const turn of turns) {
    const previous = grouped[grouped.length - 1]
    const combinedLength = previous ? previous.text.length + 1 + turn.text.length : 0
    if (previous && previous.key === turn.key && combinedLength <= maxCharacters) {
      previous.text = `${previous.text} ${turn.text}`
      previous.endTime = turn.time || previous.endTime || previous.time
      previous.sourceCount += 1
      continue
    }
    grouped.push({ ...turn, endTime: turn.time, sourceCount: 1 })
  }

  return grouped
}

export function conversationTurns(transcript) {
  const structured = structuredTurns(transcript)
  if (structured.length) return groupConsecutiveTurns(structured)

  const raw = rawTurns(transcript?.text)
  if (raw.length) return groupConsecutiveTurns(raw)

  return []
}

export function transcriptSpeakerSummary(transcript) {
  const turns = conversationTurns(transcript)
  const keys = new Set(turns.map(turn => turn.key))
  const identified = [...new Set(turns.filter(turn => turn.identified).map(turn => turn.speaker))]
  return {
    speakerCount: keys.size,
    identifiedSpeakers: identified,
    hasUnidentified: turns.some(turn => !turn.identified),
    turnCount: turns.length
  }
}

export function conversationPreview(transcript, { expanded = false } = {}) {
  const turns = conversationTurns(transcript)
  const limit = expanded ? 30 : 12
  return {
    turns: turns.slice(0, limit),
    totalTurns: turns.length,
    limit,
    hasMore: turns.length > limit
  }
}

export function searchConversationTurns(turns, query) {
  const needle = String(query || '').trim().toLowerCase()
  if (!needle) return turns
  return turns.filter(turn =>
    turn.text.toLowerCase().includes(needle) ||
    turn.speaker.toLowerCase().includes(needle)
  )
}
