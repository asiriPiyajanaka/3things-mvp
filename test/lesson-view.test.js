import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLesson, renderLesson } from '../src/lesson-view.js';

const markdown = `
# Repository Boundary
**Mental model** — A repository boundary says what this codebase owns.
**How it works** — Inside the repo:
- \`src/\` contains product logic.
- \`test/\` verifies behavior.
**In this task** — A project brief should separate the product from companion tooling.
**Common mistake** — Describing the repo as if it owns the developer's app.
**Remember** — Name the boundary before naming the parts.

# Read-Only Companion Architecture
**Mental model** — A companion observes without taking ownership.
**How it works** — Child Codex calls use read-only context.
**In this task** — The brief should say 3Things never modifies project code.
**Common mistake** — Treating read-only analysis as a workflow wrapper.
**Remember** — Observe the task, do not become the task.
`;

test('parseLesson extracts topics and canonical sections', () => {
  const lessons = parseLesson(markdown);

  assert.equal(lessons.length, 2);
  assert.equal(lessons[0].title, 'Repository Boundary');
  assert.equal(lessons[0].sections[0].name, 'Mental model');
  assert.equal(lessons[0].sections[0].text, 'A repository boundary says what this codebase owns.');
  assert.equal(lessons[0].sections[1].name, 'How it works');
  assert.match(lessons[0].sections[1].text, /src\/ contains product logic/);
  assert.equal(lessons[1].sections[4].name, 'Remember');
  assert.equal(lessons[1].sections[4].text, 'Observe the task, do not become the task.');
});

test('parseLesson extracts dynamic markdown sections', () => {
  const lessons = parseLesson(`
# Waiting Changes User Trust
## Why It Matters
Users need to know whether a tool is working or waiting.
## What Actually Happens
- stdout may still be open.
- a session file may block launch.
## What To Check
Look at the active pid and pending task marker.
`);

  assert.equal(lessons.length, 1);
  assert.equal(lessons[0].title, 'Waiting Changes User Trust');
  assert.deepEqual(lessons[0].sections.map((section) => section.name), [
    'Why It Matters',
    'What Actually Happens',
    'What To Check'
  ]);
  assert.match(lessons[0].sections[1].text, /stdout may still be open/);
});

test('renderLesson removes raw markdown and includes learning context', () => {
  const { text } = renderLesson(markdown, {
    area: 'Architecture',
    topics: [{ title: 'Repository Boundary' }, { title: 'Read-Only Companion Architecture' }],
    color: false,
    width: 72
  });

  assert.match(text, /3Things Lesson/);
  assert.match(text, /Step 4 of 4/);
  assert.match(text, /Area: Architecture/);
  assert.match(text, /1\. Repository Boundary/);
  assert.match(text, /2\. Read-Only Companion Architecture/);
  assert.match(text, /Mental Model/);
  assert.match(text, /Common Mistake/);
  assert.doesNotMatch(text, /\*\*/);
  assert.doesNotMatch(text, /```/);
});
