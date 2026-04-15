# Agent 架构优化设计文档
## 基于 Claude Code Agent 框架的可扩展性与鲁棒性提升方案

**文档版本**: v1.0
**创建日期**: 2026-03-05
**作者**: AI Architecture Team
**目标**: 基于 Claude Code (CC) Agent 框架优化 tesseract-BE 项目的 Agent 架构

---

## 一、现状分析

### 1.1 当前架构概览

**tesseract-BE Agent 系统现状**:
```
src/agents/
├── intake-agent.ts              # 意图解析 + 蓝图生成
├── config-agent.ts              # 硬件配置状态机
├── workflow-architect.ts        # 工作流生成 + 验证循环
├── config-workflow-orchestrator.ts  # 配置流程编排
├── component-selector.ts        # 组件选择器
├── hardware-service.ts          # 硬件组件推断
├── session-service.ts           # 会话管理
├── llm-client.ts                # LLM 调用封装
├── mcp-client.ts                # MCP 工具调用
└── prompts/                     # 提示词库（14+ 文件）
```

**核心问题识别**:

1. **单体化严重**: `workflow-architect.ts` 超过 1500 行，违反 KISS 原则
2. **职责耦合**: 意图解析、组件选择、工作流生成、验证循环混杂在同一流程
3. **扩展性差**: 新增场景需要修改核心 Agent 代码，违反 OCP 原则
4. **鲁棒性弱**: 缺乏统一的错误恢复机制和状态回滚能力
5. **提示词管理混乱**: 14+ 提示词文件分散，缺乏版本控制和 A/B 测试能力

### 1.2 Claude Code Agent 框架核心特性

**CC Agent 框架优势**:

1. **声明式定义**: YAML frontmatter + Markdown 系统提示词
2. **自动触发机制**: 基于 `description` 字段的示例驱动触发
3. **工具隔离**: 通过 `tools` 字段实现最小权限原则
4. **模型灵活性**: 支持 `inherit/sonnet/opus/haiku` 动态选择
5. **可组合性**: Agent 可以调用其他 Agent，形成层次化架构
6. **可测试性**: 清晰的输入输出契约，易于单元测试

**CC Agent 文件结构**:
```markdown
---
name: agent-identifier
description: Use this agent when... Examples: <example>...</example>
model: inherit
color: blue
tools: ["Read", "Grep", "Bash"]
---

You are [role]...

**Core Responsibilities:**
1. [Responsibility 1]
2. [Responsibility 2]

**Process:**
[Step-by-step workflow]

**Output Format:**
[Expected output structure]
```

---

## 二、架构优化设计

### 2.1 设计哲学

**三层认知架构**:

```
现象层 (Phenomenal Layer)
  ↓ 捕捉用户意图、硬件状态、错误症状
本质层 (Essential Layer)
  ↓ 诊断系统性问题、架构缺陷、设计原罪
哲学层 (Philosophical Layer)
  ↓ 探索设计规律、架构美学、演化方向
```

**核心原则**:

1. **KISS**: 每个 Agent 只做一件事，函数不超过 20 行
2. **YAGNI**: 仅实现当前明确所需的功能，拒绝过度设计
3. **DRY**: 提示词模板化，避免重复
4. **SOLID**: 单一职责、开闭原则、依赖倒置
5. **Good Taste**: 消除特殊情况而非增加 if/else

### 2.2 新架构蓝图

#### 2.2.1 Agent 层次化拆分

```
.claude/agents/
├── orchestration/
│   ├── intent-parser.md          # L1: 意图解析 (替代 intake-agent 部分职责)
│   ├── blueprint-generator.md    # L1: 蓝图生成 (替代 intake-agent 部分职责)
│   └── workflow-orchestrator.md  # L1: 总编排器 (协调所有子 Agent)
│
├── component-selection/
│   ├── hardware-analyzer.md      # L2: 硬件能力分析
│   ├── component-recommender.md  # L2: 组件推荐引擎
│   └── dependency-resolver.md    # L2: 依赖关系解析
│
├── workflow-generation/
│   ├── node-generator.md         # L2: 节点生成器
│   ├── connection-builder.md     # L2: 连线构建器
│   ├── parameter-filler.md       # L2: 参数填充器
│   └── validation-fixer.md       # L2: 验证修复器
│
├── configuration/
│   ├── config-state-manager.md   # L2: 配置状态机
│   ├── hardware-configurator.md  # L2: 硬件配置器
│   └── config-validator.md       # L2: 配置验证器
│
└── specialized/
    ├── gesture-identity-builder.md  # L3: 手势身份分支构建
    ├── result-branch-builder.md     # L3: 结果分支构建
    ├── expression-generator.md      # L3: n8n 表达式生成
    └── error-recovery-agent.md      # L3: 错误恢复代理
```

