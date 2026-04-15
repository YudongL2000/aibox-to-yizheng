# 工作流质量标准与 ConfigAgent 闭环执行文档

> 目标：IntakeAgent 输出符合质量标准的工作流 JSON，ConfigAgent 完成硬件配置闭环

---

## 1. 节点类别定义 (NodeCategory)

```typescript
// src/agents/types.ts

export type NodeCategory =
  | 'MIC'        // 麦克风输入
  | 'LLM'        // 大语言模型
  | 'CAM'        // 摄像头
  | 'HAND'       // 机械手
  | 'YOLO-HAND'  // YOLO手势检测
  | 'YOLO-RPS'   // YOLO猜拳检测
  | 'FACE-NET'   // 人脸识别
  | 'BASE'       // 底盘/移动
  | 'TTS'        // 语音合成
  | 'ASR'        // 语音识别
  | 'SCREEN'     // 屏幕显示
  | 'SPEAKER'    // 扬声器
  | 'WHEEL'      // 轮子/电机
  | 'RAM'        // 内存/缓存
  | 'ASSIGN';    // 赋值/变量

// 硬件节点类型（需要 ConfigAgent 配置）
export const HARDWARE_CATEGORIES: NodeCategory[] = [
  'MIC', 'CAM', 'HAND', 'BASE', 'TTS', 'ASR',
  'SCREEN', 'SPEAKER', 'WHEEL', 'YOLO-HAND', 'YOLO-RPS', 'FACE-NET'
];

// 软件节点类型（IntakeAgent 直接配置）
export const SOFTWARE_CATEGORIES: NodeCategory[] = [
  'LLM', 'RAM', 'ASSIGN'
];
```

---

## 2. Notes 字段结构规范

```typescript
// src/agents/types.ts

export interface NodeNotes {
  // ===== IntakeAgent 填充字段 =====
  title: string;           // 节点标题（中文）
  subtitle: string;        // 节点描述（中文）
  category: NodeCategory;  // 节点类别
  session_ID: string;      // 会话ID（格式：session_xxx）

  // ===== ConfigAgent 填充字段 =====
  extra: 'configuring' | 'configured';  // 配置状态
  topology?: string;       // 硬件接口（如 "UART1", "I2C0"）
  device_ID?: string;      // 设备ID（如 "MIC_001"）

  // ===== 节点特定参数 (sub) =====
  sub?: NodeSubParams;
}

export interface NodeSubParams {
  // TTS 节点
  TTS_input?: string;      // TTS 输入文本/表达式

  // 表情/动作节点
  execute_emoji?: string;  // 执行的表情/动作

  // 检测节点
  detect_target?: string;  // 检测目标

  // 条件节点
  condition_type?: string; // 条件类型

  // 其他扩展参数
  [key: string]: string | number | boolean | undefined;
}
```

---

## 3. IntakeAgent 工作流生成规范

### 3.1 节点命名规范

```typescript
// src/agents/prompts/workflow-naming.ts

export const NODE_NAMING_RULES = {
  // 格式：{n8nType}_{category}_{action}_{detail}
  pattern: /^[a-z]+_[A-Z-]+_[a-z]+_[a-z0-9]+$/,

  examples: [
    'set_TTS_speak_welcome',      // Set节点 - TTS - 说话 - 欢迎语
    'http_CAM_capture_face',      // HTTP节点 - 摄像头 - 捕获 - 人脸
    'if_YOLO_detect_hand',        // IF节点 - YOLO - 检测 - 手势
    'code_LLM_process_response',  // Code节点 - LLM - 处理 - 响应
    'switch_ASSIGN_route_result', // Switch节点 - 赋值 - 路由 - 结果
  ]
};

// 节点名生成函数
export function generateNodeName(
  n8nType: string,
  category: NodeCategory,
  action: string,
  detail: string
): string {
  return `${n8nType.toLowerCase()}_${category}_${action}_${detail}`;
}
```

