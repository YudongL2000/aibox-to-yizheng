/**
 * [INPUT]: 依赖 HardwareComponent、ReflectionResult、WorkflowBlueprint 等编排期结构
 * [OUTPUT]: 对外提供 OrchestratorResponseBuilder，用于状态构建、澄清交互与响应文案生成
 * [POS]: orchestrator/ 的响应装配层，负责把 reflection 产物变成前端可消费的 guidance/summary
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { HardwareComponent } from '../hardware-components';
import type {
  ClarificationActionSuggestion,
  ClarificationQuestion,
  ReflectionResult,
} from '../reflection-engine';
import type {
  AgentResponse,
  DiscoveredEntity,
  HardwareCapability,
  InteractionOption,
  InteractionRequest,
  Intent,
  OrchestratorState,
  WorkflowBlueprint,
} from '../types';

const MAX_QUESTION_COUNT = 2;

type ClarificationOptionCandidate = {
  option: InteractionOption;
  category?: ReflectionResult['missing_info'][number]['category'];
  priority: number;
  blocking: boolean;
  sourceOrder: number;
};

export class OrchestratorResponseBuilder {
  constructor(private readonly hardwareComponents: HardwareComponent[]) {}

  buildState(
    userIntent: string,
    capabilities: HardwareCapability[],
    reflection: ReflectionResult,
    summary: string,
    searchKeywords: string[],
    discovery?: {
      entities?: DiscoveredEntity[];
      topologyHint?: string;
    }
  ): OrchestratorState {
    const clarificationOptions = this.buildAiNativeClarificationOptions(reflection);
    return {
      phase: 'reflection',
      decision: reflection.decision,
      userIntent,
      capabilityIds: capabilities.map((capability) => capability.id),
      searchKeywords,
      entities: discovery?.entities ?? [],
      topologyHint: discovery?.topologyHint ?? '',
      missingFields: reflection.missing_info.map((item) => item.category),
      pendingQuestions: this.pickQuestions(reflection).map((question) => question.question),
      pendingActions: clarificationOptions,
      reasoningSummary: reflection.reasoning_summary,
      recognizedRequirements: [...reflection.recognized_requirements],
      outOfScopeReasons: [...reflection.out_of_scope_reasons],
      summary,
      confidence: reflection.confidence,
      complete: reflection.complete,
      canProceed: reflection.can_proceed,
    };
  }

  buildIntentRecord(state: OrchestratorState): Intent {
    return {
      category: 'capability_driven',
      entities: {
        capability_ids: state.capabilityIds.join(','),
        search_keywords: state.searchKeywords.join(','),
        entity_keys: (state.entities ?? []).map((entity) => entity.key).join(','),
        topology_hint: state.topologyHint ?? '',
      },
      confidence: state.confidence,
      missingInfo: [...state.missingFields],
    };
  }

  buildDecisionResponse(
    state: OrchestratorState,
    blueprint: WorkflowBlueprint,
    summary: string,
    capabilities: HardwareCapability[],
    reflection: ReflectionResult
  ): AgentResponse {
    if (reflection.decision === 'reject_out_of_scope') {
      return this.buildRejectResponse(reflection);
    }

    if (reflection.decision === 'clarify_needed') {
      return this.buildGuidanceResponse(state.userIntent, capabilities, reflection);
    }

    return this.buildSummaryResponse(blueprint, summary, capabilities, reflection);
  }

  buildRejectedStateResponse(state: OrchestratorState): AgentResponse {
    const reasons = (state.outOfScopeReasons ?? [])
      .map((reason) => `- ${reason}`)
      .join('\n');

    const sections: string[] = [
      '这个需求目前仍然超出我当前支持的硬件边界，先不进入工作流生成。',
    ];

    if (state.reasoningSummary) {
      sections.push(`**判断依据**\n${state.reasoningSummary}`);
    }

    if (reasons) {
      sections.push(`**超出边界的原因**\n${reasons}`);
    }

    sections.push('> 如果要继续，我们需要先把目标改写成当前支持的机器人能力。');

    return {
      type: 'guidance',
      message: sections.join('\n\n'),
      missingInfo: [],
      metadata: {
        showContinueButton: true,
        showConfirmBuildButton: false,
      },
    };
  }

  buildPendingGuidanceResponse(state: OrchestratorState): AgentResponse {
    const interaction = this.buildClarificationInteraction(
      state.missingFields,
      state.pendingActions ?? []
    );
    return {
      type: 'guidance',
      message: this.buildPendingGuidanceMessage(state, interaction),
      clarificationQuestions: state.pendingQuestions.slice(0, MAX_QUESTION_COUNT),
      interaction,
      missingInfo: [...state.missingFields],
      metadata: {
        showContinueButton: true,
        showConfirmBuildButton: false,
      },
    };
  }

  buildCompositionFailureResponse(
    error: unknown,
    attemptCount: number,
    state: OrchestratorState
  ): AgentResponse {
    const errorHint = error instanceof Error ? error.message : '未知异常';

    const sections: string[] = [
      '工作流生成过程中遇到问题，暂时无法完成构建。',
    ];

    if (state.reasoningSummary) {
      sections.push(`**当前理解**\n${state.reasoningSummary}`);
    }

    sections.push(`**失败原因**\n${errorHint}`);

    const suggestions: string[] = [
      '你可以补充更多细节后再次点击「确认构建」',
      '检查需求描述是否包含不支持的硬件或能力',
    ];

    if (attemptCount >= 3) {
      suggestions.push('请尝试简化需求或分步描述');
    }

    sections.push(`**建议**\n${suggestions.map((s) => `- ${s}`).join('\n')}`);
    sections.push('> 你可以继续补充或修改需求，也可以直接重试。');

    return {
      type: 'guidance',
      message: sections.join('\n\n'),
      suggestions,
      missingInfo: state.missingFields.length > 0 ? [...state.missingFields] : undefined,
      metadata: {
        showContinueButton: true,
        showConfirmBuildButton: true,
      },
    };
  }

  buildSummaryMessage(
    userIntent: string,
    capabilities: HardwareCapability[],
    reflection: ReflectionResult
  ): string {
    const capabilitySummary = this.describeCapabilities(capabilities);
    const assumptionText = reflection.decision === 'direct_accept' && reflection.missing_info.length > 0
      ? `我会先按默认逻辑处理：${reflection.missing_info
          .map((item) => item.description.replace(/。$/, ''))
          .join('；')}。`
      : '';

    const sections: string[] = [];

    if (capabilitySummary) {
      sections.push(`**能力组合**\n${capabilitySummary}`);
    } else {
      sections.push('我会先从一个最小可运行的工作流开始生成。');
    }

    sections.push(`**需求总结**\n${userIntent}`);

    if (assumptionText) {
      sections.push(assumptionText);
    }

    sections.push('> 如果这就是你的目标，可以点击「确认构建」，我会生成第一版工作流。');

    return sections.join('\n\n');
  }

  buildBlueprint(
    userIntent: string,
    capabilities: HardwareCapability[],
    reflection: ReflectionResult
  ): WorkflowBlueprint {
    const triggerType = 'webhook';
    const logicNodes = reflection.missing_info.some(
      (item) => item.category === 'logic' || item.category === 'condition'
    )
      ? [{ type: 'if' as const, config: { fallback: true } }]
      : [];

    const stageBuckets = this.bucketCapabilities(capabilities);
    const componentAssembly = [
      triggerType,
      ...stageBuckets.inputs,
      ...stageBuckets.processes,
      ...stageBuckets.decisions,
      ...stageBuckets.outputs,
    ];

    return {
      intentSummary: userIntent,
      triggers: [{ type: triggerType, config: {} }],
      logic: logicNodes,
      executors: stageBuckets.outputs.map(() => ({ type: 'httpRequest' as const, config: {} })),
      missingFields: reflection.missing_info.map((item) => item.category),
      componentSelection: {
        trigger: triggerType,
        inputs: stageBuckets.inputs,
        processes: stageBuckets.processes,
        decisions: stageBuckets.decisions,
        outputs: stageBuckets.outputs,
        topology: componentAssembly.join(' -> '),
        minimumNodes: Math.max(2, componentAssembly.length),
        componentAssembly,
      },
    };
  }

  private buildGuidanceResponse(
    userIntent: string,
    capabilities: HardwareCapability[],
    reflection: ReflectionResult
  ): AgentResponse {
    const clarificationTargets = this.resolveClarificationTargets(reflection);
    const interaction = this.buildClarificationInteraction(
      clarificationTargets,
      this.buildAiNativeClarificationOptions(reflection)
    );
    return {
      type: 'guidance',
      message: this.buildGuidanceMessage(capabilities, reflection, interaction),
      clarificationQuestions: this.pickQuestions(reflection).map((question) => question.question),
      interaction,
      missingInfo: clarificationTargets,
      metadata: {
        showContinueButton: true,
        showConfirmBuildButton: false,
      },
    };
  }

  private buildRejectResponse(reflection: ReflectionResult): AgentResponse {
    const reasons = reflection.out_of_scope_reasons.length > 0
      ? reflection.out_of_scope_reasons.map((reason) => `- ${reason}`).join('\n')
      : '- 当前需求需要目录外能力，暂时无法支持。';

    const sections: string[] = [
      '这个需求目前超出我当前支持的硬件边界，不能直接帮你生成工作流。',
    ];

    if (reflection.reasoning_summary) {
      sections.push(`**判断依据**\n${reflection.reasoning_summary}`);
    }

    sections.push(`**超出边界的原因**\n${reasons}`);
    sections.push('> 如果你愿意，我可以帮你改写成当前能力范围内的机器人需求。');

    return {
      type: 'guidance',
      message: sections.join('\n\n'),
      missingInfo: [],
      metadata: {
        showContinueButton: true,
        showConfirmBuildButton: false,
      },
    };
  }

  private buildSummaryResponse(
    blueprint: WorkflowBlueprint,
    summary: string,
    capabilities: HardwareCapability[],
    reflection: ReflectionResult
  ): AgentResponse {
    return {
      type: 'summary_ready',
      message: summary,
      blueprint,
      confirmedEntities: {
        capability_count: String(capabilities.length),
        confidence: reflection.confidence.toFixed(2),
      },
      missingInfo: reflection.missing_info.map((item) => item.category),
      metadata: {
        showContinueButton: true,
        showConfirmBuildButton: true,
      },
    };
  }

  private buildGuidanceMessage(
    capabilities: HardwareCapability[],
    reflection: ReflectionResult,
    interaction?: InteractionRequest
  ): string {
    const capabilitySummary = this.describeCapabilities(capabilities);
    const missingFields = reflection.missing_info.map((item) => item.category);
    const { current: currentMissing, remaining: remainingMissing } = this.splitClarificationFields(
      missingFields
    );
    const missingSummary = this.describeMissingFields(missingFields);
    const recognized = reflection.recognized_requirements;

    const sections: string[] = [];

    // ---- 能力匹配 ----
    if (capabilitySummary) {
      sections.push(`**已匹配能力**\n${capabilitySummary}`);
    } else {
      sections.push('我还没有匹配到足够明确的硬件能力。');
    }

    // ---- 已理解需求 ----
    if (recognized.length > 0) {
      const list = recognized.map((r, i) => `${i + 1}. ${r}`).join('\n');
      sections.push(`**已理解需求**\n${list}`);
    }

    // ---- 当前判断 ----
    if (reflection.reasoning_summary) {
      sections.push(`**当前判断**\n${reflection.reasoning_summary}`);
    }

    // ---- 缺失字段 ----
    if (interaction && currentMissing) {
      sections.push(`**当前先确认**\n${currentMissing}`);
      if (remainingMissing) {
        sections.push(`**后续待确认**\n${remainingMissing}`);
      }
    } else if (missingSummary) {
      sections.push(`**还需补充**\n${missingSummary}`);
    }

    // ---- 下一步提示 ----
    if (interaction) {
      sections.push('> 先从下面选一个最接近的下一步，我会继续收敛需求；也可以直接继续输入。');
    } else {
      const questions = this.pickQuestions(reflection);
      sections.push(questions.length > 0
        ? '> 我先只追问当前最关键的一步，请看下面的澄清问题。'
        : '> 还需要继续补充关键信息。');
    }

    return sections.join('\n\n');
  }

  private buildPendingGuidanceMessage(
    state: OrchestratorState,
    interaction?: InteractionRequest
  ): string {
    const missingSummary = this.describeMissingFields(state.missingFields);
    const { current: currentMissing, remaining: remainingMissing } = this.splitClarificationFields(
      state.missingFields
    );
    const recognized = state.recognizedRequirements ?? [];

    const sections: string[] = [];

    sections.push('还有关键信息没补齐，我先不直接生成工作流。');

    if (recognized.length > 0) {
      const list = recognized.map((r, i) => `${i + 1}. ${r}`).join('\n');
      sections.push(`**当前已明确**\n${list}`);
    }

    if (state.reasoningSummary) {
      sections.push(`**当前判断**\n${state.reasoningSummary}`);
    }

    if (interaction && currentMissing) {
      sections.push(`**当前先确认**\n${currentMissing}`);
      if (remainingMissing) {
        sections.push(`**后续待确认**\n${remainingMissing}`);
      }
    } else if (missingSummary) {
      sections.push(`**还需补充**\n${missingSummary}`);
    }

    if (interaction) {
      sections.push('> 先从下面选一个最接近的下一步，我会继续收敛需求；也可以继续自由输入。');
    } else {
      sections.push(state.pendingQuestions.length > 0
        ? '> 我先只追问当前最关键的一步，请看下面的澄清问题。'
        : '> 还需要继续补充关键信息。');
    }

    return sections.join('\n\n');
  }

  private resolveClarificationTargets(
    reflection: ReflectionResult
  ): string[] {
    return reflection.missing_info.map((item) => item.category);
  }

  private buildClarificationInteraction(
    missingFields: string[],
    options: InteractionOption[]
  ): InteractionRequest | undefined {
    if (options.length === 0) {
      return undefined;
    }

    const currentFocus = this.describeMissingFields(missingFields.slice(0, 1)) || '当前关键信息';

    return {
      id: `clarification_${missingFields.join('_') || 'next_step'}`,
      mode: 'single',
      field: 'clarification_action',
      title: `先确认${currentFocus}`,
      description: `这一步只确认${currentFocus}。选一个最接近的答案，我再继续追问下一项。`,
      options,
      minSelections: 1,
      maxSelections: 1,
    };
  }

  private buildAiNativeClarificationOptions(reflection: ReflectionResult): InteractionOption[] {
    const suggestedOptions = this.normalizeInteractionOptions(
      reflection.suggested_user_actions,
      reflection
    );
    if (suggestedOptions.length > 0) {
      return this.limitClarificationOptions(suggestedOptions).map((candidate) => candidate.option);
    }
    return this.limitClarificationOptions(this.buildQuestionOptions(reflection))
      .map((candidate) => candidate.option);
  }

  private buildQuestionOptions(reflection: ReflectionResult): ClarificationOptionCandidate[] {
    const missingInfoByCategory = new Map(
      reflection.missing_info.map((item) => [item.category, item])
    );
    const options = new Map<string, ClarificationOptionCandidate>();

    const orderedQuestions = [...reflection.clarification_questions]
      .map((question, index) => ({
        question,
        index,
        category: this.resolveQuestionCategory(question.context, reflection, index),
      }))
      .sort((left, right) => this.compareClarificationCategories(
        left.category,
        right.category,
        reflection
      ) || left.index - right.index);

    const primaryCategory = orderedQuestions[0]?.category
      ?? this.getPrimaryMissingInfo(reflection)?.category;

    orderedQuestions
      .filter(({ category }) => !primaryCategory || category === primaryCategory)
      .forEach(({ question, index, category }) => {
      const questionReason = question.question.trim();
      const missingInfo = category ? missingInfoByCategory.get(category) : undefined;

      question.options?.forEach((value, optionIndex) => {
        const normalizedValue = value.trim();
        if (!normalizedValue || options.has(normalizedValue)) {
          return;
        }

        const description = missingInfo?.description;
        options.set(normalizedValue, {
          option: {
            label: normalizedValue,
            value: normalizedValue,
            reason: description ?? questionReason,
          },
          category,
          priority: missingInfo?.priority ?? 3,
          blocking: missingInfo?.blocking ?? false,
          sourceOrder: index * 10 + optionIndex,
        });
      });
      });

    // ---- fallback: 当前问题缺少 options 时，为当前优先环节合成中文候选 ----
    if (options.size === 0) {
      const primaryMissingInfo = primaryCategory
        ? missingInfoByCategory.get(primaryCategory)
        : this.getPrimaryMissingInfo(reflection);

      if (primaryMissingInfo) {
        this.buildSyntheticOptionsForMissingInfo(primaryMissingInfo)
          .forEach((option, index) => {
            if (options.has(option.value)) {
              return;
            }
            options.set(option.value, {
              option,
              category: primaryMissingInfo.category,
              priority: primaryMissingInfo.priority ?? 3,
              blocking: primaryMissingInfo.blocking ?? false,
              sourceOrder: index,
            });
          });
      }
    }

    return Array.from(options.values())
      .sort((left, right) => this.compareClarificationCandidates(left, right));
  }

  private resolveQuestionCategory(
    context: string,
    reflection: ReflectionResult,
    index: number
  ): ReflectionResult['missing_info'][number]['category'] | undefined {
    const normalizedContext = context.trim().toLowerCase();
    const directMatch = reflection.missing_info.find((item) =>
      normalizedContext === item.category ||
      normalizedContext.includes(item.category) ||
      item.description.includes(context)
    );
    if (directMatch) {
      return directMatch.category;
    }
    return reflection.missing_info[index]?.category;
  }

  private normalizeInteractionOptions(
    options: Array<ClarificationActionSuggestion | InteractionOption> | undefined,
    reflection: ReflectionResult
  ): ClarificationOptionCandidate[] {
    if (!options || options.length === 0) {
      return [];
    }

    const missingSet = new Set(reflection.missing_info.map((item) => item.category));
    const missingInfoByCategory = new Map(
      reflection.missing_info.map((item) => [item.category, item])
    );
    const normalized = new Map<string, ClarificationOptionCandidate>();

    options.forEach((option, index) => {
      if (!option?.value) {
        return;
      }

      const category = 'category' in option ? option.category : undefined;
      if (category && missingSet.size > 0 && !missingSet.has(category)) {
        return;
      }

      if (normalized.has(option.value)) {
        return;
      }

      const missingInfo = category ? missingInfoByCategory.get(category) : undefined;
      const label = this.formatClarificationOptionLabel(category, option.label, option.value);
      normalized.set(option.value, {
        option: {
          label,
          value: option.value,
          reason: option.reason,
        },
        category,
        priority: missingInfo?.priority ?? 3,
        blocking: missingInfo?.blocking ?? false,
        sourceOrder: index,
      });
    });

    return Array.from(normalized.values())
      .sort((left, right) => this.compareClarificationCandidates(left, right));
  }

  private limitClarificationOptions(
    options: ClarificationOptionCandidate[]
  ): ClarificationOptionCandidate[] {
    if (options.length <= 1) {
      return options;
    }

    const groups = new Map<string, ClarificationOptionCandidate[]>();
    options.forEach((option) => {
      const key = option.category ?? 'uncategorized';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push(option);
    });

    const orderedCategories = Array.from(groups.keys());
    if (orderedCategories.length === 0) {
      return options.slice(0, 6);
    }

    const primaryCategory = orderedCategories[0];
    return (groups.get(primaryCategory) ?? []).slice(0, 4);
  }

  private pickQuestions(reflection: ReflectionResult): ClarificationQuestion[] {
    if (reflection.clarification_questions.length > 0) {
      const orderedQuestions = [...reflection.clarification_questions]
        .sort((left, right) => this.compareClarificationCategories(
          this.resolveQuestionCategory(left.context, reflection, reflection.clarification_questions.indexOf(left)),
          this.resolveQuestionCategory(right.context, reflection, reflection.clarification_questions.indexOf(right)),
          reflection
        ) || left.priority - right.priority);
      const primaryQuestion = orderedQuestions[0];
      if (!primaryQuestion) {
        return [];
      }

      const primaryCategory = this.resolveQuestionCategory(
        primaryQuestion.context,
        reflection,
        reflection.clarification_questions.indexOf(primaryQuestion)
      );

      return orderedQuestions
        .filter((question) => this.resolveQuestionCategory(
          question.context,
          reflection,
          reflection.clarification_questions.indexOf(question)
        ) === primaryCategory)
        .slice(0, 1);
    }

    return reflection.missing_info.slice(0, 1).map((item) => ({
      question: item.description.replace(/。$/, ''),
      priority: item.priority,
      context: item.category,
    }));
  }

  private formatClarificationOptionLabel(
    category: ReflectionResult['missing_info'][number]['category'] | undefined,
    label: string,
    value: string
  ): string {
    return label || value;
  }

  private getPrimaryMissingInfo(
    reflection: ReflectionResult
  ): ReflectionResult['missing_info'][number] | undefined {
    return [...reflection.missing_info].sort((left, right) => this.compareClarificationCategories(
      left.category,
      right.category,
      reflection
    ))[0];
  }

  private splitClarificationFields(fields: string[]): { current: string; remaining: string } {
    const uniqueFields = Array.from(new Set(fields));
    return {
      current: this.describeMissingFields(uniqueFields.slice(0, 1)),
      remaining: this.describeMissingFields(uniqueFields.slice(1)),
    };
  }

  private buildSyntheticOptionsForMissingInfo(
    missingInfo: ReflectionResult['missing_info'][number]
  ): InteractionOption[] {
    const presets: Record<ReflectionResult['missing_info'][number]['category'], InteractionOption[]> = {
      trigger: [
        {
          label: '对着机器人说话',
          value: '我希望用户通过对机器人说话来表达情绪。',
          reason: missingInfo.description,
        },
        {
          label: '识别到对应人脸表情',
          value: '我希望机器人通过摄像头识别人脸表情来判断情绪。',
          reason: missingInfo.description,
        },
        {
          label: '语音和表情一起判断',
          value: '我希望机器人同时结合语音和人脸表情来判断情绪。',
          reason: missingInfo.description,
        },
      ],
      action: [
        {
          label: '语音回复',
          value: '我希望机器人主要通过语音回复来表达共情。',
          reason: missingInfo.description,
        },
        {
          label: '屏幕表情',
          value: '我希望机器人主要通过屏幕表情来表达共情。',
          reason: missingInfo.description,
        },
        {
          label: '机械臂动作',
          value: '我希望机器人主要通过机械臂动作来表达共情。',
          reason: missingInfo.description,
        },
        {
          label: '语音、表情、动作组合',
          value: '我希望机器人结合语音、屏幕表情和机械臂动作一起表达共情。',
          reason: missingInfo.description,
        },
      ],
      feedback: [
        {
          label: '语音回复',
          value: '我希望机器人主要通过语音回复来表达共情。',
          reason: missingInfo.description,
        },
        {
          label: '屏幕表情',
          value: '我希望机器人主要通过屏幕表情来表达共情。',
          reason: missingInfo.description,
        },
        {
          label: '机械臂动作',
          value: '我希望机器人主要通过机械臂动作来表达共情。',
          reason: missingInfo.description,
        },
        {
          label: '语音、表情、动作组合',
          value: '我希望机器人结合语音、屏幕表情和机械臂动作一起表达共情。',
          reason: missingInfo.description,
        },
      ],
      logic: [
        {
          label: '固定话术',
          value: '我希望机器人使用固定的话术模板来表达共情。',
          reason: missingInfo.description,
        },
        {
          label: 'AI 自由生成',
          value: '我希望机器人用 AI 自由生成共情回复。',
          reason: missingInfo.description,
        },
        {
          label: '按情绪匹配预设回复',
          value: '我希望机器人根据识别到的情绪匹配不同的预设回复。',
          reason: missingInfo.description,
        },
      ],
      condition: [
        {
          label: '检测到负面情绪时响应',
          value: '我希望机器人在检测到负面情绪时再触发共情回应。',
          reason: missingInfo.description,
        },
        {
          label: '检测到任何情绪都响应',
          value: '我希望机器人在检测到任何明显情绪时都给出回应。',
          reason: missingInfo.description,
        },
      ],
    };

    return presets[missingInfo.category] ?? [
      {
        label: missingInfo.description.replace(/。$/, ''),
        value: missingInfo.description.replace(/。$/, ''),
        reason: missingInfo.description,
      },
    ];
  }

  private compareClarificationCandidates(
    left: ClarificationOptionCandidate,
    right: ClarificationOptionCandidate
  ): number {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }
    if (left.blocking !== right.blocking) {
      return left.blocking ? -1 : 1;
    }
    return left.sourceOrder - right.sourceOrder;
  }

  private compareClarificationCategories(
    left: ReflectionResult['missing_info'][number]['category'] | string | undefined,
    right: ReflectionResult['missing_info'][number]['category'] | string | undefined,
    reflection?: ReflectionResult
  ): number {
    const categories = reflection?.missing_info ?? [];
    const leftInfo = categories.find((item) => item.category === left);
    const rightInfo = categories.find((item) => item.category === right);

    if (leftInfo && rightInfo) {
      if (leftInfo.priority !== rightInfo.priority) {
        return leftInfo.priority - rightInfo.priority;
      }
      if (leftInfo.blocking !== rightInfo.blocking) {
        return leftInfo.blocking ? -1 : 1;
      }
      return categories.indexOf(leftInfo) - categories.indexOf(rightInfo);
    }
    if (leftInfo) {
      return -1;
    }
    if (rightInfo) {
      return 1;
    }
    if (!left && !right) {
      return 0;
    }
    if (!left) {
      return 1;
    }
    if (!right) {
      return -1;
    }
    return String(left).localeCompare(String(right), 'zh-CN');
  }

  private bucketCapabilities(capabilities: HardwareCapability[]): {
    inputs: string[];
    processes: string[];
    decisions: string[];
    outputs: string[];
  } {
    const inputs: string[] = [];
    const processes: string[] = [];
    const outputs: string[] = [];

    capabilities.forEach((capability) => {
      const display = capability.displayName;
      const stage = resolveStage(capability.category);
      if (stage === 1) {
        inputs.push(display);
        return;
      }
      if (stage === 2) {
        processes.push(display);
        return;
      }
      outputs.push(display);
    });

    return {
      inputs,
      processes,
      decisions: processes.length > 0 ? ['if'] : [],
      outputs,
    };
  }

  private describeCapabilities(capabilities: HardwareCapability[]): string {
    if (capabilities.length === 0) {
      return '';
    }

    const grouped = new Map<string, string[]>();
    capabilities.forEach((capability) => {
      const label = this.componentLabel(capability.component);
      const entries = grouped.get(label) ?? [];
      entries.push(capability.displayName);
      grouped.set(label, entries);
    });

    return Array.from(grouped.entries())
      .map(([component, entries]) => `- **${component}** — ${Array.from(new Set(entries)).join('、')}`)
      .join('\n');
  }

  private componentLabel(componentId: string): string {
    return this.hardwareComponents.find((component) => component.id === componentId)?.displayName
      ?? componentId;
  }

  private describeMissingFields(fields: string[]): string {
    const labels: Record<string, string> = {
      trigger: '触发方式',
      action: '执行动作',
      condition: '判断条件',
      feedback: '反馈方式',
      logic: '执行逻辑',
    };

    return Array.from(new Set(fields))
      .map((field) => labels[field] ?? field)
      .join('、');
  }
}

function resolveStage(category: HardwareCapability['category']): number {
  if (['CAM', 'MIC', 'FACE-NET', 'YOLO-HAND', 'YOLO-RPS', 'ASR'].includes(category)) {
    return 1;
  }
  if (['LLM', 'LLM-EMO', 'RAM', 'ASSIGN'].includes(category)) {
    return 2;
  }
  if (['HAND', 'SCREEN', 'TTS', 'SPEAKER'].includes(category)) {
    return 3;
  }
  return 2;
}
