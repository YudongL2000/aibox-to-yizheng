# Refactor-3 并行开发执行计划
## Agent 架构能力驱动重构 - 并行交付方案

**迭代 ID**: refactor-3
**基准分支**: main
**集成分支**: chore/integrate-refactor3
**执行周期**: 4 周 (2026-03-06 ~ 2026-04-03)
**并行度**: 4 个工作流 + 1 个集成流

---

## 一、迭代目标与范围

### 1.1 核心目标

从"场景预设驱动"转向"能力边界驱动"，实现类 Claude Code 的通用 Agent 架构：

1. **消除场景概念**: 删除所有硬编码场景（face_recognition_action/emotion_interaction/game_interaction）
2. **建立能力注册表**: 硬件组件库 = Tools 集合，支持动态查询
3. **实现反思引擎**: 多轮需求澄清，类比 CC 的 thinking process
4. **重构组件组合器**: 能力 → 节点的动态映射，无场景依赖

### 1.2 用户故事

**US-R3-1: 能力注册表构建**
- **As** 开发者
- **I want** 一个硬件能力注册表，支持关键词查询和依赖检查
- **So that** 可以动态发现可用硬件能力，而非硬编码场景

**US-R3-2: 反思引擎实现**
- **As** Agent 系统
- **I want** 一个反思引擎，能识别缺失信息并生成针对性澄清问题
- **So that** 可以通过多轮对话完善用户需求，提升工作流质量

**US-R3-3: 组件组合器重构**
- **As** 工作流生成器
- **I want** 基于能力动态组合节点，而非匹配场景
- **So that** 可以支持任意硬件能力组合，不受场景限制

**US-R3-4: Orchestrator 集成**
- **As** 用户
- **I want** 一个统一的编排器，协调能力发现、反思、组合全流程
- **So that** 可以用自然语言描述任意需求，系统自动生成工作流

---

## 二、分支矩阵与依赖关系

### 2.1 分支矩阵

| 分支名称 | 负责人 | 模块边界 | 依赖分支 | 预计工期 |
|---------|--------|---------|---------|---------|
| `feat/capability-registry` | Agent-1 | `src/agents/capability-registry.ts` + tests | **无（并行）** | Week 1 |
| `feat/reflection-engine` | Agent-2 | `src/agents/reflection-engine.ts` + tests | **无（并行）** | Week 1 |
| `feat/component-composer-refactor` | Agent-3 | `src/agents/component-composer.ts` + 删除场景代码 | **无（并行）** | Week 1 |
| `feat/orchestrator-integration` | Agent-4 | `src/agents/orchestrator.ts` + 集成测试 | **无（并行）** | Week 1 |
| `chore/integrate-refactor3` | Integrator | 合并所有分支 + 冲突解决 | 所有 feat 分支 | Week 2 |

**关键变化**:
- ✅ 所有 feat 分支**完全独立**，无依赖关系
- ✅ 4 个 Agent 同时开发，真正的并行
- ✅ Week 1 集中开发，Week 2 集中集成

### 2.2 依赖关系图

```
main
 ↓
 ├─→ feat/capability-registry (Week 1) ────┐
 ├─→ feat/reflection-engine (Week 1) ──────┤
 ├─→ feat/component-composer-refactor (Week 1) ──┤
 └─→ feat/orchestrator-integration (Week 1) ─────┤
                                                  ↓
                                    chore/integrate-refactor3 (Week 2)
                                                  ↓
                                                main
```

**核心变化**:
- ✅ 4 个 feat 分支**完全并行**，无依赖关系
- ✅ 所有分支同时从 main 创建，同时开发
- ✅ Week 1 完成所有 feat 分支开发
- ✅ Week 2 由 Integrator 统一合并

### 2.3 合并顺序（严格执行）

**Week 2 集成阶段**:
1. `feat/capability-registry` → `chore/integrate-refactor3`
2. `feat/reflection-engine` → `chore/integrate-refactor3`（解决冲突）
3. `feat/component-composer-refactor` → `chore/integrate-refactor3`（解决冲突）
4. `feat/orchestrator-integration` → `chore/integrate-refactor3`（解决冲突）
5. `chore/integrate-refactor3` → `main`

---

## 三、工作流详细规划

