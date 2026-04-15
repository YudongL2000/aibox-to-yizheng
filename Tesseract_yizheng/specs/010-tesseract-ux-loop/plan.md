# Implementation Plan: Tesseract Client UX Loop

**Branch**: `010-tesseract-ux-loop` | **Date**: 2026-04-06 | **Spec**: `specs/010-tesseract-ux-loop/spec.md`
**Input**: Feature specification from `specs/010-tesseract-ux-loop/spec.md`

## Summary

Close the desktop client UX loop so users can discover runnable skills from live hardware state, confirm workflows once, see the workflow immediately in the embedded n8n workspace, finish hot-plug/config prompts inside chat, and use a stable Studio surface that no longer flickers or hides behind the digital twin window. The implementation spans backend dialogue-mode responses, aily-blockly chat/runtime/window management, and Flutter home workspace hardware/digital-twin presentation.

## Technical Context

**Language/Version**: TypeScript on Node.js for `backend` and `aily-blockly`; Dart/Flutter for `frontend`  
**Primary Dependencies**: Express/WebSocket agent server, Angular/Electron chat shell, local skill-library JSON storage, Flutter dialogue widgets, existing markdown/mermaid renderers, existing MQTT and digital twin bridges  
**Storage**: Local JSON files under `backend/data/skills/`, in-memory session/config state, existing workflow/project snapshot files, uploaded face images under `backend/data/uploads/`  
**Testing**: `npm run build` and targeted Vitest for `backend`; Angular unit/type-check coverage in `aily-blockly`; `flutter analyze` and targeted widget tests in `frontend`  
**Target Platform**: Windows desktop shell with Electron-hosted Studio and embedded Flutter workspace, plus backend agent service reachable over local HTTP/WebSocket  
**Project Type**: Multi-module desktop application with backend agent service, Angular/Electron shell, and Flutter client surfaces  
**Performance Goals**: Single-click workflow confirmation should surface the target workflow in the active workspace without extra user actions; redundant heartbeat traffic must not produce visible digital-twin flicker during a 30-second steady-state observation window  
**Constraints**: Preserve existing agent API envelope shape, reuse current markdown/mermaid/config renderers instead of introducing a second rendering stack, keep chat/workspace/digital-twin state aligned to one workflow source of truth, avoid breaking existing teaching-mode save-to-library behavior  
**Scale/Scope**: Changes touch three active modules, several dialogue phases (`summary_ready`, `workflow_ready`, `hot_plugging`, `config_input`, `config_complete`), skill-library persistence, and desktop window ordering behavior

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `.specify/memory/constitution.md` is still an unfilled template, so there are no enforceable constitution-specific gates.
- Repository-level guidance from `AGENTS.md`, `CLAUDE.md`, and module-specific instructions remains binding.
- Gate result before research: PASS, with the requirement that the design stay cross-module explicit, avoid unrelated refactors, and validate each affected module with its native tooling.
- Gate result after design: PASS. The design keeps the existing architecture, adds no new persistence tier, and reuses existing render/runtime bridges rather than inventing parallel flows.

## Project Structure

### Documentation (this feature)

```text
specs/010-tesseract-ux-loop/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── dialogue-rendering-contract.md
│   ├── skill-record-contract.md
│   └── workspace-sync-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── agent-server/
│   └── agents/
│       └── dialogue-mode/
├── data/
│   ├── skills/
│   └── uploads/
└── tests/

aily-blockly/
├── electron/
├── src/app/
│   ├── components/
│   ├── services/
│   ├── tools/
│   │   ├── aily-chat/
│   │   └── skill-center/
│   └── windows/
└── docs/

frontend/
├── lib/module/home/
│   ├── controller/
│   ├── home_workspace_page.dart
│   └── widget/
│       ├── dialogue_mode/
│       └── interaction_modules/
├── lib/server/
└── test/
```

**Structure Decision**: Keep the existing three-module split. Backend owns skill catalog and dialogue/config semantics, `aily-blockly` owns desktop chat rendering, workflow/workspace synchronization, and window ordering, while `frontend` owns the hardware entry placement and digital-twin update throttling in the Flutter workspace experience.

## Complexity Tracking

No constitution violations require justification.
