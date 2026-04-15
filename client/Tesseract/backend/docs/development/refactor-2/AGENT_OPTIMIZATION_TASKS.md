# Agent 优化实施清单

**基于**: AGENT_QUALITY_OPTIMIZATION.md
**目标**: 让 Agent 生成与样例相同质量的工作流 JSON

---

## Phase 1: 扩展 Few-Shot 样例

### 文件 1: `src/agents/prompts/few-shot-examples.ts`

**当前行数**: 17 行
**目标行数**: ~400 行

**操作**:
```typescript
// STEP 1: 更新接口
export interface FewShotExample {
  title: string;
  userIntent: string;
  topology: string;
  keyNodes: Array<{         // 新增
    nodeType: string;
    purpose: string;
    config: object;
  }>;
}

// STEP 2: 从 docs/refactor_2/json/gesture.json 提取关键节点
// 提取节点：
// 1. Set Image Payload (容错表达式示例)
// 2. httpRequest - yolov8 识别 (环境变量 + timeout)
// 3. Set Identify Result (多层容错)
// 4. IF 是老刘 (IF v2 完整格式)
// 5. Set 老刘动作与文案 (基础 Set)
// 6. httpRequest - 机械手执行手势 (环境变量)

// STEP 3: 从 docs/refactor_2/json/emo.json 提取
// 提取节点：
// 1. Schedule Trigger (定时触发)
// 2. httpRequest - 摄像头输入 (环境变量)
// 3. Set Camera Payload (容错)
// 4. httpRequest - yolov8 手势识别 (环境变量)

// STEP 4: 从 docs/refactor_2/json/game.json 提取
// 提取节点：
// 1. Schedule Trigger
// 2. Set Countdown (基础 Set)
// 3. httpRequest - TTS (环境变量)
// 4. 复杂 IF 判断（多条件）
```

**执行**:
```bash
# 1. 备份
cp src/agents/prompts/few-shot-examples.ts src/agents/prompts/few-shot-examples.ts.bak

# 2. 手动编辑文件，添加 keyNodes
vim src/agents/prompts/few-shot-examples.ts

# 3. 验证语法
npm run typecheck
```

---

### 文件 2: `src/agents/prompts/architect-system.ts`

**当前行数**: 80 行
**目标行数**: ~150 行

**操作**:
```typescript
// STEP 1: 新增函数
function renderDetailedNodeSpecs(): string {
  return `
