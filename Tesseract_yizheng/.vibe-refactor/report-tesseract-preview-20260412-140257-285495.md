# Workspace Vibe Refactor Report

- Generated at: 2026-04-12T14:02:57
- Workspace: `/Users/skylerwang/Documents/yudong/Tesseract`
- Sync user claude: `False` (`/Users/skylerwang/.claude`)
- Mode: `preview`
- Agent targets: `claude, codex, copilot, cursor`
- Include hidden: `True`
- Excludes: `.git, .hg, .svn, node_modules, .venv, venv, .pytest_cache, .mypy_cache, .cache, dist, build, target, .gradle, .idea, .next, .nuxt, .turbo, coverage, .coverage, .vibe-refactor, *_backup, backend/**, frontend/**, aily-blockly/**, n8n/**, specs/**, test/**`
- Validate commands: `0` (on_apply=False, strict=False)
- Hardcoding scan: `True` (strict=False, max_findings=0)
- Blocking status: `ok`

## Summary
- Planned changes: **0**
- Manual required: **0**
- Warnings: **2**
- Rule checks: **21**
- Validation commands: **0**
- Hardcoding findings: **17**

## Warnings
- workspace: excluded/pruned paths = 72
- hardcoding: detected 17 finding(s).

## Hardcoding Findings
- `.specify/scripts/bash/create-new-feature.sh:212` | `threshold_literal` | `local max_words=3`
- `.specify/scripts/bash/create-new-feature.sh:213` | `threshold_literal` | `if [ ${#meaningful_words[@]} -eq 4 ]; then max_words=4; fi`
- `.specify/scripts/bash/create-new-feature.sh:270` | `threshold_literal` | `MAX_BRANCH_LENGTH=244`
- `.specify/scripts/bash/update-agent-context.sh:128` | `absolute_path` | `rm -f /tmp/agent_update_*_$$`
- `.specify/scripts/bash/update-agent-context.sh:129` | `absolute_path` | `rm -f /tmp/manual_additions_$$`
- `docs/dev/ZLMRTCClient.js:1852` | `threshold_literal` | `var maxptime = 0;`
- `docs/dev/ZLMRTCClient.js:2012` | `threshold_literal` | `maxMessageSize = 65536;`
- `docs/dev/ZLMRTCClient.js:5118` | `threshold_literal` | `let maxMessageSize = 65536;`
- `docs/dev/ZLMRTCClient.js:5125` | `threshold_literal` | `maxMessageSize = 65535;`
- `docs/dev/ZLMRTCClient.js:5137` | `threshold_literal` | `maxMessageSize = 2147483637;`
- `docs/dev/ZLMRTCClient.js:7131` | `threshold_literal` | `timeout: 0,`
- `docs/dev/ZLMRTCClient.js:9136` | `threshold_literal` | `maxBitrate: 1000000`
- `docs/dev/ZLMRTCClient.js:9140` | `threshold_literal` | `maxBitrate: 500000,`
- `docs/dev/ZLMRTCClient.js:9145` | `threshold_literal` | `maxBitrate: 200000,`
- `docs/dev/cloud_mqtt_example.py:230` | `threshold_literal` | `self.client.reconnect_delay_set(min_delay=1, max_delay=5)`
- `docs/dev/cloud_mqtt_example.py:240` | `threshold_literal` | `if not self.connected_event.wait(timeout=5):`
- `docs/dev/cloud_mqtt_example.py:401` | `threshold_literal` | `publish_result.wait_for_publish(timeout=2)`

## Rule Checklist
- `workspace.claude_pointer` | `pass` | Root CLAUDE pointer block exists.
- `workspace.root_update_contract` | `pass` | Root update contract exists.
- `workspace.global_first_no_hardcoding` | `pass` | Global-first no-hardcoding rule exists in root CLAUDE.
- `workspace.claude_line_budget` | `pass` | CLAUDE.md lines=21 (target<=200).
- `workspace.today_rollover` | `pass` | today.md date=2026-04-12 expected=2026-04-12.
- `workspace.today_log_migration` | `pass` | Today logs migrated out of root CLAUDE.
- `workspace.structure_scan_doc` | `pass` | Workspace structure doc exists.
- `workspace.rules_reference_doc` | `pass` | Rules reference doc exists.
- `workspace.no_hardcoding_rule_doc` | `pass` | No-hardcoding rule doc exists.
- `workspace.tech_stack_doc` | `pass` | Tech stack doc exists.
- `workspace.session_start_doc` | `pass` | Session start doc exists.
- `workspace.folder_docs_coverage` | `pass` | Every scanned folder has .folder.md.
- `workspace.folder_function_descriptions` | `pass` | Each folder doc contains Function description line.
- `workspace.cursor_rules` | `pass` | Required .cursor rules exist.
- `workspace.cursor_rule_frontmatter` | `pass` | Cursor rule frontmatter includes alwaysApply/globs.
- `workspace.cursor_folder_docs` | `pass` | Cursor folder docs exist.
- `workspace.agents_entry` | `pass` | AGENTS.md entry exists.
- `workspace.copilot_entry` | `pass` | Copilot instruction file exists.
- `architecture.low_coupling_high_cohesion` | `manual` | Requires semantic review; cannot be safely auto-verified.
- `architecture.no_feature_overlap` | `manual` | Requires domain-level overlap inspection; reported for manual review.
- `automation.hardcoding_scan` | `fail` | 17 hardcoding finding(s) detected.

## Planned Changes
- No file changes required.

## Diff Snippets
- No diffs.
