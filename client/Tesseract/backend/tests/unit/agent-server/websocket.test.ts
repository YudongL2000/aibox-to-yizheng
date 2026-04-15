/**
 * [INPUT]: 依赖 attachWebSocketServer、ws 与共享 WebSocket 测试助手
 * [OUTPUT]: 验证 websocket 服务端可接受连接并返回 agent_response / hardware_response
 * [POS]: tests/unit/agent-server 的 WebSocket 单元测试，兼顾 runtime_status 与 MQTT hardware status
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it, vi } from 'vitest';
import http from 'http';
import WebSocket from 'ws';
import { attachWebSocketServer } from '../../../src/agent-server/websocket';
import { createStaticRuntimeStatusMonitor } from '../../../src/agent-server/runtime-status';
import {
  waitForWebSocketMessageType,
  waitForWebSocketOpen,
} from '../../utils/test-helpers';

describe('Agent WebSocket server', () => {
  it('accepts websocket connections and returns responses', async () => {
    const traceListeners = new Map<string, (event: any) => void>();
    const hardwareListeners = new Set<(status: any) => void>();
    const server = http.createServer();
    const agentService = {
      ensureSession: vi.fn().mockReturnValue('session-1'),
      subscribeTrace: vi.fn().mockImplementation((sessionId: string, listener: (event: any) => void) => {
        traceListeners.set(sessionId, listener);
        return () => traceListeners.delete(sessionId);
      }),
      subscribeHardwareRuntime: vi.fn().mockImplementation((listener: (status: any) => void) => {
        hardwareListeners.add(listener);
        listener({
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
              { id: 'port_1', label: '接口1 · 3-1.2' },
              { id: 'port_2', label: '接口2 · 3-1.3' },
              { id: 'port_3', label: '接口3 · 3-1.4' },
              { id: 'port_4', label: '接口4 · 3-1.6' },
              { id: 'port_7', label: '接口7 · 3-1.7' },
            ],
            top_controls: [
              { id: 'builtin_microphone', role: 'microphone', status: 'idle' },
              { id: 'builtin_speaker', role: 'speaker', status: 'idle' },
            ],
            models: [],
          },
          lastCommand: null,
          message: 'ok',
        });
        return () => hardwareListeners.delete(listener);
      }),
      getHardwareRuntimeStatus: vi.fn().mockReturnValue({
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
            { id: 'port_1', label: '接口1 · 3-1.2' },
            { id: 'port_2', label: '接口2 · 3-1.3' },
            { id: 'port_3', label: '接口3 · 3-1.4' },
            { id: 'port_4', label: '接口4 · 3-1.6' },
            { id: 'port_7', label: '接口7 · 3-1.7' },
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
      sendHardwareCommand: vi.fn().mockResolvedValue({
        kind: 'hardware_command',
        requestId: 'req-1',
        topic: 'qsf/aibox001/cloud2edge',
        payload: {},
        publishedAt: new Date().toISOString(),
        status: 'sent',
        response: null,
        responseAt: null,
      }),
      chat: vi.fn().mockResolvedValue({
        sessionId: 'session-1',
        response: { type: 'guidance', message: 'hello' },
      }),
      openMicrophone: vi.fn().mockResolvedValue({
        kind: 'microphone_open',
        requestId: 'req-2',
        topic: 'qsf/aibox001/cloud2edge',
        payload: {},
        publishedAt: new Date().toISOString(),
        status: 'sent',
        response: null,
        responseAt: null,
      }),
    };
    agentService.chat.mockImplementation(async () => {
      traceListeners.get('session-1')?.({
        id: 'session-1:1',
        sessionId: 'session-1',
        sequence: 1,
        timestamp: new Date().toISOString(),
        source: 'agent_service',
        phase: 'intake',
        kind: 'phase',
        status: 'started',
        title: '收到用户输入',
        detail: 'hi',
      });
      return {
        sessionId: 'session-1',
        response: { type: 'guidance', message: 'hello' },
      };
    });
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
        latencyMs: 20,
        probeTimeoutMs: 5000,
      },
    });

    attachWebSocketServer(server, agentService as any, runtimeStatusMonitor);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to bind test server');
    }

    const ws = new WebSocket(`ws://127.0.0.1:${address.port}/ws`);
    await waitForWebSocketOpen(ws);
    const runtimeStatus = await waitForWebSocketMessageType<{ type: string; data: { llm: { state: string } } }>(
      ws,
      'runtime_status'
    );
    expect(runtimeStatus.data.llm.state).toBe('ready');

    const hardwareStatus = await waitForWebSocketMessageType<{ type: string; data: { connectionState: string } }>(
      ws,
      'hardware_status'
    );
    expect(hardwareStatus.data.connectionState).toBe('connected');
    expect((hardwareStatus.data as { digitalTwinScene: { interfaces: Array<{ id: string }> } }).digitalTwinScene.interfaces).toHaveLength(5);

    ws.send(JSON.stringify({ type: 'user_message', message: 'hi' }));
    const tracePayload = await waitForWebSocketMessageType<{ type: string; data: { title: string } }>(
      ws,
      'agent_trace'
    );
    expect(tracePayload.data.title).toBe('收到用户输入');
    const parsed = await waitForWebSocketMessageType<{ type: string; response: { message: string } }>(
      ws,
      'agent_response'
    );
    expect(parsed.type).toBe('agent_response');
    expect(parsed.response.message).toBe('hello');

    ws.send(JSON.stringify({ type: 'hardware_command', data: { deviceType: 'microphone', cmd: 'open' } }));
    const hardwareResponse = await waitForWebSocketMessageType<{ type: string; action: string }>(
      ws,
      'hardware_response'
    );
    expect(hardwareResponse.action).toBe('hardware_command');
    expect(agentService.sendHardwareCommand).toHaveBeenCalled();

    ws.close();
    await new Promise((resolve) => server.close(resolve));
  });
});
