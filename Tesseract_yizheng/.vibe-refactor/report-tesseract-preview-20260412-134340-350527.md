# Workspace Vibe Refactor Report

- Generated at: 2026-04-12T13:43:42
- Workspace: `/Users/skylerwang/Documents/yudong/Tesseract`
- Sync user claude: `False` (`/Users/skylerwang/.claude`)
- Mode: `preview`
- Agent targets: `claude, codex, copilot, cursor`
- Include hidden: `True`
- Excludes: `.git, .hg, .svn, node_modules, .venv, venv, .pytest_cache, .mypy_cache, .cache, dist, build, target, .gradle, .idea, .next, .nuxt, .turbo, coverage, .coverage, .vibe-refactor, *_backup, n8n/n8n-master/**, aily-blockly/child/**, aily-blockly/.angular/cache/**, frontend/.dart_tool/**`
- Validate commands: `0` (on_apply=False, strict=False)
- Hardcoding scan: `True` (strict=False, max_findings=0)
- Blocking status: `ok`

## Summary
- Planned changes: **2158**
- Manual required: **0**
- Warnings: **2**
- Rule checks: **21**
- Validation commands: **0**
- Hardcoding findings: **824**

## Warnings
- workspace: excluded/pruned paths = 38
- hardcoding: detected 824 finding(s).

## Hardcoding Findings
- `.specify/scripts/bash/create-new-feature.sh:208` | `threshold_literal` | `local max_words=3`
- `.specify/scripts/bash/create-new-feature.sh:209` | `threshold_literal` | `if [ ${#meaningful_words[@]} -eq 4 ]; then max_words=4; fi`
- `.specify/scripts/bash/create-new-feature.sh:266` | `threshold_literal` | `MAX_BRANCH_LENGTH=244`
- `.specify/scripts/bash/update-agent-context.sh:124` | `absolute_path` | `rm -f /tmp/agent_update_*_$$`
- `.specify/scripts/bash/update-agent-context.sh:125` | `absolute_path` | `rm -f /tmp/manual_additions_$$`
- `aily-blockly/.github/workflows/main.yml:58` | `secret_literal` | `api-token: '${{ secrets.SIGNPATH_API_TOKEN }}'`
- `aily-blockly/.specify/scripts/bash/create-new-feature.sh:208` | `threshold_literal` | `local max_words=3`
- `aily-blockly/.specify/scripts/bash/create-new-feature.sh:209` | `threshold_literal` | `if [ ${#meaningful_words[@]} -eq 4 ]; then max_words=4; fi`
- `aily-blockly/.specify/scripts/bash/create-new-feature.sh:266` | `threshold_literal` | `MAX_BRANCH_LENGTH=244`
- `aily-blockly/.specify/scripts/bash/update-agent-context.sh:124` | `absolute_path` | `rm -f /tmp/agent_update_*_$$`
- `aily-blockly/.specify/scripts/bash/update-agent-context.sh:125` | `absolute_path` | `rm -f /tmp/manual_additions_$$`
- `aily-blockly/.tesseract-runtime/manifest.json:3` | `absolute_path` | `"sourceRoot": "/Users/hanshilian/private/QIALG/projects/AI-tesseract/client/Tesseract/backend",`
- `aily-blockly/electron/main.js:777` | `windows_path` | `const systemRoot = process.env.SystemRoot || process.env.windir || 'C:\\Windows';`
- `aily-blockly/electron/main.js:778` | `windows_path` | `const programFiles = process.env.ProgramFiles || 'C:\\Program Files';`
- `aily-blockly/electron/main.js:1035` | `threshold_literal` | `minWidth: 800,`
- `aily-blockly/electron/main.js:1036` | `threshold_literal` | `minHeight: 600,`
- `aily-blockly/electron/main.js:1684` | `threshold_literal` | `const maxAge = 24 * 60 * 60 * 1000; // 24小时`
- `aily-blockly/electron/main.js:1736` | `threshold_literal` | `ipcMain.handle("ripgrep-list-files", async (event, searchPath, limit = 1000) => {`
- `aily-blockly/electron/n8n-runtime.js:28` | `absolute_path` | `const DEFAULT_WORKSPACE_ROUTE = "/home/workflows";`
- `aily-blockly/electron/n8n-runtime.js:95` | `threshold_literal` | `async waitForEditorReady(url = this.getBaseUrl(), timeoutMs = 60000) {`
- `aily-blockly/electron/n8n-runtime.js:280` | `threshold_literal` | `const response = await fetch(`${this.getBaseUrl()}/api/v1/workflows?limit=1`, {`
- `aily-blockly/electron/n8n-runtime.js:471` | `threshold_literal` | `timeoutMs: 10000,`
- `aily-blockly/electron/n8n-runtime.js:527` | `windows_path` | `? path.join(process.env.ProgramFiles || "C:\\Program Files", "nodejs")`
- `aily-blockly/electron/n8n-runtime.js:530` | `windows_path` | `? path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "nodejs")`
- `aily-blockly/electron/n8n-runtime.js:618` | `threshold_literal` | `timeoutMs: 60000,`
- `aily-blockly/electron/n8n-runtime.js:659` | `threshold_literal` | `timeoutMs: 1500,`
- `aily-blockly/electron/preload.js:692` | `threshold_literal` | `const { pattern, path: searchPath, limit = 100 } = params;`
- `aily-blockly/electron/ripgrep.js:111` | `threshold_literal` | `{ timeout: 2000 },`
- `aily-blockly/electron/ripgrep.js:142` | `threshold_literal` | `async function ripgrep(args, searchPath, timeout = 10000) {`
- `aily-blockly/electron/ripgrep.js:154` | `threshold_literal` | `maxBuffer: 10 * 1024 * 1024, // 10MB buffer`
- `aily-blockly/electron/ripgrep.js:201` | `threshold_literal` | `* @param {number} [params.maxResults=100] - 最大结果数`
- `aily-blockly/electron/ripgrep.js:211` | `threshold_literal` | `maxResults = 100,`
- `aily-blockly/electron/ripgrep.js:279` | `threshold_literal` | `async function listAllContentFiles(searchPath, limit = 1000) {`
- `aily-blockly/electron/ripgrep.js:307` | `threshold_literal` | `* @param {number} [params.maxResults=100] - 最大结果数`
- `aily-blockly/electron/ripgrep.js:310` | `threshold_literal` | `* @param {number} [params.maxLineLength=500] - 每行最大长度(字符数)`
- `aily-blockly/electron/ripgrep.js:319` | `threshold_literal` | `maxResults = 100,`
- `aily-blockly/electron/ripgrep.js:322` | `threshold_literal` | `maxLineLength = 500`
- `aily-blockly/electron/ripgrep.js:781` | `threshold_literal` | `const maxMatchesPerRange = 3; // 每个区域最多包含3个匹配，超过则拆分`
- `aily-blockly/electron/runtime-utils.js:59` | `threshold_literal` | `timeoutMs = 30000,`
- `aily-blockly/electron/runtime-utils.js:90` | `threshold_literal` | `const { method = "POST", timeoutMs = 30000, headers = {} } = options;`
- `aily-blockly/electron/tesseract-runtime.js:303` | `threshold_literal` | `timeoutMs: 1200,`
- `aily-blockly/electron/tesseract-runtime.js:387` | `threshold_literal` | `timeoutMs: 45000,`
- `aily-blockly/electron/tesseract-runtime.js:412` | `threshold_literal` | `timeoutMs: 1500,`
- `aily-blockly/scripts/electron-dev.js:354` | `threshold_literal` | `function waitForPort(port, host, timeoutMs = 60000) {`
- `aily-blockly/scripts/tesseract-smoke.js:77` | `threshold_literal` | `timeoutMs: 45000,`
- `aily-blockly/scripts/tesseract-smoke.js:82` | `threshold_literal` | `timeoutMs: 60000,`
- `aily-blockly/src/app/components/aily-blockly/aily-blockly.component.ts:79` | `threshold_literal` | `maxScale: 1,`
- `aily-blockly/src/app/components/aily-blockly/aily-blockly.component.ts:80` | `threshold_literal` | `minScale: 1,`
- `aily-blockly/src/app/components/image-viewer/image-viewer.component.ts:28` | `threshold_literal` | `readonly MIN_SCALE = 0.1;`
- `aily-blockly/src/app/components/image-viewer/image-viewer.component.ts:29` | `threshold_literal` | `readonly MAX_SCALE = 10;`
- `aily-blockly/src/app/components/inner-window/inner-window.component.ts:19` | `threshold_literal` | `size: { width: 400, height: 600, minWidth: 400, minHeight: 600 },`
- `aily-blockly/src/app/configs/ai-config.ts:14` | `threshold_literal` | `timeout: 5000, // 5秒超时`
- `aily-blockly/src/app/configs/ai-config.ts:15` | `threshold_literal` | `maxCacheSize: 100, // 最大缓存100个条目`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/blockly.component.ts:223` | `threshold_literal` | `maxScale: 1.5,      // 最大缩放比例`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/blockly.component.ts:224` | `threshold_literal` | `minScale: 0.5,    // 最小缩放比例`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/components/image-upload-dialog/image-upload-dialog.component.ts:31` | `threshold_literal` | `@Input() maxFileSize = 10 * 1024 * 1024; // 10MB`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/components/image-upload-dialog/image-upload-dialog.component.ts:60` | `threshold_literal` | `threshold: 127,`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle.ts:60` | `threshold_literal` | `private minorTick = 15;`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle.ts:290` | `threshold_literal` | `* @param length Length of the tick (minor=5, major=10).`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle.ts:708` | `threshold_literal` | `*   - min: 0`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle.ts:709` | `threshold_literal` | `*   - max: 360`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle.ts:713` | `threshold_literal` | `*   - minorTick: 15`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle.ts:720` | `threshold_literal` | `*   - min: 0`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle.ts:721` | `threshold_literal` | `*   - max: 360`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle.ts:725` | `threshold_literal` | `*   - minorTick: 15`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle180.ts:60` | `threshold_literal` | `private minorTick = 15;`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle180.ts:285` | `threshold_literal` | `const minValueDegrees = 0; // 固定最小值为0度`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle180.ts:286` | `threshold_literal` | `const maxValueDegrees = 180; // 固定最大值为180度`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle180.ts:292` | `threshold_literal` | `* @param length Length of the tick (minor=5, major=10).`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle180.ts:700` | `threshold_literal` | `*   - min: 0`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle180.ts:701` | `threshold_literal` | `*   - max: 360`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle180.ts:705` | `threshold_literal` | `*   - minorTick: 15`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle180.ts:712` | `threshold_literal` | `*   - min: 0`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle180.ts:713` | `threshold_literal` | `*   - max: 360`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle180.ts:717` | `threshold_literal` | `*   - minorTick: 15`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-code.ts:245` | `threshold_literal` | `const maxLength = 30;`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/generators/javascript/javascript/math.ts:301` | `threshold_literal` | `var maxCount = 0;`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/block-plus-minus/src/dynamic-inputs.js:27` | `threshold_literal` | `minInputs: 1,`
- `aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/block-plus-minus/src/dynamic-inputs.js:264` | `threshold_literal` | `this.minInputs = 1;`
- `aily-blockly/src/app/editors/blockly-editor/components/dev-tool/dev-tool.component.ts:101` | `threshold_literal` | `const minY = 1; // 最小bottom值`
- `aily-blockly/src/app/editors/blockly-editor/services/builder.service.ts:658` | `threshold_literal` | `const maxWaitTime = 60000; // 最多等待60秒`
- `aily-blockly/src/app/editors/blockly-editor/services/history.service.ts:140` | `threshold_literal` | `const MAX_AUTO_VERSIONS = 50;`
- `aily-blockly/src/app/editors/code-editor/components/monaco-editor/monaco-editor.component.ts:121` | `threshold_literal` | `const maxAttempts = 20;`
- `aily-blockly/src/app/main-window/components/footer/footer.component.ts:36` | `threshold_literal` | `this.actionData.timeout = 10000;`
- `aily-blockly/src/app/main-window/main-window.component.ts:109` | `threshold_literal` | `this.uiService.updateFooterState({ text: '', timeout: 0 });`
- `aily-blockly/src/app/main-window/main-window.component.ts:115` | `threshold_literal` | `this.uiService.updateFooterState({ text: '', timeout: 0 });`
- `aily-blockly/src/app/main-window/main-window.component.ts:278` | `threshold_literal` | `const threshold = 70; // 右边缘阈值距离`
- `aily-blockly/src/app/pages/guide/guide.component.ts:31` | `threshold_literal` | `private readonly maxRetry = 1;`
- `aily-blockly/src/app/pages/playground/subject-item/subject-item.component.ts:96` | `threshold_literal` | `this.uiService.updateFooterState({ state: 'doing', text: this.translate.instant('PLAYGROUND.LOADING_EXAMPLE'), timeout: 300000 });`
- `aily-blockly/src/app/pages/project-new/sequential-img.directive.ts:20` | `threshold_literal` | `private static maxConcurrent = 1;`
- `aily-blockly/src/app/services/background-agent.service.ts:678` | `threshold_literal` | `const treeResult = await getDirectoryTreeTool({ path: projectPath, maxDepth: 2 });`
- `aily-blockly/src/app/services/npm.service.ts:119` | `threshold_literal` | `// this.uiService.updateFooterState({ state: 'doing', text: this.translate.instant('NPM.INSTALLING', { name: board.name }), timeout: 300000 });`
- `aily-blockly/src/app/services/npm.service.ts:194` | `threshold_literal` | `// this.uiService.updateFooterState({ state: 'doing', text: this.translate.instant('NPM.INSTALLING_DEPENDENCY', { name: key }), timeout: 300000 });`
- `aily-blockly/src/app/services/npm.service.ts:288` | `threshold_literal` | `// this.uiService.updateFooterState({ state: 'doing', text: this.translate.instant('NPM.UNINSTALLING_UNUSED_DEPS'), timeout: 300000 });`
- `aily-blockly/src/app/services/npm.service.ts:357` | `threshold_literal` | `// this.uiService.updateFooterState({ state: 'doing', text: this.translate.instant('NPM.UNINSTALLING', { name: board.name }), timeout: 300000 });`
- `aily-blockly/src/app/services/npm.service.ts:390` | `threshold_literal` | `// this.uiService.updateFooterState({ state: 'doing', text: this.translate.instant('NPM.INSTALLING', { name: packageInfo.name }), timeout: 300000 });`
- `aily-blockly/src/app/services/npm.service.ts:466` | `threshold_literal` | `// this.uiService.updateFooterState({ state: 'doing', text: this.translate.instant('NPM.UNINSTALLING', { name: packageInfo.name }), timeout: 300000 });`
- `aily-blockly/src/app/services/settings.service.ts:271` | `threshold_literal` | `timeout: 1000 * 60 * 5,`
- `aily-blockly/src/app/services/settings.service.ts:298` | `threshold_literal` | `timeout: 1000 * 60 * 5,`
- `aily-blockly/src/app/services/sscma-command.service.ts:279` | `threshold_literal` | `const maxBufferSize = 500 * 1024; // 500KB`
- `aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts:5630` | `threshold_literal` | `const maxAttempts = 20; // 尝试20次（约2秒）`
- `aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts:5677` | `threshold_literal` | `const threshold = 30; // 减小容差值，提高检测精度`
- `aily-blockly/src/app/tools/aily-chat/components/aily-board-viewer/aily-board-viewer.component.ts:36` | `threshold_literal` | `private retryCount = 0;`
- `aily-blockly/src/app/tools/aily-chat/components/aily-board-viewer/aily-board-viewer.component.ts:37` | `threshold_literal` | `private readonly MAX_RETRY = 3;`
- `aily-blockly/src/app/tools/aily-chat/components/aily-board-viewer/aily-board-viewer.component.ts:97` | `threshold_literal` | `this.retryCount = 0;`
- `aily-blockly/src/app/tools/aily-chat/components/aily-library-viewer/aily-library-viewer.component.ts:38` | `threshold_literal` | `private retryCount = 0;`
- `aily-blockly/src/app/tools/aily-chat/components/aily-library-viewer/aily-library-viewer.component.ts:39` | `threshold_literal` | `private readonly MAX_RETRY = 3;`
- `aily-blockly/src/app/tools/aily-chat/components/aily-library-viewer/aily-library-viewer.component.ts:95` | `threshold_literal` | `this.retryCount = 0;`
- `aily-blockly/src/app/tools/aily-chat/components/aily-mermaid-viewer/aily-mermaid-viewer.component.ts:46` | `threshold_literal` | `private readonly MAX_RETRY = 3;`
- `aily-blockly/src/app/tools/aily-chat/components/aily-mermaid-viewer/mermaid/mermaid.component.ts:36` | `threshold_literal` | `readonly MIN_SCALE = 0.1;`
- `aily-blockly/src/app/tools/aily-chat/components/aily-mermaid-viewer/mermaid/mermaid.component.ts:37` | `threshold_literal` | `readonly MAX_SCALE = 5;`
- `aily-blockly/src/app/tools/aily-chat/components/aily-think-viewer/aily-think-viewer.component.ts:119` | `threshold_literal` | `const maxHeight = 200; // 与 CSS 中的 max-height 一致`
- `aily-blockly/src/app/tools/aily-chat/components/settings/settings.component.ts:488` | `secret_literal` | `apiKey: 'https://example.com/help/api-key'`
- `aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-board-viewer/x-aily-board-viewer.component.ts:93` | `threshold_literal` | `private retryCount = 0;`
- `aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-board-viewer/x-aily-board-viewer.component.ts:94` | `threshold_literal` | `private readonly MAX_RETRY = 3;`
- `aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-board-viewer/x-aily-board-viewer.component.ts:124` | `threshold_literal` | `this.retryCount = 0;`
- `aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-board-viewer/x-aily-board-viewer.component.ts:143` | `threshold_literal` | `this.retryTimer = setTimeout(() => { this.retryCount = 0; fn(); }, 300 * this.retryCount);`
- `aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-board-viewer/x-aily-board-viewer.component.ts:146` | `threshold_literal` | `this.retryCount = 0;`
- `aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-library-viewer/x-aily-library-viewer.component.ts:111` | `threshold_literal` | `private retryCount = 0;`
- `aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-library-viewer/x-aily-library-viewer.component.ts:112` | `threshold_literal` | `private readonly MAX_RETRY = 3;`
- ... truncated 704 additional finding(s)

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
- `workspace.cursor_folder_docs` | `fail` | Missing .cursor/.folder.md or .cursor/rules/.folder.md.
- `workspace.agents_entry` | `pass` | AGENTS.md entry exists.
- `workspace.copilot_entry` | `pass` | Copilot instruction file exists.
- `architecture.low_coupling_high_cohesion` | `manual` | Requires semantic review; cannot be safely auto-verified.
- `architecture.no_feature_overlap` | `manual` | Requires domain-level overlap inspection; reported for manual review.
- `automation.hardcoding_scan` | `fail` | 824 hardcoding finding(s) detected.

