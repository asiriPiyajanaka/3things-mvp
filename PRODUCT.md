# 3Things — MVP Product Spec

## One-line product

3Things turns everyday AI-assisted coding into continuous micro-learning by teaching exactly three relevant engineering concepts from the coding task a developer is already doing.

## Core rule

**Always three things.**

The user may learn one or all three, but discovery always returns exactly three concepts. This constraint is part of the product identity, not a configurable count.

## Primary workflow

1. Developer submits a normal task to a coding agent.
2. 3Things captures it through an integration such as the Codex `UserPromptSubmit` hook or `3things capture`.
3. Trigger policy decides whether to open:
   - `every`
   - `smart`
   - `manual`
4. A separate terminal opens without interrupting the main coding workflow.
5. 3Things proposes relevant learning areas, preferring configured interests and optionally suggesting outside areas.
6. User selects an area.
7. 3Things generates exactly three concepts tied to the real task.
8. User selects one or all three.
9. 3Things gives a compact, useful lesson.
10. Learned topic titles are recorded locally to reduce repetition.

## Non-goals for MVP

- No autonomous agent framework.
- No vector database.
- No cloud account or 3Things backend.
- No dashboard.
- No gamification/streak system.
- No spaced-repetition engine.
- No IDE extension.
- No MCP server.
- No custom LLM API key.
- No modification of the developer's code.

## Trigger modes

### smart — recommended

Uses a compact Codex classification call. Skip only genuinely trivial tasks. If a useful engineering concept is attached to the task, launch.

### every

Launch on every captured task. This is intentionally available for users who want aggressive learning, even from small changes.

### manual

Capture the latest task but never open a terminal automatically. Running `3things` starts learning from the latest task.

## Learning-area behavior

Configured interests are preferences, not a hard boundary.

Example configured interests:

- Frontend
- Backend
- Architecture
- DevOps

For a certificate-pinning task, 3Things may offer:

- Frontend
- Architecture
- ★ Security

`★` means the category was suggested outside the configured list.

## Lesson contract

Each selected concept uses 3 to 5 compact sections chosen for the topic. The lesson should still contain:

- the core idea
- concrete mechanism or fact
- a real engineering example
- one sentence connecting back to the current task
- one mistake to avoid
- one practical takeaway

The lesson should be compact enough to read during a real development session.
