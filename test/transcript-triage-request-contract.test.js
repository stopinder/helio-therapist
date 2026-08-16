import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/workspace/TranscriptTab.vue', import.meta.url), 'utf8');

describe('transcript triage request session boundary', () => {
  it('surfaces the saved triage request without implying automatic generation', () => {
    expect(source).toContain('Transcript triage request');
    expect(source).toContain("clinical_summary: 'Clinical summary requested'");
    expect(source).toContain("draft_note: 'Draft clinical note requested'");
    expect(source).toContain("cbt: 'CBT reflection requested'");
    expect(source).toContain('Nothing has been generated automatically');
  });

  it('keeps the request separate from Clinical Record approval', () => {
    expect(source).toContain('this request does not create or approve a Clinical Record');
    expect(source).not.toContain('Generate requested output');
  });
});
