# Agent 工作流生成质量优化方案

**目标**: 使 Agent 能够生成与样例（gesture.json、emo.json、game.json）相同质量的工作流 JSON

---

## 问题诊断

### 样例质量特征
```
✅ IF v2 完整格式：conditions.combinator + conditions.conditions[{operator: {type, operation, name}}]
✅ 容错表达式：={{$json.x || $json.y || ($json.z && $json.z.x) || ""}}
✅ 环境变量：={{$env.XXX_URL || "fallback"}}
✅ 正确 typeVersion：if v2, httpRequest v4, set v2, scheduleTrigger v1
✅ httpRequest options：{timeout: 60000}
✅ 清晰节点命名：httpRequest - yolov8 识别
✅ 合理布局：position 间隔 220px
```

### 当前实现不足
```
❌ few-shot-examples.ts：只有 topology 描述，无完整 JSON
❌ architect-system.ts：IF v2 格式说明不足，缺少 operator 对象结构
❌ 缺少节点配置模板：容错表达式、环境变量模式未体现
❌ prompt 不够详细：缺少关键字段示例
```

---

## 优化方案

### 方案 A：扩展 Few-Shot 样例（推荐）

**文件**: `src/agents/prompts/few-shot-examples.ts`

**当前**:
```typescript
export const FEW_SHOT_EXAMPLES = [
  { title: '个性化手势交互', userIntent: '...', topology: '...' },
  { title: '情感交互', userIntent: '...', topology: '...' },
  { title: '石头剪刀布', userIntent: '...', topology: '...' },
];
```

**优化后**:
```typescript
export const FEW_SHOT_EXAMPLES = [
  {
    title: '个性化手势交互',
    userIntent: '见到老刘竖个中指骂人',
    topology: '...',
    fullWorkflow: {  // 新增完整 JSON
      name: '...',
      nodes: [...],  // 从 gesture.json 提取关键节点
      connections: {...}
    }
  },
  // ... 其他两个示例
];
```

**关键节点提取**:
- Webhook 触发器（完整配置）
- Set 节点（容错表达式示例）
- httpRequest 节点（环境变量 + timeout）
- IF v2 节点（完整 conditions 格式）

**优点**: 直接提供完整样例，LLM 直接模仿
**缺点**: Prompt 变长，但可控（精选关键节点）

---

### 方案 B：新增节点配置模板文件

**文件**: `src/agents/prompts/node-config-templates.ts`（新建）

**内容**:
```typescript
export const NODE_CONFIG_TEMPLATES = {
  httpRequest: {
    pattern: `{
  "parameters": {
    "method": "POST",
    "url": "={{$env.XXX_API_URL || \\"http://fallback.url\\"}}",
    "options": { "timeout": 60000 }
  },
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4
}`,
    examples: [
      '={{$env.YOLOV8_API_URL || "http://ai.local/api/yolov8/identify"}}'
    ]
  },

  ifV2: {
    pattern: `{
  "parameters": {
    "conditions": {
      "combinator": "and",
      "conditions": [{
        "id": "uuid",
        "leftValue": "={{$json.field}}",
        "rightValue": "value",
        "operator": {
          "type": "string",
          "operation": "equals",
          "name": "filter.operator.equals"
        }
      }],
      "options": { "version": 1 }
    }
  },
  "type": "n8n-nodes-base.if",
  "typeVersion": 2
}`,
    operators: {
      string: ['equals', 'notEquals', 'contains', 'startsWith', 'endsWith'],
      number: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte']
    }
  },

  set: {
    pattern: `{
  "parameters": {
    "values": {
      "string": [{ "name": "field", "value": "={{$json.x || $json.y || \\"\\"}}" }],
      "number": [{ "name": "count", "value": "={{$json.n || 0}}" }]
    },
    "options": {}
  },
  "type": "n8n-nodes-base.set",
  "typeVersion": 2
}`,
    faultTolerantPatterns: [
      '={{$json.x || $json.y || ""}}',
      '={{$json.x || $json.y || ($json.z && $json.z.x) || ""}}',
      '={{$json.data && $json.data.field || $json.field || ""}}'
    ]
  }
};
```

