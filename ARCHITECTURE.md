# 3Things — MVP Architecture

## Runtime flow

```text
Developer
   │
   │ submits prompt
   ▼
Codex CLI
   │
   ├──────────────────────────────► normal Codex work continues
   │
   └─ UserPromptSubmit hook (async)
              │
              ▼
        `3things hook`
              │
              ├─ save latest task locally
              │
              ├─ manual ─────────► stop
              │
              ├─ every ──────────► launch terminal
              │
              └─ smart
                    │
                    ├─ child `codex exec --ephemeral`
                    │    THREETHINGS_CHILD=1
                    │
                    ├─ skip ─────► stop
                    └─ learn ─────► launch terminal
                                      │
                                      ▼
                                 `3things learn`
                                      │
                           ┌──────────┴───────────┐
                           │                      │
                    configured interests    task context
                           │                      │
                           └──────────┬───────────┘
                                      ▼
                              learning areas
                                      │
                                user selects
                                      │
                                      ▼
                             exactly 3 topics
                                      │
                              user picks 1/all
                                      │
                                      ▼
                                compact lesson
                                      │
                                      ▼
                                local history
```

## Why a Codex hook instead of a wrapper

A wrapper such as `3things codex` would require the developer to change habits and would need to proxy terminal behavior. `UserPromptSubmit` gives 3Things the prompt directly while the developer continues to use normal `codex`.

## Why a custom 3Things TUI instead of a second interactive Codex TUI

The product needs deterministic interaction:

1. choose learning area
2. see exactly three topics
3. choose one/all
4. read compact lesson

`codex exec` is used only as the reasoning engine. 3Things owns the terminal UX.

## Recursion protection

Every internal Codex call receives:

```text
THREETHINGS_CHILD=1
```

The installed hook exits immediately when this variable is set. This avoids:

```text
3Things → codex exec → UserPromptSubmit → 3Things → ...
```

## Safety boundary

Internal learning calls use:

```text
codex exec --ephemeral --sandbox read-only
```

The learning model may inspect the repository for context but should not write to it.

## Data model

### config.json

```json
{
  "enabled": true,
  "trigger": "smart",
  "interests": ["Frontend", "Backend", "Architecture", "DevOps", "Testing"],
  "suggestOutsideInterests": true,
  "rememberLearnedTopics": true,
  "model": null
}
```

### history.jsonl

One line per learned topic:

```json
{"learnedAt":"...","area":"Backend","topic":"Payment idempotency","task":"...","cwd":"..."}
```

## AI calls

### every mode

1. learning-area generation
2. exactly-three-topic generation
3. lesson generation

### smart mode

Same as above plus one very small relevance-classification call before opening the learning terminal.

A later optimization can collapse area/topic discovery into one call if latency or usage becomes important.
