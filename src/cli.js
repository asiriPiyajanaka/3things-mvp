import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  appendHistory,
  clearDailyArea,
  DEFAULT_INTERESTS,
  getFreshDailyArea,
  loadConfig,
  loadTask,
  readHistory,
  saveConfig,
  saveTask,
  setDailyArea
} from './store.js';
import { chooseMany, chooseOne, confirm, heading, inputText, note } from './ui.js';
import { codexAvailable, runCodex, runCodexJson } from './codex.js';
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
  console.log(`3Things — learn three things from the Codex tasks you already do.\n\nCommands:\n  3things init         Install Codex hook and configure 3Things\n  3things config       Change trigger behavior and preferences\n  3things interests    Change learning interests\n  3things area         Clear today's learning area\n  3things history      Show recently learned topics\n  3things              Learn from the latest captured Codex task\n  3things on|off       Temporarily enable or disable automatic launch\n\nTrigger modes:\n  every   Launch for every Codex prompt\n  smart   Launch only when the task has useful learning value\n  manual  Never auto-launch; run 3things yourself\n`);
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
  config.trigger = await chooseOne('When should 3Things launch?', [
    { label: 'Smart — only useful learning tasks (recommended)', value: 'smart' },
    { label: 'Every Codex task', value: 'every' },
    { label: 'Manual only', value: 'manual' }
  ]);
  config.suggestOutsideInterests = await confirm('Suggest useful areas outside my interests?', config.suggestOutsideInterests);
  return config;
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
  console.log(`\nUse Codex normally. 3Things will follow your trigger mode: ${config.trigger}.`);
}

async function configCommand() {
  heading('3Things config');
  let config = loadConfig();
  config = await configure(config);
  saveConfig(config);
  console.log(`\n✓ Saved. Trigger: ${config.trigger}`);
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
      if (!decision.launch) return;
    } catch {
      // Smart mode should fail quiet rather than disturb the coding task.
      return;
    }
  }

  openLearningTerminal(eventFile);
}

function recentTopicTitles() {
  return readHistory(30).map((x) => x.topic).filter(Boolean);
}

async function chooseLearningArea(task, config, { changeArea = false } = {}) {
  const dailyArea = changeArea ? null : getFreshDailyArea(config);
  if (dailyArea) {
    note(`You are learning ${dailyArea} today.`);
    console.log('Need to change? Run `3things area`, then run `3things` again.');
    return dailyArea;
  }

  note('Finding useful learning directions…');
  const areas = runCodexJson(areasPrompt(task, config), {
    cwd: task.cwd,
    model: config.model,
    schema: areasSchema
  }).options;

  const area = await chooseOne('\nWhat do you want to learn today?', areas.map((item) => ({
    value: item.name,
    label: `${item.source === 'suggested' ? '★ ' : ''}${item.name} — ${item.reason}`
  })));

  setDailyArea(config, area);
  saveConfig(config);
  return area;
}

async function learnCommand(eventFile = null, { changeArea = false } = {}) {
  const task = loadTask(eventFile || undefined);
  if (!task) {
    console.log('No Codex task captured yet. Run Codex once, or use `3things init` first.');
    return;
  }
  const config = loadConfig();
  heading('3Things');
  console.log(`From your task:\n${task.prompt.trim()}\n`);
  const area = await chooseLearningArea(task, config, { changeArea });

  note(`Finding 3 things in ${area}…`);
  const topics = runCodexJson(topicsPrompt(task, area, recentTopicTitles()), {
    cwd: task.cwd,
    model: config.model,
    schema: topicsSchema
  }).topics;

  const chosen = await chooseOne('\nPick your 3Things lesson:', [
    ...topics.map((topic, index) => ({
      value: [index],
      label: `${index + 1}. ${topic.title} — ${topic.why}`
    })),
    { value: [0, 1, 2], label: 'All 3' }
  ]);

  const selectedTopics = chosen.map((i) => topics[i]);
  console.log('\nLearning…\n');
  const lesson = runCodex(lessonPrompt(task, area, selectedTopics), {
    cwd: task.cwd,
    model: config.model
  });
  const rendered = renderLesson(lesson, { area, topics: selectedTopics });
  console.log(rendered.text);
  await focusLessonView(rendered.lessons);

  if (config.rememberLearnedTopics) {
    for (const topic of selectedTopics) {
      appendHistory({
        learnedAt: new Date().toISOString(),
        area,
        topic: topic.title,
        task: task.prompt.slice(0, 500),
        cwd: task.cwd
      });
    }
  }
  console.log('\n✓ Saved to 3Things history.');
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

export async function main(args) {
  const [command] = args;
  if (!command) return learnCommand();
  if (command === 'init') return init();
  if (command === 'config') return configCommand();
  if (command === 'interests') return interestsCommand();
  if (command === 'area') return areaCommand();
  if (command === 'history') return historyCommand();
  if (command === 'hook') return hookCommand();
  if (command === 'learn') return learnCommand(argValue(args, '--event'), { changeArea: args.includes('--change-area') });
  if (command === 'on') return toggle(true);
  if (command === 'off') return toggle(false);
  if (command === 'help' || command === '--help' || command === '-h') return printHelp();
  printHelp();
  process.exitCode = 1;
}
