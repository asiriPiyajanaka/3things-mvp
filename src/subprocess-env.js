import fs from 'node:fs';
import path from 'node:path';

const FIXED_PATH_DIRS = Object.freeze([
  '/usr/bin',
  '/bin',
  '/usr/sbin',
  '/sbin',
  '/usr/local/bin',
  '/opt/homebrew/bin'
]);

function isExistingUnwritableDirectory(dir) {
  try {
    if (!fs.statSync(dir).isDirectory()) return false;
    fs.accessSync(dir, fs.constants.W_OK);
    return false;
  } catch (error) {
    return error?.code === 'EACCES' || error?.code === 'EPERM';
  }
}

export function fixedExecutablePath() {
  const dirs = FIXED_PATH_DIRS.filter(isExistingUnwritableDirectory);
  const safeDirs = dirs.length ? dirs : ['/usr/bin', '/bin', '/usr/sbin', '/sbin'];
  return safeDirs.join(path.delimiter);
}

export function safeSubprocessEnv(baseEnv = process.env, extra = {}) {
  const env = {};
  for (const [key, value] of Object.entries({ ...baseEnv, ...extra })) {
    if (key.toUpperCase() !== 'PATH') env[key] = value;
  }
  env.PATH = fixedExecutablePath();
  return env;
}

export function codexChildEnv(baseEnv = process.env) {
  const env = safeSubprocessEnv(baseEnv);
  env.THREETHINGS_CHILD = '1';
  return env;
}
