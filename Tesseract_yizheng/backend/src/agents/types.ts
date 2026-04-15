/**
 * [INPUT]: 无（基础领域类型定义）
 * [OUTPUT]: 对外提供 Agent 领域模型、Workflow 相关类型与 trace 协议定义
 * [POS]: agents 的类型中枢，被 Intake/Config/Architect/Server/Frontend 协议层共同依赖
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export type AgentPhase = 'understanding' | 'generating' | 'deploying' | 'configuring';

export type AgentResponseType =
  | 'guidance'
  | 'summary_ready'
  | 'workflow_ready'
  | 'dialogue_mode'
  | 'hot_plugging'
  | 'config_input'
  | 'config_complete'
  | 'error'
  | 'select_single'
  | 'select_multi'
  | 'image_upload';

export type InteractionField =
  | 'clarification_action'
  | 'hardware_port'
  | 'tts_voice'
  | 'emotion_source'
  | 'screen_emoji'
  | 'chassis_action'
  | 'hand_gestures'
  | 'yolo_gestures'
  | 'emotion_labels'
  | 'arm_actions'
  | 'face_profiles';
export type ClarificationCategory =
  | 'trigger'
  | 'action'
  | 'condition'
  | 'feedback'
  | 'logic';

export interface InteractionOption {
  label: string;
  value: string;
  reason?: string;
  category?: ClarificationCategory;
}

export interface InteractionRequest {
  id: string;
  mode: 'single' | 'multi' | 'image';
  field: InteractionField;
  title: string;
  description?: string;
  options: InteractionOption[];
  minSelections?: number;
  maxSelections?: number;
  selected?: string | string[];
  allowUpload?: boolean;
  uploadHint?: string;
}

// ============================================================
// Hardware Capability 类型定义（Refactor-3 基础设施）
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
// ============================================================

export interface HardwareCapabilityEndpoint {
  url: string;
  method: string;
  parameters?: Record<string, unknown>;
}

export interface HardwareCapability {
  id: string;
  component: string;
  capability: string;
  displayName: string;
  keywords: string[];
  nodeType: string;
  category: NodeCategory;
  apiEndpoint: HardwareCapabilityEndpoint;
  dependencies: string[];
  confidence: number;
  aliases?: string[];
}

export interface Intent {
  category: string;
  entities: Record<string, string>;
  confidence: number;
  missingInfo?: string[];
}

export interface DiscoveredEntity {
  name: string;
  key: string;
  bindings: Record<string, string>;
}

export interface EnhancedDiscoveryResult {
  capabilityIds: string[];
  searchTerms: string[];
  recognizedRequirements: string[];
  reasoningSummary?: string;
  entities: DiscoveredEntity[];
  topologyHint: string;
}

export interface WorkflowDefinition {
  name: string;
  nodes: Array<Record<string, unknown>>;
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface CachedComplexWorkflow {
  workflow: WorkflowDefinition;
  capabilityIds: string[];
  userIntent: string;
  topologyHint?: string;
  savedAt: string;
}

// ============================================================
// NodeCategory & NodeNotes 类型定义（基于 game_nodes.md）
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
// ============================================================

/** 节点功能分类 */
export type NodeFunctionType = 'trigger' | 'sensor' | 'processor' | 'executor' | 'logic';

/** 节点类别 */
export type NodeCategory =
  | 'BASE'
  | 'CAM'
  | 'MIC'
  | 'WHEEL'
  | 'FACE-NET'
  | 'YOLO-HAND'
  | 'YOLO-RPS'
  | 'ASR'
  | 'LLM'
  | 'LLM-EMO'
  | 'TTS'
  | 'RAM'
  | 'ASSIGN'
  | 'HAND'
  | 'SPEAKER'
  | 'SCREEN';

/** notes.extra 状态流转 */
export type NodeExtraStatus = 'pending' | 'configuring' | 'configured';

