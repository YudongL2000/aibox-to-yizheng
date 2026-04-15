# Quickstart: Agent Markdown Output & Clarification Fix

**Feature**: 019-agent-markdown-clarify-fix

## Prerequisites

- Backend agent running: `cd backend && npm run agent:dev`
- Agent UI or aily-blockly chat open
- LLM endpoint accessible (verify health probe latency < 5s in startup logs)

## Verification Steps

### Step 1: Verify Discovery Timeout (FR-004)

1. Check startup log for `llmDiscoveryTimeoutMs`:
   ```
   Agent stack config { ... llmDiscoveryTimeoutMs: 15000 ... }
   ```
2. Send a query: "我想做一个和我共情的机器人"
3. Check log for "Orchestrator 语义发现增强" trace:
   - **Expected**: `status: 'completed'` (not `'failed'`)
   - **Expected**: `elapsedMs` < 15000

### Step 2: Verify Markdown Output (FR-001/002/003)

1. Send the same query in a fresh session.
2. Check the response `message` field in the HTTP response or chat UI:
   - **Expected**: Contains `**已匹配能力**` (bold section header)
   - **Expected**: Capabilities as `- **麦克风** — 音频采集` bullet items
   - **Expected**: Recognized requirements as numbered list
   - **Expected**: Reasoning as paragraph under bold header
   - **Expected**: Next-step prompt as blockquote (`>`)
3. Verify the chat UI renders these with visual hierarchy (bold text, indented bullets, etc.)

### Step 3: Verify Clarification Options (FR-005/006)

1. From the same session, check the response JSON:
   - **Expected**: `interaction` field is NOT `undefined`
   - **Expected**: `interaction.options` has at least 2 entries
2. Check logs — should NOT contain "澄清交互回退为问题模式"
3. Try clicking an option — should advance the dialogue

### Step 4: End-to-End Teaching Flow

1. Fresh session → "我想做一个见到老刘竖中指说滚见到老付比V说你好帅的机器人"
2. Verify:
   - Discovery completes (no timeout)
   - Capabilities listed as markdown bullets (摄像头, 人脸识别, etc.)
   - Clarification options appear as clickable buttons
   - Selecting an option produces a follow-up markdown response
3. Continue dialogue until `config_complete` / `summary_ready`:
   - Verify summary is markdown-formatted
   - Verify "确认构建" CTA is bold or blockquoted
