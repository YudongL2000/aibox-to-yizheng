/**
 * [INPUT]: 依赖 Header 组件与运行时状态类型
 * [OUTPUT]: 对外提供顶部状态栏的单元测试
 * [POS]: agent-ui 的头部状态测试，验证链路状态与 LLM 诊断展示
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Header } from './Header';

describe('Header', () => {
  it('renders runtime diagnostics summary', () => {
    render(
      <Header
        status="open"
        onRestart={vi.fn()}
        runtimeStatus={{
          llm: {
            state: 'degraded',
            code: 'timeout',
            enabled: true,
            provider: 'openai',
            model: 'test-model',
            baseUrl: 'https://example.com/v1',
            message: 'LLM 网关在 5000ms 内未响应',
            checkedAt: new Date().toISOString(),
            latencyMs: 5000,
            probeTimeoutMs: 5000,
          },
        }}
      />
    );

    expect(screen.getByText('LLM_DEGRADED')).toBeInTheDocument();
    expect(screen.getByTitle('LLM 网关在 5000ms 内未响应')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM_ONLINE')).toBeInTheDocument();
  });
});