/** notes.sub 节点特定参数 */
export interface NodeSubParams {
  // BASE (scheduleTrigger)
  seconds?: number;
  // CAM
  output?: string;
  // MIC
  mic_output?: string;
  // FACE-NET
  facenet_input?: string;
  facenet_output?: string;
  face_info?: string;
  // YOLO-HAND / YOLO-RPS
  yolov_input?: string;
  yolov_output?: string;
  // ASR
  asr_input?: string;
  asr_output?: string;
  // LLM / LLM-EMO
  prompt?: string;
  llm_emo_input?: string;
  llm_emo_output?: string;
  // TTS
  TTS_input?: string;
  audio_name?: string;
  // RAM
  random_rule?: number;
  // ASSIGN
  robotGesture?: string;
  // HAND
  execute_gesture?: string;
  // SCREEN
  execute_emoji?: string;
  // IF 元数据（用于多分支执行器拆分）
  expected_screen_emoji?: string;
  expected_gesture?: string;
  expected_hand_gesture?: string;
  expected_emoji?: string;
}

/** 节点 notes 字段结构 */
export interface NodeNotes {
  title: string;
  subtitle: string;
  category: NodeCategory;
  session_ID: string;
  extra: NodeExtraStatus;
  topology?: string | null;
  device_ID?: string | null;
  sub?: NodeSubParams;
}

/** 逻辑器节点类型（不进入 ConfigAgent 配置） */
export const LOGIC_NODE_TYPES = [
  'n8n-nodes-base.if',
  'n8n-nodes-base.switch',
  'n8n-nodes-base.merge',
  'n8n-nodes-base.noOp',
] as const;

/** ConfigAgent 需要用户确认的 sub 字段 */
export const CONFIG_AGENT_FIELDS: (keyof NodeSubParams)[] = ['TTS_input', 'execute_emoji'];

/** 硬件相关节点类别 */
export const HARDWARE_CATEGORIES: NodeCategory[] = [
  'CAM',
  'MIC',
  'WHEEL',
  'HAND',
  'SPEAKER',
  'SCREEN',
];

/** ConfigAgent 跳过配置的 category（处理器，无硬件组装需求） */
export const CONFIG_SKIP_CATEGORIES: NodeCategory[] = [
  'YOLO-HAND',
  'YOLO-RPS',
  'ASR',
  'LLM',
  'LLM-EMO',
  'RAM',
  'ASSIGN',
  'BASE',
];

/** ConfigAgent 需要配置的 category（含硬件组装或用户输入） */
export const CONFIG_REQUIRED_CATEGORIES: NodeCategory[] = [
  'TTS',
  'SPEAKER',
  'CAM',
  'MIC',
  'WHEEL',
  'HAND',
  'SCREEN',
  'FACE-NET',
];

/** 硬件节点类型（需要拼装的节点） */
export type HardwareNodeType =
  | 'n8n-nodes-base.set'
  | 'n8n-nodes-base.httpRequest'
  | 'n8n-nodes-base.code';

/** 节点部署状态（与 notes.extra 对齐） */
export type NodeDeployStatus = NodeExtraStatus;

/** 待配置节点信息 */
export interface ConfigurableNode {
  /** 节点名称 */
  name: string;
  /** 节点类型 */
  type: HardwareNodeType;
  /** 节点类别 */
  category?: NodeCategory;
  /** 前端标题 */
  title?: string;
  /** 前端副标题 */
  subtitle?: string;
  /** extra 状态 */
  extra?: NodeExtraStatus;
  /** 节点在 workflow.nodes 数组中的索引 */
  index: number;
  /** 部署状态 */
  status: NodeDeployStatus;
  /** 节点显示名称（用于前端展示） */
  displayName: string;
  /** 所属条件分支标题（例如“如果用户的情绪是开心”） */
  branchTitle?: string;
  /** 需要配置的字段 */
  configFields?: {
    needsTopology: boolean;
    needsDeviceId: boolean;
    needsTtsInput: boolean;
    needsExecuteEmoji: boolean;
    subKeys?: string[];
  };
  /** 已配置字段值 */
  configValues?: {
    portId?: string;
    topology?: string;
    device_ID?: string;
    TTS_input?: string;
    execute_emoji?: string;
    sub?: Record<string, string>;
  };
}

