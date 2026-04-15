# ConfigAgent 执行文档

> 版本: v1.0 | 日期: 2026-01-28

---

## 1. 数据结构

### 1.1 扩展 AgentPhase

```typescript
// src/agents/types.ts
export type AgentPhase = 'understanding' | 'generating' | 'deploying' | 'configuring';
```

### 1.2 扩展 AgentResponseType

```typescript
// src/agents/types.ts
export type AgentResponseType =
  | 'guidance'
  | 'summary_ready'
  | 'workflow_ready'
  | 'hot_plugging'   // 新增：硬件组件热插拔确认
  | 'config_input'   // 新增：输入类配置字段（如 TTS_input）
  | 'config_complete'     // 新增：全部硬件配置完成
  | 'error'
  | 'select_single'
  | 'select_multi'
  | 'image_upload';
```

### 1.3 新增 ConfigAgent 相关类型

```typescript
// src/agents/types.ts

/** 硬件节点类型（需要拼装的节点） */
export type HardwareNodeType = 'n8n-nodes-base.set' | 'n8n-nodes-base.httpRequest' | 'n8n-nodes-base.code';

/** 节点部署状态 */
export type NodeDeployStatus = 'pending' | 'deployed';

/** 待配置节点信息 */
export interface ConfigurableNode {
  /** 节点名称 */
  name: string;
  /** 节点类型 */
  type: HardwareNodeType;
  /** 节点在 workflow.nodes 数组中的索引 */
  index: number;
  /** 部署状态 */
  status: NodeDeployStatus;
  /** 节点显示名称（用于前端展示） */
  displayName: string;
}

/** ConfigAgent 会话状态 */
export interface ConfigAgentState {
  /** n8n 实例返回的 workflowId */
  workflowId: string;
  /** 留存的工作流 JSON */
  workflowSnapshot: WorkflowDefinition;
  /** 待配置节点列表（按顺序） */
  configurableNodes: ConfigurableNode[];
  /** 当前正在配置的节点索引 */
  currentNodeIndex: number;
  /** 是否全部完成 */
  completed: boolean;
}
```

### 1.4 扩展 AgentSession

```typescript
// src/agents/types.ts
export interface AgentSession {
  // ... 现有字段 ...

  /** ConfigAgent 状态 */
  configAgentState?: ConfigAgentState;
}
```

### 1.5 扩展 AgentResponse

```typescript
// src/agents/types.ts
export type AgentResponse =
  // ... 现有分支 ...
  | {
      type: 'hot_plugging' | 'config_input';
      message: string;
      /** 待配置节点总数 */
      totalNodes: number;
      /** 第一个待配置节点 */
      currentNode: ConfigurableNode;
      metadata?: {
        workflowId: string;
        showConfirmButton: boolean;
      };
    }
  | {
      type: 'hot_plugging' | 'config_input';
      message: string;
      /** 当前待配置节点 */
      currentNode: ConfigurableNode;
      /** 进度：已完成/总数 */
      progress: { completed: number; total: number };
      metadata?: {
        workflowId: string;
        showConfirmButton: boolean;
      };
    }
  | {
      type: 'config_complete';
      message: string;
      /** 已配置节点总数 */
      totalConfigured: number;
      metadata?: {
        workflowId: string;
      };
    };
```

---

## 2. 文件结构

```
src/agents/
├── config-agent.ts          # 新建：ConfigAgent 核心逻辑
├── config-agent-service.ts  # 新建：ConfigAgent 会话管理
└── types.ts                 # 扩展类型定义
```

---

## 3. ConfigAgent 核心实现

### 3.1 config-agent.ts

