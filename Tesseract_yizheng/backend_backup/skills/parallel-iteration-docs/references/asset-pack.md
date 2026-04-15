# Parallel Iteration Asset Pack Contract

## Directory Split

Use two modules, not one mixed directory:

```text
docs/
├── decisions/
│   └── <topic>/
│       ├── CLAUDE.md
│       └── <design-doc>.md
└── iterations/
    └── <iter-id>/
        ├── CLAUDE.md
        ├── ITER_<ID>_PARALLEL.md
        ├── run-<iter-id>.md
        ├── <iter-id>_parallel_tmux.sh
        └── ITER_<ID>_INTEGRATION_OUTPUT.md
```

## Ownership Rules

- `docs/decisions/<topic>/` owns architecture truth.
- `docs/iterations/<iter-id>/` owns execution truth.
- `docs/scripts/` only keeps cross-iteration shared scripts.
- Do not list iteration-local scripts inside a `decisions/*/CLAUDE.md` member list.

## Required Outputs

### `ITER_<ID>_PARALLEL.md`

- branch matrix
- merge order
- commit checkpoints
- lane-local DoD
- integration gates

### `run-<iter-id>.md`

- startup command
- env vars
- pane order
- first prompts
- regression checklist

### `<iter-id>_parallel_tmux.sh`

- idempotent worktree creation
- tmux session bootstrap
- prompt injection
- `bash -n` friendly shell

### `ITER_<ID>_INTEGRATION_OUTPUT.md`

- merge record
- conflict resolution
- metrics
- regression result
- follow-up risks

## Anti-Smell Guardrails

- Do not split one iteration asset pack across `docs/decisions/` and `docs/scripts/`.
- Do not make `CLAUDE.md` cross-list sibling directories as if they were local members.
- Keep the design doc linked from the iteration pack, but do not duplicate execution assets back into the design module.

## Minimal Update Set

When creating or restructuring an iteration pack, update:

- `docs/CLAUDE.md`
- `docs/README.md`
- `docs/iterations/CLAUDE.md`
- `docs/iterations/<iter-id>/CLAUDE.md`
- `docs/decisions/<topic>/CLAUDE.md`
