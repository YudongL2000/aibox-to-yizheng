/**
 * [INPUT]: 依赖 InteractionCard 组件与伪造结构化交互数据
 * [OUTPUT]: 验证交互卡片的选择、上传与 AI 推荐理由展示
 * [POS]: agent-ui 结构化交互卡片测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/* @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { InteractionCard } from './InteractionCard';

describe('InteractionCard', () => {
  it('submits selected single option', async () => {
    const onSubmit = vi.fn();
    const interaction = {
      id: 'i-1',
      mode: 'single' as const,
      field: 'tts_voice' as const,
      title: '请选择音色',
      options: [
        { label: '音色 a', value: 'a' },
        { label: '音色 b', value: 'b' },
      ],
    };

    render(<InteractionCard interaction={interaction} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /音色 a/ }));
    fireEvent.click(screen.getByRole('button', { name: '确认' }));

    expect(onSubmit).toHaveBeenCalledWith({ selected: ['a'], file: null });
  });

  it('requires image file before submit', () => {
    const onSubmit = vi.fn();
    const interaction = {
      id: 'i-2',
      mode: 'image' as const,
      field: 'face_profiles' as const,
      title: '上传人脸图片',
      options: [
        { label: '老刘', value: '老刘' },
        { label: '老王', value: '老王' },
      ],
    };

    const { container } = render(<InteractionCard interaction={interaction} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /老刘/ }));
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['demo'], 'face.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: '确认' }));

    expect(onSubmit).toHaveBeenCalledWith({ selected: ['老刘'], file });
  });

  it('renders ai recommendation reason for options', () => {
    render(
      <InteractionCard
        interaction={{
          id: 'i-3',
          mode: 'single',
          field: 'clarification_action',
          title: '下一步可以直接补充这些内容',
          options: [
            {
              label: '反馈: 用语音播报结果',
              value: '用语音播报结果',
              reason: '前面已经明确了视觉触发和底盘动作，现在只差反馈方式。',
            },
          ],
        }}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText('反馈: 用语音播报结果')).toBeInTheDocument();
    expect(screen.getByText('前面已经明确了视觉触发和底盘动作，现在只差反馈方式。')).toBeInTheDocument();
  });
});
