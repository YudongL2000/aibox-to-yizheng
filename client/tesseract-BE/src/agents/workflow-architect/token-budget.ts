/**
 * [INPUT]: 依赖 llm-client 的 ChatMessage 协议
 * [OUTPUT]: 对外提供 Prompt/Message 的近似 token 估算与 budget 判定工具
 * [POS]: workflow-architect 的预算工具层，给 progressive disclosure 提供可测试的体积护栏
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { ChatMessage } from '../llm-client';

export const APPROX_CHARS_PER_TOKEN = 4;
export const ARCHITECT_SYSTEM_PROMPT_TOKEN_BUDGET = 4000;
export const ARCHITECT_TOOL_TOKEN_BUDGET = 500;
export const ARCHITECT_HISTORY_TOKEN_BUDGET = 8000;

export function estimateTokenCount(content: string): number {
  if (!content) {
    return 0;
  }
  return Math.ceil(content.length / APPROX_CHARS_PER_TOKEN);
}

export function estimateMessagesTokenCount(messages: ChatMessage[]): number {
  return messages.reduce((total, message) => {
    return total + estimateTokenCount(message.content) + 4;
  }, 0);
}

export function isWithinTokenBudget(content: string, budget: number): boolean {
  return estimateTokenCount(content) <= budget;
}
