import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('capture command saves a generic agent task', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), '3things-capture-'));
  const stateDir = path.join(home, '.3things');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, 'config.json'), JSON.stringify({
    enabled: true,
    trigger: 'manual',
    learningTerminalMode: 'new'
  }));

  const result = spawnSync(process.execPath, [
    'bin/3things.js',
    'capture',
    '--agent', 'custom-agent',
    '--cwd', process.cwd(),
    '--prompt', 'Fix retry handling'
  ], {
    cwd: process.cwd(),
    env: { ...process.env, HOME: home },
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const task = JSON.parse(fs.readFileSync(path.join(stateDir, 'latest-task.json'), 'utf8'));
  assert.equal(task.agent, 'custom-agent');
  assert.equal(task.prompt, 'Fix retry handling');

  fs.rmSync(home, { recursive: true, force: true });
});
