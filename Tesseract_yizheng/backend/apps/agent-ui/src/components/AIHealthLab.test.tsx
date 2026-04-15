/**
 * [INPUT]: 依赖 AIHealthLab 组件与运行时状态类型
 * [OUTPUT]: 对外提供 AI 健康测试面板的单元测试
 * [POS]: agent-ui 的运行时调试组件测试，验证状态展示、刷新入口与调参说明
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AIHealthLab } from './AIHealthLab';

describe('AIHealthLab', () => {
  it('renders runtime details and timeout guidance', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);

    render(
      <AIHealthLab
        onRefresh={onRefresh}
        runtimeStatus={{
          llm: {
            state: 'degraded',
            code: 'timeout',
            enabled: true,
            provider: 'openai',
            model: 'claude-haiku-4-5',
            baseUrl: 'https://example.com/v1',
            message: 'LLM 网关在 5000ms 内未响应',
            checkedAt: '2026-03-06T08:16:17.992Z',
            latencyMs: 5000,
            probeTimeoutMs: 5000,
          },
        }}
      />
    );

    expect(screen.getByText('AI Health Lab')).toBeInTheDocument();
    expect(screen.getAllByText('LLM 网关在 5000ms 内未响应')).toHaveLength(2);
    expect(screen.getByText('timeout 5000ms')).toBeInTheDocument();
    expect(screen.getByText('AI 健康探测超时单独由 `AGENT_LLM_HEALTH_TIMEOUT_MS` 控制。')).toBeInTheDocument();
    expect(screen.getByText(/AGENT_LLM_HEALTH_TIMEOUT_MS=8000/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '折叠操作台' }));
    expect(screen.queryByText('AI 健康探测超时单独由 `AGENT_LLM_HEALTH_TIMEOUT_MS` 控制。')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '展开操作台' }));
    expect(screen.getByText('AI 健康探测超时单独由 `AGENT_LLM_HEALTH_TIMEOUT_MS` 控制。')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '重新探测' }));
    });
    expect(onRefresh).toHaveBeenCalled();
  });
});
