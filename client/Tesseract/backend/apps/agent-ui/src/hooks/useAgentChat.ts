/**
 * [INPUT]: 依赖 agentApi 协议层、WebSocket 与 React 状态
 * [OUTPUT]: 对外提供聊天发送、工作流确认、配置同步、运行时状态、按消息锚定的 agent trace 流与手动刷新入口
 * [POS]: agent-ui 的前端状态机，负责对齐后端 Orchestrator/ConfigAgent 链路、AI 健康探测与消息内流式调试过程
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  confirmAgentWorkflow,
  confirmNodeConfiguration as confirmNodeConfigurationApi,
  confirmNodeDeployed as confirmNodeDeployedApi,
  createWorkflow as createWorkflowApi,
  getAgentRuntimeStatus,
  getConfigState,
  normalizeAgentEnvelope,
  resetAgentSession,
  sendAgentMessage,
  startHardwareConfig,
} from '../lib/agentApi';
import type {
  AgentResponse,
  AgentChatResponse,
  AgentTraceEvent,
  ConfigStateResult,
  ConfigurableNode,
  NodeConfigValues,
  WorkflowBlueprint,
  WorkflowCreateResult,
  WorkflowDefinition,
} from '../lib/agentApi';
import type { AgentRuntimeStatus } from '../lib/agentApi';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  workflow?: WorkflowDefinition;
  blueprint?: WorkflowBlueprint;
  reasoning?: string;
  interaction?: AgentResponse['interaction'];
  currentNode?: ConfigurableNode;
  progress?: { completed: number; total: number; percentage?: number };
  metadata?: {
    iterations?: number;
    nodeCount?: number;
    showContinueButton?: boolean;
    showConfirmBuildButton?: boolean;
    showConfirmButton?: boolean;
    workflowId?: string;
  };
  variant?: 'error' | 'normal';
  responseType?: AgentResponse['type'];
  clarificationQuestions?: string[];
  debugResponse?: {
    sessionId?: string;
    response: AgentResponse;
  };
}

export type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'error';
export type BuildStatus = 0 | 1 | 2 | 3;

export interface RuntimeSnapshot {
  sessionId?: string;
  responseType?: AgentResponse['type'];
  workflowId?: string;
  currentNode?: ConfigurableNode | null;
  progress?: { completed: number; total: number; percentage?: number } | null;
}

function toCompletedProgress(totalConfigured: number): {
  completed: number;
  total: number;
  percentage: number;
} {
  return {
    completed: totalConfigured,
    total: totalConfigured,
    percentage: 100,
  };
}

const WS_URL = resolveWebSocketUrl();

function resolveWebSocketUrl(): string {
  if (import.meta.env.VITE_AGENT_WS_URL) {
    return import.meta.env.VITE_AGENT_WS_URL;
  }

  if (typeof window !== 'undefined' && window.location.host) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  return 'ws://127.0.0.1:3006/ws';
}

export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [isBusy, setIsBusy] = useState(false);
  const [buildStatus, setBuildStatus] = useState<BuildStatus>(0);
  const [runtime, setRuntime] = useState<RuntimeSnapshot>({});
  const [runtimeStatus, setRuntimeStatus] = useState<AgentRuntimeStatus | null>(null);
  const [traceEvents, setTraceEvents] = useState<AgentTraceEvent[]>([]);
  const [traceByMessageId, setTraceByMessageId] = useState<Record<string, AgentTraceEvent[]>>({});
  const [activeTraceAnchorId, setActiveTraceAnchorId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const awaitingResponseRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const traceEventsRef = useRef<AgentTraceEvent[]>([]);
  const activeTraceAnchorRef = useRef<string | null>(null);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const updateRuntimeFromResponse = useCallback(
    (nextSessionId: string | undefined, response: AgentResponse) => {
      setRuntime((prev) => {
        const nextWorkflowId =
          ('metadata' in response ? response.metadata?.workflowId : undefined) ?? prev.workflowId;
        let nextProgress = prev.progress ?? null;
        if ('progress' in response) {
          nextProgress = response.progress ?? prev.progress ?? null;
        } else if (response.type === 'config_complete') {
          nextProgress = toCompletedProgress(response.totalConfigured ?? 0);
        }

        const nextCurrentNode =
          'currentNode' in response
            ? response.currentNode ?? null
            : response.type === 'workflow_ready' || response.type === 'config_complete'
              ? null
              : prev.currentNode ?? null;

        return {
          sessionId: nextSessionId ?? prev.sessionId,
          responseType: response.type,
          workflowId: nextWorkflowId,
          currentNode: nextCurrentNode,
          progress: nextProgress,
        };
      });
    },
    []
  );

  const applyConfigState = useCallback((payload: ConfigStateResult['data'], nextSessionId?: string) => {
    setRuntime((prev) => ({
      sessionId: nextSessionId ?? prev.sessionId,
      responseType: prev.responseType ?? 'hot_plugging',
      workflowId: payload.workflowId || prev.workflowId,
      currentNode: payload.currentNode,
      progress: payload.progress,
    }));
  }, []);

  const appendTraceEvent = useCallback((event: AgentTraceEvent) => {
    setTraceEvents((prev) => {
      const next = [...prev, event].slice(-80);
      traceEventsRef.current = next;
      return next;
    });
    if (event.sessionId) {
      setSessionId((prev) => prev ?? event.sessionId);
    }
  }, []);

  const beginTraceStream = useCallback((anchorId?: string | null) => {
    activeTraceAnchorRef.current = anchorId ?? null;
    traceEventsRef.current = [];
    setActiveTraceAnchorId(anchorId ?? null);
    setTraceEvents([]);
  }, []);

  const finalizeTraceStream = useCallback(() => {
    const anchorId = activeTraceAnchorRef.current;
    const events = traceEventsRef.current;
    if (anchorId && events.length > 0) {
      setTraceByMessageId((prev) => ({
        ...prev,
        [anchorId]: events,
      }));
    }

    activeTraceAnchorRef.current = null;
    traceEventsRef.current = [];
    setActiveTraceAnchorId(null);
    setTraceEvents([]);
  }, []);

  const appendErrorMessage = useCallback((message: string) => {
    finalizeTraceStream();
    awaitingResponseRef.current = false;
    setBuildStatus(0);
    setIsBusy(false);
    setRuntime((prev) => ({
      ...prev,
      responseType: 'error',
    }));
    appendMessage({
      id: `agent-error-${Date.now()}`,
      role: 'assistant',
      text: message,
      variant: 'error',
      responseType: 'error',
    });
  }, [appendMessage, finalizeTraceStream]);

  const handleAgentResponse = useCallback((payload: any) => {
    awaitingResponseRef.current = false;
    setIsBusy(false);
    const normalized = normalizeAgentEnvelope(payload);
    if (normalized.sessionId) {
      setSessionId(normalized.sessionId);
    }

    const response = normalized.response as AgentResponse | undefined;
    if (!response?.message) {
      return;
    }

    updateRuntimeFromResponse(normalized.sessionId, response);

    const workflow = 'workflow' in response ? response.workflow : undefined;
    const blueprint = 'blueprint' in response ? response.blueprint : undefined;
    const reasoning = 'reasoning' in response ? response.reasoning : undefined;
    const interaction = 'interaction' in response ? response.interaction : undefined;
    const currentNode = 'currentNode' in response ? response.currentNode : undefined;
    const metadata = 'metadata' in response ? response.metadata : undefined;
    const progress = 'progress' in response ? response.progress ?? undefined : undefined;

    if (response.type === 'workflow_ready') {
      setBuildStatus(2);
    } else if (response.type === 'config_complete') {
      setBuildStatus(3);
    } else if (response.type === 'hot_plugging' || response.type === 'config_input') {
      setBuildStatus(3); // Keep as built/deploying
    } else if (response.type === 'select_single' || response.type === 'select_multi' || response.type === 'image_upload') {
      const isConfigInteraction = Boolean(currentNode || metadata?.workflowId);
      setBuildStatus(isConfigInteraction ? 3 : 0);
    } else if (response.type === 'guidance' || response.type === 'summary_ready' || response.type === 'error') {
      setBuildStatus(0);
    }

    finalizeTraceStream();

    appendMessage({
      id: `agent-${Date.now()}`,
      role: 'assistant',
      text: response.message,
      workflow,
      blueprint,
      reasoning,
      interaction,
      currentNode: currentNode ?? undefined,
      progress,
      metadata,
      variant: response.type === 'error' ? 'error' : 'normal',
      responseType: response.type,
      clarificationQuestions:
        'clarificationQuestions' in response ? response.clarificationQuestions : undefined,
      debugResponse: {
        sessionId: normalized.sessionId || undefined,
        response,
      },
    });
  }, [appendMessage, finalizeTraceStream, updateRuntimeFromResponse]);

  const getCurrentConfigNode = useCallback((): ConfigurableNode | null => {
    if (runtime.currentNode) {
      return runtime.currentNode;
    }
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const current = messages[i]?.currentNode;
      if (current) {
        return current;
      }
    }
    return null;
  }, [messages, runtime.currentNode]);

  const getLatestMessageId = useCallback(() => {
    return messagesRef.current[messagesRef.current.length - 1]?.id ?? null;
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      return;
    }

    setStatus('connecting');
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      setStatus('open');
    });

    ws.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data as string);
        if (payload.type === 'agent_response') {
          handleAgentResponse(payload);
          return;
        }
        if (payload.type === 'config_state') {
          applyConfigState(payload.data, payload.sessionId);
          return;
        }
        if (payload.type === 'runtime_status' && payload.data) {
          setRuntimeStatus(payload.data as AgentRuntimeStatus);
          return;
        }
        if (payload.type === 'agent_trace' && payload.data) {
          appendTraceEvent(payload.data as AgentTraceEvent);
          return;
        }
        if (payload.type === 'error' && payload.message) {
          appendErrorMessage(payload.message);
        }
      } catch {
        // Ignore malformed payloads.
      }
    });

    ws.addEventListener('close', () => {
      setStatus('closed');
      wsRef.current = null;
      if (awaitingResponseRef.current) {
        appendErrorMessage('连接已断开，请重试。');
      } else {
        setIsBusy(false);
      }

      if (reconnectTimer.current === null) {
        reconnectTimer.current = window.setTimeout(() => {
          reconnectTimer.current = null;
          connectWebSocket();
        }, 1500);
      }
    });

    ws.addEventListener('error', () => {
      setStatus('error');
      if (awaitingResponseRef.current) {
        appendErrorMessage('连接异常，请稍后重试。');
      }
    });
  }, [appendErrorMessage, appendTraceEvent, applyConfigState, handleAgentResponse]);

  const refreshRuntimeStatus = useCallback(async () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'get_runtime_status' }));
      return;
    }

    try {
      const nextStatus = await getAgentRuntimeStatus();
      setRuntimeStatus(nextStatus);
    } catch (error) {
      setRuntimeStatus((prev) => prev ?? {
        llm: {
          state: 'degraded',
          code: 'network_error',
          enabled: true,
          provider: 'openai',
          model: 'unknown',
          baseUrl: null,
          message: error instanceof Error ? error.message : '无法获取运行状态',
          checkedAt: new Date().toISOString(),
          latencyMs: null,
          probeTimeoutMs: 0,
        },
      });
    }
  }, []);

  useEffect(() => {
    connectWebSocket();
    void refreshRuntimeStatus();

    return () => {
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
      }
      const socket = wsRef.current;
      if (socket) {
        if (socket.readyState === WebSocket.CONNECTING) {
          const handleOpen = () => {
            socket.removeEventListener('open', handleOpen);
            socket.close();
          };
          socket.addEventListener('open', handleOpen);
        } else {
          socket.close();
        }
      }
      wsRef.current = null;
    };
  }, [connectWebSocket, refreshRuntimeStatus]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        return;
      }

      const userMessageId = `user-${Date.now()}`;
      appendMessage({ id: userMessageId, role: 'user', text });
      beginTraceStream(userMessageId);
      setIsBusy(true);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        awaitingResponseRef.current = true;
        wsRef.current.send(
          JSON.stringify({
            type: 'user_message',
            sessionId,
            message: text,
          })
        );
        return;
      }

      try {
        const response = await sendAgentMessage(text, sessionId);
        handleAgentResponse({ type: 'agent_response', ...response });
      } finally {
        setIsBusy(false);
      }
    },
    [appendMessage, beginTraceStream, handleAgentResponse, sessionId]
  );

  const createWorkflow = useCallback(
    async (workflow: WorkflowDefinition): Promise<WorkflowCreateResult> => {
      const result = await createWorkflowApi(workflow, sessionId);
      setRuntime((prev) => ({
        ...prev,
        workflowId: result.workflowId || prev.workflowId,
      }));
      setBuildStatus(3);

      // Automatically start hardware configuration if session exists
      if (sessionId) {
        try {
          const configResponse = await startHardwareConfig(sessionId);
          handleAgentResponse(configResponse);
        } catch (error) {
          console.error('Failed to start hardware config:', error);
          // Optional: handle error visually
        }
      }

      return result;
    },
    [sessionId, handleAgentResponse]
  );

  const confirmNode = useCallback(async (configOverrides?: NodeConfigValues) => {
    if (!sessionId) {
      return;
    }
    beginTraceStream(getLatestMessageId());
    setIsBusy(true);
    const currentNode = getCurrentConfigNode();

    const buildConfigPayload = async () => {
      if (currentNode?.configValues && Object.keys(currentNode.configValues).length > 0) {
        return currentNode.configValues;
      }
      try {
        const state = await getConfigState(sessionId);
        const node = state.data.currentNode;
        return node?.configValues || {};
      } catch {
        return {};
      }
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      awaitingResponseRef.current = true;
      wsRef.current.send(
        JSON.stringify({
          type: 'confirm_node',
          data: {
            sessionId,
            nodeName: currentNode?.name,
            ...(configOverrides || {}),
          },
        })
      );
      return;
    }

    try {
      const mergedConfig = {
        ...(await buildConfigPayload()),
        ...(configOverrides || {}),
      };
      const response =
        currentNode?.name
          ? await confirmNodeConfigurationApi(sessionId, currentNode.name, mergedConfig)
          : await confirmNodeDeployedApi(sessionId);
      handleAgentResponse({ type: 'agent_response', ...response });
    } finally {
      setIsBusy(false);
    }
  }, [beginTraceStream, getCurrentConfigNode, getLatestMessageId, handleAgentResponse, sessionId]);

  const confirmWorkflow = useCallback(async () => {
    if (!sessionId) {
      return;
    }
    beginTraceStream(getLatestMessageId());
    setBuildStatus(1);
    setIsBusy(true);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      awaitingResponseRef.current = true;
      wsRef.current.send(
        JSON.stringify({
          type: 'confirm_workflow',
          sessionId,
        })
      );
      return;
    }

    try {
      const response = await confirmAgentWorkflow(sessionId);
      handleAgentResponse({ type: 'agent_response', ...response });
    } finally {
      setIsBusy(false);
    }
  }, [beginTraceStream, getLatestMessageId, handleAgentResponse, sessionId]);

  const syncCurrentConfigStep = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    beginTraceStream(getLatestMessageId());
    setIsBusy(true);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      awaitingResponseRef.current = true;
      wsRef.current.send(
        JSON.stringify({
          type: 'start_config',
          sessionId,
        })
      );
      return;
    }

    try {
      const response: AgentChatResponse = await startHardwareConfig(sessionId);
      handleAgentResponse({ type: 'agent_response', ...response });

      try {
        const configState = await getConfigState(sessionId);
        applyConfigState(configState.data, sessionId);
      } catch {
        // HTTP 状态同步失败时保持当前界面，不阻塞继续配置。
      }
    } catch (error) {
      appendErrorMessage(error instanceof Error ? error.message : '同步当前配置失败');
    } finally {
      setIsBusy(false);
    }
  }, [appendErrorMessage, applyConfigState, beginTraceStream, getLatestMessageId, handleAgentResponse, sessionId]);

  const restartConversation = useCallback(async () => {
    if (sessionId) {
      await resetAgentSession(sessionId).catch(() => undefined);
    }
    setMessages([]);
    setBuildStatus(0);
    setSessionId(undefined);
    activeTraceAnchorRef.current = null;
    traceEventsRef.current = [];
    setActiveTraceAnchorId(null);
    setTraceEvents([]);
    setTraceByMessageId({});
    setRuntime({});
    void refreshRuntimeStatus();
  }, [refreshRuntimeStatus, sessionId]);

  return {
    messages,
    status,
    isBusy,
    sendMessage,
    createWorkflow,
    confirmWorkflow,
    confirmNode,
    restartConversation,
    buildStatus,
    runtime,
    runtimeStatus,
    activeTraceAnchorId,
    traceEvents,
    traceByMessageId,
    refreshRuntimeStatus,
    syncCurrentConfigStep,
  };
}
