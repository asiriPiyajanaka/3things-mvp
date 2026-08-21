import fs from 'node:fs';
import path from 'node:path';
import { configPath, historyPath, homeDir, latestTaskPath, tasksDir } from './paths.js';

export const DEFAULT_INTERESTS = [
  'Frontend',
  'Backend',
  'Architecture',
  'DevOps',
  'Databases',
  'Testing',
  'Security',
  'Performance',
  'AI'
];

export const DEFAULT_CONFIG = {
  enabled: true,
  trigger: 'smart',
  interests: ['Frontend', 'Backend', 'Architecture', 'DevOps', 'Testing'],
  suggestOutsideInterests: true,
  rememberLearnedTopics: true,
  model: null
};

export function ensureHome() {
  fs.mkdirSync(tasksDir, { recursive: true, mode: 0o700 });
}

function writePrivateJson(file, value) {
  ensureHome();
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  try { fs.chmodSync(file, 0o600); } catch {}
}

export function loadConfig() {
  ensureHome();
  if (!fs.existsSync(configPath)) {
    writePrivateJson(configPath, DEFAULT_CONFIG);
    return structuredClone(DEFAULT_CONFIG);
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export function saveConfig(config) {
  writePrivateJson(configPath, config);
}

export function saveTask(event) {
  ensureHome();
  const safeId = String(event.turn_id || Date.now()).replace(/[^a-zA-Z0-9._-]/g, '_');
  const file = path.join(tasksDir, `${safeId}.json`);
  const task = {
    prompt: event.prompt,
    cwd: event.cwd || process.cwd(),
    sessionId: event.session_id || null,
    turnId: event.turn_id || null,
    model: event.model || null,
    capturedAt: new Date().toISOString()
  };
  writePrivateJson(file, task);
  writePrivateJson(latestTaskPath, task);
  return file;
}

export function loadTask(file = latestTaskPath) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function appendHistory(entry) {
  ensureHome();
  fs.appendFileSync(historyPath, `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  try { fs.chmodSync(historyPath, 0o600); } catch {}
}

export function readHistory(limit = 50) {
  if (!fs.existsSync(historyPath)) return [];
  const lines = fs.readFileSync(historyPath, 'utf8').split('\n').filter(Boolean);
  return lines.slice(-limit).map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}
