/**
 * [INPUT]: 依赖 IntakeAgent 的 Orchestrator 包装层与 mock 编排器
 * [OUTPUT]: 验证 IntakeAgent 已退化为轻量委托入口
 * [POS]: tests/unit/agents 的入口代理回归测试，阻止旧场景逻辑回流
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it, vi } from 'vitest';
import { IntakeAgent } from '../../../src/agents/intake-agent';
import { Orchestrator } from '../../../src/agents/orchestrator';
import { SessionService } from '../../../src/agents/session-service';

const TEST_CONFIG = {
  llmProvider: 'openai' as const,
  llmModel: 'test-model',
  llmApiKey: 'test-key',
  maxConversationTurns: 6,
  convergenceThreshold: 0.7,
  llmTimeoutMs: 1000,
  llmHealthTimeoutMs: 5000,
  workflowCacheTtlSeconds: 300,
  maxIterations: 3,
  promptVariant: 'baseline',
};

describe('IntakeAgent', () => {
  it('delegates processUserInput to orchestrator.process', async () => {
    const sessionService = new SessionService();
    const orchestrator = {
      process: vi.fn().mockResolvedValue({ type: 'guidance', message: '需要澄清触发条件' }),
      confirm: vi.fn(),
    } as unknown as Orchestrator;

    const agent = new IntakeAgent(
      TEST_CONFIG,
      { classify: vi.fn(), chat: vi.fn() } as any,
      {} as any,
      {} as any,
      sessionService,
      [],
      undefined,
      orchestrator
    );

    const session = sessionService.getOrCreate();
    const response = await agent.processUserInput('帮我做个机器人', session.id);

    expect(orchestrator.process).toHaveBeenCalledWith('帮我做个机器人', session.id);
    expect(response).toEqual({ type: 'guidance', message: '需要澄清触发条件' });
  });

  it('delegates confirmBlueprint to orchestrator.confirm', async () => {
    const sessionService = new SessionService();
    const orchestrator = {
      process: vi.fn(),
      confirm: vi.fn().mockResolvedValue({ type: 'workflow_ready', message: 'ok', workflow: { name: 'wf', nodes: [], connections: {} }, metadata: { iterations: 1, nodeCount: 0 } }),
    } as unknown as Orchestrator;

    const agent = new IntakeAgent(
      TEST_CONFIG,
      { classify: vi.fn(), chat: vi.fn() } as any,
      {} as any,
      {} as any,
      sessionService,
      [],
      undefined,
      orchestrator
    );

    const response = await agent.confirmBlueprint('session-1');

    expect(orchestrator.confirm).toHaveBeenCalledWith('session-1');
    expect(response.type).toBe('workflow_ready');
  });
});
