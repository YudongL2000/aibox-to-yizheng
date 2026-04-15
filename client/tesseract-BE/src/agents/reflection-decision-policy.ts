/**
 * [INPUT]: 依赖 ConversationTurn、HardwareCapability 与规范 capability id 常量
 * [OUTPUT]: 对外提供 Reflection 决策规则清单、fallback 判定与运行时 decision policy guard
 * [POS]: agents 的反思策略单一真相源，被 reflection-engine 同时用于 prompt 规则、fallback 与运行时校验
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { HARDWARE_CAPABILITY_IDS } from './hardware-capability-ids';
import type {
  ConversationTurn,
  HardwareCapability,
} from './types';

export type ReflectionPolicyDecision =
  | 'direct_accept'
  | 'clarify_needed'
  | 'reject_out_of_scope';

export type ReflectionPolicyMissingCategory =
  | 'trigger'
  | 'action'
  | 'condition'
  | 'feedback'
  | 'logic';

export interface ReflectionPolicyMissingInfo {
  category: ReflectionPolicyMissingCategory;
  description: string;
  priority: 1 | 2 | 3;
  blocking: boolean;
}

export interface ReflectionPolicyQuestion {
  question: string;
  options?: string[];
  priority: 1 | 2 | 3;
  context: string;
}

export interface ReflectionPolicyActionSuggestion {
  label: string;
  value: string;
  reason?: string;
  category: ReflectionPolicyMissingCategory;
}

export interface ReflectionPolicyAssessment {
  decision: ReflectionPolicyDecision;
  reasoningSummary?: string;
  recognizedRequirements: string[];
  supportedCapabilityIds: string[];
  missingInfo: ReflectionPolicyMissingInfo[];
  questions: ReflectionPolicyQuestion[];
  suggestedActions: ReflectionPolicyActionSuggestion[];
  outOfScopeReasons: string[];
  confidence?: number;
}

export interface ReflectionDecisionPolicyContext {
  userIntent: string;
  history: ConversationTurn[];
  discoveredCapabilities: HardwareCapability[];
}

export const REFLECTION_TEMPLATE_QUESTIONS: Record<ReflectionPolicyMissingCategory, string> = {
  trigger: '工作流应该在什么事件发生时触发？',
  action: '触发后机器人需要执行什么具体动作？',
  condition: '需要根据什么条件进行分支判断？',
  feedback: '你希望系统用什么方式反馈结果（语音、屏幕或两者）？',
  logic: '请补充核心逻辑规则（例如判断标准、重试策略或结束条件）。',
};

export const REFLECTION_CATEGORY_LABELS: Record<ReflectionPolicyMissingCategory, string> = {
  trigger: '触发',
  action: '动作',
  condition: '条件',
  feedback: '反馈',
  logic: '逻辑',
};

export const REFLECTION_DECISION_POLICY_RULES = [
  'supported_capability_ids 只能写目录内真实 id。',
  '不要把最接近能力伪装成已支持。',
  '打招呼若未选输出方式，要澄清。',
  '聊天、回答、陪伴本身不等于麦克风、喇叭、屏幕或 LLM；除非用户明确说 AI、智能、自由对话，或明确说说话、听、开口、屏幕、文字等交互方式，否则不能自动补成完整对话链路。抽象聊天目标默认要澄清交互方式；如果已明确对着它说话它就回答我这类输入输出链路，仍要继续澄清固定话术还是 AI。',
  '悲伤、难过、生气、开心这类抽象情绪表达不等于机械臂动作、屏幕表情或语音；如果用户没有明确表达方式，必须澄清，不能私自闭环。',
  '石头剪刀布、游戏若输入方式、输出方式或出拳逻辑未明确，要澄清。',
  '看到我、看到人默认是视觉触发，不要追问是否特定人；屏幕打招呼、屏幕反馈不要卡在文字还是表情。',
  '自动跟随、跟着我走、跟随我如果目录内已经有 camera.snapshot_input + face_net.face_recognition + wheel.movement_execute，就视为最小可运行闭环；不要再要求额外的人体距离估算、SLAM、路径规划或专用控制算法说明。',
  '转着看、到处看看、巡看不等于 SLAM；抽象监控或照看目标若未说明移动方式、异常条件或反馈方式，要澄清。',
  '对监控家里宠物、找到可见宠物后反馈这类可视观察目标，不要强行要求宠物专用分类器；如果用户只是要边移动边看、看到目标后做简单屏幕或语音反馈，可按 camera + wheel + screen 或 speaker 的最小闭环处理。',
  '湿度、温度、气味、浇水、飞行、空调控制等目录外能力直接 reject。',
  'reject_out_of_scope 不要给问题；direct_accept 不要保留 blocking missing_info。',
  'suggested_user_actions 必须贴合当前需求语义和已识别能力，不要输出与当前语义无关的默认模板动作；如果要给选项，优先给能直接补齐最高优先级缺口的下一句话。',
] as const;

export function applyReflectionDecisionPolicy(
  assessment: ReflectionPolicyAssessment,
  context: ReflectionDecisionPolicyContext
): ReflectionPolicyAssessment {
  if (assessment.decision !== 'direct_accept') {
    return assessment;
  }

  const userText = buildUserIntentWindow(context.userIntent, context.history);
  const guardedConversation = applyConversationGuard(
    assessment,
    userText,
    context.discoveredCapabilities,
    context.history
  );
  if (guardedConversation.decision !== 'direct_accept') {
    return guardedConversation;
  }

  return applyEmotionExpressionGuard(
    guardedConversation,
    userText,
    context.discoveredCapabilities
  );
}

export function buildFallbackReflectionAssessment(
  context: ReflectionDecisionPolicyContext,
  clarificationTurns: number
): ReflectionPolicyAssessment {
  const categories = new Set(context.discoveredCapabilities.map((capability) => capability.category));
  const hasTrigger = categories.has('BASE') || categories.has('CAM') || categories.has('MIC');
  const hasAction = categories.has('WHEEL') || categories.has('HAND') || categories.has('SCREEN')
    || categories.has('SPEAKER');
  const missingInfo: ReflectionPolicyMissingInfo[] = [];

  if (!hasTrigger) {
    missingInfo.push({
      category: 'trigger',
      description: '触发条件未明确，无法确定工作流何时开始。',
      priority: 1,
      blocking: true,
    });
  }

  if (!hasAction) {
    missingInfo.push({
      category: 'action',
      description: '执行动作未明确，无法生成核心执行节点。',
      priority: 1,
      blocking: true,
    });
  }

  if (collectFallbackOutputModes(context.discoveredCapabilities).size > 1) {
    missingInfo.push({
      category: 'feedback',
      description: '反馈方式仍存在多种实现路径，需要确认是语音、屏幕还是肢体动作。',
      priority: 1,
      blocking: true,
    });
  }

  if (context.discoveredCapabilities.some((capability) => capability.id === HARDWARE_CAPABILITY_IDS.LLM.PROMPT_REPLY)) {
    missingInfo.push({
      category: 'logic',
      description: '回复机制仍不明确，需要确认是固定话术还是 AI 智能对话。',
      priority: 1,
      blocking: true,
    });
  }

  if (
    context.discoveredCapabilities.some((capability) => capability.id === HARDWARE_CAPABILITY_IDS.YOLO_RPS.RPS_GESTURE_RECOGNITION) &&
    context.discoveredCapabilities.some((capability) => capability.id === HARDWARE_CAPABILITY_IDS.HAND.GESTURE_EXECUTE)
  ) {
    missingInfo.push({
      category: 'logic',
      description: '石头剪刀布的出拳逻辑仍不明确，需要确认是根据识别结果回应，还是随机出拳。',
      priority: 1,
      blocking: true,
    });
  }

  const decision: ReflectionPolicyDecision = missingInfo.length === 0
    ? 'direct_accept'
    : 'clarify_needed';

  return {
    decision,
    reasoningSummary: decision === 'direct_accept'
      ? '基于当前已识别能力，需求已满足进入方案拆解的最小条件。'
      : `当前还缺 ${missingInfo.map((item) => REFLECTION_CATEGORY_LABELS[item.category]).join('、')} 信息。`,
    recognizedRequirements: [],
    supportedCapabilityIds: context.discoveredCapabilities.map((capability) => capability.id),
    missingInfo,
    questions: buildFallbackQuestions(missingInfo),
    suggestedActions: [],
    outOfScopeReasons: [],
    confidence: calculateReflectionConfidence({
      decision,
      reasoningSummary: undefined,
      recognizedRequirements: [],
      supportedCapabilityIds: context.discoveredCapabilities.map((capability) => capability.id),
      missingInfo,
      questions: [],
      suggestedActions: [],
      outOfScopeReasons: [],
    }, clarificationTurns),
  };
}

export function buildFallbackQuestions(
  missingInfo: ReflectionPolicyMissingInfo[],
  maxQuestions: number = 5
): ReflectionPolicyQuestion[] {
  return [...missingInfo]
    .sort((left, right) => left.priority - right.priority)
    .slice(0, maxQuestions)
    .map((item) => ({
      question: REFLECTION_TEMPLATE_QUESTIONS[item.category],
      priority: item.priority,
      context: item.description,
    }));
}

export function describeReflectionAssessment(
  assessment: ReflectionPolicyAssessment
): string {
  if (assessment.decision === 'reject_out_of_scope') {
    return assessment.outOfScopeReasons.join('；') || '需求超出当前硬件边界';
  }
  if (assessment.decision === 'direct_accept') {
    return '当前需求已满足进入方案拆解的条件';
  }
  return assessment.missingInfo.length > 0
    ? `缺失 ${assessment.missingInfo.length} 项关键信息`
    : '仍需继续澄清';
}

export function calculateReflectionConfidence(
  assessment: ReflectionPolicyAssessment,
  clarificationTurns: number,
  maxClarificationTurns: number = 5
): number {
  if (assessment.decision === 'reject_out_of_scope') {
    return 0.95;
  }
  if (assessment.decision === 'direct_accept') {
    return 0.9;
  }

  const penalty = assessment.missingInfo.reduce((total, item) => {
    const priorityWeight = item.priority === 1 ? 0.24 : item.priority === 2 ? 0.14 : 0.08;
    const blockingWeight = item.blocking ? 0.18 : 0;
    return total + priorityWeight + blockingWeight;
  }, 0);
  const turnBonus = Math.min(clarificationTurns, maxClarificationTurns) * 0.04;
  return clamp(0.82 - penalty + turnBonus, 0.05, 0.88);
}

function conversationModeAlreadyClarified(history: ConversationTurn[]): boolean {
  // 若历史中已存在关于 trigger/action 的澄清回合（assistant 已问过"麦克风"或"扬声器"相关），
  // 则本轮信任 LLM 的 direct_accept，不重复触发对话守卫
  return history.some(
    (turn) =>
      turn.role === 'assistant' &&
      /(麦克风|说话.*方式|输入.*方式|扬声器|回复.*方式|输出.*方式|喇叭|屏幕.*回复|trigger|action|输入方式|输出方式)/.test(
        turn.content ?? ''
      )
  );
}

function applyConversationGuard(
  assessment: ReflectionPolicyAssessment,
  userText: string,
  discoveredCapabilities: HardwareCapability[],
  history: ConversationTurn[] = []
): ReflectionPolicyAssessment {
  if (!isConversationIntent(userText)) {
    return assessment;
  }

  // 若已经历过至少一轮针对 trigger/action 的澄清，直接信任 LLM 的 direct_accept
  if (conversationModeAlreadyClarified(history)) {
    return assessment;
  }

  const hasExplicitInputMode = hasExplicitConversationInput(userText);
  const hasExplicitOutputMode = hasExplicitConversationOutput(userText);
  const hasExplicitLogicMode = hasExplicitConversationLogic(userText);

  if (!hasExplicitInputMode || !hasExplicitOutputMode) {
    return {
      ...assessment,
      decision: 'clarify_needed',
      reasoningSummary: '聊天目标还没有明确输入和输出方式，不能直接默认成完整对话链路。',
      supportedCapabilityIds: [],
      missingInfo: [
        {
          category: 'trigger',
          description: '你希望通过什么输入方式开始聊天，例如对着麦克风说话或其他触发方式。',
          priority: 1,
          blocking: true,
        },
        {
          category: 'action',
          description: '机器人应该通过语音还是屏幕来回复你，目前还未明确。',
          priority: 1,
          blocking: true,
        },
      ],
      questions: [
        {
          question: '你希望通过麦克风说话，还是用别的方式开始互动？',
          priority: 1,
          context: 'trigger',
        },
        {
          question: '机器人是用扬声器回复，还是在屏幕上显示回复？',
          priority: 1,
          context: 'action',
        },
      ],
      suggestedActions: [],
      confidence: Math.min(assessment.confidence ?? 0.6, 0.7),
    };
  }

  if (!hasExplicitLogicMode) {
    const supportedCapabilityIds = discoveredCapabilities
      .map((capability) => capability.id)
      .filter((capabilityId) => capabilityId !== HARDWARE_CAPABILITY_IDS.LLM.PROMPT_REPLY);

    return {
      ...assessment,
      decision: 'clarify_needed',
      reasoningSummary: '聊天的输入输出方式已经明确，但回复机制仍未说明，需要确认是固定话术还是 AI 对话。',
      supportedCapabilityIds,
      missingInfo: [
        {
          category: 'logic',
          description: '回复机制仍不明确，需要确认是固定话术还是 AI 智能对话。',
          priority: 1,
          blocking: true,
        },
      ],
      questions: [
        {
          question: '你希望它按固定话术回复，还是做更自由的 AI 对话？',
          priority: 1,
          context: 'logic',
        },
      ],
      suggestedActions: [
        {
          category: 'logic',
          label: '逻辑: 固定话术，按关键词触发回复',
          value: '固定话术，按关键词触发回复',
        },
        {
          category: 'logic',
          label: '逻辑: AI 智能回复，可以自由聊天',
          value: 'AI 智能回复，可以自由聊天',
        },
      ],
      confidence: Math.min(assessment.confidence ?? 0.6, 0.78),
    };
  }

  return assessment;
}

function applyEmotionExpressionGuard(
  assessment: ReflectionPolicyAssessment,
  userText: string,
  discoveredCapabilities: HardwareCapability[]
): ReflectionPolicyAssessment {
  if (!isAbstractEmotionExpressionIntent(userText) || hasExplicitEmotionOutputMode(userText)) {
    return assessment;
  }

  const expressiveOutputCapabilityIds = new Set(
    discoveredCapabilities
      .filter((capability) => isEmotionOutputCategory(capability.category))
      .map((capability) => capability.id)
  );

  return {
    ...assessment,
    decision: 'clarify_needed',
    reasoningSummary: '你已经说明了情绪目标，但还没有明确机器人要用什么方式表达这种情绪。',
    supportedCapabilityIds: assessment.supportedCapabilityIds
      .filter((capabilityId) => !expressiveOutputCapabilityIds.has(capabilityId)),
    missingInfo: [
      {
        category: 'action',
        description: '情绪表达方式还不明确，需要确认是屏幕表情、肢体动作还是语音表达。',
        priority: 1,
        blocking: true,
      },
    ],
    questions: [
      {
        question: '你希望机器人怎么表达这种情绪，例如屏幕表情、肢体动作或语音？',
        priority: 1,
        context: 'action',
      },
    ],
    suggestedActions: [],
    confidence: Math.min(assessment.confidence ?? 0.6, 0.74),
  };
}

function buildUserIntentWindow(userIntent: string, history: ConversationTurn[]): string {
  const userTurns = history
    .filter((turn) => turn.role === 'user')
    .map((turn) => turn.content.trim())
    .filter(Boolean);

  return [userIntent, ...userTurns].join('；');
}

function isConversationIntent(text: string): boolean {
  return /(聊天|对话|陪我|陪伴|回答我|回答)/.test(text);
}

function hasExplicitConversationInput(text: string): boolean {
  return /(对着它说话|跟它说话|我说一句话|我说话|麦克风|语音输入|听我说|语音|说话|讲话|开口说话|ASR|语音识别|对它说|跟它说)/.test(text);
}

function hasExplicitConversationOutput(text: string): boolean {
  return /(回答我|开口说|说欢迎|喇叭|扬声器|屏幕|显示|文字|语音回复|重复出来|说出来|语音|播报|TTS|朗读|播放|合成语音|语音合成|语音输出)/.test(text);
}

function hasExplicitConversationLogic(text: string): boolean {
  return /(AI|ai|智能|大模型|自由对话|开放式|固定话术|固定回复|关键词触发|预设话术|随机回复|按脚本|脚本式)/.test(text);
}

function isAbstractEmotionExpressionIntent(text: string): boolean {
  return /(生气|愤怒|难过|悲伤|伤心|开心|高兴)/.test(text)
    && /(看见我|见到我|看到我|看见人|见到人|看到人|对我|对着我|跟我)/.test(text);
}

function hasExplicitEmotionOutputMode(text: string): boolean {
  return /(机械臂|机械手|手势|动作|挥手|屏幕|表情|emoji|显示|语音|说|播报|喇叭|扬声器)/.test(text);
}

function isEmotionOutputCategory(category: HardwareCapability['category']): boolean {
  return category === 'HAND'
    || category === 'SCREEN'
    || category === 'SPEAKER'
    || category === 'TTS';
}

function collectFallbackOutputModes(capabilities: HardwareCapability[]): Set<string> {
  const modes = new Set<string>();

  capabilities.forEach((capability) => {
    if (capability.category === 'SCREEN') {
      modes.add('screen');
    }
    if (capability.category === 'HAND') {
      modes.add('gesture');
    }
    if (capability.category === 'SPEAKER' || capability.category === 'TTS') {
      modes.add('speech');
    }
  });

  return modes;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