**层级职责**:

- **L1 (Orchestration)**: 总控层，协调子 Agent，管理会话状态
- **L2 (Domain)**: 领域层，处理特定领域逻辑（组件选择、工作流生成、配置管理）
- **L3 (Specialized)**: 专家层，处理高度专业化的任务（手势识别、表达式生成）

#### 2.2.2 Agent 示例：Intent Parser

```markdown
---
name: intent-parser
description: Use this agent when you need to parse user's natural language requirements into structured intent. Examples:

<example>
Context: User describes a workflow requirement in Chinese.
user: "我需要一个工作流，当摄像头检测到人脸时，播放欢迎语音"
assistant: "I'll use the intent-parser agent to extract structured intent from this requirement."
<commentary>
This requires parsing natural language into structured entities (trigger: face detection, action: play audio), which is the core responsibility of intent-parser.
</commentary>
</example>

<example>
Context: User provides vague requirements.
user: "帮我做一个手势控制的东西"
assistant: "Let me invoke intent-parser to clarify the intent and extract key entities."
<commentary>
Vague requirements need intent clarification, which intent-parser handles by asking follow-up questions.
</commentary>
</example>

model: sonnet
color: blue
tools: ["Read", "Grep"]
---

You are an expert intent parser specializing in n8n workflow requirements.

**Core Responsibilities:**
1. Parse natural language into structured intent (trigger, actions, conditions)
2. Extract entities (hardware components, parameters, constraints)
3. Identify ambiguities and generate clarification questions
4. Output standardized intent schema

**Analysis Process:**
1. Tokenize user input and identify key phrases
2. Map phrases to workflow concepts (trigger, action, condition, loop)
3. Extract hardware references (camera, microphone, speaker, screen, hand)
4. Detect missing critical information
5. Generate clarification questions if needed

**Output Format:**
```json
{
  "intent": {
    "trigger": { "type": "hardware", "component": "camera", "event": "face_detected" },
    "actions": [
      { "type": "audio", "component": "speaker", "action": "play", "content": "welcome_message" }
    ],
    "conditions": [],
    "loop": false
  },
  "entities": {
    "hardware": ["camera", "speaker"],
    "parameters": { "audio_content": "welcome_message" }
  },
  "confidence": 0.95,
  "clarifications": []
}
```

**Edge Cases:**
- Ambiguous hardware references: Ask user to specify exact component
- Missing trigger: Default to webhook trigger and notify user
- Conflicting actions: Prioritize based on user's primary goal
```

#### 2.2.3 Agent 示例：Validation Fixer

```markdown
---
name: validation-fixer
description: Use this agent when workflow validation fails and automatic fixes are needed. Examples:

<example>
Context: Workflow validation returns errors about missing required fields.
user: "The workflow validation failed with 'missing required field: topology'"
assistant: "I'll use validation-fixer to automatically resolve this validation error."
<commentary>
Validation errors require systematic analysis and auto-fixing, which is validation-fixer's specialty.
</commentary>
</example>

model: haiku
color: yellow
tools: ["Read", "Write"]
---

You are a validation error recovery specialist for n8n workflows.

**Core Responsibilities:**
1. Analyze validation error messages
2. Apply auto-fix rules based on error patterns
3. Retry validation after fixes
4. Report unfixable errors with remediation suggestions

**Fix Strategies:**
1. Missing required fields → Apply default values from node templates
2. Invalid connections → Rebuild connections based on node dependencies
3. Type mismatches → Cast values to expected types
4. Expression errors → Escape special characters and validate syntax

**Output Format:**
```json
{
  "fixed": true,
  "iterations": 2,
  "appliedFixes": [
    { "error": "missing topology", "fix": "added default topology value", "success": true }
  ],
  "remainingErrors": [],
  "workflow": { ... }
}
```

**Quality Standards:**
- Maximum 3 fix iterations to avoid infinite loops
- Always preserve user-provided values
- Log all fixes for audit trail
```

### 2.3 提示词管理优化

#### 2.3.1 提示词模板化

**当前问题**: 14+ 提示词文件分散，重复内容多，难以维护

**优化方案**: 提示词模板 + 变量注入

```typescript
// src/agents/prompts/template-engine.ts
export interface PromptTemplate {
  id: string;
  version: string;
  variables: Record<string, string>;
  template: string;
}

export class PromptTemplateEngine {
  private templates: Map<string, PromptTemplate> = new Map();

  register(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  render(templateId: string, context: Record<string, any>): string {
    const template = this.templates.get(templateId);
    if (!template) throw new Error(`Template ${templateId} not found`);

    return this.interpolate(template.template, { ...template.variables, ...context });
  }

  private interpolate(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] || '');
  }
}
```