## Planned Changes
- `workspace:.cursor/rules/.folder.md` | `create` | `folder_plan_sync`
- `workspace:.cursor/rules/vibe-component-reuse.mdc` | `create` | `create_component_reuse_rule`
- `workspace:.cursor/rules/vibe-doc-sync.mdc` | `create` | `create_doc_sync_rule`
- `workspace:.cursor/rules/vibe-engineering.mdc` | `create` | `create_engineering_rule`
- `workspace:.cursor/rules/vibe-loading.mdc` | `create` | `create_loading_rule`
- `workspace:.folder.md` | `create` | `folder_plan_sync`
- `workspace:.github/.folder.md` | `create` | `folder_plan_sync`
- `workspace:.github/copilot-instructions.md` | `update` | `create_copilot_instructions`
- `workspace:.specify/.folder.md` | `create` | `folder_plan_sync`
- `workspace:.specify/memory/.folder.md` | `create` | `folder_plan_sync`
- `workspace:.specify/scripts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:.specify/scripts/bash/.folder.md` | `create` | `folder_plan_sync`
- `workspace:.specify/scripts/bash/check-prerequisites.sh` | `update` | `header_sync`
- `workspace:.specify/scripts/bash/common.sh` | `update` | `header_sync`
- `workspace:.specify/scripts/bash/create-new-feature.sh` | `update` | `header_sync`
- `workspace:.specify/scripts/bash/setup-plan.sh` | `update` | `header_sync`
- `workspace:.specify/scripts/bash/update-agent-context.sh` | `update` | `header_sync`
- `workspace:.specify/templates/.folder.md` | `create` | `folder_plan_sync`
- `workspace:.vscode/.folder.md` | `create` | `folder_plan_sync`
- `workspace:AGENTS.md` | `update` | `create_agents_doc`
- `workspace:CLAUDE.md` | `update` | `claude_pointer_sync`
- `workspace:aily-blockly/.agents/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.agents/skills/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.agents/skills/speckit-analyze/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.agents/skills/speckit-checklist/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.agents/skills/speckit-clarify/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.agents/skills/speckit-constitution/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.agents/skills/speckit-implement/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.agents/skills/speckit-plan/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.agents/skills/speckit-specify/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.agents/skills/speckit-tasks/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.agents/skills/speckit-taskstoissues/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.angular/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.angular/cache/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.github/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.github/ISSUE_TEMPLATE/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.github/workflows/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.github/workflows/main.yml` | `update` | `header_sync`
- `workspace:aily-blockly/.signpath/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.specify/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.specify/memory/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.specify/scripts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.specify/scripts/bash/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.specify/scripts/bash/check-prerequisites.sh` | `update` | `header_sync`
- `workspace:aily-blockly/.specify/scripts/bash/common.sh` | `update` | `header_sync`
- `workspace:aily-blockly/.specify/scripts/bash/create-new-feature.sh` | `update` | `header_sync`
- `workspace:aily-blockly/.specify/scripts/bash/setup-plan.sh` | `update` | `header_sync`
- `workspace:aily-blockly/.specify/scripts/bash/update-agent-context.sh` | `update` | `header_sync`
- `workspace:aily-blockly/.specify/templates/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.tesseract-runtime/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.tesseract-runtime/backend/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.tesseract-runtime/n8n/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/.vscode/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/child/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/docs/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/docs/design-docs/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/docs/exec-plans/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/docs/exec-plans/active/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/docs/exec-plans/completed/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/docs/generated/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/docs/generated/scenes/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/docs/product-specs/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/docs/references/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/electron/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/electron/app-update.yml` | `update` | `header_sync`
- `workspace:aily-blockly/electron/cmd.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/config.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/config/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/electron/dev-app-update.yml` | `update` | `header_sync`
- `workspace:aily-blockly/electron/download-ripgrep.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/logger.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/main.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/mcp.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/n8n-cli-bootstrap.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/n8n-runtime.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/notification.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/npm.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/platform.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/preload.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/renderer-path.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/ripgrep.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/runtime-utils.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/serial.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/terminal.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/tesseract-ipc.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/tesseract-runtime.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/tools.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/types/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/electron/types/config.ts` | `create` | `header_sync`
- `workspace:aily-blockly/electron/updater.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/upload.js` | `update` | `header_sync`
- `workspace:aily-blockly/electron/vendor/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/electron/vendor/ripgrep/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/electron/vendor/ripgrep/arm64-darwin/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/electron/vendor/ripgrep/ia32-win32/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/electron/vendor/ripgrep/x64-darwin/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/electron/vendor/ripgrep/x64-linux/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/electron/vendor/ripgrep/x64-win32/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/electron/window.js` | `update` | `header_sync`
- `workspace:aily-blockly/img/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/brands/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/cores/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/fonts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/fonts/fontawesome6/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/fonts/fontawesome6/css/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/fonts/fontawesome6/webfonts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/fonts/iconfont/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/fonts/iconfont/iconfont.js` | `update` | `header_sync`
- `workspace:aily-blockly/public/i18n/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/i18n/ar/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/i18n/de/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/i18n/en/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/i18n/es/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/i18n/fr/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/i18n/ja/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/i18n/ko/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/i18n/pt/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/i18n/ru/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/i18n/zh_cn/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/i18n/zh_hk/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/imgs/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/model/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/sponsor/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/sponsor/diandeng/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/sponsor/emakefun/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/sponsor/keyes/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/sponsor/openjumper/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/sponsor/other/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/sponsor/pengde/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/sponsor/seeedstudio/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/sponsor/seekfree/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/public/sponsor/titlab/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/scripts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/scripts/electron-dev.js` | `update` | `header_sync`
- `workspace:aily-blockly/scripts/fix-native-win32.js` | `update` | `header_sync`
- `workspace:aily-blockly/scripts/prepare-tesseract-runtime.js` | `update` | `header_sync`
- `workspace:aily-blockly/scripts/tesseract-smoke.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/app.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/app.config.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/app.routes.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/components/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/components/aily-blockly/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/components/aily-blockly/aily-blockly.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/components/aily-coding/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/components/aily-coding/aily-coding.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/components/base-dialog/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/components/base-dialog/base-dialog.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/components/feedback-dialog/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/components/feedback-dialog/feedback-dialog.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/components/float-sider/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/components/float-sider/float-sider.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/components/image-cropper/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/components/image-cropper/image-cropper.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/components/image-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/components/image-viewer/image-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/components/inner-window/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/components/inner-window/inner-window.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/components/login/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/components/login/altcha/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/components/login/altcha/altcha.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/components/login/login.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/components/menu/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/components/menu/menu.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/components/notification/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/components/notification/notification.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/components/onboarding/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/components/onboarding/onboarding.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/components/project-setting-dialog/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/components/project-setting-dialog/project-setting-dialog.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/components/save-project-modal/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/components/save-project-modal/save-project-modal.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/components/sub-window/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/components/sub-window/sub-window.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/components/tool-container/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/components/tool-container/tool-container.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/configs/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/configs/ai-config.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/configs/api.config.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/configs/board.config.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/configs/esp32.config.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/configs/menu.config.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/configs/nrf5.config.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/configs/onboarding.config.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/configs/stm32.config.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/configs/tool.config.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/blockly-editor.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/abf.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/blockly.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/components/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/components/image-upload-dialog/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/components/image-upload-dialog/converter.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/components/image-upload-dialog/image-upload-dialog.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/components/prompt-dialog/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/components/prompt-dialog/prompt-dialog.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-category.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-angle180.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-bitmap-u8g2.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-bitmap.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-code.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-image-preview.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-image.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-led-matrix.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-led-pattern-selector.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-multilineinput.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-slider.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/custom-field/field-tone.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/generators/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/generators/arduino/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/generators/arduino/arduino.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/generators/javascript/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/generators/javascript/javascript.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/generators/javascript/javascript/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/generators/javascript/javascript/javascript_generator.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/generators/javascript/javascript/lists.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/generators/javascript/javascript/logic.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/generators/javascript/javascript/loops.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/generators/javascript/javascript/math.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/generators/javascript/javascript/procedures.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/generators/javascript/javascript/text.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/generators/javascript/javascript/variables.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/generators/javascript/javascript/variables_dynamic.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/generators/micropython/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/generators/micropython/micropython.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/block-plus-minus/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/block-plus-minus/src/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/block-plus-minus/src/dynamic-inputs.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/block-plus-minus/src/field_minus.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/block-plus-minus/src/field_plus.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/block-plus-minus/src/if.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/block-plus-minus/src/index.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/block-plus-minus/src/list_create.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/block-plus-minus/src/procedures.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/block-plus-minus/src/serialization_helper.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/block-plus-minus/src/switch-case.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/block-plus-minus/src/text_join.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/continuous-toolbox/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/continuous-toolbox/src/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/continuous-toolbox/src/ContinuousCategory.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/continuous-toolbox/src/ContinuousFlyout.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/continuous-toolbox/src/ContinuousMetrics.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/continuous-toolbox/src/ContinuousMetricsFlyout.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/continuous-toolbox/src/ContinuousToolbox.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/continuous-toolbox/src/index.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/continuous-toolbox/test/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/continuous-toolbox/test/index.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/toolbox-search/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/toolbox-search/src/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/toolbox-search/src/block_searcher.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/toolbox-search/src/index.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/toolbox-search/src/toolbox_search.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/workspace-multiselect/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/workspace-multiselect/global.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/workspace-multiselect/index.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/workspace-multiselect/multiselect.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/workspace-multiselect/multiselect_contextmenu.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/workspace-multiselect/multiselect_controls.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/workspace-multiselect/multiselect_draggable.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/plugins/workspace-multiselect/multiselect_shortcut.js` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/renderer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/renderer/aily-icon/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/renderer/aily-icon/acon.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/renderer/aily-icon/icon.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/renderer/aily-icon/index.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/renderer/aily-thrasos/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/renderer/aily-thrasos/constant.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/renderer/aily-thrasos/drawer.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/renderer/aily-thrasos/info.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/renderer/aily-thrasos/path_object.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/renderer/aily-thrasos/renderer.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/renderer/aily-thrasos/thrasos.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/renderer/aily-zelos/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/renderer/aily-zelos/constant.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/renderer/aily-zelos/renderer.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/renderer/aily-zelos/zelos.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/blockly/theme.config.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/compatible-dialog/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/compatible-dialog/compatible-dialog.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/dev-tool/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/dev-tool/dev-tool.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/history-dialog/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/history-dialog/history-dialog.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/lib-manager/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/components/lib-manager/lib-manager.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/services/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/services/bitmap-upload.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/services/blockly.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/services/builder.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/services/history.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/services/project.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/services/uploader.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/shortcut.service.ts` | `create` | `header_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/tools/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/tools/code-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/blockly-editor/tools/code-viewer/code-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/code-editor/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/code-editor/code-editor.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/code-editor/components/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/code-editor/components/delete-dialog/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/code-editor/components/delete-dialog/delete-dialog.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/code-editor/components/file-tree/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/code-editor/components/file-tree/file-tree.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/code-editor/components/file-tree/menu.config.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/code-editor/components/monaco-editor/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/code-editor/components/monaco-editor/monaco-editor.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/code-editor/services/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/code-editor/services/builder.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/code-editor/services/file.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/code-editor/services/project.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/code-editor/services/shortcut.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/code-editor/tools/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/code-editor/tools/lib-manager/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/code-editor/tools/lib-manager/lib-manager.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/tesseract-studio/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/editors/tesseract-studio/tesseract-studio.component.spec.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/editors/tesseract-studio/tesseract-studio.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/func/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/func/func.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/interceptors/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/interceptors/auth.interceptor.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/main-window/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/main-window/components/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/main-window/components/act-btn/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/main-window/components/act-btn/act-btn.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/main-window/components/board-selector-dialog/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/main-window/components/board-selector-dialog/board-selector-dialog.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/main-window/components/footer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/main-window/components/footer/footer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/main-window/components/header/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/main-window/components/header/header.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/main-window/components/login-dialog/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/main-window/components/login-dialog/login-dialog.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/main-window/components/unsave-dialog/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/main-window/components/unsave-dialog/unsave-dialog.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/main-window/components/update-dialog/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/main-window/components/update-dialog/update-dialog.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/main-window/main-window.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/pages/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/pages/guide/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/pages/guide/guide.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/pages/playground/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/pages/playground/example-list/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/pages/playground/example-list/example-list.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/pages/playground/playground.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/pages/playground/playground.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/pages/playground/subject-item/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/pages/playground/subject-item/subject-item.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/pages/playground/subject-list/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/pages/playground/subject-list/subject-list.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/pages/project-new/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/pages/project-new/components/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/pages/project-new/components/brand-list/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/pages/project-new/components/brand-list/brand-list.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/pages/project-new/components/chip-filter/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/pages/project-new/components/chip-filter/chip-filter.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/pages/project-new/components/chip-list/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/pages/project-new/components/chip-list/chip-list.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/pages/project-new/project-new.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/pages/project-new/sequential-img.directive.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/services/action.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/at-command.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/auth.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/background-agent.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/builder.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/cmd.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/config.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/connection-aws/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/services/connection-aws/aws-converter.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/connection-aws/aws-generator.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/connection-aws/aws-parser.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/connection-aws/aws-types.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/connection-aws/index.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/connection-aws/pin-resolver.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/connection-graph.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/converter.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/cross-platform-cmd.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/electron.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/esploader.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/esptool-py.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/feedback.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/firmware.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/hardware-runtime.service.spec.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/hardware-runtime.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/iwindow.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/log.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/model-project.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/model-train.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/notice.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/npm.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/onboarding.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/platform.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/project.service.spec.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/project.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/serial.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/settings.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/sscma-command.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/tesseract-project.service.spec.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/tesseract-project.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/tesseract-skill-library.service.spec.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/tesseract-skill-library.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/translation.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/ui.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/update.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/uploader.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/services/workflow.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/chat.example.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-blockly-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-blockly-viewer/aily-blockly-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-board-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-board-viewer/aily-board-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-button-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-button-viewer/aily-button-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-context-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-context-viewer/aily-context-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-error-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-error-viewer/aily-error-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-library-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-library-viewer/aily-library-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-mermaid-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-mermaid-viewer/aily-mermaid-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-mermaid-viewer/mermaid/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-mermaid-viewer/mermaid/mermaid.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-state-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-state-viewer/aily-state-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-task-action-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-task-action-viewer/aily-task-action-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-think-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/aily-think-viewer/aily-think-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/chat-delete-dialog/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/chat-delete-dialog/chat-delete-dialog.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/chat-rename-dialog/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/chat-rename-dialog/chat-rename-dialog.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/dialog/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/dialog/dialog.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/floating-todo/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/floating-todo/floating-todo.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/settings/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/settings/settings.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/aily-chat-code.component.spec.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/aily-chat-code.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-blockly-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-blockly-viewer/x-aily-blockly-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-board-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-board-viewer/x-aily-board-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-button-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-button-viewer/x-aily-button-viewer.component.spec.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-button-viewer/x-aily-button-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-code-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-code-viewer/x-aily-code-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-component-recommendation-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-component-recommendation-viewer/x-aily-component-recommendation-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-config-guide-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-config-guide-viewer/x-aily-config-guide-viewer.component.spec.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-config-guide-viewer/x-aily-config-guide-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-context-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-context-viewer/x-aily-context-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-default-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-default-viewer/x-aily-default-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-dialogue-mode-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-dialogue-mode-viewer/x-aily-dialogue-mode-viewer.component.spec.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-dialogue-mode-viewer/x-aily-dialogue-mode-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-error-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-error-viewer/x-aily-error-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-library-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-library-viewer/x-aily-library-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-mermaid-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-mermaid-viewer/x-aily-mermaid-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-state-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-state-viewer/x-aily-state-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-task-action-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-task-action-viewer/x-aily-task-action-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-think-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-think-viewer/x-aily-think-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-workflow-blueprint-viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-workflow-blueprint-viewer/x-aily-workflow-blueprint-viewer.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-dialog.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/directives/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/directives/aily-dynamic-component.directive.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/mcp/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/pipes/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/pipes/markdown.pipe.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/abs-auto-sync.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/aily-chat-config.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/arduino-lint.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/audit-log.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/block-definition.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/chat-history.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/chat.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/command-security.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/context-budget.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/dialogue-hardware-bridge.service.spec.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/dialogue-hardware-bridge.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/index.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/lintService.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/mcp.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/repetition-detection.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/security-context.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/security.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/speech.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/subagent-session.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/tesseract-agent-response-adapter.spec.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/tesseract-agent-response-adapter.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/tesseract-chat.service.spec.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/tesseract-chat.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/tesseract-dialogue.models.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/todoContext.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/services/todoUpdate.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/abiAbsConverter.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/absParser.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/absVersionControlTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/arduinoSyntaxTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/askApprovalTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/atomicBlockTools.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/blockAnalyzer.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/blockConfigFixer.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/checkExistsTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/connectionGraphTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/createFileTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/createFolderTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/createProjectTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/deleteFileTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/deleteFolderTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/editAbiFileTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/editBlockTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/editFileTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/executeCommandTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/fetchTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/fileOperationsTestSuite.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/fileOperationsTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/getAbsSyntaxTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/getBoardParametersTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/getContextTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/getDirectoryTreeTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/getHardwareCategoriesTools.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/getProjectInfoTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/globTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/grepTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/index.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/intelligentBlockAssistant.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/listDirectoryTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/readFileTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/reloadAbiJsonTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/searchBoardsLibrariesTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/services/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/services/templateCacheService.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/syncAbsFileTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/todoWriteTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/tools.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/tools/webSearchTool.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/utils/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/aily-chat/utils/todoStorage.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/app-store/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/app-store/app-store.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/app-store/app-store.config.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/app-store/app-store.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/cloud-space/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/cloud-space/cloud-space.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/cloud-space/editor/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/cloud-space/editor/editor.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/cloud-space/services/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/cloud-space/services/cloud.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/data-chart/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/data-chart/data-chart.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/data-chart/sample-data.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/history-version/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/history-version/history-version.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/log/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/log/ansi.pipe.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/log/log.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/model-store/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/model-store/model-constants.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/model-store/model-detail/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/model-store/model-detail/model-detail.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/model-store/model-store.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/model-store/model-store.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/data-item/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/data-item/add-newline.pipe.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/data-item/data-item.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/data-item/show-hex.pipe.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/data-item/show-nr.pipe.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/history-message-list/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/history-message-list/history-message-list.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/quick-send-editor/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/quick-send-editor/quick-send-editor.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/quick-send-list/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/quick-send-list/quick-send-list.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/search-box/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/search-box/search-box.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/serial-chart/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/serial-chart/serial-chart.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/setting-more/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/setting-more/setting-more.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/widget-data/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/components/widget-data/widget-data.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/config.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/right-menu.config.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/serial-monitor.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/serial-monitor.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/serial-monitor/test-data.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/simulator/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/simulator/simulator-editor/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/simulator/simulator-editor/simulator-editor.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/simulator/simulator-editor/simulator.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/simulator/simulator.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/skill-center/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/skill-center/skill-center.component.spec.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/skill-center/skill-center.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/terminal/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/terminal/terminal.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/terminal/terminal.service.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/tools/user-center/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/tools/user-center/user-center.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/types/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/types/electron.d.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/utils/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/utils/blockly_updater.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/utils/builder.utils.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/utils/esp-flash.utils.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/utils/global-chat.utils.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/utils/img.utils.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/windows/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/windows/about/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/windows/about/about.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/windows/iframe/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/windows/iframe/iframe.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/windows/model-deploy/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/windows/model-deploy/model-deploy.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/windows/model-deploy/sscma-config/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/windows/model-deploy/sscma-config/sscma-config.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/windows/model-deploy/sscma-deploy/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/windows/model-deploy/sscma-deploy/sscma-deploy.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/windows/model-train/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/windows/model-train/model-train.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/windows/model-train/vision-train/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/windows/model-train/vision-train/classification-train/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/windows/model-train/vision-train/classification-train/classification-train.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/windows/model-train/vision-train/detection-train/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/windows/model-train/vision-train/detection-train/detection-train.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/windows/model-train/vision-train/vision-train.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/windows/project-new/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/windows/project-new/project-new.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/windows/settings/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/windows/settings/settings.component.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/app/workers/.folder.md` | `create` | `folder_plan_sync`
- `workspace:aily-blockly/src/app/workers/model-train.worker.ts` | `update` | `header_sync`
- `workspace:aily-blockly/src/main.ts` | `update` | `header_sync`
- `workspace:backend/.claude/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/.claude/agents/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/.github/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/.github/FUNDING.yml` | `update` | `header_sync`
- `workspace:backend/.github/gh-pages.yml` | `update` | `header_sync`
- `workspace:backend/.github/secret_scanning.yml` | `update` | `header_sync`
- `workspace:backend/.github/workflows/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/.github/workflows/benchmark-pr.yml` | `update` | `header_sync`
- `workspace:backend/.github/workflows/benchmark.yml` | `update` | `header_sync`
- `workspace:backend/.github/workflows/dependency-check.yml` | `update` | `header_sync`
- `workspace:backend/.github/workflows/docker-build-fast.yml` | `update` | `header_sync`
- `workspace:backend/.github/workflows/docker-build-n8n.yml` | `update` | `header_sync`
- `workspace:backend/.github/workflows/docker-build.yml` | `update` | `header_sync`
- `workspace:backend/.github/workflows/release.yml` | `update` | `header_sync`
- `workspace:backend/.github/workflows/test.yml` | `update` | `header_sync`
- `workspace:backend/.github/workflows/update-n8n-deps.yml` | `update` | `header_sync`
- `workspace:backend/.serena/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/.serena/project.yml` | `update` | `header_sync`
- `workspace:backend/_config.yml` | `update` | `header_sync`
- `workspace:backend/apps/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/apps/agent-ui/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/apps/agent-ui/eslint.config.js` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/postcss.config.js` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/public/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/apps/agent-ui/src/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/apps/agent-ui/src/App.tsx` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/assets/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/apps/agent-ui/src/components/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/apps/agent-ui/src/components/AIHealthLab.test.tsx` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/components/AIHealthLab.tsx` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/components/BuildProgressBar.test.tsx` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/components/BuildProgressBar.tsx` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/components/ChatInterface.test.tsx` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/components/ChatInterface.tsx` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/components/HardwareTwinPlaceholder.tsx` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/components/Header.test.tsx` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/components/Header.tsx` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/components/InteractionCard.test.tsx` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/components/InteractionCard.tsx` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/components/N8nIframe.test.tsx` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/components/N8nIframe.tsx` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/components/SystemLogPlaceholder.tsx` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/hooks/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/apps/agent-ui/src/hooks/useAgentChat.ts` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/lib/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/apps/agent-ui/src/lib/agentApi.ts` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/lib/runtimeStatusView.ts` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/main.tsx` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/test/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/apps/agent-ui/src/test/setup.ts` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/src/vite-env.d.ts` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/tailwind.config.js` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/vite.config.ts` | `update` | `header_sync`
- `workspace:backend/apps/agent-ui/vitest.config.ts` | `update` | `header_sync`
- `workspace:backend/codecov.yml` | `update` | `header_sync`
- `workspace:backend/codex/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/data/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/data/logs/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/data/skills/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/deploy/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/deploy/docker-compose.buildkit.yml` | `update` | `header_sync`
- `workspace:backend/deploy/docker-compose.extract.yml` | `update` | `header_sync`
- `workspace:backend/deploy/docker-compose.n8n.yml` | `update` | `header_sync`
- `workspace:backend/deploy/docker-compose.test-n8n.yml` | `update` | `header_sync`
- `workspace:backend/deploy/docker-compose.yml` | `update` | `header_sync`
- `workspace:backend/deploy/quick-deploy-n8n.sh` | `update` | `header_sync`
- `workspace:backend/deploy/vitest.config.benchmark.ts` | `update` | `header_sync`
- `workspace:backend/docker/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docker/docker-entrypoint.sh` | `update` | `header_sync`
- `workspace:backend/docker/parse-config.js` | `update` | `header_sync`
- `workspace:backend/docs/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/changelog/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/changelog/refactor-2/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/config_agent/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/decisions/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/decisions/refactor-2/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/decisions/refactor-3/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/decisions/refactor-3/example/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/decisions/refactor-4/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/decisions/refactor-5/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/deployment/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/deployment/frp_tools/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/deployment/frp_tools/frpc.toml` | `update` | `header_sync`
- `workspace:backend/docs/deployment/frp_tools/web.sh` | `update` | `header_sync`
- `workspace:backend/docs/deployment/guides/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/deployment/scripts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/deployment/web.sh` | `update` | `header_sync`
- `workspace:backend/docs/development/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/development/config-agent/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/development/refactor-2/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/development/scene/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/development/scene/emo/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/development/scene/game/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/development/scene/gesture/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/development/test1/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/getting-started/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/getting-started/guides/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/iterations/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/iterations/refactor-4/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/iterations/refactor-4/refactor4_parallel_tmux.sh` | `update` | `header_sync`
- `workspace:backend/docs/memory/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/memory/bank/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/memory/bank/entities/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/memory/daily/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/overview/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/overview/local-research/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/overview/local-research/img/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/overview/local-research/src/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/overview/refactor-legacy/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/overview/refactor-legacy/n8n/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/scripts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/scripts/refactor3_parallel_tmux.sh` | `update` | `header_sync`
- `workspace:backend/docs/scripts/restore-worktree-paths-for-wsl.sh` | `update` | `header_sync`
- `workspace:backend/docs/scripts/test-ssh-connection.sh` | `update` | `header_sync`
- `workspace:backend/docs/security/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/usage/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/usage/api/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/usage/workflow-inbox/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/docs/usage/workflow-inbox/json/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/examples/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/examples/enhanced-documentation-demo.js` | `update` | `header_sync`
- `workspace:backend/restart-agent-dev.sh` | `update` | `header_sync`
- `workspace:backend/scripts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/scripts/analyze-optimization.sh` | `update` | `header_sync`
- `workspace:backend/scripts/audit-schema-coverage.ts` | `update` | `header_sync`
- `workspace:backend/scripts/backfill-mutation-hashes.ts` | `update` | `header_sync`
- `workspace:backend/scripts/build-optimized.sh` | `update` | `header_sync`
- `workspace:backend/scripts/compare-benchmarks.js` | `update` | `header_sync`
- `workspace:backend/scripts/demo-optimization.sh` | `update` | `header_sync`
- `workspace:backend/scripts/deploy-http.sh` | `update` | `header_sync`
- `workspace:backend/scripts/deploy-to-vm.sh` | `update` | `header_sync`
- `workspace:backend/scripts/export-webhook-workflows.ts` | `update` | `header_sync`
- `workspace:backend/scripts/extract-changelog.js` | `update` | `header_sync`
- `workspace:backend/scripts/extract-from-docker.js` | `update` | `header_sync`
- `workspace:backend/scripts/extract-nodes-docker.sh` | `update` | `header_sync`
- `workspace:backend/scripts/extract-nodes-simple.sh` | `update` | `header_sync`
- `workspace:backend/scripts/format-benchmark-results.js` | `update` | `header_sync`
- `workspace:backend/scripts/generate-benchmark-stub.js` | `update` | `header_sync`
- `workspace:backend/scripts/generate-detailed-reports.js` | `update` | `header_sync`
- `workspace:backend/scripts/generate-initial-release-notes.js` | `update` | `header_sync`
- `workspace:backend/scripts/generate-release-notes.js` | `update` | `header_sync`
- `workspace:backend/scripts/generate-test-summary.js` | `update` | `header_sync`
- `workspace:backend/scripts/git/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/scripts/git/git-prune-merged-branches.sh` | `update` | `header_sync`
- `workspace:backend/scripts/http-bridge.js` | `update` | `header_sync`
- `workspace:backend/scripts/mcp-http-client.js` | `update` | `header_sync`
- `workspace:backend/scripts/migrate-nodes-fts.ts` | `update` | `header_sync`
- `workspace:backend/scripts/migrate-tool-docs.ts` | `update` | `header_sync`
- `workspace:backend/scripts/nginx-n8n-mcp.conf` | `update` | `header_sync`
- `workspace:backend/scripts/prebuild-fts5.ts` | `update` | `header_sync`
- `workspace:backend/scripts/prepare-release.js` | `update` | `header_sync`
- `workspace:backend/scripts/process-batch-metadata.ts` | `update` | `header_sync`
- `workspace:backend/scripts/publish-npm-quick.sh` | `update` | `header_sync`
- `workspace:backend/scripts/publish-npm.sh` | `update` | `header_sync`
- `workspace:backend/scripts/quick-test.ts` | `update` | `header_sync`
- `workspace:backend/scripts/run-benchmarks-ci.js` | `update` | `header_sync`
- `workspace:backend/scripts/sync-copilot-chat-to-memory.js` | `update` | `header_sync`
- `workspace:backend/scripts/sync-runtime-version.js` | `update` | `header_sync`
- `workspace:backend/scripts/test-ai-validation-debug.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-code-node-enhancements.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-code-node-fixes.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-docker-config.sh` | `update` | `header_sync`
- `workspace:backend/scripts/test-docker-fingerprint.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-docker-optimization.sh` | `update` | `header_sync`
- `workspace:backend/scripts/test-docker.sh` | `update` | `header_sync`
- `workspace:backend/scripts/test-empty-connection-validation.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-error-message-tracking.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-error-output-validation.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-error-validation.js` | `update` | `header_sync`
- `workspace:backend/scripts/test-essentials.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-expression-code-validation.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-expression-format-validation.js` | `update` | `header_sync`
- `workspace:backend/scripts/test-fts5-search.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-fuzzy-fix.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-fuzzy-simple.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-helpers-validation.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-http-search.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-http.sh` | `update` | `header_sync`
- `workspace:backend/scripts/test-jmespath-validation.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-multi-tenant-simple.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-multi-tenant.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-n8n-integration.sh` | `update` | `header_sync`
- `workspace:backend/scripts/test-node-info.js` | `update` | `header_sync`
- `workspace:backend/scripts/test-node-type-validation.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-nodes-base-prefix.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-operation-validation.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-optimized-docker.sh` | `update` | `header_sync`
- `workspace:backend/scripts/test-release-automation.js` | `update` | `header_sync`
- `workspace:backend/scripts/test-search-improvements.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-security.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-single-session.sh` | `update` | `header_sync`
- `workspace:backend/scripts/test-sqljs-triggers.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-structure-validation.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-telemetry-debug.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-telemetry-direct.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-telemetry-env.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-telemetry-integration.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-telemetry-no-select.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-telemetry-security.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-telemetry-simple.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-typeversion-validation.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-url-configuration.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-user-id-persistence.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-webhook-validation.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-workflow-insert.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-workflow-sanitizer.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-workflow-tracking-debug.ts` | `update` | `header_sync`
- `workspace:backend/scripts/test-workflow-versioning.ts` | `update` | `header_sync`
- `workspace:backend/scripts/update-and-publish-prep.sh` | `update` | `header_sync`
- `workspace:backend/scripts/update-n8n-deps.js` | `update` | `header_sync`
- `workspace:backend/scripts/update-readme-version.js` | `update` | `header_sync`
- `workspace:backend/scripts/vitest-benchmark-json-reporter.js` | `update` | `header_sync`
- `workspace:backend/scripts/vitest-benchmark-reporter.ts` | `update` | `header_sync`
- `workspace:backend/skills/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/skills/memory-bootstrap/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/skills/memory-bootstrap/references/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/skills/parallel-iteration-docs/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/skills/parallel-iteration-docs/references/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/skills/project-docs-bootstrap/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/skills/project-docs-bootstrap/agents/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/skills/project-docs-bootstrap/agents/openai.yaml` | `update` | `header_sync`
- `workspace:backend/skills/project-docs-bootstrap/references/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/skills/project-docs-bootstrap/scripts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/skills/project-docs-bootstrap/scripts/scaffold_docs.py` | `update` | `header_sync`
- `workspace:backend/src/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/agent-server/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/agent-server/agent-factory.ts` | `update` | `header_sync`
- `workspace:backend/src/agent-server/agent-service.ts` | `update` | `header_sync`
- `workspace:backend/src/agent-server/index.ts` | `update` | `header_sync`
- `workspace:backend/src/agent-server/runtime-status.ts` | `update` | `header_sync`
- `workspace:backend/src/agent-server/server.ts` | `update` | `header_sync`
- `workspace:backend/src/agent-server/websocket.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/agents/agent-config.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/agent-db-path.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/agent-db.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/agent-logger.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/agent-loop.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/allowed-node-types.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/capability-registry.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/component-composer.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/component-selector.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/config-agent-service.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/config-agent.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/config-workflow-orchestrator.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/db-maintenance.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/dialogue-mode/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/agents/dialogue-mode/dialogue-mode-catalog.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/dialogue-mode/dialogue-mode-router.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/dialogue-mode/dialogue-mode-service.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/dialogue-mode/hardware-validation.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/dialogue-mode/skill-library-repository.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/digital-twin-scene.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/evaluation/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/agents/evaluation/ground-truth-evaluator.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/hardware-capability-ids.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/hardware-component-aliases.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/hardware-components.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/hardware-service.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/intake-agent.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/llm-client.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/mcp-client.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/mqtt-hardware-runtime.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/node-type-versions.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/orchestrator-hints.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/orchestrator.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/orchestrator/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/agents/orchestrator/capability-discovery.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/orchestrator/response-builder.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/orchestrator/workflow-config-normalizer.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompt-copy.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/agents/prompts/architect-system.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/assembly-rules.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/category-mapping.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/context-fragment.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/error-patterns.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/few-shot-examples.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/fragments/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/agents/prompts/fragments/emotion-interaction-pattern.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/fragments/entity-multiplication.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/fragments/game-rps-pattern.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/fragments/naming-conventions.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/fragments/notes-spec.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/fragments/topology-patterns.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/node-dependency-rules.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/node-name-generator.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/node-templates.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/node-type-mapping.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/prompt-variants.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/result-branch-rules.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/sub-field-extractor.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/title-generator.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/prompts/workflow-components.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/reflection-assessment-parser.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/reflection-decision-policy.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/reflection-engine-hints.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/reflection-engine.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/reflection-prompt-builder.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/session-service.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/types.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/workflow-architect.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/workflow-architect/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/agents/workflow-architect/connection-utils.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/workflow-architect/gesture-identity-builder.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/workflow-architect/json-extractor.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/workflow-architect/node/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/agents/workflow-architect/node/node-rules.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/workflow-architect/node/normalizer.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/workflow-architect/node/notes-enricher.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/workflow-architect/node/topology-resolver.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/workflow-architect/prompt-context.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/workflow-architect/scene/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/agents/workflow-architect/scene/assign-flow.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/workflow-architect/scene/audio-repair-flow.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/workflow-architect/scene/emotion-flow.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/workflow-architect/scene/game-flow.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/workflow-architect/scene/gesture-identity-flow.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/workflow-architect/scene/result-flow.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/workflow-architect/scene/safety-net-controls.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/workflow-architect/token-budget.ts` | `update` | `header_sync`
- `workspace:backend/src/agents/workflow-service.ts` | `update` | `header_sync`
- `workspace:backend/src/config/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/config/n8n-api.ts` | `update` | `header_sync`
- `workspace:backend/src/constants/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/constants/type-structures.ts` | `update` | `header_sync`
- `workspace:backend/src/database/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/database/database-adapter.ts` | `update` | `header_sync`
- `workspace:backend/src/database/migrations/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/database/migrations/add-agent-tables.sql` | `update` | `header_sync`
- `workspace:backend/src/database/migrations/add-template-node-configs.sql` | `update` | `header_sync`
- `workspace:backend/src/database/node-repository.ts` | `update` | `header_sync`
- `workspace:backend/src/database/schema-optimized.sql` | `update` | `header_sync`
- `workspace:backend/src/database/schema.sql` | `update` | `header_sync`
- `workspace:backend/src/errors/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/errors/validation-service-error.ts` | `update` | `header_sync`
- `workspace:backend/src/http-server-single-session.ts` | `update` | `header_sync`
- `workspace:backend/src/http-server.ts` | `update` | `header_sync`
- `workspace:backend/src/index.ts` | `update` | `header_sync`
- `workspace:backend/src/loaders/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/loaders/node-loader.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp-engine.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp-tools-engine.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/mcp/handlers-n8n-manager.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/handlers-workflow-diff.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/index.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/server.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/stdio-wrapper.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/mcp/tool-docs/configuration/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/mcp/tool-docs/configuration/get-node-docs.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/configuration/get-node-versions.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/configuration/get-node.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/configuration/index.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/configuration/search-node-properties.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/discovery/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/mcp/tool-docs/discovery/index.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/discovery/search-nodes.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/guides/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/mcp/tool-docs/guides/ai-agents-guide.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/guides/index.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/index.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/system/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/mcp/tool-docs/system/index.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/system/n8n-diagnostic.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/system/n8n-health-check.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/system/n8n-list-available-tools.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/system/tools-documentation.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/types.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/validation/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/mcp/tool-docs/validation/index.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/validation/validate-node.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/validation/validate-workflow.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/workflow_management/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/mcp/tool-docs/workflow_management/index.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/workflow_management/n8n-autofix-workflow.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/workflow_management/n8n-create-workflow.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/workflow_management/n8n-delete-workflow.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/workflow_management/n8n-executions.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/workflow_management/n8n-get-workflow.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/workflow_management/n8n-list-workflows.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/workflow_management/n8n-test-workflow.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/workflow_management/n8n-update-full-workflow.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/workflow_management/n8n-update-partial-workflow.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tool-docs/workflow_management/n8n-validate-workflow.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tools-documentation.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tools-n8n-friendly.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tools-n8n-manager.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/tools.ts` | `update` | `header_sync`
- `workspace:backend/src/mcp/workflow-examples.ts` | `update` | `header_sync`
- `workspace:backend/src/parsers/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/parsers/node-parser.ts` | `update` | `header_sync`
- `workspace:backend/src/parsers/property-extractor.ts` | `update` | `header_sync`
- `workspace:backend/src/parsers/simple-parser.ts` | `update` | `header_sync`
- `workspace:backend/src/scripts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/scripts/agent-db-init.ts` | `update` | `header_sync`
- `workspace:backend/src/scripts/rebuild.ts` | `update` | `header_sync`
- `workspace:backend/src/scripts/validate.ts` | `update` | `header_sync`
- `workspace:backend/src/services/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/services/config-validator.ts` | `update` | `header_sync`
- `workspace:backend/src/services/enhanced-config-validator.ts` | `update` | `header_sync`
- `workspace:backend/src/services/example-generator.ts` | `update` | `header_sync`
- `workspace:backend/src/services/expression-format-validator.ts` | `update` | `header_sync`
- `workspace:backend/src/services/expression-validator.ts` | `update` | `header_sync`
- `workspace:backend/src/services/n8n-api-client.ts` | `update` | `header_sync`
- `workspace:backend/src/services/n8n-validation.ts` | `update` | `header_sync`
- `workspace:backend/src/services/n8n-version.ts` | `update` | `header_sync`
- `workspace:backend/src/services/node-specific-validators.ts` | `update` | `header_sync`
- `workspace:backend/src/services/property-dependencies.ts` | `update` | `header_sync`
- `workspace:backend/src/services/property-filter.ts` | `update` | `header_sync`
- `workspace:backend/src/services/task-templates.ts` | `update` | `header_sync`
- `workspace:backend/src/services/type-structure-service.ts` | `update` | `header_sync`
- `workspace:backend/src/services/unified-validator.ts` | `update` | `header_sync`
- `workspace:backend/src/services/universal-expression-validator.ts` | `update` | `header_sync`
- `workspace:backend/src/services/workflow-auto-fixer.ts` | `update` | `header_sync`
- `workspace:backend/src/services/workflow-diff-engine.ts` | `update` | `header_sync`
- `workspace:backend/src/services/workflow-validator.ts` | `update` | `header_sync`
- `workspace:backend/src/types/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/types/index.ts` | `update` | `header_sync`
- `workspace:backend/src/types/instance-context.ts` | `update` | `header_sync`
- `workspace:backend/src/types/n8n-api.ts` | `update` | `header_sync`
- `workspace:backend/src/types/node-types.ts` | `update` | `header_sync`
- `workspace:backend/src/types/session-state.ts` | `update` | `header_sync`
- `workspace:backend/src/types/type-structures.ts` | `update` | `header_sync`
- `workspace:backend/src/types/workflow-diff.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/src/utils/auth.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/cache-utils.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/code-node-parameters.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/console-manager.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/error-handler.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/example-generator.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/expression-utils.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/fixed-collection-validator.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/logger.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/n8n-errors.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/node-classification.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/node-notes.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/node-type-normalizer.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/node-type-utils.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/node-utils.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/protocol-version.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/simple-cache.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/validation-schemas.ts` | `update` | `header_sync`
- `workspace:backend/src/utils/version.ts` | `update` | `header_sync`
- `workspace:backend/tests/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/__snapshots__/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/auth.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/benchmarks/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/benchmarks/index.ts` | `update` | `header_sync`
- `workspace:backend/tests/benchmarks/mcp-tools.bench.ts` | `update` | `header_sync`
- `workspace:backend/tests/comprehensive-extraction-test.js` | `update` | `header_sync`
- `workspace:backend/tests/data/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/debug-slack-doc.js` | `update` | `header_sync`
- `workspace:backend/tests/demo-enhanced-documentation.js` | `update` | `header_sync`
- `workspace:backend/tests/e2e/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/e2e/agent-workflow.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/e2e/config-agent-flow.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/error-handler.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/extracted-nodes-db/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/extracted-nodes-db/insert-nodes.sql` | `update` | `header_sync`
- `workspace:backend/tests/factories/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/factories/node-factory.ts` | `update` | `header_sync`
- `workspace:backend/tests/factories/property-definition-factory.ts` | `update` | `header_sync`
- `workspace:backend/tests/fixtures/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/fixtures/agent/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/fixtures/database/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/fixtures/factories/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/fixtures/factories/node.factory.ts` | `update` | `header_sync`
- `workspace:backend/tests/fixtures/factories/parser-node.factory.ts` | `update` | `header_sync`
- `workspace:backend/tests/helpers/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/helpers/env-helpers.ts` | `update` | `header_sync`
- `workspace:backend/tests/http-server-auth.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/integration/agent/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/integration/agent/agent-api.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/agent/agent-websocket.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/agent/config-agent-api.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/agents/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/integration/agents/ground-truth.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/agents/quality-baseline.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/agents/quality-gate.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/agents/safety-net-fixtures.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/agents/safety-net-matrix.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/ai-validation/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/integration/ai-validation/ai-agent-validation.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/ai-validation/ai-tool-validation.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/ai-validation/chat-trigger-validation.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/ai-validation/e2e-validation.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/ai-validation/helpers.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/ai-validation/llm-chain-validation.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/database/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/integration/database/connection-management.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/database/node-fts5-search.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/database/node-repository.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/database/sqljs-memory-leak.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/database/test-utils.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/database/transactions.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/docker/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/integration/docker/docker-config.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/docker/docker-entrypoint.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/docker/test-helpers.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/flexible-instance-config.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/mcp-protocol/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/integration/mcp-protocol/basic-connection.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/mcp-protocol/error-handling.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/mcp-protocol/performance.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/mcp-protocol/protocol-compliance.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/mcp-protocol/session-management.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/mcp-protocol/test-helpers.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/mcp-protocol/tool-invocation.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/mcp-protocol/workflow-error-validation.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/msw-setup.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/integration/n8n-api/executions/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/integration/n8n-api/executions/delete-execution.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/executions/get-execution.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/executions/list-executions.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/executions/trigger-webhook.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/scripts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/integration/n8n-api/scripts/cleanup-orphans.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/system/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/integration/n8n-api/system/diagnostic.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/system/health-check.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/test-connection.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/types/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/integration/n8n-api/types/mcp-responses.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/utils/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/integration/n8n-api/utils/cleanup-helpers.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/utils/credentials.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/utils/factories.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/utils/fixtures.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/utils/mcp-context.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/utils/n8n-availability.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/utils/n8n-client.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/utils/node-repository.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/utils/response-types.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/utils/test-context.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/utils/webhook-workflows.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/workflows/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/integration/n8n-api/workflows/autofix-workflow.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/workflows/create-workflow.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/workflows/delete-workflow.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/workflows/get-workflow-details.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/workflows/get-workflow-minimal.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/workflows/get-workflow-structure.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/workflows/get-workflow.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/workflows/list-workflows.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/workflows/smart-parameters.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/workflows/update-partial-workflow.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/workflows/update-workflow.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/n8n-api/workflows/validate-workflow.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/orchestrator-e2e.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/security/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/integration/security/rate-limiting.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/setup/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/integration/setup/integration-setup.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/setup/msw-test-server.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/workflow-creation-node-type-format.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/workflow-diff/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/integration/workflow-diff/ai-node-connection-validation.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/integration/workflow-diff/node-rename-integration.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/logger.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/mocks/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/mocks/n8n-api/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/mocks/n8n-api/data/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/mocks/n8n-api/data/credentials.ts` | `update` | `header_sync`
- `workspace:backend/tests/mocks/n8n-api/data/executions.ts` | `update` | `header_sync`
- `workspace:backend/tests/mocks/n8n-api/data/workflows.ts` | `update` | `header_sync`
- `workspace:backend/tests/mocks/n8n-api/handlers.ts` | `update` | `header_sync`
- `workspace:backend/tests/mocks/n8n-api/index.ts` | `update` | `header_sync`
- `workspace:backend/tests/setup/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/setup/global-setup.ts` | `update` | `header_sync`
- `workspace:backend/tests/setup/msw-setup.ts` | `update` | `header_sync`
- `workspace:backend/tests/setup/test-env.ts` | `update` | `header_sync`
- `workspace:backend/tests/test-database-extraction.js` | `update` | `header_sync`
- `workspace:backend/tests/test-direct-extraction.js` | `update` | `header_sync`
- `workspace:backend/tests/test-enhanced-documentation.js` | `update` | `header_sync`
- `workspace:backend/tests/test-enhanced-integration.js` | `update` | `header_sync`
- `workspace:backend/tests/test-mcp-extraction.js` | `update` | `header_sync`
- `workspace:backend/tests/test-mcp-server-extraction.js` | `update` | `header_sync`
- `workspace:backend/tests/test-mcp-tools-integration.js` | `update` | `header_sync`
- `workspace:backend/tests/test-node-documentation-service.js` | `update` | `header_sync`
- `workspace:backend/tests/test-node-list.js` | `update` | `header_sync`
- `workspace:backend/tests/test-package-info.js` | `update` | `header_sync`
- `workspace:backend/tests/test-parsing-operations.js` | `update` | `header_sync`
- `workspace:backend/tests/test-slack-node-complete.js` | `update` | `header_sync`
- `workspace:backend/tests/test-small-rebuild.js` | `update` | `header_sync`
- `workspace:backend/tests/test-sqlite-search.js` | `update` | `header_sync`
- `workspace:backend/tests/test-storage-system.js` | `update` | `header_sync`
- `workspace:backend/tests/unit/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/__mocks__/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/__mocks__/n8n-nodes-base.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/__mocks__/n8n-nodes-base.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agent-server/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/agent-server/agent-service.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agent-server/dialogue-mode-contract.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agent-server/http-server.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agent-server/runtime-status.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agent-server/websocket.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/agents/agent-config.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/agent-db.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/agent-logger.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/agent-loop.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/architect-system.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/capability-registry.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/component-composer.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/component-selector.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/config-agent.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/config-workflow-orchestrator.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/context-fragment.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/dialogue-mode/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/agents/dialogue-mode/skill-library-repository.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/digital-twin-scene.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/hardware-component-aliases.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/hardware-service.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/intake-agent.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/mcp-client.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/mqtt-hardware-runtime.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/mqtt-image-upload.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/node-dependency-rules.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/orchestrator.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/prompt-variants.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/refactor4-acceptance.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/reflection-assessment-parser.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/reflection-engine.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/reflection-prompt-builder.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/response-builder.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/result-branch-rules.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/safety-net-controls.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/session-service.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/title-generator.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/types.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/workflow-architect-prompt-context.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/workflow-architect-token-budget.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/workflow-architect.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/agents/workflow-deployer.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/constants/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/constants/type-structures.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/database/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/database/__mocks__/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/database/__mocks__/better-sqlite3.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/database/database-adapter-unit.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/database/node-repository-core.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/database/node-repository-operations.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/database/node-repository-outputs.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/docker/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/docker/config-security.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/docker/edge-cases.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/docker/parse-config.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/docker/serve-command.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/errors/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/errors/validation-service-error.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/examples/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/examples/using-n8n-nodes-base-mock.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/flexible-instance-security-advanced.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/flexible-instance-security.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/http-server-n8n-mode.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/http-server-n8n-reinit.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/http-server-session-management.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/http-server/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/http-server/multi-tenant-support.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/http-server/session-persistence.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/loaders/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/loaders/node-loader.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/mcp-engine/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/mcp-engine/session-persistence.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/mcp/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/mcp/handlers-n8n-manager-simple.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/mcp/handlers-n8n-manager.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/mcp/handlers-workflow-diff.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/mcp/lru-cache-behavior.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/mcp/tools-documentation.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/monitoring/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/monitoring/cache-metrics.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/multi-tenant-integration.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/parsers/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/parsers/node-parser-outputs.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/parsers/node-parser.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/parsers/property-extractor.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/parsers/simple-parser.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/services/config-validator-basic.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/config-validator-cnd.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/config-validator-edge-cases.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/config-validator-node-specific.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/config-validator-security.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/debug-validator.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/enhanced-config-validator-type-structures.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/enhanced-config-validator.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/example-generator.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/expression-format-validator.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/expression-validator-edge-cases.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/expression-validator.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/fixed-collection-validation.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/loop-output-edge-cases.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/n8n-api-client.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/n8n-validation-sticky-notes.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/n8n-validation.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/n8n-version.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/node-specific-validators.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/property-dependencies.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/property-filter-edge-cases.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/property-filter.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/task-templates.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/type-structure-service.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/unified-validator.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/universal-expression-validator.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/validation-fixes.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/workflow-auto-fixer.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/workflow-diff-engine.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/workflow-diff-node-rename.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/workflow-fixed-collection-validation.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/workflow-validator-comprehensive.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/workflow-validator-edge-cases.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/workflow-validator-error-outputs.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/workflow-validator-expression-format.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/workflow-validator-loops-simple.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/workflow-validator-loops.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/workflow-validator-mocks.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/workflow-validator-performance.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/workflow-validator-with-mocks.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/services/workflow-validator.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/test-env-example.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/test-infrastructure.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/types/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/types/instance-context-coverage.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/types/instance-context-multi-tenant.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/types/type-structures.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/utils/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/unit/utils/auth-timing-safe.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/utils/cache-utils.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/utils/console-manager.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/utils/expression-utils.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/utils/fixed-collection-validator.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/utils/n8n-errors.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/utils/node-classification.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/utils/node-type-normalizer.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/utils/node-type-utils.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/utils/node-utils.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/utils/simple-cache-memory-leak-fix.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/unit/validation-fixes.test.ts` | `update` | `header_sync`
- `workspace:backend/tests/utils/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/utils/assertions.ts` | `update` | `header_sync`
- `workspace:backend/tests/utils/builders/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/tests/utils/builders/workflow.builder.ts` | `update` | `header_sync`
- `workspace:backend/tests/utils/data-generators.ts` | `update` | `header_sync`
- `workspace:backend/tests/utils/database-utils.ts` | `update` | `header_sync`
- `workspace:backend/tests/utils/test-helpers.ts` | `update` | `header_sync`
- `workspace:backend/types/.folder.md` | `create` | `folder_plan_sync`
- `workspace:backend/types/mcp.d.ts` | `update` | `header_sync`
- `workspace:backend/types/test-env.d.ts` | `update` | `header_sync`
- `workspace:backend/vitest.config.integration.ts` | `update` | `header_sync`
- `workspace:backend/vitest.config.ts` | `update` | `header_sync`
- `workspace:dev-up-macos.sh` | `update` | `header_sync`
- `workspace:docs/.folder.md` | `create` | `folder_plan_sync`
- `workspace:docs/claude-legacy.md` | `create` | `claude_legacy_archive`
- `workspace:docs/dev/.folder.md` | `create` | `folder_plan_sync`
- `workspace:docs/dev/ZLMRTCClient.js` | `update` | `header_sync`
- `workspace:docs/dev/cloud_mqtt_example.py` | `update` | `header_sync`
- `workspace:docs/loading-index.md` | `create` | `create_loading_index_doc`
- `workspace:docs/rules/.folder.md` | `create` | `folder_plan_sync`
- `workspace:docs/rules/README.md` | `create` | `create_rules_reference_doc`
- `workspace:docs/rules/component-reuse.md` | `create` | `create_component_reuse_doc`
- `workspace:docs/rules/no-hardcoding.md` | `create` | `create_no_hardcoding_doc`
- `workspace:docs/session-start.md` | `create` | `create_session_start_doc`
- `workspace:docs/tech-stack.md` | `create` | `create_tech_stack_doc`
- `workspace:docs/workspace-structure.md` | `create` | `create_workspace_structure_doc`
- `workspace:frontend/.dart_tool/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/.vscode/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/analysis_options.yaml` | `update` | `header_sync`
- `workspace:frontend/assets/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/assets/config/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/assets/images/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/assets/models/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/assets/models/inbox/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/assets/videos/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/dev_web_proxy.js` | `update` | `header_sync`
- `workspace:frontend/dev_web_start.sh` | `update` | `header_sync`
- `workspace:frontend/dev_web_stop.sh` | `update` | `header_sync`
- `workspace:frontend/devtools_options.yaml` | `update` | `header_sync`
- `workspace:frontend/docs/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/base/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/device/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/device/model/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/home/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/home/bloc/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/home/bloc/middle_bloc/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/home/controller/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/home/model/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/home/provider/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/home/widget/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/home/widget/dialogue_mode/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/home/widget/interaction_modules/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/login/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/login/model/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/login/ui/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/occured/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/video_stream/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/video_stream/model/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/work_space/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/work_space/model/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/module/work_space/provider/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/server/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/server/api/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/server/api/examples/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/server/api/models/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/server/core/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/server/hardware_bridge/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/server/mqtt/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/server/serve_tmp/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/server/serve_tmp/login_tmp/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/cache/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/colorUtils/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/enum_utils/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/environment/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/event_bus/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/font_util/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/imUtil/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/import/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/report_analyse/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/tools/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/ui_utils/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/ui_utils/edit_text/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/ui_utils/edit_text/base/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/ui_utils/edit_text/style/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/ui_utils/hx_tabbar/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/ui_utils/hx_table/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/ui_utils/page_content/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/ui_utils/separator/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/utils/ui_utils/simpleFrom/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/lib/webView/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/pubspec.yaml` | `update` | `header_sync`
- `workspace:frontend/test/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/icons/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/ZLMRTCClient.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/p2p_preview.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/fonts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/fonts/droid/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/fonts/ttf/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/Addons.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/animation/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/animation/AnimationClipCreator.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/animation/CCDIKSolver.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/animation/MMDAnimationHelper.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/animation/MMDPhysics.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/cameras/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/cameras/CinematicCamera.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/capabilities/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/capabilities/WebGL.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/capabilities/WebGPU.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/controls/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/controls/ArcballControls.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/controls/DragControls.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/controls/FirstPersonControls.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/controls/FlyControls.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/controls/MapControls.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/controls/OrbitControls.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/controls/PointerLockControls.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/controls/TrackballControls.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/controls/TransformControls.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/csm/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/csm/CSM.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/csm/CSMFrustum.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/csm/CSMHelper.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/csm/CSMShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/curves/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/curves/CurveExtras.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/curves/NURBSCurve.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/curves/NURBSSurface.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/curves/NURBSUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/effects/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/effects/AnaglyphEffect.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/effects/AsciiEffect.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/effects/OutlineEffect.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/effects/ParallaxBarrierEffect.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/effects/PeppersGhostEffect.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/effects/StereoEffect.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/environments/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/environments/DebugEnvironment.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/environments/RoomEnvironment.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/exporters/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/exporters/DRACOExporter.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/exporters/EXRExporter.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/exporters/GLTFExporter.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/exporters/KTX2Exporter.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/exporters/MMDExporter.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/exporters/OBJExporter.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/exporters/PLYExporter.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/exporters/STLExporter.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/exporters/USDZExporter.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/geometries/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/geometries/BoxLineGeometry.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/geometries/ConvexGeometry.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/geometries/DecalGeometry.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/geometries/InstancedPointsGeometry.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/geometries/ParametricGeometries.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/geometries/ParametricGeometry.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/geometries/RoundedBoxGeometry.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/geometries/SDFGeometryGenerator.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/geometries/TeapotGeometry.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/geometries/TextGeometry.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/helpers/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/helpers/LightProbeHelper.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/helpers/OctreeHelper.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/helpers/PositionalAudioHelper.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/helpers/RectAreaLightHelper.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/helpers/TextureHelper.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/helpers/VertexNormalsHelper.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/helpers/VertexTangentsHelper.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/helpers/ViewHelper.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/interactive/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/interactive/HTMLMesh.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/interactive/InteractiveGroup.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/interactive/SelectionBox.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/interactive/SelectionHelper.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/lights/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/lights/IESSpotLight.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/lights/LightProbeGenerator.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/lights/RectAreaLightUniformsLib.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/lines/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/lines/Line2.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/lines/LineGeometry.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/lines/LineMaterial.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/lines/LineSegments2.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/lines/LineSegmentsGeometry.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/lines/Wireframe.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/lines/WireframeGeometry2.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/3DMLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/3MFLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/AMFLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/BVHLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/ColladaLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/DDSLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/DRACOLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/EXRLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/FBXLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/FontLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/GCodeLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/GLTFLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/HDRCubeTextureLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/IESLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/KMZLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/KTX2Loader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/KTXLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/LDrawLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/LUT3dlLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/LUTCubeLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/LUTImageLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/LWOLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/LogLuvLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/LottieLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/MD2Loader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/MDDLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/MMDLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/MTLLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/MaterialXLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/NRRDLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/OBJLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/PCDLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/PDBLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/PLYLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/PVRLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/RGBELoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/RGBMLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/STLLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/SVGLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/TDSLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/TGALoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/TIFFLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/TTFLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/TiltLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/USDZLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/VOXLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/VRMLLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/VTKLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/XYZLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/lwo/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/lwo/IFFParser.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/lwo/LWO2Parser.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/loaders/lwo/LWO3Parser.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/materials/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/materials/MeshGouraudMaterial.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/math/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/math/Capsule.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/math/ColorConverter.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/math/ConvexHull.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/math/ImprovedNoise.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/math/Lut.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/math/MeshSurfaceSampler.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/math/OBB.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/math/Octree.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/math/SimplexNoise.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/misc/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/misc/ConvexObjectBreaker.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/misc/GPUComputationRenderer.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/misc/Gyroscope.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/misc/MD2Character.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/misc/MD2CharacterComplex.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/misc/MorphAnimMesh.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/misc/MorphBlendMesh.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/misc/ProgressiveLightMap.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/misc/RollerCoaster.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/misc/Timer.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/misc/TubePainter.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/misc/Volume.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/misc/VolumeSlice.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/modifiers/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/modifiers/CurveModifier.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/modifiers/EdgeSplitModifier.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/modifiers/SimplifyModifier.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/modifiers/TessellateModifier.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/Nodes.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/BitangentNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/BufferAttributeNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/BufferNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/CameraNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/CubeTextureNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/InstanceNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/InstancedPointsMaterialNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/MaterialNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/MaterialReferenceNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/ModelNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/ModelViewProjectionNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/MorphNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/NormalNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/Object3DNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/PointUVNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/PositionNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/ReferenceNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/ReflectVectorNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/SceneNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/SkinningNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/StorageBufferNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/TangentNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/TextureBicubicNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/TextureNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/TextureSizeNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/TextureStoreNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/UVNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/accessors/UserDataNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/code/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/code/CodeNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/code/ExpressionNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/code/FunctionCallNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/code/FunctionNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/code/ScriptableNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/code/ScriptableValueNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/ArrayUniformNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/AssignNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/AttributeNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/BypassNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/CacheNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/ConstNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/ContextNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/IndexNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/InputNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/LightingModel.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/Node.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/NodeAttribute.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/NodeBuilder.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/NodeCache.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/NodeCode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/NodeFrame.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/NodeFunction.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/NodeFunctionInput.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/NodeKeywords.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/NodeParser.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/NodeUniform.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/NodeUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/NodeVar.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/NodeVarying.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/OutputStructNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/ParameterNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/PropertyNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/StackNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/StructTypeNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/TempNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/UniformGroup.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/UniformGroupNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/UniformNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/VarNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/VaryingNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/core/constants.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/display/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/display/BlendModeNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/display/BumpMapNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/display/ColorAdjustmentNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/display/ColorSpaceNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/display/FrontFacingNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/display/GaussianBlurNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/display/NormalMapNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/display/PassNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/display/PosterizeNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/display/ToneMappingNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/display/ViewportDepthNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/display/ViewportDepthTextureNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/display/ViewportNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/display/ViewportSharedTextureNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/display/ViewportTextureNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/fog/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/fog/FogExp2Node.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/fog/FogNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/fog/FogRangeNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/functions/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/functions/BSDF/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/functions/BSDF/BRDF_GGX.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/functions/BSDF/BRDF_Lambert.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/functions/BSDF/BRDF_Sheen.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/functions/BSDF/DFGApprox.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/functions/BSDF/D_GGX.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/functions/BSDF/EnvironmentBRDF.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/functions/BSDF/F_Schlick.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/functions/BSDF/Schlick_to_F0.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/functions/BSDF/V_GGX_SmithCorrelated.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/functions/PhongLightingModel.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/functions/PhysicalLightingModel.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/functions/material/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/functions/material/getGeometryRoughness.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/functions/material/getRoughness.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/geometry/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/geometry/RangeNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/gpgpu/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/gpgpu/ComputeNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/lighting/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/lighting/AONode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/lighting/AmbientLightNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/lighting/AnalyticLightNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/lighting/DirectionalLightNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/lighting/EnvironmentNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/lighting/HemisphereLightNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/lighting/IESSpotLightNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/lighting/LightNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/lighting/LightUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/lighting/LightingContextNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/lighting/LightingNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/lighting/LightsNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/lighting/PointLightNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/lighting/SpotLightNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/loaders/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/loaders/NodeLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/loaders/NodeMaterialLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/loaders/NodeObjectLoader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materials/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materials/InstancedPointsNodeMaterial.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materials/Line2NodeMaterial.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materials/LineBasicNodeMaterial.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materials/LineDashedNodeMaterial.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materials/Materials.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materials/MeshBasicNodeMaterial.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materials/MeshLambertNodeMaterial.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materials/MeshNormalNodeMaterial.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materials/MeshPhongNodeMaterial.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materials/MeshPhysicalNodeMaterial.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materials/MeshStandardNodeMaterial.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materials/NodeMaterial.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materials/PointsNodeMaterial.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materials/SpriteNodeMaterial.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materialx/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materialx/MaterialXNodes.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materialx/lib/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materialx/lib/mx_hsv.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materialx/lib/mx_noise.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/materialx/lib/mx_transform_color.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/math/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/math/CondNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/math/HashNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/math/MathNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/math/OperatorNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/parsers/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/parsers/GLSLNodeFunction.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/parsers/GLSLNodeParser.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/procedural/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/procedural/CheckerNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/shadernode/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/shadernode/ShaderNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/ArrayElementNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/ConvertNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/DiscardNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/EquirectUVNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/FunctionOverloadingNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/JoinNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/LoopNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/MatcapUVNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/MaxMipLevelNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/OscNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/PackingNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/RemapNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/RotateUVNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/SetNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/SpecularMIPLevelNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/SplitNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/SpriteSheetUVNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/TimerNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/nodes/utils/TriplanarTexturesNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/objects/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/objects/GroundProjectedSkybox.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/objects/InstancedPoints.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/objects/Lensflare.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/objects/MarchingCubes.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/objects/QuadMesh.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/objects/Reflector.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/objects/ReflectorForSSRPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/objects/Refractor.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/objects/ShadowMesh.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/objects/Sky.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/objects/Water.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/objects/Water2.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/offscreen/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/offscreen/jank.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/offscreen/offscreen.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/offscreen/scene.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/physics/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/physics/AmmoPhysics.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/physics/RapierPhysics.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/AfterimagePass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/BloomPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/BokehPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/ClearPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/CubeTexturePass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/DotScreenPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/EffectComposer.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/FilmPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/GTAOPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/GlitchPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/HalftonePass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/LUTPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/MaskPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/OutlinePass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/OutputPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/Pass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/RenderPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/RenderPixelatedPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/SAOPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/SMAAPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/SSAARenderPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/SSAOPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/SSRPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/SavePass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/ShaderPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/TAARenderPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/TexturePass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/postprocessing/UnrealBloomPass.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/CSS2DRenderer.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/CSS3DRenderer.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/Projector.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/SVGRenderer.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/Animation.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/Attributes.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/Backend.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/Background.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/Binding.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/Bindings.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/Buffer.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/BufferUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/ChainMap.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/Color4.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/ComputePipeline.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/Constants.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/CubeRenderTarget.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/DataMap.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/Geometries.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/Info.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/Pipeline.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/Pipelines.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/PostProcessing.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/ProgrammableStage.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/RenderContext.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/RenderContexts.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/RenderList.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/RenderLists.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/RenderObject.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/RenderObjects.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/RenderPipeline.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/Renderer.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/SampledTexture.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/Sampler.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/StorageBuffer.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/StorageTexture.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/Textures.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/Uniform.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/UniformBuffer.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/UniformsGroup.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/nodes/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/nodes/NodeBuilderState.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/nodes/NodeSampledTexture.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/nodes/NodeSampler.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/nodes/NodeUniform.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/nodes/NodeUniformsGroup.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/common/nodes/Nodes.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgl-legacy/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgl-legacy/nodes/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgl-legacy/nodes/GLSL1NodeBuilder.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgl-legacy/nodes/SlotNode.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgl-legacy/nodes/WebGLNodeBuilder.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgl-legacy/nodes/WebGLNodes.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgl/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgl/WebGLBackend.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgl/nodes/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgl/nodes/GLSLNodeBuilder.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgl/utils/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgl/utils/WebGLAttributeUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgl/utils/WebGLCapabilities.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgl/utils/WebGLExtensions.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgl/utils/WebGLState.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgl/utils/WebGLTextureUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgl/utils/WebGLUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgpu/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgpu/WebGPUBackend.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgpu/WebGPURenderer.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgpu/nodes/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgpu/nodes/WGSLNodeBuilder.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgpu/nodes/WGSLNodeFunction.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgpu/nodes/WGSLNodeParser.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgpu/utils/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgpu/utils/WebGPUAttributeUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgpu/utils/WebGPUBindingUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgpu/utils/WebGPUConstants.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgpu/utils/WebGPUPipelineUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgpu/utils/WebGPUTexturePassUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgpu/utils/WebGPUTextureUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/renderers/webgpu/utils/WebGPUUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/ACESFilmicToneMappingShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/AfterimageShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/BasicShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/BleachBypassShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/BlendShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/BokehShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/BokehShader2.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/BrightnessContrastShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/ColorCorrectionShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/ColorifyShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/ConvolutionShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/CopyShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/DOFMipMapShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/DepthLimitedBlurShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/DigitalGlitch.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/DotScreenShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/ExposureShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/FXAAShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/FilmShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/FocusShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/FreiChenShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/GTAOShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/GammaCorrectionShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/GodRaysShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/HalftoneShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/HorizontalBlurShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/HorizontalTiltShiftShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/HueSaturationShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/KaleidoShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/LuminosityHighPassShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/LuminosityShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/MMDToonShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/MirrorShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/NormalMapShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/OutputShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/PoissonDenoiseShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/RGBShiftShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/SAOShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/SMAAShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/SSAOShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/SSRShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/SepiaShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/SobelOperatorShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/SubsurfaceScatteringShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/TechnicolorShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/ToonShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/TriangleBlurShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/UnpackDepthRGBAShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/VelocityShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/VerticalBlurShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/VerticalTiltShiftShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/VignetteShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/VolumeShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/shaders/WaterRefractionShader.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/textures/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/textures/FlakesTexture.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/transpiler/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/transpiler/AST.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/transpiler/GLSLDecoder.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/transpiler/ShaderToyDecoder.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/transpiler/TSLEncoder.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/transpiler/Transpiler.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/utils/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/utils/BufferGeometryUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/utils/CameraUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/utils/GPUStatsPanel.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/utils/GeometryCompressionUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/utils/GeometryUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/utils/LDrawUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/utils/PackedPhongMaterial.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/utils/SceneUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/utils/ShadowMapViewer.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/utils/SkeletonUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/utils/SortUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/utils/TextureUtils.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/utils/UVsDebug.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/utils/WorkerPool.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/webxr/.folder.md` | `create` | `folder_plan_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/webxr/ARButton.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/webxr/OculusHandModel.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/webxr/OculusHandPointerModel.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/webxr/Text2D.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/webxr/VRButton.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/webxr/XRButton.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/webxr/XRControllerModelFactory.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/webxr/XREstimatedLight.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/webxr/XRHandMeshModel.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/webxr/XRHandModelFactory.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/webxr/XRHandPrimitiveModel.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/third_party/three/examples/jsm/webxr/XRPlanes.js` | `update` | `header_sync`
- `workspace:frontend/web/model_viewer/viewer.js` | `update` | `header_sync`
- `workspace:n8n/*/.folder.md` | `create` | `folder_plan_sync`
- `workspace:n8n/*/lefthook.yml` | `update` | `header_sync`
- `workspace:n8n/.folder.md` | `create` | `folder_plan_sync`
- `workspace:n8n/n8n-master/.folder.md` | `create` | `folder_plan_sync`
- `workspace:patterns.md` | `create` | `create_patterns_doc`
- `workspace:scripts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:scripts/docs-check.sh` | `create` | `guard_script_sync`
- `workspace:scripts/pre-commit-folder-check.sh` | `create` | `guard_script_sync`
- `workspace:specs/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/001-openclaw-dialog-mode/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/001-openclaw-dialog-mode/checklists/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/001-openclaw-dialog-mode/contracts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/002-hotplug-port-sync/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/002-hotplug-port-sync/checklists/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/002-hotplug-port-sync/contracts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/003-workflow-sync-placeholder/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/004-workflow-view-sync/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/004-workflow-view-sync/checklists/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/004-workflow-view-sync/contracts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/005-skills-library-dialogue/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/005-skills-library-dialogue/checklists/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/005-skills-library-dialogue/contracts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/006-digital-twin-truth-sync/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/006-digital-twin-truth-sync/checklists/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/006-digital-twin-truth-sync/contracts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/007-mqtt-hardware-sync/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/007-mqtt-hardware-sync/checklists/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/008-mqtt-hardware-runtime/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/008-mqtt-hardware-runtime/checklists/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/008-mqtt-hardware-runtime/contracts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/009-mqtt-hardware-live/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/009-mqtt-hardware-live/checklists/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/009-mqtt-hardware-live/contracts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/010-tesseract-ux-loop/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/010-tesseract-ux-loop/checklists/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/010-tesseract-ux-loop/contracts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/011-ux-feedback-polish/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/012-mermaid-render-fix/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/013-digital-twin-jitter-fix/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/014-hardware-assembly-twin-ux/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/015-hotplug-detection-fix/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/016-twin-assembly-checklist/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/016-twin-assembly-checklist/checklists/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/017-hardware-assembly-list-fix/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/018-twin-preview-device-control/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/018-twin-preview-device-control/checklists/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/018-twin-preview-device-control/contracts/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/019-agent-markdown-clarify-fix/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/019-agent-markdown-clarify-fix/checklists/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/020-workflow-gen-resilience/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/020-workflow-gen-resilience/checklists/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/021-mqtt-image-upload/.folder.md` | `create` | `folder_plan_sync`
- `workspace:specs/021-mqtt-image-upload/checklists/.folder.md` | `create` | `folder_plan_sync`
- `workspace:test/.folder.md` | `create` | `folder_plan_sync`
- `workspace:test/test_feishu.py` | `update` | `header_sync`
- `workspace:today.md` | `create` | `create_today`

## Diff Snippets
### workspace:.cursor/rules/.folder.md
```diff
--- a/workspace/.cursor/rules/.folder.md
+++ b/workspace/.cursor/rules/.folder.md
@@ -0,0 +1,16 @@
+# Folder Plan: .cursor/rules
+
+<!-- vibe-folder-map:start -->
+## Architecture
+- Scope: .cursor/rules
+- Function: Rules and prompt-governance configuration.
+- Sync: if this folder changes, update this file immediately.
+
+## Files
+| File | Pos | Function |
+|---|---|---|
+| `vibe-component-reuse.mdc` | `doc` | Workspace rule that pushes reuse before adding new implementations |
+| `vibe-doc-sync.mdc` | `doc` | Workspace rule that keeps docs, folder maps, and file headers aligned |
+| `vibe-engineering.mdc` | `doc` | Workspace rule for architecture, hardcoding, and overlap guardrails |
+| `vibe-loading.mdc` | `doc` | Workspace rule for three-layer loading discipline |
+<!-- vibe-folder-map:end -->
```

### workspace:.cursor/rules/vibe-component-reuse.mdc
```diff
--- a/workspace/.cursor/rules/vibe-component-reuse.mdc
+++ b/workspace/.cursor/rules/vibe-component-reuse.mdc
@@ -0,0 +1,30 @@
+---
+name: vibe-component-reuse
+description: Prefer reuse of existing components/modules over introducing new implementations.
+alwaysApply: true
+globs:
+  - "**/*.py"
+  - "**/*.js"
+  - "**/*.jsx"
+  - "**/*.ts"
+  - "**/*.tsx"
+  - "**/*.go"
+  - "**/*.rs"
+  - "**/*.java"
+---
+
+# Vibe Component Reuse Rules
+
+## Reuse First
+- Before adding a new component/module/page/script, search existing implementation first.
+- If an existing unit can satisfy >=70% semantics, extend or reuse it.
+- Avoid parallel implementations that overlap in behavior.
+
+## New Creation Gate
+- Create a new component/module only when reuse is clearly not viable.
+- Document why reuse is not possible in the nearest folder doc.
+- Keep new units single-purpose and composable.
+
+## Refactor Preference
+- When requirements change, prefer refactoring current modules over spawning alternates.
+- Remove dead/duplicate paths after migration to prevent overlap drift.
```

### workspace:.cursor/rules/vibe-doc-sync.mdc
```diff
--- a/workspace/.cursor/rules/vibe-doc-sync.mdc
+++ b/workspace/.cursor/rules/vibe-doc-sync.mdc
@@ -0,0 +1,40 @@
+---
+name: vibe-doc-sync
+description: Enforce root/folder/file documentation sync contracts and semantic Input->Pos linking.
+alwaysApply: true
+globs:
+  - "**/*.md"
+  - "**/*.py"
+  - "**/*.sh"
+  - "**/*.js"
+  - "**/*.jsx"
+  - "**/*.ts"
+  - "**/*.tsx"
+  - "**/*.go"
+  - "**/*.rs"
+  - "**/*.java"
+---
+
+# Vibe Doc Sync Rules
+
+## Root Contract
+- Root `CLAUDE.md` is pointer-only and must include update contract.
+- Any functional, architectural, or coding-style change must update related child docs before session end.
+
+## Folder Contract
+- Every scanned folder must have `.folder.md` (including empty folders).
+- Keep architecture summary within 3 lines.
+- Maintain file table with `File | Pos | Function`.
+- Folder changed => update the same folder's `.folder.md`.
+
+## File Header Contract
+- Every supported source file must keep header lines:
+  - `[Input]`
+  - `[Output]`
+  - `[Pos]`
+  - `[Sync]`
+- File changed => update header and owner `.folder.md`.
+
+## Semantic Link Network
+- In `[Input]`, prefer direct references to dependency file paths and their `[Pos]`.
+- Import-resolution fallback is owner `.folder.md` contract path.
```

### workspace:.cursor/rules/vibe-engineering.mdc
```diff
--- a/workspace/.cursor/rules/vibe-engineering.mdc
+++ b/workspace/.cursor/rules/vibe-engineering.mdc
@@ -0,0 +1,32 @@
+---
+name: vibe-engineering
+description: Enforce low coupling/high cohesion, centralized configuration, no hard-coded business variables, and no overlapping feature implementations.
+alwaysApply: true
+globs:
+  - "**/*.py"
+  - "**/*.sh"
+  - "**/*.js"
+  - "**/*.jsx"
+  - "**/*.ts"
+  - "**/*.tsx"
+  - "**/*.go"
+  - "**/*.rs"
+  - "**/*.java"
+---
+
+# Vibe Engineering Rules
+
+## Architecture Principles
+- Keep modules low-coupled and high-cohesion.
+- Enforce single responsibility per component/service.
+- Reuse existing modules before adding new entities.
+
+## Hard-Coding Guardrail
+- Do not hard-code business identifiers, paths, model params, or thresholds in feature code.
+- Store configurable values in centralized config files or settings modules.
+- Any new constant must include source-of-truth location and purpose.
+
+## Overlap Guardrail
+- Do not implement duplicate features with parallel code paths.
+- Extend existing workflow if semantics overlap > 70%.
+- If a new implementation is required, record why reuse is not possible.
```

### workspace:.cursor/rules/vibe-loading.mdc
```diff
--- a/workspace/.cursor/rules/vibe-loading.mdc
+++ b/workspace/.cursor/rules/vibe-loading.mdc
@@ -0,0 +1,21 @@
+---
+name: vibe-loading
+description: Apply three-layer loading discipline: hot data, rules, and heavy docs with anti-bloat limits.
+alwaysApply: true
+globs:
+  - "**/*.md"
+  - "**/*.mdc"
+---
+
+# Vibe Loading Rules
+
+## Three Layers
+1. Hot: `CLAUDE.md`, `today.md`
+2. Rules: `.cursor/rules/*.mdc`
+3. Heavy: `docs/*.md` (on-demand only)
+
+## Anti-Bloat
+- Never pre-load all heavy docs.
+- Keep at most two heavy docs active simultaneously.
+- Summarize and release old heavy docs before loading new ones.
+- Declare each load action with target and purpose.
```

### workspace:.folder.md
```diff
--- a/workspace/.folder.md
+++ b/workspace/.folder.md
@@ -0,0 +1,31 @@
+# Folder Plan: root
+
+<!-- vibe-folder-map:start -->
+## Architecture
+- Scope: root
+- Function: Workspace control and cross-module orchestration.
+- Sync: if this folder changes, update this file immediately.
+
+## Files
+| File | Pos | Function |
+|---|---|---|
+| `.DS_Store` | `module` | Provide .DS Store capability for root |
+| `.env_backend` | `module` | Provide .env backend capability for root |
+| `.github/` | `dir` | Subfolder anchor for .github under root |
+| `.gitignore` | `module` | Provide .gitignore capability for root |
+| `.specify/` | `dir` | Subfolder anchor for .specify under root |
+| `.vscode/` | `dir` | Subfolder anchor for .vscode under root |
+| `AGENTS.md` | `doc` | Codex/Copilot entry instructions for working inside this vault |
+| `CLAUDE.md` | `doc` | Root pointer file that defines how the workspace should be loaded |
+| `aily-blockly/` | `dir` | Subfolder anchor for aily-blockly under root |
+| `backend/` | `dir` | Subfolder anchor for backend under root |
+| `dev-up-macos.sh` | `script` | Provide dev up macos capability for root |
+| `docs/` | `dir` | Subfolder anchor for docs under root |
+| `frontend/` | `dir` | Subfolder anchor for frontend under root |
+| `n8n/` | `dir` | Subfolder anchor for n8n under root |
+| `patterns.md` | `doc` | Reusable lessons and operating patterns captured from previous work |
+| `quickstart.md` | `doc` | Provide quickstart capability for root |
+| `specs/` | `dir` | Subfolder anchor for specs under root |
+| `test/` | `dir` | Subfolder anchor for test under root |
+| `today.md` | `doc` | Daily checkpoint for the current workspace session |
+<!-- vibe-folder-map:end -->
```

### workspace:.github/.folder.md
```diff
--- a/workspace/.github/.folder.md
+++ b/workspace/.github/.folder.md
@@ -0,0 +1,13 @@
+# Folder Plan: .github
+
+<!-- vibe-folder-map:start -->
+## Architecture
+- Scope: .github
+- Function: GitHub automation and instruction mirror for this workspace.
+- Sync: if this folder changes, update this file immediately.
+
+## Files
+| File | Pos | Function |
+|---|---|---|
+| `copilot-instructions.md` | `doc` | GitHub Copilot instructions mirrored from the workspace contract |
+<!-- vibe-folder-map:end -->
```

### workspace:.github/copilot-instructions.md
```diff
--- a/workspace/.github/copilot-instructions.md
+++ b/workspace/.github/copilot-instructions.md
@@ -281,3 +281,17 @@
 维护三层完整，执行回环约束，拒绝孤立变更。
 Keep the map aligned with the terrain, or the terrain will be lost.
 </INVOCATION>
