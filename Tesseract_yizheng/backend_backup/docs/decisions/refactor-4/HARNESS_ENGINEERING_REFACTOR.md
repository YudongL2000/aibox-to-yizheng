# Refactor-4: Harness Engineering 架构重构设计文档

> 基于 [AI Agent Harness 深度分析](https://x.com/Hxlfed14/article/2028116431876116660) 的项目审查与重构方案
> 核心论点：**脚手架（harness）而非模型决定 Agent 性能**

---

## 一、审查总览

### 1.1 审查方法论

基于文章提出的五大维度，对 tesseract-BE 进行全面审查：

| 维度 | 文章最佳实践 | 当前评分 | 目标评分 |
|------|-------------|---------|---------|
| **循环架构** | while(tool_call) 简单循环 | 8/10 | 9/10 |
| **渐进式披露** | 按需加载，token 预算管理 | 7/10 | 9/10 |
| **工具设计** | 精简原语，正交参数 | 6/10 | 8/10 |
| **错误恢复** | 模型驱动的自适应修复 | 5/10 | 8/10 |
| **代码组织** | 单一职责，< 800 行/文件 | 4/10 | 8/10 |

**综合评分：6.0/10 → 目标 8.4/10**

### 1.2 核心发现

**做得好的：**
- 分阶段状态机（发现→反思→组合→验证）设计合理
- PropertyFilter 实现了 95% 的属性裁剪（200+ → 10-20）
- 超时分离配置（discovery 5s / reflection 8s / health 3s）
- 三层缓存策略（应用缓存 + SQLite 缓存 + 协议缓存）
- 数据库适配器的双路容错（better-sqlite3 ↔ sql.js）

**核心问题：**
- orchestrator.ts 2041 行，职责过重
- 验证循环缺少模型驱动的反馈回路
- 表达式验证器三重冗余（3 个验证器，50% 功能重叠）
- 150+ 节点硬编码配置，维护成本高
- 6 个不同的验证 API，无统一调用约定
- MCP 工具全量静态加载，无 lazy loading

---

## 二、文章核心原则与项目对标

### 2.1 简单循环 vs 分阶段状态机

**文章观点：**
> "while (model returns tool calls): execute tool → capture result → append to context → call model again"
> 所有领先系统（Claude Code、Cursor、Manus、SWE-Agent）都收敛于此模式。

**当前实现：**

```
process(userMessage, sessionId)
  ├─ Phase 1: capability_discovery     ← LLM 调用（5s timeout）
  ├─ Phase 2: reflection               ← LLM 调用（8s timeout）
  ├─ Phase 3: response_decision        ← 规则驱动
  └─ confirm(sessionId)
     ├─ Phase 4: composition           ← 纯本地规则
     └─ Phase 5: validation_loop       ← MCP 工具（最多 3 轮）
```

**评估：** 当前不是 while(tool_call)，而是硬编码的 5 阶段管线。
- 优点：流程可预测，每阶段有独立超时
- 缺点：**模型无法自主决定下一步做什么**——每阶段的入口和出口都是代码控制

**差距：** 文章强调 "the model controls the loop"，但当前是 "the code controls the model"。

### 2.2 渐进式披露（Progressive Disclosure）

**文章观点：**
> "show only what is needed now, reveal complexity on demand"
> Claude Code 的 skills 不预加载，仅在检测到相关性时加载。
> Cursor 的 lazy MCP loading 实现 46.9% token 减少。

**当前实现：**

| 层级 | 实现方式 | Token 成本 | 评估 |
|------|---------|-----------|------|
| 工具列表 | 全量返回 15 个工具 | ~3K tokens | ⚠️ 可优化 |
| 工具文档 | essentials/full 双层 | 5-50K tokens | ✅ 已实现 |
| 节点属性 | minimal/standard/full 三档 | 1-8K tokens | ✅ 已实现 |
| Prompt 模板 | 全量组装 | 6-10K tokens | ⚠️ 可优化 |
| 会话历史 | 全量保留 | 无限增长 | ❌ 缺少压缩 |

**差距：**
1. **工具列表无 lazy loading**：15 个工具的完整 schema 每次握手都发送
2. **Prompt 组件库全量注入**：3051 行 prompt 代码全部组装，不分场景
3. **会话历史无压缩**：SWE-Agent 的 "最近 5 条保留完整，其余压缩为单行"

### 2.3 工具设计

**文章观点：**
> Claude Code ~18 个原语工具。Manus 最大收益来自"移除东西"。
> Vercel 减少 80% 工具后性能反而提升。

**当前工具清单（15 个）：**

```
文档工具（4 个）:
  tools_documentation    ← 2 维参数（topic + depth）
  search_nodes           ← 3 维参数（query + limit + mode）
  get_node               ← 8 维参数 ⚠️ 过于复杂
  validate_node          ← 5 维参数

管理工具（11 个）:
  n8n_create_workflow    n8n_get_workflow      n8n_list_workflows
  n8n_update_full        n8n_update_partial    n8n_delete_workflow
  n8n_validate_workflow  n8n_autofix_workflow  n8n_trigger_webhook
  n8n_executions         n8n_health_check
```

**差距：**
1. `get_node` 的 8 维参数违反 KISS：mode 有 7 种值（info/docs/search_properties/versions/compare/breaking/migrations），实际是 7 个不同工具伪装成 1 个
2. 管理工具 11 个可精简：`update_full` + `update_partial` + `autofix` 可合并
3. 缺少 Manus 式的 **logit masking / 分组控制**——所有工具同时可见

### 2.4 错误恢复

**文章观点：**
> SWE-Agent 的 linter-gated edits：语法错误自动拒绝，agent 必须重试。
> Claude Code：失败执行返回错误信息给模型，模型自主决定下一步。

**当前实现（orchestrator.ts L1383-1520）：**

```typescript
for (let attempt = 1; attempt <= MAX_VALIDATION_LOOPS; attempt++) {
  const validation = await workflowValidator.validateWorkflow(candidate);
  if (validation.isValid) return { valid: true, ... };

  // ❌ 不问模型"为什么失败"
  // ❌ 直接调用 autofix，硬编码修复策略
  const fixed = await workflowValidator.autofixWorkflow(candidate);
  if (isSameWorkflow(candidate, fixed)) break;  // 修不动就放弃
  candidate = fixed;
}
// 3 轮后返回用户"请补充约束"
```

**差距：**
1. **验证失败不问模型**：autofix 是启发式的，不是模型驱动的
2. **没有错误分类**：所有错误同等对待，不区分"可自动修复"和"需要用户输入"
3. **放弃太早**：3 轮就放弃，SWE-Agent 的实践表明更多轮次+模型反馈更有效

### 2.5 40% 阈值原则

**文章观点：**
> Dex Horthy 的 "40% 阈值"：超过模型输入容量的 40% 就进入"呆区"。
> "signal-to-noise degrades, attention fragments, agents start making mistakes."

**当前状态估算：**

```
标准路径 token 预算：
  系统 prompt（组件库+规则+示例）：  6-10K tokens
  工具定义：                        3K tokens
  会话历史（5 轮对话）：            5-15K tokens
  工具返回结果：                    2-8K tokens
  ────────────────────────────────────────
  总计：                            16-36K tokens

如果模型窗口 200K：占比 8-18% ✅ 安全
如果模型窗口 32K： 占比 50-112% ❌ 超标
```

**差距：** 没有显式的 token budget 管理。随着对话轮次增加，历史 token 无限增长。

---

## 三、架构重构方案

### 3.1 重构总览

```
                    重构前                              重构后
              ┌─────────────────┐              ┌─────────────────┐
              │  Orchestrator   │              │  AgentLoop      │
              │  (2041 行)      │              │  (< 200 行)     │
              │  5 阶段管线     │              │  while(tool_call)│
              │  硬编码流程     │    ──→       │  模型驱动       │
              │  3 个表达式验证 │              │  统一验证       │
              │  无 token 预算  │              │  token 预算     │
              │  无 lazy load   │              │  渐进式披露     │
              └─────────────────┘              └─────────────────┘
```

### 3.2 P0: Agent 主循环重构

**目标：** 从 5 阶段硬编码管线 → while(tool_call) 模型驱动循环

**设计：**

```typescript
/**
 * [INPUT]: 依赖 llm-client 的 chat()，依赖 tool-registry 的 execute()
 * [OUTPUT]: 对外提供 AgentLoop.run() 方法
 * [POS]: agents/ 的核心引擎，替代 orchestrator.ts 的主循环
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ── 核心循环：模型控制流程 ──
class AgentLoop {
  async run(userMessage: string, session: Session): Promise<AgentResponse> {
    const messages = this.buildContext(session, userMessage);

    while (true) {
      const response = await this.llm.chat(messages);

      // 模型决定是否调用工具
      if (!response.toolCalls?.length) {
        return this.parseResponse(response);
      }

      // 执行工具，结果回注上下文
      for (const call of response.toolCalls) {
        const result = await this.toolRegistry.execute(call);
        messages.push({ role: 'tool', content: result, toolCallId: call.id });
      }

      // token 预算检查
      if (this.tokenBudget.exceeds(messages)) {
        messages = this.compress(messages);
      }
    }
  }
}
```

**关键变化：**
1. 模型自主决定调用哪个工具、何时停止
2. 工具执行结果直接回注上下文（包括错误信息）
3. 内置 token 预算管理
4. 循环无固定阶段——模型根据上下文自然推进

**迁移策略：**
- 现有 5 阶段逻辑不删除，重构为 5 个内部工具
- 模型可以按任意顺序调用这些工具
- 渐进迁移：先包装，后简化

```typescript
// 现有阶段 → 内部工具映射
const INTERNAL_TOOLS = {
  discover_capabilities: (args) => capabilityRegistry.discover(args.query),
  reflect_on_requirements: (args) => reflectionEngine.reflect(args.context),
  compose_workflow: (args) => componentComposer.compose(args.capabilities),
  validate_workflow: (args) => workflowValidator.validate(args.workflow),
  ask_user_clarification: (args) => ({ type: 'clarification', questions: args.questions }),
};
```

### 3.3 P0: 验证循环加入模型反馈

**目标：** 验证失败时问模型"为什么"，而非盲目 autofix

**设计：**

```typescript
// ── 模型驱动的验证修复 ──
async validateWithFeedback(
  workflow: WorkflowDefinition,
  session: Session,
): Promise<ValidationResult> {
  const MAX_ATTEMPTS = 5;  // 从 3 提升到 5

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const validation = await this.validator.validate(workflow);
    if (validation.isValid) return validation;

    // ── 分类错误 ──
    const { autoFixable, needsModel, needsUser } = this.classifyErrors(validation.errors);

    // 第一层：可自动修复的直接修
    if (autoFixable.length > 0) {
      workflow = await this.autoFixer.fix(workflow, autoFixable);
    }

    // 第二层：需要模型推理的，问模型
    if (needsModel.length > 0) {
      const suggestion = await this.llm.chat([
        { role: 'system', content: VALIDATION_DIAGNOSIS_PROMPT },
        { role: 'user', content: this.buildDiagnosisContext(workflow, needsModel) },
      ]);
      workflow = this.applySuggestion(workflow, suggestion);
    }

    // 第三层：需要用户输入的，中断循环
    if (needsUser.length > 0) {
      return { isValid: false, needsUserInput: true, questions: needsUser };
    }
  }

  return { isValid: false, exhausted: true };
}
```

**错误分类策略：**

| 错误类型 | 示例 | 处理 |
|---------|------|------|
| **autoFixable** | 缺少 `=` 前缀、typeVersion 过时 | 直接 autofix |
| **needsModel** | 节点连接逻辑错误、表达式引用无效 | 问模型诊断 |
| **needsUser** | 缺少 API credentials、业务逻辑歧义 | 返回用户 |

### 3.4 P0: Orchestrator 拆分

**目标：** 2041 行 → 4 个 < 500 行的模块

**拆分方案：**

```
当前：
  orchestrator.ts (2041 行)
    ├─ 主循环 + 状态管理         (L1-400)
    ├─ 能力发现逻辑              (L1081-1219)
    ├─ 澄清选项生成 + 问题排序   (L810-932)
    └─ 工作流验证循环            (L1383-1520)

重构后：
  agent-loop.ts (< 200 行)
    └─ while(tool_call) 主循环 + token 预算

  capability-discovery.ts (< 400 行)
    └─ 关键词 + 语义 + 规则 三层发现管线

  clarification-builder.ts (< 300 行)
    └─ 澄清问题生成 + 选项与能力 ID 关联

  validation-pipeline.ts (< 400 行)
    └─ 错误分类 + 模型反馈 + autofix 三层修复
```

### 3.5 P1: 渐进式披露增强

#### 3.5.1 工具 Lazy Loading

**参考：** Cursor 的 lazy MCP loading（46.9% token 减少）

```typescript
// ── 当前：全量返回 ──
// ListTools → 15 个工具的完整 schema（~3K tokens）

// ── 重构：分层返回 ──
// Level 0: 工具名 + 一句话描述（~300 tokens）
// Level 1: 按需返回完整 schema（仅被选中的工具）

class LazyToolRegistry {
  // 初始只暴露工具摘要
  listTools(): ToolSummary[] {
    return this.tools.map(t => ({
      name: t.name,
      summary: t.description.slice(0, 80),  // 一句话
    }));
  }

  // 模型选择工具后，再返回完整 schema
  getToolSchema(name: string): ToolSchema {
    return this.tools.find(t => t.name === name)?.schema;
  }
}

// Token 节省估算：
// 当前：15 × 200 = 3000 tokens
// 优化后：15 × 20 = 300 tokens（初始）+ 按需加载
// 节省：90%（初始握手）
```

#### 3.5.2 Prompt 组件按需注入

**参考：** Claude Code 的 skills 按需加载

```typescript
// ── 当前：全量组装 ──
// buildArchitectSystemPrompt() 一次性注入：
//   组件库(2-3K) + 规则(1K) + 示例(3-5K) + 变体(0.2K) = 6-10K tokens

// ── 重构：分层注入 ──
class PromptBuilder {
  // 核心 prompt（始终注入）：~2K tokens
  private core = [ROLE_DEFINITION, HARDWARE_CONTEXT, QUALITY_CHECKLIST];

  // 按需 prompt（模型请求时注入）
  private onDemand = {
    component_library: WORKFLOW_COMPONENTS,       // 2-3K tokens
    assembly_rules: ASSEMBLY_RULES,               // 1K tokens
    few_shot_examples: FEW_SHOT_EXAMPLES,         // 3-5K tokens
    node_templates: NODE_TEMPLATES,               // 0.5K tokens
  };

  build(phase: string, requestedModules: string[]): string {
    let prompt = this.core.join('\n');
    for (const mod of requestedModules) {
      if (this.onDemand[mod]) prompt += '\n' + this.onDemand[mod];
    }
    return prompt;
  }
}

// Token 节省估算：
// 发现阶段：只需 core = 2K（节省 60-80%）
// 组合阶段：core + library + rules = 5K（节省 30-50%）
// 验证阶段：core + checklist = 2.5K（节省 60-75%）
```

#### 3.5.3 会话历史压缩

**参考：** SWE-Agent 的 "最近 5 条完整，其余压缩为单行"

```typescript
// ── 当前：全量保留 ──
// session.history: ConversationTurn[] 无限增长

// ── 重构：滑动窗口 + 摘要 ──
class ContextCompressor {
  private readonly RECENT_WINDOW = 5;   // 最近 5 轮完整保留
  private readonly TOKEN_BUDGET = 8000; // 历史 token 预算

  compress(history: ConversationTurn[]): CompressedHistory {
    const recent = history.slice(-this.RECENT_WINDOW);  // 完整保留
    const older = history.slice(0, -this.RECENT_WINDOW); // 压缩

    // 每轮压缩为单行摘要
    const summaries = older.map(turn => ({
      role: turn.role,
      summary: this.summarize(turn),  // "用户请求了人脸识别+语音播报功能"
      timestamp: turn.timestamp,
    }));

    return { summaries, recent };
  }
}

// Token 节省估算：
// 10 轮对话（当前）：~15K tokens
// 10 轮对话（压缩后）：5 × 1.5K + 5 × 0.1K = 8K tokens
// 节省：47%
```

### 3.6 P1: 统一验证架构

**目标：** 6 个验证 API → 1 个统一接口

**当前问题：**

```
调用者需要理解 6 个不同的 API：
  ConfigValidator.validate()
  EnhancedConfigValidator.validateWithMode()
  ExpressionValidator.validateExpression()
  UniversalExpressionValidator.validateExpressionPrefix()
  ExpressionFormatValidator.validate()
  WorkflowValidator.validateWorkflow()
```

**重构方案：**

```typescript
/**
 * [INPUT]: 依赖各专项验证器的实现
 * [OUTPUT]: 对外提供统一的 validate() 方法
 * [POS]: services/ 的验证门面，消除 6 个独立 API
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ── 统一验证接口 ──
interface ValidationTarget {
  type: 'node' | 'expression' | 'workflow';
  data: unknown;
  context?: ValidationContext;
}

interface ValidationContext {
  profile?: 'minimal' | 'runtime' | 'ai-friendly' | 'strict';
  nodeType?: string;
  availableNodes?: Map<string, NodeInfo>;
}

class UnifiedValidator {
  // 单一入口
  async validate(target: ValidationTarget): Promise<ValidationResult> {
    switch (target.type) {
      case 'expression':
        return this.validateExpression(target.data, target.context);
      case 'node':
        return this.validateNode(target.data, target.context);
      case 'workflow':
        return this.validateWorkflow(target.data, target.context);
    }
  }

  // 表达式验证：合并 3 个验证器为分层管线
  private validateExpression(value: unknown, ctx?: ValidationContext): ValidationResult {
    const results: ValidationIssue[] = [];

    // Layer 1: 通用前缀检查（原 UniversalExpressionValidator）
    results.push(...this.checkExpressionPrefix(value));

    // Layer 2: 变量引用检查（原 ExpressionValidator）
    if (typeof value === 'string' && this.isExpression(value)) {
      results.push(...this.checkVariableReferences(value, ctx?.availableNodes));
    }

    // Layer 3: 资源定位器结构（原 ExpressionFormatValidator）
    if (ctx?.nodeType) {
      results.push(...this.checkResourceLocatorFormat(value, ctx.nodeType));
    }

    return { isValid: results.length === 0, issues: results };
  }
}
```

**效果：**
- 6 个 API → 1 个 `validate(target)` 入口
- 3 个表达式验证器 → 1 个分层管线
- 调用者无需了解内部分层

### 3.7 P1: 工具简化

**目标：** `get_node` 的 7 种 mode → 拆分为语义清晰的独立工具

```
当前 get_node 的 mode 参数：
  info | docs | search_properties | versions | compare | breaking | migrations
  → 实际上是 7 个不同工具伪装成 1 个

重构方案：

  get_node(nodeType, detail)               ← 核心信息（保留）
  get_node_docs(nodeType)                  ← 文档（新工具）
  search_node_properties(nodeType, query)  ← 属性搜索（新工具）
  get_node_versions(nodeType)              ← 版本信息（新工具）

  合并去除：
  - compare + breaking + migrations → 合并到 get_node_versions(nodeType, since?)
```

**效果：**
- 每个工具职责单一，参数 2-3 个
- 模型更容易选择正确的工具
- 参考 Manus 的 prefix 命名：`node_*` 前缀支持分组控制

### 3.8 P2: Token 预算管理

**参考：** Dex Horthy 的 40% 阈值规则

```typescript
// ── Token 预算管理器 ──
class TokenBudget {
  private readonly MODEL_WINDOW: number;        // 模型窗口大小
  private readonly THRESHOLD = 0.4;             // 40% 阈值
  private readonly SYSTEM_RESERVE = 0.15;       // 15% 系统保留

  constructor(modelWindow: number = 128_000) {
    this.MODEL_WINDOW = modelWindow;
  }

  get available(): number {
    return Math.floor(this.MODEL_WINDOW * this.THRESHOLD);
  }

  // 检查是否超出预算
  exceeds(messages: Message[]): boolean {
    const used = this.estimate(messages);
    return used > this.available;
  }

  // 估算 token 使用量
  estimate(messages: Message[]): number {
    return messages.reduce((sum, m) => sum + this.estimateMessage(m), 0);
  }

  // 当超出预算时，触发压缩
  compress(messages: Message[]): Message[] {
    // 1. 保留 system prompt（不可压缩）
    // 2. 最近 5 轮完整保留
    // 3. 其余压缩为单行摘要
    // 4. 工具返回结果截断为关键信息
    return new ContextCompressor().compress(messages, this.available);
  }
}
```

### 3.9 P2: 消除硬编码配置

**目标：** PropertyFilter 的 150+ 节点硬编码 → 元数据驱动

```typescript
// ── 当前：硬编码 ──
ESSENTIAL_PROPERTIES = {
  'nodes-base.httpRequest': {
    required: ['url'],
    common: ['method', 'authentication', 'sendBody', 'contentType'],
  },
  // ... 150+ 节点手工配置
};

// ── 重构：元数据驱动 ──
class PropertyFilter {
  // 从节点定义自动推断 essential properties
  static inferEssentials(node: ParsedNode): EssentialConfig {
    const required = node.properties
      .filter(p => p.required)
      .map(p => p.name);

    const common = node.properties
      .filter(p => !p.required)
      .sort((a, b) => this.usageScore(b) - this.usageScore(a))
      .slice(0, 8)
      .map(p => p.name);

    return { required, common };
  }

  // 基于启发式规则计算使用频率
  private static usageScore(prop: NodeProperty): number {
    let score = 0;
    if (prop.displayOptions) score += 2;  // 有条件显示 = 常用
    if (prop.default !== undefined) score += 1;  // 有默认值 = 常配置
    if (prop.type === 'options') score += 1;  // 选项类型 = 用户需要选择
    if (prop.description?.length > 50) score += 1;  // 有详细描述 = 重要
    return score;
  }
}

// 效果：
// - 新增节点无需手工配置
// - 高频节点仍可手动覆盖（优先级：手动 > 自动推断）
// - 维护点从 150+ 降为 0（自动推断）或 10-20（仅覆盖特例）
```

---

## 四、重构执行计划

### 4.1 分支矩阵

| 分支 | 范围 | 优先级 | 预计工期 |
|------|------|--------|---------|
| `feat/agent-loop` | P0: 主循环重构 + 验证反馈 | 高 | 1 周 |
| `feat/unified-validator` | P1: 统一验证架构 | 高 | 1 周 |
| `feat/progressive-disclosure` | P1: 渐进式披露增强 | 中 | 1 周 |
| `feat/tool-simplification` | P1: 工具简化 + lazy loading | 中 | 0.5 周 |
| `feat/metadata-driven-filter` | P2: 消除硬编码配置 | 低 | 0.5 周 |
| `chore/integrate-refactor4` | 集成 | - | 0.5 周 |

### 4.2 依赖关系

```
                    main
                     │
    ┌────────────────┼────────────────┐
    ↓                ↓                ↓
feat/agent-loop  feat/unified-    feat/progressive-
                  validator         disclosure
    │                │                │
    │  可并行         │  可并行         │  可并行
    │                │                │
    └────────────────┴────────────────┘
                     ↓
    ┌────────────────┼────────────────┐
    ↓                ↓                ↓
feat/tool-      feat/metadata-    chore/integrate-
simplification  driven-filter      refactor4
```

**Week 1:** agent-loop + unified-validator + progressive-disclosure（并行）
**Week 2:** tool-simplification + metadata-driven-filter + 集成

### 4.3 验收标准

#### 量化目标

| 指标 | 当前值 | 目标值 | 测量方法 |
|------|--------|--------|---------|
| **初始化 token** | ~3K | < 500 | 工具列表 token 计数 |
| **系统 prompt token** | 6-10K | 2-4K | 核心 prompt token 计数 |
| **10 轮对话 token** | ~15K | < 8K | 历史压缩后 token 计数 |
| **验证修复成功率** | ~60% | > 85% | 验证循环通过率 |
| **最大文件行数** | 2041 行 | < 500 行 | orchestrator.ts 拆分后 |
| **验证 API 数量** | 6 个 | 1 个 | 统一接口 |
| **硬编码节点数** | 150+ | < 20 | PropertyFilter 覆盖数 |

#### 质量保证

- [ ] 所有现有测试通过（`npm test`）
- [ ] TypeScript 类型检查通过（`npm run typecheck`）
- [ ] 新增模块覆盖率 > 80%
- [ ] 每个文件 < 800 行
- [ ] 每个工具参数 < 5 个

---

## 五、风险与缓解

### 5.1 技术风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 主循环重构破坏现有流程 | 中 | 高 | 渐进迁移：先包装为工具，后简化 |
| 统一验证器遗漏边界情况 | 中 | 中 | 保留旧验证器作为回归测试基准 |
| Lazy loading 增加延迟 | 低 | 低 | 缓存 + 预热机制 |
| 模型反馈引入不确定性 | 中 | 中 | 三层分类（auto/model/user）+ 超时兜底 |

### 5.2 兼容性风险

| 风险 | 缓解策略 |
|------|---------|
| MCP 工具签名变更 | 旧工具名保留为别名，渐进废弃 |
| 会话状态结构变更 | 版本化 session schema，自动迁移 |
| Prompt 模板拆分 | 保留 `buildArchitectSystemPrompt()` 接口，内部改为按需组装 |

---

## 六、设计哲学

### 6.1 文章的核心启示

> "The model is the engine. The harness is the car. Nobody buys an engine."

当前系统的本质问题不是模型能力不足，而是**脚手架限制了模型的发挥**：
- 硬编码的 5 阶段管线不允许模型自主决策
- 全量加载的 prompt 和工具浪费了宝贵的注意力
- 验证循环不信任模型的诊断能力

### 6.2 重构的指导原则

1. **模型控制循环，代码提供工具** — 从 "code controls model" → "model controls loop"
2. **渐进式披露是架构级需求** — 不是优化，是必需品
3. **计划让脚手架变简单，而非更复杂** — 每次重构都应该删除代码
4. **Token 预算是一等公民** — 像内存管理一样管理上下文窗口

### 6.3 成功标准

> "Spend your engineering cycles on the harness, not on model shopping."

重构成功的标志：
- **同一模型**在新脚手架下的工作流生成成功率从 60% 提升到 85%+
- **上下文效率**：标准路径 token 开销减少 50%
- **代码简洁度**：总代码行数减少 20%，最大文件 < 500 行
- **开发者体验**：新增节点类型无需修改 PropertyFilter

---

## 参考资料

1. Anthropic - "Effective Context Engineering for AI Agents" (Sep 2025)
2. Anthropic - "Effective Harnesses for Long-Running Agents" (Jan 2026)
3. Cursor - "Dynamic Context Discovery" (Jan 2026)
4. Manus - "Context Engineering for AI Agents" (Jul 2025)
5. Yang et al. - "SWE-agent: Agent-Computer Interfaces" (NeurIPS 2024)
6. Liu et al. - "Lost in the Middle" (TACL 2024)
7. Horthy - "12 Factor Agents"
8. LangChain - "Improving Deep Agents with Harness Engineering" (Feb 2026)

---

**Conceived by Romuald Członkowski** - [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)
