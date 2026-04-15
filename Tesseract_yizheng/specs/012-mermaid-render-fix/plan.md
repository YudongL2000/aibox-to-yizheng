# Plan: 012 - Mermaid 图表渲染修复

**Feature**: 012-mermaid-render-fix  
**Parent Spec**: spec.md  
**Tech Stack**: Angular 17+ standalone, TypeScript, ngx-x-markdown, mermaid  
**New Dependencies**: 无

---

## Root Cause Analysis

```
normalizeAilyMermaid()
  └─ JSON.stringify({ code: trimmed })
       └─ ngx-x-markdown renders fenced block
            └─ unescapes \n → newline, \" → "  [CORRUPTION]
                 └─ parseContent() JSON.parse fails → parsedData = null
                      └─ mermaidData returns { code: raw }  [raw = broken JSON]
                           └─ mermaid: "No diagram type detected" ❌
```

## Fix Strategy

**P0 — 根因切除**: 移除 `normalizeAilyMermaid` 中的 JSON 包装，直接返回原始内容。  
**P1 — 兜底加强**: `mermaidData` getter 新增 regex fallback，处理已存在的历史 JSON-wrapped 消息。

---

## Files to Modify

| 文件 | 变更说明 |
|------|---------|
| `aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-dialog.component.ts` | 删除 `normalizeAilyMermaid` 中的 `JSON.stringify` 包装逻辑；方法变为 identity pass-through |
| `aily-blockly/src/app/tools/aily-chat/components/x-dialog/aily-chat-code.component.ts` | `mermaidData` getter 新增 regex fallback 分支；更新 L3 文件头 |

---

## Design Decisions

### 1. 为何 `normalizeAilyMermaid` 仍保留内容不变？

`AilyChatCodeComponent.mermaidData` 的现有兜底路径已能处理原始 mermaid 代码：
```typescript
return raw ? { code: raw } : null;
```
额外的 JSON 包装不增加任何价值，只引入了 escape 问题。

### 2. Regex 兜底的精确性

Regex `/"code"\s*:\s*"([\s\S]*?)(?<!\\)"\s*\}/` 用 negative lookbehind 确保不在转义引号处截断，
然后对结果做 unescape 还原，确保提取出有效的 mermaid 代码字符串。

### 3. 测试策略

单元测试在 `aily-blockly/src/app/tools/aily-chat/components/x-dialog/` 目录中创建，
覆盖 `mermaidData` getter 的三条路径（正常 JSON、regex 兜底、纯 raw）。

---

## Implementation Order

1. 修改 `normalizeAilyMermaid`（删除 JSON 包装）
2. 增强 `mermaidData` getter（regex fallback）
3. 更新两个文件的 L3 头部注释
4. 创建 `specs/012-mermaid-render-fix/AGENTS.md`
