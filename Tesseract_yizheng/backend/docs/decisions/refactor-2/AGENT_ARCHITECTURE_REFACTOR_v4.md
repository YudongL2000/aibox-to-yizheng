# Agent 架构重构方案 v4

## 一、问题诊断

### 1.1 质量差距对比

| 维度 | 011702.json (当前) | gesture.json (目标) | 差距 |
|------|-------------------|---------------------|------|
| **节点总数** | 5 | 22 | -77% |
| **触发方式** | Webhook (被动) | Schedule (主动) | ❌ |
| **视觉输入** | 无 | 摄像头+Set | ❌ |
| **AI 识别** | 无 | yolov8+Set | ❌ |
| **语音输出** | 无 | TTS+Set+喇叭 | ❌ |
| **容错表达式** | 无 | 完整多层回退 | ❌ |

### 1.2 根因分析

#### 问题 1：IntakeAgent.buildBlueprint 过于简陋

**当前实现** (`intake-agent.ts:424-471`)：
```typescript
// 只输出 3 种结构
triggers: [{ type: 'webhook' | 'scheduleTrigger' }]
logic: [{ type: 'if' | 'splitInBatches' }]
executors: [{ type: 'set' | 'httpRequest' }]
```

**缺失能力**：
- 无法识别视觉输入需求（看/识别/检测）
- 无法识别 AI 处理类型（人脸/手势/情绪/ASR/LLM）
- 无法识别多种输出类型（手势/机械臂/底盘/屏幕/喇叭）
- 完全没有使用 `workflow-components.ts` 中的 15 个组件

#### 问题 2：WorkflowArchitect.buildUserMessage 信息不足

**当前实现** (`workflow-architect.ts:227-247`)：
```typescript
// 只传递原始意图和实体
用户意图: ${request.userIntent}
识别实体: ${entityStr || '无'}
```

**缺失信息**：
- 没有传递推荐组件列表
- 没有传递拓扑结构建议
- 没有传递最低节点数要求
- LLM 只能从庞大的 system prompt 中自己推理

#### 问题 3：组件库与 Agent 逻辑脱节

```
workflow-components.ts (15 组件) ←───✗───→ IntakeAgent (不知道用)
assembly-rules.ts (5 步规则)     ←───✗───→ buildBlueprint (不执行)
few-shot-examples.ts            ←───✗───→ buildUserMessage (不传递)
```

### 1.3 核心洞察

> 组件库是「静态知识」，Agent 是「动态决策」。
> v3 只完成了静态知识的编码，但动态决策逻辑没有跟进。

---

## 二、重构方案设计

### 2.1 架构目标

```
用户意图
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  ComponentSelector (新增)                                │
│  - 执行 5 步需求分析 (STEP 1-5)                          │
│  - 输出: componentAssembly[] + topology + minimumNodes   │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  IntakeAgent.buildBlueprint (重构)                       │
│  - 使用 ComponentSelector 生成组件建议                   │
│  - 输出增强版 WorkflowBlueprint                          │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  WorkflowArchitect.buildUserMessage (重构)               │
│  - 传递推荐组件列表 + 拓扑 + 最低节点数                   │
│  - 明确指导 LLM 使用哪些组件                             │
└─────────────────────────────────────────────────────────┘
    │
    ▼
完整工作流 (10-22 节点)
```

### 2.2 新增模块：ComponentSelector

**文件路径**: `src/agents/component-selector.ts`

**核心职责**：
1. 执行 5 步需求分析（STEP 1-5）
2. 基于关键词匹配选择组件
3. 计算最低节点数
4. 生成拓扑结构描述

**接口设计**：

