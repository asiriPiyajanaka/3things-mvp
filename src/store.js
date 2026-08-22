import fs from 'node:fs';
import path from 'node:path';
import { configPath, historyPath, homeDir, learningSessionPath, latestTaskPath, pendingTaskPath, smartDecisionPath, tasksDir } from './paths.js';

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
  dailyLearningArea: null,
  learningTerminalMode: 'new',
  model: null
};

export const DAILY_AREA_TTL_MS = 24 * 60 * 60 * 1000;
export const LEARNING_SESSION_RESERVATION_MS = 5 * 60 * 1000;

export function freshConfig() {
  return structuredClone(DEFAULT_CONFIG);
}

export function getFreshDailyArea(config, now = new Date()) {
  const area = config.dailyLearningArea;
  if (!area || typeof area.name !== 'string' || !area.name.trim()) return null;
  const selectedAt = Date.parse(area.selectedAt);
  if (!Number.isFinite(selectedAt)) return null;
  if (now.getTime() - selectedAt >= DAILY_AREA_TTL_MS) return null;
  return area.name.trim();
}

export function setDailyArea(config, name, now = new Date()) {
  config.dailyLearningArea = {
    name,
    selectedAt: now.toISOString()
  };
  return config;
}

export function clearDailyArea(config) {
  config.dailyLearningArea = null;
  return config;
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

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
    return freshConfig();
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return freshConfig();
  }
}

export function saveConfig(config) {
  writePrivateJson(configPath, config);
}

export function resetConfig() {
  const config = freshConfig();
  saveConfig(config);
  clearLearningSession();
  return config;
}

export function signOff() {
  fs.rmSync(homeDir, { recursive: true, force: true });
}

export function markLearningSession(session = {}) {
  writePrivateJson(learningSessionPath, {
    pid: session.pid ?? process.pid,
    eventFile: session.eventFile ?? null,
    startedAt: new Date().toISOString()
  });
}

export function clearLearningSession() {
  try { fs.rmSync(learningSessionPath, { force: true }); } catch {}
}

export function readLearningSession(now = new Date()) {
  if (!fs.existsSync(learningSessionPath)) return null;
  let session;
  try {
    session = JSON.parse(fs.readFileSync(learningSessionPath, 'utf8'));
  } catch {
    clearLearningSession();
    return null;
  }

  const pidAlive = processIsAlive(session.pid);
  const startedAt = Date.parse(session.startedAt);
  const reserved = Number.isFinite(startedAt) && now.getTime() - startedAt < LEARNING_SESSION_RESERVATION_MS;
  return {
    ...session,
    active: pidAlive || reserved,
    pidAlive,
    reserved
  };
}

export function markPendingTask(eventFile) {
  writePrivateJson(pendingTaskPath, {
    eventFile,
    capturedAt: new Date().toISOString()
  });
}

export function clearPendingTask() {
  try { fs.rmSync(pendingTaskPath, { force: true }); } catch {}
}

export function readPendingTask({ currentEventFile = null } = {}) {
  if (!fs.existsSync(pendingTaskPath)) return null;
  let pending;
  try {
    pending = JSON.parse(fs.readFileSync(pendingTaskPath, 'utf8'));
  } catch {
    clearPendingTask();
    return null;
  }

  if (!pending.eventFile || pending.eventFile === currentEventFile) {
    clearPendingTask();
    return null;
  }

  if (!fs.existsSync(pending.eventFile)) {
    clearPendingTask();
    return null;
  }

  return pending;
}

export function hasActiveLearningSession(now = new Date()) {
  const session = readLearningSession(now);
  if (!session) return false;
  if (session.active) return true;
  clearLearningSession();
  return false;
}

export function markSmartDecision({ eventFile, launch, reason }) {
  writePrivateJson(smartDecisionPath, {
    eventFile,
    launch: Boolean(launch),
    reason: String(reason || '').slice(0, 120),
    decidedAt: new Date().toISOString()
  });
}

export function readSmartDecision() {
  if (!fs.existsSync(smartDecisionPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(smartDecisionPath, 'utf8'));
  } catch {
    try { fs.rmSync(smartDecisionPath, { force: true }); } catch {}
    return null;
  }
}

export function saveTask(event) {
  ensureHome();
  const safeId = String(event.turn_id || Date.now()).replace(/[^a-zA-Z0-9._-]/g, '_');
  const file = path.join(tasksDir, `${safeId}.json`);
  const task = {
    agent: event.agent || 'unknown',
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
