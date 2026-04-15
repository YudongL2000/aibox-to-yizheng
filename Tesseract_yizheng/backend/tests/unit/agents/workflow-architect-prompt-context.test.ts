/**
 * [INPUT]: 依赖 workflow-architect/prompt-context 的上下文裁剪函数
 * [OUTPUT]: 验证历史压缩与节点上下文摘要符合 progressive disclosure 预期
 * [POS]: tests/unit/agents 的 WorkflowArchitect 上下文代理护栏测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it } from 'vitest';
import {
  buildArchitectMessages,
  buildNodeContextSummary,
  buildArchitectToolDescriptions,
} from '../../../src/agents/workflow-architect/prompt-context';

describe('workflow-architect prompt context', () => {
  it('compresses older conversation turns into a summary message', () => {
    const messages = buildArchitectMessages(
      [
        { role: 'user', content: '第一轮需求' },
        { role: 'assistant', content: '第一轮回答' },
        { role: 'user', content: '第二轮需求' },
        { role: 'assistant', content: '第二轮回答' },
        { role: 'user', content: '第三轮需求' },
      ],
      'system',
      '最终用户需求',
      []
    );

    expect(messages[1]?.content).toContain('较早上下文摘要');
    expect(messages[messages.length - 1]?.content).toBe('最终用户需求');
  });

  it('summarizes node context down to required property names', () => {
    const summary = buildNodeContextSummary([
      {
        nodeType: 'n8n-nodes-base.httpRequest',
        displayName: 'HTTP Request',
        defaultVersion: 4.3,
        properties: [
          { name: 'method', required: true },
          { name: 'url', required: true },
          { name: 'authentication' },
          { name: 'headers' },
          { name: 'body' },
          { name: 'timeout' },
          { name: 'responseFormat' },
        ],
      },
    ]);

    expect(summary).toContain('"requiredProperties"');
    expect(summary).toContain('method');
    expect(summary).toContain('url');
    expect(summary).not.toContain('responseFormat');
  });

  it('returns a compact tool summary list', () => {
    expect(buildArchitectToolDescriptions()).toEqual([
      'search_nodes: 搜索候选节点',
      'get_node: 获取 essentials 与 typeVersion',
      'validate_workflow: 校验工作流 JSON',
      'autofix_workflow: 自动修复常见错误',
    ]);
  });
});