+
+<!-- vibe-copilot:start -->
+## Delivery Contract
+- Apply changes with minimal blast radius and preserve existing architecture.
+- Reuse existing components/modules before creating new ones.
+- Do not hard-code business IDs, thresholds, or local machine paths.
+
+## Documentation Sync
+- If a folder changes, update its `.folder.md`.
+- If a source file changes, update `[Input]/[Output]/[Pos]/[Sync]` header.
+
+## Validation
+- Execute configured validation commands and include pass/fail evidence.
+<!-- vibe-copilot:end -->
```

### workspace:.specify/.folder.md
```diff
--- a/workspace/.specify/.folder.md
+++ b/workspace/.specify/.folder.md
@@ -0,0 +1,16 @@
+# Folder Plan: .specify
+
+<!-- vibe-folder-map:start -->
+## Architecture
+- Scope: .specify
+- Function: Local module responsibilities for .specify.
+- Sync: if this folder changes, update this file immediately.
+
+## Files
+| File | Pos | Function |
+|---|---|---|
+| `init-options.json` | `module` | Provide init options capability for .specify |
+| `memory/` | `dir` | Subfolder anchor for memory under .specify |
+| `scripts/` | `dir` | Subfolder anchor for scripts under .specify |
+| `templates/` | `dir` | Subfolder anchor for templates under .specify |
+<!-- vibe-folder-map:end -->
```

### workspace:.specify/memory/.folder.md
```diff
--- a/workspace/.specify/memory/.folder.md
+++ b/workspace/.specify/memory/.folder.md
@@ -0,0 +1,13 @@
+# Folder Plan: .specify/memory
+
+<!-- vibe-folder-map:start -->
+## Architecture
+- Scope: .specify/memory
+- Function: Local module responsibilities for .specify/memory.
+- Sync: if this folder changes, update this file immediately.
+
+## Files
+| File | Pos | Function |
+|---|---|---|
+| `constitution.md` | `doc` | Provide constitution capability for .specify/memory |
+<!-- vibe-folder-map:end -->
```

### workspace:.specify/scripts/.folder.md
```diff
--- a/workspace/.specify/scripts/.folder.md
+++ b/workspace/.specify/scripts/.folder.md
@@ -0,0 +1,13 @@
+# Folder Plan: .specify/scripts
+
+<!-- vibe-folder-map:start -->
+## Architecture
+- Scope: .specify/scripts
+- Function: Local module responsibilities for .specify/scripts.
+- Sync: if this folder changes, update this file immediately.
+
+## Files
+| File | Pos | Function |
+|---|---|---|
+| `bash/` | `dir` | Subfolder anchor for bash under .specify/scripts |
+<!-- vibe-folder-map:end -->
```

### workspace:.specify/scripts/bash/.folder.md
```diff
--- a/workspace/.specify/scripts/bash/.folder.md
+++ b/workspace/.specify/scripts/bash/.folder.md
@@ -0,0 +1,17 @@
+# Folder Plan: .specify/scripts/bash
+
+<!-- vibe-folder-map:start -->
+## Architecture
+- Scope: .specify/scripts/bash
+- Function: Local module responsibilities for .specify/scripts/bash.
+- Sync: if this folder changes, update this file immediately.
+
+## Files
+| File | Pos | Function |
+|---|---|---|
+| `check-prerequisites.sh` | `script` | Provide check prerequisites capability for .specify/scripts/bash |
+| `common.sh` | `script` | Provide common capability for .specify/scripts/bash |
+| `create-new-feature.sh` | `script` | Provide create new feature capability for .specify/scripts/bash |
+| `setup-plan.sh` | `script` | Provide setup plan capability for .specify/scripts/bash |
+| `update-agent-context.sh` | `script` | Provide update agent context capability for .specify/scripts/bash |
+<!-- vibe-folder-map:end -->
```

### workspace:.specify/scripts/bash/check-prerequisites.sh
```diff
--- a/workspace/.specify/scripts/bash/check-prerequisites.sh
+++ b/workspace/.specify/scripts/bash/check-prerequisites.sh
@@ -1,4 +1,8 @@
 #!/usr/bin/env bash