```typescript
/**
 * [INPUT]: 依赖 n8n API Client、SessionService
 * [OUTPUT]: 对外提供 ConfigAgent 硬件拼装引导
 * [POS]: agents 的第二阶段处理器，负责硬件拼装状态管理
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { N8nApiClient } from '../services/n8n-api-client';
import { SessionService } from './session-service';
import {
  AgentResponse,
  ConfigAgentState,
  ConfigurableNode,
  HardwareNodeType,
  WorkflowDefinition,
} from './types';
import { logger } from '../utils/logger';

/** 需要拼装的节点类型 */
const HARDWARE_NODE_TYPES: HardwareNodeType[] = [
  'n8n-nodes-base.set',
  'n8n-nodes-base.httpRequest',
  'n8n-nodes-base.code',
];

export class ConfigAgent {
  constructor(
    private sessionService: SessionService,
    private n8nClient: N8nApiClient
  ) {}

  /**
   * 初始化 ConfigAgent 状态
   * 在 /api/workflow/create 成功后调用
   */
  initializeConfigState(
    sessionId: string,
    workflowId: string,
    workflowSnapshot: WorkflowDefinition
  ): void {
    const configurableNodes = this.extractConfigurableNodes(workflowSnapshot);

    const state: ConfigAgentState = {
      workflowId,
      workflowSnapshot,
      configurableNodes,
      currentNodeIndex: 0,
      completed: configurableNodes.length === 0,
    };

    this.sessionService.setConfigAgentState(sessionId, state);
    logger.info('ConfigAgent: initialized', {
      sessionId,
      workflowId,
      configurableNodeCount: configurableNodes.length,
    });
  }

  /**
   * 开始硬件配置流程
   */
  startConfiguration(sessionId: string): AgentResponse {
    const state = this.sessionService.getConfigAgentState(sessionId);
    if (!state) {
      return { type: 'error', message: '未找到配置状态，请先创建工作流' };
    }

    if (state.configurableNodes.length === 0) {
      return {
        type: 'config_complete',
        message: '该工作流无需硬件拼装，已准备就绪。',
        totalConfigured: 0,
        metadata: { workflowId: state.workflowId },
      };
    }

    this.sessionService.setPhase(sessionId, 'configuring');
    const currentNode = state.configurableNodes[0];

    return {
      type: 'hot_plugging', // 或 'config_input'
      message: `进入硬件拼装阶段，共需配置 ${state.configurableNodes.length} 个组件。\n\n请拼装第 1 个组件：【${currentNode.displayName}】`,
      totalNodes: state.configurableNodes.length,
      currentNode,
      metadata: {
        workflowId: state.workflowId,
        showConfirmButton: true,
      },
    };
  }

  /**
   * 确认当前节点拼装完成
   * Mock：用户点击"已拼装完毕"按钮后调用
   */
  async confirmNodeDeployed(sessionId: string): Promise<AgentResponse> {
    const state = this.sessionService.getConfigAgentState(sessionId);
    if (!state) {
      return { type: 'error', message: '未找到配置状态' };
    }

    if (state.completed) {
      return {
        type: 'config_complete',
        message: '所有硬件组件已配置完成。',
        totalConfigured: state.configurableNodes.length,
        metadata: { workflowId: state.workflowId },
      };
    }

    const currentNode = state.configurableNodes[state.currentNodeIndex];

    // 调用 n8n API 更新节点 notes.extra = 'deployed'
    try {
      await this.updateNodeDeployStatus(state.workflowId, currentNode.name);
      currentNode.status = 'deployed';
      logger.info('ConfigAgent: node deployed', {
        sessionId,
        nodeName: currentNode.name,
        nodeIndex: state.currentNodeIndex,
      });
    } catch (error) {
      logger.error('ConfigAgent: failed to update node status', error);
      return {
        type: 'error',
        message: `更新节点状态失败：${error instanceof Error ? error.message : '未知错误'}`,
      };
    }

    // 移动到下一个节点
    state.currentNodeIndex++;

    // 检查是否全部完成
    if (state.currentNodeIndex >= state.configurableNodes.length) {
      state.completed = true;
      this.sessionService.setConfigAgentState(sessionId, state);
      this.sessionService.setPhase(sessionId, 'deploying');

      return {
        type: 'config_complete',
        message: `硬件拼装完成！共配置了 ${state.configurableNodes.length} 个组件，工作流已准备就绪。`,
        totalConfigured: state.configurableNodes.length,
        metadata: { workflowId: state.workflowId },
      };
    }

    // 继续下一个节点
    this.sessionService.setConfigAgentState(sessionId, state);
    const nextNode = state.configurableNodes[state.currentNodeIndex];

    return {
      type: 'hot_plugging', // 或 'config_input'
      message: `组件【${currentNode.displayName}】已确认拼装完成。\n\n请继续拼装第 ${state.currentNodeIndex + 1} 个组件：【${nextNode.displayName}】`,
      currentNode: nextNode,
      progress: {
        completed: state.currentNodeIndex,
        total: state.configurableNodes.length,
      },
      metadata: {
        workflowId: state.workflowId,
        showConfirmButton: true,
      },
    };
  }

  /**
   * 从工作流中提取需要配置的节点
   */
  private extractConfigurableNodes(workflow: WorkflowDefinition): ConfigurableNode[] {
    const nodes: ConfigurableNode[] = [];

    workflow.nodes.forEach((node, index) => {
      const nodeType = node.type as string;
      if (HARDWARE_NODE_TYPES.includes(nodeType as HardwareNodeType)) {
        nodes.push({
          name: node.name as string,
          type: nodeType as HardwareNodeType,
          index,
          status: 'pending',
          displayName: this.getNodeDisplayName(node),
        });
      }
    });

    return nodes;
  }

  /**
   * 获取节点显示名称
   */
  private getNodeDisplayName(node: Record<string, unknown>): string {
    const name = node.name as string;
    const type = node.type as string;

    const typeLabels: Record<string, string> = {
      'n8n-nodes-base.set': 'Set 配置节点',
      'n8n-nodes-base.httpRequest': 'HTTP 请求节点',
      'n8n-nodes-base.code': 'Code 代码节点',
    };

    return `${typeLabels[type] || type} - ${name}`;
  }

  /**
   * 调用 n8n API 更新节点的 notes.extra 字段
   */
  private async updateNodeDeployStatus(workflowId: string, nodeName: string): Promise<void> {
    await this.n8nClient.updatePartialWorkflow(workflowId, {
      operations: [
        {
          type: 'updateNode',
          nodeName,
          updates: {
            'notes.extra': 'deployed',
          },
        },
      ],
    });
  }
}
```

