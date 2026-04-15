/**
 * [INPUT]: 依赖 IntakeAgent、SessionService 与 Refactor-3 编排链路
 * [OUTPUT]: 验证 Orchestrator 在三种真实需求下的端到端生成结果
 * [POS]: tests/integration 的 Refactor-3 集成验收测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it, vi } from 'vitest';
import { HARDWARE_COMPONENTS } from '../../src/agents/hardware-components';
import { HardwareService } from '../../src/agents/hardware-service';
import { IntakeAgent } from '../../src/agents/intake-agent';
import { SessionService } from '../../src/agents/session-service';

const TEST_CONFIG = {
  llmProvider: 'openai' as const,
  llmModel: 'test-model',
  llmApiKey: 'test-key',
  maxConversationTurns: 6,
  convergenceThreshold: 0.7,
  llmTimeoutMs: 1000,
  llmHealthTimeoutMs: 5000,
  workflowCacheTtlSeconds: 300,
  maxIterations: 3,
  promptVariant: 'baseline',
};

function createAgent() {
  const llmClient = {
    classify: vi.fn(),
    chat: vi.fn().mockImplementation(async (messages: Array<{ role: string; content: string }>) => {
      const systemPrompt = messages[0]?.content ?? '';
      const userPrompt = messages[1]?.content ?? '';

      if (systemPrompt.includes('机器人能力映射助手')) {
        if (userPrompt.includes('石头剪刀布')) {
          return JSON.stringify({
            reasoning_summary: '需求涉及手势识别、随机出拳和结果反馈。',
            recognized_requirements: ['机器人玩石头剪刀布'],
            capability_ids: [
              'camera.snapshot_input',
              'yolo_rps.rps_gesture_recognition',
              'ram.random_choice',
              'hand.gesture_execute',
              'screen.emoji_display',
              'speaker.audio_playback',
            ],
            search_terms: ['石头剪刀布', '手势识别', '结果反馈'],
          });
        }

        if (userPrompt.includes('欢迎语音')) {
          return JSON.stringify({
            reasoning_summary: '需求是视觉触发后进行语音欢迎。',
            recognized_requirements: ['检测到人脸后播放欢迎语音'],
            capability_ids: [
              'camera.snapshot_input',
              'face_net.face_recognition',
              'tts.audio_generation',
              'speaker.audio_playback',
            ],
            search_terms: ['人脸识别', '欢迎语音'],
          });
        }

        return JSON.stringify({
            reasoning_summary: '需求是声音触发后进行屏幕反馈和底盘动作。',
            recognized_requirements: ['听到声音后屏幕显示并转圈'],
            capability_ids: [
            'microphone.audio_input',
            'screen.emoji_display',
            'wheel.movement_execute',
          ],
          search_terms: ['听到声音', '屏幕表情', '底盘转圈'],
        });
      }

      if (userPrompt.includes('用户做出手势时自动开始')) {
        return JSON.stringify({
          decision: 'direct_accept',
          reasoning_summary: '触发方式已经补齐，可以直接进入生成。',
          recognized_requirements: ['用户做出手势时自动开始', '输了就重新开始'],
          supported_capability_ids: [
            'camera.snapshot_input',
            'yolo_rps.rps_gesture_recognition',
            'ram.random_choice',
            'hand.gesture_execute',
            'screen.emoji_display',
            'speaker.audio_playback',
          ],
          missing_info: [],
          clarification_questions: [],
          suggested_user_actions: [],
          out_of_scope_reasons: [],
        });
      }

      if (userPrompt.includes('我想要一个玩石头剪刀布的机器人')) {
        return JSON.stringify({
          decision: 'clarify_needed',
          reasoning_summary: '猜拳的核心能力已经找到，但还需要先确认触发方式。',
          recognized_requirements: ['机器人玩石头剪刀布'],
          supported_capability_ids: [
            'camera.snapshot_input',
            'yolo_rps.rps_gesture_recognition',
            'ram.random_choice',
            'hand.gesture_execute',
            'screen.emoji_display',
            'speaker.audio_playback',
          ],
          missing_info: [
            {
              category: 'trigger',
              description: '需要先确认在什么时刻开始一轮猜拳。',
              priority: 1,
              blocking: true,
            },
          ],
          clarification_questions: [
            {
              question: '机器人应该在什么时候开始执行？',
              options: ['用户做出手势时自动开始', '通过 webhook 触发'],
              priority: 1,
              context: 'trigger',
            },
          ],
          suggested_user_actions: [
            {
              label: '触发: 用户做出手势时自动开始',
              value: '用户做出手势时自动开始',
              reason: '先补齐触发方式，才能直接生成猜拳流程。',
              category: 'trigger',
            },
          ],
          out_of_scope_reasons: [],
        });
      }

      if (userPrompt.includes('欢迎语音')) {
        return JSON.stringify({
          decision: 'direct_accept',
          reasoning_summary: '触发和动作都明确，可以直接进入生成。',
          recognized_requirements: ['检测到人脸后播放欢迎语音'],
          supported_capability_ids: [
            'camera.snapshot_input',
            'face_net.face_recognition',
            'tts.audio_generation',
            'speaker.audio_playback',
          ],
          missing_info: [],
          clarification_questions: [],
          suggested_user_actions: [],
          out_of_scope_reasons: [],
        });
      }

        return JSON.stringify({
          decision: 'direct_accept',
          reasoning_summary: '触发和动作都明确，可以直接进入生成。',
          recognized_requirements: ['听到声音后屏幕显示开心表情并让底盘转一圈'],
          supported_capability_ids: [
          'microphone.audio_input',
          'screen.emoji_display',
          'wheel.movement_execute',
        ],
        missing_info: [],
        clarification_questions: [],
        suggested_user_actions: [],
        out_of_scope_reasons: [],
      });
    }),
  } as any;

  const sessionService = new SessionService();
  const intakeAgent = new IntakeAgent(
    TEST_CONFIG,
    llmClient,
    {} as any,
    new HardwareService(),
    sessionService,
    HARDWARE_COMPONENTS
  );

  return { intakeAgent, sessionService };
}

function extractCategories(workflow: { nodes: Array<Record<string, unknown>> }): string[] {
  return workflow.nodes
    .map((node) => {
      const notes = node.notes;
      if (!notes || typeof notes !== 'object') {
        return '';
      }
      const category = (notes as Record<string, unknown>).category;
      return typeof category === 'string' ? category : '';
    })
    .filter(Boolean);
}

function extractNodeNames(workflow: { nodes: Array<Record<string, unknown>> }): string[] {
  return workflow.nodes.map((node) => String(node.name ?? ''));
}

describe('Orchestrator E2E', () => {
  it('handles rock-paper-scissors with one clarification round', async () => {
    const { intakeAgent, sessionService } = createAgent();
    const session = sessionService.getOrCreate();

    const first = await intakeAgent.processUserInput(
      '我想要一个玩石头剪刀布的机器人',
      session.id
    );
    expect(first.type).toBe('guidance');

    const second = await intakeAgent.processUserInput(
      '用户做出手势时自动开始，输了就重新开始',
      session.id
    );
    expect(second.type).toBe('summary_ready');

    const confirmed = await intakeAgent.confirmBlueprint(session.id);
    expect(confirmed.type).toBe('workflow_ready');
    if (confirmed.type !== 'workflow_ready') {
      throw new Error('Expected workflow_ready response');
    }

    const categories = extractCategories(confirmed.workflow);
    expect(categories).toContain('CAM');
    expect(categories).toContain('HAND');
    expect(categories).toContain('SPEAKER');
  });

  it('builds a face-recognition plus voice welcome workflow', async () => {
    const { intakeAgent, sessionService } = createAgent();
    const session = sessionService.getOrCreate();

    const summary = await intakeAgent.processUserInput(
      '当摄像头检测到人脸时，播放欢迎语音',
      session.id
    );
    expect(summary.type).toBe('summary_ready');

    const confirmed = await intakeAgent.confirmBlueprint(session.id);
    expect(confirmed.type).toBe('workflow_ready');
    if (confirmed.type !== 'workflow_ready') {
      throw new Error('Expected workflow_ready response');
    }

    const categories = extractCategories(confirmed.workflow);
    expect(categories).toContain('CAM');
    expect(categories).toContain('SPEAKER');
  });

  it('supports a free-form custom scenario', async () => {
    const { intakeAgent, sessionService } = createAgent();
    const session = sessionService.getOrCreate();

    const summary = await intakeAgent.processUserInput(
      '当听到声音后，在屏幕显示开心表情并让底盘转一圈',
      session.id
    );
    expect(summary.type).toBe('summary_ready');

    const confirmed = await intakeAgent.confirmBlueprint(session.id);
    expect(confirmed.type).toBe('workflow_ready');
    if (confirmed.type !== 'workflow_ready') {
      throw new Error('Expected workflow_ready response');
    }

    const categories = extractCategories(confirmed.workflow);
    const nodeNames = extractNodeNames(confirmed.workflow);
    expect(categories).toContain('MIC');
    expect(categories).toContain('SCREEN');
    expect(categories).toContain('WHEEL');
    expect(nodeNames.some((name) => name.includes('wheel_movement_execute'))).toBe(true);
  });
});
