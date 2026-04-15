/**
 * [INPUT]: 依赖 LLMClient、ReflectionDecisionPolicy、ReflectionAssessmentParser、ReflectionPromptBuilder、ConversationTurn 与可选 trace writer
 * [OUTPUT]: 对外提供 ReflectionEngine 结构化需求判定、边界识别与澄清结果生成
 * [POS]: agents 的反思循环核心，负责“接受-澄清-拒绝”决策
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { LLMClient } from './llm-client';
import { parseReflectionAssessmentResponse } from './reflection-assessment-parser';
import {
  applyReflectionDecisionPolicy,
  buildFallbackQuestions,
  buildFallbackReflectionAssessment,
  calculateReflectionConfidence,
  describeReflectionAssessment,
} from './reflection-decision-policy';
import {
  buildReflectionAssessmentPrompt,
  buildReflectionSystemPrompt,
} from './reflection-prompt-builder';
import type {
  AgentTraceWriter,
  ConversationTurn,
  HardwareCapability,
} from './types';

export type ReflectionDecision =
  | 'direct_accept'
  | 'clarify_needed'
  | 'reject_out_of_scope';

export interface ReflectionResult {
  decision: ReflectionDecision;
  complete: boolean;
  confidence: number;
  missing_info: MissingInfo[];
  clarification_questions: ClarificationQuestion[];
  reasoning_summary?: string;
  recognized_requirements: string[];
  suggested_user_actions: ClarificationActionSuggestion[];
  supported_capability_ids: string[];
  out_of_scope_reasons: string[];
  can_proceed: boolean;
}

export interface MissingInfo {
  category: 'trigger' | 'action' | 'condition' | 'feedback' | 'logic';
  description: string;
  priority: 1 | 2 | 3;
  blocking: boolean;
}

export interface ClarificationQuestion {
  question: string;
  options?: string[];
  priority: 1 | 2 | 3;
  context: string;
}

export interface ClarificationActionSuggestion {
  label: string;
  value: string;
  reason?: string;
  category: MissingInfo['category'];
}

interface ReflectionAssessment {
  decision: ReflectionDecision;
  reasoningSummary?: string;
  recognizedRequirements: string[];
  supportedCapabilityIds: string[];
  missingInfo: MissingInfo[];
  questions: ClarificationQuestion[];
  suggestedActions: ClarificationActionSuggestion[];
  outOfScopeReasons: string[];
  confidence?: number;
}

const MAX_CLARIFICATION_TURNS = 5;
const MAX_QUESTIONS = 5;
const DEFAULT_LLM_TIMEOUT_MS = 8000;

export class ReflectionEngine {
  constructor(
    private llmClient: LLMClient,
    private llmTimeoutMs: number = DEFAULT_LLM_TIMEOUT_MS
  ) {}

  async reflect(
    userIntent: string,
    discoveredCapabilities: HardwareCapability[],
    conversationHistory: ConversationTurn[],
    capabilityCatalog: HardwareCapability[] = discoveredCapabilities,
    trace?: AgentTraceWriter
  ): Promise<ReflectionResult> {
    trace?.({
      source: 'reflection_engine',
      phase: 'reflection',
      kind: 'phase',
      status: 'started',
      title: 'ReflectionEngine 开始反思',
      detail: `候选能力 ${discoveredCapabilities.length} 个，对话 ${conversationHistory.length} 轮`,
    });

    const clarificationTurns = this.countUserTurns(conversationHistory);
    const fallback = buildFallbackReflectionAssessment(
      {
        userIntent,
        history: conversationHistory,
        discoveredCapabilities,
      },
      clarificationTurns
    );
    const assessment = await this.generateAssessment(
      userIntent,
      discoveredCapabilities,
      capabilityCatalog,
      conversationHistory,
      fallback,
      trace
    );

    const hasBlockingMissing = assessment.missingInfo.some((item) => item.blocking);
    const complete = assessment.decision === 'direct_accept';
    const canProceed = assessment.decision === 'direct_accept' || (
      assessment.decision === 'clarify_needed' &&
      !hasBlockingMissing &&
      clarificationTurns >= MAX_CLARIFICATION_TURNS
    );
    const confidence = this.clamp(
      assessment.confidence ?? calculateReflectionConfidence(assessment, clarificationTurns, MAX_CLARIFICATION_TURNS),
      0,
      1
    );

    trace?.({
      source: 'reflection_engine',
      phase: 'reflection',
      kind: 'result',
      status: assessment.decision === 'reject_out_of_scope'
        ? 'failed'
        : complete
          ? 'completed'
          : 'info',
      title: '需求完整性评估完成',
      detail: describeReflectionAssessment(assessment),
      data: {
        decision: assessment.decision,
        missingCategories: assessment.missingInfo.map((item) => item.category),
        supportedCapabilityIds: assessment.supportedCapabilityIds,
        outOfScopeReasons: assessment.outOfScopeReasons,
      },
    });

    if (
      assessment.reasoningSummary ||
      assessment.recognizedRequirements.length > 0 ||
      assessment.suggestedActions.length > 0 ||
      assessment.outOfScopeReasons.length > 0
    ) {
      trace?.({
        source: 'reflection_engine',
        phase: 'reflection',
        kind: 'result',
        status: assessment.decision === 'reject_out_of_scope' ? 'failed' : 'completed',
        title: 'ReflectionEngine AI 反思产物',
        detail: assessment.reasoningSummary
          ?? describeReflectionAssessment(assessment),
        data: {
          decision: assessment.decision,
          recognizedRequirements: assessment.recognizedRequirements,
          suggestedActions: assessment.suggestedActions.map((item) => item.label),
          supportedCapabilityIds: assessment.supportedCapabilityIds,
          outOfScopeReasons: assessment.outOfScopeReasons,
        },
      });
    }

    trace?.({
      source: 'reflection_engine',
      phase: 'reflection',
      kind: 'phase',
      status: complete || canProceed ? 'completed' : assessment.decision === 'reject_out_of_scope' ? 'failed' : 'info',
      title: 'ReflectionEngine 反思结束',
      detail: complete
        ? '信息完整，可以直接进入组合'
        : assessment.decision === 'reject_out_of_scope'
          ? '需求超出当前硬件边界'
          : canProceed
            ? '信息未完全补齐，但达到放行条件'
            : '仍需继续澄清',
      data: {
        decision: assessment.decision,
        confidence,
        questionCount: assessment.questions.length,
        suggestedActionCount: assessment.suggestedActions.length,
        canProceed,
      },
    });

    return {
      decision: assessment.decision,
      complete,
      confidence,
      missing_info: complete || assessment.decision === 'reject_out_of_scope'
        ? []
        : assessment.missingInfo,
      clarification_questions: assessment.decision === 'clarify_needed' ? assessment.questions : [],
      reasoning_summary: assessment.reasoningSummary,
      recognized_requirements: assessment.recognizedRequirements,
      suggested_user_actions: assessment.decision === 'clarify_needed' ? assessment.suggestedActions : [],
      supported_capability_ids: assessment.supportedCapabilityIds,
      out_of_scope_reasons: assessment.outOfScopeReasons,
      can_proceed: canProceed && assessment.decision !== 'reject_out_of_scope',
    };
  }

  private async generateAssessment(
    userIntent: string,
    discoveredCapabilities: HardwareCapability[],
    capabilityCatalog: HardwareCapability[],
    history: ConversationTurn[],
    fallback: ReflectionAssessment,
    trace?: AgentTraceWriter
  ): Promise<ReflectionAssessment> {
    const prompt = buildReflectionAssessmentPrompt({
      userIntent,
      discoveredCapabilities,
      capabilityCatalog,
      history,
    });

    try {
      const response = await this.llmClient.chat(
        [
          { role: 'system', content: buildReflectionSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        {
          temperature: 0.1,
          maxTokens: 420,
          timeoutMs: this.llmTimeoutMs,
          jsonMode: true,
          trace,
          traceContext: {
            source: 'reflection_engine',
            phase: 'reflection',
            title: 'ReflectionEngine 需求判定',
            detail: '基于能力目录判断接受、澄清或拒绝',
            data: {
              capabilityCount: discoveredCapabilities.length,
              catalogSize: capabilityCatalog.length,
            },
          },
        }
      );
      const parsed = parseReflectionAssessmentResponse(response, capabilityCatalog, MAX_QUESTIONS);
      if (!parsed) {
        throw new Error('ReflectionEngine 返回结果不可解析');
      }

      return applyReflectionDecisionPolicy(
        this.mergeAssessment(parsed, fallback),
        {
          userIntent,
          history,
          discoveredCapabilities,
        }
      );
    } catch {
      trace?.({
        source: 'reflection_engine',
        phase: 'reflection',
        kind: 'phase',
        status: 'fallback',
        title: 'ReflectionEngine 回退保守判定',
        detail: 'LLM 未返回可解析结果，改用保守规则兜底',
      });
      return fallback;
    }
  }

  private mergeAssessment(
    parsed: ReflectionAssessment,
    fallback: ReflectionAssessment
  ): ReflectionAssessment {
    const decision = parsed.decision ?? fallback.decision;
    const supportedCapabilityIds = parsed.supportedCapabilityIds.length > 0
      ? parsed.supportedCapabilityIds
      : decision === 'direct_accept'
        ? fallback.supportedCapabilityIds
        : [];

    if (decision === 'reject_out_of_scope') {
      return {
        decision,
        reasoningSummary: parsed.reasoningSummary ?? fallback.reasoningSummary,
        recognizedRequirements: parsed.recognizedRequirements,
        supportedCapabilityIds,
        missingInfo: [],
        questions: [],
        suggestedActions: [],
        outOfScopeReasons: parsed.outOfScopeReasons.length > 0
          ? parsed.outOfScopeReasons
          : ['当前需求需要目录外能力，暂时无法支持。'],
        confidence: parsed.confidence ?? fallback.confidence,
      };
    }

    const missingInfo = parsed.missingInfo.length > 0
      ? parsed.missingInfo
      : decision === 'clarify_needed'
        ? fallback.missingInfo
        : [];
    const questions = decision === 'clarify_needed'
      ? (parsed.questions.length > 0 ? parsed.questions : buildFallbackQuestions(missingInfo, MAX_QUESTIONS))
      : [];
    const suggestedActions = decision === 'clarify_needed'
      ? parsed.suggestedActions
      : [];

    return {
      decision,
      reasoningSummary: parsed.reasoningSummary ?? fallback.reasoningSummary,
      recognizedRequirements: parsed.recognizedRequirements,
      supportedCapabilityIds,
      missingInfo,
      questions,
      suggestedActions,
      outOfScopeReasons: [],
      confidence: parsed.confidence ?? fallback.confidence,
    };
  }

  private countUserTurns(history: ConversationTurn[]): number {
    return history.filter((turn) => turn.role === 'user').length;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
