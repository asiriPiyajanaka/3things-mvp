import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  appendHistory,
  clearDailyArea,
  clearLearningSession,
  clearPendingTask,
  DEFAULT_INTERESTS,
  getFreshDailyArea,
  hasActiveLearningSession,
  loadConfig,
  loadTask,
  markLearningSession,
  markPendingTask,
  markSmartDecision,
  readLearningSession,
  readPendingTask,
  readHistory,
  readSmartDecision,
  resetConfig,
  saveConfig,
  saveTask,
  setDailyArea,
  signOff
} from './store.js';
import { chooseMany, chooseOne, confirm, heading, inputText, muted, note, clearScreen, revealText, withSpinner } from './ui.js';
import { codexAvailable, runCodex, runCodexAsync, runCodexJson, runCodexJsonAsync } from './codex.js';
import { areasPrompt, lessonPrompt, smartPrompt, topicsPrompt } from './prompts.js';
import { installHook, buildHookCommand } from './hook.js';
import { openLearningTerminal } from './terminal.js';
import { focusLessonView, renderLesson } from './lesson-view.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const smartSchema = path.join(here, 'schemas', 'smart.schema.json');
const areasSchema = path.join(here, 'schemas', 'areas.schema.json');
const topicsSchema = path.join(here, 'schemas', 'topics.schema.json');
const cliPath = path.resolve(here, '../bin/3things.js');

function argValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function printHelp() {
  console.log(`3Things — learn three things from the Codex tasks you already do.\n\nCommands:\n  3things init           Install Codex hook and configure 3Things\n  3things config         Change trigger behavior and preferences\n  3things reset          Reset config and run setup again\n  3things signoff        Remove local 3Things state\n  3things interests      Change learning interests\n  3things area           Clear today's learning area\n  3things history        Show recently learned topics\n  3things again          Replay the latest saved lesson\n  3things status         Show local 3Things state\n  3things clear-session  Clear active learning-session marker\n  3things                Learn from the latest captured Codex task\n  3things on|off         Temporarily enable or disable automatic launch\n\nTrigger modes:\n  every   Launch for every Codex prompt\n  smart   Launch only when the task has useful learning value\n  manual  Never auto-launch; run 3things yourself\n`);
}

async function configureInterests(config) {
  const currentCustom = config.interests.filter((x) => !DEFAULT_INTERESTS.includes(x));
  const selected = await chooseMany(
    'What do you want to learn?',
    DEFAULT_INTERESTS.map((x) => ({ label: x, value: x })),
    config.interests.filter((x) => DEFAULT_INTERESTS.includes(x))
  );
  const customDefault = currentCustom.join(', ');
  const custom = await inputText('Custom interests, comma-separated (optional)', customDefault);
  const customItems = custom.split(',').map((x) => x.trim()).filter(Boolean);
  config.interests = [...new Set([...selected, ...customItems])];
  return config;
}

async function configure(config) {
  config.trigger = await chooseOne('How often should 3Things teach you?', [
    { label: 'Smart — only when there is something useful to learn', value: 'smart' },
    { label: 'Every task — teach aggressively', value: 'every' },
    { label: 'Manual — only when I run 3things', value: 'manual' }
  ]);
  config.learningTerminalMode = await chooseOne('Where should lessons appear?', [
    { label: 'New terminal — open a separate lesson each time', value: 'new' },
    { label: 'Same lesson terminal — queue new lessons until I finish', value: 'single' }
  ]);
  config.suggestOutsideInterests = await confirm('Suggest useful areas outside my interests?', config.suggestOutsideInterests);
  return config;
}

function printReady(config) {
  console.log('\n3Things is ready.');
  console.log(`Mode: ${config.trigger}`);
  console.log(`Terminal: ${config.learningTerminalMode}`);
  console.log(`Interests: ${config.interests.join(', ') || 'none'}`);
  console.log('\nUse Codex normally. When a task has learning value, 3Things opens a short lesson.');
}

async function init() {
  heading('3Things setup');
  if (!codexAvailable()) {
    throw new Error('Codex CLI was not found. Install/login to Codex first, then rerun `3things init`.');
  }
  let config = loadConfig();
  config = await configure(config);
  config = await configureInterests(config);
  saveConfig(config);

  const command = buildHookCommand(process.execPath, cliPath);
  const result = installHook(command);

  console.log(`\n✓ Config saved`);
  console.log(`${result.added ? '✓' : '•'} Codex UserPromptSubmit hook ${result.added ? 'installed' : 'already installed'}`);
  console.log(`• ${result.path}`);
  printReady(config);
}

async function configCommand() {
  heading('3Things config');
  let config = loadConfig();
  config = await configure(config);
  saveConfig(config);
  console.log(`\n✓ Saved. Trigger: ${config.trigger}. Terminal mode: ${config.learningTerminalMode}.`);
}

