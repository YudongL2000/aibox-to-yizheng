# Contract: Workspace Sync

## Purpose

Define the expected state transition when a user confirms a workflow or selects a runnable skill.

## Workflow Confirmation Contract

1. When the user clicks `确认工作流`, the client must commit the active workflow as the canonical workspace target.
2. The same action must:
   - persist or reuse the workflow identifier as needed
   - publish the workspace view target
   - make the workflow visible in the embedded n8n surface
   - initialize or resume configuration state when configuration is required
3. The chat UI must update to reflect that the workflow is already in the workspace or is actively configuring.

## Skill Selection Contract

1. Selecting a skill with all required hardware present must immediately create or load a `Workspace Workflow Target` from the saved workflow JSON.
2. Selecting a skill with missing hardware must still bind the chosen workflow target, but route the user through hot-plugging/config prompts before execution.
3. Chat state, workspace state, and digital-twin state must all reference the same workflow target identifier throughout the interaction.

## Failure Handling

- If workspace synchronization fails, the user must see a recoverable error state and the workflow target must remain attached to the session for retry.
- If the workspace surface is not yet ready, the client must retry or defer visibility rather than discarding the target.