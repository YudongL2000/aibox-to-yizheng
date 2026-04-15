# Data Model: 011 UX Feedback Polish

## 1. ChatHistoryService — Dual Session Buckets

**Current shape** (single bucket):
```typescript
interface SessionData {
  chatList: ChatListItem[];
  conversationMessages: any[];
  metadata: SessionMetadata;
}
```

**New shape** (mode-aware):
```typescript
interface ModeSessionData {
  teaching: SessionData;
  dialogue: SessionData;
}
```

`ChatHistoryService` exposes `switchMode(mode: TesseractDialogueMode)` which:
- Persists current mode's session
- Loads the target mode's session (or creates empty if first visit)
- Updates the active `chatList` and `conversationMessages` references

No backend changes — isolation is purely frontend-side.

---

## 2. ReflectionState — current-turn isolation

**Current flow** (buggy):
```
OrchestratorState.missingFields ← previous iteration value
            ↑
     guard check: if missingFields.length > 0 → clarify again
```

**Fixed flow**:
```
currentReflection = await reflect(userInput)
if currentReflection.decision === 'direct_accept':
    state.missingFields = []          ← explicit reset
    state.canProceed = true
    → proceed to summary_ready
```

No new interface fields — just a guard added to the state update path.

---

## 3. PreliminaryDiagram — Blueprint → Mermaid

**Input**: `WorkflowBlueprint.components[]` — already available at `summary_ready`  
**Output**: mermaid `flowchart LR` string with one node per component

```typescript
function blueprintToMermaid(blueprint: WorkflowBlueprint): string {
  const lines = ['flowchart LR'];
  blueprint.components.forEach((c, i) => {
    const id = `C${i + 1}`;
    const label = escapeMermaidLabel(c.name || c.type);
    lines.push(`  ${id}["${label}"]`);
    if (i > 0) lines.push(`  C${i} --> ${id}`);
  });
  return lines.join('\n');
}
```

This is added to `response-builder.ts` (backend) or `tesseract-agent-response-adapter.ts` (frontend adapter) — decision: backend is better (single source of truth).

---

## 4. HardwarePresenceEvent — Hot-plug step binding

**Existing interface** (from 009/010):
```typescript
interface HardwarePresenceEvent {
  componentList: HardwareComponent[];
  timestamp: number;
}
```

`x-aily-config-guide-viewer.component.ts` subscribes to this event stream (via the existing `TesseractChatService` or hardware bridge observable) and maps it to step completion state — no new data model fields needed.

---

## 5. DialogueSkillCard (aily-chat top strip)

**Shape** (read from SkillCenterService):
```typescript
interface DialogueSkillCard {
  id: string;
  name: string;
  description: string;
  requiredHardware: string[];          // from skill record
  hardwareReady: boolean;              // computed against current heartbeat state
}
```

Rendered as a horizontal scrollable strip at the top of the dialogue UI. Click → triggers `triggerSkill(card)` same as existing dialogue-mode-viewer.