/** ConfigAgent 会话状态 */
export interface ConfigAgentState {
  /** n8n 实例返回的 workflowId */
  workflowId: string;
  /** 留存的工作流 JSON */
  workflowSnapshot: WorkflowDefinition;
  /** 待配置节点列表（按顺序） */
  configurableNodes: ConfigurableNode[];
  /** 当前正在配置的节点索引 */
  currentNodeIndex: number;
  /** 软件侧配置是否完成 */
  completed: boolean;
  /** 纯硬件拼装是否全部完成 */
  assemblyCompleted?: boolean;
  /** 是否已经进入可下发/可存储的最终可操作态 */
  actionReady?: boolean;
  /** 尚未完成拼装确认的硬件节点名称 */
  pendingHardwareNodeNames?: string[];
  /** 进度 */
  progress?: {
    total: number;
    completed: number;
    percentage: number;
  };
  /** 当前配置对话待处理步骤 */
  pendingPrompt?: {
    nodeName: string;
    step:
      | 'tts_modify_confirm'
      | 'tts_input'
      | 'screen_modify_confirm'
      | 'screen_emoji_select'
      | 'face_upload';
    defaultTtsInput?: string;
    defaultEmoji?: string;
    defaultFaceProfile?: string;
  };
}

export interface WorkflowBlueprint {
  intentSummary: string;
  triggers: Array<{ type: 'webhook' | 'scheduleTrigger'; config: Record<string, unknown> }>;
  logic: Array<{ type: 'if' | 'splitInBatches'; config: Record<string, unknown> }>;
  executors: Array<{ type: 'set' | 'httpRequest'; config: Record<string, unknown> }>;
  missingFields: string[];
  componentSelection?: {
    trigger: string;
    inputs: string[];
    processes: string[];
    decisions: string[];
    outputs: string[];
    topology: string;
    minimumNodes: number;
    componentAssembly: string[];
  };
}

