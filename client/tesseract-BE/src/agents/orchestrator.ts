/**
 * [INPUT]: 依赖 CapabilityRegistry、ReflectionEngine、ComponentComposer、SessionService、MCPClient、AgentLoop
 * [OUTPUT]: 对外提供 Orchestrator 多轮编排入口（process/confirm）与 AI 驱动的语义发现/澄清动作生成
 * [POS]: agents 的 Refactor-3 集成层，负责能力发现、需求反思与确认前的状态决策，确认闭环下沉到 AgentLoop
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { AgentLoop, type AgentLoopDisposition } from './agent-loop';
import { ALLOWED_NODE_TYPES } from './allowed-node-types';
import type { MCPClient } from './mcp-client';
import { AgentConfig } from './agent-config';
import { CapabilityRegistry } from './capability-registry';
import { ComponentComposer } from './component-composer';
import { HARDWARE_CAPABILITY_IDS } from './hardware-capability-ids';
import { HARDWARE_COMPONENTS, HardwareComponent } from './hardware-components';
import { LLMClient } from './llm-client';
import { CapabilityDiscovery } from './orchestrator/capability-discovery';
import { OrchestratorResponseBuilder } from './orchestrator/response-builder';
import {
  autofixWorkflowStructure,
  buildValidationFailureMessage,
  isSameWorkflow,
  validateWorkflowStructure,
  WorkflowConfigNormalizer,
} from './orchestrator/workflow-config-normalizer';
import {
  buildArchitectFragments,
  buildEntityBindingsFragment,
} from './prompts/architect-system';
import { AGENT_PROMPT_COPY } from './prompt-copy';
import {
  ReflectionEngine,
  ReflectionResult,
} from './reflection-engine';
import { SessionService } from './session-service';
import {
  AgentTraceEventInput,
  AgentResponse,
  ClarificationCategory,
  ConversationTurn,
  HardwareCapability,
  OrchestratorState,
  NodeSubParams,
  WorkflowBlueprint,
  WorkflowDefinition,
} from './types';
import type { WorkflowArchitect } from './workflow-architect';
import { buildArchitectToolDescriptions } from './workflow-architect/prompt-context';

type WorkflowValidationClient = Pick<MCPClient, 'validateWorkflow' | 'autofixWorkflow'>;
type WorkflowArchitectClient = Pick<WorkflowArchitect, 'generateWorkflow'>;

const MAX_VALIDATION_LOOPS = 3;

export class Orchestrator {
  private readonly hardwareComponents: HardwareComponent[];
  private readonly capabilityRegistry: CapabilityRegistry;
  private readonly capabilityDiscovery: CapabilityDiscovery;
  private readonly reflectionEngine: ReflectionEngine;
  private readonly componentComposer: ComponentComposer;
  private readonly agentLoop: AgentLoop;
  private readonly responseBuilder: OrchestratorResponseBuilder;
  private readonly workflowConfigNormalizer: WorkflowConfigNormalizer;

  constructor(
    private config: AgentConfig,
    private llmClient: LLMClient,
    private sessionService: SessionService,
    hardwareComponents: HardwareComponent[],
    private workflowArchitect?: WorkflowArchitectClient,
    private workflowValidator?: WorkflowValidationClient
  ) {
    this.hardwareComponents = hardwareComponents.length > 0 ? hardwareComponents : HARDWARE_COMPONENTS;
    this.capabilityRegistry = new CapabilityRegistry(this.hardwareComponents);
    this.reflectionEngine = new ReflectionEngine(
      this.llmClient,
      this.config.llmReflectionTimeoutMs ?? this.config.llmTimeoutMs
    );
    this.componentComposer = new ComponentComposer(this.capabilityRegistry, this.workflowArchitect);
    this.agentLoop = new AgentLoop(MAX_VALIDATION_LOOPS);
    this.capabilityDiscovery = new CapabilityDiscovery({
      config: this.config,
      llmClient: this.llmClient,
      capabilityRegistry: this.capabilityRegistry,
      emitTrace: (traceSessionId, event) => this.emitTrace(traceSessionId, event),
    });
    this.responseBuilder = new OrchestratorResponseBuilder(this.hardwareComponents);
    this.workflowConfigNormalizer = new WorkflowConfigNormalizer();
  }

  async process(
    userMessage: string,
    sessionId: string,
    options?: { clarificationContext?: { category: ClarificationCategory } }
  ): Promise<AgentResponse> {
    this.emitTrace(sessionId, {
      source: 'orchestrator',
      phase: 'capability_discovery',
      kind: 'phase',
      status: 'started',
      title: 'Orchestrator 开始理解需求',
      detail: this.toTracePreview(userMessage),
    });
    const session = this.sessionService.appendTurn(sessionId, 'user', userMessage);
    if (session.phase !== 'understanding') {
      this.sessionService.setPhase(sessionId, 'understanding');
    }

    const history = this.sessionService.getHistory(sessionId);
    const previousState = this.sessionService.getOrchestratorState(sessionId);
    const activeHistory = this.selectActiveHistory(history, previousState);
    if (previousState?.decision === 'reject_out_of_scope' && activeHistory !== history) {
      this.emitTrace(sessionId, {
        source: 'orchestrator',
        phase: 'capability_discovery',
        kind: 'result',
        status: 'info',
        title: '重置意图窗口',
        detail: '上一轮已判定超出范围，本轮只基于最新用户输入重新理解需求',
      });
    }
    const userIntent = this.buildUserIntent(activeHistory);
    const discovery = await this.capabilityDiscovery.discoverCapabilities(
      userIntent,
      activeHistory,
      sessionId,
      previousState?.capabilityIds ?? []
    );
    const discoveredCapabilities = discovery.capabilities;
    this.emitTrace(sessionId, {
      source: 'orchestrator',
      phase: 'capability_discovery',
      kind: 'result',
      status: 'completed',
      title: '能力发现完成',
      detail: discoveredCapabilities.map((capability) => capability.displayName).join(' / ') || '未命中硬件能力',
      data: {
        capabilityIds: discoveredCapabilities.map((capability) => capability.id),
        keywordCount: userIntent.split(/\s+/).filter(Boolean).length,
        entityCount: discovery.entities.length,
        topologyHint: discovery.topologyHint,
      },
    });
    const reflection = await this.reflectionEngine.reflect(
      userIntent,
      discoveredCapabilities,
      activeHistory,
      this.capabilityRegistry.listCapabilities(),
      (event) => this.emitTrace(sessionId, event)
    );

    // ---- 澄清上下文：累积已确认的 category，从 missing_info 中剔除 ----
    const confirmedCategories = new Set(previousState?.confirmedCategories ?? []);
    const effectiveClarificationCategory = this.resolveClarificationCategory(
      previousState,
      options?.clarificationContext?.category
    );
    if (effectiveClarificationCategory) {
      confirmedCategories.add(effectiveClarificationCategory);
    }
    if (confirmedCategories.size > 0) {
      reflection.missing_info = reflection.missing_info.filter(
        (item) => !confirmedCategories.has(item.category)
      );
      const hasBlocking = reflection.missing_info.some((item) => item.blocking);
      if (!hasBlocking && reflection.decision === 'clarify_needed') {
        reflection.decision = 'direct_accept';
        reflection.complete = true;
        reflection.can_proceed = true;
      }
    }

    const supportedCapabilities = this.capabilityDiscovery.resolveSupportedCapabilities(
      discoveredCapabilities,
      reflection.supported_capability_ids
    );
    const summary = this.responseBuilder.buildSummaryMessage(
      userIntent,
      supportedCapabilities,
      reflection
    );
    const blueprint = this.responseBuilder.buildBlueprint(
      userIntent,
      supportedCapabilities,
      reflection
    );
    const state = this.responseBuilder.buildState(
      userIntent,
      supportedCapabilities,
      reflection,
      summary,
      this.capabilityDiscovery.extractSearchKeywords(userIntent, supportedCapabilities),
      {
        entities: discovery.entities,
        topologyHint: discovery.topologyHint,
      }
    );
    if (confirmedCategories.size > 0) {
      state.confirmedCategories = [...confirmedCategories];
    }

    this.persistUnderstandingState(sessionId, state, blueprint);

    const response = this.responseBuilder.buildDecisionResponse(
      state,
      blueprint,
      summary,
      supportedCapabilities,
      reflection
    );

    if (
      response.type === 'guidance' &&
      response.clarificationQuestions?.length &&
      !response.interaction
    ) {
      this.emitTrace(sessionId, {
        source: 'orchestrator',
        phase: 'response',
        kind: 'result',
        status: 'fallback',
        title: '澄清交互回退为问题模式',
        detail: '后端当前没有拿到足够可用的交互选项，前端将只展示 clarification_questions',
        data: {
          clarificationQuestionCount: response.clarificationQuestions.length,
          missingFields: response.missingInfo ?? [],
        },
      });
    }

    this.emitTrace(sessionId, {
      source: 'orchestrator',
      phase: 'response',
      kind: 'result',
      status: 'completed',
      title: `回复已准备: ${response.type}`,
      detail: this.toTracePreview(response.message),
      data: {
        responseType: response.type,
        missingInfoCount: 'missingInfo' in response ? response.missingInfo?.length ?? 0 : 0,
      },
    });

    this.sessionService.appendTurn(sessionId, 'assistant', response.message);
    if (response.type === 'summary_ready') {
      this.sessionService.markSummary(sessionId);
    }
    return response;
  }

  async confirm(sessionId: string): Promise<AgentResponse> {
    this.emitTrace(sessionId, {
      source: 'orchestrator',
      phase: 'composition',
      kind: 'phase',
      status: 'started',
      title: 'Orchestrator 开始构建工作流',
      detail: '进入能力组合与验证闭环',
    });
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      return { type: 'error', message: 'Session not found. 请先发送需求。' };
    }

    const state = this.sessionService.getOrchestratorState(sessionId);
    if (!state) {
      return { type: 'guidance', message: '请先描述需求，我才能开始组合工作流。' };
    }

    if (state.decision === 'reject_out_of_scope') {
      const response = this.responseBuilder.buildRejectedStateResponse(state);
      this.sessionService.appendTurn(sessionId, 'assistant', response.message);
      return response;
    }

    if (state.missingFields.length > 0 && !state.canProceed) {
      const response = this.responseBuilder.buildPendingGuidanceResponse(state);
      this.sessionService.appendTurn(sessionId, 'assistant', response.message);
      return response;
    }

    this.sessionService.setPhase(sessionId, 'generating');
    this.sessionService.setOrchestratorState(sessionId, {
      ...state,
      phase: 'composition',
    });

    const capabilities = this.capabilityRegistry.getByIds(state.capabilityIds);
    if (capabilities.length === 0) {
      const response: AgentResponse = {
        type: 'guidance',
        message: '我还没有识别到足够的硬件能力，请先补充你希望机器人做什么。',
      };
      this.sessionService.setPhase(sessionId, 'understanding');
      this.sessionService.appendTurn(sessionId, 'assistant', response.message);
      return response;
    }

    try {
    const composedWorkflow = await this.composeWorkflowForConfirm(
      sessionId,
      session.history,
      session.blueprint ?? undefined,
      state,
      capabilities
    );

    const validation = await this.agentLoop.run({
      compose: async () => composedWorkflow.workflow,
      normalize: (workflow) => this.workflowConfigNormalizer.normalizeWorkflowForConfig(workflow, sessionId),
      validateStructure: (workflow) => validateWorkflowStructure(workflow),
      autofixStructure: (workflow) => autofixWorkflowStructure(workflow),
      isSameWorkflow: (left, right) => isSameWorkflow(left, right),
      workflowValidator: this.workflowValidator
        ? {
            validateWorkflow: (workflow) => this.workflowValidator!.validateWorkflow(workflow),
            autofixWorkflow: (workflow) => this.workflowValidator!.autofixWorkflow(workflow),
          }
        : undefined,
      emitTrace: (event) => this.emitTrace(sessionId, event),
    });

    if (validation.valid) {
      this.sessionService.setWorkflow(sessionId, validation.workflow);
      this.sessionService.setConfirmed(sessionId, true);
      this.sessionService.setPhase(sessionId, 'deploying');
      this.sessionService.setOrchestratorState(sessionId, {
        ...state,
        phase: 'validation',
      });

      const response: AgentResponse = {
        type: 'workflow_ready',
        message: AGENT_PROMPT_COPY.workflowReady(validation.workflow.nodes.length),
        workflow: validation.workflow,
        reasoning: composedWorkflow.reasoning,
        metadata: {
          iterations: validation.iterations,
          nodeCount: validation.workflow.nodes.length,
        },
      };
      this.emitTrace(sessionId, {
        source: 'orchestrator',
        phase: 'response',
        kind: 'result',
        status: 'completed',
        title: '工作流已生成',
        detail: `节点 ${validation.workflow.nodes.length} 个，校验迭代 ${validation.iterations} 次`,
        data: {
          responseType: response.type,
          nodeCount: validation.workflow.nodes.length,
          iterations: validation.iterations,
        },
      });
      this.sessionService.appendTurn(sessionId, 'assistant', response.message);
      return response;
    }

    this.sessionService.setPhase(sessionId, 'understanding');
    this.sessionService.setOrchestratorState(sessionId, {
      ...state,
      phase: 'reflection',
    });

    const response: AgentResponse = {
      type: 'guidance',
        message: buildValidationFailureMessage(validation.disposition, validation.errors),
      missingInfo: state.missingFields,
    };
    this.emitTrace(sessionId, {
      source: 'orchestrator',
      phase: 'response',
      kind: 'result',
      status: 'failed',
      title: '工作流验证未通过',
      detail: validation.errors.join('；'),
      data: {
        responseType: response.type,
        errorCount: validation.errors.length,
        disposition: validation.disposition,
      },
    });
    this.sessionService.appendTurn(sessionId, 'assistant', response.message);
    return response;
    } catch (compositionError) {
      const attemptCount = this.sessionService.incrementConfirmFailureCount(sessionId);
      const response = this.responseBuilder.buildCompositionFailureResponse(
        compositionError,
        attemptCount,
        state
      );
      this.emitTrace(sessionId, {
        source: 'orchestrator',
        phase: 'composition',
        kind: 'result',
        status: 'failed',
        title: '工作流组合异常',
        detail: compositionError instanceof Error ? compositionError.message : '未知异常',
        data: {
          attemptCount,
          error: compositionError instanceof Error ? compositionError.message : String(compositionError),
        },
      });
      this.sessionService.setPhase(sessionId, 'understanding');
      this.sessionService.appendTurn(sessionId, 'assistant', response.message);
      return response;
    }
  }

  private resolveClarificationCategory(
    previousState: OrchestratorState | null | undefined,
    explicitCategory?: ClarificationCategory
  ): ClarificationCategory | null {
    if (explicitCategory) {
      return explicitCategory;
    }

    if (!previousState) {
      return null;
    }

    const confirmed = new Set(previousState.confirmedCategories ?? []);
    const pendingCategories = (previousState.pendingActions ?? [])
      .map((action) => action.category)
      .filter((category): category is ClarificationCategory => Boolean(category))
      .filter((category) => !confirmed.has(category));

    const uniquePendingCategories = [...new Set(pendingCategories)];
    if (uniquePendingCategories.length === 1) {
      return uniquePendingCategories[0];
    }

    const unresolvedMissingCategories = previousState.missingFields
      .filter((field): field is ClarificationCategory => this.isClarificationCategory(field))
      .filter((category) => !confirmed.has(category));

    const uniqueMissingCategories = [...new Set(unresolvedMissingCategories)];
    return uniqueMissingCategories.length === 1 ? uniqueMissingCategories[0] : null;
  }

  private isClarificationCategory(value: string): value is ClarificationCategory {
    return ['trigger', 'action', 'condition', 'feedback', 'logic'].includes(value);
  }

  private emitTrace(sessionId: string, event: AgentTraceEventInput): void {
    this.sessionService.appendTrace(sessionId, event);
  }

  private toTracePreview(text: string): string {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 120) {
      return normalized;
    }
    return `${normalized.slice(0, 117)}...`;
  }

  private persistUnderstandingState(
    sessionId: string,
    state: OrchestratorState,
    blueprint: WorkflowBlueprint
  ): void {
    this.sessionService.setOrchestratorState(sessionId, state);
    this.sessionService.setIntent(sessionId, this.responseBuilder.buildIntentRecord(state));
    this.sessionService.setBlueprint(sessionId, blueprint);
    this.sessionService.setWorkflowSummary(sessionId, state.summary);
    this.sessionService.setConfirmed(sessionId, false);
    this.sessionService.clearWorkflow(sessionId);
  }

  private selectActiveHistory(
    history: ConversationTurn[],
    previousState: OrchestratorState | null | undefined
  ): ConversationTurn[] {
    if (previousState?.decision !== 'reject_out_of_scope') {
      return history;
    }

    const lastUserTurn = [...history].reverse().find((turn) => turn.role === 'user');
    return lastUserTurn ? [lastUserTurn] : history;
  }

  private buildUserIntent(history: ConversationTurn[]): string {
    const userTurns = history
      .filter((turn) => turn.role === 'user')
      .map((turn) => turn.content.trim())
      .filter(Boolean);

    return userTurns.join('；');
  }

  private async composeWorkflowForConfirm(
    sessionId: string,
    history: ConversationTurn[],
    blueprint: WorkflowBlueprint | undefined,
    state: OrchestratorState,
    capabilities: HardwareCapability[]
  ): Promise<{ workflow: WorkflowDefinition; reasoning: string }> {
    const architectWorkflow = await this.tryComposeWithWorkflowArchitect(
      sessionId,
      history,
      blueprint,
      state
    );
    if (architectWorkflow) {
      return architectWorkflow;
    }

    return {
      workflow: await this.componentComposer.compose(
        capabilities,
        this.buildComposerRequirements(state, sessionId, capabilities),
        (event) => this.emitTrace(sessionId, event)
      ),
      reasoning: `component-composer fallback (${capabilities.length} capabilities)`,
    };
  }

  private async tryComposeWithWorkflowArchitect(
    sessionId: string,
    history: ConversationTurn[],
    blueprint: WorkflowBlueprint | undefined,
    state: OrchestratorState
  ): Promise<{ workflow: WorkflowDefinition; reasoning: string } | null> {
    if (!this.workflowArchitect) {
      return null;
    }

    this.emitTrace(sessionId, {
      source: 'orchestrator',
      phase: 'composition',
      kind: 'phase',
      status: 'started',
      title: 'WorkflowArchitect 主路径生成',
      detail: '优先走 LLM 驱动的工作流生成路径',
    });

    try {
      const contextFragments = buildArchitectFragments(
        this.hardwareComponents,
        buildArchitectToolDescriptions(),
        ALLOWED_NODE_TYPES
      );

      if ((state.entities?.length ?? 0) > 0 || state.topologyHint) {
        contextFragments.push(
          buildEntityBindingsFragment(state.entities ?? [], state.topologyHint ?? '')
        );
      }

      const result = await this.workflowArchitect.generateWorkflow({
        sessionId,
        userIntent: state.userIntent,
        entities: this.sessionService.getConfirmedEntities(sessionId),
        structuredEntities: state.entities,
        topologyHint: state.topologyHint,
        hardwareComponents: this.hardwareComponents,
        conversationHistory: history,
        blueprint,
        contextFragments,
      });

      if (!result.success || !result.workflow) {
        this.emitTrace(sessionId, {
          source: 'orchestrator',
          phase: 'composition',
          kind: 'result',
          status: 'fallback',
          title: 'WorkflowArchitect 主路径回退',
          detail: 'LLM 生成未产出可用工作流，退回 ComponentComposer',
          data: {
            iterations: result.iterations,
            success: result.success,
          },
        });
        return null;
      }

      this.emitTrace(sessionId, {
        source: 'orchestrator',
        phase: 'composition',
        kind: 'result',
        status: 'completed',
        title: 'WorkflowArchitect 已生成候选工作流',
        detail: `节点 ${result.workflow.nodes.length} 个`,
        data: {
          nodeCount: result.workflow.nodes.length,
          iterations: result.iterations,
        },
      });

      return {
        workflow: result.workflow,
        reasoning: result.reasoning || 'workflow-architect primary path',
      };
    } catch (error) {
      this.emitTrace(sessionId, {
        source: 'orchestrator',
        phase: 'composition',
        kind: 'result',
        status: 'fallback',
        title: 'WorkflowArchitect 主路径异常回退',
        detail: error instanceof Error ? error.message : '未知异常',
      });
      return null;
    }
  }

  private buildComposerRequirements(
    state: OrchestratorState,
    sessionId: string,
    capabilities: HardwareCapability[]
  ): Record<string, unknown> {
    const capabilityParams: Record<string, Partial<NodeSubParams>> = {};

    capabilities.forEach((capability) => {
      switch (capability.id) {
        case HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION:
          capabilityParams[capability.id] = {
            TTS_input: this.extractSpeechText(state.userIntent),
            audio_name: 'orchestrator_tts',
          };
          break;
        case HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK:
          capabilityParams[capability.id] = {
            audio_name: 'orchestrator_tts',
          };
          break;
        case HARDWARE_CAPABILITY_IDS.SCREEN.EMOJI_DISPLAY:
          capabilityParams[capability.id] = {
            execute_emoji: this.extractEmojiHint(state.userIntent),
          };
          break;
        case HARDWARE_CAPABILITY_IDS.HAND.GESTURE_EXECUTE:
          capabilityParams[capability.id] = {
            execute_gesture: this.extractGestureHint(state.userIntent),
          };
          break;
        case HARDWARE_CAPABILITY_IDS.YOLO_HAND.HAND_GESTURE_RECOGNITION:
        case HARDWARE_CAPABILITY_IDS.YOLO_RPS.RPS_GESTURE_RECOGNITION:
          capabilityParams[capability.id] = {
            yolov_output: 'gesture',
          };
          break;
        case HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION:
          capabilityParams[capability.id] = {
            face_info: 'target_face',
          };
          break;
        case HARDWARE_CAPABILITY_IDS.ASR.SPEECH_RECOGNITION:
          capabilityParams[capability.id] = {
            asr_output: 'speech_text',
          };
          break;
        default:
          break;
      }
    });

    return {
      userIntent: state.userIntent,
      keywords: state.searchKeywords,
      trigger_type: 'webhook',
      webhookPath: `orchestrator-${sessionId.slice(0, 8)}`,
      timeoutMs: 60000,
      branchCount: 1,
      conditions: undefined,
      capabilityParams,
    };
  }

  private extractSpeechText(userIntent: string): string {
    const quotedText = userIntent.match(/[“"']([^”"']{1,60})[”"']/);
    if (quotedText?.[1]) {
      return quotedText[1];
    }
    return '任务执行完成';
  }

  private extractGestureHint(userIntent: string): string {
    if (/中指/.test(userIntent)) {
      return 'Middle_Finger';
    }
    if (/(比个?V|手势V|胜利)/i.test(userIntent)) {
      return 'Victory';
    }
    if (/(点赞|大拇指)/.test(userIntent)) {
      return 'Thumbs_Up';
    }
    if (/挥手|招手/.test(userIntent)) {
      return 'Waving';
    }
    if (/石头/.test(userIntent)) {
      return 'Rock';
    }
    if (/剪刀/.test(userIntent)) {
      return 'Scissors';
    }
    if (/布/.test(userIntent)) {
      return 'Paper';
    }
    return 'Default';
  }

  private extractEmojiHint(userIntent: string): string {
    if (userIntent.includes('开心')) {
      return 'Happy';
    }
    if (userIntent.includes('难过')) {
      return 'Sad';
    }
    if (userIntent.includes('生气')) {
      return 'Angry';
    }
    return 'Peace';
  }

}
