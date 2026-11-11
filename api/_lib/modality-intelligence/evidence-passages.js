import { createHash } from 'node:crypto';
import { evidenceSchema, object, list, enumeration, failure } from './contracts.js';

// Keep passage enums below the provider's aggregate schema limit. The same
// enum appears twice: reviewEvidence and observations[].citations.
export const MAX_EVIDENCE_PASSAGES = 400;
export const MAX_PASSAGE_CHARS = 1200;

/** The model selects opaque references, never retypes quotations. Each entry
 * remains an exact contiguous slice of ONE source in the CURRENT read batch.
 * No fuzzy matching, punctuation rewriting, cross-source search or text loss.
 */
export function prepareEvidencePassages(sources) {
  const byId = new Map();
  const ids = new Set();
  const inputs = sources.map(source => {
    if (ids.has(source.id)) throw failure('DUPLICATE_SOURCE_ID','The evidence contains ambiguous source identifiers.');
    ids.add(source.id);
    const text = String(source.text || '');
    const passages = [];
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + MAX_PASSAGE_CHARS, text.length);
      if (end < text.length) {
        // Preserve turns/paragraphs where possible, otherwise retain every
        // character on either side of a word-safe boundary. Never split UTF-16.
        const minimum = start + MAX_PASSAGE_CHARS / 2;
        const line = text.lastIndexOf('\n', end - 1);
        const space = text.lastIndexOf(' ', end - 1);
        if (line >= minimum) end = line + 1;
        else if (space >= minimum) end = space + 1;
        if (/[\uD800-\uDBFF]/.test(text[end - 1])) end--;
        if (text.length - end < 8) end = text.length;
      }
      if (byId.size >= MAX_EVIDENCE_PASSAGES) throw failure('EVIDENCE_WINDOW_TOO_LARGE',
        'The selected sources exceed the passage-review capacity. Adjust the evidence window; your existing draft is unchanged.',413);
      const quote = text.slice(start, end);
      const id = 'p' + createHash('sha256').update(JSON.stringify([source.id,source.range?.start || 0,start,end,quote])).digest('hex').slice(0,16);
      if (byId.has(id)) throw failure('DUPLICATE_SOURCE_PASSAGE','The source passages could not be identified unambiguously.');
      // Store immutable server-side offsets. These are never model assertions.
      byId.set(id, Object.freeze({ sourceId:source.id, quote, start, end }));
      passages.push({ id, text:quote });
      start = end;
    }
    const { text:unusedText, ...metadata } = source;
    return { ...metadata, passages };
  });
  if (!byId.size) throw failure('NO_SOURCE_MATERIAL','No selected source material is available.',409);
  const schema = evidenceSchema([...ids]);
  const citation = object({ passageId:enumeration([...byId.keys()]) });
  schema.properties.reviewEvidence = list(citation);
  schema.properties.observations.items.properties.citations = list(citation);
  return { sources:inputs, schema, byId };
}

/** Restore exact quotations from code-owned slices before the existing
 * independent verifier runs. The model cannot choose a different sourceId,
 * supply replacement text, stitch quotations or escape its submitted batch.
 */
export function resolveEvidencePassages(value, prepared, originalSources) {
  const originals = new Map(originalSources.map(source => [source.id, source]));
  const resolve = citation => {
    const passage = prepared.byId.get(citation?.passageId);
    const original = passage && originals.get(passage.sourceId);
    if (Object.keys(citation || {}).length !== 1 || !passage || !original ||
        String(original.text || '').slice(passage.start, passage.end) !== passage.quote) {
      throw failure('INVALID_SOURCE_PASSAGE','Helios could not link an observation to the selected source material. Your existing work is unchanged.');
    }
    return { sourceId:passage.sourceId, quote:passage.quote };
  };
  return { ...value, reviewEvidence:value.reviewEvidence.map(resolve),
    observations:value.observations.map(observation => ({ ...observation, citations:observation.citations.map(resolve) })) };
}
