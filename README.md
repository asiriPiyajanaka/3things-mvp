# 3Things

**Learn three things from the coding work you're already doing.**

3Things is a tiny companion CLI for coding agents. It captures real development tasks and, depending on your trigger setting, opens a separate terminal with a short learning side flow. Codex is the built-in integration today; other agents can call `3things capture`.

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

- Captures tasks through Codex's `UserPromptSubmit` hook or the generic `3things capture` command.
- Codex hook runs asynchronously so the main Codex turn is not intentionally blocked.
- Three trigger modes:
  - `smart` — only launch when the task has useful learning value.
  - `every` — launch for every captured task.
  - `manual` — never auto-launch; run `3things` yourself.
- User-configurable learning interests.
- Can suggest relevant learning areas outside the configured list.
- Always generates exactly three concepts.
- Pick one concept or all three.
- Compact lessons with dynamic sections chosen for the topic.
- Local history avoids repeatedly teaching the same concept.
- Child Codex calls use `THREETHINGS_CHILD=1` to prevent recursive hook launches.
- Child Codex calls use `codex exec --ephemeral --sandbox read-only`.
- No runtime npm dependencies.

## Requirements

- Node.js 20+
- Codex CLI installed and authenticated for lesson generation
- Codex hooks enabled only if you want automatic Codex capture

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

Other coding agents can capture tasks through stdin:

```bash
printf '%s' "Fix stale auth token refresh" | 3things capture --agent claude-code --cwd "$PWD"
```

Or with JSON:

```bash
printf '%s' '{"agent":"custom","prompt":"Fix stale auth token refresh","cwd":"/path/to/repo"}' | 3things capture
```

## Commands

```bash
3things init
3things capture
3things config
3things reset
3things signoff
3things interests
3things area
3things history
3things again
3things status
3things clear-session
3things
3things on
3things off
```

`3things` with no subcommand uses the latest captured task.

`3things capture` accepts a task from any coding agent. Pipe plain text or JSON, or pass `--prompt`, `--agent`, and `--cwd`.

`3things reset` resets local configuration to defaults and immediately reruns the setup questions.

`3things signoff` removes local 3Things state under `~/.3things`. Run `3things init` later to start again.

`3things again` replays the latest saved lesson.

`3things status` shows trigger mode, terminal mode, daily area, active session, pending task, latest task, and the last smart-mode decision.

`3things clear-session` clears a stale active learning-session marker.

After you choose a learning area, 3Things reuses it for 24 hours so new lesson terminals can go straight to the three concepts. To change it sooner:

```bash
3things area
3things
```

Terminal mode is configurable:

- `new` opens a new learning terminal for each launched lesson.
- `single` keeps one learning terminal active at a time. While a lesson is active, new eligible captured tasks are saved as pending. After you choose `Done`, 3Things asks whether to start the pending lesson in the same terminal.

## Local data

3Things stores its own small local state under:

```text
~/.3things/
  config.json
  latest-task.json
  learning-session.json
  pending-task.json
  smart-decision.json
  history.jsonl
  tasks/
```

The captured task prompt is stored locally because manual mode and the newly opened terminal need a reliable handoff. Do not use 3Things on prompts containing secrets you would not want persisted locally.

## Integrations

### Generic capture

Any coding agent or script can call:

```bash
3things capture --agent custom --cwd "$PWD" --prompt "Fix flaky payment webhook tests"
```

For JSON input, 3Things reads:

```json
{
  "agent": "custom",
  "prompt": "Fix flaky payment webhook tests",
  "cwd": "/path/to/repo",
  "sessionId": "optional",
  "turnId": "optional",
  "model": "optional"
}
```

### Codex hook installed by `3things init`

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
