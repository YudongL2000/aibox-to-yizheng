# Workflow View Sync Contract

## 1. Empty Project Workspace

### Input

- Current client route identifies a project workspace
- No valid workflow reference exists for that project

### Required Output

- Client main workspace renders placeholder guidance
- Embedded n8n homepage, workflow list, and unrelated workflow content are suppressed

## 2. Workflow Creation Success

### Input

- Chat-side create action completes successfully
- Result contains a workflow reference for the active project

### Required Output

- Project workflow reference is updated for the active project
- Current client workspace transitions from `placeholder` or `pending_sync` toward `workflow_ready`
- Client main workspace auto-focuses the referenced workflow without requiring a manual open action

## 3. Delayed Embedded Workspace Readiness

### Input

- Workflow creation success arrives before embedded workspace is ready

### Required Output

- Client stores a pending sync target for the same project
- When the embedded workspace becomes ready, it resolves to the pending workflow target automatically
- The client must not fall back to homepage or third-party workflow content during this delay

## 4. Project Switch Protection

### Input

- User changes the active project while a previous workflow creation result is still in flight

### Required Output

- Late results for the old project do not update the newly active workspace
- Newly active workspace continues to respect its own placeholder/workflow state only
