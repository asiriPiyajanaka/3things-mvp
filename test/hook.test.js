import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHookCommand } from '../src/hook.js';

test('buildHookCommand quotes node and cli paths', () => {
  const command = buildHookCommand('/path with space/node', '/app/3things/bin/3things.js');
  assert.equal(command, '"/path with space/node" "/app/3things/bin/3things.js" hook');
});