async function resetCommand() {
  heading('3Things reset');
  let config = resetConfig();
  console.log('Config reset to defaults. Re-running setup questions.');
  config = await configure(config);
  config = await configureInterests(config);
  saveConfig(config);
  console.log(`\n✓ Saved. Trigger: ${config.trigger}. Terminal mode: ${config.learningTerminalMode}.`);
}

function signoffCommand() {
  signOff();
  console.log('Removed local 3Things state from ~/.3things.');
  console.log('Run `3things init` when you want to start again.');
}

async function interestsCommand() {
  heading('3Things interests');
  let config = loadConfig();
  config = await configureInterests(config);
  saveConfig(config);
  console.log(`\n✓ Saved: ${config.interests.join(', ') || 'none'}`);
}

async function hookCommand() {
  if (process.env.THREETHINGS_CHILD === '1') return;

  const raw = await new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
  if (!raw.trim()) return;

  let event;
  try { event = JSON.parse(raw); } catch { return; }
  if (event.hook_event_name !== 'UserPromptSubmit' || !event.prompt?.trim()) return;

  const config = loadConfig();
  const eventFile = saveTask(event);
  if (!config.enabled || config.trigger === 'manual') return;

  if (config.trigger === 'smart') {
    try {
      const decision = runCodexJson(smartPrompt(event), {
        cwd: event.cwd || process.cwd(),
        model: config.model,
        schema: smartSchema
      });
      markSmartDecision({ eventFile, launch: decision.launch, reason: decision.reason });
      if (!decision.launch) return;
    } catch {
      markSmartDecision({ eventFile, launch: false, reason: 'smart check failed' });
      // Smart mode should fail quiet rather than disturb the coding task.
      return;
    }
  }

  if (config.learningTerminalMode === 'single') {
    if (hasActiveLearningSession()) {
      markPendingTask(eventFile);
      return;
    }
    markLearningSession({ pid: null, eventFile });
  }

  if (!openLearningTerminal(eventFile) && config.learningTerminalMode === 'single') {
    clearLearningSession();
  }
}

function recentTopicTitles() {
  return readHistory(80).map((x) => x.topic).filter(Boolean);
}

function preview(text, length = 82) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= length) return clean;
  return `${clean.slice(0, Math.max(1, length - 1))}…`;
}

async function chooseLearningArea(task, config, { changeArea = false } = {}) {
  const dailyArea = changeArea ? null : getFreshDailyArea(config);
  if (dailyArea) {
    note(`Area: ${dailyArea}`);
    muted("Reused from today's choice. Run `3things area` to change it.");
    return dailyArea;
  }

  const areas = (await withSpinner('Finding useful learning directions', () => runCodexJsonAsync(areasPrompt(task, config), {
    cwd: task.cwd,
    model: config.model,
    schema: areasSchema
  }))).options;

  const area = await chooseOne('\nWhat do you want to learn today?', areas.map((item) => ({
    value: item.name,
    label: `${item.source === 'suggested' ? '★ ' : ''}${item.name} — ${item.reason}`
  })));

  setDailyArea(config, area);
  saveConfig(config);
  return area;
}

async function runLesson(eventFile, config, { changeArea = false } = {}) {
  const task = loadTask(eventFile || undefined);
  if (!task) {
    console.log('No Codex task captured yet. Run Codex once, or use `3things init` first.');
    return false;
  }

  const area = await chooseLearningArea(task, config, { changeArea });
  muted(`Task: ${preview(task.prompt)}`);

  const topics = (await withSpinner(`Finding 3 things in ${area}`, () => runCodexJsonAsync(topicsPrompt(task, area, recentTopicTitles()), {
    cwd: task.cwd,
    model: config.model,
    schema: topicsSchema
  }))).topics;

  const chosen = await chooseOne('\nPick what you want to understand:', [
    ...topics.map((topic, index) => ({
      value: [index],
      label: `${index + 1}. ${topic.title}\n   ${topic.why}`
    })),
    { value: [0, 1, 2], label: 'All 3' }
  ]);

  const selectedTopics = chosen.map((i) => topics[i]);
  console.log('');
  const lesson = await withSpinner('Building your lesson', () => runCodexAsync(lessonPrompt(task, area, selectedTopics), {
    cwd: task.cwd,
    model: config.model
  }));
  console.log('');
  const rendered = renderLesson(lesson, { area, topics: selectedTopics });
  clearScreen();
  await revealText(`${rendered.text}\n`);
  await focusLessonView(rendered.lessons);

  if (config.rememberLearnedTopics) {
    for (const topic of selectedTopics) {
      appendHistory({
        learnedAt: new Date().toISOString(),
        area,
        topic: topic.title,
        task: task.prompt.slice(0, 500),
        cwd: task.cwd,
        lesson: rendered.text
      });
    }
  }

  console.log('\n✓ Saved to 3Things history.');
  return true;
}