### 3.2 Notes 字段填充模板

```typescript
// src/agents/prompts/notes-template.ts

export function generateNodeNotes(params: {
  title: string;
  subtitle: string;
  category: NodeCategory;
  sessionId: string;
  sub?: NodeSubParams;
}): NodeNotes {
  const isHardware = HARDWARE_CATEGORIES.includes(params.category);

  return {
    title: params.title,
    subtitle: params.subtitle,
    category: params.category,
    session_ID: params.sessionId,
    extra: isHardware ? 'configuring' : 'configured',
    ...(params.sub && { sub: params.sub })
  };
}
```

### 3.3 Few-Shot 示例更新

```typescript
// src/agents/prompts/few-shot-examples.ts

export const GAME_WORKFLOW_EXAMPLE = {
  name: "猜拳游戏工作流",
  description: "完整的人机猜拳交互流程",

  // 关键节点示例
  nodes: [
    {
      name: "set_TTS_speak_welcome",
      type: "n8n-nodes-base.set",
      parameters: {
        mode: "raw",
        jsonOutput: `{
          "TTS_input": "欢迎来到猜拳游戏！请出拳：石头、剪刀或布"
        }`
      },
      notes: {
        title: "欢迎语音",
        subtitle: "播放游戏开始欢迎语",
        category: "TTS",
        session_ID: "session_game_001",
        extra: "configuring",
        sub: {
          TTS_input: "欢迎来到猜拳游戏！请出拳：石头、剪刀或布"
        }
      }
    },
    {
      name: "http_YOLO-RPS_detect_gesture",
      type: "n8n-nodes-base.httpRequest",
      parameters: {
        method: "POST",
        url: "={{ $json.YOLO_RPS_URL }}",
        sendBody: true,
        bodyParameters: {
          parameters: [
            { name: "image", value: "={{ $json.camera_frame }}" }
          ]
        }
      },
      notes: {
        title: "手势识别",
        subtitle: "YOLO检测用户出拳手势",
        category: "YOLO-RPS",
        session_ID: "session_game_001",
        extra: "configuring",
        sub: {
          detect_target: "rock_paper_scissors"
        }
      }
    },
    {
      name: "switch_ASSIGN_route_result",
      type: "n8n-nodes-base.switch",
      parameters: {
        mode: "rules",
        rules: {
          rules: [
            {
              outputKey: "win",
              conditions: {
                combinator: "and",
                conditions: [
                  { leftValue: "={{ $json.game_result }}", operator: "equals", rightValue: "win" }
                ]
              }
            },
            {
              outputKey: "lose",
              conditions: {
                combinator: "and",
                conditions: [
                  { leftValue: "={{ $json.game_result }}", operator: "equals", rightValue: "lose" }
                ]
              }
            },
            {
              outputKey: "draw",
              conditions: {
                combinator: "and",
                conditions: [
                  { leftValue: "={{ $json.game_result }}", operator: "equals", rightValue: "draw" }
                ]
              }
            }
          ]
        }
      },
      notes: {
        title: "结果路由",
        subtitle: "根据游戏结果分流",
        category: "ASSIGN",
        session_ID: "session_game_001",
        extra: "configured",
        sub: {
          condition_type: "game_result_routing"
        }
      }
    }
  ]
};
```

---

## 4. ConfigAgent 配置闭环实现

### 4.1 ConfigAgent 状态定义

```typescript
// src/agents/config-agent.ts

export interface ConfigAgentState {
  workflowId: string;
  workflowJson: N8nWorkflow;
  sessionId: string;

  // 待配置节点队列
  pendingNodes: ConfigurableNode[];
  // 当前配置节点
  currentNode: ConfigurableNode | null;
  // 已配置节点
  configuredNodes: ConfigurableNode[];

  // 配置进度
  progress: {
    total: number;
    completed: number;
    percentage: number;
  };
}

export interface ConfigurableNode {
  name: string;
  category: NodeCategory;
  title: string;
  subtitle: string;

  // 需要用户确认的字段
  requiredFields: {
    topology?: boolean;
    device_ID?: boolean;
  };

  // 当前配置值
  configValues: {
    topology?: string;
    device_ID?: string;
  };

  // 配置状态
  status: 'pending' | 'configuring' | 'configured';
}
```

