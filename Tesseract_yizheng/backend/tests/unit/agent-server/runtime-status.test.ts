/**
 * [INPUT]: 依赖 AgentRuntimeStatusMonitor 与伪造 probe 函数
 * [OUTPUT]: 对外提供 agent-server 运行时诊断监控器的单元测试
 * [POS]: tests/unit/agent-server 中验证 LLM 诊断缓存、降级与静态监控行为的测试文件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it, vi } from 'vitest';
import {
  AgentRuntimeStatusMonitor,
  createStaticRuntimeStatusMonitor,
} from '../../../src/agent-server/runtime-status';
import type { AgentConfig } from '../../../src/agents/agent-config';

function createConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    llmProvider: 'openai',
    llmModel: 'test-model',
    llmApiKey: 'test-key',
    llmBaseUrl: 'https://example.com/v1',
    llmEnabled: true,
    maxConversationTurns: 4,
    convergenceThreshold: 0.7,
    llmTimeoutMs: 1000,
    llmHealthTimeoutMs: 5000,
    workflowCacheTtlSeconds: 300,
    maxIterations: 2,
    promptVariant: 'baseline',
    ...overrides,
  };
}

describe('AgentRuntimeStatusMonitor', () => {
  it('returns disabled snapshot when llm is not configured', async () => {
    const monitor = new AgentRuntimeStatusMonitor(
      createConfig({
        llmApiKey: undefined,
        llmEnabled: false,
      }),
      vi.fn()
    );

    const snapshot = monitor.getSnapshot();
    const status = await monitor.getStatus();

    expect(snapshot.llm.state).toBe('disabled');
    expect(status.llm.code).toBe('disabled');
  });

  it('caches successful probe results', async () => {
    const probe = vi.fn().mockResolvedValue({
      state: 'ready',
      code: 'ok',
      enabled: true,
      provider: 'openai',
      model: 'test-model',
      baseUrl: 'https://example.com/v1',
      message: 'LLM 网关可用',
      checkedAt: new Date().toISOString(),
      latencyMs: 18,
      probeTimeoutMs: 5000,
    });
    const monitor = new AgentRuntimeStatusMonitor(createConfig(), probe, 60_000);

    const first = await monitor.getStatus();
    const second = await monitor.getStatus();

    expect(first.llm.state).toBe('ready');
    expect(second.llm.latencyMs).toBe(18);
    expect(second.llm.probeTimeoutMs).toBe(5000);
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('propagates configured health timeout into snapshot', async () => {
    const probe = vi.fn().mockResolvedValue({
      state: 'degraded',
      code: 'timeout',
      enabled: true,
      provider: 'openai',
      model: 'test-model',
      baseUrl: 'https://example.com/v1',
      message: 'LLM 网关超时',
      checkedAt: new Date().toISOString(),
      latencyMs: 2500,
      probeTimeoutMs: 2500,
    });
    const monitor = new AgentRuntimeStatusMonitor(
      createConfig({ llmHealthTimeoutMs: 2500 }),
      probe,
      60_000
    );

    const status = await monitor.getStatus(true);

    expect(status.llm.code).toBe('timeout');
    expect(status.llm.probeTimeoutMs).toBe(2500);
  });

  it('exposes static monitor snapshots for tests', async () => {
    const monitor = createStaticRuntimeStatusMonitor({
      llm: {
        state: 'degraded',
        code: 'timeout',
        enabled: true,
        provider: 'openai',
        model: 'test-model',
        baseUrl: 'https://example.com/v1',
        message: 'LLM 网关超时',
        checkedAt: new Date().toISOString(),
        latencyMs: 5000,
        probeTimeoutMs: 5000,
      },
    });

    const snapshot = monitor.getSnapshot();
    const status = await monitor.getStatus(true);

    expect(snapshot.llm.state).toBe('degraded');
    expect(status.llm.code).toBe('timeout');
  });
});
