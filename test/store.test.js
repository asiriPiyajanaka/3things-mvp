import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from '../src/store.js';

test('default trigger is smart', () => {
  assert.equal(DEFAULT_CONFIG.trigger, 'smart');
});

test('3Things keeps exactly-three behavior out of config', () => {
  assert.equal(Object.hasOwn(DEFAULT_CONFIG, 'thingsPerTask'), false);
});
