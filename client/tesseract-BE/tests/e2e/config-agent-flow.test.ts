/**
 * [INPUT]: 依赖 AgentHttpServer、AgentService、ConfigAgent 与真实配置状态机
 * [OUTPUT]: 验证 HTTP 层从编排到配置完成的完整闭环
 * [POS]: tests/e2e 的配置阶段全链路测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it, vi } from 'vitest';
import { AgentHttpServer } from '../../src/agent-server/server';
import { AgentService } from '../../src/agent-server/agent-service';
import { IntakeAgent } from '../../src/agents/intake-agent';
import { SessionService } from '../../src/agents/session-service';
import { HARDWARE_COMPONENTS } from '../../src/agents/hardware-components';
import { HardwareService } from '../../src/agents/hardware-service';
import { ConfigAgent } from '../../src/agents/config-agent';
import type { AgentResponse, WorkflowDefinition } from '../../src/agents/types';
import { canListen, getJson, postJson } from '../utils/test-helpers';

const TEST_CONFIG = {
  llmProvider: 'openai' as const,
  llmModel: 'test-model',
  llmApiKey: 'test-key',
  maxConversationTurns: 6,
  convergenceThreshold: 0.7,
  llmTimeoutMs: 1000,
  llmHealthTimeoutMs: 5000,
  workflowCacheTtlSeconds: 300,
  maxIterations: 3,
  promptVariant: 'baseline',
};

const TEST_FACE_IMAGE =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2AGQAAAAASUVORK5CYII=';

async function advanceConfigFlow(
  baseUrl: string,
  sessionId: string,
  initialResponse: AgentResponse
): Promise<AgentResponse> {
  let response = initialResponse;

  for (let step = 0; step < 12; step += 1) {
    if (response.type === 'config_complete') {
      return response;
    }

    if (response.type === 'hot_plugging') {
      const currentNode = response.currentNode;
      const confirmPayload: Record<string, unknown> = {
        sessionId,
        nodeName: currentNode.name,
      };

      if (currentNode.configFields?.needsTopology) {
        confirmPayload.topology = `UART${step}`;
      }
      if (currentNode.configFields?.needsDeviceId) {
        confirmPayload.device_ID = `${currentNode.category ?? 'NODE'}_${step}`;
      }

      const confirmNode = await postJson<{ response: AgentResponse }>(
        `${baseUrl}/api/agent/confirm-node`,
        confirmPayload
      );
      expect(confirmNode.response.status).toBe(200);
      response = confirmNode.data.response;
      continue;
    }

    if (response.type === 'select_single') {
      const decision = await postJson<{ sessionId: string; response: AgentResponse }>(
        `${baseUrl}/api/agent/chat`,
        { sessionId, message: '否' }
      );
      expect(decision.response.status).toBe(200);
      response = decision.data.response;
      continue;
    }

    if (response.type === 'config_input') {
      const inputResponse = await postJson<{ sessionId: string; response: AgentResponse }>(
        `${baseUrl}/api/agent/chat`,
        { sessionId, message: 'TTS_input: 欢迎来到 Tesseract' }
      );
      expect(inputResponse.response.status).toBe(200);
      response = inputResponse.data.response;
      continue;
    }

    if (response.type === 'image_upload') {
      const upload = await postJson<{ url: string }>(
        `${baseUrl}/api/agent/upload-face`,
        {
          profile: 'tester',
          fileName: 'face.png',
          contentBase64: TEST_FACE_IMAGE,
        }
      );
      expect(upload.response.status).toBe(200);

      const imageResponse = await postJson<{ sessionId: string; response: AgentResponse }>(
        `${baseUrl}/api/agent/chat`,
        {
          sessionId,
          message: JSON.stringify({
            profile: 'tester',
            url: upload.data.url,
          }),
        }
      );
      expect(imageResponse.response.status).toBe(200);
      response = imageResponse.data.response;
      continue;
    }

    if (response.type === 'guidance' || response.type === 'summary_ready' || response.type === 'workflow_ready') {
      throw new Error(`Unexpected orchestrator response during config flow: ${response.type}`);
    }

    if (response.type === 'error') {
      throw new Error(`Config flow failed: ${response.message}`);
    }

    throw new Error(`Unsupported config response type: ${response.type}`);
  }

  throw new Error('Config flow did not finish within 12 steps');
}
describe('ConfigAgent E2E flow', () => {
  it('completes Intake -> Workflow create -> ConfigAgent full loop', async () => {
    if (!(await canListen())) {
      return;
    }

    const llmClient = {
      classify: vi.fn(),
      chat: vi.fn().mockResolvedValue(
        JSON.stringify({
          clarification_questions: [
            {
              question: '机器人应该在什么时候开始执行？',
              options: ['检测到事件时自动开始', '通过 webhook 触发'],
              priority: 1,
              context: 'trigger',
            },
          ],
        })
      ),
    };

    const sessionService = new SessionService();
    const intakeAgent = new IntakeAgent(
      TEST_CONFIG,
      llmClient as any,
      {} as any,
      new HardwareService(),
      sessionService,
      HARDWARE_COMPONENTS
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
      createWorkflow: async (workflow: WorkflowDefinition) => {
        const workflowId = 'wf_e2e_1';
        workflows.set(workflowId, { ...workflow, id: workflowId });
        return {
          workflowId,
          workflowName: workflow.name,
          workflowUrl: `http://localhost:5678/workflow/${workflowId}`,
        };
      },
    } as any;

    const server = new AgentHttpServer(agentService, workflowService);
    const { port } = await server.start({ host: '0.0.0.0', port: 0 });

    try {
      const chat = await postJson<{ sessionId: string; response: { type: string } }>(
        `http://127.0.0.1:${port}/api/agent/chat`,
        { message: '当摄像头检测到人脸时，在屏幕显示开心表情并播放欢迎语音' }
      );
      expect(chat.response.status).toBe(200);
      expect(chat.data.response.type).toBe('summary_ready');
      const sessionId = chat.data.sessionId;

      const confirm = await postJson<{ response: { type: string; workflow: WorkflowDefinition } }>(
        `http://127.0.0.1:${port}/api/agent/confirm`,
        { sessionId }
      );
      expect(confirm.response.status).toBe(200);
      expect(confirm.data.response.type).toBe('workflow_ready');

      const create = await postJson<{ workflowId: string }>(
        `http://127.0.0.1:${port}/api/workflow/create`,
        { sessionId }
      );
      expect(create.response.status).toBe(200);
      expect(create.data.workflowId).toBe('wf_e2e_1');

      const start = await postJson<any>(
        `http://127.0.0.1:${port}/api/agent/start-config`,
        { sessionId }
      );
      expect(start.response.status).toBe(200);
      expect(['hot_plugging', 'config_input', 'select_single', 'image_upload']).toContain(
        start.data.response.type
      );
      expect(start.data.response.totalNodes).toBeGreaterThan(0);

      const finalResponse = await advanceConfigFlow(
        `http://127.0.0.1:${port}`,
        sessionId,
        start.data.response
      );
      expect(finalResponse.type).toBe('config_complete');
      expect(n8nClient.updateWorkflow).toHaveBeenCalled();

      const doneState = await getJson<any>(`http://127.0.0.1:${port}/api/agent/config-state?sessionId=${sessionId}`);
      expect(doneState.response.status).toBe(200);
      expect(doneState.data.data.pendingCount).toBe(0);
      expect(doneState.data.data.progress.percentage).toBe(100);
    } finally {
      await server.stop();
    }
  });
});
