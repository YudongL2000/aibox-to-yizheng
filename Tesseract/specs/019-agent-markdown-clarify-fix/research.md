# Research: Agent Markdown Output & Clarification Fix

**Feature**: 019-agent-markdown-clarify-fix  
**Date**: 2026-04-07

## Decision 1: Discovery Timeout Ceiling

**Problem**: `llmDiscoveryTimeoutMs` defaults to `Math.min(llmTimeoutMs, 6000)` in `agent-config.ts:61`. The health probe alone takes ~2900ms (via aihubmix.com proxy to Claude Sonnet 4.6). The semantic discovery call is more complex (1558-char prompt, JSON mode, 180 maxTokens) and consistently exceeds 6000ms.

**Root Cause**: The 6000ms ceiling was set when using faster LLM endpoints. Current proxy chain adds ~3s baseline latency, making 6s untenable for any substantive LLM call.

**Decision**: Raise default to `Math.min(llmTimeoutMs, 15000)`.

**Rationale**: 15s = ~5× the observed health probe latency. Covers network variability without approaching the general `llmTimeoutMs` (300s). Still overridable via `AGENT_LLM_DISCOVERY_TIMEOUT_MS` env var.

**Alternatives Considered**:
- 10000ms: Too tight — only 3.3× probe latency, leaves no margin for longer prompts.
- 20000ms: Unnecessary — if discovery takes 20s, fallback is preferable.
- Remove ceiling entirely (use `llmTimeoutMs`): 300s is too long for a non-critical enhancement.

---

## Decision 2: Markdown Response Format

**Problem**: `buildGuidanceMessage()` (response-builder.ts:274-317) concatenates plain text with `\n`. Frontend already renders markdown via `XMarkdownComponent` (`ngx-x-markdown`). The plain text creates walls-of-text that are hard to scan.

**Decision**: Rewrite `buildGuidanceMessage()`, `buildPendingGuidanceMessage()`, and related methods to emit markdown. Structure:

```markdown
**已匹配能力**

- **麦克风** — 音频采集
- **语音识别** — 语音转文本
- **摄像头** — 图像采集

**已理解需求**

1. 感知用户情绪状态
2. 以某种方式表达共情回应

**当前判断**

共情机器人需明确：如何感知用户情绪…

**还需补充**

- 触发方式
- 表达形式

> 先从下面选一个最接近的下一步，我会继续收敛需求；也可以直接继续输入。
```

**Rationale**: Uses only basic CommonMark features (bold, lists, blockquotes) that all target renderers support. No tables, no code blocks, no HTML — maximum compatibility.

**Alternatives Considered**:
- Use `<br>` for line breaks: Not CommonMark, renderer-dependent.
- Use headers (`## 已匹配能力`): Too heavy for chat messages. Bold is sufficient.
- Emit structured JSON and let frontend format: Over-engineering; markdown is the right abstraction at the message layer.

---

## Decision 3: Synthetic Clarification Options

**Problem**: When `buildQuestionOptions()` (response-builder.ts:416-460) processes clarification questions, it iterates `question.options` to extract interaction choices. But the reflection LLM often returns questions with `description` fields but no `options` arrays — especially on first-turn queries where the model generates narrative missing-info descriptions rather than discrete option lists.

This causes `options` map to stay empty → `limitClarificationOptions` returns `[]` → `buildClarificationInteraction` returns `undefined` → fallback to plain text questions.

**Decision**: When `buildQuestionOptions()` finds zero options from questions, synthesize options from `missing_info` entries. Each `missing_info` item has `{ category, description, priority, blocking }` — generate one option per blocking missing_info entry using the description as the label and category as the value.

**Rationale**: `missing_info` is always populated when `decision === 'clarify_needed'`. Using these entries as fallback options ensures the user always sees clickable choices, even when the LLM doesn't explicitly structure them as options.

**Alternatives Considered**:
- Fix the reflection prompt to always emit options: Fragile — depends on LLM behavior; prompt changes are hard to test deterministically.
- Hard-code generic options like "请继续" / "我想调整": These don't help the user disambiguate requirements.
- Display questions as selectable cards instead of text: Requires frontend changes — out of scope.

---

## Decision 4: `describeCapabilities()` Markdown Format

**Current**: Returns `"麦克风(音频采集)、语音识别(语音转文本)"` — flat string with `、` separator.

**Decision**: Change to return a markdown bullet list. Each item: `- **{component}** — {entries.join('、')}`.

**Rationale**: Capabilities can be 8+ items. A flat comma-separated list becomes a wall-of-text. Bulleted list with bold component names provides instant visual parsing.