**提示词模板示例**:

```yaml
# prompts/templates/node-generation.yaml
id: node-generation-v1
version: 1.0.0
variables:
  node_type: "{{node_type}}"
  hardware_components: "{{hardware_components}}"
  user_intent: "{{user_intent}}"
template: |
  Generate a {{node_type}} node for the following workflow:

  User Intent: {{user_intent}}
  Available Hardware: {{hardware_components}}

  Requirements:
  1. Use typeVersion {{type_version}}
  2. Follow naming convention: {{naming_pattern}}
  3. Include required fields: {{required_fields}}

  Output JSON schema:
  {{output_schema}}
```

#### 2.3.2 提示词版本控制与 A/B 测试

```typescript
// src/agents/prompts/prompt-registry.ts
export interface PromptVersion {
  id: string;
  version: string;
  template: string;
  performance: {
    successRate: number;
    avgIterations: number;
    lastUpdated: Date;
  };
}

export class PromptRegistry {
  private versions: Map<string, PromptVersion[]> = new Map();

  registerVersion(promptId: string, version: PromptVersion): void {
    if (!this.versions.has(promptId)) {
      this.versions.set(promptId, []);
    }
    this.versions.get(promptId)!.push(version);
  }

  selectBestVersion(promptId: string): PromptVersion {
    const versions = this.versions.get(promptId) || [];
    return versions.reduce((best, current) =>
      current.performance.successRate > best.performance.successRate ? current : best
    );
  }

  abTest(promptId: string, trafficSplit: number = 0.5): PromptVersion {
    const versions = this.versions.get(promptId) || [];
    if (versions.length < 2) return versions[0];

    return Math.random() < trafficSplit ? versions[0] : versions[1];
  }
}
```

### 2.4 错误恢复与状态回滚

#### 2.4.1 统一错误恢复机制

```typescript
// src/agents/error-recovery/recovery-strategy.ts
export interface RecoveryStrategy {
  canHandle(error: Error): boolean;
  recover(context: AgentContext, error: Error): Promise<RecoveryResult>;
}

export interface RecoveryResult {
  success: boolean;
  action: 'retry' | 'fallback' | 'abort';
  newState?: any;
  message: string;
}

export class ValidationErrorRecovery implements RecoveryStrategy {
  canHandle(error: Error): boolean {
    return error.message.includes('validation failed');
  }

  async recover(context: AgentContext, error: Error): Promise<RecoveryResult> {
    // 1. 解析验证错误
    const validationErrors = this.parseValidationErrors(error);

    // 2. 应用自动修复规则
    const fixes = await this.applyAutoFixes(context.workflow, validationErrors);

    // 3. 重新验证
    const revalidation = await context.mcpClient.validateWorkflow(context.workflow);

    if (revalidation.isValid) {
      return {
        success: true,
        action: 'retry',
        newState: context.workflow,
        message: `Applied ${fixes.length} auto-fixes successfully`
      };
    }

    return {
      success: false,
      action: 'fallback',
      message: 'Auto-fix failed, falling back to manual configuration'
    };
  }
}
```

#### 2.4.2 状态快照与回滚

```typescript
// src/agents/state-management/snapshot-manager.ts
export interface StateSnapshot {
  id: string;
  timestamp: Date;
  agentState: any;
  workflowState: WorkflowDefinition;
  metadata: {
    agent: string;
    operation: string;
    success: boolean;
  };
}

export class SnapshotManager {
  private snapshots: Map<string, StateSnapshot[]> = new Map();
  private maxSnapshots = 10;

  createSnapshot(sessionId: string, state: any, metadata: any): string {
    const snapshot: StateSnapshot = {
      id: randomUUID(),
      timestamp: new Date(),
      agentState: structuredClone(state.agentState),
      workflowState: structuredClone(state.workflowState),
      metadata
    };

    if (!this.snapshots.has(sessionId)) {
      this.snapshots.set(sessionId, []);
    }

    const sessionSnapshots = this.snapshots.get(sessionId)!;
    sessionSnapshots.push(snapshot);

    // 保留最近 N 个快照
    if (sessionSnapshots.length > this.maxSnapshots) {
      sessionSnapshots.shift();
    }

    return snapshot.id;
  }

  rollback(sessionId: string, snapshotId?: string): StateSnapshot | null {
    const sessionSnapshots = this.snapshots.get(sessionId);
    if (!sessionSnapshots || sessionSnapshots.length === 0) return null;

    if (snapshotId) {
      const snapshot = sessionSnapshots.find(s => s.id === snapshotId);
      return snapshot ? structuredClone(snapshot) : null;
    }

    // 回滚到最近一次成功的快照
    for (let i = sessionSnapshots.length - 1; i >= 0; i--) {
      if (sessionSnapshots[i].metadata.success) {
        return structuredClone(sessionSnapshots[i]);
      }
    }

    return null;
  }
}
```

