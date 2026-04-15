# Contract: Dialogue Rendering

## Purpose

Define how backend dialogue responses must be transformed into user-visible chat content for the 010 UX loop.

## Inputs

- Agent response envelope from the backend dialogue endpoints
- Optional workflow JSON, reasoning summary, and configuration metadata
- Live hardware readiness metadata for skill suggestions

## Rendering Rules

1. `summary_ready` responses must render the summary body through the existing markdown renderer and expose the `确认构建` or equivalent next-step action from metadata.
2. `workflow_ready` responses must render:
   - a markdown summary block that can contain formatted emphasis and lists
   - a visual diagram block compatible with the existing chat diagram renderer
   - a single primary action that confirms and synchronizes the workflow target
3. The UI must not render the legacy trigger/logic/executor tables once a diagram summary is available.
4. If diagram parsing fails, the renderer must replace the raw parser error with a readable fallback message plus the markdown summary.
5. `select_single`, `select_multi`, `image_upload`, `hot_plugging`, `config_input`, and `config_complete` responses must all render through the existing config-guide family of components rather than plain text.

## Output Guarantees

- The user always sees exactly one primary action for the workflow confirmation step.
- The rendered content matches the backend phase semantics without leaking raw intermediate JSON or parser error text.
- Config prompts remain actionable inside the chat surface.