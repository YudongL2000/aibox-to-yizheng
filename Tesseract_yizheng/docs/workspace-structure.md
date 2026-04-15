# Workspace Structure

## Root

- `backend/`: TypeScript agent server, MCP services, workflow/config/runtime logic
- `frontend/`: Flutter client and Flutter Web workspace UI
- `aily-blockly/`: Angular + Electron desktop shell, dialogue UI, project/workflow tooling
- `n8n/n8n-master/`: forked n8n monorepo
- `docs/`: root governance docs, loading docs, and shared references
- `specs/`: feature-by-feature specs, checklists, and contracts
- `scripts/`: root-level guard and maintenance scripts
- `test/`: ad hoc root-level test utilities

## Cross-Module Flow

- `backend` provides agent/config/workflow services and hardware/runtime bridges
- `frontend` and `aily-blockly` are the two main user-facing shells consuming backend capabilities
- `aily-blockly` also embeds workflow and n8n-related desktop flows
- `n8n/n8n-master` is maintained as a nested fork and should be treated as its own sub-repo

## Working Rules

- Root-level work should stay focused on orchestration, docs, shared scripts, and specs
- Module-specific implementation should happen inside the target sub-repo, not at root
- Any cross-module change must update the affected module folder contracts and root loading docs