### 2.5 场景可扩展性设计

#### 2.5.1 场景注册机制

```typescript
// src/agents/scenarios/scenario-registry.ts
export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  triggerPatterns: RegExp[];
  requiredComponents: string[];
  agentPipeline: string[];  // Agent 调用顺序
  validationRules: ValidationRule[];
}

export class ScenarioRegistry {
  private scenarios: Map<string, ScenarioDefinition> = new Map();

  register(scenario: ScenarioDefinition): void {
    this.scenarios.set(scenario.id, scenario);
  }

  match(userIntent: string): ScenarioDefinition | null {
    for (const scenario of this.scenarios.values()) {
      if (scenario.triggerPatterns.some(pattern => pattern.test(userIntent))) {
        return scenario;
      }
    }
    return null;
  }

  getAgentPipeline(scenarioId: string): string[] {
    return this.scenarios.get(scenarioId)?.agentPipeline || [];
  }
}
```

**场景配置示例**:

```yaml
# scenarios/gesture-control.yaml
id: gesture-control
name: 手势控制场景
description: 基于手势识别的交互控制
triggerPatterns:
  - "手势.*控制"
  - "gesture.*control"
  - "识别.*手势"
requiredComponents:
  - camera
  - yolo-hand
  - assign
agentPipeline:
  - intent-parser
  - hardware-analyzer
  - component-recommender
  - node-generator
  - gesture-identity-builder
  - connection-builder
  - validation-fixer
validationRules:
  - type: required_node
    nodeType: n8n-nodes-base.httpRequest
    category: YOLO-HAND
  - type: required_connection
    from: YOLO-HAND
    to: ASSIGN
```

#### 2.5.2 动态 Agent 组合

```typescript
// src/agents/orchestration/agent-pipeline.ts
export class AgentPipeline {
  constructor(
    private agentRegistry: AgentRegistry,
    private scenarioRegistry: ScenarioRegistry
  ) {}

  async execute(sessionId: string, userIntent: string): Promise<WorkflowResult> {
    // 1. 匹配场景
    const scenario = this.scenarioRegistry.match(userIntent);
    if (!scenario) {
      throw new Error('No matching scenario found');
    }

    // 2. 构建 Agent 管道
    const pipeline = scenario.agentPipeline.map(agentId =>
      this.agentRegistry.get(agentId)
    );

    // 3. 顺序执行 Agent
    let context: AgentContext = { sessionId, userIntent, state: {} };

    for (const agent of pipeline) {
      try {
        context = await agent.execute(context);
      } catch (error) {
        // 错误恢复
        const recovery = await this.recoverFromError(context, error);
        if (!recovery.success) {
          throw error;
        }
        context = recovery.newContext;
      }
    }

    return context.result;
  }
}
```

---

## 三、实施路径

### 3.1 Phase 1: 基础设施搭建 (Week 1-2)

**目标**: 建立 Agent 框架基础设施

**任务**:
1. 创建 `.claude/agents/` 目录结构
2. 实现 `PromptTemplateEngine` 和 `PromptRegistry`
3. 实现 `SnapshotManager` 和错误恢复机制
4. 实现 `ScenarioRegistry` 和 `AgentPipeline`
5. 编写单元测试覆盖核心组件

**验收标准**:
- [ ] 所有基础设施类通过单元测试
- [ ] 提示词模板引擎支持变量注入
- [ ] 状态快照支持回滚到任意历史版本
- [ ] 场景注册支持动态添加新场景

### 3.2 Phase 2: Agent 拆分与迁移 (Week 3-4)

**目标**: 将现有单体 Agent 拆分为细粒度 Agent

**任务**:
1. 拆分 `intake-agent.ts` → `intent-parser.md` + `blueprint-generator.md`
2. 拆分 `workflow-architect.ts` → 4 个子 Agent (node-generator, connection-builder, parameter-filler, validation-fixer)
3. 拆分 `config-agent.ts` → 3 个子 Agent (config-state-manager, hardware-configurator, config-validator)
4. 迁移 `prompts/` 目录到模板化系统
5. 编写集成测试验证拆分后的功能等价性

