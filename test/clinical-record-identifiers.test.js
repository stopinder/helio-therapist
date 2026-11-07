import test from 'node:test';
import assert from 'node:assert/strict';
import { validUuid } from '../api/_lib/clinical-record-evidence.js';

test('Clinical Record IDs retain the complete 8-4-4-4-12 UUID contract',()=>{
  assert.equal(validUuid('11111111-1111-4111-8111-111111111111'),true);
  assert.equal(validUuid('ABCDEF12-3456-4789-ABCD-123456789ABC'),true);
  for(const value of [null,undefined,{},42,'','11111111-1111-4111-111111111111','11111111-1111-4111-8111-11111111111','not-a-client-id',' 11111111-1111-4111-8111-111111111111']){
    assert.equal(validUuid(value),false);
  }
});
