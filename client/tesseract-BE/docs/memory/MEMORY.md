# MEMORY

## 作用

只保留“必须跨会话始终携带”的小核心。  
目标体积控制在 1-2 屏，不做知识仓库，不做原始聊天归档。

## 当前长期核心

- 项目：`tesseract-BE`，核心是 `src/agents`、`src/agent-server`、`apps/agent-ui` 三层协作的 AI-native 工作流生成系统。
- 当前长期主题：`Refactor-5 / AI-Native Composition`，目标是通过上下文工程（discovery 实体提取 + architect prompt 增强 + 管线统一走 LLM）让模型自主生成正确工作流。场景 ground truth 仅用于验证，不注入生成管线。前序 `Refactor-4 / Harness Engineering` 已完成阶段性交付。
- Refactor-5 的关键结构事实：`workflow-architect.ts` 已完成 Phase 4 主拆分，当前收敛到 `472` 行 orchestration 壳层；scene 安全网已下沉到 `src/agents/workflow-architect/scene/`，flags 与拓扑变更审计集中在 `scene/safety-net-controls.ts`。
- Refactor-5 的当前演进方向不是继续堆 scene safety net，而是把分支/实体/notes 约束前移到 prompt，同时保留可单独禁用、可观测的 safety-net flags 作为过渡护栏。
- Refactor-5 质量稳定化已经有测试真相源：`tests/integration/agents/quality-baseline.ts` + `quality-gate.test.ts`。三场景质量门与关键 SafetyNet 的退步预算现在通过默认 `npm test` 进入 CI 路径。
- 当前最小防御集方向已明确：结构型 SafetyNet 默认保持 enabled；音频修剪型 `pruneGestureRedundantTtsNodes` / `pruneSpeakerRelayNodes` 进入 dormant 候选态，用真实日志继续观察。
- 长期硬约束：
  - AI-native 路径禁止回退到 hint-style 硬编码捷径。
  - 硬件能力与 capability 定义必须保持单一真相源。
  - 架构级文件/目录变更必须同步 `CLAUDE.md`。
- 长期工作方式：
  - 新信息先写进 `daily/`。
  - 只有稳定、重复、高价值内容才晋升到 `bank/`。
  - 只有“每次会话都该知道”的内容才能进入本文件。

## 会话装载顺序

1. 先读 `MEMORY.md`
2. 再读今天与昨天的 `daily/*.md`
3. 需要时按主题检索 `bank/*`

## 防膨胀规则

- 只允许重写整理，不允许无限 append。
- 不保存原始聊天全文。
- 不保存密钥、token、密码。
- 当 `bank/*.md` 变大时，按主题拆分，而不是继续堆。
