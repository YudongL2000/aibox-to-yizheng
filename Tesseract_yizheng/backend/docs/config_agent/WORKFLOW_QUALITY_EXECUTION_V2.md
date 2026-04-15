# ConfigAgent 工作流质量标准与闭环执行文档 V2

> 严格基于 game_nodes.md 定义，分阶段执行开发

---

## 1. 节点分类定义

### 1.1 NodeCategory 枚举

```typescript
// src/agents/types.ts

// 节点功能分类
export type NodeFunctionType = 'trigger' | 'sensor' | 'processor' | 'executor' | 'logic';

// 节点类别（严格基于 game_nodes.md）
export type NodeCategory =
  | 'BASE'      // 触发器 & 逻辑器（n8n 官方定义）
  | 'CAM'       // 感知器 - 摄像头
  | 'YOLO-RPS'  // 处理器 - YOLO猜拳检测
  | 'TTS'       // 处理器 - 语音合成
  | 'RAM'       // 处理器 - 内存/随机
  | 'ASSIGN'    // 处理器 - 赋值
  | 'HAND'      // 执行器 - 机械手
  | 'SPEAKER'   // 执行器 - 扬声器
  | 'SCREEN';   // 执行器 - 屏幕

// 节点分类映射
export const NODE_FUNCTION_MAP: Record<NodeCategory, NodeFunctionType> = {
  'BASE': 'trigger',      // 也用于 logic
  'CAM': 'sensor',
  'YOLO-RPS': 'processor',
  'TTS': 'processor',
  'RAM': 'processor',
  'ASSIGN': 'processor',
  'HAND': 'executor',
  'SPEAKER': 'executor',
  'SCREEN': 'executor'
};

// 需要 ConfigAgent 配置的节点类别（非逻辑器）
export const CONFIGURABLE_CATEGORIES: NodeCategory[] = [
  'CAM', 'YOLO-RPS', 'TTS', 'RAM', 'ASSIGN', 'HAND', 'SPEAKER', 'SCREEN'
];

// 逻辑器节点类型（n8n 官方，不需要 extra 字段流转）
export const LOGIC_NODE_TYPES = [
  'n8n-nodes-base.if',
  'n8n-nodes-base.switch',
  'n8n-nodes-base.merge',
  'n8n-nodes-base.noOp'
];
```

---

## 2. Notes 字段结构（严格基于 game_nodes.md）

### 2.1 NodeNotes 接口

```typescript
// src/agents/types.ts

export interface NodeNotes {
  // ===== 通用字段 =====
  title: string;              // 节点标题（中文）
  subtitle: string;           // 节点描述（中文）
  category: NodeCategory;     // 节点类别
  session_ID: string;         // 会话ID（来自 agent-api 的 sessionId）

  // ===== 配置状态字段 =====
  // pending: 默认值，等待配置
  // configuring: 正在配置
  // configured: 配置完成
  // 注意：逻辑器节点不需要此字段流转
  extra: 'pending' | 'configuring' | 'configured';

  // ===== 硬件配置字段（ConfigAgent 填充）=====
  topology?: string;          // 硬件接口
  device_ID?: string;         // 设备ID

  // ===== 节点特定参数 =====
  sub?: NodeSubParams;
}
```

### 2.2 NodeSubParams 接口（严格基于 game_nodes.md 的 // ConfigAgent 注释）

```typescript
// src/agents/types.ts

export interface NodeSubParams {
  // ===== 触发器 (BASE - scheduleTrigger) =====
  seconds?: number;           // IntakeAgent: 触发间隔秒数

  // ===== 感知器 (CAM) =====
  output?: string;            // IntakeAgent: 输出字段名

  // ===== 处理器 (YOLO-RPS) =====
  yolov_input?: string;       // IntakeAgent: YOLO输入
  yolov_output?: string;      // IntakeAgent: YOLO输出

  // ===== 处理器 (TTS) =====
  TTS_input?: string;         // ConfigAgent: TTS输入文本
  audio_name?: string;        // IntakeAgent: 音频文件名

  // ===== 处理器 (RAM) =====
  random_rule?: string;       // IntakeAgent: 随机规则

  // ===== 处理器 (ASSIGN) =====
  robotGesture?: string;      // IntakeAgent: 机器人手势赋值

  // ===== 执行器 (HAND) =====
  execute_gesture?: string;   // IntakeAgent: 执行手势

  // ===== 执行器 (SPEAKER) =====
  // audio_name 已在 TTS 中定义

  // ===== 执行器 (SCREEN) =====
  execute_emoji?: string;     // ConfigAgent: 执行表情
}

// ConfigAgent 需要配置的字段列表
export const CONFIG_AGENT_FIELDS: (keyof NodeSubParams)[] = [
  'TTS_input',      // TTS 处理器
  'execute_emoji'   // SCREEN 执行器
];
```

---

## 3. Extra 字段状态流转规则

```typescript
// src/agents/config-agent.ts

/**
 * Extra 字段状态流转规则：
 *
 * 1. IntakeAgent 生成工作流时：
 *    - 所有节点 extra 默认值为 'pending'
 *
 * 2. ConfigAgent 开始配置某节点时：
 *    - 将该节点 extra 设为 'configuring'
 *
 * 3. ConfigAgent 完成配置某节点时：
 *    - 将该节点 extra 设为 'configured'
 *
 * 4. 例外：逻辑器节点（LOGIC_NODE_TYPES）
 *    - 不需要 extra 字段流转
 *    - IntakeAgent 直接设为 'configured'
 */

export function getInitialExtraValue(nodeType: string): 'pending' | 'configured' {
  return LOGIC_NODE_TYPES.includes(nodeType) ? 'configured' : 'pending';
}

export function isConfigurableNode(nodeType: string, category: NodeCategory): boolean {
  // 逻辑器不需要配置
  if (LOGIC_NODE_TYPES.includes(nodeType)) {
    return false;
  }
  // BASE 类别中的触发器需要配置（如 scheduleTrigger 的 seconds）
  // 其他所有类别都需要配置
  return true;
}
```

---

## 4. 分阶段执行计划

### Phase 1: 类型定义与基础结构
**目标**: 建立类型系统基础
**文件**: `src/agents/types.ts`
**测试**: `tests/unit/agents/types.test.ts`
**Commit**: `feat(types): add NodeCategory, NodeNotes, NodeSubParams for ConfigAgent`

### Phase 2: ConfigAgent 核心实现
**目标**: 实现 ConfigAgent 类
**文件**: `src/agents/config-agent.ts`
**测试**: `tests/unit/agents/config-agent.test.ts`
**Commit**: `feat(agent): implement ConfigAgent with extra field state machine`

### Phase 3: Session Service 集成
**目标**: 将 ConfigAgent 集成到会话管理
**文件**: `src/agents/session-service.ts`
**测试**: `tests/unit/agents/session-service.test.ts`
**Commit**: `feat(session): integrate ConfigAgent into SessionService`

### Phase 4: API 层实现
**目标**: 添加 HTTP/WebSocket 端点
**文件**: `src/agent-server/server.ts`, `src/agent-server/websocket.ts`
**测试**: `tests/integration/agent/config-agent-api.test.ts`
**Commit**: `feat(api): add /api/agent/start-config and /api/agent/confirm-node endpoints`

