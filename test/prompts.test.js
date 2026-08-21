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
  assert.match(prompt, /non-obvious to a working developer/);
  assert.match(prompt, /transferable to future projects/);
  assert.match(prompt, /Reject shallow topics/);
  assert.match(prompt, /Prompt Cooldown State/);
  assert.match(prompt, /Cognitive Load/);
});

test('lessonPrompt teaches concepts beyond the exact requested feature', () => {
  const prompt = lessonPrompt(
    { prompt: 'Improve lesson topic quality.' },
    'Architecture',
    [{ title: 'Abstraction Gradient', why: 'Helps pick the right teaching level.' }]
  );

  assert.match(prompt, /Teach the transferable concept/);
  assert.match(prompt, /already knows the requested feature/);
});
