import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cliPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../bin/3things.js');

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function commandFor(eventFile) {
  return `${shellQuote(process.execPath)} ${shellQuote(cliPath)} learn --event ${shellQuote(eventFile)}`;
}

function commandExists(name) {
  const checker = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(checker, [name], { stdio: 'ignore' }).status === 0;
}

export function openLearningTerminal(eventFile) {
  const command = commandFor(eventFile);

  if (process.platform === 'darwin') {
    const escaped = command.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const script = `tell application "Terminal" to do script "${escaped}"`;
    const child = spawn('osascript', ['-e', script], { detached: true, stdio: 'ignore' });
    child.unref();
    return true;
  }

  if (process.platform === 'win32') {
    const psCommand = `Start-Process powershell -ArgumentList '-NoExit','-Command',${JSON.stringify(command)}`;
    const child = spawn('powershell.exe', ['-NoProfile', '-Command', psCommand], { detached: true, stdio: 'ignore' });
    child.unref();
    return true;
  }

  const candidates = [
    ['x-terminal-emulator', ['-e', 'bash', '-lc', `${command}; exec bash`]],
    ['gnome-terminal', ['--', 'bash', '-lc', `${command}; exec bash`]],
    ['konsole', ['-e', 'bash', '-lc', `${command}; exec bash`]],
    ['xterm', ['-e', 'bash', '-lc', `${command}; exec bash`]]
  ];

  for (const [terminal, args] of candidates) {
    if (!commandExists(terminal)) continue;
    const child = spawn(terminal, args, { detached: true, stdio: 'ignore' });
    child.unref();
    return true;
  }

  return false;
}
