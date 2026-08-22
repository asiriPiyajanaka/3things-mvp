import fs from 'node:fs';
import path from 'node:path';
import { codexHooksPath } from './paths.js';

export function buildHookCommand(nodePath, cliPath) {
  const quote = (v) => `"${String(v).replaceAll(/\\/g, '\\\\').replaceAll(/"/g, '\\"')}"`;
  return `${quote(nodePath)} ${quote(cliPath)} hook`;
}

export function installHook(command) {
  fs.mkdirSync(path.dirname(codexHooksPath), { recursive: true });
  let root = {};
  if (fs.existsSync(codexHooksPath)) {
    try { root = JSON.parse(fs.readFileSync(codexHooksPath, 'utf8')); }
    catch { throw new Error(`Cannot parse existing ${codexHooksPath}. Fix it before installing 3Things.`); }
  }
  root.hooks ||= {};
  root.hooks.UserPromptSubmit ||= [];

  const alreadyInstalled = root.hooks.UserPromptSubmit.some((group) =>
    Array.isArray(group.hooks) && group.hooks.some((hook) =>
      typeof hook.command === 'string' && hook.command.includes('3things') && hook.command.endsWith(' hook')
    )
  );

  if (!alreadyInstalled) {
    root.hooks.UserPromptSubmit.push({
      hooks: [{
        type: 'command',
        command,
        async: true,
        timeout: 120
      }]
    });
  }

  fs.writeFileSync(codexHooksPath, `${JSON.stringify(root, null, 2)}\n`);
  return { path: codexHooksPath, added: !alreadyInstalled };
}
