import test from 'node:test';
import assert from 'node:assert/strict';
import { areasPrompt, lessonPrompt, smartPrompt, topicsPrompt } from '../src/prompts.js';

test('smartPrompt classifies concrete examples inside meta tasks', () => {
  const prompt = smartPrompt({
    prompt: 'Can 3Things teach from examples like moving a button while learning Security?'
  });

  assert.match(prompt, /First identify the teaching target/);
  assert.match(prompt, /concrete coding example/);
  assert.match(prompt, /classify using the example surface/);
  assert.match(prompt, /if a useful concept can be taught from the code surface, launch/);
});

test('areasPrompt chooses lenses for the real coding surface', () => {
  const prompt = areasPrompt(
    { prompt: 'Example: move a checkout button to the bottom of the form.' },
    { interests: ['Security', 'Architecture'], suggestOutsideInterests: true }
  );

  assert.match(prompt, /real coding surface/);
  assert.match(prompt, /Extract the concrete thing/);
  assert.match(prompt, /use that example as the teaching target/);
  assert.match(prompt, /Do not recommend a learning area just because/);
  assert.match(prompt, /Only choose Architecture/);
  assert.match(prompt, /reason: maximum 8 words, naming the concrete surface/);
});

test('topicsPrompt asks for transferable concepts instead of implementation steps', () => {
  const prompt = topicsPrompt(
    { prompt: 'Store a learning area for 24 hours and skip the prompt next time.' },
    'Frontend',
    ['Cognitive Load']
  );

  assert.match(prompt, /Do NOT teach the implementation plan/);
  assert.match(prompt, /Use the task and the repository context as evidence/);
  assert.match(prompt, /Step 1: find the teaching target/);
  assert.match(prompt, /Step 2: use Frontend as a lens/);
  assert.match(prompt, /learning area is a lens/);
  assert.match(prompt, /concrete surface/);
  assert.match(prompt, /strong engineering hooks/);
  assert.match(prompt, /Curiosity bar/);
  assert.match(prompt, /wait, why/);
  assert.match(prompt, /If the option would fit almost any coding task, reject it/);
  assert.match(prompt, /If the title explains how recommendations should work, reject it/);
  assert.match(prompt, /Simple, direct, real-world, exciting, and logical/);
  assert.match(prompt, /senior engineer explaining a useful debugging or design insight/);
  assert.match(prompt, /Do not sound like an essay/);
  assert.match(prompt, /Silence has failure modes/);
  assert.match(prompt, /Disabled is not authorization/);
  assert.match(prompt, /Hidden buttons still exist/);
  assert.match(prompt, /Forms submit without clicks/);
  assert.match(prompt, /When PATH becomes an attack surface/);
  assert.match(prompt, /Tiny prompts lose useful evidence/);
  assert.match(prompt, /When nothing happens, show why/);
  assert.match(prompt, /Waiting changes user trust/);
  assert.match(prompt, /attractive title is a promise/);
  assert.match(prompt, /Closeness to the task/);
  assert.match(prompt, /task name, PR title, or implementation label/);
  assert.match(prompt, /deeper principle behind the task/);
  assert.match(prompt, /Keep one foot on the visible surface/);
  assert.match(prompt, /I knew parts of this, but this frames it better/);
  assert.match(prompt, /non-obvious to a working developer/);
  assert.match(prompt, /transferable to future projects/);
  assert.match(prompt, /not a restatement of the current task/);
  assert.match(prompt, /not about the 3Things product itself/);
  assert.match(prompt, /Constraints improve recommendations/);
  assert.match(prompt, /Prompt Cooldown State/);
  assert.match(prompt, /Terminal Reflow Stability/);
  assert.match(prompt, /plain language hook/);
  assert.match(prompt, /title: 3-6 words/);
  assert.match(prompt, /why: 8-14 words/);
  assert.match(prompt, /no filler like "Learn how" or "Understand"/);
  assert.match(prompt, /mechanism, risk, or payoff/);
  assert.match(prompt, /Cognitive Load/);
});

test('topicsPrompt treats concrete examples as the teaching target', () => {
  const prompt = topicsPrompt(
    {
      prompt: 'Can we make 3Things do this? Example: move a button to the bottom of the page while today learning is Security.'
    },
    'Security',
    []
  );

  assert.match(prompt, /move button to bottom \+ Security/);
  assert.match(prompt, /button\/form\/security surface/);
  assert.match(prompt, /not recommendation-system architecture/);
  assert.match(prompt, /Disabled is not authorization/);
  assert.match(prompt, /Hidden buttons still exist/);
  assert.match(prompt, /Client checks are promises/);
  assert.match(prompt, /Do not generate meta topics/);
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
  assert.match(prompt, /For EACH option use this structure/);
  assert.match(prompt, /## <short section title>/);
  assert.match(prompt, /Choose 3 to 5 short section titles/);
  assert.match(prompt, /Debugging flow/);
  assert.match(prompt, /Before \/ after/);
  assert.match(prompt, /section names and order should fit the topic/);
  assert.match(prompt, /hook payoff in the first 2 sentences/);
  assert.match(prompt, /Start from the hook/);
  assert.match(prompt, /experienced engineers/);
  assert.match(prompt, /simple, direct, real-world language/);
  assert.match(prompt, /useful facts, not fancy wording/);
  assert.match(prompt, /senior engineer explaining a practical debugging or design insight/);
  assert.match(prompt, /Do not write like an essay/);
  assert.match(prompt, /Silence is not success; it is an unobserved state/);
  assert.match(prompt, /inspect the relevant repository files/);
  assert.match(prompt, /Teaching target/);
  assert.match(prompt, /concrete code\/product surface/);
  assert.match(prompt, /concrete example inside a meta request/);
  assert.match(prompt, /Keep the lesson attached to that surface/);
  assert.match(prompt, /Do not teach recommendation-system architecture/);
  assert.match(prompt, /surprising nearby concept/);
  assert.match(prompt, /at least 3 concrete facts, mechanisms, or named tradeoffs/);
  assert.match(prompt, /what to look for in code/);
  assert.match(prompt, /real data from the task/);
  assert.match(prompt, /one real example an engineer recognizes/);
  assert.match(prompt, /For a button task/);
  assert.match(prompt, /Prefer mechanisms over advice/);
  assert.match(prompt, /what happens, why it happens, what to check/);
  assert.match(prompt, /cause-and-effect chain/);
  assert.match(prompt, /If a paragraph could apply to almost any task/);
  assert.match(prompt, /Do not open with poetic contrast/);
  assert.match(prompt, /hooks, processes, stdout/);
  assert.match(prompt, /one mistake to avoid/);
  assert.match(prompt, /Connect back to the current task in one short section/);
  assert.match(prompt, /already knows the requested feature/);
  assert.match(prompt, /roughly 450-650 words/);
  assert.match(prompt, /full lesson text/);
  assert.doesNotMatch(prompt, /Output only topic headings/);
});
