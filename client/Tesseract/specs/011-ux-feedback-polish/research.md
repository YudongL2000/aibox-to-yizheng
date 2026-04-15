# Research: 011 UX Feedback Polish

## Decision 1: ReflectionEngine Clarification Loop Root Cause

**Decision**: The bug is NOT in `reflection-engine.ts` return logic (which correctly returns `missing_info: []` on `direct_accept`). The bug is in `orchestrator.ts` state management — `OrchestratorState.missingFields` is populated from a PREVIOUS turn's reflection result and not reset when the CURRENT turn returns `direct_accept`.

**Evidence**:  
- `reflection-engine.ts` lines 196-205: `missing_info: complete ? [] : assessment.missingInfo` — correct.  
- `response-builder.ts` `buildState()` ~line 55: `missingFields: reflection.missing_info.map(i => i.category)` — correct when used with current result.  
- `orchestrator.ts` line 246: `if (state.missingFields.length > 0 && !state.canProceed)` — this reads `state` which may carry `missingFields` from a *previously set* state if the state merge doesn't overwrite with the current result.  
- Log evidence: sequences 39, 54, 67+ show LLM responding `direct_accept` + `missing_info: []` but the NEXT trace event still shows `缺失 2 项关键信息` with a `reasoning_summary` text from an EARLIER turn.

**Root cause pinpoint**: Need to read `orchestrator.ts` in full to find exactly where `state.missingFields` comes from across iterations. Current hypothesis: `buildState()` uses the current reflection result, but `state` is also read at the top of the loop from `session.state` which persists the PREVIOUS turn's values and may not be fully overwritten.

**Fix approach**: Ensure that when `reflection.decision === 'direct_accept'`, `state.missingFields` is explicitly set to `[]` regardless of what was in the previous session state. Specifically guard the `missingFields.length > 0` check with `reflection.decision !== 'direct_accept'`.

**Rationale**: Minimal change — avoids restructuring the state model. Only adds an explicit reset of `missingFields` on `direct_accept`.

**Alternatives considered**:  
- Restructure `OrchestratorState` to separate "current turn" from "accumulated" fields — rejected, too large a refactor for a targeted bug fix.  
- Add a session reset on each turn — rejected, would lose legitimately accumulated context.

---

## Decision 2: Mermaid Diagram Format

**Decision**: The rendering pipeline is actually designed correctly (`normalizeAilyMermaid` in `x-dialog.component.ts` wraps plain text in `{"code": "..."}` JSON, and the mermaid renderer reads `data.code`). The reported error `No diagram type detected for text: {"code": "flowchart LR\n..."}` indicates the mermaid renderer is receiving the raw JSON string instead of the extracted code.

**Evidence**:  
- `tesseract-agent-response-adapter.ts`: `block('aily-mermaid', { code: workflowToMermaid(response.workflow) })` — passes JSON object.  
- `x-dialog.component.ts` `normalizeAilyMermaid()`: detects if inner content is already valid `{code: string}` JSON and leaves it alone.  
- Bug: the mermaid runtime (`mermaid.render()` or `mermaid.parse()`) receives the raw string `{"code": "flowchart LR\n..."}` instead of the extracted `"flowchart LR\n..."`.  
- Most likely location: the final rendering step in `AilyChatCodeComponent` or wherever `mermaid.render(id, content)` is called — need to verify it accesses `parsedData.code` not `JSON.stringify(parsedData)`.

**Fix approach**: In the mermaid rendering component, ensure `mermaid.render(id, parsedData.code)` is called, not `mermaid.render(id, contentString)`. If the component already does this correctly, the bug may be in the SSE streaming path where `normalizeAilyMermaid` returns early (because `this.doing === true`) and the final unwrapping never happens for certain message types.

**Rationale**: The render call must receive plain mermaid syntax, not JSON envelope.

---

## Decision 3: Preliminary Diagram at summary_ready

**Decision**: Add `workflowToBlueprint Mermaid()` — a simplified diagram generated from `WorkflowBlueprint` (not the full n8n workflow JSON, which is only available at `workflow_ready`). Blueprint contains component info sufficient to draw a flow.

**Evidence**:  
- `summary_ready` in `response-builder.ts`: has access to `blueprint: WorkflowBlueprint` (component plan) but NOT to the final `workflow` JSON.  
- `workflowToMermaid()` requires `{nodes, connections}` n8n format.  
- Alternative: generate a simplified mermaid from `blueprint.components[]` array — each component becomes a node, data flow inferred from sequence order.

