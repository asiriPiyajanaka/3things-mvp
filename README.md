# 3Things

**Learn three things from the code you're already writing.**

3Things is a tiny companion CLI for Codex. You keep using `codex` normally. When you submit a coding task, a Codex `UserPromptSubmit` hook captures the task and—depending on your trigger setting—opens a separate terminal with a short learning side flow.

## What it feels like

```text
$ codex
> Add Stripe payment handling and webhook support

# Codex keeps working in the original terminal.

┌──────────────────┐
│     3Things      │
└──────────────────┘

What do you want to learn today?
❯ Backend — payment state belongs behind the client
  Architecture — model asynchronous payment state
★ Security — verify webhook authenticity

Pick your 3Things lesson:
❯ 1. Payment idempotency — prevent duplicate financial effects
  2. Webhook reconciliation — provider events become durable truth
  3. Payment state machines — model pending through settlement
  All 3
```

## MVP features

- Uses Codex's `UserPromptSubmit` hook; no Codex wrapper command.
- Hook runs asynchronously so the main Codex turn is not intentionally blocked.
- Three trigger modes:
  - `smart` — only launch when the task has useful learning value.
  - `every` — launch for every Codex prompt.
  - `manual` — never auto-launch; run `3things` yourself.
- User-configurable learning interests.
- Can suggest relevant learning areas outside the configured list.
- Always generates exactly three concepts.
- Pick one concept or all three.
- Compact lesson format: mental model, mechanics, task connection, common mistake, memory line.
- Local history avoids repeatedly teaching the same concept.
- Child Codex calls use `THREETHINGS_CHILD=1` to prevent recursive hook launches.
- Child Codex calls use `codex exec --ephemeral --sandbox read-only`.
- No runtime npm dependencies.

## Requirements

- Node.js 20+
- Codex CLI installed and authenticated
- Codex hooks enabled

## Try it from this folder

```bash
npm link
3things init
```

Then open a normal Codex session:

```bash
codex
```

Submit a task. With `smart` or `every` mode, 3Things can open a second terminal automatically.

## Commands

```bash
3things init
3things config
3things reset
3things signoff
3things interests
3things area
3things history
3things
3things on
3things off
```

`3things` with no subcommand uses the latest captured Codex task.

`3things reset` resets local configuration to defaults and immediately reruns the setup questions.

`3things signoff` removes local 3Things state under `~/.3things`. Run `3things init` later to start again.

After you choose a learning area, 3Things reuses it for 24 hours so new lesson terminals can go straight to the three concepts. To change it sooner:

```bash
3things area
3things
```

Terminal mode is configurable:

- `new` opens a new learning terminal for each launched lesson.
- `single` keeps one learning terminal active at a time. While a lesson is active, new Codex prompts are still captured, but another learning terminal is not opened. Complete the current lesson, then run `3things` in that terminal to learn from the latest captured task.

## Local data

3Things stores its own small local state under:

```text
~/.3things/
  config.json
  latest-task.json
  learning-session.json
  history.jsonl
  tasks/
```

The captured Codex prompt is stored locally because manual mode and the newly opened terminal need a reliable handoff. Do not use 3Things on prompts containing secrets you would not want persisted locally.

## Codex hook installed by `3things init`

3Things merges a `UserPromptSubmit` entry into `~/.codex/hooks.json` and preserves existing JSON hook configuration. The installed command points directly to the Node executable and the installed 3Things CLI file so it does not depend on shell PATH lookup.

Conceptually:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "<node> <3things-cli> hook",
            "async": true,
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

## Current MVP limitations

1. New-terminal launching is implemented for macOS Terminal, common Linux terminals, and a basic Windows PowerShell path. It needs real-machine validation across terminal apps.
2. `smart` mode uses one extra Codex call to classify whether the prompt is worth learning from.
3. Model selection is present internally as `model: null` in config but intentionally has no CLI UI yet.
4. Existing `hooks.json` is supported. If a user configures hooks only inline in `config.toml`, 3Things still adds `hooks.json`; Codex supports multiple hook sources, but a later version should offer a cleaner installer/uninstaller.
5. The MVP stores topic history by title only; semantic duplicate detection can come later if it proves necessary.

## Development

```bash
npm test
npm run check
```

See `PRODUCT.md` for product boundaries and `ARCHITECTURE.md` for the flow.
