import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

test('ClinicalRecordMetadata.vue hardening', () => {
  const content = fs.readFileSync('src/components/workspace/ClinicalRecordMetadata.vue', 'utf8');
  assert.strictEqual(content.includes('(Mock)'), false, 'Should not contain (Mock)');
  assert.strictEqual(content.includes('Robert Ormiston'), false, 'Should not contain hardcoded Robert Ormiston');
  assert.match(content, /default:\s*'Therapist'/, 'Should use Therapist as fallback');
});

test('SessionWorkspace.vue profile loading', () => {
  const content = fs.readFileSync('src/views/SessionWorkspace.vue', 'utf8');
  assert.match(content, /therapistName\s*=\s*ref\(''\)/, 'Should initialize therapistName ref');
  assert.match(content, /therapistName\.value\s*=\s*profile\?\.full_name/, 'Should set therapistName from profile full_name');
  assert.match(content, /:therapistName="therapistName"/, 'Should pass therapistName prop to components');
});

test('ClinicalSummaryTab.vue and CompletedClinicalRecord.vue integration', () => {
  const summaryContent = fs.readFileSync('src/components/workspace/ClinicalSummaryTab.vue', 'utf8');
  const recordContent = fs.readFileSync('src/components/workspace/CompletedClinicalRecord.vue', 'utf8');
  
  assert.match(summaryContent, /therapistName: {\s*type: String/, 'ClinicalSummaryTab should accept therapistName prop');
  assert.match(recordContent, /therapistName: {\s*type: String/, 'CompletedClinicalRecord should accept therapistName prop');
  
  assert.match(summaryContent, /:author="therapistName"/, 'Should pass therapistName to metadata in summary tab');
  assert.match(recordContent, /:author="therapistName"/, 'Should pass therapistName to metadata in completed record');
});