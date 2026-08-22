import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { safeSubprocessEnv } from './subprocess-env.js';

const cliPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../bin/3things.js');

function shellQuote(value) {
  return `'${String(value).replaceAll(/'/g, `'"'"'`)}'`;
}

function commandFor(eventFile) {
  return `${shellQuote(process.execPath)} ${shellQuote(cliPath)} learn --event ${shellQuote(eventFile)}`;
}

export function macTerminalScript(command) {
  const escaped = command.replaceAll(/\\/g, '\\\\').replaceAll(/"/g, '\\"');
  return `tell application "Terminal"\nactivate\ndo script "${escaped}"\nend tell`;
}

function commandExists(name) {
  const checker = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(checker, [name], { stdio: 'ignore', env: safeSubprocessEnv() }).status === 0;
}

export function openLearningTerminal(eventFile) {
  const command = commandFor(eventFile);

  if (process.platform === 'darwin') {
    const script = macTerminalScript(command);
    const child = spawn('osascript', ['-e', script], { detached: true, stdio: 'ignore', env: safeSubprocessEnv() });
    child.unref();
    return true;
  }

  if (process.platform === 'win32') {
    const psCommand = `Start-Process powershell -ArgumentList '-NoExit','-Command',${JSON.stringify(command)}`;
    const child = spawn('powershell.exe', ['-NoProfile', '-Command', psCommand], { detached: true, stdio: 'ignore', env: safeSubprocessEnv() });
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
    const child = spawn(terminal, args, { detached: true, stdio: 'ignore', env: safeSubprocessEnv() });
    child.unref();
    return true;
  }

  return false;
}
