/**
 * [INPUT]: 依赖 SessionService 与 n8n API 配置
 * [OUTPUT]: 对外提供 ConfigAgent 创建入口
 * [POS]: agents 的配置阶段服务入口，负责组装 ConfigAgent
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

import { getN8nApiConfig } from '../config/n8n-api';
import { N8nApiClient } from '../services/n8n-api-client';
import { ConfigAgent } from './config-agent';
import { SessionService } from './session-service';
import { logger } from '../utils/logger';

export class ConfigAgentService {
  constructor(
    private sessionService: SessionService,
    private n8nClient: N8nApiClient
  ) {}

  static create(sessionService: SessionService): ConfigAgentService | null {
    const config = getN8nApiConfig();
    if (!config) {
      logger.warn('ConfigAgentService: N8N API 未配置，配置流程将不可用');
      return null;
    }

    const n8nClient = new N8nApiClient(config);
    return new ConfigAgentService(sessionService, n8nClient);
  }

  createAgent(): ConfigAgent {
    return new ConfigAgent(this.sessionService, this.n8nClient);
  }
}
