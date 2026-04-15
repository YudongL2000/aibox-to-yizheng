# Feature Specification: Agent Markdown Output & Clarification Fix

**Feature Branch**: `019-agent-markdown-clarify-fix`  
**Created**: 2026-04-07  
**Status**: Draft  
**Input**: User description: "优化 backend-Agent：输出整段文字时进行 markdown 格式化（复用客户端现成渲染组件），调试教学模式澄清问题生成失败"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agent Responses Render as Structured Markdown (Priority: P1)

When the agent responds with capability summaries, recognized requirements, clarification reasoning, and next-step guidance, the text should arrive as well-structured markdown that the existing frontend markdown renderer displays with visual hierarchy (bold, lists, separators).

**Why this priority**: Every single user interaction with the agent produces unformatted wall-of-text today. This affects 100% of sessions and degrades comprehension of multi-paragraph responses.

**Independent Test**: Send any teaching-mode query (e.g. "我想做一个和我共情的机器人"). Verify the response renders with markdown bullet lists for capabilities and bold emphasis for section labels in the chat window.

**Acceptance Scenarios**:

1. **Given** a user sends a natural-language robot requirement, **When** the agent returns a `guidance` response with capabilities and missing info, **Then** the message text uses markdown formatting: capabilities as a bullet list with bold component names, recognized requirements as a numbered list, reasoning as a distinct paragraph, and missing fields as a labeled section.
2. **Given** the agent returns a `summary_ready` response with full capability details, **When** rendered in the chat window, **Then** the frontend's existing markdown component renders the structured text with proper visual hierarchy.
3. **Given** a `config_complete` response with workflow confirmation, **When** rendered, **Then** the call-to-action line ("点击「确认构建」") is visually distinct (bold or blockquote).

---

### User Story 2 - Clarification Questions Generate with Interactive Options (Priority: P1)

When the agent's reflection engine returns `clarify_needed`, the response should include clickable interaction options derived from the reflection's missing-info and questions — not fall back to plain-text-only mode.

**Why this priority**: Without interaction options, users must type free-form text to answer clarification questions. This defeats the guided teaching-mode UX and makes the dialogue feel broken.

**Independent Test**: Send "我想做一个和我共情的机器人" in a fresh session. Verify the response includes interactive option buttons (not just text questions).

**Acceptance Scenarios**:

1. **Given** the reflection engine returns `clarify_needed` with `missing_info` entries and `clarification_questions` with options, **When** the response builder constructs the guidance response, **Then** the `interaction` field is populated with at least 2 selectable options derived from the questions.
2. **Given** the reflection engine returns questions WITHOUT explicit `options` arrays, **When** the response builder processes them, **Then** it generates synthetic options from the `missing_info` descriptions and category labels so that fallback to question-only mode does not occur.
3. **Given** the semantic discovery LLM call exceeds the default timeout, **When** the system falls back to rule-based discovery, **Then** the reflection engine still receives enough context (from rule-based results) to produce meaningful clarification questions with options.

---

### User Story 3 - Discovery Timeout Tolerates Realistic LLM Latency (Priority: P2)

The semantic capability discovery LLM call should not time out under normal network conditions. The current 6000ms ceiling is too aggressive given observed LLM latencies of 2900ms+ for simple health probes.

**Why this priority**: Discovery timeout cascades — it forces rule-based fallback which finds fewer capabilities, which means the reflection engine works with less context, which produces weaker clarification questions.

**Independent Test**: Set `AGENT_LLM_DISCOVERY_TIMEOUT_MS` to its default. Send a query. Verify the discovery LLM call completes successfully (check logs for "语义发现增强" with `completed` status instead of `failed`).

**Acceptance Scenarios**:

1. **Given** the LLM health probe latency was ~3 seconds, **When** the semantic discovery call fires with the default timeout, **Then** it has at least 15 seconds to complete (not 6 seconds).
2. **Given** an operator sets `AGENT_LLM_DISCOVERY_TIMEOUT_MS=8000` in the environment, **When** the agent starts, **Then** that value is used as the discovery timeout (not capped below 8000).

---

### Edge Cases

- What happens when the LLM returns an empty or unparseable JSON from semantic discovery? The system should fall back to rule-based discovery gracefully (already handled, no change needed).
- What happens when all clarification questions lack both `options` and `suggested_user_actions`? The builder should synthesize fallback options from `missing_info` descriptions.
- What happens when markdown characters appear in capability names or user input? The markdown renderer should handle them safely without breaking layout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The response builder MUST format `guidance` responses as markdown: capabilities as a bulleted list with bold component names, recognized requirements as a numbered list, reasoning summary as a paragraph, missing fields as a labeled section, and next-step prompt as bold or blockquote.
- **FR-002**: The response builder MUST format `summary_ready` responses as markdown with section headers for capability summary, requirement summary, and confirmation prompt.
- **FR-003**: The response builder MUST format `config_complete` responses with the confirmation call-to-action visually emphasized.
- **FR-004**: The default `llmDiscoveryTimeoutMs` MUST be raised from `Math.min(llmTimeoutMs, 6000)` to `Math.min(llmTimeoutMs, 15000)` to tolerate normal LLM latency.
- **FR-005**: The `buildQuestionOptions()` function MUST generate synthetic interaction options from `missing_info` when `clarification_questions` lack explicit `options` arrays.
- **FR-006**: The response builder MUST NOT fall back to question-only mode when `missing_info` entries are available to synthesize options from.
- **FR-007**: The markdown output MUST be compatible with the existing `XMarkdownComponent` / `ngx-x-markdown` renderer in the Angular chat and any markdown widget in the Flutter client.

### Key Entities

- **AgentResponse.message**: String field whose content changes from plain text to markdown-formatted text.
- **InteractionOption**: Existing data structure that must be populated even when reflection questions lack explicit option arrays.
- **AgentConfig.llmDiscoveryTimeoutMs**: Numeric config whose default ceiling changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of `guidance`, `summary_ready`, and `config_complete` response messages contain markdown formatting (verifiable by checking for `**`, `-`, `\n\n` patterns in response text).
- **SC-002**: For clarification scenarios (reflection returns `clarify_needed`), the `interaction` field is populated with options in at least 90% of cases (measured by absence of "澄清交互回退为问题模式" fallback trace).
- **SC-003**: The "语义发现增强" discovery LLM call completes successfully (no abort) for queries where LLM health latency is under 5 seconds.
- **SC-004**: Users perceive the agent's multi-paragraph responses as structured and scannable (visual hierarchy via headers, lists, bold emphasis).

## Assumptions

- The existing `XMarkdownComponent` in aily-blockly and any markdown renderer in Flutter support standard CommonMark features: bold, italic, bullets, numbered lists, blockquotes, and horizontal rules.
- The `llmTimeoutMs` general timeout (default 300000ms) is appropriate for non-discovery calls and does not need adjustment.
- The reflection engine's `missing_info` array always has at least `category` and `description` fields when `decision === 'clarify_needed'`.
- No changes to the HTTP/WebSocket response envelope are needed — only the `message` string content and `interaction` field assembly change.
