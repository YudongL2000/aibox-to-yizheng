/**
 * [INPUT]: 依赖 AgentService、IntakeAgent、SessionService 与 Refactor-3 编排链路
 * [OUTPUT]: 验证多轮对话状态可持续累积，并能生成能力驱动工作流
 * [POS]: tests/e2e 的会话级编排回归测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it, vi } from 'vitest';
import { AgentService } from '../../src/agent-server/agent-service';
import { HARDWARE_COMPONENTS } from '../../src/agents/hardware-components';
import { HardwareService } from '../../src/agents/hardware-service';
import { IntakeAgent } from '../../src/agents/intake-agent';
import { SessionService } from '../../src/agents/session-service';

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

function createAgentService() {
  const llmClient = {
    classify: vi.fn(),
    chat: vi.fn().mockResolvedValue(
      JSON.stringify({
        clarification_questions: [
          {
            question: '机器人应该在什么时候开始执行？',
            options: ['检测到手势时自动开始', '通过 webhook 触发'],
            priority: 1,
            context: 'trigger',
          },
        ],
      })
    ),
  } as any;

  const sessionService = new SessionService();
  const intakeAgent = new IntakeAgent(
    TEST_CONFIG,
    llmClient,
    {} as any,
    new HardwareService(),
    sessionService,
    HARDWARE_COMPONENTS
  );

  return {
    agentService: new AgentService(intakeAgent, sessionService),
    sessionService,
  };
}

function extractCategories(workflow: { nodes: Array<Record<string, unknown>> }): string[] {
  return workflow.nodes
    .map((node) => {
      const notes = node.notes;
      if (!notes || typeof notes !== 'object') {
        return '';
      }
      const category = (notes as Record<string, unknown>).category;
      return typeof category === 'string' ? category : '';
    })
    .filter(Boolean);
}

describe('Agent End-to-End Workflow', () => {
  it('keeps orchestrator state across rounds and confirms an RPS workflow', async () => {
    const { agentService, sessionService } = createAgentService();

    const first = await agentService.chat('我想做一个石头剪刀布机器人');
    expect(first.response.type).toBe('guidance');
    expect(sessionService.getOrchestratorState(first.sessionId)?.pendingQuestions.length).toBeGreaterThan(0);

    const second = await agentService.chat(
      '检测到手势时自动开始，输了就重新开始并播报结果',
      first.sessionId
    );
    expect(second.response.type).toBe('summary_ready');
    if (second.response.type !== 'summary_ready') {
      throw new Error('Expected summary_ready response');
    }
    expect(second.response.metadata?.showConfirmBuildButton).toBe(true);

    const orchestratorState = sessionService.getOrchestratorState(first.sessionId);
    expect(orchestratorState?.userIntent).toContain('我想做一个石头剪刀布机器人');
    expect(orchestratorState?.userIntent).toContain('检测到手势时自动开始');
    expect(orchestratorState?.canProceed).toBe(true);

    const confirm = await agentService.confirm(first.sessionId);
    expect(confirm.response.type).toBe('workflow_ready');
    if (confirm.response.type !== 'workflow_ready') {
      throw new Error('Expected workflow_ready response');
    }

    const categories = extractCategories(confirm.response.workflow);
    expect(categories).toContain('CAM');
    expect(categories).toContain('HAND');
    expect(categories).toContain('SPEAKER');
    expect(sessionService.getSession(first.sessionId)?.phase).toBe('deploying');
  });
});
