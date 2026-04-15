#!/usr/bin/env node
/**
 * [INPUT]: 依赖 agent-server 组件与 logger
 * [OUTPUT]: 对外提供服务启动入口，并在 n8n API 缺席时以降级模式继续启动 HTTP 服务。
 * [POS]: agent-server CLI 启动脚本
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

import path from 'node:path';
import { logger } from '../utils/logger';
import { createAgentStack } from './agent-factory';
import { AgentHttpServer } from './server';
import { WorkflowDeployer } from '../agents/workflow-service';

async function main() {
  const logPath = logger.enableFileLogging({
    directory: path.resolve(process.cwd(), 'data', 'logs'),
  });
  if (logPath) {
    logger.info('File logging enabled', { path: logPath });
  }

  const { agentService, runtimeStatusMonitor, close } = await createAgentStack();
  const workflowService = WorkflowDeployer.create();
  if (!workflowService.isAvailable()) {
    logger.warn(
      'Workflow deployer is unavailable; server will start without workflow create support',
      {
        reason: workflowService.getUnavailableReason(),
      }
    );
  }

  const server = new AgentHttpServer(agentService, workflowService, runtimeStatusMonitor);
  const { port, host } = await server.start();

  logger.info(`Agent server listening on http://${host}:${port}`);
  logger.info('Initial runtime status', runtimeStatusMonitor.getSnapshot());
  void runtimeStatusMonitor.getStatus(true).then((status) => {
    logger.info('Runtime status probe completed', status);
  });

  const shutdown = async () => {
    await server.stop();
    await close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.error('Agent server failed to start', error);
  process.exit(1);
});
