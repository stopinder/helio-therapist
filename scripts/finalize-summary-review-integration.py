"""Final guarded changes after the two one-time integration scripts."""
from pathlib import Path

p=Path('src/components/TranscriptInbox.vue');s=p.read_text()
old='!transcript.sessionRef class="inline-assignment"'
assert old in s,'Expected integrated inbox attribute'
s=s.replace(old,'!transcript.sessionRef" class="inline-assignment"');p.write_text(s)

p=Path('api/_lib/summary-outcome.js');s=p.read_text();old="if(!exactKeys(item,['sourceId','sourceType','quote']))return null;"
assert old in s;s=s.replace(old,"if(!exactKeys(item,['sourceId','sourceType','quote']) || !['transcript','zoom_note','session_capture','session_summary'].includes(item.sourceType))return null;");p.write_text(s)

p=Path('supabase/migrations/20261105201218_summary_source_review.sql');s=p.read_text();old="if original.client_id is null or original.session_ref is null or length(trim(coalesce(p_context,'')))<10 then"
assert old in s;s=s.replace(old,"if original.client_id is null or original.session_ref is null or length(trim(coalesce(p_context,'')))<10 or length(trim(coalesce(original.original_transcript,'')))<20 then");p.write_text(s)

# A late source flag must also prevent copying a document opened before the flag.
p=Path('src/components/workspace/ClientDocumentComposer.vue');s=p.read_text();old="async function copySummary(){\n  if(sourceReview.value||summaryUnsafe.value||sourceSafetyChecking.value)return;"
assert old in s
s=s.replace(old,old+"\n  if(currentDocument.value?.id){try{const safety=await checkSummarySourceSafety(currentDocument.value.id);if(!safety.safe){sourceReview.value=safety.review;return}}catch{sourceReview.value={message:'Source safety could not be verified. Review before copying.',sources:[]};return}}")
p.write_text(s)
print('Closed validation, sharing, and source-review presentation edge cases.')
