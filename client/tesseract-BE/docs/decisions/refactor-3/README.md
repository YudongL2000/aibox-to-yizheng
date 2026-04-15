# Refactor-3 并行开发文档包 - 生成完成

## 生成的文件清单

### 1. 核心文档

✅ **ITER_REFACTOR3_PARALLEL.md** (18KB)
- 并行开发执行计划
- 4 个工作流 + 1 个集成流
- 分支矩阵与依赖关系
- 详细的验收标准
- 风险与缓解策略

✅ **run-refactor3.md** (12KB)
- 快速启动指南
- 环境准备步骤
- 一键启动命令
- 每个分支的首次提示词
- 开发流程与验收清单

✅ **ITER_REFACTOR3_INTEGRATION_OUTPUT.md** (11KB)
- 集成输出报告模板
- 合并统计表格
- 冲突解决记录
- 测试验收清单
- 文档验收清单

✅ **CLAUDE.md** (806B)
- refactor-3 目录索引
- 成员清单
- GEB 协议头部

### 2. 启动脚本

✅ **docs/scripts/refactor3_parallel_tmux.sh** (5.5KB)
- 幂等的 worktree 创建
- Tmux 会话管理
- 可配置的环境变量
- 自动启动 Claude Code（可选）

### 3. 参考文档

✅ **AGENT_ARCHITECTURE_OPTIMIZATION_CC_FRAMEWORK_V2.md** (36KB)
- V2 架构设计文档
- 能力驱动设计理念
- 核心技术实现
- 实施路径

---

## 快速开始

### Step 0: 测试 SSH 连接（推荐）

```bash
# 测试 GitHub SSH 连接
bash docs/scripts/test-ssh-connection.sh

# 如果测试失败，按照提示修复
```

### Step 1: 启动并行开发环境

```bash
# 一键启动
bash docs/scripts/refactor3_parallel_tmux.sh

# 连接 tmux 会话
tmux attach -t refactor3
```

### Step 2: 切换到对应窗口

```
Ctrl+b + 1  →  feat/capability-registry
Ctrl+b + 2  →  feat/reflection-engine
Ctrl+b + 3  →  feat/component-composer-refactor
Ctrl+b + 4  →  feat/orchestrator-integration
Ctrl+b + 5  →  chore/integrate-refactor3 (Integrator)
```

### Step 3: 开始开发

每个窗口的首次提示词已在 `run-refactor3.md` 中准备好，直接复制粘贴即可。

---

## 文档结构

```
docs/
├── decisions/
│   └── refactor-3/
│       ├── AGENT_ARCHITECTURE_OPTIMIZATION_CC_FRAMEWORK_V2.md  # 架构设计
│       ├── ITER_REFACTOR3_PARALLEL.md                          # 执行计划
│       ├── run-refactor3.md                                    # 启动指南
│       ├── ITER_REFACTOR3_INTEGRATION_OUTPUT.md                # 集成报告
│       ├── CLAUDE.md                                           # 目录索引
│       └── example/                                            # 交互示例
│           ├── f1-detail.md
│           ├── f1.png
│           ├── f2.png
│           └── f3.png
└── scripts/
    └── refactor3_parallel_tmux.sh                              # 启动脚本
```

---

## 分支矩阵

| 分支名称 | 负责人 | 工期 | 依赖 |
|---------|--------|------|------|
| feat/capability-registry | Agent-1 | Week 1 | 无 |
| feat/reflection-engine | Agent-2 | Week 2 | feat/capability-registry |
| feat/component-composer-refactor | Agent-3 | Week 3 | feat/capability-registry |
| feat/orchestrator-integration | Agent-4 | Week 4 | 所有上述分支 |
| chore/integrate-refactor3 | Integrator | Week 4 | 所有 feat 分支 |

---

## 合并顺序（严格执行）

1. `feat/capability-registry` → `chore/integrate-refactor3`
2. `feat/reflection-engine` → `chore/integrate-refactor3`
3. `feat/component-composer-refactor` → `chore/integrate-refactor3`
4. `feat/orchestrator-integration` → `chore/integrate-refactor3`
5. `chore/integrate-refactor3` → `main`

---

## 验收标准

### 功能验收
- [ ] 能力注册表支持动态查询
- [ ] 反思引擎支持多轮澄清
- [ ] 组件组合器无场景依赖
- [ ] Orchestrator 端到端流程通过

### 质量验收
- [ ] 所有测试通过（覆盖率 >85%）
- [ ] Lint 无错误
- [ ] TypeScript 类型检查通过
- [ ] 性能测试通过（<8s）

### 文档验收
- [ ] 更新 CLAUDE.md
- [ ] 更新 README.md
- [ ] 填写集成输出报告

---

## 关键命令

```bash
# 测试 SSH 连接
bash docs/scripts/test-ssh-connection.sh

# 启动并行环境
bash docs/scripts/refactor3_parallel_tmux.sh

# 连接 tmux 会话
tmux attach -t refactor3

# 运行完整测试
npm run build && npm test && npm run test:integration

# 验证无场景依赖
grep -r "CATEGORY_REQUIRED_FIELDS\|face_recognition_action\|emotion_interaction\|game_interaction" src/agents/

# 性能测试
npm run test:performance
```

---

## 时间线

| 时间 | 里程碑 |
|------|--------|
| Week 1 (3.06-3.13) | 能力注册表完成 |
| Week 2 (3.13-3.20) | 反思引擎完成 |
| Week 3 (3.20-3.27) | 组件组合器重构完成 |
| Week 4 (3.27-4.03) | Orchestrator 集成完成 |
| Week 4 (4.01-4.03) | 集成验证完成 |

---

## 沟通协作

**每日同步**: 每天 10:00 AM
**周度评审**: 每周五 3:00 PM
**紧急沟通**: Slack #refactor-3 频道

---

**Conceived by Romuald Członkowski** - [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)
