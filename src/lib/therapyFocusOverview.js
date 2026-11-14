// Keep clinical categories visible regardless of edit order or active perspective.
export function focusOverviewItems(items, sections) {
  const current=items.filter(item=>item.status==='current')
  const kinds=[...new Set([...Object.keys(sections),...current.map(item=>item.kind)])]
  return kinds.map(kind=>current.find(item=>item.kind===kind)||{id:`empty:${kind}`,kind,body:'',empty:true})
}
export function focusEvidenceLabel(evidence) {
  if(!evidence)return 'Evidence coverage not recorded for this entry.'
  const labels={observation:'Observation',clinical_inference:'Tentative formulation',possible_next_step:'Possible next step'}
  const dates=(evidence.sources||[]).map(s=>s.occurredAt ? new Date(s.occurredAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : 'Date unavailable')
  return [labels[evidence.epistemic],dates.length?`Evidence: ${dates.join(' · ')}`:'Source dates unavailable',(evidence.sources||[]).some(s=>s.reviewStatus==='draft')?'Includes draft summary material':null].filter(Boolean).join(' · ')
}
export function focusCoverage(items,sessions=[]) {
  const reviews=items.filter(i=>i.status==='current'&&i.evidence?.coverage?.reviewedAt).map(i=>i.evidence.coverage).sort((a,b)=>b.reviewedAt.localeCompare(a.reviewedAt))
  if(!reviews.length)return 'No dated history review is attached to the current entries. Open Therapy Focus to review the available sessions.'
  const latest=reviews[0], ids=new Set(latest.selectedSessionIds||[])
  const missing=sessions.filter(s=>!ids.has(s.id)).length
  return `Latest saved review: ${latest.selectedSessions} of ${latest.totalSessions} sessions included at review time. ${missing ? `${missing} currently recorded session${missing===1?' is':'s are'} outside that review.` : 'Coverage reflects the material available when reviewed.'} Individual entries may draw on different reviews.`
}