### Phase 5: IntakeAgent 工作流生成规范
**目标**: 更新 IntakeAgent 生成符合规范的工作流
**文件**: `src/agents/intake-agent.ts`, `src/agents/prompts/few-shot-examples.ts`
**测试**: `tests/unit/agents/intake-agent.test.ts`
**Commit**: `feat(intake): update workflow generation with game_nodes.md spec`

### Phase 6: 端到端集成测试
**目标**: 验证完整闭环流程
**文件**: `tests/e2e/config-agent-flow.test.ts`
**Commit**: `test(e2e): add ConfigAgent full flow integration tests`

---

## 5. Phase 1: 类型定义与基础结构

### 5.1 修改 src/agents/types.ts

```typescript
// ============================================================
// NodeCategory & NodeNotes 类型定义
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
// ============================================================

// 节点功能分类
export type NodeFunctionType = 'trigger' | 'sensor' | 'processor' | 'executor' | 'logic';

// 节点类别（严格基于 game_nodes.md）
export type NodeCategory =
  | 'BASE'      // 触发器 & 逻辑器
  | 'CAM'       // 感知器 - 摄像头
  | 'YOLO-RPS'  // 处理器 - YOLO猜拳检测
  | 'TTS'       // 处理器 - 语音合成
  | 'RAM'       // 处理器 - 内存/随机
  | 'ASSIGN'    // 处理器 - 赋值
  | 'HAND'      // 执行器 - 机械手
  | 'SPEAKER'   // 执行器 - 扬声器
  | 'SCREEN';   // 执行器 - 屏幕

// Extra 字段状态
export type NodeExtraStatus = 'pending' | 'configuring' | 'configured';

// 节点特定参数（严格基于 game_nodes.md）
export interface NodeSubParams {
  // 触发器 (BASE - scheduleTrigger)
  seconds?: number;           // IntakeAgent

  // 感知器 (CAM)
  output?: string;            // IntakeAgent

  // 处理器 (YOLO-RPS)
  yolov_input?: string;       // IntakeAgent
  yolov_output?: string;      // IntakeAgent

  // 处理器 (TTS)
  TTS_input?: string;         // ConfigAgent
  audio_name?: string;        // IntakeAgent

  // 处理器 (RAM)
  random_rule?: string;       // IntakeAgent

  // 处理器 (ASSIGN)
  robotGesture?: string;      // IntakeAgent

  // 执行器 (HAND)
  execute_gesture?: string;   // IntakeAgent

  // 执行器 (SCREEN)
  execute_emoji?: string;     // ConfigAgent
}

// Notes 字段结构
export interface NodeNotes {
  title: string;
  subtitle: string;
  category: NodeCategory;
  session_ID: string;
  extra: NodeExtraStatus;
  topology?: string;
  device_ID?: string;
  sub?: NodeSubParams;
}

// 逻辑器节点类型（不需要 extra 流转）
export const LOGIC_NODE_TYPES = [
  'n8n-nodes-base.if',
  'n8n-nodes-base.switch',
  'n8n-nodes-base.merge',
  'n8n-nodes-base.noOp'
];

// ConfigAgent 需要配置的 sub 字段
export const CONFIG_AGENT_FIELDS: (keyof NodeSubParams)[] = [
  'TTS_input',
  'execute_emoji'
];

// 需要硬件配置的节点类别
export const HARDWARE_CATEGORIES: NodeCategory[] = [
  'CAM', 'HAND', 'SPEAKER', 'SCREEN'
];
```

### 5.2 测试文件 tests/unit/agents/types.test.ts

```typescript
import {
  NodeCategory,
  NodeExtraStatus,
  NodeSubParams,
  NodeNotes,
  LOGIC_NODE_TYPES,
  CONFIG_AGENT_FIELDS,
  HARDWARE_CATEGORIES
} from '../../../src/agents/types';

describe('NodeCategory Types', () => {
  it('should have correct categories defined', () => {
    const categories: NodeCategory[] = [
      'BASE', 'CAM', 'YOLO-RPS', 'TTS', 'RAM', 'ASSIGN', 'HAND', 'SPEAKER', 'SCREEN'
    ];
    expect(categories).toHaveLength(9);
  });

  it('should have correct extra status values', () => {
    const statuses: NodeExtraStatus[] = ['pending', 'configuring', 'configured'];
    expect(statuses).toHaveLength(3);
  });
});

describe('LOGIC_NODE_TYPES', () => {
  it('should contain n8n logic nodes', () => {
    expect(LOGIC_NODE_TYPES).toContain('n8n-nodes-base.if');
    expect(LOGIC_NODE_TYPES).toContain('n8n-nodes-base.switch');
    expect(LOGIC_NODE_TYPES).toContain('n8n-nodes-base.merge');
    expect(LOGIC_NODE_TYPES).toContain('n8n-nodes-base.noOp');
  });
});

describe('CONFIG_AGENT_FIELDS', () => {
  it('should contain TTS_input and execute_emoji', () => {
    expect(CONFIG_AGENT_FIELDS).toContain('TTS_input');
    expect(CONFIG_AGENT_FIELDS).toContain('execute_emoji');
    expect(CONFIG_AGENT_FIELDS).toHaveLength(2);
  });
});

describe('HARDWARE_CATEGORIES', () => {
  it('should contain hardware node categories', () => {
    expect(HARDWARE_CATEGORIES).toContain('CAM');
    expect(HARDWARE_CATEGORIES).toContain('HAND');
    expect(HARDWARE_CATEGORIES).toContain('SPEAKER');
    expect(HARDWARE_CATEGORIES).toContain('SCREEN');
  });
});

describe('NodeNotes interface', () => {
  it('should accept valid notes object', () => {
    const notes: NodeNotes = {
      title: '欢迎语音',
      subtitle: '播放游戏开始欢迎语',
      category: 'TTS',
      session_ID: 'sess_123',
      extra: 'pending',
      sub: {
        TTS_input: '欢迎来到猜拳游戏'
      }
    };
    expect(notes.extra).toBe('pending');
    expect(notes.sub?.TTS_input).toBe('欢迎来到猜拳游戏');
  });
});
```

### 5.3 Phase 1 执行命令

```bash
# 1. 修改类型文件
# 2. 创建测试文件
# 3. 运行测试
npm run build
npm test -- tests/unit/agents/types.test.ts

# 4. 测试通过后提交
git add src/agents/types.ts tests/unit/agents/types.test.ts
git commit -m "feat(types): add NodeCategory, NodeNotes, NodeSubParams for ConfigAgent

- Add NodeCategory enum with 9 categories (BASE, CAM, YOLO-RPS, TTS, RAM, ASSIGN, HAND, SPEAKER, SCREEN)
- Add NodeExtraStatus type for extra field state machine (pending -> configuring -> configured)
- Add NodeSubParams interface with fields from game_nodes.md
- Add NodeNotes interface for workflow node metadata
- Add LOGIC_NODE_TYPES, CONFIG_AGENT_FIELDS, HARDWARE_CATEGORIES constants
- Add unit tests for type definitions

Conceived by Romuald Członkowski - www.aiadvisors.pl/en"
```