```typescript
export interface ComponentSelection {
  trigger: string;              // 'schedule_trigger' | 'webhook_trigger'
  inputs: string[];             // ['camera_input'] | ['microphone_input']
  processes: string[];          // ['yolov8_identify', 'structbert_emotion']
  decisions: string[];          // ['single_condition'] | ['multi_condition_and']
  outputs: string[];            // ['mechanical_hand_execute', 'tts_speaker_output']
  topology: string;             // '触发器 → 摄像头 → 人脸识别 → IF → 机械手 + TTS'
  minimumNodes: number;         // 计算得出的最低节点数
  componentAssembly: string[];  // 完整组件序列
}

export class ComponentSelector {
  constructor(private components: WorkflowComponent[]);

  select(userIntent: string, entities: Record<string, string>): ComponentSelection;

  private analyzeTrigger(intent: string, entities: Record<string, string>): string;
  private analyzeInputs(intent: string): string[];
  private analyzeProcesses(intent: string, entities: Record<string, string>): string[];
  private analyzeDecisions(intent: string, entities: Record<string, string>): string[];
  private analyzeOutputs(intent: string, entities: Record<string, string>): string[];
  private calculateMinimumNodes(selection: Partial<ComponentSelection>): number;
  private generateTopology(selection: Partial<ComponentSelection>): string;
}
```

**关键词映射规则**：

```typescript
// STEP 1: 触发方式
const TRIGGER_KEYWORDS = {
  schedule_trigger: ['定时', '每天', '每周', '每隔', '巡航', '巡逻', '循环'],
  webhook_trigger: ['当', '如果', '收到', '触发', '事件'],
};

// STEP 2: 输入来源
const INPUT_KEYWORDS = {
  camera_input: ['看', '见到', '识别', '检测', '摄像头', '人脸', '手势', '表情'],
  microphone_input: ['听', '说', '语音', '对话', '麦克风', 'ASR'],
};

// STEP 3: AI 处理
const PROCESS_KEYWORDS = {
  yolov8_identify: ['人脸', '识别人', '认出', '老刘', '老付', '谁'],
  yolov8_gesture: ['手势', '石头', '剪刀', '布', '比划'],
  structbert_emotion: ['情绪', '表情', '难过', '开心', '生气', '高兴', '伤心'],
  asr_recognize: ['语音', '听到', '说的', '转写'],
  llm_generate: ['回复', '生成', '回答', '聊天'],
};

// STEP 4: 判断条件
const DECISION_KEYWORDS = {
  single_condition: ['如果', '当', '是'],
  multi_condition_and: ['并且', '同时', '而且', 'AND'],
  multi_condition_or: ['或者', '或', 'OR'],
};

// STEP 5: 输出执行
const OUTPUT_KEYWORDS = {
  mechanical_hand_execute: ['手势', '中指', 'V', '大拇指', '比', '竖'],
  mechanical_arm_execute: ['机械臂', '抓取', '放下', '递'],
  chassis_move: ['移动', '前进', '后退', '转向', '巡航'],
  screen_display: ['显示', '屏幕', '表情', '动画'],
  tts_speaker_output: ['说', '播报', '语音', '喇叭', '骂'],
};
```

### 2.3 重构：WorkflowBlueprint 类型

**文件路径**: `src/agents/types.ts`

**修改**：

```typescript
// 旧版
export interface WorkflowBlueprint {
  intentSummary: string;
  triggers: Array<{ type: 'webhook' | 'scheduleTrigger'; config: Record<string, unknown> }>;
  logic: Array<{ type: 'if' | 'splitInBatches'; config: Record<string, unknown> }>;
  executors: Array<{ type: 'set' | 'httpRequest'; config: Record<string, unknown> }>;
  missingFields: string[];
}

// 新版
export interface WorkflowBlueprint {
  intentSummary: string;

  // 保留旧字段（向后兼容）
  triggers: Array<{ type: 'webhook' | 'scheduleTrigger'; config: Record<string, unknown> }>;
  logic: Array<{ type: 'if' | 'splitInBatches'; config: Record<string, unknown> }>;
  executors: Array<{ type: 'set' | 'httpRequest'; config: Record<string, unknown> }>;
  missingFields: string[];

  // 新增字段（组件驱动）
  componentSelection?: {
    trigger: string;
    inputs: string[];
    processes: string[];
    decisions: string[];
    outputs: string[];
    topology: string;
    minimumNodes: number;
    componentAssembly: string[];
  };
}
```

