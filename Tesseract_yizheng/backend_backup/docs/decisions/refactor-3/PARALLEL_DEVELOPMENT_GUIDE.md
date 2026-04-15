# Refactor-3 真正并行开发指南

## 核心理念：4 个 feat 分支完全并行

**关键变化**:
- ✅ 所有 feat 分支从 main 同时创建，**无依赖关系**
- ✅ 4 个 Agent 同时开发，Week 1 集中完成
- ✅ Week 2 由 Integrator 统一合并，解决冲突
- ✅ 真正的并行开发，而非串行等待

---

## 并行开发架构

### 分支依赖图

```
                    main
                     ↓
    ┌────────────────┼────────────────┐
    ↓                ↓                ↓                ↓
feat/capability  feat/reflection  feat/component  feat/orchestrator
   -registry        -engine        -composer         -integration
    │                │                │                │
    │ Week 1         │ Week 1         │ Week 1         │ Week 1
    │ 并行开发       │ 并行开发       │ 并行开发       │ 并行开发
    │                │                │                │
    └────────────────┴────────────────┴────────────────┘
                            ↓
                  chore/integrate-refactor3
                     (Week 2 集成)
                            ↓
                          main
```

### 为什么可以并行？

**1. 模块边界清晰**:
- `capability-registry.ts`: 独立的能力查询模块
- `reflection-engine.ts`: 独立的反思引擎模块
- `component-composer.ts`: 重构现有模块（删除场景代码）
- `orchestrator.ts`: 新增编排器模块

**2. 接口契约明确**:
每个模块都有清晰的输入输出契约（L3 头部注释），可以独立开发和测试。

**3. 集成阶段解决冲突**:
- Week 1: 各自开发，互不干扰
- Week 2: Integrator 统一合并，解决 `types.ts` 等共享文件的冲突

---

## 快速启动

### Step 1: 一键启动并行环境

```bash
# 清理旧会话
tmux kill-session -t refactor3

# 启动并行开发环境
bash docs/scripts/refactor3_parallel_tmux.sh

# 连接会话
tmux attach -t refactor3
```

### Step 2: 打开 VSCode 工作区（推荐）

```bash
# 在 VSCode 中打开工作区，同时查看所有 worktree
code refactor3-parallel.code-workspace
```

**工作区优势**:
- 同时显示 6 个文件夹（main + 5 个 worktree）
- 源代码管理面板显示所有仓库的 Git 状态
- 快速在不同分支间切换和对比代码
- 支持跨 worktree 的全局搜索

### Step 3: 4 个 Agent 同时开发

**Pane 0**: feat/capability-registry
- 实现能力注册表
- 无需等待其他分支

**Pane 1**: feat/reflection-engine
- 实现反思引擎
- 无需等待其他分支

**Pane 2**: feat/component-composer-refactor
- 重构组件组合器
- 无需等待其他分支

**Pane 3**: feat/orchestrator-integration
- 实现 Orchestrator
- 无需等待其他分支

**Pane 4**: chore/integrate-refactor3 (Integrator)
- Week 1: 等待 feat 分支完成
- Week 2: 开始合并

---

## Week 1: 并行开发阶段

### 开发流程

```bash
# 每个 Agent 在自己的 worktree 中独立开发
cd ../.zcf/tesseract-BE/feat-capability-registry

# 1. 实现功能
# 2. 编写测试
# 3. 本地验证
npm run build
npm test

# 4. 提交代码
git add .
git commit -m "feat: implement capability registry"
git push origin feat/capability-registry

# 5. 通知 Integrator 准备合并
```

### 验收标准（每个分支独立）

**feat/capability-registry**:
- [ ] CapabilityRegistry 类实现完成
- [ ] 单元测试覆盖率 >90%
- [ ] 查询性能 <10ms
- [ ] 通过 lint 和 typecheck

**feat/reflection-engine**:
- [ ] ReflectionEngine 类实现完成
- [ ] 单元测试覆盖率 >85%
- [ ] 能识别 5 类缺失信息
- [ ] 通过 lint 和 typecheck

**feat/component-composer-refactor**:
- [ ] 删除所有场景代码
- [ ] 基于能力的动态组合实现
- [ ] 集成测试通过
- [ ] 通过 lint 和 typecheck