### 3.1 Workflow 1: 能力注册表构建

**分支**: `feat/capability-registry`
**负责人**: Agent-1
**工期**: Week 1 (3.06 ~ 3.13)

**模块边界**:
```
src/agents/
├── capability-registry.ts          # 新增
├── types.ts                         # 扩展 HardwareCapability 接口
tests/unit/agents/
└── capability-registry.test.ts     # 新增
```

**核心任务**:
1. 定义 `HardwareCapability` 接口
2. 实现 `CapabilityRegistry` 类
   - `query(keywords: string[]): HardwareCapability[]`
   - `canCompose(capabilityIds: string[]): CompositionResult`
   - `buildKeywordIndex()`: 构建关键词倒排索引
3. 从 `HARDWARE_COMPONENTS` 迁移数据
4. 编写单元测试（覆盖率 >90%）

**验收标准**:
- [ ] 支持关键词查询，返回匹配能力（按置信度排序）
- [ ] 支持能力组合验证（依赖检查）
- [ ] 查询性能 <10ms（1000 次查询平均）
- [ ] 单元测试覆盖率 >90%
- [ ] 通过 `npm run lint` 和 `npm run typecheck`

**首次提示词**:
```
我需要实现能力注册表（CapabilityRegistry），这是 Refactor-3 的基础设施。

核心需求：
1. 从 HARDWARE_COMPONENTS 构建能力注册表
2. 支持关键词查询（如 "手势识别" → camera.gesture_recognition）
3. 支持能力组合验证（检查依赖关系）
4. 构建关键词倒排索引，优化查询性能

参考设计文档：
docs/decisions/refactor-3/AGENT_ARCHITECTURE_OPTIMIZATION_CC_FRAMEWORK_V2.md
第 3.1 节 "硬件能力注册表"

请先阅读现有的 hardware-components.ts，然后开始实现。
```

---

### 3.2 Workflow 2: 反思引擎实现

**分支**: `feat/reflection-engine`
**负责人**: Agent-2
**工期**: Week 2 (3.13 ~ 3.20)
**依赖**: `feat/capability-registry` 合并后

**模块边界**:
```
src/agents/
├── reflection-engine.ts            # 新增
├── types.ts                         # 扩展 ReflectionResult 接口
tests/unit/agents/
└── reflection-engine.test.ts       # 新增
```

**核心任务**:
1. 定义 `ReflectionResult`、`MissingInfo`、`ClarificationQuestion` 接口
2. 实现 `ReflectionEngine` 类
   - `reflect()`: 主反思方法
   - `checkCompleteness()`: 检查工作流完整性
   - `identifyMissingInfo()`: 识别缺失信息
   - `generateClarificationQuestions()`: 生成澄清问题（LLM）
   - `calculateConfidence()`: 计算置信度
3. 集成 LLMClient 生成针对性问题
4. 编写单元测试（覆盖率 >85%）

**验收标准**:
- [ ] 能识别 5 类缺失信息（trigger/action/condition/feedback/logic）
- [ ] 生成的问题针对性强，不重复
- [ ] 置信度计算合理（0.8+ 可生成工作流）
- [ ] 最多 5 轮澄清后强制生成
- [ ] 单元测试覆盖率 >85%

**首次提示词**:
```
我需要实现反思引擎（ReflectionEngine），负责多轮需求澄清。

核心需求：
1. 检查工作流完整性（trigger/action/feedback/logic）
2. 识别缺失信息并分优先级
3. 使用 LLM 生成针对性澄清问题
4. 计算置信度（0-1），决定是否可以生成工作流

参考设计文档：
docs/decisions/refactor-3/AGENT_ARCHITECTURE_OPTIMIZATION_CC_FRAMEWORK_V2.md
第 3.2 节 "反思引擎实现"

依赖：feat/capability-registry 已合并
请先阅读 capability-registry.ts 和 llm-client.ts，然后开始实现。
```

---

### 3.3 Workflow 3: 组件组合器重构

**分支**: `feat/component-composer-refactor`
**负责人**: Agent-3
**工期**: Week 3 (3.20 ~ 3.27)
**依赖**: `feat/capability-registry` 合并后

