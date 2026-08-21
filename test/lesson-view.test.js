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
  assert.equal(lessons[0].sections['Mental model'], 'A repository boundary says what this codebase owns.');
  assert.match(lessons[0].sections['How it works'], /src\/ contains product logic/);
  assert.equal(lessons[1].sections.Remember, 'Observe the task, do not become the task.');
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
