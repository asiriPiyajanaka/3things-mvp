import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonPrompt, topicsPrompt } from '../src/prompts.js';

test('topicsPrompt asks for transferable concepts instead of implementation steps', () => {
  const prompt = topicsPrompt(
    { prompt: 'Store a learning area for 24 hours and skip the prompt next time.' },
    'Frontend',
    ['Cognitive Load']
  );

  assert.match(prompt, /Do NOT teach the implementation plan/);
  assert.match(prompt, /Use the task only as a clue/);
  assert.match(prompt, /strong engineering hooks/);
  assert.match(prompt, /Simple, direct, real-world, exciting, and logical/);
  assert.match(prompt, /senior engineer explaining a useful debugging or design insight/);
  assert.match(prompt, /Do not sound like an essay/);
  assert.match(prompt, /Silence has failure modes/);
  assert.match(prompt, /When nothing happens, show why/);
  assert.match(prompt, /Waiting changes user trust/);
  assert.match(prompt, /attractive title is a promise/);
  assert.match(prompt, /Distance from the task/);
  assert.match(prompt, /task name, PR title, or implementation label/);
  assert.match(prompt, /deeper principle behind the task/);
  assert.match(prompt, /I knew parts of this, but this frames it better/);
  assert.match(prompt, /non-obvious to a working developer/);
  assert.match(prompt, /transferable to future projects/);
  assert.match(prompt, /not a restatement of the current task/);
  assert.match(prompt, /Prompt Cooldown State/);
  assert.match(prompt, /Terminal Reflow Stability/);
  assert.match(prompt, /plain language hook/);
  assert.match(prompt, /title: 3-6 words/);
  assert.match(prompt, /why: <= 9 words/);
  assert.match(prompt, /no filler like "Learn how" or "Understand"/);
  assert.match(prompt, /Cognitive Load/);
});

test('lessonPrompt fulfills the selected hook promise', () => {
  const prompt = lessonPrompt(
    { prompt: 'Improve lesson topic quality.' },
    'Architecture',
    [{ title: 'Why abstractions start lying', why: 'Learn when clean layers hide the real system behavior.' }]
  );

  assert.match(prompt, /promised payoff/);
  assert.match(prompt, /fulfill the exact promise/);
  assert.match(prompt, /Do not switch to a different technical topic/);
  assert.match(prompt, /Start from the hook/);
  assert.match(prompt, /experienced engineers/);
  assert.match(prompt, /simple, direct, real-world language/);
  assert.match(prompt, /useful facts, not fancy wording/);
  assert.match(prompt, /senior engineer explaining a practical debugging or design insight/);
  assert.match(prompt, /Do not write like an essay/);
  assert.match(prompt, /Silence is not success; it is an unobserved state/);
  assert.match(prompt, /deeper engineering concept/);
  assert.match(prompt, /at least 2 concrete facts, mechanisms, or named tradeoffs/);
  assert.match(prompt, /one real example an engineer recognizes/);
  assert.match(prompt, /Prefer mechanisms over advice/);
  assert.match(prompt, /what happens, why it happens, what to check/);
  assert.match(prompt, /Do not open with poetic contrast/);
  assert.match(prompt, /hooks, processes, stdout/);
  assert.match(prompt, /why smart engineers make it/);
  assert.match(prompt, /Keep "In this task" to one sentence/);
  assert.match(prompt, /already knows the requested feature/);
});