**模块边界**:
```
src/agents/
├── component-composer.ts           # 重构（删除场景逻辑）
├── intake-agent.ts                 # 删除场景相关代码
├── types.ts                         # 删除 Intent['category'] 场景枚举
tests/unit/agents/
└── component-composer.test.ts      # 更新测试
```

**核心任务**:
1. **删除场景相关代码**:
   - 删除 `CATEGORY_REQUIRED_FIELDS`
   - 删除 `Intent['category']` 的场景枚举
   - 删除 `intake-agent.ts` 中的场景匹配逻辑
2. **重构 ComponentComposer**:
   - `compose()`: 基于能力组合生成工作流
   - `capabilitiesToNodes()`: 能力 → 节点映射
   - `buildTopology()`: 拓扑自动构建
   - `fillParameters()`: 参数动态填充
3. 更新集成测试
4. 确保性能无明显下降

**验收标准**:
- [ ] 无任何硬编码场景（grep 验证）
- [ ] 支持任意能力组合
- [ ] 生成的工作流通过验证
- [ ] 性能无明显下降（<10% 延迟增加）
- [ ] 集成测试通过

**首次提示词**:
```
我需要重构组件组合器（ComponentComposer），消除所有场景依赖。

核心需求：
1. 删除所有场景相关代码（CATEGORY_REQUIRED_FIELDS、Intent['category']）
2. 重构为基于能力的动态组合
3. 实现能力 → 节点的映射规则
4. 自动构建拓扑结构（无需场景指导）

参考设计文档：
docs/decisions/refactor-3/AGENT_ARCHITECTURE_OPTIMIZATION_CC_FRAMEWORK_V2.md
第 3.3 节 "组件组合器实现"

依赖：feat/capability-registry 已合并
请先阅读 capability-registry.ts 和现有的 component-composer.ts，然后开始重构。

⚠️ 重要：删除代码前请确认无其他模块依赖。
```

---

### 3.4 Workflow 4: Orchestrator 集成

**分支**: `feat/orchestrator-integration`
**负责人**: Agent-4
**工期**: Week 4 (3.27 ~ 4.03)
**依赖**: 所有上述分支合并后

**模块边界**:
```
src/agents/
├── orchestrator.ts                 # 新增
├── intake-agent.ts                 # 重构为调用 orchestrator
tests/integration/
└── orchestrator-e2e.test.ts        # 新增端到端测试
```

**核心任务**:
1. 实现 `Orchestrator` 类
   - 协调 CapabilityDiscoverer + ReflectionEngine + ComponentComposer
   - 实现多轮对话状态管理
   - 实现能力发现 → 反思 → 组合 → 验证的完整流程
2. 重构 `IntakeAgent` 为调用 Orchestrator
3. 编写端到端测试（石头剪刀布示例）
4. 性能优化（目标 <8s）

**验收标准**:
- [ ] 支持任意用户需求（不限于 3 个场景）
- [ ] 多轮对话流畅，问题针对性强
- [ ] 生成的工作流质量不低于现有系统
- [ ] 平均响应时间 <8s
- [ ] 端到端测试通过（石头剪刀布 + 2 个自定义场景）

**首次提示词**:
```
我需要实现 Orchestrator，这是整个 Refactor-3 的集成层。

核心需求：
1. 协调 CapabilityDiscoverer、ReflectionEngine、ComponentComposer
2. 实现完整的能力驱动流程（发现 → 反思 → 组合 → 验证）
3. 管理多轮对话状态
4. 重构 IntakeAgent 为调用 Orchestrator

参考设计文档：
docs/decisions/refactor-3/AGENT_ARCHITECTURE_OPTIMIZATION_CC_FRAMEWORK_V2.md
第 2.2.2 节 "核心 Agent 设计 - Orchestrator"

依赖：所有 feat 分支已合并
请先阅读所有依赖模块，然后开始集成。

测试场景：
1. 石头剪刀布机器人（参考文档 2.3 节）
2. 人脸识别 + 语音欢迎
3. 自定义场景（用户自由描述）
```

---

## 四、集成流程

### 4.1 Integrator 职责

**分支**: `chore/integrate-refactor3`
**负责人**: Integrator
**工期**: Week 4 (与 Workflow 4 并行)

