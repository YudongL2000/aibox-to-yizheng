/**
 * [INPUT]: 依赖 architect-system 与 workflow-architect token-budget 工具
 * [OUTPUT]: 验证 Refactor-4 的工具/系统 prompt/历史压缩预算
 * [POS]: unit/agents 的 progressive disclosure 护栏测试，锁住 Refactor-4 量化 token 指标
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it } from 'vitest';
import { HARDWARE_COMPONENTS } from '../../../src/agents/hardware-components';
import { ALLOWED_NODE_TYPES } from '../../../src/agents/allowed-node-types';
import { buildArchitectSystemPrompt } from '../../../src/agents/prompts/architect-system';
import { selectPromptVariant } from '../../../src/agents/prompts/prompt-variants';
import { buildArchitectMessages, buildArchitectToolDescriptions } from '../../../src/agents/workflow-architect/prompt-context';
import {
  ARCHITECT_HISTORY_TOKEN_BUDGET,
  ARCHITECT_SYSTEM_PROMPT_TOKEN_BUDGET,
  ARCHITECT_TOOL_TOKEN_BUDGET,
  estimateMessagesTokenCount,
  estimateTokenCount,
} from '../../../src/agents/workflow-architect/token-budget';

describe('workflow architect token budgets', () => {
  it('keeps initial tool descriptions under the refactor-4 budget', () => {
    const toolPrompt = buildArchitectToolDescriptions().join('\n');

    expect(estimateTokenCount(toolPrompt)).toBeLessThanOrEqual(ARCHITECT_TOOL_TOKEN_BUDGET);
  });

  it('keeps the architect system prompt under the refactor-4 budget', () => {
    const prompt = buildArchitectSystemPrompt(
      HARDWARE_COMPONENTS,
      buildArchitectToolDescriptions(),
      ALLOWED_NODE_TYPES,
      selectPromptVariant('baseline', '石头剪刀布')
    );

    expect(estimateTokenCount(prompt)).toBeLessThanOrEqual(ARCHITECT_SYSTEM_PROMPT_TOKEN_BUDGET);
  });

  it('compresses 10-turn history under the refactor-4 budget', () => {
    const history = Array.from({ length: 10 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content:
        '这是一段用于测试历史压缩预算的长消息，包含场景、澄清、配置、节点说明和异常反馈。'.repeat(10),
    }));

    const messages = buildArchitectMessages(
      history,
      'system prompt',
      '请继续生成工作流',
      ['缺少执行器', '表达式格式错误']
    );

    expect(estimateMessagesTokenCount(messages)).toBeLessThanOrEqual(ARCHITECT_HISTORY_TOKEN_BUDGET);
  });
});
