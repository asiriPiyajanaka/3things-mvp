import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  appendHistory,
  clearLearningSession,
  clearPendingTask,
  getFreshDailyArea,
  hasActiveLearningSession,
  loadConfig,
  loadTask,
  markLearningSession,
  markPendingTask,
  markSmartDecision,
  readHistory,
  readPendingTask,
  saveConfig,
  saveTask,
  setDailyArea
} from './store.js';
import { chooseOne, clearScreen, heading, muted, note, revealText, withSpinner } from './ui.js';
import { runCodexAsync, runCodexJson, runCodexJsonAsync } from './codex.js';
import { areasPrompt, lessonPrompt, smartPrompt, topicsPrompt } from './prompts.js';
import { openLearningTerminal } from './terminal.js';
import { focusLessonView, renderLesson } from './lesson-view.js';
import { preview, taskLabel } from './task-event.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const smartSchema = path.join(here, 'schemas', 'smart.schema.json');
const areasSchema = path.join(here, 'schemas', 'areas.schema.json');
const topicsSchema = path.join(here, 'schemas', 'topics.schema.json');

export async function handleCapturedTask(event) {
  const eventFile = saveTask(event);
  const config = loadConfig();
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
    console.log('No task captured yet. Capture a task first, or use `3things init` for Codex integration.');
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
  const label = task?.prompt ? `Start this lesson\n   ${taskLabel(task, 64)}` : 'Start this lesson';

  const choice = await chooseOne('\nNew task is ready:', [
    { value: 'start', label },
    { value: 'not-now', label: 'Skip it' }
  ]);

  clearPendingTask();
  if (choice !== 'start') return { action: 'skip' };
  return { action: 'start', eventFile: pending.eventFile };
}

export async function learnCommand(eventFile = null, { changeArea = false } = {}) {
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
