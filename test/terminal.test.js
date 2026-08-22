import test from 'node:test';
import assert from 'node:assert/strict';
import { macTerminalScript } from '../src/terminal.js';

test('macTerminalScript activates Terminal before running lesson command', () => {
  const script = macTerminalScript('/path with "quote"/node 3things');

  assert.match(script, /tell application "Terminal"/);
  assert.match(script, /activate/);
  assert.match(script, /do script/);
  assert.match(script, /\\"quote\\"/);
});