### 4.2 ConfigAgent 核心实现

```typescript
// src/agents/config-agent.ts

import { WorkflowDiffEngine, DiffOperation } from '../services/workflow-diff-engine';
import { N8nApiClient } from '../services/n8n-api-client';

export class ConfigAgent {
  private state: ConfigAgentState | null = null;
  private diffEngine: WorkflowDiffEngine;
  private apiClient: N8nApiClient;

  constructor(apiClient: N8nApiClient) {
    this.apiClient = apiClient;
    this.diffEngine = new WorkflowDiffEngine();
  }

  // ===== 初始化配置状态 =====
  async initializeFromWorkflow(
    workflowId: string,
    workflowJson: N8nWorkflow,
    sessionId: string
  ): Promise<ConfigAgentState> {
    const pendingNodes = this.extractConfigurableNodes(workflowJson);

    this.state = {
      workflowId,
      workflowJson,
      sessionId,
      pendingNodes,
      currentNode: pendingNodes[0] || null,
      configuredNodes: [],
      progress: {
        total: pendingNodes.length,
        completed: 0,
        percentage: 0
      }
    };

    return this.state;
  }

  // ===== 提取可配置节点 =====
  private extractConfigurableNodes(workflow: N8nWorkflow): ConfigurableNode[] {
    return workflow.nodes
      .filter(node => {
        const notes = this.parseNotes(node.notes);
        return notes?.category &&
               HARDWARE_CATEGORIES.includes(notes.category as NodeCategory) &&
               notes.extra === 'configuring';
      })
      .map(node => {
        const notes = this.parseNotes(node.notes);
        return {
          name: node.name,
          category: notes.category as NodeCategory,
          title: notes.title || node.name,
          subtitle: notes.subtitle || '',
          requiredFields: {
            topology: true,
            device_ID: true
          },
          configValues: {},
          status: 'pending' as const
        };
      });
  }

  // ===== 获取当前待配置节点 =====
  getCurrentNode(): ConfigurableNode | null {
    return this.state?.currentNode || null;
  }

  // ===== 确认节点配置 =====
  async confirmNodeConfig(
    nodeName: string,
    config: { topology?: string; device_ID?: string }
  ): Promise<{
    success: boolean;
    nextNode: ConfigurableNode | null;
    isComplete: boolean;
  }> {
    if (!this.state) {
      throw new Error('ConfigAgent not initialized');
    }

    // 1. 构建更新操作
    const operations: DiffOperation[] = [{
      type: 'updateNode',
      nodeName,
      updates: {
        'notes.extra': 'configured',
        ...(config.topology && { 'notes.topology': config.topology }),
        ...(config.device_ID && { 'notes.device_ID': config.device_ID })
      }
    }];

    // 2. 调用 n8n API 更新工作流
    const result = await this.apiClient.updatePartialWorkflow(
      this.state.workflowId,
      operations
    );

    if (!result.success) {
      return { success: false, nextNode: this.state.currentNode, isComplete: false };
    }

    // 3. 更新本地状态
    const configuredNode = this.state.pendingNodes.shift()!;
    configuredNode.status = 'configured';
    configuredNode.configValues = config;
    this.state.configuredNodes.push(configuredNode);

    // 4. 更新进度
    this.state.progress.completed++;
    this.state.progress.percentage = Math.round(
      (this.state.progress.completed / this.state.progress.total) * 100
    );

    // 5. 移动到下一个节点
    this.state.currentNode = this.state.pendingNodes[0] || null;

    return {
      success: true,
      nextNode: this.state.currentNode,
      isComplete: this.state.pendingNodes.length === 0
    };
  }

  // ===== 获取配置进度 =====
  getProgress(): ConfigAgentState['progress'] | null {
    return this.state?.progress || null;
  }

  // ===== 解析 notes 字段 =====
  private parseNotes(notes: string | undefined): NodeNotes | null {
    if (!notes) return null;
    try {
      return JSON.parse(notes);
    } catch {
      return null;
    }
  }
}
```