**核心任务**:
1. 按顺序合并所有 feat 分支
2. 解决合并冲突（预期高冲突文件见 4.3）
3. 运行完整测试套件
4. 验证端到端功能
5. 填写集成输出报告

**合并顺序**（严格执行）:
```bash
# 1. 合并能力注册表
git checkout chore/integrate-refactor3
git merge feat/capability-registry --no-ff
npm run build && npm test

# 2. 合并反思引擎
git merge feat/reflection-engine --no-ff
npm run build && npm test

# 3. 合并组件组合器重构
git merge feat/component-composer-refactor --no-ff
npm run build && npm test

# 4. 合并 Orchestrator 集成
git merge feat/orchestrator-integration --no-ff
npm run build && npm test

# 5. 最终验证
npm run lint
npm run typecheck
npm run test:integration
```

### 4.2 集成验收清单

**功能验收**:
- [ ] 能力注册表查询正常（关键词 → 能力）
- [ ] 反思引擎生成澄清问题（多轮对话）
- [ ] 组件组合器无场景依赖（grep 验证）
- [ ] Orchestrator 端到端流程通过（3 个测试场景）

**质量验收**:
- [ ] 所有单元测试通过（覆盖率 >85%）
- [ ] 所有集成测试通过
- [ ] Lint 无错误
- [ ] TypeScript 类型检查通过
- [ ] 性能测试通过（平均响应时间 <8s）

**文档验收**:
- [ ] 更新 CLAUDE.md（新增模块索引）
- [ ] 更新 README.md（架构变更说明）
- [ ] 填写 ITER_REFACTOR3_INTEGRATION_OUTPUT.md

### 4.3 高冲突文件预警

以下文件预期会有合并冲突，需要 Integrator 仔细处理：

| 文件路径 | 冲突原因 | 解决策略 |
|---------|---------|---------|
| `src/agents/types.ts` | 多个分支扩展接口 | 保留所有新增接口，删除场景枚举 |
| `src/agents/intake-agent.ts` | Workflow 3 删除代码 + Workflow 4 重构 | 以 Workflow 4 为准（调用 Orchestrator） |
| `src/agents/component-composer.ts` | Workflow 3 重构 | 保留重构后的版本 |
| `tests/integration/*.test.ts` | 多个分支新增测试 | 合并所有测试，删除场景相关测试 |

**冲突解决原则**:
1. **删除优先**: 场景相关代码一律删除
2. **新增保留**: 新增的能力驱动代码一律保留
3. **重构优先**: 重构后的代码优先于原有代码
4. **测试完整**: 合并后确保所有测试通过

---

## 五、风险与缓解

### 5.1 技术风险

**风险 1: 能力发现准确性不足**
- **影响**: 用户需求无法匹配到正确的硬件能力
- **概率**: 中
- **缓解**:
  - 构建同义词库（"手势" = "gesture" = "动作"）
  - 使用 LLM 辅助关键词提取
  - 提供"未找到能力"的友好提示

**风险 2: 反思循环效率低**
- **影响**: 多轮澄清导致用户疲劳
- **概率**: 中
- **缓解**:
  - 限制最多 5 轮澄清
  - 优先询问阻塞性问题
  - 支持用户强制生成（"开始生成"）

**风险 3: 组合爆炸**
- **影响**: 能力组合数量过多，难以验证
- **概率**: 低
- **缓解**:
  - 限制单个工作流最多 10 个节点
  - 使用依赖关系剪枝无效组合
  - 优先推荐常用组合模式

### 5.2 协作风险

**风险 4: 分支依赖阻塞**
- **影响**: Workflow 2/3/4 等待 Workflow 1 完成
- **概率**: 高
- **缓解**:
  - Workflow 1 优先级最高，Week 1 必须完成
  - Workflow 2/3 可并行开发（共同依赖 Workflow 1）
  - 每日同步进度，及时发现阻塞

**风险 5: 合并冲突复杂**
- **影响**: 集成时间延长，可能引入 bug
- **概率**: 高
- **缓解**:
  - 提前识别高冲突文件（见 4.3）
  - Integrator 提前介入，指导分支开发
  - 每个分支合并后立即运行完整测试

---

## 六、DoD (Definition of Done)

### 6.1 分支级 DoD

