---
name: project-docs-bootstrap
description: Scaffold or normalize a standalone `docs/` tree for a software project using a lifecycle-based structure with short placeholders, README navigation, and profile-specific layouts (`minimal`, `opensource`, `saas`). Use when Codex needs to initialize project documentation, standardize a messy docs folder, merge `doc/` and `docs/` decisions, or create a reusable human-facing documentation layout before ongoing development and operations work.
---

# Project Docs Bootstrap

## Overview

Create a clear, human-facing `docs/` tree that follows project lifecycle order: what it is, how to start, how to use, how to change, and how to run it. Keep placeholders short and let real usage decide which pages deserve deeper content.

## Quick Start

1. Audit the repo for existing documentation roots such as `docs/`, `doc/`, `README.md`, deployment notes, and architecture files.
2. Choose a profile:
   - `minimal` for personal or small internal projects
   - `opensource` for public or community-facing projects
   - `saas` for commercial, operational, or long-lived product teams
   See [references/profiles.md](references/profiles.md).
3. Run the scaffold script:
   ```bash
   python3 scripts/scaffold_docs.py --root <project-root> --profile <profile> --dry-run
   python3 scripts/scaffold_docs.py --root <project-root> --profile <profile>
   ```
4. Fill only the pages the project actively needs now.
5. Keep `docs/README.md` as the index and avoid creating a second docs root.

## Workflow

### 1. Audit before writing

- Prefer one human-facing docs root: `docs/`.
- If the repo already has both `doc/` and `docs/`, decide which one will remain the source of truth before scaffolding.
- Treat agent-facing files such as `CLAUDE.md` separately; this skill is for human-facing documentation.

### 2. Scaffold deterministically

- Use `scripts/scaffold_docs.py` for repeatable directory creation.
- The script creates directories and placeholder files for the chosen profile.
- Existing files are skipped by default; use `--force` only when you explicitly want to overwrite placeholders.

### 3. Keep placeholders short

- Start each file with 3-5 lines that explain purpose and scope.
- Prefer navigable placeholders over premature completeness.
- Put deep policy, API, or architecture detail into the specific page that owns it instead of bloating `docs/README.md`.
  See [references/placeholders.md](references/placeholders.md).

### 4. Normalize existing documentation

- Migrate live guidance into `docs/` instead of leaving competing copies in random locations.
- If old material must stay for history, mark it clearly as archive or legacy instead of leaving it looking current.
- Update top-level project docs so people can discover `docs/README.md`.

### 5. Validate

- Confirm the generated tree matches the selected profile.
- Open `docs/README.md` and verify every linked file exists.
- Re-run the scaffold in `--dry-run` mode to confirm there are no surprise overwrites.

## Resources

- `scripts/scaffold_docs.py`: deterministic docs tree generator for `minimal`, `opensource`, and `saas`.
- `references/profiles.md`: profile selection guidance and target directory shapes.
- `references/placeholders.md`: placeholder-writing rules and file intent.
