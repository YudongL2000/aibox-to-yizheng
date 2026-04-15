# Quickstart: Tesseract Client UX Loop

## Prerequisites

1. Start the backend agent service with local skill-library data available.
2. Start the desktop shell used for `aily-blockly` Tesseract chat and embedded n8n workspace.
3. Start the Flutter workspace surface or the target client shell that exposes hardware status and digital-twin updates.
4. Ensure the test environment can simulate stable heartbeats and at least one saved skill in `backend/data/skills/`.

## Scenario 1: Confirm workflow once and show it in the workspace

1. Open a fresh chat session and describe a workflow.
2. Continue until the agent emits the confirmation step.
3. Verify the response shows formatted markdown plus a renderable diagram instead of raw trigger/logic/executor tables.
4. Click `确认工作流`.
5. Confirm the current workspace immediately shows the target workflow and no extra `创建工作流` step is required.
6. Confirm the chat state now indicates the workflow has been pushed or is configuring, not waiting for another creation action.

## Scenario 2: Skill card branches by live hardware readiness

1. Seed or load a saved skill with required hardware metadata and bound workflow JSON.
2. Send a dialogue request that should match that skill.
3. Verify the UI shows a skill card with name, summary, required hardware, readiness state, trace action, and publish action.
4. Run the same scenario with all required hardware present and confirm the card flows directly to workflow display/deployment.
5. Run it again with one required component missing and confirm the UI enters the hot-plug/config path with the missing hardware called out.

## Scenario 3: Finish hot-plugging/configuration entirely inside chat

1. Use a workflow that requires face-image upload, a single-choice setting, and a multi-choice setting.
2. Verify each prompt renders with the correct control type.
3. Upload a face image using the chat prompt and confirm the upload state is acknowledged.
4. Complete the single-select and multi-select prompts.
5. Confirm the chat reaches a `config_complete` state with a clear next action.

## Scenario 4: Stable shell layout and digital-twin refresh behavior

1. Open the digital twin and Studio/skills library together.
2. Verify Studio remains above the digital twin window.
3. Send repeated steady-state heartbeats without changing the hardware set.
4. Confirm the digital twin does not visibly refresh or jitter.
5. Change a component or mapping and confirm exactly one meaningful digital-twin update occurs.

## Suggested Validation Commands

1. `cd backend && npm run build`
2. `cd aily-blockly && npm run build`
3. `cd frontend && flutter analyze`