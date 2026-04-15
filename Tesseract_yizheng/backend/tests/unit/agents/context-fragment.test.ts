/**
 * [INPUT]: 依赖 context-fragment 与 architect-system 的动态 feedback fragment 构造器
 * [OUTPUT]: 锁住 Refactor-5 fragment diffing 的最小语义：只发 delta、可更新 feedback 切片
 * [POS]: tests/unit/agents 的上下文工程护栏测试，服务 TurnContext diffing
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it } from 'vitest';
import { buildValidationFeedbackFragment } from '../../../src/agents/prompts/architect-system';
import {
  assembleChangedFragments,
  createFragment,
  updateFragmentInList,
} from '../../../src/agents/prompts/context-fragment';

describe('context fragment diffing', () => {
  it('only assembles changed fragments after the first round', () => {
    const fragments = [
      createFragment('role', '角色说明', 1),
      createFragment('entity_bindings', '老刘 -> 中指', 2),
    ];
    const result = assembleChangedFragments(
      fragments,
      new Map([
        ['role', 1],
        ['entity_bindings', 1],
      ])
    );

    expect(result).toContain('<ENTITY_BINDINGS>');
    expect(result).not.toContain('<ROLE>');
  });

  it('updates feedback fragment in-place and appends when absent', () => {
    const fragments = [createFragment('role', '角色说明', 1)];

    updateFragmentInList(
      fragments,
      buildValidationFeedbackFragment(['缺少 speaker 节点'], 1)
    );
    updateFragmentInList(
      fragments,
      buildValidationFeedbackFragment(['缺少 speaker 节点', 'notes 不完整'], 2)
    );

    expect(fragments).toHaveLength(2);
    expect(fragments[1].id).toBe('validation_feedback');
    expect(fragments[1].version).toBe(2);
    expect(fragments[1].content).toContain('notes 不完整');
  });
});
