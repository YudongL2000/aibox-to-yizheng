# Refactor-5 质量稳定化总结

> 本文区分两类证据：`测试文件回放` 与 `真实端到端执行`。前者证明质量门和矩阵逻辑已收口，后者证明 Agent 在真实运行时离 Ground Truth 还有多少距离。

## 1. 结论

Refactor-5 相比重构前，**确实把质量稳定化做成了可观测、可比较、可回归的系统**，但真实端到端结果没有达到“全面贴齐 Ground Truth”的程度。

当前最准确的结论是：

- `gesture` 和 `emo` 在真实 E2E 下已经能跑通 `chat -> confirm -> workflow/create`，并且相对 Ground Truth 达到 `node coverage = 1.00 / category coverage = 1.00`。
- `game` 在真实 E2E 下虽然也能生成并创建工作流，但相对 Ground Truth 仍明显偏弱：
  - stabilized profile: `node coverage = 0.7714`, `category coverage = 0.5556`
  - raw profile: `node coverage = 0.8000`, `category coverage = 0.5556`
- 因此，Refactor-5 当前的真实状态不是“全部场景已稳定贴齐 GT”，而是：
  - `矩阵与质量门已稳定`
  - `两类核心场景真实 E2E 已对齐`
  - `game 场景真实 E2E 仍未完成质量稳定化`

## 2. 本次真实 E2E 执行方式

### 2.1 执行链路

本次不是跑测试文件，而是启动真实程序后，逐场景调用：

1. `POST /api/agent/chat`
2. `POST /api/agent/confirm`
3. `POST /api/workflow/create`
4. 从日志提取 `workflow JSON`
5. 用 [ground-truth-evaluator.ts](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/src/agents/evaluation/ground-truth-evaluator.ts) 对比 Ground Truth

所有场景都使用**新 session**，不复用旧对话上下文。

### 2.2 本次使用的日志

- stabilized profile:
  [2026-03-15T17-30-18-244+08-00.log](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-18-244+08-00.log)
- raw profile:
  [2026-03-15T17-30-35-199+08-00.log](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-35-199+08-00.log)

约定：

- `stabilized profile`: `sceneSafetyNet = all`，音频修剪网进入 `dormant`
- `raw profile`: `sceneSafetyNet = none`

### 2.3 作为对照的测试文件证据

本次同时保留了质量门与矩阵回放结果，作为“实验室内基线”：

```bash
'/mnt/c/Program Files/nodejs/node.exe' node_modules/typescript/bin/tsc --noEmit
'/mnt/c/Program Files/nodejs/node.exe' node_modules/vitest/vitest.mjs run tests/integration/agents/quality-gate.test.ts tests/integration/agents/safety-net-matrix.test.ts tests/integration/agents/ground-truth.test.ts tests/unit/agents/workflow-architect.test.ts --coverage.enabled=false
```

结果：

- `4` 个测试文件通过
- `61` 个测试通过
- `0` 个失败

这组结果证明：**质量门、矩阵、Ground Truth 回放本身是绿的**。它不自动等价于真实 E2E 也已全面绿。

## 3. 真实 E2E 对比结果

### 3.1 汇总表

| 场景 | profile | E2E 闭环 | Node Coverage | Category Coverage | 结论 |
|------|---------|----------|---------------|-------------------|------|
| gesture | stabilized | `chat -> confirm -> workflow/create` 成功 | `1.0000` | `1.0000` | 已贴齐 GT |
| emo | stabilized | `chat -> confirm -> workflow/create` 成功 | `1.0000` | `1.0000` | 已贴齐 GT |
| game | stabilized | `chat -> confirm -> workflow/create` 成功 | `0.7714` | `0.5556` | 仍未贴齐 GT |
| game | raw | `chat -> confirm` 成功，但耗时很高 | `0.8000` | `0.5556` | 仍未贴齐 GT，且更慢 |

### 3.2 关键判断

- 相比重构前，**工作流生成闭环本身已经实质前进**：真实运行下至少 `gesture / emo / game(stabilized)` 都能走到 `workflow_ready`，前两者还能继续成功创建 workflow。
- 但相对 Ground Truth 的“最终质量”不是全部增进：
  - `gesture / emo` 是真实增进
  - `game` 仍然没有达到 Refactor-5 文档隐含期待的稳定交付状态

## 4. 逐条复盘与日志依据

## 4.1 gesture：真实 E2E 已贴齐 Ground Truth

### 结果

- `node coverage = 1.0000`
- `category coverage = 1.0000`
- `actual nodes = 16`
- `expected nodes = 12`
- `missing categories = []`

### 日志支撑

