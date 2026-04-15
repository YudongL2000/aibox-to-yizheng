/**
 * [INPUT]: 依赖 agents 组件、数据库、n8n API 配置
 * [OUTPUT]: 对外提供 AgentService、MQTT hardware runtime 与运行时状态监控器的组装入口
 * [POS]: agent-server 启动时的依赖注入工厂，也是硬件 runtime 真相源的接线口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { AgentConfig, loadAgentConfig } from '../agents/agent-config';
import { HardwareService } from '../agents/hardware-service';
import { IntakeAgent } from '../agents/intake-agent';
import { createLLMClient, LLMClient } from '../agents/llm-client';
import { SessionService } from '../agents/session-service';
import { MCPClient } from '../agents/mcp-client';
import { Orchestrator } from '../agents/orchestrator';
import { WorkflowArchitect } from '../agents/workflow-architect';
import { HARDWARE_COMPONENTS, HardwareComponent } from '../agents/hardware-components';
import { ALLOWED_NODE_TYPES } from '../agents/allowed-node-types';
import { createDatabaseAdapter } from '../database/database-adapter';
import { NodeRepository } from '../database/node-repository';
import { resolveAgentDbPath } from '../agents/agent-db-path';
import { logger } from '../utils/logger';
import { AgentService } from './agent-service';
import { ConfigAgentService } from '../agents/config-agent-service';
import { ConfigAgent } from '../agents/config-agent';
import { LLMBasedDialogueModeRouter } from '../agents/dialogue-mode/dialogue-mode-router';
import { SkillLibraryRepository } from '../agents/dialogue-mode/skill-library-repository';
import {
  AgentRuntimeStatusMonitor,
  RuntimeStatusMonitor,
} from './runtime-status';
import { MqttHardwareRuntime } from '../agents/mqtt-hardware-runtime';

export interface AgentStackOptions {
  config?: AgentConfig;
  llmClient?: LLMClient;
  mcpClient?: MCPClient;
  workflowArchitect?: WorkflowArchitect;
  hardwareComponents?: HardwareComponent[];
  nodeDbPath?: string;
  skillLibraryRepository?: SkillLibraryRepository;
  runtimeStatusMonitor?: RuntimeStatusMonitor;
  hardwareRuntime?: MqttHardwareRuntime;
}

export async function createAgentStack(options: AgentStackOptions = {}) {
  const config = options.config ?? loadAgentConfig();
  logger.info('Agent stack config', {
    provider: config.llmProvider,
    model: config.llmModel,
    llmEnabled: config.llmEnabled !== false,
    hasBaseUrl: Boolean(config.llmBaseUrl),
    maxTurns: config.maxConversationTurns,
    convergenceThreshold: config.convergenceThreshold,
    maxIterations: config.maxIterations,
    workflowCacheTtlSeconds: config.workflowCacheTtlSeconds,
    llmTimeoutMs: config.llmTimeoutMs,
    llmHealthTimeoutMs: config.llmHealthTimeoutMs,
    llmDiscoveryTimeoutMs: config.llmDiscoveryTimeoutMs ?? null,
    llmReflectionTimeoutMs: config.llmReflectionTimeoutMs ?? null,
    promptVariant: config.promptVariant ?? 'baseline',
  });
  const llmClient = options.llmClient ?? createLLMClient(config);
  const runtimeStatusMonitor =
    options.runtimeStatusMonitor ?? new AgentRuntimeStatusMonitor(config);
  const hardwareRuntime =
    options.hardwareRuntime ??
    new MqttHardwareRuntime({
      enabled: config.mqttEnabled ?? Boolean(config.mqttBroker),
      broker: config.mqttBroker ?? '115.190.193.254',
      port: config.mqttPort ?? 17801,
      deviceId: config.mqttDeviceId ?? 'aibox001',
      keepalive: config.mqttKeepalive ?? 60,
    });
  const hardwareService = new HardwareService();
  const hardwareComponents = options.hardwareComponents ?? HARDWARE_COMPONENTS;

  const nodeDbPath = options.nodeDbPath ?? resolveAgentDbPath();
  const nodeAdapter = options.mcpClient ? null : await createDatabaseAdapter(nodeDbPath);
  const nodeRepository = nodeAdapter ? new NodeRepository(nodeAdapter) : null;

  const mcpClient =
    options.mcpClient ??
    new MCPClient(nodeRepository!, {
      allowedNodeTypes: ALLOWED_NODE_TYPES,
    });
  const workflowArchitect =
    options.workflowArchitect ??
    new WorkflowArchitect(llmClient, mcpClient, {
      llmTimeoutMs: config.llmTimeoutMs,
      cacheTtlSeconds: config.workflowCacheTtlSeconds,
      maxIterations: config.maxIterations,
      promptVariant: config.promptVariant,
      sceneSafetyNetFlags: config.sceneSafetyNetFlags,
      sceneSafetyNetDormantFlags: config.sceneSafetyNetDormantFlags,
    });
  const sessionService = new SessionService({
    maxTurns: config.maxConversationTurns,
  });
  const orchestrator = new Orchestrator(
    config,
    llmClient,
    sessionService,
    hardwareComponents,
    workflowArchitect,
    mcpClient
  );

  const intakeAgent = new IntakeAgent(
    config,
    llmClient,
    workflowArchitect,
    hardwareService,
    sessionService,
    hardwareComponents,
    undefined,
    orchestrator,
    mcpClient
  );

  const configAgentService = ConfigAgentService.create(sessionService);
  const configAgent = configAgentService.createAgent();
  const dialogueModeRouter = new LLMBasedDialogueModeRouter(
    llmClient,
    config.llmReflectionTimeoutMs ?? config.llmDiscoveryTimeoutMs ?? config.llmTimeoutMs
  );
  const skillLibraryRepository =
    options.skillLibraryRepository ?? new SkillLibraryRepository();
  const agentService = new AgentService(
    intakeAgent,
    sessionService,
    configAgent,
    skillLibraryRepository,
    dialogueModeRouter,
    hardwareRuntime
  );
  await hardwareRuntime.start();
  runtimeStatusMonitor.start();

  return {
    agentService,
    sessionService,
    nodeRepository,
    runtimeStatusMonitor,
    hardwareRuntime,
    close: async () => {
      await hardwareRuntime.stop();
      nodeAdapter?.close();
    },
  };
}