+# [Input] Consume upstream contracts defined by `.specify/scripts/bash/.folder.md`[Pos].
+# [Output] Provide check prerequisites capability to downstream modules.
+# [Pos] script node in .specify/scripts/bash
+# [Sync] If this file changes, update this header and `.specify/scripts/bash/.folder.md`.
 
 # Consolidated prerequisite checking script
 #
```

### workspace:.specify/scripts/bash/common.sh
```diff
--- a/workspace/.specify/scripts/bash/common.sh
+++ b/workspace/.specify/scripts/bash/common.sh
@@ -1,4 +1,9 @@
 #!/usr/bin/env bash
+# [Input] Consume upstream contracts defined by `.specify/scripts/bash/.folder.md`[Pos].
+# [Output] Provide common capability to downstream modules.
+# [Pos] script node in .specify/scripts/bash
+# [Sync] If this file changes, update this header and `.specify/scripts/bash/.folder.md`.
+
 # Common functions and variables for all scripts
 
 # Find repository root by searching upward for .specify directory
```

### workspace:.specify/scripts/bash/create-new-feature.sh
```diff
--- a/workspace/.specify/scripts/bash/create-new-feature.sh
+++ b/workspace/.specify/scripts/bash/create-new-feature.sh
@@ -1,4 +1,8 @@
 #!/usr/bin/env bash
