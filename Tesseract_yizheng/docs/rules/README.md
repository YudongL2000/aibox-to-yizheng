# Rules Reference

## Rules Index

- `docs/rules/no-hardcoding.md`
- `docs/rules/component-reuse.md`
- `.cursor/rules/vibe-engineering.mdc`
- `.cursor/rules/vibe-loading.mdc`
- `.cursor/rules/vibe-doc-sync.mdc`
- `.cursor/rules/vibe-component-reuse.mdc`

## Golden Rules

1. No hardcoding in business paths, IDs, thresholds, or environment-specific settings.
2. Before introducing any constant or variable, search higher-level/global config first and reuse existing definitions.
3. If no global definition exists, add one in centralized config and document source-of-truth.

## Hardcode Guard Gates

- Flutter UI hardcode scan: `node scripts/check-no-hardcodes.mjs --module=frontend`
- aily-blockly UI hardcode scan: `node scripts/check-no-hardcodes.mjs --module=aily-blockly`（兼容 `--module=aily`）
- Full scan in CI/local: `node scripts/check-no-hardcodes.mjs --module=all`
- Gate status should be zero violations.
- Temporary exceptions are declared in `scripts/no-hardcodes-exceptions.json` and must include cleanup dates.
- Scan output JSON: `scripts/no-hardcodes-report.json`