### 4.3 Session Service 扩展

```typescript
// src/agents/session-service.ts (扩展)

import { ConfigAgent, ConfigAgentState } from './config-agent';

export interface AgentSession {
  // ... 现有字段 ...

  // ConfigAgent 状态
  configAgent?: ConfigAgent;
  configState?: ConfigAgentState;
}

export class SessionService {
  // ===== 初始化 ConfigAgent =====
  async initializeConfigAgent(
    sessionId: string,
    workflowId: string,
    workflowJson: N8nWorkflow
  ): Promise<ConfigAgentState> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const configAgent = new ConfigAgent(this.apiClient);
    const configState = await configAgent.initializeFromWorkflow(
      workflowId,
      workflowJson,
      sessionId
    );

    session.configAgent = configAgent;
    session.configState = configState;

    return configState;
  }

  // ===== 确认节点配置 =====
  async confirmNodeConfiguration(
    sessionId: string,
    nodeName: string,
    config: { topology?: string; device_ID?: string }
  ): Promise<AgentResponse> {
    const session = this.getSession(sessionId);
    if (!session?.configAgent) {
      throw new Error('ConfigAgent not initialized');
    }

    const result = await session.configAgent.confirmNodeConfig(nodeName, config);

    if (result.isComplete) {
      return {
        type: 'config_complete',
        message: '所有硬件节点配置完成！工作流已就绪。',
        data: {
          totalConfigured: session.configState!.progress.total,
          workflowId: session.configState!.workflowId
        }
      };
    }

    if (result.nextNode) {
      return {
        type: 'hot_plugging', // 或 'config_input'
        message: `请配置节点: ${result.nextNode.title}`,
        data: {
          node: result.nextNode,
          progress: session.configAgent.getProgress()
        }
      };
    }

    return {
      type: 'error',
      message: '配置失败，请重试'
    };
  }
}
```

---

## 5. API 层实现

### 5.1 HTTP 端点

```typescript
// src/agent-server/server.ts (扩展)

// POST /api/agent/start-config
// 启动 ConfigAgent 配置流程
app.post('/api/agent/start-config', async (req, res) => {
  const { sessionId, workflowId, workflowJson } = req.body;

  try {
    const configState = await sessionService.initializeConfigAgent(
      sessionId,
      workflowId,
      workflowJson
    );

    const firstNode = configState.currentNode;

    res.json({
      success: true,
      type: 'hot_plugging', // 或 'config_input'
      message: `开始硬件配置，共 ${configState.progress.total} 个节点待配置`,
      data: {
        currentNode: firstNode,
        progress: configState.progress
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      type: 'error',
      message: error.message
    });
  }
});

// POST /api/agent/confirm-node
// 确认单个节点配置
app.post('/api/agent/confirm-node', async (req, res) => {
  const { sessionId, nodeName, topology, device_ID } = req.body;

  try {
    const response = await sessionService.confirmNodeConfiguration(
      sessionId,
      nodeName,
      { topology, device_ID }
    );

    res.json({
      success: true,
      ...response
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      type: 'error',
      message: error.message
    });
  }
});
```

### 5.2 WebSocket 消息处理

