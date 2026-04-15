/**
 * [INPUT]: 依赖 SessionService 与 ConfigAgent
 * [OUTPUT]: 对外提供配置流程编排能力
 * [POS]: agents 模块的配置流程协调器，负责会话状态与 ConfigAgent 协同
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

import type { ConfigAgent } from './config-agent';
import type {
  AgentResponse,
  AgentSession,
  ConfigAgentState,
} from './types';
import { SessionService } from './session-service';
import { logger } from '../utils/logger';
import { AGENT_PROMPT_COPY } from './prompt-copy';

type NodeConfigInput = {
  portId?: string;
  topology?: string;
  device_ID?: string;
  TTS_input?: string;
  execute_emoji?: string;
  sub?: Record<string, string>;
};

export class ConfigWorkflowOrchestrator {
  constructor(
    private sessionService: SessionService,
    private configAgent: Pick<
      ConfigAgent,
      'initializeFromWorkflow' | 'startConfigureCurrentNode' | 'confirmNodeConfig' | 'buildCurrentNodeResponse'
    >
  ) {}

  async initializeConfigAgent(
    sessionId: string,
    workflowId: string,
    workflowJson: AgentSession['workflow']
  ): Promise<ConfigAgentState> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    if (!workflowJson) {
      throw new Error('workflowJson is required');
    }

    // 确保 session.workflow 始终可用 — 无论是教学流还是技能回放
    if (!session.workflow) {
      this.sessionService.setWorkflow(sessionId, workflowJson);
    }

    const configState = await this.configAgent.initializeFromWorkflow(
      sessionId,
      workflowId,
      workflowJson
    );
    this.sessionService.setConfigAgentState(sessionId, configState);

    logger.info('ConfigWorkflowOrchestrator: ConfigAgent initialized', {
      sessionId,
      workflowId,
      pendingNodes: configState.progress?.total ?? 0,
    });

    return configState;
  }

  async startConfigureNode(sessionId: string) {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    logger.info('ConfigWorkflowOrchestrator: start configure node', { sessionId });
    return this.configAgent.startConfigureCurrentNode(sessionId);
  }

  async confirmNodeConfiguration(
    sessionId: string,
    nodeName: string,
    config: NodeConfigInput
  ): Promise<AgentResponse> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    logger.info('ConfigWorkflowOrchestrator: confirm node request', {
      sessionId,
      nodeName,
      config: {
        hasTopology: typeof config.topology === 'string' && config.topology.length > 0,
        hasDeviceId: typeof config.device_ID === 'string' && config.device_ID.length > 0,
        hasTtsInput: typeof config.TTS_input === 'string' && config.TTS_input.length > 0,
        hasExecuteEmoji: typeof config.execute_emoji === 'string' && config.execute_emoji.length > 0,
        subKeys: config.sub ? Object.keys(config.sub) : [],
      },
    });

    const result = await this.configAgent.confirmNodeConfig(sessionId, nodeName, config);
    if (!result.success) {
      logger.warn('ConfigWorkflowOrchestrator: confirm node failed', {
        sessionId,
        nodeName,
      });
      return {
        type: 'error',
        message: '配置失败，请重试',
        details: { nodeName },
      };
    }

    if (result.isComplete) {
      const state = this.getConfigState(sessionId);
      const workflowId = state?.workflowId;
      const totalConfigured = state?.configurableNodes.filter((node) => node.status === 'configured').length
        ?? result.progress.total;
      logger.info('ConfigWorkflowOrchestrator: configuration completed', {
        sessionId,
        workflowId: workflowId ?? null,
        totalConfigured,
      });
      return {
        type: 'config_complete',
        message: '所有节点配置完成！工作流已就绪。',
        totalConfigured,
        ...(workflowId ? { metadata: { workflowId } } : {}),
      };
    }

    if (result.nextNode) {
      await this.configAgent.startConfigureCurrentNode(sessionId);
    } else {
      logger.warn('ConfigWorkflowOrchestrator: next node missing after confirm', {
        sessionId,
        nodeName,
      });
      return {
        type: 'error',
        message: '缺少下一待配置节点，请重试',
      };
    }

    logger.info('ConfigWorkflowOrchestrator: node confirmed, next node pending', {
      sessionId,
      configuredNode: nodeName,
      nextNode: result.nextNode.name,
      progress: result.progress,
    });
    const configuredNodeMeta = this.getConfigState(sessionId)?.configurableNodes.find(
      (node) => node.name === nodeName
    );
    const configuredLabel = configuredNodeMeta?.title ?? configuredNodeMeta?.displayName ?? nodeName;
    return this.configAgent.buildCurrentNodeResponse(sessionId, {
      prefix: AGENT_PROMPT_COPY.configuredSuccess(
        configuredNodeMeta?.category,
        configuredLabel
      ),
    });
  }

  getConfigState(sessionId: string): ConfigAgentState | null {
    return this.sessionService.getConfigState(sessionId);
  }
}
