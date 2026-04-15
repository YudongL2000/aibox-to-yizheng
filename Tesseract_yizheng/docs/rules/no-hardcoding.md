# No Hardcoding Rule

## Scope

UI styling must be driven by:

- Flutter: `frontend/lib/utils/spatial_design_ref.dart` and theme APIs (`ThemeData`, `ColorScheme`, `context.spatial`).
- aily-blockly: `aily-blockly/src/spatial-design-ref.scss` and semantic CSS variables.

Hardcoded color values are forbidden in migration targets:

- Flutter: `Color(`, `Colors.`, `0x...`, `#...` in UI files under `frontend/lib`.
- Angular/SCSS/CSS/TS rendering: hex (`#rgb`, `#rrggbb`, `#rrggbbaa`), `rgb()`, `rgba()` used as direct styles.

## Mandatory

- All UI color/style value decisions must come from one of:
  - `frontend/lib/utils/spatial_design_ref.dart`
  - `aily-blockly/src/spatial-design-ref.scss`
  - Theme APIs (`Theme.of`, `ColorScheme`, `ThemeExtension`, `context.spatial`)
- No style hardcoding in UI implementation files; non-UI parsing/serialization helpers are limited to exception files only.
- Any exception must be recorded with cleanup deadline.

## Exception List (with cleanup deadline)

- Exception list file: `scripts/no-hardcodes-exceptions.json`
- Deadline rule: entries are treated as temporary and reviewed monthly.
- Expired entries cause scan failure.

## Scan Gate

- Full hardcode scan: `node scripts/check-no-hardcodes.mjs --module=all`
- Flutter scope: `node scripts/check-no-hardcodes.mjs --module=frontend`
- aily-blockly scope: `node scripts/check-no-hardcodes.mjs --module=aily-blockly`（兼容 `--module=aily`）
- JSON output report: `scripts/no-hardcodes-report.json`
- The aily-blockly pass now checks `*.css` files in addition to `*.scss`, `*.html`, and `*.ts`.

## Temporary process

- New render logic must remove all inline color values before code review completion.
- Temporary exceptions must include:
  - owner
  - reason
  - expected cleanup date
- Old hardcoded values in comments are excluded from gate counting only; production code still blocked.

## Command

- Full hardcode gate: `node scripts/check-no-hardcodes.mjs --module=all`
- Flutter scope: `node scripts/check-no-hardcodes.mjs --module=frontend`
- aily-blockly scope: `node scripts/check-no-hardcodes.mjs --module=aily-blockly`（兼容 `--module=aily`）