## IF v2 完整格式
{
  "parameters": {
    "conditions": {
      "combinator": "and",
      "conditions": [{
        "id": "<uuid>",
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
  "typeVersion": 2
}

## 容错表达式
- ={{$json.x || $json.y || ""}}
- ={{$json.x || ($json.result && $json.result.x) || ""}}

## 环境变量
- ={{$env.API_URL || "http://fallback"}}

## httpRequest 配置
{
  "url": "={{$env.YOLOV8_API_URL || \\"http://ai.local/api/yolov8\\"}}",
  "options": { "timeout": 60000 }
}
`;
}

// STEP 2: 更新 renderExamples()
function renderExamples(): string {
  return FEW_SHOT_EXAMPLES.map((example, index) => {
    const nodesSection = example.keyNodes
      ? `\n关键节点配置:\n${example.keyNodes.map(n =>
          `- ${n.nodeType}: ${n.purpose}\n\`\`\`json\n${JSON.stringify(n.config, null, 2)}\n\`\`\``
        ).join('\n')}`
      : '';

    return `
### 示例 ${index + 1}: ${example.title}
- 用户需求: ${example.userIntent}
- 推荐拓扑: ${example.topology}${nodesSection}
`;
  }).join('\n');
}

// STEP 3: 在 buildArchitectSystemPrompt 中添加
export function buildArchitectSystemPrompt(...) {
  return `
...
# 详细节点配置规范
${renderDetailedNodeSpecs()}

# Few-shot示例
${renderExamples()}
...
`;
}
```

**执行**:
```bash
# 1. 备份
cp src/agents/prompts/architect-system.ts src/agents/prompts/architect-system.ts.bak

# 2. 编辑
vim src/agents/prompts/architect-system.ts

# 3. 验证
npm run typecheck
```

---

## Phase 2: 提取样例节点

### 任务 2.1: 提取 gesture.json 关键节点

**源文件**: `docs/refactor_2/json/gesture.json`
**目标**: 提取 6 个关键节点配置

**节点清单**:
```json
1. Set Image Payload (容错表达式)
   - 位置: nodes[0]
   - 关键: value: "={{$json.imageBase64 || $json.image || \"\"}}"

2. httpRequest - yolov8 识别
   - 位置: nodes[1]
   - 关键: url 环境变量, timeout: 60000

3. Set Identify Result
   - 位置: nodes[2]
   - 关键: 多层容错 ={{$json.person || $json.bestMatch || $json.name || ...}}

4. IF 是老刘
   - 位置: nodes[3]
   - 关键: IF v2 完整格式

5. Set 老刘动作与文案
   - 位置: nodes[6]
   - 关键: 简单 Set

6. httpRequest - 机械手
   - 位置: nodes[8]
   - 关键: 环境变量
```

**执行**:
```bash
# 1. 打开样例文件
cat docs/refactor_2/json/gesture.json

# 2. 复制节点 0, 1, 2, 3, 6, 8 到新文件
vim /tmp/gesture-key-nodes.json

# 3. 清理冗余字段（保留 parameters, type, typeVersion）
# 删除: id, name, position, webhookId
```

---

### 任务 2.2: 提取 emo.json 关键节点

**源文件**: `docs/refactor_2/json/emo.json`

**节点清单**:
```json
1. Schedule Trigger
   - 位置: nodes[0]
   - 关键: scheduleTrigger 配置

2. httpRequest - 摄像头
   - 位置: nodes[1]
   - 关键: 环境变量

3. Set Camera Payload
   - 位置: nodes[3]
   - 关键: 容错表达式

4. httpRequest - yolov8 手势识别
   - 位置: nodes[4]
   - 关键: 环境变量
```

---

### 任务 2.3: 提取 game.json 关键节点

**源文件**: `docs/refactor_2/json/game.json`

**节点清单**:
```json
1. Schedule Trigger
   - 位置: nodes[0]

2. Set Countdown
   - 位置: nodes[1]
   - 关键: 简单 Set

3. httpRequest - TTS
   - 位置: nodes[2]
   - 关键: 环境变量

4. 复杂 IF 判断
   - 查找多条件 IF 节点
   - 关键: combinator, multiple conditions
```

---

## Phase 3: 集成到代码

### 文件 3: `src/agents/prompts/few-shot-examples.ts`（实际代码）

**完整文件结构**:
```typescript
export interface FewShotExample {
  title: string;
  userIntent: string;
  topology: string;
  keyNodes: Array<{
    nodeType: string;
    purpose: string;
    config: {
      parameters: object;
      type: string;
      typeVersion: number;
    };
  }>;
}

export const FEW_SHOT_EXAMPLES: FewShotExample[] = [
  {
    title: '个性化手势交互',
    userIntent: '见到老刘竖个中指骂人',
    topology: 'Webhook 触发 → Set 提取数据 → httpRequest yolov8 识别 → Set 解析结果 → IF 判断人物 → Set 动作配置 → httpRequest 执行手势 + TTS → 喇叭播放',
    keyNodes: [
      {
        nodeType: 'n8n-nodes-base.set',
        purpose: '容错表达式提取图片数据',
        config: {
          parameters: {
            values: {
              string: [{
                name: "imageBase64",
                value: "={{$json.imageBase64 || $json.image || \"\"}}"
              }]
            },
            options: {}
          },
          type: 'n8n-nodes-base.set',
          typeVersion: 2
        }
      },
      {
        nodeType: 'n8n-nodes-base.httpRequest',
        purpose: '环境变量 + timeout 配置示例',
        config: {
          parameters: {
            method: 'POST',
            url: '={{$env.YOLOV8_API_URL || "http://ai.local/api/yolov8/identify"}}',
            options: { timeout: 60000 }
          },
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4
        }
      },
      {
        nodeType: 'n8n-nodes-base.set',
        purpose: '多层容错表达式',
        config: {
          parameters: {
            values: {
              string: [{
                name: "person",
                value: "={{$json.person || $json.bestMatch || $json.name || ($json.result && $json.result.person) || \"\"}}"
              }],
              number: [{
                name: "confidence",
                value: "={{$json.confidence || ($json.result && $json.result.confidence) || 0}}"
              }]
            },
            options: {}
          },
          type: 'n8n-nodes-base.set',
          typeVersion: 2
        }
      },
      {
        nodeType: 'n8n-nodes-base.if',
        purpose: 'IF v2 完整格式示例',
        config: {
          parameters: {
            conditions: {
              combinator: 'and',
              conditions: [{
                id: 'ee4b6a8a-9f58-44b7-96c3-862070df8908',
                leftValue: '={{$json.person}}',
                rightValue: 'liu',
                operator: {
                  type: 'string',
                  operation: 'equals',
                  name: 'filter.operator.equals'
                }
              }],
              options: {
                version: 1,
                typeValidation: 'strict',
                caseSensitive: true
              }
            },
            options: {}
          },
          type: 'n8n-nodes-base.if',
          typeVersion: 2
        }
      }
    ]
  },
  // ... emo 和 game 示例
];
```

---

## 验证清单

### 代码验证
```bash
# 1. TypeScript 编译
npm run typecheck

# 2. 构建
npm run build

# 3. 启动 Agent
npm run agent:dev
```

### 功能验证
```bash
# 1. 测试对话
curl -X POST http://localhost:3005/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"见到老刘竖个中指骂人"}'

# 2. 检查生成的工作流
# 验证点：
# - IF 节点是否包含 combinator
# - IF 节点 operator 是否完整
# - httpRequest 是否有 timeout
# - 是否使用环境变量
# - 是否使用容错表达式
```

---

## 预期改进

### 执行前
```json
// IF 节点可能缺少 combinator
{
  "conditions": {
    "string": [{
      "value1": "={{$json.person}}",
      "value2": "liu"
    }]
  }
}

// httpRequest 可能缺少 timeout
{
  "url": "http://ai.local/api/yolov8"
}

// Set 可能缺少容错
{
  "value": "={{$json.person}}"
}
```

### 执行后
```json
// IF v2 完整格式
{
  "conditions": {
    "combinator": "and",
    "conditions": [{
      "id": "uuid",
      "operator": {
        "type": "string",
        "operation": "equals",
        "name": "filter.operator.equals"
      }
    }]
  }
}

// httpRequest 完整配置
{
  "url": "={{$env.YOLOV8_API_URL || \"http://fallback\"}}",
  "options": { "timeout": 60000 }
}

// Set 容错表达式
{
  "value": "={{$json.person || $json.bestMatch || \"\"}}"
}
```

---

## 工作量分配

```
Phase 1: 更新代码文件          (1 小时)
  ├── few-shot-examples.ts     (30 分钟)
  └── architect-system.ts      (30 分钟)

Phase 2: 提取样例节点          (1 小时)
  ├── gesture.json             (20 分钟)
  ├── emo.json                 (20 分钟)
  └── game.json                (20 分钟)

Phase 3: 集成测试              (1 小时)
  ├── 构建验证                 (15 分钟)
  ├── 功能测试                 (30 分钟)
  └── 质量对比                 (15 分钟)

总计: 3 小时
```

---

**位置**: `/mnt/e/tesseract/docs/refactor_2/AGENT_OPTIMIZATION_TASKS.md`
