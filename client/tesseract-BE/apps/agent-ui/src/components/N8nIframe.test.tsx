/**
 * [INPUT]: 依赖 N8nIframe 组件与 Testing Library 事件
 * [OUTPUT]: 验证 n8n 预览按需加载与工作流上下文自动激活
 * [POS]: agent-ui 的 n8n 观察窗测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { N8nIframe } from './N8nIframe';

describe('N8nIframe', () => {
  it('stays idle until explicitly loaded', () => {
    render(<N8nIframe refreshToken={0} />);

    expect(screen.getByText('聊天和工作流生成不依赖 n8n 页面初始化。需要查看拓扑时再加载，避免把 5678 的 telemetry 噪音带进当前调试会话。')).toBeInTheDocument();
    expect(screen.queryByTitle('n8n')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '加载 n8n 预览' }));

    expect(screen.getByTitle('n8n')).toBeInTheDocument();
  });

  it('auto-loads when workflow context exists', () => {
    render(
      <N8nIframe
        refreshToken={1}
        workflowId="wf-123"
        workflowUrl="http://localhost:5678/workflow/wf-123"
      />
    );

    expect(screen.getByTitle('n8n')).toBeInTheDocument();
    expect(screen.getByText('当前工作流 wf-123')).toBeInTheDocument();
  });
});
