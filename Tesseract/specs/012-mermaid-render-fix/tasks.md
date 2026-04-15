# Tasks: 012 - Mermaid 图表渲染修复

**Feature**: 012-mermaid-render-fix  
**Status**: In Progress

---

## Task 1 — 修复 `normalizeAilyMermaid`

**File**: `aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-dialog.component.ts`  
**Scope**: `normalizeAilyMermaid()` 方法  
**Priority**: P0

### 变更说明
删除 `JSON.stringify({ code: trimmed })` 包装逻辑，方法直接返回原始内容。
保留 `if (this.doing) return content` 防护，不做其他改动。

### 验收条件
- [ ] 方法体只有一行 `return content;`（或等价的最简实现）
- [ ] 编译无 TypeScript 错误
- [ ] 注释更新，说明移除 JSON 包装的原因

---

## Task 2 — 增强 `mermaidData` getter 的 regex 兜底

**File**: `aily-blockly/src/app/tools/aily-chat/components/x-dialog/aily-chat-code.component.ts`  
**Scope**: `mermaidData` getter  
**Priority**: P1

### 变更说明
在 `parsedData` 为 null 且 `raw` 以 `{` 开头时，通过 regex 尝试提取 `code` 字段：
```typescript
if (raw.startsWith('{')) {
  const m = raw.match(/"code"\s*:\s*"([\s\S]*?)(?<!\\)"\s*\}/);
  if (m?.[1]) {
    const extracted = m[1]
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
    return { code: extracted };
  }
}
```

### 验收条件
- [ ] 正常 JSON-wrapped 消息（`parsedData` 有效）走原有路径
- [ ] JSON 无效但含 `code` 字段的内容，regex 正确提取
- [ ] 无法 regex 提取时，退化到 `{ code: raw }`
- [ ] 编译无 TypeScript 错误

---

## Task 3 — 更新 L3 文件头部注释

**Files**: 两个被修改的文件  
**Priority**: P2

### 变更说明
- `x-dialog.component.ts`: 添加或更新 L3 头部（INPUT/OUTPUT/POS/PROTOCOL）
- `aily-chat-code.component.ts`: 更新 L3 头部中关于 `mermaidData` 的 OUTPUT 描述

### 验收条件
- [ ] 两个文件头部均含 `[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md`
- [ ] OUTPUT 字段准确描述新的 mermaidData 行为

---

## Task 4 — 创建 `specs/012-mermaid-render-fix/AGENTS.md`

**File**: `specs/012-mermaid-render-fix/AGENTS.md`  
**Priority**: P2

### 验收条件
- [ ] 文件存在，包含简短说明、修复内容描述、关键文件列表
- [ ] 含父级链接和 `[PROTOCOL]` 行

---

## Completion Checklist

- [ ] Task 1 完成，编译通过
- [ ] Task 2 完成，编译通过
- [ ] Task 3 完成
- [ ] Task 4 完成
- [ ] `specs/AGENTS.md` 更新，添加 012 条目
