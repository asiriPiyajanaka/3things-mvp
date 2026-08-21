import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function tempFile(name) {
  return path.join(os.tmpdir(), `3things-${process.pid}-${Date.now()}-${name}`);
}

export function codexAvailable() {
  const result = spawnSync('codex', ['--version'], { encoding: 'utf8' });
  return result.status === 0;
}

export function runCodex(prompt, { cwd = process.cwd(), model = null, schema = null } = {}) {
  const outputFile = tempFile('output.txt');
  const args = [
    'exec',
    '--ephemeral',
    '--sandbox', 'read-only',
    '--skip-git-repo-check',
    '--output-last-message', outputFile,
    '--cd', cwd
  ];
  if (model) args.push('--model', model);
  if (schema) args.push('--output-schema', schema);
  args.push('-');

  const result = spawnSync('codex', args, {
    input: prompt,
    encoding: 'utf8',
    env: { ...process.env, THREETHINGS_CHILD: '1' },
    maxBuffer: 10 * 1024 * 1024
  });

  let output = '';
  if (fs.existsSync(outputFile)) {
    output = fs.readFileSync(outputFile, 'utf8').trim();
    fs.rmSync(outputFile, { force: true });
  }

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(`Codex learning call failed${detail ? `: ${detail.slice(-800)}` : ''}`);
  }

  return output;
}

export function runCodexJson(prompt, options = {}) {
  const raw = runCodex(prompt, options);
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) return JSON.parse(fenced);
    throw new Error(`Codex returned invalid JSON: ${raw.slice(0, 300)}`);
  }
}
