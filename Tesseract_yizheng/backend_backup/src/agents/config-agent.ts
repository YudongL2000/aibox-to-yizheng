/**
 * [INPUT]: 依赖 n8n API Client 或延迟解析 provider、SessionService、types
 * [OUTPUT]: 对外提供 ConfigAgent 配置闭环能力，并在节点确认时按操作获取最新 n8n client。
 * [POS]: agents 的第二阶段处理器，负责硬件节点配置状态机
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

import { N8nApiClient } from '../services/n8n-api-client';
import { SessionService } from './session-service';
import {
  AgentResponse,
  ConfigAgentState,
  ConfigurableNode,
  CONFIG_AGENT_FIELDS,
  CONFIG_SKIP_CATEGORIES,
  CONFIG_REQUIRED_CATEGORIES,
  HARDWARE_CATEGORIES,
  HardwareNodeType,
  LOGIC_NODE_TYPES,
  NodeCategory,
  NodeExtraStatus,
  NodeNotes,
  NodeSubParams,
  WorkflowDefinition,
} from './types';
import { logger } from '../utils/logger';
import { AGENT_PROMPT_COPY } from './prompt-copy';
import {
  getDigitalTwinDefaultInterfaceId,
  listDigitalTwinInterfaceOptions,
  normalizeDigitalTwinInterfaceId,
} from './digital-twin-scene';

const CONFIGURABLE_NODE_TYPES: HardwareNodeType[] = [
  'n8n-nodes-base.set',
  'n8n-nodes-base.httpRequest',
  'n8n-nodes-base.code',
];

const SCREEN_EMOJI_OPTIONS = [
  { label: '开心', value: 'Happy' },
  { label: '难过', value: 'Sad' },
  { label: '生气', value: 'Angry' },
  { label: '平和', value: 'Peace' },
] as const;

const SCREEN_EMOJI_LABELS: Record<'Happy' | 'Sad' | 'Angry' | 'Peace', string> = {
  Happy: '开心',
  Sad: '难过',
  Angry: '生气',
  Peace: '平和',
};

const SCREEN_EMOJI_ALIASES: Record<string, 'Happy' | 'Sad' | 'Angry' | 'Peace'> = {
  happy: 'Happy',
  开心: 'Happy',
  高兴: 'Happy',
  sad: 'Sad',
  难过: 'Sad',
  伤心: 'Sad',
  angry: 'Angry',
  生气: 'Angry',
  愤怒: 'Angry',
  peace: 'Peace',
  平和: 'Peace',
  平静: 'Peace',
};

type NodeConfigInput = {
  portId?: string;
  topology?: string;
  device_ID?: string;
  TTS_input?: string;
  execute_emoji?: string;
  sub?: Record<string, string>;
};

type ConfigAgentN8nClient = Pick<N8nApiClient, 'getWorkflow' | 'updateWorkflow'>;

export class ConfigAgent {
  private readonly getN8nClient: () => ConfigAgentN8nClient;

  constructor(
    private sessionService: SessionService,
    n8nClientOrProvider: ConfigAgentN8nClient | (() => ConfigAgentN8nClient)
  ) {
    this.getN8nClient =
      typeof n8nClientOrProvider === 'function'
        ? (n8nClientOrProvider as () => ConfigAgentN8nClient)
        : () => n8nClientOrProvider;
  }

  initializeConfigState(
    sessionId: string,
    workflowId: string,
    workflowSnapshot: WorkflowDefinition
  ): void {
    const configurableNodes = this.extractConfigurableNodes(workflowSnapshot);
    const completed = configurableNodes.filter((node) => node.status === 'configured').length;
    const total = configurableNodes.length;

    const state: ConfigAgentState = {
      workflowId,
      workflowSnapshot,
      configurableNodes,
      currentNodeIndex: this.findCurrentNodeIndex(configurableNodes),
      completed: completed >= total,
      progress: {
        total,
        completed,
        percentage: this.toPercentage(completed, total),
      },
    };

    this.sessionService.setConfigAgentState(sessionId, state);
    logger.info('ConfigAgent: initialized', {
      sessionId,
      workflowId,
      configurableNodeCount: total,
      completedCount: completed,
      currentNodeIndex: state.currentNodeIndex,
      currentNode: this.summarizeNodeForLog(state.configurableNodes[state.currentNodeIndex] ?? null),
      nodeNames: state.configurableNodes.map((node) => node.name),
    });
  }

  async initializeFromWorkflow(
    sessionId: string,
    workflowId: string,
    workflowSnapshot: WorkflowDefinition
  ): Promise<ConfigAgentState> {
    this.initializeConfigState(sessionId, workflowId, workflowSnapshot);
    const state = this.getStateOrThrow(sessionId);
    return state;
  }

  startConfiguration(sessionId: string): AgentResponse {
    const state = this.sessionService.getConfigAgentState(sessionId);
    if (!state) {
      return { type: 'error', message: '未找到配置状态，请先创建工作流' };
    }

    if (state.configurableNodes.length === 0 || state.completed) {
      return {
        type: 'config_complete',
        message: '该工作流无需硬件配置，已准备就绪。',
        totalConfigured: state.progress?.completed ?? 0,
        metadata: { workflowId: state.workflowId },
      };
    }

    this.sessionService.setPhase(sessionId, 'configuring');
    const currentNode = state.configurableNodes[state.currentNodeIndex];
    logger.info('ConfigAgent: start configuration', {
      sessionId,
      workflowId: state.workflowId,
      totalNodes: state.configurableNodes.length,
      currentNodeIndex: state.currentNodeIndex,
      currentNode: this.summarizeNodeForLog(currentNode),
    });
    this.markNodeConfiguring(state, currentNode);
    this.sessionService.setConfigAgentState(sessionId, state);

    void this.persistNodeStatus(state.workflowId, currentNode.name, { extra: 'configuring' }).catch((error) => {
      logger.warn('ConfigAgent: failed to persist configuring status', {
        workflowId: state.workflowId,
        nodeName: currentNode.name,
        error,
      });
    });

    return this.buildCurrentNodeResponse(sessionId, {
      isStart: true,
      prefix: AGENT_PROMPT_COPY.configStartPrefix(state.configurableNodes.length),
    });
  }

  async startConfigureCurrentNode(sessionId: string): Promise<ConfigurableNode | null> {
    const state = this.sessionService.getConfigAgentState(sessionId);
    if (!state || state.completed) {
      logger.info('ConfigAgent: skip startConfigureCurrentNode', {
        sessionId,
        hasState: Boolean(state),
        completed: state?.completed ?? false,
      });
      return null;
    }

    const node = state.configurableNodes[state.currentNodeIndex];
    logger.info('ConfigAgent: start configure node', {
      sessionId,
      workflowId: state.workflowId,
      currentNodeIndex: state.currentNodeIndex,
      node: this.summarizeNodeForLog(node),
    });
    this.markNodeConfiguring(state, node);
    this.sessionService.setConfigAgentState(sessionId, state);
    await this.persistNodeStatus(state.workflowId, node.name, { extra: 'configuring' });
    return node;
  }

  buildCurrentNodeResponse(
    sessionId: string,
    options: { isStart?: boolean; prefix?: string } = {}
  ): AgentResponse {
    const state = this.sessionService.getConfigAgentState(sessionId);
    if (!state) {
      return { type: 'error', message: '未找到配置状态' };
    }

    if (state.completed) {
      return {
        type: 'config_complete',
        message: '所有硬件组件已配置完成。',
        totalConfigured: state.progress?.completed ?? state.configurableNodes.length,
        metadata: { workflowId: state.workflowId },
      };
    }

    const currentNode = state.configurableNodes[state.currentNodeIndex];
    if (!currentNode) {
      return { type: 'error', message: '当前没有可配置节点' };
    }

    const currentProgress = state.progress ?? {
      total: state.configurableNodes.length,
      completed: state.configurableNodes.filter((node) => node.status === 'configured').length,
      percentage: this.toPercentage(
        state.configurableNodes.filter((node) => node.status === 'configured').length,
        state.configurableNodes.length
      ),
    };

    const introPrefix =
      options.prefix ??
      (options.isStart
        ? AGENT_PROMPT_COPY.configAutoIntro(state.configurableNodes.length)
        : '');
    const prefix = introPrefix ? `${introPrefix}\n\n` : '';
    const branchPrefix = this.getBranchContextPrefix(currentNode);

    if (this.isTtsNode(currentNode)) {
      const defaultTtsInput =
        currentNode.configValues?.TTS_input ??
        currentNode.configValues?.sub?.TTS_input ??
        '';
      const hasDefaultTtsInput = defaultTtsInput.trim().length > 0;

      const pendingPrompt =
        state.pendingPrompt &&
        state.pendingPrompt.nodeName === currentNode.name &&
        (state.pendingPrompt.step === 'tts_modify_confirm' || state.pendingPrompt.step === 'tts_input')
          ? state.pendingPrompt
          : {
              nodeName: currentNode.name,
              step: hasDefaultTtsInput ? ('tts_modify_confirm' as const) : ('tts_input' as const),
              defaultTtsInput,
            };

      state.pendingPrompt = pendingPrompt;
      this.sessionService.setConfigAgentState(sessionId, state);

      if (pendingPrompt.step === 'tts_modify_confirm') {
        const ttsPreview = pendingPrompt.defaultTtsInput ?? '';
        return {
          type: 'select_single',
          message: `${prefix}${branchPrefix}${AGENT_PROMPT_COPY.ttsModifyConfirmMessage(ttsPreview)}`,
          interaction: {
            id: `config-tts-modify-${currentNode.name}`,
            mode: 'single',
            field: 'tts_voice',
            title: AGENT_PROMPT_COPY.ttsModifyConfirmTitle,
            description: AGENT_PROMPT_COPY.ttsModifyConfirmDescription,
            options: [
              { label: '否，保持默认', value: 'no' },
              { label: '是，立即修改', value: 'yes' },
            ],
            selected: 'no',
          },
          currentNode,
          progress: {
            completed: currentProgress.completed,
            total: currentProgress.total,
          },
          metadata: {
            workflowId: state.workflowId,
            showConfirmButton: false,
          },
        };
      }

      const contextualPrompt = `${prefix}${branchPrefix}${AGENT_PROMPT_COPY.ttsInputPrompt(
        state.currentNodeIndex + 1,
        this.getNodeLabel(currentNode)
      )}`;
      if (options.isStart) {
        return {
          type: 'config_input',
          message: contextualPrompt,
          totalNodes: state.configurableNodes.length,
          currentNode,
          metadata: {
            workflowId: state.workflowId,
            showConfirmButton: false,
          },
        };
      }

      return {
        type: 'config_input',
        message: contextualPrompt,
        currentNode,
        progress: {
          completed: currentProgress.completed,
          total: currentProgress.total,
        },
        metadata: {
          workflowId: state.workflowId,
          showConfirmButton: false,
        },
      };
    }

    if (this.isScreenNode(currentNode)) {
      const defaultEmoji =
        currentNode.configValues?.execute_emoji ??
        currentNode.configValues?.sub?.execute_emoji ??
        'Peace';

      const pendingPrompt =
        state.pendingPrompt &&
        state.pendingPrompt.nodeName === currentNode.name &&
        (state.pendingPrompt.step === 'screen_modify_confirm' ||
          state.pendingPrompt.step === 'screen_emoji_select')
          ? state.pendingPrompt
          : {
              nodeName: currentNode.name,
              step: 'screen_modify_confirm' as const,
              defaultEmoji,
            };

      state.pendingPrompt = pendingPrompt;
      this.sessionService.setConfigAgentState(sessionId, state);

      if (pendingPrompt.step === 'screen_emoji_select') {
        return {
          type: 'select_single',
          message: `${prefix}${branchPrefix}${AGENT_PROMPT_COPY.screenSelectMessage}`,
          interaction: {
            id: `config-screen-emoji-${currentNode.name}`,
            mode: 'single',
            field: 'screen_emoji',
            title: AGENT_PROMPT_COPY.screenSelectTitle,
            description: AGENT_PROMPT_COPY.screenSelectDescription,
            options: [...SCREEN_EMOJI_OPTIONS],
            selected: pendingPrompt.defaultEmoji,
          },
          currentNode,
          progress: {
            completed: currentProgress.completed,
            total: currentProgress.total,
          },
          metadata: {
            workflowId: state.workflowId,
            showConfirmButton: false,
          },
        };
      }

      return {
        type: 'select_single',
        message: `${prefix}${branchPrefix}${AGENT_PROMPT_COPY.screenModifyConfirmMessage(
          this.toScreenEmojiLabel(pendingPrompt.defaultEmoji ?? 'Peace')
        )}`,
        interaction: {
          id: `config-screen-modify-${currentNode.name}`,
          mode: 'single',
          field: 'screen_emoji',
          title: AGENT_PROMPT_COPY.screenModifyConfirmTitle,
          description: AGENT_PROMPT_COPY.screenModifyConfirmDescription,
          options: [
            { label: '否，保持默认', value: 'no' },
            { label: '是，立即修改', value: 'yes' },
          ],
          selected: 'no',
        },
        currentNode,
        progress: {
          completed: currentProgress.completed,
          total: currentProgress.total,
        },
        metadata: {
          workflowId: state.workflowId,
          showConfirmButton: false,
        },
      };
    }

    if (this.isFaceNetNode(currentNode)) {
      const faceOptions = this.buildFaceProfileOptions(sessionId, currentNode);
      const defaultFaceProfile = this.getDefaultFaceProfile(sessionId, currentNode) ?? faceOptions[0]?.value;
      const pendingPrompt =
        state.pendingPrompt &&
        state.pendingPrompt.nodeName === currentNode.name &&
        state.pendingPrompt.step === 'face_upload'
          ? state.pendingPrompt
          : {
              nodeName: currentNode.name,
              step: 'face_upload' as const,
              defaultFaceProfile,
            };

      state.pendingPrompt = pendingPrompt;
      this.sessionService.setConfigAgentState(sessionId, state);

      return {
        type: 'image_upload',
        message: `${prefix}${branchPrefix}${AGENT_PROMPT_COPY.faceUploadMessage}`,
        interaction: {
          id: `config-face-upload-${currentNode.name}`,
          mode: 'image',
          field: 'face_profiles',
          title: AGENT_PROMPT_COPY.faceUploadTitle,
          description: AGENT_PROMPT_COPY.faceUploadDescription,
          options: faceOptions,
          minSelections: 1,
          maxSelections: 1,
          selected: defaultFaceProfile,
          allowUpload: true,
          uploadHint: '支持常见图片格式，建议上传清晰正脸照片',
        },
        currentNode,
        progress: {
          completed: currentProgress.completed,
          total: currentProgress.total,
        },
        metadata: {
          workflowId: state.workflowId,
          showConfirmButton: false,
        },
      };
    }

    if (state.pendingPrompt?.nodeName === currentNode.name) {
      state.pendingPrompt = undefined;
      this.sessionService.setConfigAgentState(sessionId, state);
    }

    const nodeLabel = this.getNodeLabel(currentNode);
    const message = `${prefix}${branchPrefix}${AGENT_PROMPT_COPY.hardwareGuide(currentNode.category, nodeLabel)}`;
    const mockPortInteraction = this.buildHotPlugInteraction(currentNode);

    // 收集从当前索引起所有剩余硬件节点，用于一次性硬件组装清单
    const HARDWARE_COMPONENT_MAP: Partial<Record<NodeCategory, { componentId: string; displayName: string }>> = {
      CAM:     { componentId: 'camera',           displayName: '摄像头' },
      MIC:     { componentId: 'microphone',        displayName: '麦克风' },
      WHEEL:   { componentId: 'chassis',           displayName: '底盘'   },
      HAND:    { componentId: 'mechanical_hand',   displayName: '机械手' },
      SPEAKER: { componentId: 'speaker',           displayName: '扬声器' },
      SCREEN:  { componentId: 'screen',            displayName: '屏幕'   },
    };
    const remainingHardwareNodes = state.configurableNodes
      .slice(state.currentNodeIndex)
      .filter((n): n is ConfigurableNode & { category: NodeCategory } => {
        const category = n.category;
        return category !== undefined && HARDWARE_CATEGORIES.includes(category);
      });
    const allHardwareComponents = remainingHardwareNodes
      .map((n) => HARDWARE_COMPONENT_MAP[n.category])
      .filter((component): component is { componentId: string; displayName: string } => Boolean(component));
    const allPendingHardwareNodeNames = remainingHardwareNodes.map((n) => n.name);

    if (options.isStart) {
      return {
        type: 'hot_plugging',
        message,
        totalNodes: state.configurableNodes.length,
        currentNode,
        interaction: mockPortInteraction,
        metadata: {
          workflowId: state.workflowId,
          showConfirmButton: true,
          allHardwareComponents,
          allPendingHardwareNodeNames,
        },
      };
    }

    return {
      type: 'hot_plugging',
      message,
      currentNode,
      interaction: mockPortInteraction,
      progress: {
        completed: currentProgress.completed,
        total: currentProgress.total,
      },
      metadata: {
        workflowId: state.workflowId,
        showConfirmButton: true,
        allHardwareComponents,
        allPendingHardwareNodeNames,
      },
    };
  }

  async processConfigurationInput(sessionId: string, userMessage: string): Promise<AgentResponse> {
    const state = this.sessionService.getConfigAgentState(sessionId);
    if (!state) {
      return { type: 'error', message: '未找到配置状态，请先创建并启动配置流程。' };
    }

    if (state.completed) {
      this.sessionService.setPhase(sessionId, 'deploying');
      return {
        type: 'config_complete',
        message: '所有硬件组件已配置完成。',
        totalConfigured: state.progress?.completed ?? state.configurableNodes.length,
        metadata: { workflowId: state.workflowId },
      };
    }

    const currentNode = state.configurableNodes[state.currentNodeIndex];
    if (!currentNode) {
      return { type: 'error', message: '当前没有可配置节点。' };
    }

    const prompt = state.pendingPrompt;
    if (!prompt || prompt.nodeName !== currentNode.name) {
      return this.buildCurrentNodeResponse(sessionId, {
        prefix: '当前组件无需填写文本参数，完成后请点击「已拼装完毕」继续。',
      });
    }

    logger.info('ConfigAgent: process configuration input', {
      sessionId,
      nodeName: currentNode.name,
      step: prompt.step,
      messageLength: userMessage.length,
    });

    if (prompt.step === 'tts_input') {
      const ttsInput = this.extractTtsInput(userMessage);
      if (!ttsInput) {
        return this.buildCurrentNodeResponse(sessionId, {
          prefix: AGENT_PROMPT_COPY.ttsInputEmpty,
        });
      }

      const result = await this.confirmNodeConfig(sessionId, currentNode.name, {
        TTS_input: ttsInput,
        sub: { TTS_input: ttsInput },
      });
      return this.buildResponseAfterNodeConfirmed(sessionId, currentNode, result);
    }

    if (prompt.step === 'tts_modify_confirm') {
      const decision = this.normalizeModifyDecision(userMessage);
      if (!decision) {
        return this.buildCurrentNodeResponse(sessionId, {
          prefix: AGENT_PROMPT_COPY.decisionRetry,
        });
      }

      if (decision === 'no') {
        const result = await this.confirmNodeConfig(sessionId, currentNode.name, {});
        return this.buildResponseAfterNodeConfirmed(sessionId, currentNode, result);
      }

      state.pendingPrompt = {
        nodeName: currentNode.name,
        step: 'tts_input',
        defaultTtsInput: prompt.defaultTtsInput ?? '',
      };
      this.sessionService.setConfigAgentState(sessionId, state);
      return this.buildCurrentNodeResponse(sessionId, {
        prefix: AGENT_PROMPT_COPY.ttsInputRetry,
      });
    }

    if (prompt.step === 'screen_modify_confirm') {
      const decision = this.normalizeModifyDecision(userMessage);
      if (!decision) {
        return this.buildCurrentNodeResponse(sessionId, {
          prefix: AGENT_PROMPT_COPY.decisionRetry,
        });
      }

      if (decision === 'no') {
        const result = await this.confirmNodeConfig(sessionId, currentNode.name, {});
        return this.buildResponseAfterNodeConfirmed(sessionId, currentNode, result);
      }

      state.pendingPrompt = {
        nodeName: currentNode.name,
        step: 'screen_emoji_select',
        defaultEmoji: prompt.defaultEmoji ?? 'Peace',
      };
      this.sessionService.setConfigAgentState(sessionId, state);
      return this.buildCurrentNodeResponse(sessionId, {
        prefix: AGENT_PROMPT_COPY.screenSelectRetry,
      });
    }

    if (prompt.step === 'screen_emoji_select') {
      const nextEmoji = this.normalizeScreenEmoji(userMessage);
      if (!nextEmoji) {
        return this.buildCurrentNodeResponse(sessionId, {
          prefix: AGENT_PROMPT_COPY.screenSelectInvalid,
        });
      }

      const result = await this.confirmNodeConfig(sessionId, currentNode.name, {
        execute_emoji: nextEmoji,
        sub: { execute_emoji: nextEmoji },
      });
      return this.buildResponseAfterNodeConfirmed(sessionId, currentNode, result);
    }

    if (prompt.step === 'face_upload') {
      const payload = this.extractFaceUploadPayload(userMessage);
      const selectedProfile =
        payload.profile?.trim() ||
        prompt.defaultFaceProfile?.trim() ||
        this.getDefaultFaceProfile(sessionId, currentNode);
      if (!selectedProfile || !payload.imageId) {
        const reason = payload.error ?? '未识别到有效的人物与图片标识';
        return this.buildCurrentNodeResponse(sessionId, {
          prefix: AGENT_PROMPT_COPY.faceUploadRetry(reason),
        });
      }

      const result = await this.confirmNodeConfig(sessionId, currentNode.name, {
        sub: {
          face_info: selectedProfile,
        },
      });
      return this.buildResponseAfterNodeConfirmed(sessionId, currentNode, result);
    }

    return this.buildCurrentNodeResponse(sessionId);
  }

  async confirmNodeConfig(
    sessionId: string,
    nodeName: string,
    config: NodeConfigInput
  ): Promise<{
    success: boolean;
    nextNode: ConfigurableNode | null;
    isComplete: boolean;
    progress: { total: number; completed: number; percentage: number };
  }> {
    const state = this.sessionService.getConfigAgentState(sessionId);
    if (!state) {
      throw new Error('未找到配置状态');
    }

    const currentNode = state.configurableNodes[state.currentNodeIndex];
    if (!currentNode || currentNode.name !== nodeName) {
      logger.warn('ConfigAgent: confirm node mismatch', {
        sessionId,
        expectedNodeName: currentNode?.name ?? null,
        actualNodeName: nodeName,
        currentNodeIndex: state.currentNodeIndex,
      });
      throw new Error(`当前节点不匹配，期望: ${currentNode?.name ?? 'none'}, 实际: ${nodeName}`);
    }

    const normalizedConfig = this.normalizeHardwareConfigInput(currentNode, config);

    logger.info('ConfigAgent: confirm node request', {
      sessionId,
      workflowId: state.workflowId,
      nodeName,
      currentNodeIndex: state.currentNodeIndex,
      category: currentNode.category,
      config: this.summarizeConfigForLog(normalizedConfig),
    });

    const persistConfig = {
      extra: 'configured',
      topology: normalizedConfig.topology,
      device_ID: normalizedConfig.device_ID,
      TTS_input: normalizedConfig.TTS_input,
      execute_emoji: normalizedConfig.execute_emoji,
      sub: normalizedConfig.sub,
    } as const;
    const isSingleAssembleCategory = this.isSingleAssembleCategory(currentNode.category);
    await this.persistNodeStatus(state.workflowId, nodeName, persistConfig, {
      category: currentNode.category,
      applyToCategory: isSingleAssembleCategory,
    });

    if (isSingleAssembleCategory && currentNode.category) {
      this.markCategoryConfigured(state, currentNode.category, nodeName, normalizedConfig);
    } else {
      this.markNodeConfigured(currentNode, normalizedConfig);
    }
    state.currentNodeIndex = this.findCurrentNodeIndex(state.configurableNodes);
    state.pendingPrompt = undefined;

    const nextNode = state.configurableNodes[state.currentNodeIndex] ?? null;
    const completed = state.configurableNodes.filter((node) => node.status === 'configured').length;
    const total = state.configurableNodes.length;
    state.progress = {
      total,
      completed,
      percentage: this.toPercentage(completed, total),
    };
    state.completed = completed >= total;

    this.sessionService.setConfigAgentState(sessionId, state);

    logger.info('ConfigAgent: confirm node success', {
      sessionId,
      workflowId: state.workflowId,
      configuredNode: nodeName,
      nextNode: nextNode?.name ?? null,
      progress: state.progress,
      isComplete: state.completed,
    });

    return {
      success: true,
      nextNode,
      isComplete: state.completed,
      progress: state.progress,
    };
  }

  async confirmNodeDeployed(sessionId: string): Promise<AgentResponse> {
    const state = this.sessionService.getConfigAgentState(sessionId);
    if (!state) {
      return { type: 'error', message: '未找到配置状态' };
    }

    if (state.completed) {
      return {
        type: 'config_complete',
        message: '所有硬件组件已配置完成。',
        totalConfigured: state.progress?.completed ?? state.configurableNodes.length,
        metadata: { workflowId: state.workflowId },
      };
    }

    const currentNode = state.configurableNodes[state.currentNodeIndex];
    logger.info('ConfigAgent: confirm deployed request', {
      sessionId,
      workflowId: state.workflowId,
      currentNodeIndex: state.currentNodeIndex,
      node: this.summarizeNodeForLog(currentNode),
    });

    if (
      state.pendingPrompt &&
      state.pendingPrompt.nodeName === currentNode.name &&
      (state.pendingPrompt.step === 'tts_modify_confirm' ||
        state.pendingPrompt.step === 'tts_input' ||
        state.pendingPrompt.step === 'screen_modify_confirm' ||
        state.pendingPrompt.step === 'screen_emoji_select' ||
        state.pendingPrompt.step === 'face_upload')
    ) {
      return this.buildCurrentNodeResponse(sessionId, {
        prefix: '该节点需要先完成对话配置后才能确认拼装。',
      });
    }

    try {
      const result = await this.confirmNodeConfig(sessionId, currentNode.name, {});

      return this.buildResponseAfterNodeConfirmed(sessionId, currentNode, result);
    } catch (error) {
      logger.error('ConfigAgent: failed to confirm node', error);
      return {
        type: 'error',
        message: `更新节点状态失败：${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  getCurrentNode(sessionId: string): ConfigurableNode | null {
    const state = this.sessionService.getConfigAgentState(sessionId);
    if (!state || state.completed) {
      return null;
    }
    return state.configurableNodes[state.currentNodeIndex] ?? null;
  }

  getProgress(sessionId: string): ConfigAgentState['progress'] | null {
    const state = this.sessionService.getConfigAgentState(sessionId);
    return state?.progress ?? null;
  }

  getState(sessionId: string): ConfigAgentState | null {
    return this.sessionService.getConfigAgentState(sessionId) ?? null;
  }

  private getStateOrThrow(sessionId: string): ConfigAgentState {
    const state = this.sessionService.getConfigAgentState(sessionId);
    if (!state) {
      throw new Error(`ConfigAgent state not found: ${sessionId}`);
    }
    return state;
  }

  private extractConfigurableNodes(workflow: WorkflowDefinition): ConfigurableNode[] {
    const nodes: ConfigurableNode[] = [];
    const seenHardwareCategories = new Set<NodeCategory>();
    const branchContextMap = this.buildBranchContextMap(workflow);

    workflow.nodes.forEach((rawNode, index) => {
      const node = rawNode as Record<string, unknown>;
      const nodeType = (node.type as string) || '';
      if (!CONFIGURABLE_NODE_TYPES.includes(nodeType as HardwareNodeType)) {
        return;
      }

      const notes = this.parseNodeNotes(node.notes);
      const category = notes.category;

      // 跳过不需要 ConfigAgent 配置的 category
      if (CONFIG_SKIP_CATEGORIES.includes(category)) {
        logger.debug('ConfigAgent: skipping node (category in skip list)', {
          nodeName: node.name,
          category,
        });
        return;
      }

      // 只保留需要配置的 category
      if (!CONFIG_REQUIRED_CATEGORIES.includes(category)) {
        logger.debug('ConfigAgent: skipping node (category not in required list)', {
          nodeName: node.name,
          category,
        });
        return;
      }

      const isHardwareCategory = HARDWARE_CATEGORIES.includes(category);
      if (isHardwareCategory && seenHardwareCategories.has(category)) {
        logger.debug('ConfigAgent: skipping node (hardware category already represented)', {
          index,
          nodeName: node.name,
          category,
        });
        return;
      }
      const needsTtsInput = category === 'TTS' && CONFIG_AGENT_FIELDS.includes('TTS_input');
      const needsExecuteEmoji = category === 'SCREEN' && CONFIG_AGENT_FIELDS.includes('execute_emoji');
      const extra = notes.extra ?? this.getInitialExtra(nodeType);

      const normalizedSub = this.normalizeSubValues(notes.sub);
      const subKeys = Object.keys(normalizedSub);

      const configuredNode: ConfigurableNode = {
        name: (node.name as string) || `node_${index}`,
        type: nodeType as HardwareNodeType,
        category,
        title: notes.title || ((node.name as string) || `node_${index}`),
        subtitle: notes.subtitle || '',
        branchTitle: branchContextMap.get((node.name as string) || `node_${index}`),
        extra,
        index,
        status: extra,
        displayName: this.getNodeDisplayName(node, notes),
        configFields: {
          needsTopology: isHardwareCategory,
          needsDeviceId: isHardwareCategory,
          needsTtsInput,
          needsExecuteEmoji,
          subKeys,
        },
        configValues: {
          portId: notes.topology ?? undefined,
          topology: notes.topology ?? undefined,
          device_ID: notes.device_ID ?? undefined,
          TTS_input: this.readSubValue(normalizedSub, 'TTS_input'),
          execute_emoji: this.readSubValue(normalizedSub, 'execute_emoji'),
          sub: normalizedSub,
        },
      };

      nodes.push(configuredNode);
      if (isHardwareCategory) {
        seenHardwareCategories.add(category);
      }
      logger.debug('ConfigAgent: extracted configurable node', {
        index,
        node: this.summarizeNodeForLog(configuredNode),
        subKeys,
      });
    });

    // 软件配置节点（TTS、FACE-NET 等）在前，硬件组装节点在后，组内保持原相对顺序
    nodes.sort((a, b) => {
      const aIsHardware = a.category && HARDWARE_CATEGORIES.includes(a.category) ? 1 : 0;
      const bIsHardware = b.category && HARDWARE_CATEGORIES.includes(b.category) ? 1 : 0;
      return aIsHardware - bIsHardware;
    });

    return nodes;
  }

  private buildBranchContextMap(workflow: WorkflowDefinition): Map<string, string> {
    const contextMap = new Map<string, string>();
    const nodeByName = new Map<string, Record<string, unknown>>();
    const rawNodes = Array.isArray(workflow.nodes) ? (workflow.nodes as Array<Record<string, unknown>>) : [];
    const connections =
      workflow.connections && typeof workflow.connections === 'object'
        ? (workflow.connections as Record<string, unknown>)
        : {};

    rawNodes.forEach((node) => {
      const name = typeof node.name === 'string' ? node.name : '';
      if (name) {
        nodeByName.set(name, node);
      }
    });

    rawNodes.forEach((node) => {
      const nodeType = typeof node.type === 'string' ? node.type : '';
      if (nodeType !== 'n8n-nodes-base.if') {
        return;
      }

      const sourceName = typeof node.name === 'string' ? node.name : '';
      if (!sourceName) {
        return;
      }

      const branchTitle = this.resolveIfBranchTitle(node);
      if (!branchTitle) {
        return;
      }

      const trueTargets = this.getConnectionTargets(connections, sourceName, 0);
      this.propagateBranchContext(
        trueTargets,
        branchTitle,
        contextMap,
        nodeByName,
        connections
      );
    });

    return contextMap;
  }

  private propagateBranchContext(
    targets: string[],
    branchTitle: string,
    contextMap: Map<string, string>,
    nodeByName: Map<string, Record<string, unknown>>,
    connections: Record<string, unknown>
  ): void {
    const queue = [...targets];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current)) {
        continue;
      }
      visited.add(current);

      const existing = contextMap.get(current);
      if (!existing) {
        contextMap.set(current, branchTitle);
      } else if (existing !== branchTitle && !existing.includes(branchTitle)) {
        contextMap.set(current, `${existing} / ${branchTitle}`);
      }

      const currentNode = nodeByName.get(current);
      const currentType = typeof currentNode?.type === 'string' ? currentNode.type : '';
      if (this.isLogicNodeType(currentType)) {
        continue;
      }

      const nextTargets = this.getConnectionTargets(connections, current, 0);
      nextTargets.forEach((nextTarget) => {
        if (!visited.has(nextTarget)) {
          queue.push(nextTarget);
        }
      });
    }
  }

  private getConnectionTargets(
    connections: Record<string, unknown>,
    sourceName: string,
    outputIndex: number
  ): string[] {
    const sourceMapping =
      sourceName && typeof connections[sourceName] === 'object'
        ? (connections[sourceName] as Record<string, unknown>)
        : undefined;
    const mainGroups = Array.isArray(sourceMapping?.main)
      ? (sourceMapping.main as unknown[])
      : [];
    const selectedGroup = Array.isArray(mainGroups[outputIndex])
      ? (mainGroups[outputIndex] as unknown[])
      : [];

    const targets = selectedGroup
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return '';
        }
        const node = (item as { node?: unknown }).node;
        return typeof node === 'string' ? node : '';
      })
      .filter(Boolean);
    return Array.from(new Set(targets));
  }

  private isLogicNodeType(nodeType: string): boolean {
    return LOGIC_NODE_TYPES.includes(nodeType as (typeof LOGIC_NODE_TYPES)[number]);
  }

  private resolveIfBranchTitle(node: Record<string, unknown>): string {
    const notes = this.parseNodeNotes(node.notes);
    const noteTitle = (notes.title || '').trim();
    if (noteTitle && noteTitle.includes('如果')) {
      return noteTitle;
    }

    const nodeName = typeof node.name === 'string' ? node.name : '';
    const normalizedName = nodeName.toLowerCase();

    const emotionMatch = normalizedName.match(/if_(?:emotion_)?is_([a-z0-9_]+)/i);
    if (emotionMatch?.[1]) {
      const emotionLabel = this.mapEmotionTokenToZh(emotionMatch[1]);
      if (emotionLabel) {
        return `如果用户的情绪是${emotionLabel}`;
      }
    }

    const personMatch = normalizedName.match(/if_(?:face|person|identity)_is_([a-z0-9_\u4e00-\u9fa5]+)/i);
    if (personMatch?.[1]) {
      const person = this.mapPersonTokenToZh(personMatch[1]);
      return `如果识别到的人物是${person}`;
    }

    if (normalizedName.includes('if_draw')) {
      return '如果本轮结果是平局';
    }
    if (normalizedName.includes('if_win')) {
      return '如果本轮结果是机器人获胜';
    }
    if (normalizedName.includes('if_lose')) {
      return '如果本轮结果是机器人失败';
    }

    return '';
  }

  private mapEmotionTokenToZh(token: string): string {
    const normalized = token.toLowerCase();
    if (['happy', 'smile', '开心', '微笑', '高兴'].some((value) => normalized.includes(value))) {
      return '开心';
    }
    if (['sad', '难过', '伤心', '悲伤'].some((value) => normalized.includes(value))) {
      return '难过';
    }
    if (['angry', '愤怒', '生气'].some((value) => normalized.includes(value))) {
      return '生气';
    }
    if (['peace', 'calm', '平和', '平静'].some((value) => normalized.includes(value))) {
      return '平和';
    }
    return token.replace(/_/g, '');
  }

  private mapPersonTokenToZh(token: string): string {
    const normalized = token.toLowerCase();
    if (normalized === 'liu') {
      return '老刘';
    }
    if (normalized === 'fu') {
      return '老付';
    }
    if (normalized === 'wang') {
      return '老王';
    }
    return token.replace(/_/g, '');
  }

  private parseNodeNotes(raw: unknown): NodeNotes {
    const parsed = typeof raw === 'string' ? this.safeParseJson(raw) : (raw as Record<string, unknown> | null);
    const record = parsed && typeof parsed === 'object' ? parsed : {};
    const sub = this.parseSubField(record.sub);

    const categoryCandidate = record.category;
    const category = this.normalizeCategory(categoryCandidate);
    const extraCandidate = record.extra;
    const extra = this.normalizeExtra(extraCandidate);

    return {
      title: typeof record.title === 'string' ? record.title : '',
      subtitle: typeof record.subtitle === 'string' ? record.subtitle : '',
      category,
      session_ID: typeof record.session_ID === 'string' ? record.session_ID : '',
      extra,
      topology: typeof record.topology === 'string' ? record.topology : null,
      device_ID: typeof record.device_ID === 'string' ? record.device_ID : null,
      sub,
    };
  }

  private normalizeCategory(value: unknown): NodeCategory {
    const allowed: NodeCategory[] = [
      'BASE',
      'CAM',
      'MIC',
      'WHEEL',
      'FACE-NET',
      'YOLO-HAND',
      'YOLO-RPS',
      'ASR',
      'LLM',
      'LLM-EMO',
      'TTS',
      'RAM',
      'ASSIGN',
      'HAND',
      'SPEAKER',
      'SCREEN',
    ];
    if (typeof value === 'string' && allowed.includes(value as NodeCategory)) {
      return value as NodeCategory;
    }
    return 'BASE';
  }

  private normalizeExtra(value: unknown): NodeExtraStatus {
    if (value === 'pending' || value === 'configuring' || value === 'configured') {
      return value;
    }
    return 'pending';
  }

  private getInitialExtra(nodeType: string): NodeExtraStatus {
    return LOGIC_NODE_TYPES.includes(nodeType as (typeof LOGIC_NODE_TYPES)[number])
      ? 'configured'
      : 'pending';
  }

  private safeParseJson(value: string): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  private parseSubField(rawSub: unknown): NodeSubParams | undefined {
    if (rawSub && typeof rawSub === 'object' && !Array.isArray(rawSub)) {
      return rawSub as NodeSubParams;
    }

    if (typeof rawSub !== 'string') {
      return undefined;
    }

    const trimmed = rawSub.trim();
    if (!trimmed) {
      return undefined;
    }

    if (trimmed.startsWith('{')) {
      const parsed = this.safeParseJson(trimmed);
      if (parsed && typeof parsed === 'object') {
        return parsed as NodeSubParams;
      }
      logger.warn('ConfigAgent: failed to parse notes.sub as JSON object', {
        rawSubPreview: trimmed.slice(0, 120),
      });
    }

    // 支持 "k1: v1, k2: v2" 这类 LLM 输出的简写
    const entries = trimmed
      .split(/[,;\n]/)
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((segment) => {
        const separatorIndex = segment.indexOf(':');
        if (separatorIndex <= 0) {
          return null;
        }
        const key = segment.slice(0, separatorIndex).trim();
        const value = segment.slice(separatorIndex + 1).trim();
        if (!key) {
          return null;
        }
        return [key, value] as const;
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry));

    if (entries.length === 0) {
      return undefined;
    }

    const parsedSub: Record<string, string> = {};
    entries.forEach(([key, value]) => {
      parsedSub[key] = value;
    });
    return parsedSub as NodeSubParams;
  }

  private normalizeSubValues(sub: NodeSubParams | undefined): Record<string, string> {
    if (!sub || typeof sub !== 'object') {
      return {};
    }

    const normalized: Record<string, string> = {};
    Object.entries(sub as Record<string, unknown>).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        normalized[key] = '';
        return;
      }
      if (typeof value === 'string') {
        normalized[key] = value;
        return;
      }
      normalized[key] = String(value);
    });
    return normalized;
  }

  private readSubValue(sub: Record<string, string>, key: string): string | undefined {
    const value = sub[key];
    if (typeof value !== 'string') {
      return undefined;
    }
    return value;
  }

  private getNodeDisplayName(node: Record<string, unknown>, notes: NodeNotes): string {
    if (notes.title) {
      return notes.title;
    }

    const labels: Record<string, string> = {
      'n8n-nodes-base.set': '赋值处理节点',
      'n8n-nodes-base.httpRequest': '接口请求节点',
      'n8n-nodes-base.code': '执行脚本节点',
    };

    const nodeType = String(node.type ?? 'node');
    const name = String(node.name ?? '');
    return `${labels[nodeType] || nodeType} - ${name}`;
  }

  private markNodeConfiguring(state: ConfigAgentState, node: ConfigurableNode): void {
    node.extra = 'configuring';
    node.status = 'configuring';
    state.completed = false;
  }

  private markNodeConfigured(node: ConfigurableNode, config: NodeConfigInput): void {
    const existingSub =
      node.configValues?.sub && typeof node.configValues.sub === 'object' ? node.configValues.sub : {};
    node.extra = 'configured';
    node.status = 'configured';
    node.configValues = {
      ...(node.configValues ?? {}),
      ...config,
      sub: {
        ...existingSub,
        ...(config.sub ?? {}),
      },
    };
  }

  private markCategoryConfigured(
    state: ConfigAgentState,
    category: NodeCategory,
    primaryNodeName: string,
    config: NodeConfigInput
  ): void {
    state.configurableNodes.forEach((node) => {
      if (node.category !== category) {
        return;
      }

      if (node.name === primaryNodeName) {
        this.markNodeConfigured(node, config);
        return;
      }

      this.markNodeConfigured(node, {
        topology: config.topology,
        device_ID: config.device_ID,
      });
    });
  }

  private isSingleAssembleCategory(category: NodeCategory | undefined): category is NodeCategory {
    if (!category) {
      return false;
    }
    return HARDWARE_CATEGORIES.includes(category);
  }

  private buildHotPlugInteraction(currentNode: ConfigurableNode) {
    return {
      id: `config-port-${currentNode.name}`,
      mode: 'single' as const,
      field: 'hardware_port' as const,
      title: '等待硬件接入',
      description: '请接入当前步骤所需硬件。系统收到真实硬件心跳后会自动更新状态，并在准备完成后继续。',
      options: listDigitalTwinInterfaceOptions(),
      selected: this.resolveSelectedPortId(currentNode),
    };
  }

  private resolveSelectedPortId(currentNode: ConfigurableNode): string {
    return normalizeDigitalTwinInterfaceId(
      currentNode.configValues?.portId ?? currentNode.configValues?.topology,
      getDigitalTwinDefaultInterfaceId(currentNode.category)
    );
  }

  private normalizeHardwareConfigInput(
    currentNode: ConfigurableNode,
    config: NodeConfigInput
  ): NodeConfigInput {
    if (!this.isSingleAssembleCategory(currentNode.category)) {
      return { ...config };
    }

    const resolvedPortId = normalizeDigitalTwinInterfaceId(
      config.portId ?? config.topology,
      this.resolveSelectedPortId(currentNode)
    );

    return {
      ...config,
      portId: resolvedPortId,
      topology: resolvedPortId,
    };
  }

  private findCurrentNodeIndex(nodes: ConfigurableNode[]): number {
    const index = nodes.findIndex((node) => node.status !== 'configured');
    return index === -1 ? nodes.length : index;
  }

  private toPercentage(completed: number, total: number): number {
    if (total === 0) {
      return 100;
    }
    return Math.round((completed / total) * 100);
  }

  private async buildResponseAfterNodeConfirmed(
    sessionId: string,
    confirmedNode: ConfigurableNode,
    result: {
      success: boolean;
      nextNode: ConfigurableNode | null;
      isComplete: boolean;
      progress: { total: number; completed: number; percentage: number };
    }
  ): Promise<AgentResponse> {
    const state = this.sessionService.getConfigAgentState(sessionId);
    if (!state) {
      return { type: 'error', message: '未找到配置状态' };
    }

    if (result.isComplete) {
      this.sessionService.setPhase(sessionId, 'deploying');
      return {
        type: 'config_complete',
        message: `硬件拼装完成！共配置了 ${result.progress.total} 个组件，工作流已准备就绪。`,
        totalConfigured: result.progress.completed,
        metadata: { workflowId: state.workflowId },
      };
    }

    await this.startConfigureCurrentNode(sessionId);
    return this.buildCurrentNodeResponse(sessionId, {
      prefix: AGENT_PROMPT_COPY.configuredSuccess(
        confirmedNode.category,
        this.getNodeLabel(confirmedNode)
      ),
    });
  }

  private getNodeLabel(node: ConfigurableNode): string {
    return node.title?.trim() || node.displayName?.trim() || node.name;
  }

  private getBranchContextPrefix(node: ConfigurableNode): string {
    const title = node.branchTitle?.trim();
    if (!title) {
      return '';
    }
    return `${title}，`;
  }

  private isTtsNode(node: ConfigurableNode): boolean {
    return node.category === 'TTS';
  }

  private isScreenNode(node: ConfigurableNode): boolean {
    return node.category === 'SCREEN';
  }

  private isFaceNetNode(node: ConfigurableNode): boolean {
    return node.category === 'FACE-NET';
  }

  private buildFaceProfileOptions(
    sessionId: string,
    node: ConfigurableNode
  ): Array<{ label: string; value: string }> {
    const nodeScopedProfile = this.resolveNodeScopedFaceProfile(sessionId, node);
    if (nodeScopedProfile) {
      return [{ label: nodeScopedProfile, value: nodeScopedProfile }];
    }

    const candidates = new Set<string>(this.getPersonCandidates(sessionId));
    if (candidates.size === 0) {
      candidates.add('目标人物');
    }

    return [...candidates].map((name) => ({ label: name, value: name }));
  }

  private getDefaultFaceProfile(sessionId: string, node: ConfigurableNode): string | undefined {
    const nodeScopedProfile = this.resolveNodeScopedFaceProfile(sessionId, node);
    if (nodeScopedProfile) {
      return nodeScopedProfile;
    }
    const candidates = this.getPersonCandidates(sessionId);
    return candidates[0];
  }

  private getPersonCandidates(sessionId: string): string[] {
    const confirmed = this.sessionService.getConfirmedEntities(sessionId);
    const candidates = new Set<string>();
    const confirmedPeople = [confirmed.person_name, confirmed.face_profiles]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .flatMap((value) => value.split(/[，,、\s]+/))
      .map((value) => value.trim())
      .filter(Boolean);
    confirmedPeople.forEach((name) => candidates.add(name));

    const intent = this.sessionService.getIntent(sessionId);
    const intentPersonName =
      intent && intent.entities && typeof intent.entities.person_name === 'string'
        ? intent.entities.person_name
        : '';
    if (intentPersonName) {
      intentPersonName
        .split(/[，,、\s]+/)
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((name) => candidates.add(name));
    }

    return [...candidates];
  }

  private resolveNodeScopedFaceProfile(sessionId: string, node: ConfigurableNode): string | undefined {
    const faceInfo = node.configValues?.sub?.face_info;
    if (typeof faceInfo === 'string' && faceInfo.trim().length > 0) {
      const values = faceInfo
        .split(/[，,、\s]+/)
        .map((value) => value.trim())
        .filter(Boolean);
      if (values.length > 0) {
        return values[0];
      }
    }

    const nodeNameMatch = String(node.name || '').match(/set_face_net_recognition_([a-z0-9_]+)/i);
    const alias = nodeNameMatch?.[1]?.toLowerCase();
    if (!alias) {
      return undefined;
    }
    const aliasToName: Record<string, string> = {
      liu: '老刘',
      fu: '老付',
      wang: '老王',
    };
    if (aliasToName[alias]) {
      return aliasToName[alias];
    }

    const personIndex = alias.match(/^person_(\d+)$/i);
    if (personIndex) {
      const index = Number.parseInt(personIndex[1] || '', 10);
      if (Number.isFinite(index) && index > 0) {
        const candidates = this.getPersonCandidates(sessionId);
        if (candidates[index - 1]) {
          return candidates[index - 1];
        }
      }
    }
    return alias;
  }

  private extractFaceUploadPayload(raw: string): {
    profile?: string;
    imageId?: string;
    error?: string;
  } {
    const text = raw.trim();
    if (!text) {
      return { error: '上传信息为空' };
    }

    if (text.includes('上传失败')) {
      return { error: '图片上传失败' };
    }
    if (text.includes('图片未选择')) {
      return { error: '尚未选择图片' };
    }

    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        const profile =
          this.pickFirstString(parsed, [
            'profile',
            'face_profile',
            'face_info',
            'person',
            'person_name',
          ]) ??
          this.pickFirstStringDeep(parsed, [
            'profile',
            'face_profile',
            'face_info',
            'person',
            'person_name',
          ]);
        const imageId =
          this.pickFirstString(parsed, ['imageId', 'image_id']) ??
          this.pickFirstStringDeep(parsed, ['imageId', 'image_id']);
        return {
          profile: profile?.trim(),
          imageId: imageId?.trim(),
        };
      } catch {
        // ignore json parse failure and continue with plain-text parsing
      }
    }

    const fullPattern = /^人脸识别\s+(.+?)\s+图片(?:\s+(.+))?$/;
    const fullMatch = text.match(fullPattern);
    if (fullMatch) {
      const profile = fullMatch[1]?.trim();
      const imageId = fullMatch[2]?.trim();
      return { profile, imageId };
    }

    const profile = this.extractProfileToken(text);
    const imageIdMatch = text.match(/(?:image[_\s-]?id|图片标识)\s*[:：]?\s*([a-zA-Z0-9_-]+)/i);
    return { profile, imageId: imageIdMatch?.[1]?.trim() };
  }

  private pickFirstString(record: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
    return undefined;
  }

  private pickFirstStringDeep(value: unknown, keys: string[]): string | undefined {
    const targets = new Set(keys.map((key) => key.toLowerCase()));
    const queue: unknown[] = [value];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || typeof current !== 'object') {
        continue;
      }

      if (Array.isArray(current)) {
        queue.push(...current);
        continue;
      }

      Object.entries(current as Record<string, unknown>).forEach(([key, nested]) => {
        if (targets.has(key.toLowerCase()) && typeof nested === 'string' && nested.trim().length > 0) {
          queue.unshift(nested);
          return;
        }
        if (nested && typeof nested === 'object') {
          queue.push(nested);
        }
      });

      const head = queue[0];
      if (typeof head === 'string' && head.trim().length > 0) {
        return head;
      }
    }
    return undefined;
  }

  private findFirstImageUrlDeep(value: unknown): string | undefined {
    const queue: unknown[] = [value];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }
      if (typeof current === 'string') {
        const url = this.extractImageUrl(current);
        if (url) {
          return url;
        }
        continue;
      }
      if (Array.isArray(current)) {
        queue.push(...current);
        continue;
      }
      if (typeof current === 'object') {
        queue.push(...Object.values(current as Record<string, unknown>));
      }
    }
    return undefined;
  }

  private extractImageUrl(text: string): string | undefined {
    const match = text.match(/(https?:\/\/\S+|\/uploads\/\S+|[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp))/i);
    if (!match) {
      return undefined;
    }
    return match[1];
  }

  private extractProfileToken(text: string): string | undefined {
    const cleaned = text
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/\/uploads\/\S+/gi, '')
      .replace(/\b[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)\b/gi, '')
      .replace(/人脸识别|图片|上传|face|profile|url/gi, ' ')
      .trim();
    if (!cleaned) {
      return undefined;
    }
    const token = cleaned.split(/[，,、\s]+/).find(Boolean);
    return token;
  }

  private extractTtsInput(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) {
      return '';
    }

    const matched = trimmed.match(/^TTS[_\s-]?input\s*[:：]\s*(.+)$/i);
    if (matched && matched[1]) {
      return matched[1].trim();
    }
    return trimmed;
  }

  private parseInteractionValue(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) {
      return '';
    }

    const screenPattern = /屏幕\s*emoji\s+(.+)$/i;
    // 兼容前端历史交互格式（例如“音色 no”）
    const legacyVoicePattern = /音色\s+(.+)$/i;
    const ttsInputPattern = /tts[_\s-]?input\s+(.+)$/i;
    const patterns = [screenPattern, legacyVoicePattern, ttsInputPattern];
    for (const pattern of patterns) {
      const matched = trimmed.match(pattern);
      if (matched?.[1]) {
        return matched[1].trim();
      }
    }

    return trimmed;
  }

  private normalizeModifyDecision(raw: string): 'yes' | 'no' | null {
    const value = this.parseInteractionValue(raw).toLowerCase();
    if (!value) {
      return null;
    }

    if (
      ['yes', 'y', '是', '要', '需要', '修改', '改', '更换', 'yes，立即修改', '是，立即修改'].includes(
        value
      )
    ) {
      return 'yes';
    }

    if (
      [
        'no',
        'n',
        '否',
        '不要',
        '不用',
        '不需要',
        '保持',
        '保持默认',
        'no，保持默认',
        '否，保持默认',
      ].includes(value)
    ) {
      return 'no';
    }

    return null;
  }

  private normalizeScreenEmoji(raw: string): 'Happy' | 'Sad' | 'Angry' | 'Peace' | null {
    const value = this.parseInteractionValue(raw);
    if (!value) {
      return null;
    }

    const normalizedKey = value.replace(/[（）()]/g, '').trim();
    const lower = normalizedKey.toLowerCase();
    if (SCREEN_EMOJI_ALIASES[lower]) {
      return SCREEN_EMOJI_ALIASES[lower];
    }
    if (SCREEN_EMOJI_ALIASES[normalizedKey]) {
      return SCREEN_EMOJI_ALIASES[normalizedKey];
    }
    return null;
  }

  private toScreenEmojiLabel(raw: string): string {
    const normalized = this.normalizeScreenEmoji(raw);
    if (normalized) {
      return SCREEN_EMOJI_LABELS[normalized];
    }

    const fallback = raw.trim();
    return fallback || SCREEN_EMOJI_LABELS.Peace;
  }

  private async persistNodeStatus(
    workflowId: string,
    nodeName: string,
    config: {
      extra: NodeExtraStatus;
      topology?: string;
      device_ID?: string;
      TTS_input?: string;
      execute_emoji?: string;
      sub?: Record<string, string>;
    },
    options: {
      category?: NodeCategory;
      applyToCategory?: boolean;
    } = {}
  ): Promise<void> {
    logger.info('ConfigAgent: persist node status begin', {
      workflowId,
      nodeName,
      scope: options.applyToCategory ? options.category ?? 'unknown' : 'single-node',
      config: this.summarizeConfigForLog(config),
    });
    const n8nClient = this.getN8nClient();
    const workflow = await n8nClient.getWorkflow(workflowId);
    const nodes = Array.isArray(workflow.nodes) ? [...workflow.nodes] : [];
    const targetNode = nodes.find((node) => node?.name === nodeName) as Record<string, unknown> | undefined;

    if (!targetNode) {
      logger.warn('ConfigAgent: persist node status failed - node missing', {
        workflowId,
        nodeName,
        availableNodeNames: nodes.map((node) => node?.name).filter(Boolean),
      });
      throw new Error(`未找到节点：${nodeName}`);
    }

    const shouldApplyToCategory = Boolean(options.applyToCategory && options.category);
    const targetNodes = shouldApplyToCategory
      ? nodes.filter((node) => this.parseNodeNotes(node?.notes).category === options.category)
      : [targetNode];

    if (shouldApplyToCategory && targetNodes.length === 0) {
      logger.warn('ConfigAgent: persist node status failed - category nodes missing', {
        workflowId,
        nodeName,
        category: options.category,
      });
      throw new Error(`未找到类别节点：${options.category}`);
    }

    targetNodes.forEach((node) => {
      const nodeRecord = node as Record<string, unknown>;
      const notes = this.parseNodeNotes(nodeRecord.notes);
      const sub: NodeSubParams = {
        ...(notes.sub ?? {}),
      };
      const isPrimaryNode = nodeRecord.name === nodeName;

      if (isPrimaryNode) {
        if (config.TTS_input !== undefined) {
          sub.TTS_input = config.TTS_input;
        }
        if (config.execute_emoji !== undefined) {
          sub.execute_emoji = config.execute_emoji;
        }
        if (config.sub && typeof config.sub === 'object') {
          Object.entries(config.sub).forEach(([key, value]) => {
            if (typeof value === 'string') {
              (sub as Record<string, string>)[key] = value;
            }
          });
        }
      }

      const nextNotes: NodeNotes = {
        ...notes,
        extra: config.extra,
        topology: config.topology ?? notes.topology ?? null,
        device_ID: config.device_ID ?? notes.device_ID ?? null,
        sub,
      };

      nodeRecord.notes = nextNotes;
    });

    const updatedWorkflow = {
      ...workflow,
      nodes,
    };

    await n8nClient.updateWorkflow(workflowId, updatedWorkflow);
    logger.info('ConfigAgent: persist node status success', {
      workflowId,
      nodeName,
      updatedNodeCount: targetNodes.length,
      updatedNodes: targetNodes.map((node) => node?.name).filter(Boolean),
      extra: config.extra,
      topology: config.topology ?? null,
      device_ID: config.device_ID ?? null,
      subKeys: Object.keys(config.sub ?? {}),
    });
  }

  private summarizeNodeForLog(node: ConfigurableNode | null): Record<string, unknown> | null {
    if (!node) {
      return null;
    }
    return {
      name: node.name,
      type: node.type,
      category: node.category,
      status: node.status,
      index: node.index,
      needs: node.configFields,
      subKeys: node.configFields?.subKeys ?? Object.keys(node.configValues?.sub ?? {}),
    };
  }

  private summarizeConfigForLog(config: NodeConfigInput): Record<string, unknown> {
    return {
      portId: config.portId ?? null,
      hasTopology: typeof config.topology === 'string' && config.topology.length > 0,
      hasDeviceId: typeof config.device_ID === 'string' && config.device_ID.length > 0,
      hasTtsInput: typeof config.TTS_input === 'string' && config.TTS_input.length > 0,
      hasExecuteEmoji: typeof config.execute_emoji === 'string' && config.execute_emoji.length > 0,
      subKeys: config.sub ? Object.keys(config.sub) : [],
    };
  }
}
