# tesseract-be

## Type

项目 / 产品 / 长期开发对象

## Role

一个围绕 `n8n + Agent harness + workflow generation` 演进的 TypeScript 项目，当前重点是把 AI-native 编排系统从可运行状态收敛到可持续演化的 harness 形态。

## Repeated Themes

- `src/agents/` 是架构复杂度最集中的区域。
- `src/agent-server/` 提供后端协议与运行时可观测性。
- `apps/agent-ui/` 是调试、观测、交互的重要前台。
- `docs/decisions/refactor-4/` 是当前长期架构收敛主线。

## Persistent Risks

- 编排文件继续变厚，导致 harness 复杂度失控。
- 调试协议与业务协议继续耦合，增加前后端维护成本。
- 记忆系统如果不做晋升控制，会很快膨胀成杂乱文档堆。
