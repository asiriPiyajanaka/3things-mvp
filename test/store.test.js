import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pendingTaskPath, smartDecisionPath } from '../src/paths.js';
import {
  clearDailyArea,
  clearPendingTask,
  DEFAULT_CONFIG,
  getFreshDailyArea,
  markPendingTask,
  markSmartDecision,
  readPendingTask,
  readSmartDecision,
  setDailyArea
} from '../src/store.js';

test('default trigger is smart', () => {
  assert.equal(DEFAULT_CONFIG.trigger, 'smart');
});

test('3Things keeps exactly-three behavior out of config', () => {
  assert.equal(Object.hasOwn(DEFAULT_CONFIG, 'thingsPerTask'), false);
});

test('default learning terminal mode opens a new terminal per lesson', () => {
  assert.equal(DEFAULT_CONFIG.learningTerminalMode, 'new');
});

test('daily learning area is fresh for less than 24 hours', () => {
  const config = structuredClone(DEFAULT_CONFIG);
  setDailyArea(config, 'Frontend', new Date('2026-08-21T00:00:00.000Z'));

  assert.equal(getFreshDailyArea(config, new Date('2026-08-21T23:59:59.000Z')), 'Frontend');
  assert.equal(getFreshDailyArea(config, new Date('2026-08-22T00:00:00.000Z')), null);
});

test('daily learning area can be cleared', () => {
  const config = structuredClone(DEFAULT_CONFIG);
  setDailyArea(config, 'Security', new Date('2026-08-21T00:00:00.000Z'));
  clearDailyArea(config);

  assert.equal(getFreshDailyArea(config, new Date('2026-08-21T01:00:00.000Z')), null);
});

test('pending task is ignored when it matches the current lesson', () => {
  const eventFile = new URL(import.meta.url).pathname;
  markPendingTask(eventFile);

  assert.equal(readPendingTask({ currentEventFile: eventFile }), null);
  assert.equal(fs.existsSync(pendingTaskPath), false);
});

test('pending task returns a different existing event file', () => {
  const eventFile = new URL(import.meta.url).pathname;
  markPendingTask(eventFile);

  const pending = readPendingTask({ currentEventFile: null });
  assert.equal(pending.eventFile, eventFile);

  clearPendingTask();
});

test('smart decision stores the latest launch reason', () => {
  markSmartDecision({ eventFile: 'task.json', launch: false, reason: 'too small' });

  const decision = readSmartDecision();
  assert.equal(decision.eventFile, 'task.json');
  assert.equal(decision.launch, false);
  assert.equal(decision.reason, 'too small');
  assert.equal(fs.existsSync(smartDecisionPath), true);

  fs.rmSync(smartDecisionPath, { force: true });
});
