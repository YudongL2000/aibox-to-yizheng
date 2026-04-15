/**
 * [INPUT]: 依赖 AgentHttpServer 与 fetch
 * [OUTPUT]: 验证 HTTP server 的 chat、workflow、dialogue 与 hardware status/command 路由
 * [POS]: tests/unit/agent-server 的 HTTP 路由守护测试，兼顾 MQTT runtime 门面
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it } from 'vitest';
import { AgentHttpServer } from '../../../src/agent-server/server';

async function postJson<T>(url: string, body: unknown): Promise<{ response: Response; data: T }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { response, data: await response.json() as T };
}

describe('AgentHttpServer', () => {
  it('handles chat, workflow and dialogue endpoints', async () => {
    const agentService = {
      chat: async (_message: string, _sessionId?: string, options?: { interactionMode?: string }) => ({
        sessionId: 's1',
        response:
          options?.interactionMode === 'dialogue'
            ? {
                type: 'dialogue_mode',
                message: 'dialogue ok',
                dialogueMode: {
                  branch: 'instant_play',
                  phase: 'interacting',
                  skill: null,
                  hardware: {
                    source: 'backend_cache',
                    connectedComponents: [],
                    missingRequirements: [],
                    validationStatus: 'idle',
                    lastEventType: 'snapshot',
                    lastEventAt: new Date().toISOString(),
                  },
                  uiActions: [],
                  physicalCue: null,
                  teachingHandoff: null,
                },
              }
          : { type: 'guidance', message: 'ok' },
      }),
      getHardwareRuntimeStatus: () => ({
        enabled: true,
        connectionState: 'connected',
        broker: '127.0.0.1',
        port: 1883,
        deviceId: 'aibox001',
        topicSend: 'qsf/aibox001/cloud2edge',
        topicRecv: 'qsf/aibox001/edge2cloud',
        keepalive: 60,
        lastConnectedAt: new Date().toISOString(),
        lastDisconnectedAt: null,
        lastHeartbeatAt: new Date().toISOString(),
        lastCommandAt: null,
        lastError: null,
        latestHeartbeat: null,
        dialogueHardware: {
          source: 'mqtt_runtime',
          connectedComponents: [],
          missingRequirements: [],
          validationStatus: 'idle',
          lastEventType: 'snapshot',
          lastEventAt: new Date().toISOString(),
        },
        digitalTwinScene: {
          display_mode: 'multi_scene',
          base_model_id: 'model_5',
          interfaces: [
            { id: 'port_1', label: '接口1 · 3-1.2', kind: 'side' },
            { id: 'port_2', label: '接口2 · 3-1.3', kind: 'side' },
            { id: 'port_3', label: '接口3 · 3-1.4', kind: 'side' },
            { id: 'port_4', label: '接口4 · 3-1.6', kind: 'side' },
            { id: 'port_7', label: '接口7 · 3-1.7', kind: 'bottom' },
          ],
          top_controls: [
            { id: 'builtin_microphone', role: 'microphone', status: 'idle' },
            { id: 'builtin_speaker', role: 'speaker', status: 'idle' },
          ],
          models: [],
        },
        lastCommand: null,
        message: 'ok',
      }),
      uploadHardwareWorkflow: async () => ({
        kind: 'workflow_upload',
        requestId: 'req-1',
        topic: 'qsf/aibox001/cloud2edge',
        payload: {},
        publishedAt: new Date().toISOString(),
        status: 'sent',
        response: null,
        responseAt: null,
      }),
      stopHardwareWorkflow: async () => ({
        kind: 'workflow_stop',
        requestId: 'req-2',
        topic: 'qsf/aibox001/cloud2edge',
        payload: {},
        publishedAt: new Date().toISOString(),
        status: 'sent',
        response: null,
        responseAt: null,
      }),
      sendHardwareCommand: async (params: { deviceType: string; cmd: string }) => ({
        kind:
          params.deviceType === 'microphone' && params.cmd === 'open'
            ? 'microphone_open'
            : params.deviceType === 'microphone' && params.cmd === 'close'
              ? 'microphone_close'
              : params.deviceType === 'speaker' && params.cmd === 'play'
                ? 'speaker_play'
                : 'hardware_command',
        requestId: 'req-3',
        topic: 'qsf/aibox001/cloud2edge',
        payload: {},
        publishedAt: new Date().toISOString(),
        status: 'sent',
        response: null,
        responseAt: null,
      }),
      openMicrophone: async () => ({
        kind: 'microphone_open',
        requestId: 'req-4',
        topic: 'qsf/aibox001/cloud2edge',
        payload: {},
        publishedAt: new Date().toISOString(),
        status: 'sent',
        response: null,
        responseAt: null,
      }),
      closeMicrophone: async () => ({
        kind: 'microphone_close',
        requestId: 'req-5',
        topic: 'qsf/aibox001/cloud2edge',
        payload: {},
        publishedAt: new Date().toISOString(),
        status: 'sent',
        response: null,
        responseAt: null,
      }),
      playSpeaker: async () => ({
        kind: 'speaker_play',
        requestId: 'req-6',
        topic: 'qsf/aibox001/cloud2edge',
        payload: {},
        publishedAt: new Date().toISOString(),
        status: 'sent',
        response: null,
        responseAt: null,
      }),
      validateDialogueHardware: () => ({
        type: 'dialogue_mode',
        message: 'ready',
        dialogueMode: {
          branch: 'hardware_guidance',
          phase: 'ready_to_deploy',
          skill: null,
          hardware: {
            source: 'miniclaw_ws',
            connectedComponents: [],
            missingRequirements: [],
            validationStatus: 'success',
            lastEventType: 'snapshot',
            lastEventAt: new Date().toISOString(),
          },
          uiActions: [{ id: 'start_deploy', label: '开始部署', kind: 'primary', enabled: true }],
          physicalCue: null,
          teachingHandoff: null,
        },
      }),
      startDialogueDeploy: () => ({
        type: 'dialogue_mode',
        message: 'deploy',
        dialogueMode: {
          branch: 'hardware_guidance',
          phase: 'interacting',
          skill: null,
          hardware: {
            source: 'miniclaw_ws',
            connectedComponents: [],
            missingRequirements: [],
            validationStatus: 'success',
            lastEventType: 'snapshot',
            lastEventAt: new Date().toISOString(),
          },
          uiActions: [],
          physicalCue: { action: 'wake', autoTrigger: true },
          teachingHandoff: null,
        },
      }),
      getWorkflow: () => null,
    } as any;

    const workflowService = {
      createWorkflow: async () => ({ workflowId: 'w1', workflowName: 'WF', workflowUrl: 'http://localhost:5678/workflow/w1' }),
    } as any;

    const server = new AgentHttpServer(agentService, workflowService);
    const { port } = await server.start({ host: '127.0.0.1', port: 0 });

    try {
      const chatResult = await postJson<{ sessionId: string }>(
        `http://127.0.0.1:${port}/api/agent/chat`,
        { message: 'hello' }
      );
      expect(chatResult.response.status).toBe(200);
      expect(chatResult.data.sessionId).toBe('s1');

      const dialogueResult = await postJson<{ sessionId: string; response: { type: string } }>(
        `http://127.0.0.1:${port}/api/agent/chat`,
        { message: '跟我玩石头剪刀布', interactionMode: 'dialogue' }
      );
      expect(dialogueResult.response.status).toBe(200);
      expect(dialogueResult.data.response.type).toBe('dialogue_mode');

      const validateResult = await postJson<{ sessionId: string; response: { type: string } }>(
        `http://127.0.0.1:${port}/api/agent/dialogue/validate-hardware`,
        {
          sessionId: 's1',
          event: {
            source: 'miniclaw_ws',
            eventType: 'device_inserted',
            component: {
              componentId: 'mechanical_hand',
              deviceId: 'hand-001',
              modelId: 'claw-v1',
              displayName: '机械手',
              portId: 'port_2',
              status: 'connected',
            },
          },
        }
      );
      expect(validateResult.response.status).toBe(200);
      expect(validateResult.data.response.type).toBe('dialogue_mode');

      const startDeployResult = await postJson<{ sessionId: string; response: { type: string } }>(
        `http://127.0.0.1:${port}/api/agent/dialogue/start-deploy`,
        { sessionId: 's1' }
      );
      expect(startDeployResult.response.status).toBe(200);
      expect(startDeployResult.data.response.type).toBe('dialogue_mode');

      const workflowResult = await postJson<{ workflowId: string }>(
        `http://127.0.0.1:${port}/api/workflow/create`,
        { workflow: { name: 'WF', nodes: [], connections: {} } }
      );
      expect(workflowResult.response.status).toBe(200);
      expect(workflowResult.data.workflowId).toBe('w1');

      const hardwareStatus = await fetch(`http://127.0.0.1:${port}/api/agent/hardware/status`);
      expect(hardwareStatus.status).toBe(200);
      const hardwareStatusJson = await hardwareStatus.json() as {
        data: { connectionState: string; digitalTwinScene: { interfaces: Array<{ id: string }> } };
      };
      expect(hardwareStatusJson.data.connectionState).toBe('connected');
      expect(hardwareStatusJson.data.digitalTwinScene.interfaces).toHaveLength(5);

      const uploadResult = await postJson<{ success: boolean; data: { kind: string } }>(
        `http://127.0.0.1:${port}/api/agent/hardware/workflow/upload`,
        { workflow: { name: 'WF', nodes: [], connections: {} } }
      );
      expect(uploadResult.response.status).toBe(200);
      expect(uploadResult.data.data.kind).toBe('workflow_upload');

      const commandResult = await postJson<{ success: boolean; data: { kind: string } }>(
        `http://127.0.0.1:${port}/api/agent/hardware/command`,
        { deviceType: 'microphone', cmd: 'open' }
      );
      expect(commandResult.response.status).toBe(200);
      expect(commandResult.data.data.kind).toBe('microphone_open');

      const stopResult = await postJson<{ success: boolean; data: { kind: string } }>(
        `http://127.0.0.1:${port}/api/agent/hardware/workflow/stop`,
        {}
      );
      expect(stopResult.response.status).toBe(200);
      expect(stopResult.data.data.kind).toBe('workflow_stop');
    } finally {
      await server.stop();
    }
  });
});