```typescript
// src/agent-server/websocket.ts (扩展)

// 处理 ConfigAgent 消息
case 'start_config': {
  const { workflowId, workflowJson } = message.data;
  const configState = await sessionService.initializeConfigAgent(
    sessionId,
    workflowId,
    workflowJson
  );

  ws.send(JSON.stringify({
    type: 'hot_plugging', // 或 'config_input'
    data: {
      currentNode: configState.currentNode,
      progress: configState.progress
    }
  }));
  break;
}

case 'confirm_node': {
  const { nodeName, topology, device_ID } = message.data;
  const response = await sessionService.confirmNodeConfiguration(
    sessionId,
    nodeName,
    { topology, device_ID }
  );

  ws.send(JSON.stringify(response));
  break;
}
```

---

## 6. 前端交互流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        IntakeAgent 阶段                          │
├─────────────────────────────────────────────────────────────────┤
│  用户: "创建一个猜拳游戏"                                         │
│    ↓                                                            │
│  IntakeAgent: 生成工作流 JSON (notes.extra = 'configuring')      │
│    ↓                                                            │
│  /api/agent/confirm → 返回 workflowJson                         │
│    ↓                                                            │
│  /api/workflow/create → 返回 workflowId                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       ConfigAgent 阶段                           │
├─────────────────────────────────────────────────────────────────┤
│  /api/agent/start-config                                        │
│    ↓                                                            │
│  返回: { type: 'hot_plugging' 或 'config_input', currentNode: {...} }               │
│    ↓                                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  前端渲染配置卡片:                                        │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │  节点: set_TTS_speak_welcome                     │    │    │
│  │  │  类别: TTS (语音合成)                             │    │    │
│  │  │  标题: 欢迎语音                                   │    │    │
│  │  │  描述: 播放游戏开始欢迎语                          │    │    │
│  │  │                                                  │    │    │
│  │  │  [Topology]: _______ (下拉选择)                  │    │    │
│  │  │  [Device_ID]: _______ (下拉选择)                 │    │    │
│  │  │                                                  │    │    │
│  │  │  [已拼装完毕] ← 用户点击                          │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│    ↓                                                            │
│  /api/agent/confirm-node { nodeName, topology, device_ID }      │
│    ↓                                                            │
│  n8n API: updatePartialWorkflow (notes.extra = 'configured')    │
│    ↓                                                            │
│  返回下一个节点 或 config_complete                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. n8n 节点更新请求示例

```typescript
// 更新单个节点的 notes 字段
const updateRequest = {
  workflowId: "workflow_123",
  operations: [
    {
      type: "updateNode",
      nodeName: "set_TTS_speak_welcome",
      updates: {
        "notes.extra": "configured",
        "notes.topology": "UART1",
        "notes.device_ID": "TTS_001"
      }
    }
  ]
};

// 调用 n8n_update_partial_workflow
const result = await n8nApiClient.updatePartialWorkflow(
  updateRequest.workflowId,
  updateRequest.operations
);

// 响应
{
  "success": true,
  "workflowId": "workflow_123",
  "appliedOperations": 1,
  "updatedNodes": ["set_TTS_speak_welcome"]
}
```

---

## 8. 测试用例