### 2.4 重构：IntakeAgent.buildBlueprint

**文件路径**: `src/agents/intake-agent.ts`

**修改**：

```typescript
private buildBlueprint(
  message: string,
  category: Intent['category'],
  confirmedEntities: Record<string, string>,
  missingInfo: string[]
): WorkflowBlueprint {
  // 旧逻辑保留（向后兼容）
  const triggers = this.buildTriggers(message, confirmedEntities);
  const logic = this.buildLogic(message, confirmedEntities);
  const executors = this.buildExecutors();

  // 新增：使用 ComponentSelector 生成组件建议
  const componentSelection = this.componentSelector.select(message, confirmedEntities);

  return {
    intentSummary: message.trim(),
    triggers,
    logic,
    executors,
    missingFields: Array.from(new Set(missingInfo)),
    componentSelection,  // 新增
  };
}
```

### 2.5 重构：WorkflowArchitect.buildUserMessage

**文件路径**: `src/agents/workflow-architect.ts`

**修改**：

```typescript
private buildUserMessage(request: WorkflowRequest): string {
  const entityStr = Object.entries(request.entities)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

  // 新增：组件建议部分
  const componentGuidance = request.blueprint?.componentSelection
    ? `
# 组件组装建议（请严格遵循）
- 推荐拓扑: ${request.blueprint.componentSelection.topology}
- 推荐组件: ${request.blueprint.componentSelection.componentAssembly.join(' → ')}
- 最低节点数: ${request.blueprint.componentSelection.minimumNodes}

请按以下顺序组装组件：
1. 触发器: ${request.blueprint.componentSelection.trigger}
2. 输入采集: ${request.blueprint.componentSelection.inputs.join(', ') || '无'}
3. AI 处理: ${request.blueprint.componentSelection.processes.join(', ') || '无'}
4. 条件判断: ${request.blueprint.componentSelection.decisions.join(', ') || '无'}
5. 输出执行: ${request.blueprint.componentSelection.outputs.join(', ') || '无'}

从组件库中复制对应组件的完整节点配置，确保包含环境变量和容错表达式。
`
    : '';

  return `
请为以下需求生成一个n8n工作流：

用户意图: ${request.userIntent}
识别实体: ${entityStr || '无'}
${componentGuidance}
要求：
1. 先输出Reasoning，再输出JSON代码块
2. 必须使用推荐组件，从组件库复制完整节点配置
3. 确保节点数 >= ${request.blueprint?.componentSelection?.minimumNodes ?? 10}
4. 所有 httpRequest 必须包含环境变量兜底和 timeout: 60000
5. 所有数据提取必须使用容错表达式
6. connections 必须用节点 name（不要用 id）
7. JSON 必须严格合法（双引号，无注释，无尾逗号）
`;
}
```

### 2.6 修改：WorkflowRequest 接口

**文件路径**: `src/agents/workflow-architect.ts`

```typescript
export interface WorkflowRequest {
  userIntent: string;
  entities: Record<string, string>;
  hardwareComponents: HardwareComponent[];
  sessionId?: string;
  conversationHistory?: ConversationTurn[];
  blueprint?: WorkflowBlueprint;  // 新增：传递 blueprint
}
```

---

## 三、实施计划

### Phase 1：新增 ComponentSelector

| 步骤 | 任务 | 文件 |
|------|------|------|
| 1.1 | 创建 ComponentSelector 类 | `src/agents/component-selector.ts` |
| 1.2 | 实现关键词映射规则 | 同上 |
| 1.3 | 实现 5 步分析方法 | 同上 |
| 1.4 | 编写单元测试 | `tests/unit/agents/component-selector.test.ts` |

### Phase 2：重构类型与接口

| 步骤 | 任务 | 文件 |
|------|------|------|
| 2.1 | 扩展 WorkflowBlueprint | `src/agents/types.ts` |
| 2.2 | 扩展 WorkflowRequest | `src/agents/workflow-architect.ts` |

