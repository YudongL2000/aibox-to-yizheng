/**
 * [INPUT]: 依赖 llm-client 的 ChatMessage 与 agents/types 的 ConversationTurn
 * [OUTPUT]: 对外提供 WorkflowArchitect 的工具摘要、历史压缩与节点上下文摘要构建函数
 * [POS]: workflow-architect 的上下文代理层，负责 progressive disclosure 的 prompt 输入裁剪
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { ChatMessage } from '../llm-client';
import type { ConversationTurn } from '../types';

const RECENT_HISTORY_TURNS = 4;
const MAX_PROPERTY_COUNT = 6;
const MAX_SUMMARY_LINE_LENGTH = 72;

type NodePropertySummary = {
  name?: string;
  displayName?: string;
  required?: boolean;
};

type NodeDetailSummary = {
  nodeType: string;
  displayName: string;
  defaultVersion?: number;
  properties?: NodePropertySummary[];
};

export function buildArchitectToolDescriptions(): string[] {
  return [
    'search_nodes: 搜索候选节点',
    'get_node: 获取 essentials 与 typeVersion',
    'validate_workflow: 校验工作流 JSON',
    'autofix_workflow: 自动修复常见错误',
  ];
}

export function buildArchitectMessages(
  history: ConversationTurn[],
  systemPrompt: string,
  userMessage: string,
  errors: string[]
): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];
  const { summary, recentTurns } = splitConversationHistory(history);

  if (summary) {
    messages.push({
      role: 'assistant',
      content: `较早上下文摘要:\n${summary}`,
    });
  }

  recentTurns.forEach((turn) => {
    messages.push({ role: turn.role, content: turn.content });
  });

  if (errors.length > 0) {
    messages.push({
      role: 'assistant',
      content: `上一次验证失败，错误如下：${errors.join('；')}。请修正后重新输出。`,
    });
  }

  messages.push({ role: 'user', content: userMessage });
  return messages;
}

export function buildNodeContextSummary(details: Array<NodeDetailSummary | null>): string {
  return details
    .filter((detail): detail is NodeDetailSummary => Boolean(detail))
    .map((detail) =>
      JSON.stringify(
        {
          nodeType: detail.nodeType,
          displayName: detail.displayName,
          defaultVersion: detail.defaultVersion,
          requiredProperties: summarizeProperties(detail.properties ?? []),
        },
        null,
        2
      )
    )
    .join('\n');
}

function splitConversationHistory(history: ConversationTurn[]): {
  summary: string;
  recentTurns: ConversationTurn[];
} {
  if (history.length <= RECENT_HISTORY_TURNS) {
    return {
      summary: '',
      recentTurns: history,
    };
  }

  const pivot = history.length - RECENT_HISTORY_TURNS;
  return {
    summary: history
      .slice(0, pivot)
      .map((turn) => `- ${turn.role}: ${truncate(turn.content)}`)
      .join('\n'),
    recentTurns: history.slice(pivot),
  };
}

function summarizeProperties(properties: NodePropertySummary[]): string[] {
  const prioritized = [
    ...properties.filter((property) => property.required),
    ...properties.filter((property) => !property.required),
  ];

  return prioritized
    .map((property) => property.name ?? property.displayName ?? '')
    .filter(Boolean)
    .slice(0, MAX_PROPERTY_COUNT);
}

function truncate(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= MAX_SUMMARY_LINE_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, MAX_SUMMARY_LINE_LENGTH - 3)}...`;
}
