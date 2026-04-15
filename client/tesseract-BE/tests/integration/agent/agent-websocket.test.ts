/**
 * [INPUT]: 依赖 AgentHttpServer、createAgentStack、ws 与网络测试助手
 * [OUTPUT]: 验证 WebSocket Agent 交互链路可正常收发与确认工作流
 * [POS]: tests/integration/agent 的 WebSocket 集成测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { AgentHttpServer } from '../../../src/agent-server/server';
import { createAgentStack } from '../../../src/agent-server/agent-factory';
import { createStaticRuntimeStatusMonitor } from '../../../src/agent-server/runtime-status';
import { HARDWARE_CAPABILITY_IDS } from '../../../src/agents/hardware-capability-ids';
import type { Intent } from '../../../src/agents/types';
import {
  canListen,
  waitForWebSocketMessageType,
  waitForWebSocketOpen,
} from '../../utils/test-helpers';

function createDeterministicAgentLlmClient() {
  return {
    classify: async (): Promise<Intent> => ({
      category: 'game_interaction',
      entities: { game_type: 'rps' },
      confidence: 0.9,
      missingInfo: [],
    }),
    chat: async (messages: Array<{ role: string; content: string }>) => {
      const systemPrompt = messages[0]?.content ?? '';
      const userPrompt = messages[1]?.content ?? '';

      if (systemPrompt.includes('机器人能力映射助手')) {
        return JSON.stringify({
          reasoning_summary: '用户明确提出摄像头检测人脸后播放欢迎语音。',
          recognized_requirements: ['触发: 检测到人脸', '动作: 播放欢迎语音'],
          capability_ids: [
            HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
            HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
            HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION,
            HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK,
          ],
          search_terms: ['人脸检测', '欢迎语音', '摄像头', '喇叭'],
        });
      }

      if (userPrompt.includes('当摄像头检测到人脸时，播放欢迎语音')) {
        return JSON.stringify({
          decision: 'direct_accept',
          reasoning_summary: '触发条件和反馈动作都已明确，可以直接生成摘要。',
          recognized_requirements: ['触发: 检测到人脸', '动作: 播放欢迎语音'],
          supported_capability_ids: [
            HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
            HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
            HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION,
            HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK,
          ],
          missing_info: [],
          clarification_questions: [],
          suggested_user_actions: [],
          out_of_scope_reasons: [],
        });
      }

      return JSON.stringify({
        decision: 'clarify_needed',
        reasoning_summary: '当前信息不足，需要继续澄清。',
        recognized_requirements: [],
        supported_capability_ids: [],
        missing_info: [
          {
            category: 'trigger',
            description: '触发方式未明确。',
            priority: 1,
            blocking: true,
          },
        ],
        clarification_questions: [
          {
            question: '你希望机器人在什么事件发生时开始工作？',
            priority: 1,
            context: 'trigger',
          },
        ],
        suggested_user_actions: [],
        out_of_scope_reasons: [],
      });
    },
  };
}

describe('Agent WebSocket integration', () => {
  it('responds to chat messages', async () => {
    if (!(await canListen())) {
      return;
    }
    const llmClient = createDeterministicAgentLlmClient();

    const config = {
      llmProvider: 'openai' as const,
      llmModel: 'test-model',
      llmApiKey: 'test-key',
      maxConversationTurns: 4,
      convergenceThreshold: 0.7,
      llmTimeoutMs: 1000,
      llmHealthTimeoutMs: 5000,
      workflowCacheTtlSeconds: 300,
      maxIterations: 2,
      promptVariant: 'baseline',
    };
    const runtimeStatusMonitor = createStaticRuntimeStatusMonitor({
      llm: {
        state: 'ready',
        code: 'ok',
        enabled: true,
        provider: 'openai',
        model: 'test-model',
        baseUrl: 'https://example.com/v1',
        message: 'LLM 网关可用',
        checkedAt: new Date().toISOString(),
        latencyMs: 35,
        probeTimeoutMs: 5000,
      },
    });

    const workflowArchitect = {
      generateWorkflow: async () => ({
        success: true,
        workflow: { name: 'Demo', nodes: [], connections: {} },
        iterations: 1,
        reasoning: 'test',
      }),
    } as any;
    const mcpClient = {
      searchNodes: async () => ({ nodes: [], total: 0 }),
      getNode: async () => ({}),
      validateWorkflow: async () => ({
        isValid: true,
        errors: [],
        warnings: [],
      }),
      autofixWorkflow: async (workflowToFix: { name: string; nodes: unknown[]; connections: Record<string, unknown> }) =>
        workflowToFix,
    } as any;

    const { agentService, runtimeStatusMonitor: createdRuntimeStatusMonitor, close } = await createAgentStack({
      config,
      llmClient,
      workflowArchitect,
      mcpClient,
      hardwareComponents: [],
      runtimeStatusMonitor,
    });

    const workflowService = {
      createWorkflow: async () => ({
        workflowId: 'wf-1',
        workflowName: 'WF',
        workflowUrl: 'http://localhost:5678/workflow/wf-1',
      }),
    } as any;

    const server = new AgentHttpServer(agentService, workflowService, createdRuntimeStatusMonitor);
    const { port } = await server.start({ host: '0.0.0.0', port: 0 });

    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

    try {
      await waitForWebSocketOpen(ws);
      const runtimeStatus = await waitForWebSocketMessageType<{ type: string; data: { llm: { state: string } } }>(
        ws,
        'runtime_status'
      );
      expect(runtimeStatus.data.llm.state).toBe('ready');

      ws.send(JSON.stringify({
        type: 'user_message',
        message: '当摄像头检测到人脸时，播放欢迎语音',
      }));

      const tracePayload = await waitForWebSocketMessageType<{ type: string; data: { phase: string; title: string } }>(
        ws,
        'agent_trace'
      );
      expect(tracePayload.data.phase).toBe('intake');
      expect(tracePayload.data.title).toContain('收到用户输入');

      const payload = await waitForWebSocketMessageType<{ type: string; sessionId: string; response: { type: string } }>(
        ws,
        'agent_response'
      );

      expect(payload.type).toBe('agent_response');
      expect(payload.response.type).toBe('summary_ready');

      ws.send(JSON.stringify({ type: 'confirm_workflow', sessionId: payload.sessionId }));
      const confirmPayload = await waitForWebSocketMessageType<{ type: string; response: { type: string; message: string } }>(
        ws,
        'agent_response'
      );

      expect(confirmPayload.type).toBe('agent_response');
      expect(confirmPayload.response.type).toBe('guidance');
      expect(confirmPayload.response.message).toContain('工作流');
    } finally {
      ws.close();
      await server.stop();
      close();
    }
  });
});