**feat/orchestrator-integration**:
- [ ] Orchestrator 类实现完成
- [ ] 端到端测试通过（3 个场景）
- [ ] 平均响应时间 <8s
- [ ] 通过 lint 和 typecheck

---

## Week 2: 集成阶段

### Integrator 工作流

```bash
# 切换到集成分支
cd ../.zcf/tesseract-BE/chore-integrate-refactor3
git checkout chore/integrate-refactor3

# 按顺序合并（解决冲突）
# 1. 合并 capability-registry（通常无冲突）
git merge feat/capability-registry --no-ff
npm run build && npm test

# 2. 合并 reflection-engine（可能冲突：types.ts）
git merge feat/reflection-engine --no-ff
# 解决冲突：保留所有新增接口
npm run build && npm test

# 3. 合并 component-composer-refactor（可能冲突：types.ts, intake-agent.ts）
git merge feat/component-composer-refactor --no-ff
# 解决冲突：删除场景代码，保留重构后的代码
npm run build && npm test

# 4. 合并 orchestrator-integration（可能冲突：intake-agent.ts）
git merge feat/orchestrator-integration --no-ff
# 解决冲突：以 Orchestrator 版本为准
npm run build && npm test

# 5. 最终验证
npm run lint
npm run typecheck
npm run test:integration

# 6. 合并到 main
git checkout main
git merge chore/integrate-refactor3 --no-ff
git push origin main
```

### 预期冲突文件

| 文件 | 冲突原因 | 解决策略 |
|------|---------|---------|
| `src/agents/types.ts` | 多个分支扩展接口 | 保留所有新增接口，删除场景枚举 |
| `src/agents/intake-agent.ts` | 删除 + 重构 | 以 Orchestrator 版本为准 |
| `src/agents/component-composer.ts` | 重构 | 保留重构后的版本 |

---

## 并行开发的优势

### Before（串行开发）

```
Week 1: capability-registry
Week 2: reflection-engine (等待 Week 1)
Week 3: component-composer (等待 Week 2)
Week 4: orchestrator (等待 Week 3)
总计：4 周
```

### After（并行开发）

```
Week 1: 4 个分支同时开发
Week 2: 集成 + 测试
总计：2 周（节省 50% 时间）
```

### 关键收益

- ✅ **时间节省**: 4 周 → 2 周
- ✅ **真正并行**: 4 个 Agent 同时工作
- ✅ **降低风险**: 每个分支独立测试，问题早发现
- ✅ **清晰职责**: 每个 Agent 专注自己的模块

---

## 常见问题

### Q1: 如果 reflection-engine 需要用到 capability-registry 怎么办？

**A**: 不需要！每个模块都是独立的：
- `reflection-engine` 只依赖 `LLMClient` 和 `types.ts`
- `capability-registry` 是独立的查询模块
- 它们在 `orchestrator` 中才会组合使用

### Q2: 如果开发过程中发现需要修改共享文件怎么办？

**A**: 各自修改，集成时解决冲突：
- Week 1: 每个分支独立修改 `types.ts`
- Week 2: Integrator 合并时保留所有新增内容

### Q3: 如果某个分支提前完成怎么办？

**A**: 提前推送，等待其他分支：
```bash
# 提前完成
git push origin feat/capability-registry

# 通知 Integrator
# Integrator 可以提前开始部分合并
```

### Q4: 如果某个分支延期怎么办？

**A**: 其他分支不受影响：
- 已完成的分支先合并
- 延期的分支完成后再合并
- 不会阻塞其他分支

---

## 时间线

| 日期 | 里程碑 | 交付物 |
|------|--------|--------|
| Day 1 (3.06) | 启动并行开发 | 4 个 worktree + tmux 会话 |
| Day 3 (3.08) | 中期检查 | 每个分支进度 >50% |
| Day 5 (3.10) | 代码审查 | 每个分支提交 PR |
| Day 7 (3.13) | Week 1 完成 | 4 个 feat 分支全部完成 |
| Day 10 (3.16) | 集成开始 | 开始合并分支 |
| Day 12 (3.18) | 集成测试 | 所有分支合并完成 |
| Day 14 (3.20) | 发布 | 合并到 main |

---

**Conceived by Romuald Członkowski** - [www.aiadvisors.pl/en](https://www.aiadvisors.pl/en)