+# [Input] Consume upstream contracts defined by `.specify/scripts/bash/.folder.md`[Pos].
+# [Output] Provide create new feature capability to downstream modules.
+# [Pos] script node in .specify/scripts/bash
+# [Sync] If this file changes, update this header and `.specify/scripts/bash/.folder.md`.
 
 set -e
 
```

### workspace:.specify/scripts/bash/setup-plan.sh
```diff
--- a/workspace/.specify/scripts/bash/setup-plan.sh
+++ b/workspace/.specify/scripts/bash/setup-plan.sh
@@ -1,4 +1,8 @@
 #!/usr/bin/env bash
+# [Input] Consume upstream contracts defined by `.specify/scripts/bash/.folder.md`[Pos].
+# [Output] Provide setup plan capability to downstream modules.
+# [Pos] script node in .specify/scripts/bash
+# [Sync] If this file changes, update this header and `.specify/scripts/bash/.folder.md`.
 
 set -e
 
```

### workspace:.specify/scripts/bash/update-agent-context.sh
```diff
--- a/workspace/.specify/scripts/bash/update-agent-context.sh
+++ b/workspace/.specify/scripts/bash/update-agent-context.sh
@@ -1,4 +1,8 @@
 #!/usr/bin/env bash
+# [Input] Consume upstream contracts defined by `.specify/scripts/bash/.folder.md`[Pos].
+# [Output] Provide update agent context capability to downstream modules.
+# [Pos] script node in .specify/scripts/bash
+# [Sync] If this file changes, update this header and `.specify/scripts/bash/.folder.md`.
 
 # Update agent context files with information from plan.md
 #
