/**
 * [INPUT]: 依赖 ChatInterface 组件与伪造消息状态
 * [OUTPUT]: 验证摘要确认、工作流创建、配置调试面板、澄清问题、AI 推荐动作与消息内流式过程
 * [POS]: agent-ui 的主交互面板测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from './ChatInterface';


describe('ChatInterface', () => {
  it('renders workflow button and triggers handler', () => {
    const onCreateWorkflow = vi.fn().mockResolvedValue(null);
    const onConfirmWorkflow = vi.fn().mockResolvedValue(undefined);
    const messages = [
      {
        id: '1',
        role: 'assistant' as const,
        text: '准备好了',
        workflow: {
          name: 'Demo',
          nodes: [],
          connections: {},
        },
      },
    ];

    render(
      <ChatInterface
        messages={messages}
        onSend={() => undefined}
        onCreateWorkflow={onCreateWorkflow}
        onConfirmWorkflow={onConfirmWorkflow}
        onConfirmNode={vi.fn()}
        onSyncConfigStep={vi.fn()}
        buildStatus={0}
        status="open"
        isBusy={false}
      />
    );

    const button = screen.getByRole('button', { name: '创建工作流' });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onCreateWorkflow).toHaveBeenCalled();
  });

  it('triggers confirm handler from summary response', () => {
    const onConfirmWorkflow = vi.fn().mockResolvedValue(undefined);
    const messages = [
      {
        id: 'summary-1',
        role: 'assistant' as const,
        text: '已整理逻辑',
        responseType: 'summary_ready' as const,
        blueprint: {
          intentSummary: 'demo',
          triggers: [{ type: 'webhook' as const, config: {} }],
          logic: [{ type: 'if' as const, config: {} }],
          executors: [{ type: 'set' as const, config: {} }],
          missingFields: [],
        },
      },
    ];

    render(
      <ChatInterface
        messages={messages}
        onSend={() => undefined}
        onCreateWorkflow={vi.fn()}
        onConfirmWorkflow={onConfirmWorkflow}
        onConfirmNode={vi.fn()}
        onSyncConfigStep={vi.fn()}
        buildStatus={0}
        status="open"
        isBusy={false}
      />
    );

    expect(screen.getByText('触发器: Webhook')).toBeInTheDocument();
    expect(screen.getByText('逻辑: 条件判断')).toBeInTheDocument();

    const button = screen.getByRole('button', { name: '确认构建' });
    fireEvent.click(button);
    expect(onConfirmWorkflow).toHaveBeenCalled();
  });

  it('renders runtime panel and submits config draft', () => {
    const onConfirmNode = vi.fn().mockResolvedValue(undefined);
    const onSyncConfigStep = vi.fn().mockResolvedValue(undefined);

    render(
      <ChatInterface
        messages={[
          {
            id: 'config-1',
            role: 'assistant' as const,
            text: '请先完成设备配置',
            responseType: 'hot_plugging' as const,
            currentNode: {
              name: 'speaker_text_to_speech_1',
              type: 'n8n-nodes-base.httpRequest' as const,
              index: 1,
              status: 'pending' as const,
              displayName: '语音播报',
              title: '欢迎语音',
              subtitle: '人脸识别后的播报节点',
              category: 'TTS',
              configFields: {
                needsTopology: false,
                needsDeviceId: false,
                needsTtsInput: true,
                needsExecuteEmoji: false,
                subKeys: ['audio_name'],
              },
              configValues: {
                TTS_input: '欢迎来到 Tesseract',
                sub: {
                  audio_name: 'welcome_audio',
                },
              },
            },
            progress: { completed: 1, total: 3 },
            metadata: {
              workflowId: 'wf-123',
              showConfirmButton: true,
            },
          },
        ]}
        onSend={() => undefined}
        onCreateWorkflow={vi.fn()}
        onConfirmWorkflow={vi.fn()}
        onConfirmNode={onConfirmNode}
        onSyncConfigStep={onSyncConfigStep}
        buildStatus={3}
        status="open"
        isBusy={false}
        sessionId="session-123"
        lastResponseType="hot_plugging"
        workflowId="wf-123"
        currentConfigNode={{
          name: 'speaker_text_to_speech_1',
          type: 'n8n-nodes-base.httpRequest' as const,
          index: 1,
          status: 'pending' as const,
          displayName: '语音播报',
          title: '欢迎语音',
          subtitle: '人脸识别后的播报节点',
        }}
        configProgress={{ completed: 1, total: 3, percentage: 33 }}
      />
    );

    expect(screen.getByText('session session-')).toBeInTheDocument();
    expect(screen.getByText('workflow wf-123')).toBeInTheDocument();
    expect(screen.getByText('Current Config Node')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '同步当前配置' }));
    expect(onSyncConfigStep).toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('TTS_input'), {
      target: { value: '欢迎回到测试台' },
    });
    fireEvent.change(screen.getByPlaceholderText('sub.audio_name'), {
      target: { value: 'updated_audio' },
    });
    fireEvent.click(screen.getByRole('button', { name: '已拼装完毕' }));

    expect(onConfirmNode).toHaveBeenCalledWith({
      TTS_input: '欢迎回到测试台',
      sub: {
        audio_name: 'updated_audio',
      },
    });
  });

  it('shows busy hint while waiting for backend response', () => {
    render(
      <ChatInterface
        messages={[]}
        onSend={() => undefined}
        onCreateWorkflow={vi.fn()}
        onConfirmWorkflow={vi.fn()}
        onConfirmNode={vi.fn()}
        onSyncConfigStep={vi.fn()}
        buildStatus={0}
        status="open"
        isBusy
      />
    );

    expect(screen.getByText('正在等待后端响应。当前链路默认会在约 8 秒内回落到澄清提示，不会无限挂起。')).toBeInTheDocument();
  });

  it('shows runtime warning when llm is degraded', () => {
    render(
      <ChatInterface
        messages={[]}
        onSend={() => undefined}
        onCreateWorkflow={vi.fn()}
        onConfirmWorkflow={vi.fn()}
        onConfirmNode={vi.fn()}
        onSyncConfigStep={vi.fn()}
        buildStatus={0}
        status="open"
        isBusy={false}
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

    expect(screen.getByText('LLM 网关在 5000ms 内未响应')).toBeInTheDocument();
    expect(screen.getByText('最近一次探测耗时 5000ms')).toBeInTheDocument();
  });

  it('renders streamed trace events below the anchored user message', () => {
    render(
      <ChatInterface
        messages={[
          {
            id: 'user-1',
            role: 'user' as const,
            text: '帮我做个机器人',
          },
        ]}
        onSend={() => undefined}
        onCreateWorkflow={vi.fn()}
        onConfirmWorkflow={vi.fn()}
        onConfirmNode={vi.fn()}
        onSyncConfigStep={vi.fn()}
        buildStatus={0}
        status="open"
        isBusy
        activeTraceAnchorId="user-1"
        traceEvents={[
          {
            id: 'trace-1',
            sessionId: 'session-1',
            sequence: 1,
            timestamp: new Date().toISOString(),
            source: 'reflection_engine',
            phase: 'reflection',
            kind: 'phase',
            status: 'started',
            title: 'ReflectionEngine 开始反思',
            detail: '候选能力 2 个',
          },
          {
            id: 'trace-2',
            sessionId: 'session-1',
            sequence: 2,
            timestamp: new Date().toISOString(),
            source: 'workflow_validator',
            phase: 'validation',
            kind: 'tool',
            status: 'completed',
            title: '工具 validate_workflow 通过',
            detail: '第 1 轮校验成功',
            data: {
              recognizedRequirements: ['触发: 看到我', '动作: 原地转圈'],
              suggestedActions: ['反馈: 用语音播报结果'],
            },
          },
        ]}
      />
    );

    expect(screen.getByText('这里展示本次交互的反思、工具调用与回复准备过程。')).toBeInTheDocument();
    expect(screen.getByText('live')).toBeInTheDocument();
    expect(screen.getByText('ReflectionEngine 开始反思')).toBeInTheDocument();
    expect(screen.getByText('工具 validate_workflow 通过')).toBeInTheDocument();
    expect(screen.getByText('触发: 看到我 / 动作: 原地转圈')).toBeInTheDocument();
    expect(screen.getByText('反馈: 用语音播报结果')).toBeInTheDocument();
  });

  it('shows clarification_questions in structured form', () => {
    render(
      <ChatInterface
        messages={[
          {
            id: 'assistant-1',
            role: 'assistant' as const,
            text: '我还没有匹配到足够明确的硬件能力。',
            responseType: 'guidance' as const,
            clarificationQuestions: [
              '工作流应该在什么事件发生时触发？',
              '触发后机器人需要执行什么具体动作？',
            ],
          },
        ]}
        onSend={() => undefined}
        onCreateWorkflow={vi.fn()}
        onConfirmWorkflow={vi.fn()}
        onConfirmNode={vi.fn()}
        onSyncConfigStep={vi.fn()}
        buildStatus={0}
        status="open"
        isBusy={false}
      />
    );

    expect(screen.getByText('clarification_questions')).toBeInTheDocument();
    expect(screen.getByText('工作流应该在什么事件发生时触发？')).toBeInTheDocument();
    expect(screen.getByText('触发后机器人需要执行什么具体动作？')).toBeInTheDocument();
  });

  it('renders clarification actions as options without repeating the question list', async () => {
    const onSend = vi.fn();

    render(
      <ChatInterface
        messages={[
          {
            id: 'assistant-2',
            role: 'assistant' as const,
            text: '我还没有匹配到足够明确的硬件能力。\n当前还缺：触发方式、执行动作。\n先从下面选一个最接近的下一步，我会继续收敛需求；也可以直接继续输入。',
            responseType: 'guidance' as const,
            clarificationQuestions: [
              '工作流应该在什么事件发生时触发？',
              '触发后机器人需要执行什么具体动作？',
            ],
            interaction: {
              id: 'clarification_trigger_action',
              mode: 'single' as const,
              field: 'clarification_action' as const,
              title: '下一步可以直接补充这些内容',
              description: '点一个最接近的选项，我会继续收敛需求；也可以忽略选项直接输入。',
              options: [
                {
                  label: '触发: 看到我就触发',
                  value: '看到我就触发',
                  reason: '这能把视觉触发方式固定下来。',
                },
                {
                  label: '动作: 播放欢迎语音',
                  value: '播放欢迎语音',
                  reason: '如果你想让机器人有明确输出，这是最直接的动作补充。',
                },
              ],
              minSelections: 1,
              maxSelections: 1,
            },
          },
        ]}
        onSend={onSend}
        onCreateWorkflow={vi.fn()}
        onConfirmWorkflow={vi.fn()}
        onConfirmNode={vi.fn()}
        onSyncConfigStep={vi.fn()}
        buildStatus={0}
        status="open"
        isBusy={false}
      />
    );

    expect(screen.getByText('下一步可以直接补充这些内容')).toBeInTheDocument();
    expect(screen.getByText('这能把视觉触发方式固定下来。')).toBeInTheDocument();
    expect(screen.queryByText('clarification_questions')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /触发: 看到我就触发/ }));
    fireEvent.click(screen.getByRole('button', { name: '确认' }));

    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith('看到我就触发');
    });
  });
});
