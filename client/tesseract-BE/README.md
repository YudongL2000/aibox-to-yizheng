# Tesseract Agent

项目由 MCP 节点知识库、验证与自动修复引擎、Agent 后端以及前端控制台组成，目标是把用户需求稳定转化为可硬件部署、可运行的 n8n 工作流。

## 项目定位

- 面向硬件机器人/自动化场景的工作流生成
- 内置节点知识库与参数规范，减少“能跑但不可维护”的工作流
- 通过验证与自动修复闭环提升生成质量

## 总体架构

- MCP 服务层
  - 节点知识库（n8n-nodes-base 与扩展节点）
  - 节点搜索/获取配置工具
  - 工作流校验与自动修复工具
- Agent 服务层
  - 意图解析与实体抽取（IntakeAgent）
  - 组件选择器与蓝图生成（ComponentSelector）
  - 工作流架构师（WorkflowArchitect）：提示词编排、JSON 解析、规范化与验证闭环
  - 会话与状态管理（SessionService）
- 前端控制台（agent-ui）
  - 对话交互 + 配置回传
  - 工作流预览与 n8n iframe 集成
- n8n 实例
  - 接收部署后的工作流并提供运行环境

## 处理流程（端到端）

1. 用户在 UI 输入需求，发送到 Agent API（HTTP / WebSocket）。
2. IntakeAgent 解析需求、抽取实体，并判断是否需要配置；若需要则返回 config_required。
3. 用户提交配置后进入 generating 阶段，ComponentSelector 生成组件蓝图。
4. WorkflowArchitect 组装系统提示词，调用 LLM 生成工作流 JSON，并执行：
   - 结构化解析
   - 连接与参数规范化
   - typeVersion 统一校正（含小数版本）
   - MCP 校验与自动修复
5. 通过验证后，部署到 n8n API（如配置了 N8N_API_URL/N8N_API_KEY）。
6. 返回 workflowId / workflowUrl，UI 展示结果并可在 n8n 中查看。

## 节点规范与质量保障

- 节点版本号统一由配置表管理（`src/agents/node-type-versions.ts`），确保 IF/Set/Http/Schedule 等节点保留小数版本号，避免 UI 参数渲染失败。
- 关键节点规范化：
  - IF v2 结构统一（conditions + combinator + options）
  - Set 节点结构统一（assignments + includeOtherFields）
  - httpRequest 统一 timeout 与 onError
- MCP 校验与 Auto-fix 形成闭环，减少非法结构落库。

## 关键目录

- `src/agents/`：Agent 核心逻辑（意图解析、组件选择、工作流生成与校验）
- `src/mcp/`：MCP 工具与 n8n 节点管理
- `src/services/`：验证、自动修复与规则引擎
- `apps/agent-ui/`：前端控制台
- `docs/`：规范、报告与执行流程

## 运行与配置（常用）

- Agent API: `http://localhost:3005`
- Agent WS: `ws://localhost:3005/ws`
- 前端 UI: `http://localhost:5173`
- n8n UI: `http://localhost:5678`

常用环境变量：
- `AGENT_PORT`（默认 3005）
- `N8N_API_URL`（如 `http://localhost:5678/api/v1`）
- `N8N_PUBLIC_URL`（如 `http://localhost:5678`）
- `VITE_AGENT_API_URL` / `VITE_AGENT_WS_URL` / `VITE_N8N_IFRAME_URL`

## 相关文档

- `AGENT_QUICKSTART.md`：本地快速启动
- `docs/api/agent-api.md`：Agent API 说明
- `docs/refactor_2/README.md`：执行与验证流程
- `apps/agent-ui/README.md`：前端配置