```

### workspace:.specify/templates/.folder.md
```diff
--- a/workspace/.specify/templates/.folder.md
+++ b/workspace/.specify/templates/.folder.md
@@ -0,0 +1,18 @@
+# Folder Plan: .specify/templates
+
+<!-- vibe-folder-map:start -->
+## Architecture
+- Scope: .specify/templates
+- Function: Testing, validation, and regression safeguards.
+- Sync: if this folder changes, update this file immediately.
+
+## Files
+| File | Pos | Function |
+|---|---|---|
+| `agent-file-template.md` | `doc` | Provide agent file template capability for .specify/templates |
+| `checklist-template.md` | `doc` | Provide checklist template capability for .specify/templates |
+| `constitution-template.md` | `doc` | Provide constitution template capability for .specify/templates |
+| `plan-template.md` | `doc` | Provide plan template capability for .specify/templates |
+| `spec-template.md` | `doc` | Provide spec template capability for .specify/templates |
+| `tasks-template.md` | `doc` | Provide tasks template capability for .specify/templates |
+<!-- vibe-folder-map:end -->
```

### workspace:.vscode/.folder.md
```diff
--- a/workspace/.vscode/.folder.md
+++ b/workspace/.vscode/.folder.md
@@ -0,0 +1,14 @@
+# Folder Plan: .vscode
+
+<!-- vibe-folder-map:start -->
+## Architecture
+- Scope: .vscode
+- Function: Local module responsibilities for .vscode.
+- Sync: if this folder changes, update this file immediately.
+
+## Files
+| File | Pos | Function |
+|---|---|---|
+| `AGENTS.md` | `doc` | Provide AGENTS capability for .vscode |
+| `settings.json` | `module` | Provide settings capability for .vscode |
+<!-- vibe-folder-map:end -->
```

### workspace:AGENTS.md
```diff
--- a/workspace/AGENTS.md
+++ b/workspace/AGENTS.md
@@ -66,3 +66,20 @@
 - 016-twin-assembly-checklist: Moved hardware assembly detection from aily-blockly dialogue to Flutter digital twin. Added `AssemblyChecklistPanel` widget, postMessage relay in `iframe.component.ts`, completion handler in `aily-chat.component.ts`.
 - 020-workflow-gen-resilience: Backend confirm pipeline never throws HTTP 500 — all failures return structured `AgentResponse` with Chinese error messages and escalating suggestions. Frontend catches IPC AbortError, guards deploy chain on non-workflow_ready, synthesizes client-side error response. Electron timeout formula widened from `llmTimeout + 15s` to `llmTimeout * 1.2 + 30s` with confirm-specific 1.5x multiplier.
 - 021-mqtt-image-upload: Face image upload flow changed from backend disk-write to MQTT `rec_img` base64 publish. Added `publishRecImg()` to `MqttHardwareRuntime`, `publishImageViaMqtt()` to `AgentService`, and structured upload/publish logs. Flutter `AiInteractionWindow` now sends image `width` / `height`, stores `imageId`, and confirms FACE-NET with `face_info` only after upload.
