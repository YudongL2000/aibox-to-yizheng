/**
 * [INPUT]: 依赖 SessionService 与 n8n API 配置
 * [OUTPUT]: 对外提供 ConfigAgent 创建入口，并在 embedded n8n 稍后才就绪时按配置请求延迟解析 n8n client。
 * [POS]: agents 的配置阶段服务入口，负责组装 ConfigAgent
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

import { getN8nApiConfig } from '../config/n8n-api';
import { N8nApiClient } from '../services/n8n-api-client';
import { ConfigAgent } from './config-agent';
import { SessionService } from './session-service';
import { logger } from '../utils/logger';

type ConfigAgentN8nClient = Pick<N8nApiClient, 'getWorkflow' | 'updateWorkflow'>;

export class ConfigAgentService {
  constructor(
    private sessionService: SessionService,
    private readonly n8nClientProvider: () => ConfigAgentN8nClient
  ) {}

  static create(sessionService: SessionService): ConfigAgentService {
    if (!getN8nApiConfig()) {
      logger.warn('ConfigAgentService: N8N API 未配置，配置流程将在运行时继续重试');
    }

    return new ConfigAgentService(sessionService, () => {
      const config = getN8nApiConfig();
      if (!config) {
        return createDisabledN8nClient();
      }

      return new N8nApiClient(config);
    });
  }

  createAgent(): ConfigAgent {
    return new ConfigAgent(this.sessionService, this.n8nClientProvider);
  }
}

function createDisabledN8nClient(): ConfigAgentN8nClient {
  return {
    async getWorkflow() {
      throw new Error('N8N API 未配置，无法读取工作流');
    },
    async updateWorkflow() {
      throw new Error('N8N API 未配置，无法更新工作流');
    },
  };
}