### Phase 3：集成 ComponentSelector

| 步骤 | 任务 | 文件 |
|------|------|------|
| 3.1 | IntakeAgent 注入 ComponentSelector | `src/agents/intake-agent.ts` |
| 3.2 | 重构 buildBlueprint 使用 ComponentSelector | 同上 |
| 3.3 | 传递 blueprint 到 WorkflowArchitect | 同上 |

### Phase 4：重构 WorkflowArchitect

| 步骤 | 任务 | 文件 |
|------|------|------|
| 4.1 | 重构 buildUserMessage | `src/agents/workflow-architect.ts` |
| 4.2 | 更新 generateWorkflow 接收 blueprint | 同上 |

### Phase 5：测试与验证

| 步骤 | 任务 | 文件 |
|------|------|------|
| 5.1 | 集成测试：手势交互场景 | `tests/integration/` |
| 5.2 | 集成测试：情感交互场景 | 同上 |
| 5.3 | 集成测试：石头剪刀布场景 | 同上 |

---

## 四、预期效果

### 4.1 输入示例

```
用户意图: "见到老刘竖个中指骂人"
```

### 4.2 ComponentSelector 输出

```typescript
{
  trigger: 'schedule_trigger',
  inputs: ['camera_input'],
  processes: ['yolov8_identify'],
  decisions: ['single_condition'],
  outputs: ['mechanical_hand_execute', 'tts_speaker_output'],
  topology: '定时触发 → 摄像头抓拍 → 人脸识别 → IF(老刘) → 机械手(中指) + TTS(骂人)',
  minimumNodes: 12,
  componentAssembly: [
    'schedule_trigger',
    'camera_input',
    'yolov8_identify',
    'single_condition',
    'mechanical_hand_execute',
    'tts_speaker_output'
  ]
}
```

### 4.3 预期节点数

| 组件 | 节点数 |
|------|--------|
| schedule_trigger | 1 |
| camera_input | 2 (httpRequest + Set) |
| yolov8_identify | 2 (httpRequest + Set) |
| single_condition | 1 (IF) |
| mechanical_hand_execute | 2 (Set + httpRequest) |
| tts_speaker_output | 4 (Set + httpRequest × 2 + Set) |
| **合计** | **12** |

### 4.4 质量指标

| 指标 | 当前 | 目标 |
|------|------|------|
| 节点数 | 5 | 12-15 |
| 视觉输入覆盖 | 0% | 100% |
| AI 处理覆盖 | 0% | 100% |
| 环境变量覆盖 | 20% | 100% |
| 容错表达式覆盖 | 0% | 100% |

---

## 五、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 关键词匹配不准 | 组件选择错误 | 支持 LLM 辅助分析作为 fallback |
| 组件组合冲突 | 数据流断裂 | 基于 inputContract/outputContract 校验 |
| 提示词过长 | LLM 截断或忽略 | 组件建议放在 user message 顶部 |
| 向后兼容 | 旧逻辑失效 | componentSelection 为可选字段 |

---

## 六、文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新增 | `src/agents/component-selector.ts` | 组件选择器 |
| 修改 | `src/agents/types.ts` | 扩展 WorkflowBlueprint |
| 修改 | `src/agents/intake-agent.ts` | 集成 ComponentSelector |
| 修改 | `src/agents/workflow-architect.ts` | 重构 buildUserMessage |
| 新增 | `tests/unit/agents/component-selector.test.ts` | 单元测试 |

---

## 七、验收标准

1. **节点数量**: 生成工作流 >= 10 节点
2. **组件覆盖**: 触发器 + 输入 + 处理 + 判断 + 输出 全覆盖
3. **环境变量**: 所有 httpRequest 使用 `$env.XXX || "fallback"`
4. **容错表达式**: 所有数据提取使用 `$json.x || $json.y || ""`
5. **拓扑完整**: 无孤立节点，connections 完整

---

**文档版本**: v4.0
**创建日期**: 2026-01-17
**状态**: 待实施