**使用**: 在 `architect-system.ts` 中引用模板
**优点**: 结构化，易维护
**缺点**: 需要修改 prompt 生成逻辑

---

### 方案 C：增强 Architect System Prompt

**文件**: `src/agents/prompts/architect-system.ts`

**当前问题**:
```typescript
// 规范过于简单
7. IF 使用 filter 结构：conditions.combinator + conditions.conditions
```

**优化后**:
```typescript
7. IF v2 完整格式（必须严格遵守）：
{
  "parameters": {
    "conditions": {
      "combinator": "and",  // or "or"
      "conditions": [
        {
          "id": "<uuid>",
          "leftValue": "={{$json.fieldName}}",
          "rightValue": "expectedValue",
          "operator": {
            "type": "string",        // or "number", "boolean"
            "operation": "equals",   // 根据 type 选择操作
            "name": "filter.operator.equals"  // 必需字段
          }
        }
      ],
      "options": { "version": 1, "typeValidation": "strict", "caseSensitive": true }
    }
  },
  "type": "n8n-nodes-base.if",
  "typeVersion": 2
}

8. 容错表达式模式（必须使用）：
- 单层回退：={{$json.primary || $json.fallback || ""}}
- 多层回退：={{$json.x || $json.y || ($json.z && $json.z.x) || ""}}
- 环境变量：={{$env.API_URL || "http://default.url"}}

9. httpRequest 必须包含：
- options: { timeout: 60000 }
- 环境变量 URL：url: "={{$env.XXX_API_URL || \\"fallback\\"}}"
```

**优点**: 直接增强指令，无需新文件
**缺点**: Prompt 更长

---

## 推荐实施方案（组合）

### Phase 1: 扩展 Few-Shot（高优先级）

**操作**:
1. 从 `docs/refactor_2/json/` 提取 3 个样例的**核心节点**
2. 更新 `few-shot-examples.ts`，添加 `fullWorkflow` 或 `keyNodes` 字段
3. 每个示例保留 4-6 个关键节点（触发器、IF、httpRequest、Set）

**代码改动**:
```typescript
// src/agents/prompts/few-shot-examples.ts
export interface FewShotExample {
  title: string;
  userIntent: string;
  topology: string;
  keyNodes: Array<{  // 新增
    nodeType: string;
    purpose: string;
    config: Record<string, unknown>;
  }>;
}

export const FEW_SHOT_EXAMPLES: FewShotExample[] = [
  {
    title: '个性化手势交互',
    userIntent: '见到老刘竖个中指骂人',
    topology: '...',
    keyNodes: [
      {
        nodeType: 'n8n-nodes-base.webhook',
        purpose: '摄像头输入触发',
        config: { /* 从 gesture.json 提取 */ }
      },
      {
        nodeType: 'n8n-nodes-base.if',
        purpose: '判断是否老刘',
        config: { /* IF v2 完整格式 */ }
      },
      {
        nodeType: 'n8n-nodes-base.httpRequest',
        purpose: 'yolov8 识别',
        config: { /* 环境变量 + timeout */ }
      },
      {
        nodeType: 'n8n-nodes-base.set',
        purpose: '容错数据提取',
        config: { /* 容错表达式 */ }
      }
    ]
  },
  // ... 其他示例
];
```

### Phase 2: 增强 System Prompt（中优先级）

**操作**:
1. 在 `architect-system.ts` 中添加详细的节点配置规范
2. 包含完整的 IF v2 格式、容错表达式、环境变量模式

**代码改动**:
```typescript
// src/agents/prompts/architect-system.ts

function renderDetailedNodeSpecs(): string {
  return `