### 3.2 session-service.ts 扩展

```typescript
// 在 SessionService 类中添加以下方法

setConfigAgentState(sessionId: string, state: ConfigAgentState): void {
  const session = this.getOrCreate(sessionId);
  session.configAgentState = state;
  this.refresh(session);
  logger.debug('SessionService: stored config agent state', { sessionId });
}

getConfigAgentState(sessionId: string): ConfigAgentState | undefined {
  const session = this.getSession(sessionId);
  return session?.configAgentState;
}

clearConfigAgentState(sessionId: string): void {
  const session = this.getSession(sessionId);
  if (session) {
    session.configAgentState = undefined;
    this.refresh(session);
    logger.debug('SessionService: cleared config agent state', { sessionId });
  }
}
```

---

## 4. API 层实现

### 4.1 agent-service.ts 扩展

```typescript
// src/agent-server/agent-service.ts

import { ConfigAgent } from '../agents/config-agent';

export class AgentService {
  constructor(
    private intakeAgent: IntakeAgent,
    private sessionService: SessionService,
    private configAgent: ConfigAgent  // 新增
  ) {}

  // ... 现有方法 ...

  /**
   * 存储工作流快照并初始化 ConfigAgent
   */
  initializeConfigAgent(
    sessionId: string,
    workflowId: string,
    workflow: WorkflowDefinition
  ): void {
    this.configAgent.initializeConfigState(sessionId, workflowId, workflow);
  }

  /**
   * 开始硬件配置流程
   */
  startHardwareConfig(sessionId: string): AgentResponse {
    return this.configAgent.startConfiguration(sessionId);
  }

  /**
   * 确认当前节点拼装完成
   */
  async confirmNodeDeployed(sessionId: string): Promise<AgentResponse> {
    return this.configAgent.confirmNodeDeployed(sessionId);
  }
}
```

### 4.2 server.ts 扩展

```typescript
// src/agent-server/server.ts

// 修改 /api/workflow/create 接口
app.post('/api/workflow/create', async (req, res) => {
  try {
    const workflow = req.body?.workflow as Record<string, unknown> | undefined;
    const sessionId = req.body?.sessionId as string | undefined;

    const resolvedWorkflow =
      (workflow as any) ?? (sessionId ? this.agentService.getWorkflow(sessionId) : null);

    if (!resolvedWorkflow) {
      res.status(400).json({ error: 'workflow or sessionId is required' });
      return;
    }

    logger.debug('HTTP workflow create request', {
      workflowName: resolvedWorkflow.name ?? null,
      nodeCount: Array.isArray(resolvedWorkflow.nodes) ? resolvedWorkflow.nodes.length : 0,
    });

    const result = await this.workflowDeployer.createWorkflow(resolvedWorkflow as any);

    // 新增：初始化 ConfigAgent 状态
    if (sessionId && result.id) {
      this.agentService.initializeConfigAgent(sessionId, result.id, resolvedWorkflow);
    }

    res.json(result);
  } catch (error) {
    logger.warn('HTTP workflow create error', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Workflow error' });
  }
});

// 新增：开始硬件配置
app.post('/api/agent/start-config', async (req, res) => {
  const sessionId = req.body?.sessionId as string | undefined;
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  try {
    logger.debug('HTTP start-config request', { sessionId });
    const response = this.agentService.startHardwareConfig(sessionId);
    res.json({ sessionId, response });
  } catch (error) {
    logger.warn('HTTP start-config error', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Config error' });
  }
});

// 新增：确认节点拼装完成
app.post('/api/agent/confirm-node', async (req, res) => {
  const sessionId = req.body?.sessionId as string | undefined;
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  try {
    logger.debug('HTTP confirm-node request', { sessionId });
    const response = await this.agentService.confirmNodeDeployed(sessionId);
    res.json({ sessionId, response });
  } catch (error) {
    logger.warn('HTTP confirm-node error', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Config error' });
  }
});
```

