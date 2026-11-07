import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { clientSessionSummarySystemPrompt } from '../api/_lib/ai-client-session-summary.js';
test('session summary prompt tuning rules',async t=>{
 const content=clientSessionSummarySystemPrompt('integrative');
 const endpoint=fs.readFileSync('api/ai/session-summary.js','utf8');
 await t.test('includes tentative inference guidance',()=>{assert.match(content,/tentative interpretation/);assert.match(content,/Never invent missing links/);});
 await t.test('includes repetition avoidance guidance',()=>{assert.match(content,/Say each important thing once/);assert.match(content,/remove repetitive descriptions/i);});
 await t.test('keeps section roles and longitudinal boundaries explicit',()=>{assert.match(content,/patternsOverTime: supported recurrence/);assert.match(content,/betweenSession: actual agreements/);assert.match(content,/two or more independent supplied session IDs/);assert.match(content,/Change needs explicit comparative evidence/);});
 await t.test('preserves grounding and evidenceStrength rules for both evidence scopes',()=>{for(const word of ['current_observation','therapist_guidance','tentative_connection'])assert.ok(content.includes(word));assert.match(content,/Cite only supplied source IDs/);assert.match(content,/text appears verbatim/i);assert.match(endpoint,/window === 'recent'/);assert.match(content,/single session, including its report of earlier repeated events/);});
});
