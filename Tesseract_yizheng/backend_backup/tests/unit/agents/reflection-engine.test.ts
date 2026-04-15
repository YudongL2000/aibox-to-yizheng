/**
 * [INPUT]: 依赖 ReflectionEngine、LLMClient mock 与规范 capability id 常量
 * [OUTPUT]: 验证 ReflectionEngine 的 AI 判定、policy guard 与澄清/拒绝兜底
 * [POS]: tests/unit/agents 的反思层核心回归，守住接受/澄清/拒绝决策边界
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it, vi } from 'vitest';
import { HARDWARE_CAPABILITY_IDS } from '../../../src/agents/hardware-capability-ids';
import { LLMClient } from '../../../src/agents/llm-client';
import { ReflectionEngine } from '../../../src/agents/reflection-engine';
import { ConversationTurn, HardwareCapability, Intent, NodeCategory } from '../../../src/agents/types';

function createCapability(id: string, category: NodeCategory): HardwareCapability {
  return {
    id,
    component: id.split('.')[0] ?? 'test',
    capability: id.split('.')[1] ?? 'capability',
    displayName: id,
    keywords: ['test'],
    nodeType: 'n8n-nodes-base.httpRequest',
    category,
    apiEndpoint: {
      url: `http://localhost/${id}`,
      method: 'POST',
    },
    confidence: 1,
  };
}

function createHistory(userTurns: number): ConversationTurn[] {
  return Array.from({ length: userTurns }).map((_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: `turn-${index + 1}`,
  }));
}

function createLLMClient(response: string): {
  llmClient: LLMClient;
  chatMock: ReturnType<typeof vi.fn>;
} {
  const chatMock = vi.fn().mockResolvedValue(response);
  const llmClient: LLMClient = {
    classify: vi.fn().mockResolvedValue({
      category: 'custom',
      entities: {},
      confidence: 1,
    } as Intent),
    chat: chatMock,
  };
  return { llmClient, chatMock };
}

describe('ReflectionEngine', () => {
  it('falls back to conservative blocking categories without text hint inference', async () => {
    const { llmClient } = createLLMClient('invalid-json');
    const engine = new ReflectionEngine(llmClient);

    const result = await engine.reflect('我想做一个游戏机器人，需要条件分支', [], []);
    const categories = result.missing_info.map((item) => item.category);

    expect(categories).toContain('trigger');
    expect(categories).toContain('action');
    expect(result.decision).toBe('clarify_needed');
    expect(categories).not.toContain('condition');
    expect(categories).not.toContain('logic');
  });

  it('parses targeted clarification questions from llm json', async () => {
    const { llmClient, chatMock } = createLLMClient(
      JSON.stringify({
        decision: 'clarify_needed',
        reasoning_summary: '我已经知道用户想让机器人开始执行，但还需要补齐触发和反馈细节。',
        recognized_requirements: ['动作: 让机器人开始执行'],
        supported_capability_ids: [],
        missing_info: [
          {
            category: 'trigger',
            description: '触发条件还不明确。',
            priority: 1,
            blocking: true,
          },
          {
            category: 'feedback',
            description: '反馈方式还不明确。',
            priority: 2,
            blocking: false,
          },
        ],
        clarification_questions: [
          {
            question: '机器人应在什么时候开始执行？',
            options: ['检测到手势', '定时触发'],
            priority: 1,
            context: '触发条件',
          },
          {
            question: '需要通过语音还是屏幕反馈结果？',
            priority: 2,
            context: '反馈机制',
          },
        ],
        suggested_user_actions: [
          {
            label: '触发: 检测到手势时开始',
            value: '检测到手势时开始',
            reason: '这能直接补齐触发方式。',
            category: 'trigger',
          },
          {
            label: '反馈: 用语音播报结果',
            value: '用语音播报结果',
            reason: '这样用户能知道执行结果。',
            category: 'feedback',
          },
        ],
        out_of_scope_reasons: [],
      })
    );
    const engine = new ReflectionEngine(llmClient);

    const result = await engine.reflect('帮我做个机器人', [], []);

    expect(chatMock).toHaveBeenCalledTimes(1);
    expect(result.reasoning_summary).toContain('还需要补齐触发和反馈细节');
    expect(result.recognized_requirements).toContain('动作: 让机器人开始执行');
    expect(result.clarification_questions[0]?.question).toBe('机器人应在什么时候开始执行？');
    expect(result.clarification_questions[0]?.options).toEqual(['检测到手势', '定时触发']);
    expect(result.clarification_questions[0]?.priority).toBe(1);
    expect(result.suggested_user_actions[0]?.value).toBe('检测到手势时开始');
    expect(result.suggested_user_actions[0]?.reason).toContain('补齐触发方式');
  });

  it('falls back to template questions when llm output is invalid', async () => {
    const { llmClient } = createLLMClient('无法解析');
    const engine = new ReflectionEngine(llmClient);

    const result = await engine.reflect('帮我做个机器人', [], []);

    expect(result.clarification_questions.length).toBeGreaterThan(0);
    expect(result.clarification_questions[0]?.question).toContain('触发');
    expect(result.suggested_user_actions).toEqual([]);
  });

  it('still calls llm once when requirements already look complete in ai-first mode', async () => {
    const { llmClient, chatMock } = createLLMClient(JSON.stringify({
      decision: 'direct_accept',
      reasoning_summary: '触发、动作和反馈都已经明确，可以直接进入方案拆解。',
      recognized_requirements: ['触发: 检测到手势', '动作: 挥手', '反馈: 播报结果'],
      supported_capability_ids: [
        HARDWARE_CAPABILITY_IDS.YOLO_HAND.HAND_GESTURE_RECOGNITION,
        HARDWARE_CAPABILITY_IDS.HAND.GESTURE_EXECUTE,
        HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK,
      ],
      missing_info: [],
      clarification_questions: [],
      suggested_user_actions: [],
      out_of_scope_reasons: [],
      confidence: 0.95,
    }));
    const engine = new ReflectionEngine(llmClient);
    const capabilities = [
      createCapability(HARDWARE_CAPABILITY_IDS.YOLO_HAND.HAND_GESTURE_RECOGNITION, 'YOLO-HAND'),
      createCapability(HARDWARE_CAPABILITY_IDS.HAND.GESTURE_EXECUTE, 'HAND'),
      createCapability(HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK, 'SPEAKER'),
    ];

    const result = await engine.reflect(
      '当检测到手势时执行挥手并播报结果',
      capabilities,
      []
    );

    expect(result.missing_info).toEqual([]);
    expect(result.clarification_questions).toEqual([]);
    expect(result.complete).toBe(true);
    expect(chatMock).toHaveBeenCalledTimes(1);
  });

  it('accepts complete follow-car intent without forcing optional feedback clarification', async () => {
    const { llmClient, chatMock } = createLLMClient(JSON.stringify({
      decision: 'direct_accept',
      reasoning_summary: '视觉触发和底盘移动目标已经明确，反馈不是阻塞项。',
      recognized_requirements: ['触发: 看到我', '动作: 原地转个圈'],
      supported_capability_ids: [
        HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
        HARDWARE_CAPABILITY_IDS.WHEEL.MOVEMENT_EXECUTE,
      ],
      missing_info: [],
      clarification_questions: [],
      suggested_user_actions: [],
      out_of_scope_reasons: [],
      confidence: 0.92,
    }));
    const engine = new ReflectionEngine(llmClient);
    const capabilities = [
      createCapability(HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION, 'FACE-NET'),
      createCapability(HARDWARE_CAPABILITY_IDS.WHEEL.MOVEMENT_EXECUTE, 'WHEEL'),
    ];

    const result = await engine.reflect('看到我后原地转个圈', capabilities, []);

    expect(result.decision).toBe('direct_accept');
    expect(result.missing_info).toEqual([]);
    expect(result.clarification_questions).toEqual([]);
    expect(chatMock).toHaveBeenCalledTimes(1);
  });

  it('downgrades abstract chat goal to clarify_needed when llm over-accepts', async () => {
    const { llmClient } = createLLMClient(JSON.stringify({
      decision: 'direct_accept',
      reasoning_summary: '用户明确说对着它说话它回答，链路完整。',
      recognized_requirements: ['聊天'],
      supported_capability_ids: [
        HARDWARE_CAPABILITY_IDS.MICROPHONE.AUDIO_INPUT,
        HARDWARE_CAPABILITY_IDS.ASR.SPEECH_RECOGNITION,
        HARDWARE_CAPABILITY_IDS.LLM.PROMPT_REPLY,
        HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION,
        HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK,
      ],
      missing_info: [],
      clarification_questions: [],
      suggested_user_actions: [],
      out_of_scope_reasons: [],
      confidence: 0.93,
    }));
    const engine = new ReflectionEngine(llmClient);
    const capabilities = [
      createCapability(HARDWARE_CAPABILITY_IDS.MICROPHONE.AUDIO_INPUT, 'MIC'),
      createCapability(HARDWARE_CAPABILITY_IDS.ASR.SPEECH_RECOGNITION, 'ASR'),
      createCapability(HARDWARE_CAPABILITY_IDS.LLM.PROMPT_REPLY, 'LLM'),
      createCapability(HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION, 'TTS'),
      createCapability(HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK, 'SPEAKER'),
    ];

    const result = await engine.reflect('帮我做一个能陪我聊天的机器人。', capabilities, [
      { role: 'user', content: '帮我做一个能陪我聊天的机器人。' },
    ]);

    expect(result.decision).toBe('clarify_needed');
    expect(result.missing_info.map((item) => item.category)).toEqual(['trigger', 'action']);
    expect(result.supported_capability_ids).toEqual([]);
  });

  it('keeps chat case in clarify_needed when io is explicit but logic is not', async () => {
    const { llmClient } = createLLMClient(JSON.stringify({
      decision: 'direct_accept',
      reasoning_summary: '输入输出链路已闭环。',
      recognized_requirements: ['用户对着机器人说话', '机器人回答用户'],
      supported_capability_ids: [
        HARDWARE_CAPABILITY_IDS.MICROPHONE.AUDIO_INPUT,
        HARDWARE_CAPABILITY_IDS.ASR.SPEECH_RECOGNITION,
        HARDWARE_CAPABILITY_IDS.LLM.PROMPT_REPLY,
        HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION,
        HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK,
      ],
      missing_info: [],
      clarification_questions: [],
      suggested_user_actions: [],
      out_of_scope_reasons: [],
      confidence: 0.91,
    }));
    const engine = new ReflectionEngine(llmClient);
    const capabilities = [
      createCapability(HARDWARE_CAPABILITY_IDS.MICROPHONE.AUDIO_INPUT, 'MIC'),
      createCapability(HARDWARE_CAPABILITY_IDS.ASR.SPEECH_RECOGNITION, 'ASR'),
      createCapability(HARDWARE_CAPABILITY_IDS.LLM.PROMPT_REPLY, 'LLM'),
      createCapability(HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION, 'TTS'),
      createCapability(HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK, 'SPEAKER'),
    ];

    const result = await engine.reflect(
      '我想做一个会聊天的机器人。；我对着它说话，它就回答我。',
      capabilities,
      [
        { role: 'user', content: '我想做一个会聊天的机器人。' },
        { role: 'assistant', content: '...' },
        { role: 'user', content: '我对着它说话，它就回答我。' },
      ]
    );

    expect(result.decision).toBe('clarify_needed');
    expect(result.missing_info.map((item) => item.category)).toEqual(['logic']);
    expect(result.suggested_user_actions.map((item) => item.value))
      .toContain('固定话术，按关键词触发回复');
    expect(result.supported_capability_ids)
      .not.toContain(HARDWARE_CAPABILITY_IDS.LLM.PROMPT_REPLY);
  });

  it('downgrades abstract emotion expression to clarify_needed when llm over-accepts output modality', async () => {
    const { llmClient } = createLLMClient(JSON.stringify({
      decision: 'direct_accept',
      reasoning_summary: '看见人触发已有人脸识别，难过反馈可用机械臂情感动作和表情显示，链路闭环。',
      recognized_requirements: [
        '看见人时触发（人脸识别）',
        '表现难过情绪（机械臂情感动作）',
        '屏幕显示难过表情',
      ],
      supported_capability_ids: [
        HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
        HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
        HARDWARE_CAPABILITY_IDS.HAND.ARM_EMOTIVE_MOTION,
        HARDWARE_CAPABILITY_IDS.SCREEN.EMOJI_DISPLAY,
      ],
      missing_info: [],
      clarification_questions: [],
      suggested_user_actions: [],
      out_of_scope_reasons: [],
      confidence: 0.93,
    }));
    const engine = new ReflectionEngine(llmClient);
    const capabilities = [
      createCapability(HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT, 'CAM'),
      createCapability(HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION, 'FACE-NET'),
      createCapability(HARDWARE_CAPABILITY_IDS.HAND.ARM_EMOTIVE_MOTION, 'HAND'),
      createCapability(HARDWARE_CAPABILITY_IDS.SCREEN.EMOJI_DISPLAY, 'SCREEN'),
    ];

    const result = await engine.reflect(
      '我想做一个看见我就能对我难过的机器人。',
      capabilities,
      [{ role: 'user', content: '我想做一个看见我就能对我难过的机器人。' }]
    );

    expect(result.decision).toBe('clarify_needed');
    expect(result.missing_info.map((item) => item.category)).toEqual(['action']);
    expect(result.clarification_questions[0]?.question).toContain('怎么表达这种情绪');
    expect(result.supported_capability_ids).toContain(HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT);
    expect(result.supported_capability_ids).toContain(HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION);
    expect(result.supported_capability_ids)
      .not.toContain(HARDWARE_CAPABILITY_IDS.HAND.ARM_EMOTIVE_MOTION);
    expect(result.supported_capability_ids)
      .not.toContain(HARDWARE_CAPABILITY_IDS.SCREEN.EMOJI_DISPLAY);
  });

  it('calculates low confidence when blocking info is missing', async () => {
    const { llmClient } = createLLMClient('invalid-json');
    const engine = new ReflectionEngine(llmClient);

    const result = await engine.reflect('帮我做个机器人', [], []);

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.confidence).toBeLessThan(0.3);
    expect(result.can_proceed).toBe(false);
  });

  it('forces proceed after five clarification turns', async () => {
    const { llmClient } = createLLMClient(JSON.stringify({
      decision: 'clarify_needed',
      reasoning_summary: '核心功能已明确，只差一个非阻塞反馈偏好。',
      recognized_requirements: ['触发: 看到我', '动作: 原地转个圈'],
      supported_capability_ids: [
        HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
        HARDWARE_CAPABILITY_IDS.WHEEL.MOVEMENT_EXECUTE,
      ],
      missing_info: [
        {
          category: 'feedback',
          description: '反馈方式还未确定。',
          priority: 2,
          blocking: false,
        },
      ],
      clarification_questions: [
        {
          question: '你希望系统怎么反馈结果？',
          priority: 2,
          context: '反馈方式',
        },
      ],
      suggested_user_actions: [],
      out_of_scope_reasons: [],
      confidence: 0.76,
    }));
    const engine = new ReflectionEngine(llmClient);
    const history = createHistory(9);

    const result = await engine.reflect(
      '帮我做个机器人',
      [
        createCapability(HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION, 'FACE-NET'),
        createCapability(HARDWARE_CAPABILITY_IDS.WHEEL.MOVEMENT_EXECUTE, 'WHEEL'),
      ],
      history
    );

    expect(result.complete).toBe(false);
    expect(result.can_proceed).toBe(true);
  });

  it('deduplicates and limits clarification questions to five', async () => {
    const duplicatedResponse = JSON.stringify({
      decision: 'clarify_needed',
      missing_info: [
        {
          category: 'trigger',
          description: '触发条件不明确。',
          priority: 1,
          blocking: true,
        },
      ],
      clarification_questions: [
        { question: 'Q1', priority: 1, context: 'A' },
        { question: 'Q1', priority: 1, context: 'A' },
        { question: 'Q2', priority: 2, context: 'B' },
        { question: 'Q3', priority: 2, context: 'C' },
        { question: 'Q4', priority: 2, context: 'D' },
        { question: 'Q5', priority: 3, context: 'E' },
        { question: 'Q6', priority: 3, context: 'F' },
      ],
    });
    const { llmClient } = createLLMClient(duplicatedResponse);
    const engine = new ReflectionEngine(llmClient);

    const result = await engine.reflect('我想做一个游戏机器人，需要条件分支', [], []);
    const uniqueQuestionCount = new Set(
      result.clarification_questions.map((item) => item.question)
    ).size;

    expect(result.clarification_questions.length).toBeLessThanOrEqual(5);
    expect(uniqueQuestionCount).toBe(result.clarification_questions.length);
  });

  it('parses json embedded in plain text responses', async () => {
    const { llmClient } = createLLMClient(
      '以下是结果：{"decision":"clarify_needed","missing_info":[{"category":"trigger","description":"触发条件不明确。","priority":1,"blocking":true}],"clarification_questions":[{"question":"请补充触发事件","priority":1,"context":"trigger"}],"supported_capability_ids":[],"suggested_user_actions":[],"out_of_scope_reasons":[]}'
    );
    const engine = new ReflectionEngine(llmClient);

    const result = await engine.reflect('帮我做个机器人', [], []);

    expect(result.clarification_questions[0]?.question).toBe('请补充触发事件');
    expect(result.clarification_questions[0]?.priority).toBe(1);
  });

  it('falls back quickly when clarification llm times out', async () => {
    const chatMock = vi.fn().mockRejectedValue(new Error('Request timed out after 10ms (elapsed 12ms)'));
    const llmClient: LLMClient = {
      classify: vi.fn().mockResolvedValue({
        category: 'custom',
        entities: {},
        confidence: 1,
      } as Intent),
      chat: chatMock,
    };
    const engine = new ReflectionEngine(llmClient, 10);

    const startedAt = Date.now();
    const result = await engine.reflect('帮我做个机器人', [], []);

    expect(Date.now() - startedAt).toBeLessThan(200);
    expect(chatMock).toHaveBeenCalledTimes(1);
    expect(result.clarification_questions.length).toBeGreaterThan(0);
    expect(result.clarification_questions[0]?.question).toContain('触发');
  });

  it('does not skip llm deliberation for low-signal greeting input in ai-first mode', async () => {
    const { llmClient, chatMock } = createLLMClient(JSON.stringify({
      decision: 'clarify_needed',
      reasoning_summary: '当前输入还是寒暄，尚未形成可执行需求。',
      recognized_requirements: [],
      supported_capability_ids: [],
      missing_info: [
        {
          category: 'trigger',
          description: '还不知道什么时候开始工作。',
          priority: 1,
          blocking: true,
        },
      ],
      clarification_questions: [
        {
          question: '你希望机器人在什么事件发生时开始工作？',
          priority: 1,
          context: 'trigger',
        },
      ],
      suggested_user_actions: [],
      out_of_scope_reasons: [],
      confidence: 0.22,
    }));
    const engine = new ReflectionEngine(llmClient);

    const result = await engine.reflect('你好', [], []);

    expect(chatMock).toHaveBeenCalledTimes(1);
    expect(result.clarification_questions.length).toBeGreaterThan(0);
    expect(result.reasoning_summary).toContain('尚未形成可执行需求');
  });
});
