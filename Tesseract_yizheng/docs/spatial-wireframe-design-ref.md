# Spatial Wireframe Design Ref

## Purpose
- This document is the workspace-level reference for the "Spatial Wireframe" visual language.
- Default mode is `dark`.
- Every app should be able to switch to `light` without redefining semantics.

## Product Intent
- Less is more. UI should reduce noise instead of competing with data.
- Function dictates form. Primitive borders, grids, and clear text hierarchy are preferred over decorative skins.
- Semantic color is reserved for status, emphasis, warning, and AI-specific meaning.

## Typography
- Sans stack: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `PingFang SC`, `Hiragino Sans GB`, `sans-serif`
- Mono stack: `Space Mono`, `Courier New`, `monospace`
- Body text defaults to `14px`
- Mono text is uppercase by default and used for labels, system states, and structured metadata

## Core Tokens

### Shared
| Token | Value |
|---|---|
| `--font-sans` | `Inter`, `-apple-system`, `BlinkMacSystemFont`, `PingFang SC`, `Hiragino Sans GB`, `sans-serif` |
| `--font-mono` | `Space Mono`, `Courier New`, `monospace` |
| `--transition` | `all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)` |

### Light
| Token | Value |
|---|---|
| `--bg-base` | `#F4F4F2` |
| `--surface` | `#EAEAEA` |
| `--surface-hover` | `#DFDFDF` |
| `--border-solid` | `#222222` |
| `--border-dashed` | `#BBBBBB` |
| `--grid-color` | `rgba(0, 0, 0, 0.03)` |
| `--text-primary` | `#111111` |
| `--text-secondary` | `#666666` |
| `--text-inverse` | `#F4F4F2` |
| `--sem-info` | `#0055FF` |
| `--sem-success` | `#00A859` |
| `--sem-warning` | `#E58A00` |
| `--sem-danger` | `#E0282E` |
| `--sem-neural` | `#6B21A8` |
| `--accent` | `var(--sem-neural)` |
| `--status-ok` | `var(--sem-success)` |
| `--status-warn` | `var(--sem-warning)` |
| `--radius-base` | `4px` |

### Dark
| Token | Value |
|---|---|
| `--bg-base` | `#121316` |
| `--surface` | `#1E1F24` |
| `--surface-hover` | `#2A2C33` |
| `--border-solid` | `#3A3D45` |
| `--border-dashed` | `#555555` |
| `--grid-color` | `rgba(255, 255, 255, 0.02)` |
| `--text-primary` | `#F0F0F0` |
| `--text-secondary` | `#8A8D98` |
| `--text-inverse` | `#121316` |
| `--sem-info` | `#00E5FF` |
| `--sem-success` | `#CFFF04` |
| `--sem-warning` | `#FFC000` |
| `--sem-danger` | `#FF3366` |
| `--sem-neural` | `#B14EFF` |
| `--accent` | `var(--sem-neural)` |
| `--status-ok` | `var(--sem-success)` |
| `--status-warn` | `var(--sem-warning)` |
| `--radius-base` | `8px` |

## Layout Rules
- Base environment uses a visible grid background.
- Surfaces use a single solid border, not soft glass unless explicitly justified.
- Dashed borders are reserved for separators, disabled states, and structural hints.
- Primary layout should prefer simple two-column or three-column grids and strict spacing bands.

## Component Rules
- Panels use `surface + 1px solid border + radius-base`.
- Buttons invert foreground/background on hover instead of relying on glow-heavy affordances.
- Disabled controls lower opacity and switch to dashed boundary language.
- Status dots and semantic accents are the preferred way to communicate health, warning, and danger.
- Mono labels should be used for state, metadata, and technical telemetry.

## Semantic Color Mapping
- `info`: data stream, routing, neutral system activity
- `success`: active, healthy, stable, deployed
- `warning`: pending, caution, awaiting confirmation
- `danger`: error, critical, halt, destructive action
- `neural`: AI, ML, orchestration, cognitive highlight

## Repo Consumers
- Flutter ref: `frontend/lib/utils/spatial_design_ref.dart`
- Angular/Electron ref: `aily-blockly/src/spatial-design-ref.scss`
- Agent UI ref: `backend/apps/agent-ui/src/spatial-design-ref.css`

## Adoption Notes
- New UI work should resolve colors, radius, typography, and semantic state from these refs first.
- Existing hard-coded screens should migrate incrementally, starting from app-shell, navigation, dialogs, status chips, and primary actions.
- If a screen must diverge, document why instead of silently introducing a new visual language.
