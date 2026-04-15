---
name: memory-bootstrap
description: Initialize an OpenClaw-style long-term project memory system. Use when a user wants a one-time scaffold for MEMORY.md, daily notes, stable knowledge bank, entities pages, and operating rules for long-horizon development context in a new or existing project.
---

# Memory Bootstrap

Use this skill when the user wants to add a reusable long-term memory layer to a project before a long refactor, multi-session collaboration period, or ongoing agent-assisted development effort.

## What to create

Create or update a `docs/memory/` structure with:

- `MEMORY.md`
- `OPERATING_RULES.md`
- `daily/`
- `bank/`
- `bank/entities/`
- matching `CLAUDE.md` files for each new documentation module

Read [references/layout.md](references/layout.md) before writing file content.

## Workflow

1. Inspect whether `docs/` and nearby `CLAUDE.md` files already exist.
2. Create `docs/memory/` and its subdirectories only if missing.
3. Seed `MEMORY.md` with a compact cross-session core:
   - project identity
   - current long-term theme
   - stable constraints
   - read order
4. Seed `daily/` with:
   - `TEMPLATE.md`
   - today's `YYYY-MM-DD.md` if immediate use is needed
5. Seed `bank/` with:
   - `world.md`
   - `experience.md`
   - `opinions.md`
6. Create an entity page only for a clearly recurring project / product / person.
7. Update the nearest `CLAUDE.md` files and the docs index if the memory directory becomes a first-class docs module.

## Guardrails

- Do not store raw transcripts.
- Do not store secrets, tokens, or passwords.
- Put all new information into `daily/` first.
- Promote only stable, repeated, high-value items into `bank/`.
- Keep `MEMORY.md` short; rewrite it instead of endlessly appending.

## Validation

After initialization, verify:

- the directory tree exists
- each new module has a `CLAUDE.md`
- `MEMORY.md` stays short
- `daily/TEMPLATE.md` ends with `## Retain`
- `OPERATING_RULES.md` explains load order and promotion rules
