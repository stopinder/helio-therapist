import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function evaluateInMadrid(source) {
  const command = `import { localSessionDateTime, localSessionDateTimeToUtc } from './src/lib/sessionDateTime.js'; console.log(JSON.stringify(${source}))`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', command], {
    cwd: process.cwd(),
    env: { ...process.env, TZ: 'Europe/Madrid' },
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim());
}

test('encounter date default is local, not the received UTC date', () => {
  assert.deepEqual(evaluateInMadrid("localSessionDateTime('2026-01-01T23:30:00Z')"),
    { date: '2026-01-02', time: '00:30' });
});

test('historical winter and summer dates are converted using local offset', () => {
  assert.equal(evaluateInMadrid("localSessionDateTimeToUtc('2026-01-01','10:00')"),
    '2026-01-01T09:00:00.000Z');
  assert.equal(evaluateInMadrid("localSessionDateTimeToUtc('2026-07-01','10:00')"),
    '2026-07-01T08:00:00.000Z');
});

test('invalid dates and DST spring-forward nonexistent times are rejected', () => {
  for (const [day, time] of [['2026-02-30','10:00'], ['2026-03-29','02:30'], ['', '10:00']]) {
    assert.deepEqual(evaluateInMadrid(`(() => { try { localSessionDateTimeToUtc('${day}','${time}'); return false } catch { return true } })()`), true);
  }
});
