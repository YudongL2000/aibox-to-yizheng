# specs/012-mermaid-render-fix/
> L2 | 父级: specs/AGENTS.md

## 简述

修复 `aily-mermaid` 代码块的渲染失败问题（"No diagram type detected" 错误）。

## 根因

`normalizeAilyMermaid()` 用 `JSON.stringify({ code: trimmed })` 包装了原始 mermaid 代码后放入 fenced block。
`ngx-x-markdown` 渲染时对内容进行 entity unescape，导致 `\n` 变为真实换行、`\"` 变为 `"`，破坏 JSON 有效性。
下游 `parseContent()` 静默忽略 JSON.parse 错误，最终 `mermaidData` 返回损坏的 JSON 字符串给 mermaid，触发渲染错误。

## 修复内容

| 文件 | 变更 |
|------|------|
| `x-dialog.component.ts` | `normalizeAilyMermaid` 改为 identity pass-through，不再 JSON 包装 |
| `aily-chat-code.component.ts` | `mermaidData` getter 新增 regex fallback，提取历史 JSON-wrapped 消息中的 code 字段 |

## 关键文件

- `aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-dialog.component.ts`
- `aily-blockly/src/app/tools/aily-chat/components/x-dialog/aily-chat-code.component.ts`

成员清单
spec.md: 特性规格，含根因分析、用户故事与验收标准。
plan.md: 实现计划，含修复策略与文件变更说明。
tasks.md: 细化任务列表，含验收检查清单。
AGENTS.md: 本文件，模块地图。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
