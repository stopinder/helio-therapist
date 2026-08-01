/**
 * Calendar and session domain logic helpers.
 */

/**
 * Checks if a string is a valid UUID.
 */
export function isValidId(id) {
  if (!id) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Determines if a session is eligible to be started.
 */
export function isEligibleForStart(session) {
  return isValidId(session.id) && 
         isValidId(session.clientId) && 
         !['completed', 'cancelled'].includes(session.status)
}

/**
 * Monday-first start of week.
 */
export function getStartOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - (day === 0 ? 6 : day - 1)
  const start = new Date(d.setDate(diff))
  start.setHours(0, 0, 0, 0)
  return start
}

/**
 * Returns a date clamped to the end of the month if necessary.
 * e.g. Jan 31 -> Feb 28
 */
export function addMonths(date, months) {
  const d = new Date(date)
  const day = d.getDate()
  d.setMonth(d.getMonth() + months)
  if (d.getDate() !== day) {
    d.setDate(0)
  }
  return d
}

/**
 * Calculates event visual style in the timed grid.
 */
export function getEventStyle(event, overlappingData = { column: 0, totalColumns: 1 }) {
  const startHour = event.start.getHours() + event.start.getMinutes() / 60
  const endHour = event.end.getHours() + event.end.getMinutes() / 60
  const duration = endHour - startHour
  
  // Clinical range: 08:00 - 18:00 (10 hours)
  const rangeStart = 8
  const rangeEnd = 18
  const hourHeight = 80 // Figma spec: ~80px per displayed hour

  const top = (startHour - rangeStart) * hourHeight
  const height = Math.max(duration * hourHeight, 24)

  const width = 100 / overlappingData.totalColumns
  const left = overlappingData.column * width

  return {
    top: `${top}px`,
    height: `${height}px`,
    left: `${left}%`,
    width: `${width}%`
  }
}

/**
 * Groups events that overlap in time.
 */
export function getOverlappingGroups(events) {
  const sorted = [...events].sort((a, b) => a.start - b.start)
  const groups = []
  
  sorted.forEach(event => {
    let placed = false
    for (const group of groups) {
      if (group.some(e => e.start < event.end && event.start < e.end)) {
        group.push(event)
        placed = true
        break
      }
    }
    if (!placed) {
      groups.push([event])
    }
  })
  
  const eventStyles = {}
  groups.forEach(group => {
    const columns = []
    group.forEach(event => {
      let columnIndex = 0
      while (columns[columnIndex] && columns[columnIndex].some(e => e.start < event.end && event.start < e.end)) {
        columnIndex++
      }
      if (!columns[columnIndex]) columns[columnIndex] = []
      columns[columnIndex].push(event)
    })
    
    group.forEach(event => {
      let colIdx = columns.findIndex(col => col.includes(event))
      eventStyles[event.id] = {
        column: colIdx,
        totalColumns: columns.length
      }
    })
  })
  
  return eventStyles
}

/**
 * Generates cells for a Monday-first mini calendar.
 */
export function getMiniCalendarCells(viewDate, selectedDate) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  
  // getDay() is 0 (Sun) to 6 (Sat)
  // We want Monday (1) to be first
  let firstDayIdx = firstDayOfMonth.getDay()
  firstDayIdx = firstDayIdx === 0 ? 6 : firstDayIdx - 1
  
  const cells = []
  const today = new Date()
  
  // Leading blanks
  for (let i = 0; i < firstDayIdx; i++) {
    cells.push({ key: `blank-start-${i}`, date: null })
  }
  
  // Month days
  for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
    const date = new Date(year, month, d)
    cells.push({
      key: date.toISOString(),
      date,
      isToday: isSameDay(date, today),
      isSelected: isSameDay(date, selectedDate)
    })
  }
  
  // Trailing blanks to complete the last week
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let i = 0; i < remaining; i++) {
      cells.push({ key: `blank-end-${i}`, date: null })
    }
  }
  
  return cells
}

export function isSameDay(a, b) {
  return a && b && 
         a.getFullYear() === b.getFullYear() && 
         a.getMonth() === b.getMonth() && 
         a.getDate() === b.getDate()
}
