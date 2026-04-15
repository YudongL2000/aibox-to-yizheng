/**
 * [INPUT]: 依赖 MCP/LLM 客户端、prompt fragments 与 workflow-architect 子模块
 * [OUTPUT]: 对外提供 WorkflowArchitect、请求/结果类型与 scene safety-net flags，负责工作流生成与验证闭环
 * [POS]: agents 的 LLM 工作流编排壳层，只保留公开 API、LLM 循环与子模块调度
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { MCPClient } from './mcp-client';
import { LLMClient, type ChatMessage } from './llm-client';
import { HardwareComponent } from './hardware-components';
import {
  ConversationTurn,
  DiscoveredEntity,
  WorkflowBlueprint,
  WorkflowDefinition,
} from './types';
import { AgentLogger, ValidationSummary } from './agent-logger';
import {
  buildArchitectFragments,
  buildEntityBindingsFragment,
  buildValidationFeedbackFragment,
} from './prompts/architect-system';
import {
  assembleChangedFragments,
  assembleFragments,
  type ContextFragment,
  updateFragmentInList,
} from './prompts/context-fragment';
import { selectPromptVariant } from './prompts/prompt-variants';
import { SimpleCache } from '../utils/simple-cache';
import { logger } from '../utils/logger';
import { ALLOWED_NODE_TYPES } from './allowed-node-types';
import type { ValidationResult } from './mcp-client';
import {
  buildArchitectMessages,
  buildArchitectToolDescriptions,
  buildNodeContextSummary,
} from './workflow-architect/prompt-context';
import { WorkflowJsonExtractor } from './workflow-architect/json-extractor';
import { WorkflowNotesEnricher } from './workflow-architect/node/notes-enricher';
import { WorkflowTopologyResolver } from './workflow-architect/node/topology-resolver';
import { WorkflowNodeNormalizer } from './workflow-architect/node/normalizer';
import { WorkflowGameSceneFlow } from './workflow-architect/scene/game-flow';
import { WorkflowEmotionSceneFlow } from './workflow-architect/scene/emotion-flow';
import { WorkflowGestureIdentityFlow } from './workflow-architect/scene/gesture-identity-flow';
import { WorkflowAudioRepairFlow } from './workflow-architect/scene/audio-repair-flow';
import { WorkflowResultFlow } from './workflow-architect/scene/result-flow';
import { WorkflowAssignFlow } from './workflow-architect/scene/assign-flow';
import {
  WorkflowSceneSafetyNetController,
  type WorkflowSceneSafetyNetDormantFlags,
  type WorkflowSceneSafetyNetFlags,
} from './workflow-architect/scene/safety-net-controls';

export interface WorkflowRequest {
  sessionId?: string;
  userIntent: string;
  entities: Record<string, string>;
  structuredEntities?: DiscoveredEntity[];
  topologyHint?: string;
  hardwareComponents: HardwareComponent[];
  conversationHistory: ConversationTurn[];
  blueprint?: WorkflowBlueprint;
  contextFragments?: ContextFragment[];
}

export interface WorkflowResult {
  success: boolean;
  workflow?: WorkflowDefinition;
  validationResult?: {
    isValid: boolean;
    errors: { message: string }[];
  };
  iterations: number;
  reasoning: string;
}

export interface WorkflowArchitectOptions {
  maxIterations?: number;
  llmTimeoutMs?: number;
  cacheTtlSeconds?: number;
  promptVariant?: string;
  sceneSafetyNetFlags?: Partial<WorkflowSceneSafetyNetFlags>;
  sceneSafetyNetDormantFlags?: WorkflowSceneSafetyNetDormantFlags;
}

export interface WorkflowGenerationOptions {
  maxIterations?: number;
}
export type {
  WorkflowSceneSafetyNetDormantFlags,
  WorkflowSceneSafetyNetFlags,
} from './workflow-architect/scene/safety-net-controls';

const BASE_NODE_QUERIES = [
  'http request',
  'webhook',
  'schedule trigger',
  'if',
  'split in batches',
  'set',
];
const BASE_NODE_TYPES = [...ALLOWED_NODE_TYPES];

export class WorkflowArchitect {
  private static readonly MAX_ITERATIONS_CAP = 3;

  private readonly maxIterations: number;
  private readonly llmTimeoutMs: number;
  private readonly cacheTtlSeconds: number;
  private readonly cache = new SimpleCache();
  private readonly nodeContextCache = new SimpleCache();
  private readonly agentLogger = new AgentLogger();
  private readonly promptVariant?: string;
  private readonly sceneSafetyNetController: WorkflowSceneSafetyNetController;
  private activeEntities: Record<string, string> = {};

  private readonly nodeNormalizer: WorkflowNodeNormalizer;
  private readonly jsonExtractor: WorkflowJsonExtractor;
  private readonly gameSceneFlow: WorkflowGameSceneFlow;
  private readonly emotionSceneFlow: WorkflowEmotionSceneFlow;
  private readonly gestureIdentityFlow: WorkflowGestureIdentityFlow;
  private readonly audioRepairFlow: WorkflowAudioRepairFlow;
  private readonly resultFlow: WorkflowResultFlow;
  private readonly assignFlow: WorkflowAssignFlow;

  constructor(
    private llmClient: LLMClient,
    private mcpClient: MCPClient,
    options: WorkflowArchitectOptions = {}
  ) {
    this.maxIterations = Math.min(
      options.maxIterations ?? 5,
      WorkflowArchitect.MAX_ITERATIONS_CAP
    );
    this.llmTimeoutMs = options.llmTimeoutMs ?? 30000;
    this.cacheTtlSeconds = options.cacheTtlSeconds ?? 600;
    this.promptVariant = options.promptVariant;
    this.sceneSafetyNetController = new WorkflowSceneSafetyNetController(
      options.sceneSafetyNetFlags,
      options.sceneSafetyNetDormantFlags
    );

    const notesEnricher = new WorkflowNotesEnricher();
    const topologyResolver = new WorkflowTopologyResolver();
    this.gestureIdentityFlow = new WorkflowGestureIdentityFlow(topologyResolver);
    this.audioRepairFlow = new WorkflowAudioRepairFlow(topologyResolver, this.gestureIdentityFlow);
    this.resultFlow = new WorkflowResultFlow(topologyResolver);
    this.assignFlow = new WorkflowAssignFlow(topologyResolver);
    this.gameSceneFlow = new WorkflowGameSceneFlow(topologyResolver);
    this.emotionSceneFlow = new WorkflowEmotionSceneFlow(topologyResolver, notesEnricher);
    this.nodeNormalizer = new WorkflowNodeNormalizer(notesEnricher, topologyResolver, {
      apply: (workflow) => {
        this.sceneSafetyNetController.apply(
          workflow,
          'ensureGestureIdentityFlow',
          () => this.gestureIdentityFlow.ensureGestureIdentityFlow(workflow, this.activeEntities)
        );
        this.sceneSafetyNetController.apply(
          workflow,
          'ensureEmotionInteractionFlow',
          () => this.emotionSceneFlow.ensureEmotionInteractionFlow(workflow)
        );
        this.sceneSafetyNetController.apply(
          workflow,
          'pruneGestureRedundantTtsNodes',
          () => this.audioRepairFlow.pruneGestureRedundantTtsNodes(workflow)
        );
        this.sceneSafetyNetController.apply(
          workflow,
          'ensureGameHandExecutor',
          () => this.gameSceneFlow.ensureGameHandExecutor(workflow)
        );
        this.sceneSafetyNetController.apply(
          workflow,
          'ensureIfDirectExecutorConnections',
          () => this.gameSceneFlow.ensureIfDirectExecutorConnections(workflow)
        );
        this.sceneSafetyNetController.apply(
          workflow,
          'pruneSpeakerRelayNodes',
          () => this.audioRepairFlow.pruneSpeakerRelayNodes(workflow)
        );
        this.sceneSafetyNetController.apply(
          workflow,
          'ensureSpeakerHasTts',
          () => this.audioRepairFlow.ensureSpeakerHasTts(workflow)
        );
        this.sceneSafetyNetController.apply(
          workflow,
          'ensureResultBranches',
          () => this.resultFlow.ensureResultBranches(workflow)
        );
        this.sceneSafetyNetController.apply(
          workflow,
          'ensureHandHasAssign',
          () => this.assignFlow.ensureHandHasAssign(workflow)
        );
      },
    });
    this.jsonExtractor = new WorkflowJsonExtractor(this.llmClient, this.agentLogger, {
      llmTimeoutMs: this.llmTimeoutMs,
      normalizeWorkflow: (workflow) => this.nodeNormalizer.normalizeWorkflow(workflow),
    });
  }

  async generateWorkflow(
    request: WorkflowRequest,
    options: WorkflowGenerationOptions = {}
  ): Promise<WorkflowResult> {
    this.activeEntities = request.entities ?? {};
    const cacheKey = JSON.stringify({ intent: request.userIntent, entities: request.entities });
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached as WorkflowResult;
    }

    const sessionId = request.sessionId ?? 'unknown';
    const nodeContext = await this.buildNodeContext(request.hardwareComponents);
    const toolDescriptions = buildArchitectToolDescriptions();
    const variant = selectPromptVariant(this.promptVariant, request.userIntent);
    const promptFragments = request.contextFragments?.length
      ? [...request.contextFragments]
      : buildArchitectFragments(
          request.hardwareComponents,
          toolDescriptions,
          ALLOWED_NODE_TYPES,
          variant
        );

    if (
      !promptFragments.some((fragment) => fragment.id === 'entity_bindings') &&
      ((request.structuredEntities?.length ?? 0) > 0 || Boolean(request.topologyHint))
    ) {
      promptFragments.push(
        buildEntityBindingsFragment(
          request.structuredEntities ?? [],
          request.topologyHint ?? ''
        )
      );
    }

    const userMessage = this.buildUserMessage(request);
    let lastErrors: string[] = [];
    let reasoning = '';
    let workflow: WorkflowDefinition | undefined;
    let referenceVersions = new Map<string, number>();
    const requestedIterations = options.maxIterations ?? this.maxIterations;
    const maxIterations = Math.min(requestedIterations, WorkflowArchitect.MAX_ITERATIONS_CAP);

    for (let attempt = 1; attempt <= maxIterations; attempt += 1) {
      const sentVersions = new Map(
        promptFragments.map((fragment) => [fragment.id, fragment.version])
      );
      const promptBody = attempt === 1
        ? assembleFragments(promptFragments)
        : assembleChangedFragments(promptFragments, referenceVersions);
      const systemPrompt = `${promptBody}\n\n# 节点上下文\n${nodeContext}`;
      const messages = buildArchitectMessages(
        request.conversationHistory,
        systemPrompt,
        userMessage,
        lastErrors
      );
      const response = await this.callLLM(messages);
      this.agentLogger.logLLMCall({
        sessionId,
        phase: 'generating',
        systemPrompt,
        userMessage,
        response,
      });

      reasoning = this.jsonExtractor.extractReasoning(response);
      try {
        workflow = this.nodeNormalizer.normalizeWorkflow(
          this.jsonExtractor.extractWorkflow(response)
        );
      } catch (error) {
        const candidate = this.jsonExtractor.extractJsonCandidate(response);
        logger.warn('WorkflowArchitect: workflow JSON parse failed', {
          error: error instanceof Error ? error.message : 'LLM未返回有效的工作流JSON',
          jsonSnippet: this.jsonExtractor.truncateForLog(candidate ?? response, 2000),
        });
        const repaired = await this.jsonExtractor.repairWorkflowJson(response, sessionId);
        if (!repaired) {
          lastErrors = [
            error instanceof Error ? error.message : 'LLM未返回有效的工作流JSON',
          ];
          updateFragmentInList(
            promptFragments,
            buildValidationFeedbackFragment(lastErrors, attempt)
          );
          referenceVersions = sentVersions;
          continue;
        }
        workflow = repaired;
      }

      this.agentLogger.logWorkflowGenerated({
        sessionId,
        attempt,
        workflow,
        reasoning,
      });

      const validation = await this.mcpClient.validateWorkflow(workflow);
      this.agentLogger.logValidationResult({
        sessionId,
        attempt,
        stage: 'initial',
        validationResult: this.summarizeValidation(validation),
      });
      if (validation.isValid) {
        const result: WorkflowResult = {
          success: true,
          workflow,
          validationResult: { isValid: true, errors: [] },
          iterations: attempt,
          reasoning,
        };
        this.cache.set(cacheKey, result, this.cacheTtlSeconds);
        return result;
      }

      const fixed = await this.mcpClient.autofixWorkflow(workflow);
      const fixedValidation = await this.mcpClient.validateWorkflow(fixed);
      this.agentLogger.logValidationResult({
        sessionId,
        attempt,
        stage: 'autofix',
        validationResult: this.summarizeValidation(fixedValidation),
      });
      if (fixedValidation.isValid) {
        const result: WorkflowResult = {
          success: true,
          workflow: fixed,
          validationResult: { isValid: true, errors: [] },
          iterations: attempt,
          reasoning,
        };
        this.cache.set(cacheKey, result, this.cacheTtlSeconds);
        return result;
      }

      lastErrors = fixedValidation.errors.map((error) => error.message);
      updateFragmentInList(
        promptFragments,
        buildValidationFeedbackFragment(lastErrors, attempt)
      );
      referenceVersions = sentVersions;
      logger.debug('WorkflowArchitect: validation failed', { attempt, errors: lastErrors });
    }

    return {
      success: false,
      workflow,
      validationResult: {
        isValid: false,
        errors: lastErrors.map((message) => ({ message })),
      },
      iterations: maxIterations,
      reasoning,
    };
  }

  private buildUserMessage(request: WorkflowRequest): string {
    const entityStr = Object.entries(request.entities)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    const selection = request.blueprint?.componentSelection;
    const componentGuidance = selection
      ? `
# 组件组装建议（请严格遵循）
- 推荐拓扑: ${selection.topology}
- 推荐组件: ${selection.componentAssembly.join(' → ')}
- 最低节点数: ${selection.minimumNodes}

请按以下顺序组装组件：
1. 触发器: ${selection.trigger}
2. 输入采集: ${selection.inputs.join(', ') || '无'}
3. AI 处理: ${selection.processes.join(', ') || '无'}
4. 条件判断: ${selection.decisions.join(', ') || '无'}
5. 输出执行: ${selection.outputs.join(', ') || '无'}

从组件库中复制对应组件的完整节点配置，确保包含环境变量和容错表达式。
`
      : '';
    const minimumNodes = selection?.minimumNodes ?? 10;
    const requirements = [
      '使用search_nodes查询需要的节点类型',
      '使用get_node确认节点配置与typeVersion',
      '输出完整workflow JSON（包含nodes/connections/settings）',
      `仅使用允许的节点类型：${ALLOWED_NODE_TYPES.join(', ')}`,
      '先输出Reasoning，再输出JSON代码块',
      ...(selection
        ? [
            '必须使用推荐组件，从组件库复制完整节点配置',
            `确保节点数 >= ${minimumNodes}`,
          ]
        : []),
      '所有 httpRequest 必须包含环境变量兜底和 timeout: 60000',
      '所有数据提取必须使用容错表达式',
      'connections 必须用节点 name（不要用 id）',
      'JSON 必须严格合法（双引号，无注释，无尾逗号）',
    ];

    return `
请为以下需求生成一个n8n工作流：

用户意图: ${request.userIntent}
识别实体: ${entityStr || '无'}
${componentGuidance}

要求：
${requirements.map((line, index) => `${index + 1}. ${line}`).join('\n')}
`;
  }

  private async buildNodeContext(components: HardwareComponent[]): Promise<string> {
    const key = components.map((component) => component.name).sort().join('|');
    const cacheKey = `node-context:${key || 'all'}`;
    const cached = this.nodeContextCache.get(cacheKey);
    if (cached) {
      return cached as string;
    }

    const nodeTypes = new Set<string>(BASE_NODE_TYPES);
    components.forEach((component) => {
      if (ALLOWED_NODE_TYPES.includes(component.nodeType)) {
        nodeTypes.add(component.nodeType);
      }
    });

    for (const query of BASE_NODE_QUERIES) {
      await this.mcpClient.searchNodes({ query, limit: 5, includeExamples: false });
    }

    const details = await Promise.all(
      Array.from(nodeTypes).map(async (nodeType) => {
        try {
          return await this.mcpClient.getNode({ nodeType, detail: 'standard' });
        } catch {
          return null;
        }
      })
    );

    const context = buildNodeContextSummary(details);
    this.nodeContextCache.set(cacheKey, context, this.cacheTtlSeconds);
    return context;
  }

  private async callLLM(messages: ChatMessage[]): Promise<string> {
    return this.llmClient.chat(messages, {
      maxTokens: 10000,
      timeoutMs: this.llmTimeoutMs,
    });
  }

  private summarizeValidation(validation: ValidationResult): ValidationSummary {
    return {
      isValid: validation.isValid,
      errors: validation.errors.map((error) => ({
        message: error.message,
        code: error.code,
        nodeName: error.nodeName,
        nodeId: error.nodeId,
      })),
      warnings: validation.warnings.map((warning) => ({
        message: warning.message,
        code: warning.code,
        nodeName: warning.nodeName,
        nodeId: warning.nodeId,
      })),
    };
  }
}
