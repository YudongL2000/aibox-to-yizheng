/**
 * [INPUT]: 依赖 vitest 与 src/agents/agent-config 的配置加载逻辑
 * [OUTPUT]: 对外提供 Agent 配置加载的单元测试
 * [POS]: tests/unit/agents 中验证环境变量解析与降级启动行为的测试文件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  process.env.AGENT_SCENE_SAFETY_NETS = 'all';
  process.env.AGENT_DISABLE_SCENE_SAFETY_NETS = '';
  process.env.AGENT_DORMANT_SCENE_SAFETY_NETS = '';
}

describe('Agent config', () => {
  it('loads config from AI_* variables', async () => {
    resetEnv();
    process.env.AI_API_KEY = 'test-key';
    process.env.AI_MODEL = 'test-model';
    process.env.AI_BASE_URL = 'https://example.com';
    process.env.AGENT_MAX_TURNS = '4';
    process.env.AGENT_CONVERGENCE_THRESHOLD = '0.9';
    process.env.AGENT_LLM_TIMEOUT_MS = '12000';
    process.env.AGENT_LLM_HEALTH_TIMEOUT_MS = '8000';
    process.env.AGENT_LLM_DISCOVERY_TIMEOUT_MS = '2500';
    process.env.AGENT_LLM_REFLECTION_TIMEOUT_MS = '18000';
    process.env.AGENT_WORKFLOW_CACHE_TTL = '900';
    process.env.AGENT_MAX_ITERATIONS = '4';
    process.env.AGENT_PROMPT_VARIANT = 'strict';

    vi.resetModules();
    const { loadAgentConfig } = await import('../../../src/agents/agent-config');

    const config = loadAgentConfig();
    expect(config.llmApiKey).toBe('test-key');
    expect(config.llmModel).toBe('test-model');
    expect(config.llmBaseUrl).toBe('https://example.com');
    expect(config.maxConversationTurns).toBe(4);
    expect(config.convergenceThreshold).toBe(0.9);
    expect(config.llmTimeoutMs).toBe(12000);
    expect(config.llmHealthTimeoutMs).toBe(8000);
    expect(config.llmDiscoveryTimeoutMs).toBe(2500);
    expect(config.llmReflectionTimeoutMs).toBe(18000);
    expect(config.workflowCacheTtlSeconds).toBe(900);
    expect(config.maxIterations).toBe(4);
    expect(config.promptVariant).toBe('strict');
    expect(config.sceneSafetyNetFlags).toEqual({});
    expect(config.sceneSafetyNetDormantFlags).toEqual({
      pruneGestureRedundantTtsNodes: true,
      pruneSpeakerRelayNodes: true,
    });
  });

  it('falls back to generic variables', async () => {
    resetEnv();
    process.env.api_key = 'fallback-key';
    process.env.base_url = 'https://fallback.example.com';
    process.env.model = 'fallback-model';

    vi.resetModules();
    const { loadAgentConfig } = await import('../../../src/agents/agent-config');

    const config = loadAgentConfig();
    expect(config.llmApiKey).toBe('fallback-key');
    expect(config.llmBaseUrl).toBe('https://fallback.example.com');
    expect(config.llmModel).toBe('fallback-model');
    expect(config.llmEnabled).toBe(true);
  });

  it('allows degraded startup when llm variables are missing', async () => {
    resetEnv();
    delete process.env.AI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.api_key;
    delete process.env.AI_BASE_URL;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.base_url;
    delete process.env.AI_MODEL;
    delete process.env.OPENAI_MODEL;
    delete process.env.model;
    delete process.env.AGENT_LLM_TIMEOUT_MS;
    delete process.env.AGENT_LLM_HEALTH_TIMEOUT_MS;
    delete process.env.AGENT_LLM_DISCOVERY_TIMEOUT_MS;
    delete process.env.AGENT_LLM_REFLECTION_TIMEOUT_MS;

    vi.resetModules();
    vi.doMock('dotenv', () => ({
      default: {
        config: vi.fn(),
      },
    }));
    try {
      const { loadAgentConfig } = await import('../../../src/agents/agent-config');

      const config = loadAgentConfig();
      expect(config.llmApiKey).toBeUndefined();
      expect(config.llmEnabled).toBe(false);
      expect(config.llmModel).toBe('gpt-4o-mini');
      expect(config.llmHealthTimeoutMs).toBe(5000);
      expect(config.llmDiscoveryTimeoutMs).toBe(6000);
      expect(config.llmReflectionTimeoutMs).toBe(12000);
      expect(config.sceneSafetyNetFlags).toEqual({});
      expect(config.sceneSafetyNetDormantFlags).toEqual({
        pruneGestureRedundantTtsNodes: true,
        pruneSpeakerRelayNodes: true,
      });
    } finally {
      vi.doUnmock('dotenv');
    }
  });

  it('supports disabling scene safety nets through env variables', async () => {
    resetEnv();
    process.env.AGENT_SCENE_SAFETY_NETS = 'all';
    process.env.AGENT_DISABLE_SCENE_SAFETY_NETS =
      'ensureResultBranches,ensureHandHasAssign';

    vi.resetModules();
    const { loadAgentConfig } = await import('../../../src/agents/agent-config');

    const config = loadAgentConfig();
    expect(config.sceneSafetyNetFlags).toEqual({
      ensureResultBranches: false,
      ensureHandHasAssign: false,
    });
  });

  it('supports disabling all scene safety nets through env variables', async () => {
    resetEnv();
    process.env.AGENT_SCENE_SAFETY_NETS = 'none';

    vi.resetModules();
    const { loadAgentConfig } = await import('../../../src/agents/agent-config');

    const config = loadAgentConfig();
    expect(config.sceneSafetyNetFlags).toMatchObject({
      ensureGestureIdentityFlow: false,
      ensureEmotionInteractionFlow: false,
      pruneGestureRedundantTtsNodes: false,
      ensureGameHandExecutor: false,
      ensureIfDirectExecutorConnections: false,
      pruneSpeakerRelayNodes: false,
      ensureSpeakerHasTts: false,
      ensureResultBranches: false,
      ensureHandHasAssign: false,
    });
  });

  it('supports overriding dormant scene safety nets through env variables', async () => {
    resetEnv();
    process.env.AGENT_DORMANT_SCENE_SAFETY_NETS = 'ensureSpeakerHasTts';

    vi.resetModules();
    const { loadAgentConfig } = await import('../../../src/agents/agent-config');

    const config = loadAgentConfig();
    expect(config.sceneSafetyNetDormantFlags).toEqual({
      pruneGestureRedundantTtsNodes: true,
      pruneSpeakerRelayNodes: true,
      ensureSpeakerHasTts: true,
    });
  });

  it('supports clearing dormant scene safety nets through env variables', async () => {
    resetEnv();
    process.env.AGENT_DORMANT_SCENE_SAFETY_NETS = 'none';

    vi.resetModules();
    const { loadAgentConfig } = await import('../../../src/agents/agent-config');

    const config = loadAgentConfig();
    expect(config.sceneSafetyNetDormantFlags).toEqual({});
  });
});
