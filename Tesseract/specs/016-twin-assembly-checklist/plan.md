# Implementation Plan: 016-twin-assembly-checklist

## Technical Context

- **Frontend (Flutter Web)**: Dart/Flutter, embedded in Electron via iframe, communicates with parent window via `postMessage` (JSON-serialized). Entry file: `home_workspace_page.dart`.
- **aily-blockly (Angular/Electron)**: TypeScript, iframe host for digital twin. Key files: `iframe.component.ts` (iframe bridge), `aily-chat.component.ts` (dialogue orchestrator).
- **Bridge Protocol**: `postMessage` with JSON payloads, type-discriminated messages. Existing types: `tesseract-digital-twin-scene`, `tesseract-digital-twin-ready`, `tesseract-digital-twin-consumed`.
- **Hardware Bridge**: `DialogueHardwareBridgeService.state$` (RxJS BehaviorSubject) emits `DialogueBridgeState` with `components: DialogueHardwareComponent[]`.
- **Alias Matching**: `collectDialogueHardwareTokens` + `expandDialogueHardwareAliases` in aily-chat handles token normalization and alias expansion.

## Architecture Decisions

### D1: Responsibility Migration — Detection Logic Moves to Flutter

The component completion check (`checkAssemblyCompletion`) moves from `aily-chat.component.ts` to the Flutter `AssemblyChecklistPanel`. Aily-blockly becomes a pure data forwarder:
- Forwards `components` requirements via postMessage after child iframe ready
- Subscribes to `DialogueHardwareBridgeService.state$` and relays state updates via postMessage
- Listens for `tesseract-assembly-complete` from Flutter to close window and continue dialogue

### D2: postMessage Relay via iframe.component.ts

The `iframe.component.ts` is the natural relay layer. It already handles digital twin scene messages. It will:
1. Detect `mode === 'hardware-assembly'` from `iframeData`
2. On child `tesseract-digital-twin-ready`, send `tesseract-assembly-requirements`
3. Subscribe to bridge state and forward `tesseract-assembly-hardware-state`
4. Listen for `tesseract-assembly-complete` and dispatch as CustomEvent

### D3: Flutter Panel as Right-Side Overlay

The `AssemblyChecklistPanel` appears conditionally when `_assemblyRequirements != null`, positioned as a fixed-width panel on the right side of the canvas stage. The canvas shrinks to accommodate it via a `Row` layout.

### D4: Delayed Completion with Cancellation

When all components are detected, Flutter waits 1 second before sending completion. If any component disconnects during the delay, the timer is cancelled. This prevents false positives from transient connections.

## File Structure

### New Files
- `frontend/lib/module/home/widget/assembly_checklist_panel.dart` — Checklist panel widget + data models + alias matching

### Modified Files
- `frontend/lib/module/home/home_workspace_page.dart` — Assembly state fields, message handler cases, panel rendering
- `aily-blockly/src/app/windows/iframe/iframe.component.ts` — Assembly relay: forward requirements, bridge state, listen for completion
- `aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts` — Remove self-monitoring, add completion action handler

### Documentation
- `specs/016-twin-assembly-checklist/AGENTS.md` — Feature spec documentation
- `specs/AGENTS.md` — Add 016 entry

## Message Protocol

### New Message Types

| Direction | Type | Payload |
|-----------|------|---------|
| aily-blockly → Flutter | `tesseract-assembly-requirements` | `{ sessionId, nodeName, components: [{ componentId, displayName }] }` |
| aily-blockly → Flutter | `tesseract-assembly-hardware-state` | `{ components: [{ componentId, deviceId, displayName, status }] }` |
| Flutter → aily-blockly | `tesseract-assembly-complete` | `{ sessionId, nodeName }` |

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