**Fix approach**: Create `blueprintToMermaid(blueprint: WorkflowBlueprint): string` in `tesseract-agent-response-adapter.ts` that generates a simple linear flowchart from blueprint components. Inject this as `aily-mermaid` block in the `summary_ready` case.

**Rationale**: Blueprint is always available at summary_ready; gives user a visual preview without waiting for full workflow generation.

---

## Decision 4: Session Isolation for Teaching/Dialogue Modes

**Decision**: Store separate `chatList[]` and `conversationMessages[]` arrays per mode in `ChatHistoryService`. On mode switch, save current mode's state, load the other mode's state.

**Evidence**:  
- `ChatHistoryService` stores `SessionData { chatList, conversationMessages, metadata }` — currently single bucket.  
- `aily-chat.component.ts` `tesseractInteractionMode` is just a boolean-style toggle; no history separation happens on switch.  
- `conversationMessages` (messages sent to backend) is what must be isolated — a full teaching history context confuses dialogue mode.

**Fix approach**: Extend `ChatHistoryService` to store `{ teaching: SessionData, dialogue: SessionData }`. On mode switch in `aily-chat.component.ts`, call `chatHistoryService.switchMode(newMode)` which swaps the active bucket.

**Rationale**: Clean separation at the service level. Component code remains minimal.

**Alternatives considered**:  
- Clear history entirely on switch — rejected, users want to return to teaching context when switching back.  
- Backend session type disambiguation — rejected, overkill for a front-end display problem.

---

## Decision 5: Skills Cards at Dialogue Top

**Decision**: Read skills from `SkillCenterService` (or local JSON) on dialogue mode entry and render a persistent card strip above the chat input area in `aily-chat.component.html`. This is NOT a backend-triggered event.

**Evidence**:  
- Current rendering only happens when backend sends `aily-dialogue-mode` fenced blocks.  
- `SkillCenterComponent` and related service already loads skills from local storage.  
- The dialogue mode top strip should be client-side driven: load skills on `ngOnInit` / mode switch, display as horizontal scrollable cards.

**Fix approach**: In `aily-chat.component.ts`, add `dialogueSkills: SkillRecord[]` loaded from the skill service. In template, add a `*ngIf="tesseractInteractionMode === 'dialogue'"` section above the message list that renders skill cards.

---

## Decision 6: Hot-plug Mock UI Removal

**Decision**: Delete the `isPortGuide` template block (`<p class="desc desc--muted">请在下方按钮区域选择一个接口，模拟把当前硬件插入对应位置。</p>`) and the mock option buttons from `x-aily-config-guide-viewer.component.ts`. Replace with a real hardware status display driven by `HardwarePresenceEvent`.

**Evidence**:  
- The mock UI is guarded by `isPortGuide` (derived from `data.type === 'hot_plugging'`).  
- MQTT heartbeat already dispatches `HardwarePresenceEvent` in the existing bridge.  
- The component should subscribe to the bridge's hardware presence observable and show real status instead.

---

## Decision 7: Brand Rename

**Decision**: Replace "aily blockly" / "Aily Blockly" → "Tesseract" and "aily" (AI role name) → "Tess" in all user-visible Angular templates and TypeScript string literals. Scope: window titles, default project name, chat role display name.

**Files confirmed**:  
- `blockly-editor.component.ts`: `'aily blockly'`, `'aily blockly - {name}'`  
- `code-editor.component.ts`: `'aily blockly'`, `'aily blockly - {name}'`  
- `playground.component.ts`: `'aily blockly - Playground'`  
- `project.service.ts`: `name: 'aily blockly'`  
- AI role name in chat: search needed for `'aily'` as role display string  

**NOT changed**: `package.json` name, `electron/` app ID, bundle identifiers, copyright headers in generated code files.

---

## Decision 8: 我的本地库 Window Size (75%)

**Decision**: Reduce `nzWidth` and `min-height` to ~75% of current values at both call sites.

**Current**: `nzWidth: 'min(1720px, calc(100vw - 112px))'`, `min-height: min(860px, calc(100vh - 96px))`  
**New**: `nzWidth: 'min(1290px, calc(100vw - 112px))'`, `min-height: min(645px, calc(100vh - 96px))`  

(1720 × 0.75 = 1290, 860 × 0.75 = 645)

**Files**: `header.component.ts` (line 382) and `aily-chat.component.ts` (line 1347) + `skill-center.component.scss` (min-height).
