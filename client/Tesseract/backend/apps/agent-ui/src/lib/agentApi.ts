/**
 * [INPUT]: 依赖浏览器 fetch 与 Agent Backend HTTP 协议
 * [OUTPUT]: 对外提供 Agent API 类型、响应归一化与请求函数，承载 AI 反思/澄清动作协议
 * [POS]: agent-ui 的协议边界层，被 hooks 与组件复用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const API_URL = (import.meta.env.VITE_AGENT_API_URL || '').replace(/\/$/, '');

function resolveApiUrl(path: string): string {
  return API_URL ? `${API_URL}${path}` : path;
}

export interface WorkflowDefinition {
  name: string;
  nodes: Array<Record<string, unknown>>;
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface WorkflowBlueprint {
  intentSummary: string;
  triggers: Array<{ type: 'webhook' | 'scheduleTrigger'; config: Record<string, unknown> }>;
  logic: Array<{ type: 'if' | 'splitInBatches'; config: Record<string, unknown> }>;
  executors: Array<{ type: 'set' | 'httpRequest'; config: Record<string, unknown> }>;
  missingFields: string[];
}

export interface InteractionOption {
  label: string;
  value: string;
  reason?: string;
}

export interface InteractionRequest {
  id: string;
  mode: 'single' | 'multi' | 'image';
  field:
    | 'clarification_action'
    | 'tts_voice'
    | 'screen_emoji'
    | 'chassis_action'
    | 'hand_gestures'
    | 'yolo_gestures'
    | 'emotion_labels'
    | 'arm_actions'
    | 'face_profiles';
  title: string;
  description?: string;
  options: InteractionOption[];
  minSelections?: number;
  maxSelections?: number;
  selected?: string | string[];
  allowUpload?: boolean;
  uploadHint?: string;
}

export type HardwareNodeType = 'n8n-nodes-base.set' | 'n8n-nodes-base.httpRequest' | 'n8n-nodes-base.code';

export type NodeDeployStatus = 'pending' | 'configuring' | 'configured';

export interface NodeConfigFields {
  needsTopology: boolean;
  needsDeviceId: boolean;
  needsTtsInput: boolean;
  needsExecuteEmoji: boolean;
  subKeys?: string[];
}

export interface NodeConfigValues {
  topology?: string;
  device_ID?: string;
  TTS_input?: string;
  execute_emoji?: string;
  sub?: Record<string, string>;
}

export interface ConfigurableNode {
  name: string;
  type: HardwareNodeType;
  index: number;
  status: NodeDeployStatus;
  displayName: string;
  title?: string;
  subtitle?: string;
  category?: string;
  extra?: NodeDeployStatus;
  configFields?: NodeConfigFields;
  configValues?: NodeConfigValues;
}

export interface AgentResponse {
  type:
    | 'guidance'
    | 'summary_ready'
    | 'workflow_ready'
    | 'error'
    | 'select_single'
    | 'select_multi'
    | 'image_upload'
    | 'hot_plugging'
    | 'config_input'
    | 'config_complete';
  message: string;
  clarificationQuestions?: string[];
  blueprint?: WorkflowBlueprint;
  confirmedEntities?: Record<string, string>;
  missingInfo?: string[];
  workflow?: WorkflowDefinition;
  reasoning?: string;
  interaction?: InteractionRequest;
  totalNodes?: number;
  totalConfigured?: number;
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
  details?: unknown;
}

export interface AgentChatResponse {
  sessionId: string;
  response: AgentResponse;
}

export interface ConfigStateResult {
  success: boolean;
  data: {
    workflowId: string;
    currentNode: ConfigurableNode | null;
    progress: { total: number; completed: number; percentage: number } | null;
    pendingCount: number;
    configuredCount: number;
  };
}

export type AgentLLMStatusState = 'checking' | 'ready' | 'disabled' | 'degraded';
export type AgentLLMStatusCode =
  | 'ok'
  | 'disabled'
  | 'timeout'
  | 'network_error'
  | 'auth_error'
  | 'http_error';

export interface AgentRuntimeStatus {
  llm: {
    state: AgentLLMStatusState;
    code: AgentLLMStatusCode;
    enabled: boolean;
    provider: 'openai';
    model: string;
    baseUrl: string | null;
    message: string;
    checkedAt: string | null;
    latencyMs: number | null;
    probeTimeoutMs: number;
  };
}

export type AgentTracePhase =
  | 'intake'
  | 'capability_discovery'
  | 'reflection'
  | 'composition'
  | 'validation'
  | 'response';

export type AgentTraceKind = 'phase' | 'llm' | 'tool' | 'result';
export type AgentTraceStatus = 'started' | 'completed' | 'failed' | 'fallback' | 'info';
export type AgentTraceSource =
  | 'agent_service'
  | 'orchestrator'
  | 'reflection_engine'
  | 'component_composer'
  | 'workflow_validator'
  | 'llm_client';

export interface AgentTraceEvent {
  id: string;
  sessionId: string;
  sequence: number;
  timestamp: string;
  source: AgentTraceSource;
  phase: AgentTracePhase;
  kind: AgentTraceKind;
  status: AgentTraceStatus;
  title: string;
  detail?: string;
  data?: Record<string, unknown>;
}

export interface WorkflowCreateResult {
  workflowId: string;
  workflowName?: string;
  workflowUrl?: string;
}

export interface UploadFaceImageResult {
  success: boolean;
  profile?: string;
  fileId?: string;
  fileName?: string;
  url?: string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(resolveApiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Request failed');
  }

  return response.json() as Promise<T>;
}

function normalizeConfigResponse(response: unknown): AgentResponse {
  if (!response || typeof response !== 'object') {
    return {
      type: 'error',
      message: '服务返回格式异常',
    };
  }

  return response as AgentResponse;
}

export function normalizeAgentEnvelope(payload: unknown): AgentChatResponse {
  const raw = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const sessionId = typeof raw.sessionId === 'string' ? raw.sessionId : '';
  const response = normalizeConfigResponse(raw.response);

  return {
    sessionId,
    response,
  };
}

export async function uploadFaceImage(
  profile: string,
  fileName: string,
  contentBase64: string
): Promise<UploadFaceImageResult> {
  const response = await fetch(resolveApiUrl('/api/agent/upload-face'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, fileName, contentBase64 }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Upload failed');
  }

  return response.json() as Promise<UploadFaceImageResult>;
}

export async function sendAgentMessage(message: string, sessionId?: string): Promise<AgentChatResponse> {
  const result = await postJson<Record<string, unknown>>('/api/agent/chat', { message, sessionId });
  return normalizeAgentEnvelope(result);
}

export async function confirmAgentWorkflow(sessionId: string): Promise<AgentChatResponse> {
  const result = await postJson<Record<string, unknown>>('/api/agent/confirm-build', { sessionId });
  return normalizeAgentEnvelope(result);
}

export async function resetAgentSession(sessionId: string): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>('/api/agent/reset-session', { sessionId });
}

export async function createWorkflow(
  workflow: WorkflowDefinition,
  sessionId?: string
): Promise<WorkflowCreateResult> {
  return postJson<WorkflowCreateResult>('/api/workflow/create', {
    workflow,
    sessionId,
  });
}

export async function startHardwareConfig(sessionId: string): Promise<AgentChatResponse> {
  const result = await postJson<Record<string, unknown>>('/api/agent/start-config', { sessionId });
  return normalizeAgentEnvelope(result);
}

export async function confirmNodeDeployed(sessionId: string): Promise<AgentChatResponse> {
  const result = await postJson<Record<string, unknown>>('/api/agent/confirm-node', { sessionId });
  return normalizeAgentEnvelope(result);
}

export async function confirmNodeConfiguration(
  sessionId: string,
  nodeName: string,
  config?: NodeConfigValues
): Promise<AgentChatResponse> {
  const result = await postJson<Record<string, unknown>>('/api/agent/confirm-node', {
    sessionId,
    nodeName,
    ...(config || {}),
  });
  return normalizeAgentEnvelope(result);
}

export async function getConfigState(sessionId: string): Promise<ConfigStateResult> {
  const response = await fetch(
    resolveApiUrl(`/api/agent/config-state?sessionId=${encodeURIComponent(sessionId)}`)
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Request failed');
  }
  return response.json() as Promise<ConfigStateResult>;
}

export async function getAgentRuntimeStatus(): Promise<AgentRuntimeStatus | null> {
  const response = await fetch(resolveApiUrl('/api/agent/runtime-status'));
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Runtime status request failed');
  }

  const payload = await response.json() as {
    success?: boolean;
    data?: AgentRuntimeStatus | null;
  };

  return payload.data ?? null;
}