export interface OrchestratorState {
  phase: 'capability_discovery' | 'reflection' | 'composition' | 'validation';
  decision?: 'direct_accept' | 'clarify_needed' | 'reject_out_of_scope';
  userIntent: string;
  capabilityIds: string[];
  searchKeywords: string[];
  entities?: DiscoveredEntity[];
  topologyHint?: string;
  missingFields: string[];
  pendingQuestions: string[];
  pendingActions?: InteractionOption[];
  reasoningSummary?: string;
  recognizedRequirements?: string[];
  outOfScopeReasons?: string[];
  summary?: string;
  confidence: number;
  complete: boolean;
  canProceed: boolean;
  confirmedCategories?: string[];
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

export interface AgentTraceEventInput {
  source: AgentTraceSource;
  phase: AgentTracePhase;
  kind: AgentTraceKind;
  status: AgentTraceStatus;
  title: string;
  detail?: string;
  data?: Record<string, unknown>;
}

export type AgentTraceListener = (event: AgentTraceEvent) => void;
export type AgentTraceWriter = (event: AgentTraceEventInput) => void;
export type DigitalTwinScenePayload = Record<string, unknown>;

export type DialogueModeBranch =
  | 'instant_play'
  | 'hardware_guidance'
  | 'proxy_chat'
  | 'teaching_handoff'
  | 'validation_failed';

export type DialogueModePhase =
  | 'idle'
  | 'matching_skill'
  | 'checking_hardware'
  | 'waiting_for_insert'
  | 'validating_insert'
  | 'ready_to_deploy'
  | 'deploying'
  | 'interacting'
  | 'handoff_ready'
  | 'failed';

export type DialogueModeInteractionMode = 'dialogue' | 'teaching';
export type DialogueModeSkillMatchStatus = 'matched' | 'ambiguous' | 'unmatched';
export type DialogueModeHardwareSource = 'miniclaw_ws' | 'mqtt_proxy' | 'mqtt_runtime' | 'backend_cache';
export type DialogueModeHardwareValidationStatus = 'idle' | 'pending' | 'success' | 'failure' | 'timeout';
export type DialogueModeHardwareEventType =
  | 'device_inserted'
  | 'device_removed'
  | 'device_ready'
  | 'device_error'
  | 'heartbeat'
  | 'snapshot'
  | 'error';
export type DialogueModeUiActionKind = 'primary' | 'secondary' | 'ghost';
export type DialogueModePhysicalAction = 'hand_stretch' | 'wake' | 'none';
export type DialogueModeRelayTarget = 'mimiclaw_ws';

export interface DialogueModeHardwareRequirement {
  componentId: string;
  displayName: string;
  requiredCapability: string;
  acceptablePorts: string[];
  requiredModelIds: string[];
  isOptional: boolean;
}

export interface DialogueModeHardwareComponent {
  componentId: string;
  deviceId: string;
  modelId: string;
  displayName: string;
  portId: string;
  status: 'connected' | 'validating' | 'ready' | 'error' | 'removed';
}

export interface DialogueModeHardwareEventInput {
  source: DialogueModeHardwareSource;
  eventType: DialogueModeHardwareEventType;
  timestamp?: string;
  component?: Partial<DialogueModeHardwareComponent> & {
    raw?: Record<string, unknown>;
  };
  connectedComponents?: Array<Partial<DialogueModeHardwareComponent> & {
    raw?: Record<string, unknown>;
  }>;
  raw?: Record<string, unknown>;
}

export interface DialogueModeHardwareSnapshot {
  source: DialogueModeHardwareSource;
  connectedComponents: DialogueModeHardwareComponent[];
  missingRequirements: DialogueModeHardwareRequirement[];
  validationStatus: DialogueModeHardwareValidationStatus;
  lastEventType: DialogueModeHardwareEventType | 'snapshot';
  lastEventAt: string;
  failureReason?: string;
}

export interface DialogueModePhysicalCue {
  action: DialogueModePhysicalAction;
  autoTrigger: boolean;
  targetComponentId?: string;
  metadata?: Record<string, string>;
}

export interface DialogueModeMatchedSkill {
  skillId: string;
  displayName: string;
  matchStatus: DialogueModeSkillMatchStatus;
  confidence: number;
  gameplayGuide: string;
  requiredHardware: DialogueModeHardwareRequirement[];
  initialPhysicalCue?: DialogueModePhysicalCue;
}

export interface DialogueModeLibrarySkillPreview {
  skillId: string;
  displayName: string;
  summary: string;
  tags: string[];
  wakePrompt: string;
  requiredHardware: DialogueModeHardwareRequirement[];
  workflowId: string;
  workflowName: string;
  sourceSessionId: string;
  workflow: WorkflowDefinition;
}

export interface SkillSaveCandidate {
  skillId: string;
  displayName: string;
  summary: string;
  keywords: string[];
  gameplayGuide: string;
  requiredHardware: DialogueModeHardwareRequirement[];
  initialPhysicalCue?: DialogueModePhysicalCue;
  workflowId: string;
  workflowName: string;
  sourceSessionId: string;
}

export interface SkillLibraryRecord extends SkillSaveCandidate {
  workflow: WorkflowDefinition;
  createdAt: string;
  updatedAt: string;
}

export interface DialogueModeTeachingHandoff {
  sourceSessionId: string;
  originalPrompt: string;
  prefilledGoal: string;
  entryMode: 'dialogue_handoff';
  createdAt: string;
}

export interface DialogueModeUiAction {
  id: string;
  label: string;
  kind: DialogueModeUiActionKind;
  enabled: boolean;
  payload?: Record<string, unknown> | null;
}

export interface DialogueModeRelay {
  target: DialogueModeRelayTarget;
  message: string;
  chatId?: string;
}

export interface DialogueModeDeploymentPrompt {
  visible: boolean;
  status: 'hidden' | 'visible' | 'confirmed' | 'revoked';
  message: string;
  wakeCue?: DialogueModePhysicalCue | null;
}

export interface DialogueModeEnvelope {
  branch: DialogueModeBranch;
  phase: DialogueModePhase;
  skill: DialogueModeMatchedSkill | null;
  librarySkills: DialogueModeLibrarySkillPreview[];
  hardware: DialogueModeHardwareSnapshot;
  uiActions: DialogueModeUiAction[];
  physicalCue: DialogueModePhysicalCue | null;
  relay?: DialogueModeRelay | null;
  teachingHandoff: DialogueModeTeachingHandoff | null;
  deploymentPrompt?: DialogueModeDeploymentPrompt;
}

export interface DialogueModeSessionState {
  sessionId: string;
  interactionMode: DialogueModeInteractionMode;
  userGoal: string;
  branch: DialogueModeBranch;
  phase: DialogueModePhase;
  matchedSkill: DialogueModeMatchedSkill | null;
  hardwareSnapshot: DialogueModeHardwareSnapshot;
  deploymentPrompt?: DialogueModeDeploymentPrompt;
  teachingHandoff: DialogueModeTeachingHandoff | null;
  lastAgentUtterance?: string;
  updatedAt: string;
}

export type AgentResponse =
  | {
      type: 'guidance';
      message: string;
      clarificationQuestions?: string[];
      suggestions?: string[];
      interaction?: InteractionRequest;
      confirmedEntities?: Record<string, string>;
      missingInfo?: string[];
      metadata?: {
        showContinueButton?: boolean;
        showConfirmBuildButton?: boolean;
      };
    }
  | {
      type: 'summary_ready';
      message: string;
      blueprint: WorkflowBlueprint;
      confirmedEntities?: Record<string, string>;
      missingInfo?: string[];
      interaction?: InteractionRequest;
      metadata?: {
        showContinueButton: boolean;
        showConfirmBuildButton: boolean;
      };
    }
  | {
      type: 'select_single' | 'select_multi' | 'image_upload';
      message: string;
      interaction: InteractionRequest;
      confirmedEntities?: Record<string, string>;
      missingInfo?: string[];
      currentNode?: ConfigurableNode;
      progress?: { completed: number; total: number };
      digitalTwinScene?: DigitalTwinScenePayload;
      metadata?: {
        showContinueButton?: boolean;
        showConfirmBuildButton?: boolean;
        workflowId?: string;
        showConfirmButton?: boolean;
      };
    }
  | {
      type: 'workflow_ready';
      message: string;
      workflow: WorkflowDefinition;
      reasoning?: string;
      interaction?: InteractionRequest;
      metadata?: {
        iterations: number;
        nodeCount: number;
      };
    }
  | {
      type: 'dialogue_mode';
      message: string;
      dialogueMode: DialogueModeEnvelope;
      digitalTwinScene?: DigitalTwinScenePayload;
      interaction?: InteractionRequest;
      confirmedEntities?: Record<string, string>;
      missingInfo?: string[];
      metadata?: {
        showContinueButton?: boolean;
        showConfirmBuildButton?: boolean;
      };
    }
  | {
      type: 'hot_plugging' | 'config_input';
      message: string;
      /** 待配置节点总数（可选） */
      totalNodes?: number;
      /** 当前待配置节点 */
      currentNode: ConfigurableNode;
      /** 进度：已完成/总数（可选） */
      progress?: { completed: number; total: number };
      interaction?: InteractionRequest;
      digitalTwinScene?: DigitalTwinScenePayload;
      metadata?: {
        workflowId: string;
        showConfirmButton: boolean;
        allHardwareComponents?: Array<{
          componentId: string;
          displayName: string;
        }>;
        allPendingHardwareNodeNames?: string[];
      };
    }
  | {
      type: 'config_complete';
      message: string;
      /** 已配置节点总数 */
      totalConfigured: number;
      skillSaveCandidate?: SkillSaveCandidate | null;
      digitalTwinScene?: DigitalTwinScenePayload;
      metadata?: {
        workflowId: string;
      };
    }
  | {
      type: 'error';
      message: string;
      details?: unknown;
      interaction?: InteractionRequest;
    };

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentSession {
  id: string;
  phase: AgentPhase;
  history: ConversationTurn[];
  workflow?: WorkflowDefinition;
  lastComplexWorkflow?: CachedComplexWorkflow;
  blueprint?: WorkflowBlueprint;
  intent?: Intent;
  orchestratorState?: OrchestratorState;
  confirmedEntities: Record<string, string>;
  workflowSummary?: string;
  /** ConfigAgent 状态 */
  configAgentState?: ConfigAgentState;
  traceEvents: AgentTraceEvent[];
  traceSequence: number;
  confirmed: boolean;
  userTurns: number;
  lastSummaryTurn: number;
  dialogueModeState?: DialogueModeSessionState;
  confirmFailureCount?: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}
/**
 * [INPUT]: 无
 * [OUTPUT]: 对外提供 Agent/Workflow 相关类型定义
 * [POS]: agents 领域类型中心，跨模块共享
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */
