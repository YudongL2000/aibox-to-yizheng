# Feature Specification: 012 - Mermaid 图表渲染修复

**Feature Branch**: `012-mermaid-render-fix`  
**Created**: 2026-04-07  
**Status**: Draft  

## User Scenarios & Testing

### User Story 1 - AI 生成的流程图能正常渲染 (Priority: P1)

用户与 AI 对话后，AI 生成的 `aily-mermaid` 代码块应直接呈现为 Mermaid 流程图，而不是显示 "No diagram type detected" 错误。

**Why this priority**: 这是核心功能缺陷 — 流程图渲染完全失败，用户无法获得可视化结果。

**Independent Test**: 触发 AI 生成包含 `\`\`\`aily-mermaid` 代码块的消息，图表应正确渲染。

**Acceptance Scenarios**:

1. **Given** AI 回复包含原始 mermaid 代码（非 JSON 包装），**When** 消息渲染到聊天界面，**Then** 显示正确的 Mermaid 流程图而非错误信息。
2. **Given** `normalizeAilyMermaid` 处理 aily-mermaid 块，**When** 内容是原始 mermaid 代码，**Then** 方法直接返回原始内容不做 JSON 包装。

---

### User Story 2 - 旧版 JSON 包装消息也能兼容渲染 (Priority: P2)

历史消息中存在已经 JSON 包装的 `aily-mermaid` 内容（因旧代码逻辑产生）。这些消息在新逻辑下也能正确提取 mermaid 代码并渲染。

**Why this priority**: 兼容性保障 — 不能因为当前修复导致历史消息渲染异常。

**Independent Test**: 构造包含 `{"code": "flowchart LR\n..."}` 内容的 aily-mermaid 块，应正确渲染。

**Acceptance Scenarios**:

1. **Given** children 包含 `{"code": "flowchart LR\nN1[\"A\"]"}` 形式的内容，**When** `mermaidData` 执行，**Then** 若 JSON.parse 成功则通过 parsedData 提取 code；若失败则通过 regex 兜底提取。
2. **Given** raw 以 `{` 开头但 JSON.parse 失败，**When** regex 匹配到 `"code"` 字段，**Then** 提取并 un-escape 后返回有效 mermaid 代码。

---

### User Story 3 - Mermaid 渲染路径有单元测试覆盖 (Priority: P3)

`mermaidData` getter 和 `normalizeAilyMermaid` 的代码提取逻辑有对应的单元测试，防止回归。

**Why this priority**: 质量保障 — 该 bug 是回归问题，测试可防止重现。

**Independent Test**: 运行单元测试套件，相关测试通过。

**Acceptance Scenarios**:

1. **Given** 原始 mermaid 输入，**When** `mermaidData` 执行，**Then** 返回 `{ code: rawMermaid }`。
2. **Given** regex 能匹配的 JSON-wrapped 内容，**When** `mermaidData` 执行，**Then** 正确提取 code 字符串。

---

### Edge Cases

- `normalizeAilyMermaid` 接收到空字符串时直接返回原 match，不崩溃。
- `mermaidData` 中 raw 为空时返回 null。
- Regex 无法匹配时退化到 `{ code: raw }`（原始兜底行为）。

## Requirements

### Functional Requirements

- `normalizeAilyMermaid` 不得对 mermaid 内容进行 `JSON.stringify` 包装；直接返回原始内容。
- `mermaidData` getter 在 `parsedData` 为 null 且 raw 以 `{` 开头时，使用 regex 尝试提取 `code` 字段。
- regex 提取后需对 escape 序列进行还原（`\\n` → `\n`，`\\t` → `\t`，`\\"` → `"`，`\\\\` → `\\`）。

### Non-Functional Requirements

- 修改不引入新依赖。
- 修改后所有现有 TypeScript 编译无错误。
- 修改不破坏其他 `aily-*` 类型的渲染（state/button/board 等）。

## Technical Notes

**根因**: `normalizeAilyMermaid` 用 `JSON.stringify({ code: trimmed })` 包装了原始 mermaid 代码。`ngx-x-markdown` 渲染时对 fenced code block 内容进行 entity unescape，导致 `\n` → 真实换行、`\"` → `"`，使 JSON 无效。下游 `parseContent()` 静默忽略 JSON.parse 错误，`parsedData` 为 null，最终 `mermaidData` 返回的 raw 就是破损的 JSON 字符串，mermaid 无法识别其类型，抛出错误。

**修复策略**: 移除根因（JSON 包装）；保留并加强兜底（regex 提取），以处理历史 JSON 包装消息。
