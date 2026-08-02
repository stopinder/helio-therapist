import test from 'node:test'
import assert from 'node:assert/strict'

// Mock the logic we want to implement in Calendar.vue
function isUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getSafeHostname(str) {
  try {
    const url = new URL(str);
    return url.hostname;
  } catch {
    return '';
  }
}

test('URL detection logic', () => {
  assert.strictEqual(isUrl('https://www.betterhelp.com/session?id=12345&token=abc'), true);
  assert.strictEqual(isUrl('http://localhost:3000'), true);
  assert.strictEqual(isUrl('plain text location'), false);
  assert.strictEqual(isUrl('javascript:alert(1)'), false);
  assert.strictEqual(isUrl('data:text/plain,hello'), false);
  assert.strictEqual(isUrl('ftp://files.com'), false);
});

test('Safe hostname extraction', () => {
  assert.strictEqual(getSafeHostname('https://www.betterhelp.com/session?id=12345'), 'www.betterhelp.com');
  assert.strictEqual(getSafeHostname('https://meet.google.com/abc-defg-hij'), 'meet.google.com');
});

test('Rejection of unsafe protocols', () => {
  const unsafe = 'javascript:alert("XSS")';
  assert.strictEqual(isUrl(unsafe), false);
});