**验收标准**:
- [ ] 每个 Agent 文件不超过 300 行
- [ ] 所有 Agent 通过触发测试
- [ ] 集成测试覆盖原有功能
- [ ] 性能无明显下降（<10% 延迟增加）

### 3.3 Phase 3: 场景扩展与优化 (Week 5-6)

**目标**: 验证新架构的可扩展性

**任务**:
1. 添加 3 个新场景配置（手势控制、情绪识别、语音交互）
2. 实现场景特定的 Agent（gesture-identity-builder, emotion-analyzer）
3. 实施提示词 A/B 测试，优化成功率
4. 优化错误恢复策略，降低失败率
5. 性能压测与优化

**验收标准**:
- [ ] 新场景无需修改核心 Agent 代码
- [ ] 提示词 A/B 测试显示成功率提升 >5%
- [ ] 错误恢复成功率 >80%
- [ ] 并发 10 会话无性能瓶颈

### 3.4 Phase 4: 文档与监控 (Week 7)

**目标**: 完善文档和可观测性

**任务**:
1. 编写 Agent 开发指南
2. 生成 Agent 调用链路图
3. 实现 Agent 性能监控面板
4. 编写场景扩展教程
5. 代码审查与重构

**验收标准**:
- [ ] 新开发者可在 1 天内添加新 Agent
- [ ] 监控面板实时显示 Agent 调用链路
- [ ] 文档覆盖所有核心概念
- [ ] 代码通过 Linus 品味测试（无冗余分支、无特殊情况）

---

## 四、预期收益

### 4.1 可扩展性提升

**Before**:
- 新增场景需修改 3-5 个核心文件
- 平均开发时间: 2-3 天
- 代码冲突风险: 高

**After**:
- 新增场景仅需添加场景配置 + 专用 Agent
- 平均开发时间: 0.5-1 天
- 代码冲突风险: 低

### 4.2 鲁棒性提升

**Before**:
- 验证失败后需手动干预
- 状态不一致导致会话崩溃
- 错误恢复成功率: ~40%

**After**:
- 自动错误恢复机制
- 状态快照支持回滚
- 错误恢复成功率: >80%

### 4.3 维护性提升

**Before**:
- 单文件 1500+ 行，难以理解
- 提示词分散，重复率高
- 修改影响范围不可控

**After**:
- 每个 Agent <300 行，职责清晰
- 提示词模板化，复用率高
- 修改影响范围可预测

### 4.4 性能优化

**Before**:
- 所有场景使用相同的 Agent 管道
- 无法针对场景优化模型选择
- 平均响应时间: 8-12s

**After**:
- 场景特定的 Agent 管道
- 动态模型选择（haiku/sonnet/opus）
- 预期响应时间: 5-8s（提升 30-40%）

---

## 五、风险与缓解

### 5.1 迁移风险

**风险**: 拆分过程中引入功能回归

**缓解**:
1. 保留原有代码作为 fallback
2. 编写全面的集成测试
3. 灰度发布，逐步切换流量
4. 监控关键指标（成功率、延迟、错误率）

### 5.2 性能风险

**风险**: Agent 调用链路变长导致延迟增加

**缓解**:
1. 实施 Agent 结果缓存
2. 并行执行独立 Agent
3. 使用 haiku 模型处理简单任务
4. 优化提示词长度

### 5.3 复杂度风险

**风险**: 过度拆分导致系统复杂度上升

**缓解**:
1. 遵循 YAGNI 原则，仅拆分必要的 Agent
2. 提供清晰的 Agent 调用链路可视化
3. 编写详细的开发文档
4. 定期代码审查，消除不必要的抽象

---

## 六、总结

本设计文档基于 Claude Code Agent 框架，提出了一套系统化的 Agent 架构优化方案。核心思想是：

1. **层次化拆分**: 将单体 Agent 拆分为 L1/L2/L3 三层，每层职责清晰
2. **模板化管理**: 提示词模板化 + 版本控制 + A/B 测试
3. **错误恢复**: 统一错误恢复机制 + 状态快照回滚
4. **场景扩展**: 场景注册机制 + 动态 Agent 组合

通过这套方案，预期可实现：
- **可扩展性**: 新场景开发时间缩短 60%
- **鲁棒性**: 错误恢复成功率提升至 80%+
- **维护性**: 代码行数减少 40%，可读性显著提升
- **性能**: 响应时间优化 30-40%

**下一步行动**:
1. 评审本设计文档，确认技术方案
2. 启动 Phase 1 基础设施搭建
3. 建立每周进度同步机制
4. 设定关键指标监控面板

---

**Conceived by Romuald Członkowski** - [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)