async function choosePendingTask(currentEventFile) {
  const pending = readPendingTask({ currentEventFile });
  if (!pending) return { action: 'none' };
  const task = loadTask(pending.eventFile);
  const label = task?.prompt ? `Start this lesson\n   ${preview(task.prompt, 64)}` : 'Start this lesson';

  const choice = await chooseOne('\nNew task is ready:', [
    { value: 'start', label },
    { value: 'not-now', label: 'Skip it' }
  ]);

  clearPendingTask();
  if (choice !== 'start') return { action: 'skip' };
  return { action: 'start', eventFile: pending.eventFile };
}

async function learnCommand(eventFile = null, { changeArea = false } = {}) {
  const config = loadConfig();
  let currentEventFile = eventFile;
  markLearningSession({ eventFile: currentEventFile || null });
  clearScreen();
  heading('3Things');
  try {
    if (config.learningTerminalMode === 'single') {
      note('Single-terminal mode is on. New eligible tasks will wait here until you finish.');
      muted('Want a new terminal every time? Run `3things config` and change terminal mode.');
      console.log('');
    }

    while (true) {
      markLearningSession({ eventFile: currentEventFile || null });
      const completed = await runLesson(currentEventFile, config, { changeArea });
      if (!completed) return;

      const pendingChoice = config.learningTerminalMode === 'single'
        ? await choosePendingTask(currentEventFile)
        : null;
      if (pendingChoice?.action === 'none') {
        muted('No pending lessons.');
      }
      if (pendingChoice?.action !== 'start') return;

      currentEventFile = pendingChoice.eventFile;
      changeArea = false;
      clearScreen();
      heading('3Things');
    }
  } finally {
    clearLearningSession();
  }
}

function historyCommand() {
  heading('3Things history');
  const items = readHistory(20).reverse();
  if (!items.length) {
    console.log('Nothing learned yet.');
    return;
  }
  items.forEach((item) => {
    const date = String(item.learnedAt || '').slice(0, 10);
    console.log(`${date}  ${item.area || 'General'}  →  ${item.topic}`);
  });
}

async function againCommand() {
  const latest = readHistory(1)[0];
  if (!latest) {
    console.log('Nothing learned yet.');
    return;
  }
  if (!latest.lesson) {
    console.log('No saved lesson text for the latest history item.');
    return;
  }

  clearScreen();
  await revealText(`${latest.lesson}\n`);
}

function toggle(enabled) {
  const config = loadConfig();
  config.enabled = enabled;
  saveConfig(config);
  console.log(`3Things automatic launch is ${enabled ? 'on' : 'off'}.`);
}

function areaCommand() {
  const config = loadConfig();
  clearDailyArea(config);
  saveConfig(config);
  console.log("Cleared today's learning area. Next `3things` run will ask what you want to learn.");
}

function formatStatus(value) {
  return value ? 'yes' : 'no';
}

function statusCommand() {
  const config = loadConfig();
  const latestTask = loadTask();
  const pending = readPendingTask();
  const pendingTask = pending ? loadTask(pending.eventFile) : null;
  const session = readLearningSession();
  const decision = readSmartDecision();
  const area = getFreshDailyArea(config);

  heading('3Things status');
  console.log(`enabled: ${formatStatus(config.enabled)}`);
  console.log(`trigger: ${config.trigger}`);
  console.log(`terminal mode: ${config.learningTerminalMode}`);
  console.log(`daily area: ${area || 'none'}`);
  console.log(`active session: ${formatStatus(session?.active)}${session?.pid ? ` (pid ${session.pid})` : ''}`);
  console.log(`pending task: ${pendingTask ? preview(pendingTask.prompt) : 'none'}`);
  console.log(`latest task: ${latestTask ? `${String(latestTask.capturedAt || '').replace('T', ' ').slice(0, 16)} — ${preview(latestTask.prompt, 62)}` : 'none'}`);
  console.log(`last smart decision: ${decision ? `${decision.launch ? 'launch' : 'skip'}${decision.reason ? ` — ${decision.reason}` : ''}` : 'none'}`);
}

function clearSessionCommand() {
  clearLearningSession();
  console.log('Cleared active 3Things learning-session marker.');
}

export async function main(args) {
  const [command] = args;
  if (!command) return learnCommand();
  if (command === 'init') return init();
  if (command === 'config') return configCommand();
  if (command === 'reset') return resetCommand();
  if (command === 'signoff') return signoffCommand();
  if (command === 'interests') return interestsCommand();
  if (command === 'area') return areaCommand();
  if (command === 'history') return historyCommand();
  if (command === 'again') return againCommand();
  if (command === 'status') return statusCommand();
  if (command === 'clear-session') return clearSessionCommand();
  if (command === 'hook') return hookCommand();
  if (command === 'learn') return learnCommand(argValue(args, '--event'), { changeArea: args.includes('--change-area') });
  if (command === 'on') return toggle(true);
  if (command === 'off') return toggle(false);
  if (command === 'help' || command === '--help' || command === '-h') return printHelp();
  printHelp();
  process.exitCode = 1;
}
