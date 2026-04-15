/**
 * [INPUT]: 依赖 AgentHttpServer、ConfigAgent、IntakeAgent 与网络测试助手
 * [OUTPUT]: 验证 ConfigAgent HTTP 端点的初始化、确认与状态查询
 * [POS]: tests/integration/agent 的配置 API 集成测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it, vi } from 'vitest';
import { AgentHttpServer } from '../../../src/agent-server/server';
import { AgentService } from '../../../src/agent-server/agent-service';
import { IntakeAgent } from '../../../src/agents/intake-agent';
import { SessionService } from '../../../src/agents/session-service';
import { HardwareService } from '../../../src/agents/hardware-service';
import { ConfigAgent } from '../../../src/agents/config-agent';
import type { Intent, WorkflowDefinition } from '../../../src/agents/types';
import { canListen, getJson, postJson } from '../../utils/test-helpers';

describe('ConfigAgent API integration', () => {
  it('supports start-config, confirm-node and config-state endpoints', async () => {
    if (!(await canListen())) {
      return;
    }

    const llmClient = {
      classify: async (): Promise<Intent> => ({
        category: 'game_interaction',
        entities: { game_type: 'rps' },
        confidence: 0.9,
        missingInfo: [],
      }),
      chat: async () =>
        JSON.stringify({
          category: 'game_interaction',
          entities: { game_type: 'rps' },
          confidence: 0.9,
          missingInfo: [],
        }),
    };

    const workflowArchitect = {
      generateWorkflow: async () => ({
        success: true,
        workflow: {
          name: 'Demo',
          nodes: [],
          connections: {},
        },
        iterations: 1,
        reasoning: 'test',
      }),
    } as any;

    const sessionService = new SessionService();
    const intakeAgent = new IntakeAgent(
      {
        llmProvider: 'openai',
        llmModel: 'test-model',
        llmApiKey: 'test-key',
        maxConversationTurns: 4,
        convergenceThreshold: 0.7,
        llmTimeoutMs: 1000,
        llmHealthTimeoutMs: 5000,
        workflowCacheTtlSeconds: 300,
        maxIterations: 2,
        promptVariant: 'baseline',
      },
      llmClient as any,
      workflowArchitect,
      new HardwareService(),
      sessionService,
      []
    );

    const workflows = new Map<string, WorkflowDefinition & { id?: string }>();
    const n8nClient = {
      getWorkflow: vi.fn(async (workflowId: string) => {
        const workflow = workflows.get(workflowId);
        if (!workflow) {
          throw new Error(`Workflow not found: ${workflowId}`);
        }
        return structuredClone(workflow);
      }),
      updateWorkflow: vi.fn(async (workflowId: string, payload: WorkflowDefinition & { id?: string }) => {
        workflows.set(workflowId, structuredClone(payload));
        return { success: true };
      }),
    };

    const configAgent = new ConfigAgent(sessionService, n8nClient as any);
    const agentService = new AgentService(intakeAgent, sessionService, configAgent);

    const workflowService = {
      createWorkflow: async () => ({
        workflowId: 'wf-1',
        workflowName: 'WF',
        workflowUrl: 'http://localhost:5678/workflow/wf-1',
      }),
    } as any;

    const server = new AgentHttpServer(agentService, workflowService);
    const { port } = await server.start({ host: '0.0.0.0', port: 0 });

    try {
      const chat = await postJson<{ sessionId: string }>(
        `http://127.0.0.1:${port}/api/agent/chat`,
        { message: '创建配置会话' }
      );
      const sessionId = chat.data.sessionId;
      expect(sessionId).toBeTruthy();

      const workflowId = 'wf_config_1';
      const workflowJson: WorkflowDefinition & { id?: string } = {
        id: workflowId,
        name: 'Config Workflow',
        nodes: [
          {
            name: 'set_tts',
            type: 'n8n-nodes-base.set',
            notes: {
              title: 'TTS 节点',
              subtitle: '语音输出',
              category: 'TTS',
              session_ID: sessionId,
              extra: 'pending',
              sub: { TTS_input: '' },
            },
          },
        ],
        connections: {},
      };
      workflows.set(workflowId, structuredClone(workflowJson));

      const start = await postJson<any>(
        `http://127.0.0.1:${port}/api/agent/start-config`,
        { sessionId, workflowId, workflowJson }
      );
      expect(start.response.status).toBe(200);
      expect(start.data.response.type).toBe('config_input');
      expect(start.data.response.currentNode.name).toBe('set_tts');

      const confirm = await postJson<any>(
        `http://127.0.0.1:${port}/api/agent/confirm-node`,
        { sessionId, nodeName: 'set_tts', TTS_input: '欢迎来到猜拳游戏' }
      );
      expect(confirm.response.status).toBe(200);
      expect(confirm.data.response.type).toBe('config_complete');

      const state = await getJson<any>(`http://127.0.0.1:${port}/api/agent/config-state?sessionId=${sessionId}`);
      expect(state.response.status).toBe(200);
      expect(state.data.success).toBe(true);
      expect(state.data.data.progress.percentage).toBe(100);
      expect(state.data.data.pendingCount).toBe(0);
    } finally {
      await server.stop();
    }
  });

  it('pure-hardware workflow enters hot_plugging with digitalTwinScene', async () => {
    if (!(await canListen())) {
      return;
    }

    const llmClient = {
      classify: async (): Promise<Intent> => ({
        category: 'game_interaction',
        entities: { game_type: 'rps' },
        confidence: 0.9,
        missingInfo: [],
      }),
      chat: async () =>
        JSON.stringify({
          category: 'game_interaction',
          entities: { game_type: 'rps' },
          confidence: 0.9,
          missingInfo: [],
        }),
    };

    const workflowArchitect = {
      generateWorkflow: async () => ({
        success: true,
        workflow: {
          name: 'Demo',
          nodes: [],
          connections: {},
        },
        iterations: 1,
        reasoning: 'test',
      }),
    } as any;

    const sessionService = new SessionService();
    const intakeAgent = new IntakeAgent(
      {
        llmProvider: 'openai',
        llmModel: 'test-model',
        llmApiKey: 'test-key',
        maxConversationTurns: 4,
        convergenceThreshold: 0.7,
        llmTimeoutMs: 1000,
        llmHealthTimeoutMs: 5000,
        workflowCacheTtlSeconds: 300,
        maxIterations: 2,
        promptVariant: 'baseline',
      },
      llmClient as any,
      workflowArchitect,
      new HardwareService(),
      sessionService,
      []
    );

    const workflows = new Map<string, WorkflowDefinition & { id?: string }>();
    const n8nClient = {
      getWorkflow: vi.fn(async (workflowId: string) => {
        const workflow = workflows.get(workflowId);
        if (!workflow) {
          throw new Error(`Workflow not found: ${workflowId}`);
        }
        return structuredClone(workflow);
      }),
      updateWorkflow: vi.fn(async (workflowId: string, payload: WorkflowDefinition & { id?: string }) => {
        workflows.set(workflowId, structuredClone(payload));
        return { success: true };
      }),
    };

    const configAgent = new ConfigAgent(sessionService, n8nClient as any);
    const agentService = new AgentService(intakeAgent, sessionService, configAgent);
    const workflowService = {
      createWorkflow: async () => ({
        workflowId: 'wf-cam',
        workflowName: 'WF',
        workflowUrl: 'http://localhost:5678/workflow/wf-cam',
      }),
    } as any;

    const server = new AgentHttpServer(agentService, workflowService);
    const { port } = await server.start({ host: '0.0.0.0', port: 0 });

    try {
      const chat = await postJson<{ sessionId: string }>(
        `http://127.0.0.1:${port}/api/agent/chat`,
        { message: '创建摄像头配置会话' }
      );
      const sessionId = chat.data.sessionId;
      const workflowId = 'wf_config_cam';
      const workflowJson: WorkflowDefinition & { id?: string } = {
        id: workflowId,
        name: 'Camera Config Workflow',
        nodes: [
          {
            name: 'http_cam',
            type: 'n8n-nodes-base.httpRequest',
            notes: {
              title: '摄像头抓拍',
              subtitle: '调用摄像头 API 获取画面',
              category: 'CAM',
              session_ID: sessionId,
              extra: 'pending',
              sub: {},
            },
          },
        ],
        connections: {},
      };
      workflows.set(workflowId, structuredClone(workflowJson));

      // 纯硬件工作流 (CAM-only): 软件侧已完成，但仍需进入硬件组装阶段
      const start = await postJson<any>(
        `http://127.0.0.1:${port}/api/agent/start-config`,
        { sessionId, workflowId, workflowJson }
      );
      expect(start.response.status).toBe(200);
      expect(start.data.response.type).toBe('hot_plugging');
      expect(start.data.response.metadata.allPendingHardwareNodeNames).toEqual(['http_cam']);
      // digitalTwinScene 应包含基座模型与标准接口
      expect(start.data.response.digitalTwinScene).toBeDefined();
      expect(start.data.response.digitalTwinScene.base_model_id).toBeDefined();
      expect(start.data.response.digitalTwinScene.interfaces).toBeInstanceOf(Array);
    } finally {
      await server.stop();
    }
  });

  it('returns 400 when start-config missing sessionId', async () => {
    if (!(await canListen())) {
      return;
    }

    const llmClient = {
      classify: async (): Promise<Intent> => ({ category: 'custom', entities: {}, confidence: 0.7 }),
      chat: async () => JSON.stringify({ category: 'custom', entities: {}, confidence: 0.7 }),
    };
    const workflowArchitect = {
      generateWorkflow: async () => ({ success: true, workflow: { name: 'Demo', nodes: [], connections: {} }, iterations: 1 }),
    } as any;
    const sessionService = new SessionService();
    const intakeAgent = new IntakeAgent(
      {
        llmProvider: 'openai',
        llmModel: 'test-model',
        llmApiKey: 'test-key',
        maxConversationTurns: 4,
        convergenceThreshold: 0.7,
        llmTimeoutMs: 1000,
        llmHealthTimeoutMs: 5000,
        workflowCacheTtlSeconds: 300,
        maxIterations: 2,
        promptVariant: 'baseline',
      },
      llmClient as any,
      workflowArchitect,
      new HardwareService(),
      sessionService,
      []
    );
    const configAgent = new ConfigAgent(sessionService, {
      getWorkflow: vi.fn(),
      updateWorkflow: vi.fn(),
    } as any);
    const agentService = new AgentService(intakeAgent, sessionService, configAgent);
    const server = new AgentHttpServer(agentService, {
      createWorkflow: async () => ({ workflowId: 'wf', workflowName: 'WF', workflowUrl: '' }),
    } as any);
    const { port } = await server.start({ host: '0.0.0.0', port: 0 });

    try {
      const result = await postJson<any>(`http://127.0.0.1:${port}/api/agent/start-config`, {});
      expect(result.response.status).toBe(400);
    } finally {
      await server.stop();
    }
  });
});
