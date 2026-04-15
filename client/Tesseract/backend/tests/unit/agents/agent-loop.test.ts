/**
 * [INPUT]: 依赖 AgentLoop 与 agents/types 的工作流定义
 * [OUTPUT]: 验证 AgentLoop 的确认闭环分流、自动修复与停止条件
 * [POS]: tests/unit/agents 的 Refactor-4 闭环守护测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it, vi } from 'vitest';
import { AgentLoop } from '../../../src/agents/agent-loop';
import type { WorkflowDefinition } from '../../../src/agents/types';

function createWorkflow(name = 'Demo'): WorkflowDefinition {
  return {
    name,
    nodes: [
      {
        id: 'trigger-1',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        position: [0, 0],
        parameters: {},
      },
      {
        id: 'set-1',
        name: 'Set',
        type: 'n8n-nodes-base.set',
        position: [200, 0],
        parameters: {},
      },
    ],
    connections: {
      Webhook: {
        main: [[{ node: 'Set', type: 'main', index: 0 }]],
      },
    },
  };
}

describe('AgentLoop', () => {
  it('returns valid when external validator passes', async () => {
    const loop = new AgentLoop(3);
    const workflow = createWorkflow();

    const result = await loop.run({
      compose: async () => workflow,
      normalize: (candidate) => candidate,
      validateStructure: () => [],
      autofixStructure: (candidate) => candidate,
      isSameWorkflow: (left, right) => JSON.stringify(left) === JSON.stringify(right),
      emitTrace: vi.fn(),
      workflowValidator: {
        validateWorkflow: vi.fn().mockResolvedValue({
          isValid: true,
          errors: [],
        }),
      },
    });

    expect(result.valid).toBe(true);
    expect(result.disposition).toBe('valid');
    expect(result.iterations).toBe(1);
  });

  it('retries autoFixable validation failures with autofixWorkflow', async () => {
    const loop = new AgentLoop(3);
    const workflow = createWorkflow();
    const fixedWorkflow = createWorkflow('Fixed');

    const validateWorkflow = vi
      .fn()
      .mockResolvedValueOnce({
        isValid: false,
        disposition: 'autoFixable',
        errors: [{ message: '工作流缺少触发节点' }],
      })
      .mockResolvedValueOnce({
        isValid: true,
        errors: [],
      });

    const result = await loop.run({
      compose: async () => workflow,
      normalize: (candidate) => candidate,
      validateStructure: () => [],
      autofixStructure: (candidate) => candidate,
      isSameWorkflow: (left, right) => JSON.stringify(left) === JSON.stringify(right),
      emitTrace: vi.fn(),
      workflowValidator: {
        validateWorkflow,
        autofixWorkflow: vi.fn().mockResolvedValue(fixedWorkflow),
      },
    });

    expect(result.valid).toBe(true);
    expect(validateWorkflow).toHaveBeenCalledTimes(2);
    expect(result.iterations).toBe(2);
  });

  it('stops early when validation requires user input', async () => {
    const loop = new AgentLoop(3);
    const workflow = createWorkflow();

    const result = await loop.run({
      compose: async () => workflow,
      normalize: (candidate) => candidate,
      validateStructure: () => [],
      autofixStructure: (candidate) => candidate,
      isSameWorkflow: (left, right) => JSON.stringify(left) === JSON.stringify(right),
      emitTrace: vi.fn(),
      workflowValidator: {
        validateWorkflow: vi.fn().mockResolvedValue({
          isValid: false,
          disposition: 'needsUser',
          errors: [{ message: '缺少设备拓扑配置' }],
        }),
        autofixWorkflow: vi.fn(),
      },
    });

    expect(result.valid).toBe(false);
    expect(result.disposition).toBe('needsUser');
    expect(result.errors).toContain('缺少设备拓扑配置');
  });
});
