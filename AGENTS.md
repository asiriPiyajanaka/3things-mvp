# 3Things — Agent Instructions

## Product invariant

3Things teaches exactly three concepts from a real coding task. Do not add a configurable `thingsPerTask` setting.

## MVP philosophy

Keep the project tiny.

- Prefer Node built-ins.
- Keep runtime dependencies at zero unless a dependency clearly removes more complexity than it adds.
- Do not add a server, database, MCP layer, vector store, telemetry backend, web UI, or agent framework without an explicit product decision.
- 3Things must never modify the user's project code.
- Internal Codex calls stay read-only and ephemeral.
- Preserve `THREETHINGS_CHILD=1` recursion protection for every internal Codex invocation.

## UX contract

The normal developer workflow remains `codex`. 3Things is a companion, not a Codex replacement or wrapper.

Learning flow:

1. choose a learning area
2. receive exactly three relevant concepts
3. choose one or all three
4. receive compact knowledge

Trigger modes are `smart`, `every`, and `manual`.

Configured interests guide suggestions but do not have to constrain them when `suggestOutsideInterests` is enabled.

## Before changing hook integration

Verify the current official Codex hook and `codex exec` documentation. Hook interfaces may evolve.

## Quality gate

Run:

```bash
npm test
npm run check
```