### 4.3 websocket.ts 扩展

```typescript
// src/agent-server/websocket.ts

type IncomingMessage = {
  type: 'user_message' | 'confirm_workflow' | 'start_config' | 'confirm_node' | 'ping';
  sessionId?: string;
  message?: string;
};

// 在 socket.on('message') 处理中添加：

if (payload.type === 'start_config') {
  if (!payload.sessionId) {
    socket.send(JSON.stringify({ type: 'error', message: 'sessionId is required' }));
    return;
  }
  logger.debug('WebSocket: start_config request received', { sessionId: payload.sessionId });
  const response = agentService.startHardwareConfig(payload.sessionId);
  socket.send(
    JSON.stringify({
      type: 'agent_response',
      sessionId: payload.sessionId,
      response,
    })
  );
  return;
}

if (payload.type === 'confirm_node') {
  if (!payload.sessionId) {
    socket.send(JSON.stringify({ type: 'error', message: 'sessionId is required' }));
    return;
  }
  logger.debug('WebSocket: confirm_node request received', { sessionId: payload.sessionId });
  const response = await agentService.confirmNodeDeployed(payload.sessionId);
  socket.send(
    JSON.stringify({
      type: 'agent_response',
      sessionId: payload.sessionId,
      response,
    })
  );
  return;
}
```

---

## 5. 用户交互流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. 用户点击 [确认需求]                                                        │
│    POST /api/agent/confirm                                                   │
│    → 返回 workflow_ready，后端留存 workflow JSON                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. 用户点击 [创建工作流]                                                      │
│    POST /api/workflow/create { sessionId, workflow }                         │
│    → n8n 返回 workflowId                                                     │
│    → 后端调用 initializeConfigAgent(sessionId, workflowId, workflow)         │
│    → 返回 { id, name, ... }                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. 前端自动调用 [开始配置]                                                    │
│    POST /api/agent/start-config { sessionId }                                │
│    → 返回 hot_plugging 或 config_input { totalNodes, currentNode }                           │
│    → 前端显示：进入硬件拼装阶段，请拼装第 1 个组件：【Set 配置节点 - xxx】       │
│    → 前端显示 [已拼装完毕] 按钮                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. 用户点击 [已拼装完毕]                                                      │
│    POST /api/agent/confirm-node { sessionId }                                │
│    → 后端调用 n8n API 更新 notes.extra = 'deployed'                          │
│    → 返回 hot_plugging 或 config_input { currentNode, progress }                      │
│    → 前端显示：组件已确认，请继续拼装第 2 个组件...                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. 重复步骤 4 直到全部完成                                                    │
│    → 返回 config_complete { totalConfigured }                                │
│    → 前端显示：硬件拼装完成！共配置了 N 个组件                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. n8n 节点更新示例

调用 `n8n_update_partial_workflow` 更新节点 `notes.extra` 字段：

```typescript
// 请求
{
  id: "workflow_123",
  operations: [
    {
      type: "updateNode",
      nodeName: "Set Robot Response",
      updates: {
        "notes.extra": "deployed"
      }
    }
  ]
}

// 响应
{
  success: true,
  data: {
    id: "workflow_123",
    name: "石头剪刀布游戏",
    operationsApplied: 1
  },
  message: "Workflow updated successfully. Applied 1 operations."
}
```

---

## 7. 测试文件

```
tests/unit/agents/config-agent.test.ts
```

### 测试用例

1. `extractConfigurableNodes` 正确提取 set/httpRequest/code 节点
2. `startConfiguration` 返回正确的 hot_plugging 或 config_input 响应
3. `confirmNodeDeployed` 正确更新节点状态并推进索引
4. `confirmNodeDeployed` 最后一个节点完成后返回 config_complete
5. 空工作流（无可配置节点）直接返回 config_complete

---

**文档结束**