每个 feat 分支合并前必须满足：

**代码质量**:
- [ ] 所有单元测试通过
- [ ] 代码覆盖率达标（>85%）
- [ ] Lint 无错误
- [ ] TypeScript 类型检查通过
- [ ] 无 console.log 或调试代码

**文档完整**:
- [ ] 新增文件包含 L3 头部注释（INPUT/OUTPUT/POS）
- [ ] 更新相关 CLAUDE.md
- [ ] 复杂逻辑有注释说明

**功能验证**:
- [ ] 核心功能手动测试通过
- [ ] 边界情况测试通过
- [ ] 性能测试通过（如有）

### 6.2 迭代级 DoD

整个 Refactor-3 完成前必须满足：

**功能完整**:
- [ ] 能力注册表支持动态查询
- [ ] 反思引擎支持多轮澄清
- [ ] 组件组合器无场景依赖
- [ ] Orchestrator 端到端流程通过

**质量保证**:
- [ ] 所有测试通过（单元 + 集成）
- [ ] 代码覆盖率 >85%
- [ ] 性能测试通过（平均响应时间 <8s）
- [ ] 无已知 P0/P1 bug

**文档完整**:
- [ ] 架构文档更新
- [ ] API 文档更新
- [ ] 集成输出报告完成

**用户验证**:
- [ ] 石头剪刀布场景通过
- [ ] 人脸识别 + 语音欢迎场景通过
- [ ] 自定义场景通过（至少 2 个）

---

## 七、时间线与里程碑

| 时间 | 里程碑 | 交付物 |
|------|--------|--------|
| Week 1 (3.06-3.13) | 能力注册表完成 | `feat/capability-registry` 合并 |
| Week 2 (3.13-3.20) | 反思引擎完成 | `feat/reflection-engine` 合并 |
| Week 3 (3.20-3.27) | 组件组合器重构完成 | `feat/component-composer-refactor` 合并 |
| Week 4 (3.27-4.03) | Orchestrator 集成完成 | `feat/orchestrator-integration` 合并 |
| Week 4 (4.01-4.03) | 集成验证完成 | `chore/integrate-refactor3` 合并到 main |

**关键检查点**:
- **Day 7 (3.13)**: Workflow 1 必须完成，否则阻塞后续工作流
- **Day 14 (3.20)**: Workflow 2 必须完成，Workflow 3 可开始
- **Day 21 (3.27)**: Workflow 3 必须完成，Workflow 4 可开始
- **Day 28 (4.03)**: 所有工作流完成，集成验证通过

---

## 八、沟通与协作

### 8.1 每日同步

**时间**: 每天 10:00 AM
**参与者**: 所有 Agent + Integrator
**内容**:
- 昨日完成情况
- 今日计划
- 阻塞问题
- 依赖协调

### 8.2 周度评审

**时间**: 每周五 3:00 PM
**参与者**: 所有 Agent + Integrator + 架构师
**内容**:
- 本周交付物评审
- 下周计划确认
- 风险识别与缓解
- 架构决策讨论

### 8.3 紧急沟通

**触发条件**:
- 发现阻塞性问题
- 架构设计需要调整
- 合并冲突无法解决

**响应时间**: 2 小时内
**沟通渠道**: Slack #refactor-3 频道

---

## 九、附录

### 9.1 相关文档

- 架构设计: `docs/decisions/refactor-3/AGENT_ARCHITECTURE_OPTIMIZATION_CC_FRAMEWORK_V2.md`
- 执行指南: `docs/decisions/refactor-3/run-refactor3.md`
- 集成输出: `docs/decisions/refactor-3/ITER_REFACTOR3_INTEGRATION_OUTPUT.md`
- 启动脚本: `docs/scripts/refactor3_parallel_tmux.sh`

### 9.2 关键命令

```bash
# 启动并行开发环境
bash docs/scripts/refactor3_parallel_tmux.sh

# 运行完整测试
npm run build && npm test && npm run test:integration

# 验证无场景依赖
grep -r "CATEGORY_REQUIRED_FIELDS\|face_recognition_action\|emotion_interaction\|game_interaction" src/agents/

# 性能测试
npm run test:performance
```

---

**Conceived by Romuald Członkowski** - [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)
