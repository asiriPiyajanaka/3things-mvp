import test from 'node:test';
import assert from 'node:assert/strict';
import { codexChildEnv, fixedExecutablePath, safeSubprocessEnv } from '../src/subprocess-env.js';

test('safeSubprocessEnv replaces caller PATH with a fixed path', () => {
  const env = safeSubprocessEnv(
    {
      PATH: '/tmp/writable-bin',
      Path: '/also/not-used',
      HOME: '/home/example'
    },
    { PATH: '/extra/not-used' }
  );

  assert.equal(env.HOME, '/home/example');
  assert.equal(env.PATH, fixedExecutablePath());
  assert.equal(Object.hasOwn(env, 'Path'), false);
  assert.doesNotMatch(env.PATH, /\/tmp\/writable-bin/);
  assert.doesNotMatch(env.PATH, /\/also\/not-used/);
  assert.doesNotMatch(env.PATH, /\/extra\/not-used/);
});

test('codexChildEnv preserves recursion protection', () => {
  const env = codexChildEnv({ PATH: '/tmp/writable-bin' });

  assert.equal(env.THREETHINGS_CHILD, '1');
  assert.equal(env.PATH, fixedExecutablePath());
});