## IF 节点 v2 完整格式（必须严格遵守）
\`\`\`json
{
  "parameters": {
    "conditions": {
      "combinator": "and",
      "conditions": [{
        "id": "ee4b6a8a-9f58-44b7-96c3-862070df8908",
        "leftValue": "={{$json.person}}",
        "rightValue": "liu",
        "operator": {
          "type": "string",
          "operation": "equals",
          "name": "filter.operator.equals"
        }
      }],
      "options": { "version": 1, "typeValidation": "strict", "caseSensitive": true }
    }
  },
  "type": "n8n-nodes-base.if",
  "typeVersion": 2
}
\`\`\`

## 容错表达式（必须使用）
- 单层: \`={{$json.x || $json.y || ""}}\`
- 多层: \`={{$json.x || ($json.result && $json.result.x) || ""}}\`
- 环境变量: \`={{$env.API_URL || "http://fallback"}}\`

## httpRequest 必须配置
\`\`\`json
{
  "parameters": {
    "method": "POST",
    "url": "={{$env.YOLOV8_API_URL || \\"http://ai.local/api/yolov8\\"}}",
    "options": { "timeout": 60000 }
  },
  "typeVersion": 4
}
\`\`\`
`;
}

// 在 buildArchitectSystemPrompt 中调用
export function buildArchitectSystemPrompt(...) {
  return `
...
${renderDetailedNodeSpecs()}
...
`;
}
```

### Phase 3: 优化验证逻辑（低优先级）

**操作**:
1. 在 `workflow-architect.ts` 中添加质量检查
2. 检测关键模式是否存在（容错表达式、环境变量）

**代码改动**:
```typescript
// src/agents/workflow-architect.ts

private validateWorkflowQuality(workflow: WorkflowDefinition): string[] {
  const warnings: string[] = [];

  for (const node of workflow.nodes) {
    if (node.type === 'n8n-nodes-base.if' && node.typeVersion === 2) {
      const conditions = node.parameters?.conditions as any;
      if (!conditions?.combinator || !conditions?.conditions) {
        warnings.push(`IF 节点 ${node.name} 缺少 combinator 或 conditions`);
      }
      for (const cond of conditions?.conditions || []) {
        if (!cond.operator?.type || !cond.operator?.operation) {
          warnings.push(`IF 节点 ${node.name} operator 格式不完整`);
        }
      }
    }

    if (node.type === 'n8n-nodes-base.httpRequest') {
      if (!node.parameters?.options?.timeout) {
        warnings.push(`httpRequest 节点 ${node.name} 缺少 timeout`);
      }
    }
  }

  return warnings;
}
```

---

## 实施优先级

```
P0: Phase 1 - 扩展 Few-Shot 样例
    ├── 提取 3 个样例关键节点
    ├── 更新 few-shot-examples.ts
    └── 更新 architect-system.ts 引用

P1: Phase 2 - 增强 System Prompt
    ├── 添加详细节点配置规范
    └── 容错表达式 + 环境变量模式

P2: Phase 3 - 质量验证（可选）
    └── 添加工作流质量检查
```

---

## 预期效果

### 执行 Phase 1 后
```
✅ LLM 看到完整的 IF v2 配置
✅ LLM 看到容错表达式示例
✅ LLM 看到环境变量用法
✅ 生成的工作流与样例质量接近
```

### 执行 Phase 1+2 后
```
✅ Prompt 包含详细规范
✅ Few-Shot 提供具体样例
✅ 双重保障，生成质量显著提升
```

---

## 工作量估算

| Phase | 任务 | 工时 |
|-------|------|------|
| **Phase 1** | 提取样例节点 | 30 分钟 |
| | 更新 few-shot-examples.ts | 30 分钟 |
| | 更新 architect-system.ts | 15 分钟 |
| **Phase 2** | 编写详细规范 | 45 分钟 |
| | 集成到 prompt | 15 分钟 |
| **Phase 3** | 添加质量检查 | 30 分钟 |
| **测试** | 生成测试 + 验证 | 60 分钟 |
| **总计** | | **3.5 小时** |

---

## 下一步

1. 确认采用方案（推荐 Phase 1 + Phase 2 组合）
2. 从 `docs/refactor_2/json/` 提取关键节点
3. 逐步实施优化
4. 测试生成质量

---

**位置**: `/mnt/e/tesseract/docs/refactor_2/AGENT_QUALITY_OPTIMIZATION.md`