+
+<!-- vibe-agents:start -->
+## Vibe Contract
+- Any functional, architectural, or coding-style change must update affected folder docs and file headers before session end.
+- Prefer reuse-first refactor: search existing modules/components before adding new implementations.
+- Avoid hard-coded business IDs/thresholds/paths; resolve to higher-level config first.
+
+## Source Of Truth
+- Root pointer: `CLAUDE.md`
+- Folder contracts: `**/.folder.md`
+- Rules index: `docs/rules/README.md`
+- Cursor rules: `.cursor/rules/*.mdc`
+
+## Validation
+- Run requested validation commands after meaningful changes.
+- Report concrete evidence (command + exit code + key output) in final summary.
+<!-- vibe-agents:end -->
```

### workspace:CLAUDE.md
```diff
--- a/workspace/CLAUDE.md
+++ b/workspace/CLAUDE.md
@@ -1,298 +1,21 @@
 # CLAUDE.md
 
-This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
-
-## Project Overview
-
-Tesseract is a multi-module robotics and automation platform that combines:
-- **Backend**: n8n-based MCP agent system for workflow generation (TypeScript)
-- **Frontend**: Flutter mobile/tablet client for robot control and interaction
-- **Aily Blockly**: Angular/Electron visual programming IDE for hardware development
-- **n8n**: Forked n8n workflow automation engine
-
-The system enables natural language to workflow conversion, hardware robot control, and visual block-based programming for embedded systems.
-
-## Repository Structure
-
-```
-Tesseract/
-├── backend/           # Agent + MCP services (TypeScript)
-├── frontend/          # Flutter client (Dart)
-├── aily-blockly/      # Visual programming IDE (Angular + Electron)
-├── n8n/n8n-master/    # Forked n8n monorepo
-└── AGENTS.md          # Cross-module development guidelines
-```
-
-## Common Development Commands
-
-### Backend (n8n-mcp Agent)
-```bash
-cd backend
-
-# Build and Setup
-npm run build              # Build TypeScript
-npm run rebuild            # Rebuild node database from n8n packages
-npm run validate           # Validate all node data
-npm run agent:db:init      # Initialize agent database
-
-# Testing
-npm test                   # Run all tests
-npm run test:unit          # Unit tests only
-npm run test:integration   # Integration tests
-npm run test:coverage      # Coverage report
-
-# Run single test file
-npm test -- tests/unit/services/property-filter.test.ts
-
-# Type Checking
-npm run lint               # Check TypeScript types
-npm run typecheck          # Alias for lint
-
-# Running Servers
-npm run agent:dev          # Start agent server (http://localhost:3005)
-npm run start:http         # Start MCP server in HTTP mode
-npm run dev                # Build + rebuild + validate
-npm run dev:http           # HTTP server with auto-reload
-
-# Agent UI
-cd apps/agent-ui
-npm run dev                # Start UI dev server (http://localhost:5173)
-```
-
-### Frontend (Flutter)
-```bash
-cd frontend
-
-# Setup
-flutter pub get            # Install dependencies
-
-# Development
-flutter run                # Run app (select device)
-flutter run -d chrome      # Run on Chrome
-flutter run -d android     # Run on Android
-
-# Testing & Analysis
-flutter test               # Run tests
-flutter analyze            # Static analysis
-flutter doctor             # Check environment setup
-```
-
-### Aily Blockly (Visual IDE)
-```bash
-cd aily-blockly
-
-# Development
-npm start                  # Angular dev server (http://localhost:4200)
-npm run electron           # Run Electron desktop app
-
-# Build
-npm run build              # Build for production
-npm run build:mac          # Build macOS app
-```
-
-### n8n Fork
-```bash
-cd n8n/n8n-master
-
-# Setup
-pnpm install               # Install dependencies
-
-# Development
-pnpm dev                   # Start n8n dev server
-pnpm lint                  # Lint code
-pnpm test                  # Run tests
-```
-
-## High-Level Architecture
-
-### Backend Agent System
-The backend is an AI agent that converts natural language requirements into n8n workflows for hardware robots.
-
-**Key Components:**
-- **IntakeAgent** (`src/agents/intake-agent.ts`): Parses user intent and extracts entities
-- **ComponentSelector** (`src/agents/component-selector.ts`): Generates component blueprints
-- **WorkflowArchitect** (`src/agents/workflow-architect.ts`): Assembles prompts, generates workflow JSON, validates and auto-fixes
-- **MCP Server** (`src/mcp/server.ts`): Model Context Protocol for AI assistants
-- **Agent API** (`src/agent-server/`): HTTP/WebSocket API for chat and workflow management
-- **SessionService** (`src/agents/session-service.ts`): Multi-session state management
```

### workspace:aily-blockly/.agents/.folder.md
```diff
--- a/workspace/aily-blockly/.agents/.folder.md
+++ b/workspace/aily-blockly/.agents/.folder.md
@@ -0,0 +1,13 @@
+# Folder Plan: aily-blockly/.agents
+
+<!-- vibe-folder-map:start -->
+## Architecture
+- Scope: aily-blockly/.agents
+- Function: Local module responsibilities for aily-blockly/.agents.
+- Sync: if this folder changes, update this file immediately.
+
+## Files
+| File | Pos | Function |
+|---|---|---|
+| `skills/` | `dir` | Subfolder anchor for skills under aily-blockly/.agents |
+<!-- vibe-folder-map:end -->
```

### workspace:aily-blockly/.agents/skills/.folder.md
```diff
--- a/workspace/aily-blockly/.agents/skills/.folder.md
+++ b/workspace/aily-blockly/.agents/skills/.folder.md
@@ -0,0 +1,21 @@
+# Folder Plan: aily-blockly/.agents/skills
+
+<!-- vibe-folder-map:start -->
+## Architecture
+- Scope: aily-blockly/.agents/skills
+- Function: Testing, validation, and regression safeguards.
+- Sync: if this folder changes, update this file immediately.
+
+## Files
+| File | Pos | Function |
+|---|---|---|
+| `speckit-analyze/` | `dir` | Subfolder anchor for speckit-analyze under aily-blockly/.agents/skills |
+| `speckit-checklist/` | `dir` | Subfolder anchor for speckit-checklist under aily-blockly/.agents/skills |
+| `speckit-clarify/` | `dir` | Subfolder anchor for speckit-clarify under aily-blockly/.agents/skills |
+| `speckit-constitution/` | `dir` | Subfolder anchor for speckit-constitution under aily-blockly/.agents/skills |
+| `speckit-implement/` | `dir` | Subfolder anchor for speckit-implement under aily-blockly/.agents/skills |
+| `speckit-plan/` | `dir` | Subfolder anchor for speckit-plan under aily-blockly/.agents/skills |
+| `speckit-specify/` | `dir` | Subfolder anchor for speckit-specify under aily-blockly/.agents/skills |
+| `speckit-tasks/` | `dir` | Subfolder anchor for speckit-tasks under aily-blockly/.agents/skills |
+| `speckit-taskstoissues/` | `dir` | Subfolder anchor for speckit-taskstoissues under aily-blockly/.agents/skills |
+<!-- vibe-folder-map:end -->
```

### workspace:aily-blockly/.agents/skills/speckit-analyze/.folder.md
```diff
--- a/workspace/aily-blockly/.agents/skills/speckit-analyze/.folder.md
+++ b/workspace/aily-blockly/.agents/skills/speckit-analyze/.folder.md
@@ -0,0 +1,13 @@
+# Folder Plan: aily-blockly/.agents/skills/speckit-analyze
+
+<!-- vibe-folder-map:start -->
+## Architecture
+- Scope: aily-blockly/.agents/skills/speckit-analyze
+- Function: Local module responsibilities for aily-blockly/.agents/skills/speckit-analyze.
+- Sync: if this folder changes, update this file immediately.
+
+## Files
+| File | Pos | Function |
+|---|---|---|
+| `SKILL.md` | `doc` | Provide SKILL capability for aily-blockly/.agents/skills/speckit-analyze |
+<!-- vibe-folder-map:end -->
```

### workspace:aily-blockly/.agents/skills/speckit-checklist/.folder.md
```diff
--- a/workspace/aily-blockly/.agents/skills/speckit-checklist/.folder.md
+++ b/workspace/aily-blockly/.agents/skills/speckit-checklist/.folder.md
@@ -0,0 +1,13 @@
+# Folder Plan: aily-blockly/.agents/skills/speckit-checklist
+
+<!-- vibe-folder-map:start -->
+## Architecture
+- Scope: aily-blockly/.agents/skills/speckit-checklist
+- Function: Local module responsibilities for aily-blockly/.agents/skills/speckit-checklist.
+- Sync: if this folder changes, update this file immediately.
+
+## Files
+| File | Pos | Function |
+|---|---|---|
+| `SKILL.md` | `doc` | Provide SKILL capability for aily-blockly/.agents/skills/speckit-checklist |
+<!-- vibe-folder-map:end -->
```