```typescript
// tests/unit/agents/config-agent.test.ts

describe('ConfigAgent', () => {
  describe('extractConfigurableNodes', () => {
    it('should extract only hardware nodes with configuring status', async () => {
      const workflow = createMockWorkflow([
        { name: 'set_TTS_speak', category: 'TTS', extra: 'configuring' },
        { name: 'code_LLM_process', category: 'LLM', extra: 'configured' },
        { name: 'http_CAM_capture', category: 'CAM', extra: 'configuring' }
      ]);

      const agent = new ConfigAgent(mockApiClient);
      const state = await agent.initializeFromWorkflow('wf_1', workflow, 'sess_1');

      expect(state.pendingNodes).toHaveLength(2);
      expect(state.pendingNodes[0].category).toBe('TTS');
      expect(state.pendingNodes[1].category).toBe('CAM');
    });
  });

  describe('confirmNodeConfig', () => {
    it('should update node and move to next', async () => {
      const agent = new ConfigAgent(mockApiClient);
      await agent.initializeFromWorkflow('wf_1', mockWorkflow, 'sess_1');

      const result = await agent.confirmNodeConfig('set_TTS_speak', {
        topology: 'UART1',
        device_ID: 'TTS_001'
      });

      expect(result.success).toBe(true);
      expect(result.nextNode?.name).toBe('http_CAM_capture');
      expect(mockApiClient.updatePartialWorkflow).toHaveBeenCalledWith(
        'wf_1',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'updateNode',
            nodeName: 'set_TTS_speak',
            updates: {
              'notes.extra': 'configured',
              'notes.topology': 'UART1',
              'notes.device_ID': 'TTS_001'
            }
          })
        ])
      );
    });

    it('should return isComplete when all nodes configured', async () => {
      const agent = new ConfigAgent(mockApiClient);
      await agent.initializeFromWorkflow('wf_1', singleNodeWorkflow, 'sess_1');

      const result = await agent.confirmNodeConfig('set_TTS_speak', {
        topology: 'UART1'
      });

      expect(result.isComplete).toBe(true);
      expect(result.nextNode).toBeNull();
    });
  });

  describe('progress tracking', () => {
    it('should update progress after each confirmation', async () => {
      const agent = new ConfigAgent(mockApiClient);
      await agent.initializeFromWorkflow('wf_1', threeNodeWorkflow, 'sess_1');

      expect(agent.getProgress()).toEqual({ total: 3, completed: 0, percentage: 0 });

      await agent.confirmNodeConfig('node_1', { topology: 'UART1' });
      expect(agent.getProgress()).toEqual({ total: 3, completed: 1, percentage: 33 });

      await agent.confirmNodeConfig('node_2', { topology: 'I2C0' });
      expect(agent.getProgress()).toEqual({ total: 3, completed: 2, percentage: 67 });

      await agent.confirmNodeConfig('node_3', { topology: 'SPI0' });
      expect(agent.getProgress()).toEqual({ total: 3, completed: 3, percentage: 100 });
    });
  });
});
```

---

## 9. 文件清单

| 文件路径 | 操作 | 说明 |
|---------|------|------|
| `src/agents/types.ts` | 修改 | 添加 NodeCategory、NodeNotes、NodeSubParams 类型 |
| `src/agents/config-agent.ts` | 新建 | ConfigAgent 核心实现 |
| `src/agents/prompts/workflow-naming.ts` | 新建 | 节点命名规范 |
| `src/agents/prompts/notes-template.ts` | 新建 | Notes 字段模板 |
| `src/agents/prompts/few-shot-examples.ts` | 修改 | 添加游戏工作流示例 |
| `src/agents/session-service.ts` | 修改 | 添加 ConfigAgent 集成 |
| `src/agent-server/server.ts` | 修改 | 添加 /api/agent/start-config、/api/agent/confirm-node |
| `src/agent-server/websocket.ts` | 修改 | 添加 start_config、confirm_node 消息处理 |
| `tests/unit/agents/config-agent.test.ts` | 新建 | ConfigAgent 单元测试 |

---

## 10. 质量检查清单

### IntakeAgent 输出检查

- [ ] 所有节点名称符合 `{n8nType}_{category}_{action}_{detail}` 格式
- [ ] 所有节点包含完整 notes 字段
- [ ] notes.title 和 notes.subtitle 使用中文
- [ ] notes.category 使用正确的 NodeCategory 枚举值
- [ ] notes.session_ID 格式为 `session_xxx`
- [ ] 硬件节点 notes.extra = 'configuring'
- [ ] 软件节点 notes.extra = 'configured'
- [ ] notes.sub 包含节点特定参数

### ConfigAgent 闭环检查

- [ ] 正确提取所有 HARDWARE_CATEGORIES 节点
- [ ] 按工作流节点顺序逐个配置
- [ ] 每次确认后正确更新 n8n 工作流
- [ ] 进度百分比计算正确
- [ ] 所有节点配置完成后返回 config_complete
- [ ] 错误情况正确处理并返回 error 类型
