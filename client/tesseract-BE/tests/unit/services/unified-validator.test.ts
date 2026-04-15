/**
 * [INPUT]: 依赖 UnifiedValidator 与 workflow/expression 校验契约
 * [OUTPUT]: 验证 unified-validator 的单入口分流与处置分类
 * [POS]: tests/unit/services 的 Refactor-4 验证脊柱守护测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it, vi } from 'vitest';
import { UnifiedValidator } from '../../../src/services/unified-validator';

describe('UnifiedValidator', () => {
  it('classifies fixable workflow issues as autoFixable', async () => {
    const validator = new UnifiedValidator({} as any, {
      workflowValidator: {
        validateWorkflow: vi.fn().mockResolvedValue({
          valid: false,
          errors: [{ type: 'error', message: '工作流缺少触发节点' }],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: 0,
            enabledNodes: 0,
            triggerNodes: 0,
            validConnections: 0,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        }),
      },
    });

    const result = await validator.validate({
      kind: 'workflow',
      workflow: { name: 'Demo', nodes: [], connections: {} },
    });

    expect(result.kind).toBe('workflow');
    if (result.kind !== 'workflow') {
      throw new Error('Expected workflow validation result');
    }
    expect(result.disposition).toBe('autoFixable');
  });

  it('classifies credential-like workflow issues as needsUser', async () => {
    const validator = new UnifiedValidator({} as any, {
      workflowValidator: {
        validateWorkflow: vi.fn().mockResolvedValue({
          valid: false,
          errors: [{ type: 'error', message: '缺少 API key credential' }],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: 0,
            enabledNodes: 0,
            triggerNodes: 0,
            validConnections: 0,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        }),
      },
    });

    const result = await validator.validate({
      kind: 'workflow',
      workflow: { name: 'Demo', nodes: [], connections: {} },
    });

    expect(result.kind).toBe('workflow');
    if (result.kind !== 'workflow') {
      throw new Error('Expected workflow validation result');
    }
    expect(result.disposition).toBe('needsUser');
  });

  it('classifies workflow issues with explicit fixes as autoFixable', async () => {
    const validator = new UnifiedValidator({} as any, {
      workflowValidator: {
        validateWorkflow: vi.fn().mockResolvedValue({
          valid: false,
          errors: [{
            type: 'error',
            message: 'Code cannot be empty',
            code: 'CODE_NODE_EMPTY',
            fix: 'Add your code logic',
          }],
          warnings: [],
          suggestions: [],
          statistics: {
            totalNodes: 1,
            enabledNodes: 1,
            triggerNodes: 1,
            validConnections: 0,
            invalidConnections: 0,
            expressionsValidated: 0,
          },
        }),
      },
    });

    const result = await validator.validate({
      kind: 'workflow',
      workflow: { name: 'Demo', nodes: [], connections: {} },
    });

    expect(result.kind).toBe('workflow');
    if (result.kind !== 'workflow') {
      throw new Error('Expected workflow validation result');
    }
    expect(result.disposition).toBe('autoFixable');
  });

  it('provides a single entry point for expression validation', async () => {
    const validator = new UnifiedValidator({} as any, {
      workflowValidator: {
        validateWorkflow: vi.fn(),
      },
    });

    const result = await validator.validate({
      kind: 'expression',
      expression: '{{ $node["Missing"].json.value }}',
      context: {
        availableNodes: ['Webhook'],
        hasInputData: true,
      },
    });

    expect(result.kind).toBe('expression');
    if (result.kind !== 'expression') {
      throw new Error('Expected expression validation result');
    }
    expect(result.valid).toBe(false);
    expect(result.disposition).toBe('needsModel');
  });
});
