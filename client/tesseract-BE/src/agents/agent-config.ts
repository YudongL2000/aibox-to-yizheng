/**
 * [INPUT]: 依赖 dotenv、zod 与根目录环境变量
 * [OUTPUT]: 对外提供 AgentConfig 类型与 loadAgentConfig 配置加载函数
 * [POS]: agents 模块的配置入口，负责将外部环境映射为可降级启动的运行配置与健康/发现/反思阈值
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { z } from 'zod';
import {
  parseWorkflowSceneSafetyNetDormantFlags,
  parseWorkflowSceneSafetyNetFlags,
  type WorkflowSceneSafetyNetDormantFlags,
  type WorkflowSceneSafetyNetFlags,
} from './workflow-architect/scene/safety-net-controls';

export interface AgentConfig {
  llmProvider: 'openai';
  llmModel: string;
  llmApiKey?: string;
  llmBaseUrl?: string;
  llmEnabled?: boolean;
  maxConversationTurns: number;
  convergenceThreshold: number;
  llmTimeoutMs: number;
  llmHealthTimeoutMs: number;
  llmDiscoveryTimeoutMs?: number;
  llmReflectionTimeoutMs?: number;
  workflowCacheTtlSeconds: number;
  maxIterations: number;
  promptVariant?: string;
  sceneSafetyNetFlags?: Partial<WorkflowSceneSafetyNetFlags>;
  sceneSafetyNetDormantFlags?: WorkflowSceneSafetyNetDormantFlags;
  mqttBroker?: string;
  mqttPort?: number;
  mqttDeviceId?: string;
  mqttKeepalive?: number;
  mqttEnabled?: boolean;
}

const agentConfigSchema = z.object({
  AI_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  api_key: z.string().min(1).optional(),
  AI_BASE_URL: z.string().url().optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  base_url: z.string().url().optional(),
  AI_MODEL: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  AGENT_MAX_TURNS: z.coerce.number().positive().default(6),
  AGENT_CONVERGENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),
  AGENT_LLM_TIMEOUT_MS: z.coerce.number().positive().default(30000),
  AGENT_LLM_HEALTH_TIMEOUT_MS: z.coerce.number().positive().default(5000),
  AGENT_LLM_DISCOVERY_TIMEOUT_MS: z.coerce.number().positive().optional(),
  AGENT_LLM_REFLECTION_TIMEOUT_MS: z.coerce.number().positive().optional(),
  AGENT_WORKFLOW_CACHE_TTL: z.coerce.number().positive().default(600),
  AGENT_MAX_ITERATIONS: z.coerce.number().positive().default(3),
  AGENT_PROMPT_VARIANT: z.string().optional(),
  AGENT_MQTT_BROKER: z.string().optional(),
  AGENT_MQTT_PORT: z.coerce.number().positive().optional(),
  AGENT_MQTT_DEVICE_ID: z.string().optional(),
  AGENT_MQTT_KEEPALIVE: z.coerce.number().positive().optional(),
  AGENT_MQTT_ENABLED: z.string().optional(),
  AGENT_SCENE_SAFETY_NETS: z.string().optional(),
  AGENT_DISABLE_SCENE_SAFETY_NETS: z.string().optional(),
  AGENT_DORMANT_SCENE_SAFETY_NETS: z.string().optional(),
});

const DEFAULT_DORMANT_SCENE_SAFETY_NET_FLAGS: WorkflowSceneSafetyNetDormantFlags = {
  pruneGestureRedundantTtsNodes: true,
  pruneSpeakerRelayNodes: true,
};

let envLoaded = false;

function loadEnvOnce() {
  if (envLoaded) {
    return;
  }

  dotenv.config();

  const envCopyPath = path.join(process.cwd(), '.env copy');
  if (existsSync(envCopyPath)) {
    dotenv.config({ path: envCopyPath });
  }

  envLoaded = true;
}

export function loadAgentConfig(): AgentConfig {
  loadEnvOnce();

  const parsed = agentConfigSchema.parse(process.env);
  const llmApiKey = parsed.AI_API_KEY || parsed.OPENAI_API_KEY || parsed.api_key;
  const llmBaseUrl = parsed.AI_BASE_URL || parsed.OPENAI_BASE_URL || parsed.base_url;
  const llmModel = parsed.AI_MODEL || parsed.OPENAI_MODEL || parsed.model || 'gpt-4o-mini';
  const llmTimeoutMs = parsed.AGENT_LLM_TIMEOUT_MS;
  const dormantMode = parsed.AGENT_DORMANT_SCENE_SAFETY_NETS?.trim().toLowerCase();
  const sceneSafetyNetDormantFlags =
    dormantMode === 'none'
      ? {}
      : {
          ...DEFAULT_DORMANT_SCENE_SAFETY_NET_FLAGS,
          ...parseWorkflowSceneSafetyNetDormantFlags({
            dormant: parsed.AGENT_DORMANT_SCENE_SAFETY_NETS,
          }),
        };

  return {
    llmProvider: 'openai',
    llmModel,
    llmApiKey,
    llmBaseUrl,
    llmEnabled: Boolean(llmApiKey),
    maxConversationTurns: parsed.AGENT_MAX_TURNS,
    convergenceThreshold: parsed.AGENT_CONVERGENCE_THRESHOLD,
    llmTimeoutMs,
    llmHealthTimeoutMs: parsed.AGENT_LLM_HEALTH_TIMEOUT_MS,
    llmDiscoveryTimeoutMs: parsed.AGENT_LLM_DISCOVERY_TIMEOUT_MS ?? Math.min(llmTimeoutMs, 15000),
    llmReflectionTimeoutMs: parsed.AGENT_LLM_REFLECTION_TIMEOUT_MS ?? Math.min(llmTimeoutMs, 12000),
    workflowCacheTtlSeconds: parsed.AGENT_WORKFLOW_CACHE_TTL,
    maxIterations: parsed.AGENT_MAX_ITERATIONS,
    promptVariant: parsed.AGENT_PROMPT_VARIANT,
    mqttBroker: parsed.AGENT_MQTT_BROKER,
    mqttPort: parsed.AGENT_MQTT_PORT ?? 17801,
    mqttDeviceId: parsed.AGENT_MQTT_DEVICE_ID ?? 'aibox001',
    mqttKeepalive: parsed.AGENT_MQTT_KEEPALIVE ?? 60,
    mqttEnabled:
      parsed.AGENT_MQTT_ENABLED === undefined
        ? Boolean(parsed.AGENT_MQTT_BROKER)
        : parsed.AGENT_MQTT_ENABLED.trim().toLowerCase() !== 'false',
    sceneSafetyNetFlags: parseWorkflowSceneSafetyNetFlags({
      mode: parsed.AGENT_SCENE_SAFETY_NETS,
      disabled: parsed.AGENT_DISABLE_SCENE_SAFETY_NETS,
    }),
    sceneSafetyNetDormantFlags,
  };
}
