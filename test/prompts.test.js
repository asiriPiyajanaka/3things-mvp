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
  assert.match(prompt, /strong video hooks/);
  assert.match(prompt, /attractive title is a promise/);
  assert.match(prompt, /non-obvious to a working developer/);
  assert.match(prompt, /transferable to future projects/);
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
  assert.match(prompt, /Teach the transferable concept/);
  assert.match(prompt, /already knows the requested feature/);
});
