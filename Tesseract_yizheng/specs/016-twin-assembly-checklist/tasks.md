# Tasks: 016-twin-assembly-checklist

## Phase 1: Flutter — AssemblyChecklistPanel Widget

### US1: 数字孪生窗口展示组装清单

- [x] **T1** `[create]` `frontend/lib/module/home/widget/assembly_checklist_panel.dart`
  - Data models: `AssemblyRequirement`, `DetectedHardwareComponent`
  - Alias matching: `_expandAliases()`, `matchesRequirement()`
  - `AssemblyChecklistPanel` StatefulWidget with dark theme, 280px width
  - 1-second delayed `onAllComplete` callback with cancellation on disconnect

- [x] **T2** `[modify]` `frontend/lib/module/home/home_workspace_page.dart`
  - Add state fields: `_assemblyRequirements`, `_assemblyDetectedComponents`, `_assemblySessionId`, `_assemblyNodeName`
  - Handle `tesseract-assembly-requirements` in `_handleParentWindowMessage`
  - Handle `tesseract-assembly-hardware-state` in `_handleParentWindowMessage`
  - Add `_onAssemblyComplete()` to send `tesseract-assembly-complete` postMessage
  - Modify build: show `AssemblyChecklistPanel` on right side when requirements present

## Phase 2: aily-blockly — PostMessage Relay

### US2: 心跳驱动组件检测状态实时更新

- [x] **T3** `[modify]` `aily-blockly/src/app/windows/iframe/iframe.component.ts`
  - Import `DialogueHardwareBridgeService`
  - Inject into constructor
  - Add assembly bridge subscription field + cleanup
  - On child `tesseract-digital-twin-ready` when `mode === 'hardware-assembly'`: send `tesseract-assembly-requirements`
  - Subscribe to `state$` and forward `tesseract-assembly-hardware-state`
  - Listen for `tesseract-assembly-complete` from child and dispatch CustomEvent

### US3: 全部组件就绪后自动通知闭环

- [x] **T4** `[modify]` `aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts`
  - Remove `assemblyMonitorSubscription` subscribe in `startHardwareAssembly()`
  - Remove `checkAssemblyCompletion()` method
  - Add handler for `tesseract-assembly-completed-from-twin` action in `runTesseractAction()`

## Phase 3: Documentation

- [x] **T5** `[create]` `specs/016-twin-assembly-checklist/AGENTS.md`
- [x] **T6** `[modify]` `specs/AGENTS.md` — add 016 entry

## Dependencies

```
T1 → T2 → T3 → T4 → T5/T6
```

T1 creates the widget, T2 wires it into the page, T3 provides the data relay, T4 removes the old monitoring and adds the new completion handler.

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
