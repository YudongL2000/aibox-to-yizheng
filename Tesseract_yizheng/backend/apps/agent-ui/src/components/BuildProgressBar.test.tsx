/**
 * [INPUT]: 依赖 BuildProgressBar 组件
 * [OUTPUT]: 验证 Refactor-3 三阶段进度文案与状态展示
 * [POS]: agent-ui 的构建进度组件测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BuildProgressBar } from './BuildProgressBar';

describe('BuildProgressBar', () => {
  it('renders steps and progress hint', () => {
    render(<BuildProgressBar status={2} />);

    expect(screen.getByText('需求收敛')).toBeInTheDocument();
    expect(screen.getByText('工作流生成')).toBeInTheDocument();
    expect(screen.getByText('设备配置')).toBeInTheDocument();
    expect(screen.getByText('工作流已生成，可继续创建并配置设备。')).toBeInTheDocument();
  });

  it('hides progress hint when complete', () => {
    render(<BuildProgressBar status={3} />);

    expect(screen.queryByText('工作流已生成，可继续创建并配置设备。')).toBeNull();
  });
});
