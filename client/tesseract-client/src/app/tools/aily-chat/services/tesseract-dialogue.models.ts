/**
 * [INPUT]: 依赖 Tesseract dialogue-mode backend 契约与本地硬件桥标准事件。
 * [OUTPUT]: 对外提供 aily-chat 对话模式所需的 UI/card/relay/硬件事件类型定义。
 * [POS]: tools/aily-chat/services 的对话模式协议模型层，被 adapter、组件与本地硬件桥共享。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

export type TesseractInteractionMode = 'teaching' | 'dialogue';

export type DialogueBranch =
  | 'instant_play'
  | 'hardware_guidance'
  | 'proxy_chat'
  | 'teaching_handoff'
  | 'validation_failed';

export type DialoguePhase =
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

export type DialogueUiActionKind = 'primary' | 'secondary' | 'ghost';

export type DialogueHardwareSource = 'miniclaw_ws' | 'mqtt_proxy' | 'backend_cache';

export type DialogueHardwareEventType =
  | 'device_inserted'
  | 'device_removed'
  | 'device_ready'
  | 'device_error'
  | 'heartbeat'
  | 'snapshot';

export type DialogueComponentStatus =
  | 'connected'
  | 'validating'
  | 'ready'
  | 'error'
  | 'removed';

export type DialogueValidationStatus =
  | 'idle'
  | 'pending'
  | 'success'
  | 'failure'
  | 'timeout';

export type DialoguePhysicalAction = 'hand_stretch' | 'wake' | 'none';
export type DialogueRelayTarget = 'mimiclaw_ws';

export interface DialogueTeachingContext {
  originalPrompt?: string;
  prefilledGoal?: string;
  sourceSessionId?: string;
}

export interface DialogueMatchedSkill {
  skillId: string;
  displayName: string;
  matchStatus?: string;
  confidence?: number;
  gameplayGuide?: string;
  requiredHardware?: DialogueHardwareRequirement[];
  initialPhysicalCue?: DialoguePhysicalCue | null;
}

export interface DialogueLibrarySkillPreview {
  skillId: string;
  displayName: string;
  summary: string;
  tags: string[];
  wakePrompt: string;
  requiredHardware: DialogueHardwareRequirement[];
  workflowId: string;
  workflowName: string;
  sourceSessionId: string;
  workflow: Record<string, unknown>;
}

export interface DialogueSkillSaveCandidate {
  skillId: string;
  displayName: string;
  summary: string;
  keywords: string[];
  workflowId: string;
  workflowName: string;
  sourceSessionId: string;
}

export interface DialogueHardwareRequirement {
  componentId: string;
  displayName: string;
  requiredCapability?: string;
  acceptablePorts?: string[];
  requiredModelIds?: string[];
  isOptional?: boolean;
}

export interface DialogueHardwareComponent {
  componentId: string;
  deviceId: string;
  modelId: string;
  displayName: string;
  portId: string;
  status: DialogueComponentStatus;
}

export interface DialogueHardwareSnapshot {
  source: DialogueHardwareSource;
  connectedComponents: DialogueHardwareComponent[];
  missingRequirements: DialogueHardwareRequirement[];
  validationStatus: DialogueValidationStatus;
  lastEventType?: string;
  lastEventAt?: string;
  failureReason?: string | null;
}

export interface DialoguePhysicalCue {
  action: DialoguePhysicalAction;
  autoTrigger: boolean;
  targetComponentId?: string | null;
  metadata?: Record<string, string> | null;
}

export interface DialogueRelayDirective {
  target: DialogueRelayTarget;
  message: string;
  chatId?: string | null;
}

export interface DialogueRelayMessage {
  source: DialogueRelayTarget;
  chatId: string;
  content: string;
  timestamp: string;
  raw?: Record<string, unknown> | null;
}

export interface DialogueRelayResult {
  chatId: string;
  content: string;
  messages: DialogueRelayMessage[];
}

export interface DialogueTeachingHandoff {
  sourceSessionId: string;
  originalPrompt: string;
  prefilledGoal: string;
  entryMode: string;
  createdAt: string;
}

export interface DialogueDeploymentPrompt {
  visible: boolean;
  status: string;
  message: string;
  wakeCue?: DialoguePhysicalCue | null;
}

export interface DialogueModeUiAction {
  id: string;
  label: string;
  kind: DialogueUiActionKind;
  enabled: boolean;
  payload?: Record<string, unknown> | null;
}

export interface DialogueModeEnvelope {
  branch: DialogueBranch;
  phase: DialoguePhase;
  skill: DialogueMatchedSkill | null;
  librarySkills: DialogueLibrarySkillPreview[];
  hardware: DialogueHardwareSnapshot;
  uiActions: DialogueModeUiAction[];
  physicalCue: DialoguePhysicalCue | null;
  relay?: DialogueRelayDirective | null;
  teachingHandoff: DialogueTeachingHandoff | null;
  deploymentPrompt?: DialogueDeploymentPrompt | null;
}

export interface DialogueHardwareEventPayload {
  source: DialogueHardwareSource;
  eventType: DialogueHardwareEventType;
  timestamp: string;
  component?: DialogueHardwareComponent | null;
  connectedComponents?: DialogueHardwareComponent[];
  raw?: Record<string, unknown> | null;
}

export type DialogueHardwareEvent = DialogueHardwareEventPayload;

export interface DialogueCardAction {
  text: string;
  action: string;
  type: 'primary' | 'default' | 'text';
  disabled?: boolean;
  payload?: Record<string, unknown> | null;
}

export interface DialogueWakeupSkill {
  id: string;
  title: string;
  action?: string;
  payload?: Record<string, unknown> | null;
  prompt?: string;
  icon?: string;
  tags: string[];
  summary?: string;
  requiredHardware?: DialogueHardwareRequirement[];
  sourceSessionId?: string;
  workflowId?: string;
  workflowName?: string;
  workflow?: Record<string, unknown> | null;
  active?: boolean;
  disabled?: boolean;
}

export interface DialogueCardPayload {
  sessionId: string;
  message: string;
  branch: DialogueBranch;
  phase: DialoguePhase;
  skill: DialogueMatchedSkill | null;
  hardware: DialogueHardwareSnapshot;
  actions: DialogueCardAction[];
  skills: DialogueWakeupSkill[];
  physicalCue: DialoguePhysicalCue | null;
  relay: DialogueRelayDirective | null;
  teachingHandoff: DialogueTeachingHandoff | null;
  deploymentPrompt?: DialogueDeploymentPrompt | null;
  localStatusText?: string | null;
}

export function isDialogueModeEnvelope(value: unknown): value is DialogueModeEnvelope {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const envelope = value as Partial<DialogueModeEnvelope>;
  return typeof envelope.branch === 'string'
    && typeof envelope.phase === 'string'
    && !!envelope.hardware
    && Array.isArray(envelope.uiActions);
}

export function normalizeDialogueModeEnvelope(value: unknown): DialogueModeEnvelope | null {
  if (!isDialogueModeEnvelope(value)) {
    return null;
  }

  const envelope = value as DialogueModeEnvelope;
  return {
    ...envelope,
    skill: envelope.skill || null,
    librarySkills: Array.isArray((envelope as any).librarySkills)
      ? (envelope as any).librarySkills
      : [],
    hardware: {
      ...envelope.hardware,
      connectedComponents: Array.isArray(envelope.hardware?.connectedComponents)
        ? envelope.hardware.connectedComponents
        : [],
      missingRequirements: Array.isArray(envelope.hardware?.missingRequirements)
        ? envelope.hardware.missingRequirements
        : [],
      validationStatus: envelope.hardware?.validationStatus || 'idle',
      source: envelope.hardware?.source || 'backend_cache',
    },
    uiActions: Array.isArray(envelope.uiActions) ? envelope.uiActions : [],
    physicalCue: envelope.physicalCue || null,
    relay: envelope.relay || null,
    teachingHandoff: envelope.teachingHandoff || null,
    deploymentPrompt: envelope.deploymentPrompt || null,
  };
}