---

## 6. Phase 2: ConfigAgent 核心实现

### 6.1 创建 src/agents/config-agent.ts

```typescript
/**
 * [INPUT]: 依赖 types.ts 的 NodeNotes, NodeCategory, NodeExtraStatus
 *          依赖 services/workflow-diff-engine 的 DiffOperation
 *          依赖 services/n8n-api-client 的 N8nApiClient
 * [OUTPUT]: 对外提供 ConfigAgent 类, ConfigAgentState 接口, ConfigurableNode 接口
 * [POS]: agents 模块的配置代理，负责硬件节点配置闭环
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import {
  NodeNotes,
  NodeCategory,
  NodeExtraStatus,
  NodeSubParams,
  LOGIC_NODE_TYPES,
  CONFIG_AGENT_FIELDS,
  HARDWARE_CATEGORIES
} from './types';
import { WorkflowDiffEngine, DiffOperation } from '../services/workflow-diff-engine';
import { N8nApiClient } from '../services/n8n-api-client';
import { logger } from '../utils/logger';

// ============================================================
// ConfigAgent 状态与节点定义
// ============================================================

export interface ConfigurableNode {
  name: string;
  type: string;
  category: NodeCategory;
  title: string;
  subtitle: string;
  extra: NodeExtraStatus;

  // 需要 ConfigAgent 配置的字段
  configFields: {
    // 硬件配置
    needsTopology: boolean;
    needsDeviceId: boolean;
    // sub 字段配置
    needsTtsInput: boolean;
    needsExecuteEmoji: boolean;
  };

  // 当前配置值
  configValues: {
    topology?: string;
    device_ID?: string;
    TTS_input?: string;
    execute_emoji?: string;
  };
}

export interface ConfigAgentState {
  workflowId: string;
  workflowJson: any;
  sessionId: string;

  // 节点队列
  allNodes: ConfigurableNode[];
  pendingNodes: ConfigurableNode[];
  currentNode: ConfigurableNode | null;
  configuredNodes: ConfigurableNode[];

  // 进度
  progress: {
    total: number;
    completed: number;
    percentage: number;
  };
}

// ============================================================
// ConfigAgent 核心类
// ============================================================

export class ConfigAgent {
  private state: ConfigAgentState | null = null;
  private apiClient: N8nApiClient;

  constructor(apiClient: N8nApiClient) {
    this.apiClient = apiClient;
  }

  // ===== 初始化配置状态 =====
  async initializeFromWorkflow(
    workflowId: string,
    workflowJson: any,
    sessionId: string
  ): Promise<ConfigAgentState> {
    const allNodes = this.extractConfigurableNodes(workflowJson, sessionId);
    const pendingNodes = allNodes.filter(n => n.extra === 'pending');

    this.state = {
      workflowId,
      workflowJson,
      sessionId,
      allNodes,
      pendingNodes: [...pendingNodes],
      currentNode: pendingNodes[0] || null,
      configuredNodes: [],
      progress: {
        total: pendingNodes.length,
        completed: 0,
        percentage: 0
      }
    };

    logger.info('ConfigAgent initialized', {
      workflowId,
      sessionId,
      totalNodes: allNodes.length,
      pendingNodes: pendingNodes.length
    });

    return this.state;
  }

  // ===== 提取可配置节点 =====
  private extractConfigurableNodes(workflow: any, sessionId: string): ConfigurableNode[] {
    if (!workflow?.nodes) return [];

    return workflow.nodes
      .filter((node: any) => {
        // 逻辑器节点不需要配置
        if (LOGIC_NODE_TYPES.includes(node.type)) {
          return false;
        }
        return true;
      })
      .map((node: any) => {
        const notes = this.parseNotes(node.notes);
        const category = notes?.category || 'BASE';
        const isHardware = HARDWARE_CATEGORIES.includes(category as NodeCategory);

        return {
          name: node.name,
          type: node.type,
          category: category as NodeCategory,
          title: notes?.title || node.name,
          subtitle: notes?.subtitle || '',
          extra: notes?.extra || 'pending',
          configFields: {
            needsTopology: isHardware,
            needsDeviceId: isHardware,
            needsTtsInput: category === 'TTS',
            needsExecuteEmoji: category === 'SCREEN'
          },
          configValues: {}
        } as ConfigurableNode;
      });
  }

  // ===== 开始配置当前节点 =====
  async startConfigureCurrentNode(): Promise<ConfigurableNode | null> {
    if (!this.state?.currentNode) return null;

    const node = this.state.currentNode;

    // 更新节点状态为 configuring
    const operations: DiffOperation[] = [{
      type: 'updateNode',
      nodeName: node.name,
      updates: {
        'notes.extra': 'configuring'
      }
    }];

    try {
      await this.apiClient.updatePartialWorkflow(this.state.workflowId, operations);
      node.extra = 'configuring';

      logger.info('ConfigAgent: node configuring started', {
        nodeName: node.name,
        category: node.category
      });

      return node;
    } catch (error) {
      logger.error('ConfigAgent: failed to start configuring node', { error, nodeName: node.name });
      throw error;
    }
  }

  // ===== 确认节点配置 =====
  async confirmNodeConfig(
    nodeName: string,
    config: {
      topology?: string;
      device_ID?: string;
      TTS_input?: string;
      execute_emoji?: string;
    }
  ): Promise<{
    success: boolean;
    nextNode: ConfigurableNode | null;
    isComplete: boolean;
    progress: ConfigAgentState['progress'];
  }> {
    if (!this.state) {
      throw new Error('ConfigAgent not initialized');
    }

    // 构建更新操作
    const updates: Record<string, any> = {
      'notes.extra': 'configured'
    };

    if (config.topology) updates['notes.topology'] = config.topology;
    if (config.device_ID) updates['notes.device_ID'] = config.device_ID;
    if (config.TTS_input) updates['notes.sub.TTS_input'] = config.TTS_input;
    if (config.execute_emoji) updates['notes.sub.execute_emoji'] = config.execute_emoji;

    const operations: DiffOperation[] = [{
      type: 'updateNode',
      nodeName,
      updates
    }];

    try {
      // 调用 n8n API 更新工作流
      await this.apiClient.updatePartialWorkflow(this.state.workflowId, operations);

      // 更新本地状态
      const configuredNode = this.state.pendingNodes.shift()!;
      configuredNode.extra = 'configured';
      configuredNode.configValues = config;
      this.state.configuredNodes.push(configuredNode);

      // 更新进度
      this.state.progress.completed++;
      this.state.progress.percentage = Math.round(
        (this.state.progress.completed / this.state.progress.total) * 100
      );

      // 移动到下一个节点
      this.state.currentNode = this.state.pendingNodes[0] || null;

      logger.info('ConfigAgent: node configured', {
        nodeName,
        progress: this.state.progress
      });

      return {
        success: true,
        nextNode: this.state.currentNode,
        isComplete: this.state.pendingNodes.length === 0,
        progress: this.state.progress
      };
    } catch (error) {
      logger.error('ConfigAgent: failed to confirm node config', { error, nodeName });
      return {
        success: false,
        nextNode: this.state.currentNode,
        isComplete: false,
        progress: this.state.progress
      };
    }
  }

  // ===== 获取当前节点 =====
  getCurrentNode(): ConfigurableNode | null {
    return this.state?.currentNode || null;
  }

  // ===== 获取进度 =====
  getProgress(): ConfigAgentState['progress'] | null {
    return this.state?.progress || null;
  }

  // ===== 获取状态 =====
  getState(): ConfigAgentState | null {
    return this.state;
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

### 6.2 测试文件 tests/unit/agents/config-agent.test.ts

```typescript
import { ConfigAgent, ConfigurableNode, ConfigAgentState } from '../../../src/agents/config-agent';
import { N8nApiClient } from '../../../src/services/n8n-api-client';

// Mock N8nApiClient
const mockApiClient = {
  updatePartialWorkflow: jest.fn().mockResolvedValue({ success: true })
} as unknown as N8nApiClient;

// Mock workflow data
const createMockWorkflow = (nodes: any[]) => ({
  id: 'wf_test',
  name: 'Test Workflow',
  nodes: nodes.map((n, i) => ({
    name: n.name || `node_${i}`,
    type: n.type || 'n8n-nodes-base.set',
    notes: JSON.stringify({
      title: n.title || `Node ${i}`,
      subtitle: n.subtitle || '',
      category: n.category || 'BASE',
      session_ID: 'sess_test',
      extra: n.extra || 'pending',
      sub: n.sub || {}
    })
  }))
});

describe('ConfigAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractConfigurableNodes', () => {
    it('should exclude logic nodes', async () => {
      const workflow = createMockWorkflow([
        { name: 'set_TTS', category: 'TTS', extra: 'pending' },
        { name: 'if_check', type: 'n8n-nodes-base.if', category: 'BASE', extra: 'configured' },
        { name: 'http_CAM', category: 'CAM', extra: 'pending' }
      ]);

      const agent = new ConfigAgent(mockApiClient);
      const state = await agent.initializeFromWorkflow('wf_1', workflow, 'sess_1');

      // if 节点应被排除
      expect(state.allNodes).toHaveLength(2);
      expect(state.allNodes.map(n => n.name)).not.toContain('if_check');
    });

    it('should identify hardware nodes correctly', async () => {
      const workflow = createMockWorkflow([
        { name: 'http_CAM', category: 'CAM', extra: 'pending' },
        { name: 'set_TTS', category: 'TTS', extra: 'pending' },
        { name: 'http_HAND', category: 'HAND', extra: 'pending' }
      ]);

      const agent = new ConfigAgent(mockApiClient);
      const state = await agent.initializeFromWorkflow('wf_1', workflow, 'sess_1');

      const camNode = state.allNodes.find(n => n.category === 'CAM');
      const ttsNode = state.allNodes.find(n => n.category === 'TTS');
      const handNode = state.allNodes.find(n => n.category === 'HAND');

      expect(camNode?.configFields.needsTopology).toBe(true);
      expect(camNode?.configFields.needsDeviceId).toBe(true);
      expect(ttsNode?.configFields.needsTtsInput).toBe(true);
      expect(handNode?.configFields.needsTopology).toBe(true);
    });
  });

  describe('confirmNodeConfig', () => {
    it('should update node and move to next', async () => {
      const workflow = createMockWorkflow([
        { name: 'set_TTS', category: 'TTS', extra: 'pending' },
        { name: 'http_CAM', category: 'CAM', extra: 'pending' }
      ]);

      const agent = new ConfigAgent(mockApiClient);
      await agent.initializeFromWorkflow('wf_1', workflow, 'sess_1');

      const result = await agent.confirmNodeConfig('set_TTS', {
        TTS_input: '欢迎来到猜拳游戏'
      });

      expect(result.success).toBe(true);
      expect(result.nextNode?.name).toBe('http_CAM');
      expect(result.progress.completed).toBe(1);
      expect(mockApiClient.updatePartialWorkflow).toHaveBeenCalledWith(
        'wf_1',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'updateNode',
            nodeName: 'set_TTS',
            updates: expect.objectContaining({
              'notes.extra': 'configured',
              'notes.sub.TTS_input': '欢迎来到猜拳游戏'
            })
          })
        ])
      );
    });

    it('should return isComplete when all nodes configured', async () => {
      const workflow = createMockWorkflow([
        { name: 'set_TTS', category: 'TTS', extra: 'pending' }
      ]);

      const agent = new ConfigAgent(mockApiClient);
      await agent.initializeFromWorkflow('wf_1', workflow, 'sess_1');

      const result = await agent.confirmNodeConfig('set_TTS', {
        TTS_input: '测试'
      });

      expect(result.isComplete).toBe(true);
      expect(result.nextNode).toBeNull();
      expect(result.progress.percentage).toBe(100);
    });
  });

  describe('extra field state machine', () => {
    it('should transition pending -> configuring -> configured', async () => {
      const workflow = createMockWorkflow([
        { name: 'set_TTS', category: 'TTS', extra: 'pending' }
      ]);

      const agent = new ConfigAgent(mockApiClient);
      await agent.initializeFromWorkflow('wf_1', workflow, 'sess_1');

      // 初始状态: pending
      expect(agent.getCurrentNode()?.extra).toBe('pending');

      // 开始配置: configuring
      await agent.startConfigureCurrentNode();
      expect(agent.getCurrentNode()?.extra).toBe('configuring');

      // 确认配置: configured
      await agent.confirmNodeConfig('set_TTS', { TTS_input: '测试' });
      expect(agent.getState()?.configuredNodes[0].extra).toBe('configured');
    });
  });

  describe('progress tracking', () => {
    it('should calculate progress correctly', async () => {
      const workflow = createMockWorkflow([
        { name: 'node_1', category: 'TTS', extra: 'pending' },
        { name: 'node_2', category: 'CAM', extra: 'pending' },
        { name: 'node_3', category: 'SCREEN', extra: 'pending' }
      ]);

      const agent = new ConfigAgent(mockApiClient);
      await agent.initializeFromWorkflow('wf_1', workflow, 'sess_1');

      expect(agent.getProgress()).toEqual({ total: 3, completed: 0, percentage: 0 });

      await agent.confirmNodeConfig('node_1', {});
      expect(agent.getProgress()).toEqual({ total: 3, completed: 1, percentage: 33 });

      await agent.confirmNodeConfig('node_2', {});
      expect(agent.getProgress()).toEqual({ total: 3, completed: 2, percentage: 67 });

      await agent.confirmNodeConfig('node_3', {});
      expect(agent.getProgress()).toEqual({ total: 3, completed: 3, percentage: 100 });
    });
  });
});
```

### 6.3 Phase 2 执行命令

```bash
# 1. 创建 config-agent.ts
# 2. 创建测试文件
# 3. 运行测试
npm run build
npm test -- tests/unit/agents/config-agent.test.ts

# 4. 测试通过后提交
git add src/agents/config-agent.ts tests/unit/agents/config-agent.test.ts
git commit -m "feat(agent): implement ConfigAgent with extra field state machine

- Add ConfigAgent class with initializeFromWorkflow, confirmNodeConfig methods
- Add ConfigurableNode and ConfigAgentState interfaces
- Implement extra field state machine: pending -> configuring -> configured
- Exclude logic nodes from configuration
- Add progress tracking with percentage calculation
- Add comprehensive unit tests

Conceived by Romuald Członkowski - www.aiadvisors.pl/en"
```

---

## 7. Phase 3: Session Service 集成

### 7.1 修改 src/agents/session-service.ts

```typescript
// 在文件顶部添加导入
import { ConfigAgent, ConfigAgentState, ConfigurableNode } from './config-agent';

// 扩展 AgentSession 接口
export interface AgentSession {
  // ... 现有字段保持不变 ...

  // ConfigAgent 相关
  configAgent?: ConfigAgent;
  configState?: ConfigAgentState;
}

// 添加 ConfigAgent 集成方法
export class SessionService {
  // ... 现有方法保持不变 ...

  // ===== ConfigAgent 初始化 =====
  async initializeConfigAgent(
    sessionId: string,
    workflowId: string,
    workflowJson: any
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

    logger.info('SessionService: ConfigAgent initialized', {
      sessionId,
      workflowId,
      pendingNodes: configState.progress.total
    });

    return configState;
  }

  // ===== 开始配置当前节点 =====
  async startConfigureNode(sessionId: string): Promise<ConfigurableNode | null> {
    const session = this.getSession(sessionId);
    if (!session?.configAgent) {
      throw new Error('ConfigAgent not initialized');
    }

    return session.configAgent.startConfigureCurrentNode();
  }

  // ===== 确认节点配置 =====
  async confirmNodeConfiguration(
    sessionId: string,
    nodeName: string,
    config: {
      topology?: string;
      device_ID?: string;
      TTS_input?: string;
      execute_emoji?: string;
    }
  ): Promise<{
    type: string;
    message: string;
    data: any;
  }> {
    const session = this.getSession(sessionId);
    if (!session?.configAgent) {
      throw new Error('ConfigAgent not initialized');
    }

    const result = await session.configAgent.confirmNodeConfig(nodeName, config);

    if (!result.success) {
      return {
        type: 'error',
        message: '配置失败，请重试',
        data: { nodeName }
      };
    }

    if (result.isComplete) {
      return {
        type: 'config_complete',
        message: '所有节点配置完成！工作流已就绪。',
        data: {
          totalConfigured: result.progress.total,
          workflowId: session.configState!.workflowId
        }
      };
    }

    // 自动开始配置下一个节点
    if (result.nextNode) {
      await session.configAgent.startConfigureCurrentNode();
    }

    return {
      type: 'hot_plugging', // 或 'config_input'
      message: `请配置节点: ${result.nextNode?.title}`,
      data: {
        node: result.nextNode,
        progress: result.progress
      }
    };
  }

  // ===== 获取 ConfigAgent 状态 =====
  getConfigState(sessionId: string): ConfigAgentState | null {
    const session = this.getSession(sessionId);
    return session?.configState || null;
  }
}
```

### 7.2 测试文件扩展 tests/unit/agents/session-service.test.ts

```typescript
// 添加 ConfigAgent 集成测试
describe('SessionService ConfigAgent Integration', () => {
  let sessionService: SessionService;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      updatePartialWorkflow: jest.fn().mockResolvedValue({ success: true })
    };
    sessionService = new SessionService(mockApiClient);
  });

  describe('initializeConfigAgent', () => {
    it('should initialize ConfigAgent for session', async () => {
      const sessionId = sessionService.createSession();
      const workflowJson = {
        nodes: [
          {
            name: 'set_TTS',
            type: 'n8n-nodes-base.set',
            notes: JSON.stringify({
              title: 'TTS节点',
              subtitle: '语音合成',
              category: 'TTS',
              session_ID: sessionId,
              extra: 'pending'
            })
          }
        ]
      };

      const configState = await sessionService.initializeConfigAgent(
        sessionId,
        'wf_123',
        workflowJson
      );

      expect(configState.workflowId).toBe('wf_123');
      expect(configState.pendingNodes).toHaveLength(1);
      expect(sessionService.getConfigState(sessionId)).not.toBeNull();
    });
  });

  describe('confirmNodeConfiguration', () => {
    it('should return config_complete when all nodes done', async () => {
      const sessionId = sessionService.createSession();
      const workflowJson = {
        nodes: [
          {
            name: 'set_TTS',
            type: 'n8n-nodes-base.set',
            notes: JSON.stringify({
              title: 'TTS节点',
              category: 'TTS',
              session_ID: sessionId,
              extra: 'pending'
            })
          }
        ]
      };

      await sessionService.initializeConfigAgent(sessionId, 'wf_123', workflowJson);
      await sessionService.startConfigureNode(sessionId);

      const result = await sessionService.confirmNodeConfiguration(
        sessionId,
        'set_TTS',
        { TTS_input: '测试语音' }
      );

      expect(result.type).toBe('config_complete');
      expect(result.data.totalConfigured).toBe(1);
    });

    it('should return hot_plugging 或 config_input when more nodes remain', async () => {
      const sessionId = sessionService.createSession();
      const workflowJson = {
        nodes: [
          {
            name: 'set_TTS',
            type: 'n8n-nodes-base.set',
            notes: JSON.stringify({ title: 'TTS', category: 'TTS', session_ID: sessionId, extra: 'pending' })
          },
          {
            name: 'http_SCREEN',
            type: 'n8n-nodes-base.httpRequest',
            notes: JSON.stringify({ title: 'SCREEN', category: 'SCREEN', session_ID: sessionId, extra: 'pending' })
          }
        ]
      };

      await sessionService.initializeConfigAgent(sessionId, 'wf_123', workflowJson);
      await sessionService.startConfigureNode(sessionId);

      const result = await sessionService.confirmNodeConfiguration(
        sessionId,
        'set_TTS',
        { TTS_input: '测试' }
      );

      expect(['hot_plugging', 'config_input']).toContain(result.type);
      expect(result.data.node.name).toBe('http_SCREEN');
      expect(result.data.progress.completed).toBe(1);
    });
  });
});
```

### 7.3 Phase 3 执行命令

```bash
# 1. 修改 session-service.ts
# 2. 扩展测试文件
# 3. 运行测试
npm run build
npm test -- tests/unit/agents/session-service.test.ts

# 4. 测试通过后提交
git add src/agents/session-service.ts tests/unit/agents/session-service.test.ts
git commit -m "feat(session): integrate ConfigAgent into SessionService

- Add ConfigAgent instance to AgentSession interface
- Add initializeConfigAgent method for workflow-based initialization
- Add startConfigureNode and confirmNodeConfiguration methods
- Add getConfigState method for state retrieval
- Auto-start configuring next node after confirmation
- Add comprehensive integration tests

Conceived by Romuald Członkowski - www.aiadvisors.pl/en"
```

---

## 8. Phase 4: API 层实现

### 8.1 修改 src/agent-server/server.ts

```typescript
// 添加 ConfigAgent API 端点

// POST /api/agent/start-config
app.post('/api/agent/start-config', async (req, res) => {
  const { sessionId, workflowId, workflowJson } = req.body;

  if (!sessionId || !workflowId || !workflowJson) {
    return res.status(400).json({
      success: false,
      type: 'error',
      message: 'Missing required fields: sessionId, workflowId, workflowJson'
    });
  }

  try {
    const configState = await sessionService.initializeConfigAgent(
      sessionId,
      workflowId,
      workflowJson
    );

    const firstNode = await sessionService.startConfigureNode(sessionId);

    res.json({
      success: true,
      type: 'hot_plugging', // 或 'config_input'
      message: `开始硬件配置，共 ${configState.progress.total} 个节点待配置`,
      data: {
        currentNode: firstNode,
        progress: configState.progress
      }
    });
  } catch (error: any) {
    logger.error('API: start-config failed', { error, sessionId });
    res.status(500).json({
      success: false,
      type: 'error',
      message: error.message
    });
  }
});

// POST /api/agent/confirm-node
app.post('/api/agent/confirm-node', async (req, res) => {
  const { sessionId, nodeName, topology, device_ID, TTS_input, execute_emoji } = req.body;

  if (!sessionId || !nodeName) {
    return res.status(400).json({
      success: false,
      type: 'error',
      message: 'Missing required fields: sessionId, nodeName'
    });
  }

  try {
    const response = await sessionService.confirmNodeConfiguration(
      sessionId,
      nodeName,
      { topology, device_ID, TTS_input, execute_emoji }
    );

    res.json({
      success: true,
      ...response
    });
  } catch (error: any) {
    logger.error('API: confirm-node failed', { error, sessionId, nodeName });
    res.status(500).json({
      success: false,
      type: 'error',
      message: error.message
    });
  }
});

// GET /api/agent/config-state
app.get('/api/agent/config-state', (req, res) => {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      type: 'error',
      message: 'Missing required query param: sessionId'
    });
  }

  const configState = sessionService.getConfigState(sessionId);

  if (!configState) {
    return res.status(404).json({
      success: false,
      type: 'error',
      message: 'ConfigAgent not initialized for this session'
    });
  }

  res.json({
    success: true,
    data: {
      workflowId: configState.workflowId,
      currentNode: configState.currentNode,
      progress: configState.progress,
      pendingCount: configState.pendingNodes.length,
      configuredCount: configState.configuredNodes.length
    }
  });
});
```

### 8.2 修改 src/agent-server/websocket.ts

```typescript
// 添加 ConfigAgent WebSocket 消息处理

case 'start_config': {
  const { workflowId, workflowJson } = message.data;

  try {
    const configState = await sessionService.initializeConfigAgent(
      sessionId,
      workflowId,
      workflowJson
    );

    const firstNode = await sessionService.startConfigureNode(sessionId);

    ws.send(JSON.stringify({
      type: 'hot_plugging', // 或 'config_input'
      data: {
        currentNode: firstNode,
        progress: configState.progress
      }
    }));
  } catch (error: any) {
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
  break;
}

case 'confirm_node': {
  const { nodeName, topology, device_ID, TTS_input, execute_emoji } = message.data;

  try {
    const response = await sessionService.confirmNodeConfiguration(
      sessionId,
      nodeName,
      { topology, device_ID, TTS_input, execute_emoji }
    );

    ws.send(JSON.stringify(response));
  } catch (error: any) {
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
  break;
}

case 'get_config_state': {
  const configState = sessionService.getConfigState(sessionId);

  if (configState) {
    ws.send(JSON.stringify({
      type: 'config_state',
      data: {
        workflowId: configState.workflowId,
        currentNode: configState.currentNode,
        progress: configState.progress
      }
    }));
  } else {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'ConfigAgent not initialized'
    }));
  }
  break;
}
```

### 8.3 测试文件 tests/integration/agent/config-agent-api.test.ts

```typescript
import request from 'supertest';
import { createTestServer } from '../../utils/test-server';

describe('ConfigAgent API', () => {
  let app: any;
  let sessionId: string;

  beforeAll(async () => {
    app = await createTestServer();
  });

  beforeEach(async () => {
    const res = await request(app).post('/api/agent/chat').send({ message: 'test' });
    sessionId = res.body.sessionId;
  });

  describe('POST /api/agent/start-config', () => {
    it('should initialize ConfigAgent and return first node', async () => {
      const workflowJson = {
        nodes: [
          {
            name: 'set_TTS',
            type: 'n8n-nodes-base.set',
            notes: JSON.stringify({
              title: 'TTS节点',
              category: 'TTS',
              session_ID: sessionId,
              extra: 'pending'
            })
          }
        ]
      };

      const res = await request(app)
        .post('/api/agent/start-config')
        .send({ sessionId, workflowId: 'wf_test', workflowJson });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(['hot_plugging', 'config_input']).toContain(res.body.type);
      expect(res.body.data.currentNode.name).toBe('set_TTS');
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/agent/start-config')
        .send({ sessionId });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/agent/confirm-node', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/agent/start-config')
        .send({
          sessionId,
          workflowId: 'wf_test',
          workflowJson: {
            nodes: [{
              name: 'set_TTS',
              type: 'n8n-nodes-base.set',
              notes: JSON.stringify({
                title: 'TTS',
                category: 'TTS',
                session_ID: sessionId,
                extra: 'pending'
              })
            }]
          }
        });
    });

    it('should confirm node and return config_complete', async () => {
      const res = await request(app)
        .post('/api/agent/confirm-node')
        .send({ sessionId, nodeName: 'set_TTS', TTS_input: '测试语音' });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('config_complete');
    });
  });

  describe('GET /api/agent/config-state', () => {
    it('should return current config state', async () => {
      await request(app)
        .post('/api/agent/start-config')
        .send({
          sessionId,
          workflowId: 'wf_test',
          workflowJson: {
            nodes: [{
              name: 'set_TTS',
              type: 'n8n-nodes-base.set',
              notes: JSON.stringify({
                title: 'TTS',
                category: 'TTS',
                session_ID: sessionId,
                extra: 'pending'
              })
            }]
          }
        });

      const res = await request(app)
        .get('/api/agent/config-state')
        .query({ sessionId });

      expect(res.status).toBe(200);
      expect(res.body.data.workflowId).toBe('wf_test');
    });
  });
});
```

### 8.4 Phase 4 执行命令

```bash
# 1. 修改 server.ts 和 websocket.ts
# 2. 创建集成测试
# 3. 运行测试
npm run build
npm test -- tests/integration/agent/config-agent-api.test.ts

# 4. 测试通过后提交
git add src/agent-server/server.ts src/agent-server/websocket.ts tests/integration/agent/config-agent-api.test.ts
git commit -m "feat(api): add ConfigAgent HTTP and WebSocket endpoints

- Add POST /api/agent/start-config endpoint
- Add POST /api/agent/confirm-node endpoint
- Add GET /api/agent/config-state endpoint
- Add WebSocket handlers for config operations
- Add comprehensive integration tests

Conceived by Romuald Członkowski - www.aiadvisors.pl/en"
```

---

## 9. Phase 5: IntakeAgent 工作流生成规范

### 9.1 更新 src/agents/prompts/few-shot-examples.ts

```typescript
/**
 * [INPUT]: 依赖 types.ts 的 NodeCategory, NodeNotes, NodeSubParams
 * [OUTPUT]: 对外提供 GAME_WORKFLOW_EXAMPLE, generateNodeNotes
 * [POS]: prompts 模块的示例生成器，为 IntakeAgent 提供工作流模板
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NodeCategory, NodeNotes, NodeSubParams, LOGIC_NODE_TYPES } from '../types';

// ============================================================
// Notes 字段生成函数
// ============================================================

export function generateNodeNotes(params: {
  title: string;
  subtitle: string;
  category: NodeCategory;
  sessionId: string;
  nodeType: string;
  sub?: NodeSubParams;
}): string {
  const { title, subtitle, category, sessionId, nodeType, sub } = params;

  // 逻辑器节点直接设为 configured
  const extra = LOGIC_NODE_TYPES.includes(nodeType) ? 'configured' : 'pending';

  const notes: NodeNotes = {
    title,
    subtitle,
    category,
    session_ID: sessionId,
    extra,
    ...(sub && Object.keys(sub).length > 0 && { sub })
  };

  return JSON.stringify(notes);
}

// ============================================================
// 猜拳游戏工作流示例（严格基于 game_nodes.md）
// ============================================================

export const GAME_WORKFLOW_EXAMPLE = {
  name: "猜拳游戏工作流",
  description: "完整的人机猜拳交互流程",

  nodes: [
    // ===== 触发器 (BASE) =====
    {
      name: "trigger_BASE_schedule_start",
      type: "n8n-nodes-base.scheduleTrigger",
      parameters: {
        rule: { interval: [{ field: "seconds", secondsInterval: 10 }] }
      },
      notes: {
        title: "定时触发",
        subtitle: "每10秒触发一次游戏循环",
        category: "BASE",
        session_ID: "{{ $sessionId }}",
        extra: "pending",
        sub: { seconds: 10 }
      }
    },

    // ===== 感知器 (CAM) =====
    {
      name: "http_CAM_capture_frame",
      type: "n8n-nodes-base.httpRequest",
      notes: {
        title: "摄像头捕获",
        subtitle: "获取当前画面帧",
        category: "CAM",
        session_ID: "{{ $sessionId }}",
        extra: "pending",
        sub: { output: "frame_base64" }
      }
    },

    // ===== 处理器 (YOLO-RPS) =====
    {
      name: "http_YOLO-RPS_detect_gesture",
      type: "n8n-nodes-base.httpRequest",
      notes: {
        title: "手势识别",
        subtitle: "YOLO检测用户出拳手势",
        category: "YOLO-RPS",
        session_ID: "{{ $sessionId }}",
        extra: "pending",
        sub: { yolov_input: "frame_base64", yolov_output: "user_gesture" }
      }
    },

    // ===== 处理器 (RAM) =====
    {
      name: "set_RAM_random_robot",
      type: "n8n-nodes-base.set",
      notes: {
        title: "随机出拳",
        subtitle: "机器人随机生成手势",
        category: "RAM",
        session_ID: "{{ $sessionId }}",
        extra: "pending",
        sub: { random_rule: "rock|paper|scissors", output: "robot_gesture" }
      }
    },

    // ===== 处理器 (ASSIGN) =====
    {
      name: "code_ASSIGN_judge_result",
      type: "n8n-nodes-base.code",
      notes: {
        title: "结果判定",
        subtitle: "判断游戏胜负",
        category: "ASSIGN",
        session_ID: "{{ $sessionId }}",
        extra: "pending",
        sub: { robotGesture: "robot_gesture" }
      }
    },

    // ===== 逻辑器 (BASE - Switch) =====
    {
      name: "switch_BASE_route_result",
      type: "n8n-nodes-base.switch",
      notes: {
        title: "结果路由",
        subtitle: "根据游戏结果分流",
        category: "BASE",
        session_ID: "{{ $sessionId }}",
        extra: "configured"  // 逻辑器直接 configured
      }
    },

    // ===== 处理器 (TTS) =====
    {
      name: "set_TTS_speak_win",
      type: "n8n-nodes-base.set",
      notes: {
        title: "胜利语音",
        subtitle: "播放胜利提示语",
        category: "TTS",
        session_ID: "{{ $sessionId }}",
        extra: "pending",
        sub: { TTS_input: "", audio_name: "win_audio" }  // TTS_input 由 ConfigAgent 填充
      }
    },

    // ===== 执行器 (HAND) =====
    {
      name: "http_HAND_execute_win",
      type: "n8n-nodes-base.httpRequest",
      notes: {
        title: "机械手出拳",
        subtitle: "执行机器人手势",
        category: "HAND",
        session_ID: "{{ $sessionId }}",
        extra: "pending",
        sub: { execute_gesture: "robot_gesture" }
      }
    },

    // ===== 执行器 (SCREEN) =====
    {
      name: "http_SCREEN_display_win",
      type: "n8n-nodes-base.httpRequest",
      notes: {
        title: "屏幕显示",
        subtitle: "显示胜利表情",
        category: "SCREEN",
        session_ID: "{{ $sessionId }}",
        extra: "pending",
        sub: { execute_emoji: "" }  // ConfigAgent 填充
      }
    },

    // ===== 执行器 (SPEAKER) =====
    {
      name: "http_SPEAKER_play_win",
      type: "n8n-nodes-base.httpRequest",
      notes: {
        title: "播放音频",
        subtitle: "播放胜利音效",
        category: "SPEAKER",
        session_ID: "{{ $sessionId }}",
        extra: "pending",
        sub: { audio_name: "win_audio" }
      }
    }
  ]
};

// ============================================================
// 节点命名规范
// ============================================================

export const NODE_NAMING_CONVENTION = {
  pattern: /^[a-z]+_[A-Z-]+_[a-z]+_[a-z0-9]+$/,
  typeMap: {
    'n8n-nodes-base.scheduleTrigger': 'trigger',
    'n8n-nodes-base.httpRequest': 'http',
    'n8n-nodes-base.set': 'set',
    'n8n-nodes-base.code': 'code',
    'n8n-nodes-base.if': 'if',
    'n8n-nodes-base.switch': 'switch',
    'n8n-nodes-base.merge': 'merge'
  }
};
```

### 9.2 测试文件 tests/unit/agents/intake-agent.test.ts (扩展)

```typescript
describe('IntakeAgent Notes Generation', () => {
  describe('generateNodeNotes', () => {
    it('should set extra to pending for non-logic nodes', () => {
      const notes = generateNodeNotes({
        title: 'TTS节点',
        subtitle: '语音合成',
        category: 'TTS',
        sessionId: 'sess_123',
        nodeType: 'n8n-nodes-base.set',
        sub: { TTS_input: '' }
      });

      const parsed = JSON.parse(notes);
      expect(parsed.extra).toBe('pending');
      expect(parsed.category).toBe('TTS');
    });

    it('should set extra to configured for logic nodes', () => {
      const notes = generateNodeNotes({
        title: '条件判断',
        subtitle: '分支路由',
        category: 'BASE',
        sessionId: 'sess_123',
        nodeType: 'n8n-nodes-base.switch'
      });

      const parsed = JSON.parse(notes);
      expect(parsed.extra).toBe('configured');
    });

    it('should include session_ID from agent-api sessionId', () => {
      const notes = generateNodeNotes({
        title: '测试',
        subtitle: '测试',
        category: 'CAM',
        sessionId: 'agent-session-abc123',
        nodeType: 'n8n-nodes-base.httpRequest'
      });

      const parsed = JSON.parse(notes);
      expect(parsed.session_ID).toBe('agent-session-abc123');
    });
  });
});
```

### 9.3 Phase 5 执行命令

```bash
npm run build
npm test -- tests/unit/agents/intake-agent.test.ts

git add src/agents/prompts/few-shot-examples.ts src/agents/intake-agent.ts tests/unit/agents/intake-agent.test.ts
git commit -m "feat(intake): update workflow generation with game_nodes.md spec

- Add generateNodeNotes function with extra field logic
- Add NODE_NAMING_CONVENTION for consistent node naming
- Add GAME_WORKFLOW_EXAMPLE with complete game workflow
- Logic nodes auto-set to configured, others to pending
- session_ID uses agent-api sessionId

Conceived by Romuald Członkowski - www.aiadvisors.pl/en"
```

---

## 10. Phase 6: 端到端集成测试

### 10.1 创建 tests/e2e/config-agent-flow.test.ts

```typescript
describe('ConfigAgent E2E Flow', () => {
  let app: any;
  let sessionId: string;
  let workflowId: string;
  let workflowJson: any;

  beforeAll(async () => {
    app = await createTestServer();
  });

  describe('Complete Flow: IntakeAgent → ConfigAgent', () => {
    it('Step 1: Create session via IntakeAgent', async () => {
      const chatRes = await request(app)
        .post('/api/agent/chat')
        .send({ message: '创建一个猜拳游戏工作流' });

      expect(chatRes.status).toBe(200);
      sessionId = chatRes.body.sessionId;
    });

    it('Step 2: Confirm workflow and get workflowJson', async () => {
      const confirmRes = await request(app)
        .post('/api/agent/confirm')
        .send({ sessionId });

      expect(confirmRes.status).toBe(200);
      workflowJson = confirmRes.body.workflow;
    });

    it('Step 3: Create workflow in n8n', async () => {
      const createRes = await request(app)
        .post('/api/workflow/create')
        .send({ sessionId, workflow: workflowJson });

      expect(createRes.status).toBe(200);
      workflowId = createRes.body.workflowId;
    });

    it('Step 4: Start ConfigAgent', async () => {
      const startRes = await request(app)
        .post('/api/agent/start-config')
        .send({ sessionId, workflowId, workflowJson });

      expect(startRes.status).toBe(200);
      expect(['hot_plugging', 'config_input']).toContain(startRes.body.type);
      expect(startRes.body.data.currentNode.extra).toBe('configuring');
    });

    it('Step 5: Configure nodes until complete', async () => {
      let isComplete = false;
      let count = 0;

      while (!isComplete && count < 50) {
        const stateRes = await request(app)
          .get('/api/agent/config-state')
          .query({ sessionId });

        const node = stateRes.body.data.currentNode;
        if (!node) { isComplete = true; break; }

        const config: any = {};
        if (node.configFields.needsTopology) config.topology = `UART${count}`;
        if (node.configFields.needsDeviceId) config.device_ID = `${node.category}_00${count}`;
        if (node.configFields.needsTtsInput) config.TTS_input = '测试语音';
        if (node.configFields.needsExecuteEmoji) config.execute_emoji = '😊';

        const confirmRes = await request(app)
          .post('/api/agent/confirm-node')
          .send({ sessionId, nodeName: node.name, ...config });

        if (confirmRes.body.type === 'config_complete') isComplete = true;
        count++;
      }

      expect(isComplete).toBe(true);
    });

    it('Step 6: Verify all nodes configured', async () => {
      const stateRes = await request(app)
        .get('/api/agent/config-state')
        .query({ sessionId });

      expect(stateRes.body.data.pendingCount).toBe(0);
      expect(stateRes.body.data.progress.percentage).toBe(100);
    });
  });

  describe('Edge Cases', () => {
    it('should skip logic nodes', async () => {
      const workflow = {
        nodes: [
          { name: 'if_check', type: 'n8n-nodes-base.if', notes: JSON.stringify({ title: 'IF', category: 'BASE', session_ID: 'test', extra: 'configured' }) },
          { name: 'set_TTS', type: 'n8n-nodes-base.set', notes: JSON.stringify({ title: 'TTS', category: 'TTS', session_ID: 'test', extra: 'pending' }) }
        ]
      };

      const res = await request(app)
        .post('/api/agent/start-config')
        .send({ sessionId: 'test-logic', workflowId: 'wf-logic', workflowJson: workflow });

      expect(res.body.data.progress.total).toBe(1);
      expect(res.body.data.currentNode.name).toBe('set_TTS');
    });
  });
});
```

### 10.2 Phase 6 执行命令

```bash
npm run build
npm test -- tests/e2e/config-agent-flow.test.ts

git add tests/e2e/config-agent-flow.test.ts
git commit -m "test(e2e): add ConfigAgent full flow integration tests

- Add complete IntakeAgent → ConfigAgent flow test
- Test node-by-node configuration until completion
- Test edge cases: logic node skipping
- Verify progress tracking and state management

Conceived by Romuald Członkowski - www.aiadvisors.pl/en"
```

---

## 11. 质量检查清单

### IntakeAgent 输出检查

- [ ] 节点名称符合 `{n8nType}_{category}_{action}_{detail}` 格式
- [ ] notes.category 使用正确枚举值（BASE/CAM/YOLO-RPS/TTS/RAM/ASSIGN/HAND/SPEAKER/SCREEN）
- [ ] notes.session_ID 使用 agent-api 的 sessionId
- [ ] 非逻辑器节点 notes.extra = 'pending'
- [ ] 逻辑器节点 notes.extra = 'configured'
- [ ] notes.sub 包含正确的节点特定参数

### ConfigAgent 闭环检查

- [ ] 正确排除逻辑器节点（if/switch/merge/noOp）
- [ ] extra 字段正确流转：pending → configuring → configured
- [ ] 进度百分比计算正确
- [ ] 所有节点配置完成后返回 config_complete

---

## 12. 文件清单汇总

| Phase | 文件路径 | 操作 |
|-------|---------|------|
| 1 | `src/agents/types.ts` | 修改 |
| 1 | `tests/unit/agents/types.test.ts` | 新建 |
| 2 | `src/agents/config-agent.ts` | 新建 |
| 2 | `tests/unit/agents/config-agent.test.ts` | 新建 |
| 3 | `src/agents/session-service.ts` | 修改 |
| 3 | `tests/unit/agents/session-service.test.ts` | 扩展 |
| 4 | `src/agent-server/server.ts` | 修改 |
| 4 | `src/agent-server/websocket.ts` | 修改 |
| 4 | `tests/integration/agent/config-agent-api.test.ts` | 新建 |
| 5 | `src/agents/prompts/few-shot-examples.ts` | 修改 |
| 5 | `src/agents/intake-agent.ts` | 修改 |
| 5 | `tests/unit/agents/intake-agent.test.ts` | 扩展 |
| 6 | `tests/e2e/config-agent-flow.test.ts` | 新建 |
