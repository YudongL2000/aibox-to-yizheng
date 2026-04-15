/**
 * [INPUT]: 依赖 AgentService、RuntimeStatusMonitor 与 WebSocketServer
 * [OUTPUT]: 对外提供 WebSocket 通道、运行时状态推送、hardware status/command 帧、agent trace 流式事件与 dialogue-mode 透传
 * [POS]: agent-server 的实时通信入口，负责把后端编排过程、硬件 runtime 与对话模式状态实时推到前端
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

import { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { AgentService } from './agent-service';
import { RuntimeStatusMonitor } from './runtime-status';
import type { AgentTraceEvent } from '../agents/types';
import { logger } from '../utils/logger';

type IncomingMessage = {
  type:
    | 'user_message'
    | 'confirm_workflow'
    | 'start_config'
    | 'confirm_node'
    | 'get_config_state'
    | 'get_hardware_status'
    | 'hardware_command'
    | 'workflow_upload'
    | 'workflow_stop'
    | 'microphone_open'
    | 'microphone_close'
    | 'speaker_play'
    | 'get_runtime_status'
    | 'ping';
  sessionId?: string;
  message?: string;
  interactionMode?: 'dialogue' | 'teaching';
  teachingContext?: {
    originalPrompt?: string;
    prefilledGoal?: string;
    sourceSessionId?: string;
  } | null;
    data?: {
      sessionId?: string;
      workflowId?: string;
      workflowJson?: Record<string, unknown>;
      workflow?: Record<string, unknown>;
      nodeName?: string;
      portId?: string;
      topology?: string;
      device_ID?: string;
      TTS_input?: string;
      execute_emoji?: string;
      sub?: Record<string, string>;
      deviceType?: string;
      cmd?: string;
      extra?: Record<string, unknown>;
      audioName?: string;
      path?: string;
      text?: string;
    };
};

export function attachWebSocketServer(
  server: Server,
  agentService: AgentService,
  runtimeStatusMonitor?: RuntimeStatusMonitor
): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket) => {
    logger.info('Agent WebSocket connected');
    void sendRuntimeStatus(socket, runtimeStatusMonitor, false);
    const unsubscribeHardware = agentService.subscribeHardwareRuntime((status) => {
      void sendHardwareStatus(socket, status);
    });

    socket.on('message', async (data) => {
      try {
        const payload = JSON.parse(data.toString()) as IncomingMessage;
        if (payload.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        if (payload.type === 'get_runtime_status') {
          await sendRuntimeStatus(socket, runtimeStatusMonitor, true);
          return;
        }

        if (payload.type === 'get_hardware_status') {
          await sendHardwareStatus(socket, agentService.getHardwareRuntimeStatus(), true);
          return;
        }

        if (payload.type === 'confirm_workflow') {
          if (!payload.sessionId) {
            socket.send(JSON.stringify({ type: 'error', message: 'sessionId is required' }));
            return;
          }
          logger.debug('WebSocket: confirm request received', { sessionId: payload.sessionId });
          await streamSessionOperation(socket, agentService, payload.sessionId, async () => {
            const result = await agentService.confirm(payload.sessionId!);
            socket.send(
              JSON.stringify({
                type: 'agent_response',
                sessionId: result.sessionId,
                response: result.response,
              })
            );
          });
          void sendRuntimeStatus(socket, runtimeStatusMonitor, true);
          return;
        }

        if (payload.type === 'workflow_upload') {
          const sessionId = payload.sessionId ?? payload.data?.sessionId;
          const response = await agentService.uploadHardwareWorkflow(
            payload.data?.workflowJson ?? payload.data?.workflow,
            sessionId
          );
          socket.send(
            JSON.stringify({
              type: 'hardware_response',
              action: 'workflow_upload',
              data: response,
            })
          );
          return;
        }

        if (payload.type === 'workflow_stop') {
          const response = await agentService.stopHardwareWorkflow();
          socket.send(
            JSON.stringify({
              type: 'hardware_response',
              action: 'workflow_stop',
              data: response,
            })
          );
          return;
        }

        if (payload.type === 'microphone_open') {
          const response = await agentService.openMicrophone();
          socket.send(JSON.stringify({ type: 'hardware_response', action: 'microphone_open', data: response }));
          return;
        }

        if (payload.type === 'microphone_close') {
          const response = await agentService.closeMicrophone();
          socket.send(JSON.stringify({ type: 'hardware_response', action: 'microphone_close', data: response }));
          return;
        }

        if (payload.type === 'speaker_play') {
          const response = await agentService.playSpeaker({
            audioName: payload.data?.audioName,
            path: payload.data?.path,
            text: payload.data?.text,
          });
          socket.send(JSON.stringify({ type: 'hardware_response', action: 'speaker_play', data: response }));
          return;
        }

        if (payload.type === 'hardware_command') {
          if (!payload.data?.deviceType || !payload.data?.cmd) {
            socket.send(JSON.stringify({ type: 'error', message: 'deviceType and cmd are required' }));
            return;
          }
          const response = await agentService.sendHardwareCommand({
            deviceType: payload.data.deviceType,
            cmd: payload.data.cmd,
            extra: payload.data.extra ?? undefined,
          });
          socket.send(JSON.stringify({ type: 'hardware_response', action: 'hardware_command', data: response }));
          return;
        }

        if (payload.type === 'start_config') {
          const sessionId = payload.sessionId ?? payload.data?.sessionId;
          if (!sessionId) {
            socket.send(JSON.stringify({ type: 'error', message: 'sessionId is required' }));
            return;
          }
          logger.debug('WebSocket: start_config request received', {
            sessionId,
            hasWorkflowPayload: Boolean(payload.data?.workflowId && payload.data?.workflowJson),
          });
          await streamSessionOperation(socket, agentService, sessionId, async () => {
            if (payload.data?.workflowId && payload.data.workflowJson) {
              await agentService.initializeConfigAgent(
                sessionId,
                payload.data.workflowId,
                payload.data.workflowJson as any
              );
            }
            const response = agentService.startHardwareConfig(sessionId);
            socket.send(
              JSON.stringify({
                type: 'agent_response',
                sessionId,
                response,
              })
            );
          });
          void sendRuntimeStatus(socket, runtimeStatusMonitor, false);
          return;
        }

        if (payload.type === 'confirm_node') {
          const sessionId = payload.sessionId ?? payload.data?.sessionId;
          if (!sessionId) {
            socket.send(JSON.stringify({ type: 'error', message: 'sessionId is required' }));
            return;
          }
          logger.debug('WebSocket: confirm_node request received', {
            sessionId,
            nodeName: payload.data?.nodeName ?? null,
            portId: payload.data?.portId ?? null,
          });
          await streamSessionOperation(socket, agentService, sessionId, async () => {
            const response = payload.data?.nodeName
              ? await agentService.confirmNodeConfiguration(sessionId, payload.data.nodeName, {
                  portId: payload.data?.portId,
                  topology: payload.data?.topology,
                  device_ID: payload.data?.device_ID,
                  TTS_input: payload.data?.TTS_input,
                  execute_emoji: payload.data?.execute_emoji,
                  sub:
                    payload.data?.sub &&
                    typeof payload.data.sub === 'object' &&
                    !Array.isArray(payload.data.sub)
                      ? payload.data.sub
                      : undefined,
                })
              : await agentService.confirmNodeDeployed(sessionId);
            socket.send(
              JSON.stringify({
                type: 'agent_response',
                sessionId,
                response,
              })
            );
          });
          void sendRuntimeStatus(socket, runtimeStatusMonitor, false);
          return;
        }

        if (payload.type === 'get_config_state') {
          const sessionId = payload.sessionId ?? payload.data?.sessionId;
          if (!sessionId) {
            socket.send(JSON.stringify({ type: 'error', message: 'sessionId is required' }));
            return;
          }
          const state = agentService.getConfigState(sessionId);
          if (!state) {
            socket.send(JSON.stringify({ type: 'error', message: 'ConfigAgent not initialized' }));
            return;
          }
          socket.send(
            JSON.stringify({
              type: 'config_state',
              sessionId,
              data: {
                workflowId: state.workflowId,
                currentNode: state.configurableNodes[state.currentNodeIndex] ?? null,
                progress: state.progress ?? null,
              },
            })
          );
          return;
        }

        if (payload.type === 'user_message' && payload.message) {
          const sessionId = agentService.ensureSession(payload.sessionId);
          logger.debug('WebSocket: user message received', {
            sessionId,
            messageLength: payload.message.length,
          });
          await streamSessionOperation(socket, agentService, sessionId, async () => {
            const result = await agentService.chat(payload.message!, sessionId, {
              interactionMode: payload.interactionMode,
              teachingContext: payload.teachingContext ?? null,
            });
            socket.send(
              JSON.stringify({
                type: 'agent_response',
                sessionId: result.sessionId,
                response: result.response,
              })
            );
          });
          void sendRuntimeStatus(socket, runtimeStatusMonitor, true);
          return;
        }

        socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      } catch (error) {
        logger.warn('WebSocket message error', error);
        socket.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
      }
    });

    socket.on('close', () => {
      unsubscribeHardware?.();
      logger.info('Agent WebSocket disconnected');
    });
  });

  return wss;
}

async function streamSessionOperation(
  socket: WebSocket,
  agentService: AgentService,
  sessionId: string,
  operation: () => Promise<void>
): Promise<void> {
  const unsubscribe = agentService.subscribeTrace(sessionId, (event) => {
    sendTraceEvent(socket, event);
  });

  try {
    await operation();
  } finally {
    unsubscribe();
  }
}

function sendTraceEvent(socket: WebSocket, event: AgentTraceEvent): void {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(
    JSON.stringify({
      type: 'agent_trace',
      sessionId: event.sessionId,
      data: event,
    })
  );
}

async function sendHardwareStatus(
  socket: WebSocket,
  status: ReturnType<AgentService['getHardwareRuntimeStatus']> = null,
  forceRefresh = false
): Promise<void> {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(
    JSON.stringify({
      type: 'hardware_status',
      data: status,
      forceRefresh,
    })
  );
}

async function sendRuntimeStatus(
  socket: WebSocket,
  runtimeStatusMonitor?: RuntimeStatusMonitor,
  forceRefresh = false
): Promise<void> {
  if (!runtimeStatusMonitor || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  try {
    const snapshot = runtimeStatusMonitor.getSnapshot();
    if (!forceRefresh) {
      socket.send(
        JSON.stringify({
          type: 'runtime_status',
          data: snapshot,
        })
      );
    }

    const currentStatus = await runtimeStatusMonitor.getStatus(forceRefresh);
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    if (forceRefresh || JSON.stringify(snapshot) !== JSON.stringify(currentStatus)) {
      socket.send(
        JSON.stringify({
          type: 'runtime_status',
          data: currentStatus,
        })
      );
    }
  } catch (error) {
    logger.warn('WebSocket runtime status push error', error);
  }
}
