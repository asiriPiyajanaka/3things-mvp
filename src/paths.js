import os from 'node:os';
import path from 'node:path';

export const homeDir = path.join(os.homedir(), '.3things');
export const configPath = path.join(homeDir, 'config.json');
export const historyPath = path.join(homeDir, 'history.jsonl');
export const latestTaskPath = path.join(homeDir, 'latest-task.json');
export const learningSessionPath = path.join(homeDir, 'learning-session.json');
export const pendingTaskPath = path.join(homeDir, 'pending-task.json');
export const smartDecisionPath = path.join(homeDir, 'smart-decision.json');
export const tasksDir = path.join(homeDir, 'tasks');
export const codexHooksPath = path.join(os.homedir(), '.codex', 'hooks.json');