- 用户输入进入链路：
  [2026-03-15T17-30-18-244+08-00.log:4141](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-18-244+08-00.log#L4141)
- 完整 workflow JSON 已写出：
  [2026-03-15T17-30-18-244+08-00.log:4416](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-18-244+08-00.log#L4416)
- confirm 已返回 `workflow_ready`：
  [2026-03-15T17-30-18-244+08-00.log:5060](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-18-244+08-00.log#L5060)
- `workflow/create` 成功后的 ConfigAgent 初始化：
  [2026-03-15T17-30-18-244+08-00.log:5096](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-18-244+08-00.log#L5096)

### 复盘

这一条证明：Refactor-5 当前在 `gesture` 场景下，已经不只是“测试文件过了”，而是**真实 Agent 执行闭环和 Ground Truth 结构对齐都跑通了**。

## 4.2 emo：真实 E2E 已贴齐 Ground Truth

### 结果

- `node coverage = 1.0000`
- `category coverage = 1.0000`
- `actual nodes = 18`
- `expected nodes = 16`
- `missing categories = []`

### 日志支撑

- 用户输入进入链路：
  [2026-03-15T17-30-18-244+08-00.log:5504](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-18-244+08-00.log#L5504)
- 完整 workflow JSON 已写出：
  [2026-03-15T17-30-18-244+08-00.log:5777](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-18-244+08-00.log#L5777)
- confirm 已返回 `workflow_ready`：
  [2026-03-15T17-30-18-244+08-00.log:6518](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-18-244+08-00.log#L6518)
- `workflow/create` 成功后的 ConfigAgent 初始化：
  [2026-03-15T17-30-18-244+08-00.log:6553](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-18-244+08-00.log#L6553)

### 复盘

这一条说明 `ensureEmotionInteractionFlow` 从重模板替换降级后，并没有把真实交付能力打坏。emo 场景现在不仅能跑，而且真实 E2E 结构已贴齐 GT。这是 Refactor-5 里**最有含金量的增进之一**。

## 4.3 game（stabilized）：工作流能创建，但质量仍未贴齐 Ground Truth

### 结果

- `node coverage = 0.7714`
- `category coverage = 0.5556`
- `actual nodes = 27`
- `expected nodes = 35`
- `missing categories = ["BASE","TTS","SPEAKER","SCREEN"]`
- `topologyScore = 0.5000`

### 日志支撑

- 用户输入进入链路：
  [2026-03-15T17-30-18-244+08-00.log:6566](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-18-244+08-00.log#L6566)
- 完整 workflow JSON 已写出：
  [2026-03-15T17-30-18-244+08-00.log:8310](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-18-244+08-00.log#L8310)
- confirm 已返回 `workflow_ready`：
  [2026-03-15T17-30-18-244+08-00.log:9459](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-18-244+08-00.log#L9459)
- `workflow/create` 成功后的 ConfigAgent 初始化：
  [2026-03-15T17-30-18-244+08-00.log:9496](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-18-244+08-00.log#L9496)

### 复盘

这一条是本次最关键的现实修正：

- **重构后 game 不再是“生成失败”**，真实链路已经能走到 `workflow/create`
- 但它也**绝不是“质量稳定化已完成”**

从日志中抽出的 workflow JSON 可以直接看到两个问题：

1. 触发器仍然是 `webhook`，不是 GT 里的 `scheduleTrigger`
2. 节点总数只有 `27`，少于 GT 的 `35`

这就解释了为什么 `BASE / TTS / SPEAKER / SCREEN` 仍然被评估器判为缺失：不是 Agent 完全不会生成，而是**结果分支数量和类别分布还不够完整**。

也就是说，`game` 当前的真实状态是：

- 闭环能力：已具备
- 质量稳定性：未达标

## 4.4 game（raw）：当前默认 raw 模式不适合作为验收配置

### 结果

- `node coverage = 0.8000`
- `category coverage = 0.5556`
- `actual nodes = 28`
- `expected nodes = 35`
- `missing categories = ["BASE","TTS","SPEAKER","SCREEN"]`
- `topologyScore = 0.5000`

### 日志支撑

- 用户输入进入链路：
  [2026-03-15T17-30-35-199+08-00.log:4309](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-35-199+08-00.log#L4309)
- `summary_ready` 已返回：
  [2026-03-15T17-30-35-199+08-00.log:4475](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-35-199+08-00.log#L4475)
- 收到确认构建：
  [2026-03-15T17-30-35-199+08-00.log:4501](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-35-199+08-00.log#L4501)
- 主路径生成开始：
  [2026-03-15T17-30-35-199+08-00.log:4521](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-35-199+08-00.log#L4521)
- workflow JSON 最终写出：
  [2026-03-15T17-30-35-199+08-00.log:5473](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-35-199+08-00.log#L5473)
- confirm 最终返回 `workflow_ready`：
  [2026-03-15T17-30-35-199+08-00.log:6702](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/data/logs/2026-03-15T17-30-35-199+08-00.log#L6702)

### 复盘

这里必须纠正一个容易误判的点：

- raw 模式不是“完全卡死”
- raw 模式是“**极慢后仍然产出**”

从日志时间戳看：

- 输入时间：`17:40:15.695`
- workflow JSON 写出时间：`17:41:53.525`

这意味着仅 `chat -> confirm -> workflow_ready` 就接近 `98s`。而且最终结构质量也没有好于 stabilized，只是 `node coverage` 从 `0.7714` 轻微变成了 `0.8000`，`category coverage` 仍然停在 `0.5556`。

所以当前默认 raw 模式能作为“暴露模型原始能力”的实验模式，但**不能作为质量稳定化的验收配置**。

## 5. 测试文件回放与真实 E2E 的差异

这是本次最重要的架构现实：

### 测试文件回放结果

- 质量门 + 矩阵 + Ground Truth 回放：`61/61` 全绿
- 结构化基线下三场景可做到 `1.00 / 1.00`

### 真实 E2E 结果

- `gesture`: 绿
- `emo`: 绿
- `game`: 仍黄

### 本质原因

测试文件回放证明的是：

- prompt fragment
- safety net
- evaluator
- 质量门阈值

这套“实验室体系”已经稳定。

真实 E2E 暴露的是：

- 自然语言到 workflow 的真实漂移
- 多轮 Agent 调度后的结构损失
- `game` 场景在 live generation 下仍不够接近 GT

所以当前不能再把“矩阵绿了”直接解释成“真实交付质量也绿了”。

## 6. 相比 Ground Truth，重构后到底有没有增进

答案是：**有，但不是全盘完成。**

### 已明确增进的部分

- `gesture`：真实 E2E 已贴齐 GT
- `emo`：真实 E2E 已贴齐 GT，而且不再依赖 T1 模板替换偷过关
- `workflow/create`：真实链路已能在至少两类核心场景里稳定跑通

### 尚未完成的部分

- `game`：真实 E2E 仍未贴齐 GT
- raw 模式：仍然过慢，不适合做验收 profile

因此，Refactor-5 当前最合理的总结是：

**质量稳定化已经从“测试内成功”推进到“真实运行里部分成功”，但还没有推进到“三场景真实 E2E 全面对齐 GT”。**

## 7. 下一步最该做的事

当前最值得继续做的不是再写总结，而是直接收 `game` 的 live gap：

1. 把 `game` 的真实 E2E workflow JSON 与 GT 做逐节点差分
2. 明确到底是 prompt fragment 不足，还是 `scene safety net` 没覆盖 live 漂移
3. 给 `game` 增加一条真正的 live E2E 质量门，而不是继续只靠 fixture/matrix

## 8. 第 8 节验收标准完成情况

以下状态对应 [QUALITY_STABILIZATION.md](/mnt/c/Users/sam/Documents/Sam/code/tesseract-BE/docs/decisions/refactor-5/QUALITY_STABILIZATION.md) 第 8 节。

1. `[x]` `ensureEmotionInteractionFlow` 已从 `T1` 完整模板替换降级为 `T2` 增量补全  
   依据：当前 emo 真实 E2E 已贴齐 GT，且不再需要用整图替换解释结果。

2. `[x]` 已新增 `emotion-interaction-pattern.ts`  
   依据：Refactor-5 Phase 1 已落地，对应质量稳定化执行记录已完成。

3. `[x]` emo OFF coverage ≥ 70%  
   依据：矩阵与质量门回归均通过，已在测试文件层固定。

4. `[x]` gesture OFF coverage ≥ 80%  
   依据：矩阵回归已固定并通过。

5. `[x]` game 四个核心 net 的退步幅度 ≤ 15%  
   依据：SafetyNet 对照矩阵已覆盖并通过。

6. `[x]` 质量门已集成到默认测试路径  
   依据：`quality-gate.test.ts` 已进入当前回归命令集合。

7. `[x]` `46+` 条矩阵测试全绿  
   依据：当前相关回归为 `61/61` 全绿。

8. `[~]` `typecheck + unit test` 全绿  
   当前状态：
   - `typecheck`: 已完成
   - Refactor-5 相关 `unit + integration` 回归：已完成
   - **全仓 unit test 本轮未重新完整执行**

因此，第 8 条当前最准确的判断是：

**部分完成。**

如果按“Refactor-5 相关范围”看，它已经是绿的；如果按“全仓 unit test 全量重跑”看，本轮证据还不够，不应在文档里冒进写成 `已完成`。
