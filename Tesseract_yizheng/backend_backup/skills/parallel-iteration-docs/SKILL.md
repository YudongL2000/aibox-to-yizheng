---
name: parallel-iteration-docs
description: Create or refactor a multi-agent parallel development asset pack for an iteration. Use when a user wants branch matrices, runbooks, tmux/worktree launchers, and integration templates organized as a reusable execution package with design docs kept separate in docs/decisions and execution assets grouped under docs/iterations/<iter-id>.
---

# Parallel Iteration Docs

Use this skill when the user wants to scaffold or clean up a parallel development execution pack for a refactor, migration, or multi-worktree implementation effort.

Read [references/asset-pack.md](references/asset-pack.md) before writing files.

## Workflow

1. Inspect the current iteration docs, launcher script locations, and related `CLAUDE.md` files.
2. Keep architecture truth in `docs/decisions/<topic>/`.
3. Put the execution asset pack in `docs/iterations/<iter-id>/`.
4. Ensure the iteration module owns all iteration-local assets:
   - `ITER_<ID>_PARALLEL.md`
   - `run-<iter-id>.md`
   - `<iter-id>_parallel_tmux.sh`
   - `ITER_<ID>_INTEGRATION_OUTPUT.md`
5. Update `CLAUDE.md` files so member lists only describe local files or subdirectories.
6. Update top-level docs indexes if the new iteration module becomes a first-class entry.

## Guardrails

- Do not mix design docs and execution assets in one member list.
- Do not keep iteration-specific launchers in `docs/scripts/`; reserve that directory for cross-iteration shared scripts.
- Keep branch matrix, pane order, merge order, and integration output contract identical across all iteration assets.

## Validation

After changes, verify:

- `docs/decisions/<topic>/CLAUDE.md` no longer cross-lists iteration-local files
- `docs/iterations/<iter-id>/` contains the full execution pack
- the launcher script passes `bash -n`
- `docs/README.md` and `docs/CLAUDE.md` point to the new iteration location
