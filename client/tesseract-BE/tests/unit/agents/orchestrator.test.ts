/**
 * [INPUT]: 依赖 Orchestrator、SessionService 与 Refactor-3 能力组件
 * [OUTPUT]: 验证 Orchestrator 的多轮澄清、总结与工作流生成闭环
 * [POS]: tests/unit/agents 的编排层核心测试入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it, vi } from 'vitest';
import { HARDWARE_CAPABILITY_IDS } from '../../../src/agents/hardware-capability-ids';
import { HARDWARE_COMPONENTS } from '../../../src/agents/hardware-components';
import { Orchestrator } from '../../../src/agents/orchestrator';
import { SessionService } from '../../../src/agents/session-service';

const TEST_CONFIG = {
  llmProvider: 'openai' as const,
  llmModel: 'test-model',
  llmApiKey: 'test-key',
  maxConversationTurns: 6,
  convergenceThreshold: 0.7,
  llmTimeoutMs: 1000,
  llmHealthTimeoutMs: 5000,
  llmDiscoveryTimeoutMs: 1000,
  llmReflectionTimeoutMs: 1000,
  workflowCacheTtlSeconds: 300,
  maxIterations: 3,
  promptVariant: 'baseline',
};

function createOrchestrator() {
  const llmClient = {
    classify: vi.fn(),
    chat: vi.fn().mockImplementation(async (messages: Array<{ role: string; content: string }>) => {
      const systemPrompt = messages[0]?.content ?? '';
      const userPrompt = messages[1]?.content ?? '';

      if (systemPrompt.includes('你是一个n8n工作流架构师')) {
        return JSON.stringify({
          name: 'face_welcome_workflow',
          nodes: [
            {
              id: 'trigger-1',
              name: 'schedule_trigger_start_5s',
              type: 'n8n-nodes-base.scheduleTrigger',
              typeVersion: 1.1,
              position: [0, 0],
              parameters: { rule: { interval: [{}] } },
              notes: { category: 'BASE', title: '触发器' },
            },
            {
              id: 'camera-1',
              name: 'http_request_camera_snapshot',
              type: 'n8n-nodes-base.httpRequest',
              typeVersion: 4.3,
              position: [220, 0],
              parameters: { method: 'POST', url: 'http://robot.local/api/camera/snapshot', options: {} },
              notes: { category: 'CAM', title: '用户快照' },
            },
            {
              id: 'speaker-1',
              name: 'code_speaker_execute_welcome',
              type: 'n8n-nodes-base.code',
              typeVersion: 2,
              position: [440, 0],
              parameters: {},
              notes: { category: 'SPEAKER', title: '欢迎语音播报' },
            },
          ],
          connections: {
            schedule_trigger_start_5s: {
              main: [[{ node: 'http_request_camera_snapshot', type: 'main', index: 0 }]],
            },
            http_request_camera_snapshot: {
              main: [[{ node: 'code_speaker_execute_welcome', type: 'main', index: 0 }]],
            },
          },
        });
      }

      if (systemPrompt.includes('机器人能力映射助手')) {
        if (userPrompt.includes('需求=你好')) {
          return JSON.stringify({
            reasoning_summary: '当前输入是寒暄，暂时无法映射成明确硬件能力。',
            recognized_requirements: [],
            capability_ids: [],
            search_terms: [],
          });
        }

        if (userPrompt.includes('看到我后原地转个圈')) {
          return JSON.stringify({
            reasoning_summary: '用户已经明确了视觉触发和底盘旋转动作。',
            recognized_requirements: ['触发: 看到我', '动作: 原地转个圈'],
            capability_ids: [
              HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
              HARDWARE_CAPABILITY_IDS.WHEEL.MOVEMENT_EXECUTE,
            ],
            search_terms: ['看到我', '原地转个圈', '视觉触发', '底盘旋转'],
            entities: [],
            topology_hint: '线性链: face_net → wheel',
          });
        }

        if (userPrompt.includes('见到老刘机器人竖个中指骂人，见到老付机器人比个V打招呼')) {
          return JSON.stringify({
            reasoning_summary: '用户给了双人物和双动作，需要按人物分支。',
            recognized_requirements: ['人物: 老刘/老付', '动作: 中指/V手势', '输出: 语音'],
            capability_ids: [
              HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
              HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
              HARDWARE_CAPABILITY_IDS.HAND.GESTURE_EXECUTE,
              HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION,
              HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK,
            ],
            search_terms: ['老刘', '老付', '中指', 'V手势', '打招呼'],
            entities: [
              {
                name: '老刘',
                key: 'liu',
                bindings: {
                  gesture: 'Middle_Finger',
                  tts_text: '滚',
                },
              },
              {
                name: '老付',
                key: 'fu',
                bindings: {
                  gesture: 'Victory',
                  tts_text: '你长得好帅',
                },
              },
            ],
            topology_hint: 'fan-out: face_net 识别后按人物分支，每分支执行手势与语音',
          });
        }

        return JSON.stringify({
          reasoning_summary: '需求偏向手势识别与语音输出。',
          recognized_requirements: ['动作: 玩石头剪刀布'],
          capability_ids: [
            HARDWARE_CAPABILITY_IDS.YOLO_RPS.RPS_GESTURE_RECOGNITION,
            HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION,
            HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK,
          ],
          search_terms: ['石头剪刀布', '手势识别', '语音播报'],
        });
      }

      if (userPrompt.includes('需求=你好')) {
        return JSON.stringify({
          decision: 'clarify_needed',
          reasoning_summary: '当前输入还是寒暄，尚未形成可执行需求。',
          recognized_requirements: [],
          supported_capability_ids: [],
          missing_info: [
            {
              category: 'trigger',
              description: '触发条件未明确，无法确定工作流何时开始。',
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
          suggested_user_actions: [
            {
              label: '触发: 看到我就触发',
              value: '看到我就触发',
              reason: '先补齐触发方式，系统才能继续理解需求。',
              category: 'trigger',
            },
          ],
          out_of_scope_reasons: [],
        });
      }

      return JSON.stringify({
        decision: userPrompt.includes('看到我后原地转个圈')
          ? 'direct_accept'
          : userPrompt.includes('见到老刘机器人竖个中指骂人，见到老付机器人比个V打招呼')
            ? 'direct_accept'
          : userPrompt.includes('当摄像头检测到人脸时，播放欢迎语音')
            ? 'direct_accept'
            : 'direct_accept',
        reasoning_summary: userPrompt.includes('看到我后原地转个圈')
          ? '我已经明确了视觉触发和底盘旋转，可以直接进入方案拆解。'
          : userPrompt.includes('见到老刘机器人竖个中指骂人，见到老付机器人比个V打招呼')
            ? '人物条件、动作和语音反馈都已明确，可以直接进入方案拆解。'
          : userPrompt.includes('当摄像头检测到人脸时，播放欢迎语音')
            ? '触发条件和语音输出都已明确，可以直接进入方案拆解。'
          : '石头剪刀布的输入、识别和输出方式已经明确，可以直接进入方案拆解。',
        recognized_requirements: userPrompt.includes('看到我后原地转个圈')
          ? ['触发: 看到我', '动作: 原地转个圈']
          : userPrompt.includes('见到老刘机器人竖个中指骂人，见到老付机器人比个V打招呼')
            ? ['人物: 老刘/老付', '动作: 中指/V手势', '输出: 语音']
          : userPrompt.includes('当摄像头检测到人脸时，播放欢迎语音')
            ? ['触发: 检测到人脸', '动作: 播放欢迎语音']
          : ['动作: 玩石头剪刀布'],
        supported_capability_ids: userPrompt.includes('看到我后原地转个圈')
          ? [
              HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
              HARDWARE_CAPABILITY_IDS.WHEEL.MOVEMENT_EXECUTE,
            ]
          : userPrompt.includes('见到老刘机器人竖个中指骂人，见到老付机器人比个V打招呼')
            ? [
                HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
                HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
                HARDWARE_CAPABILITY_IDS.HAND.GESTURE_EXECUTE,
                HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION,
                HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK,
              ]
          : userPrompt.includes('当摄像头检测到人脸时，播放欢迎语音')
            ? [
                HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
                HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
                HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION,
                HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK,
              ]
            : [
                HARDWARE_CAPABILITY_IDS.YOLO_RPS.RPS_GESTURE_RECOGNITION,
                HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION,
                HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK,
              ],
        missing_info: userPrompt.includes('看到我后原地转个圈') || userPrompt.includes('当摄像头检测到人脸时，播放欢迎语音')
          ? []
          : [],
        clarification_questions: userPrompt.includes('看到我后原地转个圈') || userPrompt.includes('当摄像头检测到人脸时，播放欢迎语音')
          ? []
          : [],
        suggested_user_actions: userPrompt.includes('看到我后原地转个圈') || userPrompt.includes('当摄像头检测到人脸时，播放欢迎语音')
          ? []
          : [],
        out_of_scope_reasons: [],
      });
    }),
  } as any;

  const sessionService = new SessionService();
  const orchestrator = new Orchestrator(
    TEST_CONFIG,
    llmClient,
    sessionService,
    HARDWARE_COMPONENTS
  );

  return { orchestrator, sessionService, llmClient };
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

describe('Orchestrator', () => {
  it('summarizes rock-paper-scissors without orchestrator hint forcing extra clarification', async () => {
    const { orchestrator, sessionService } = createOrchestrator();
    const session = sessionService.getOrCreate();

    const first = await orchestrator.process('我想要一个玩石头剪刀布的机器人', session.id);

    expect(first.type).toBe('summary_ready');
    expect(first.message).toContain('手势识别');
    expect(first.message).toContain('确认构建');

    const state = sessionService.getOrchestratorState(session.id);
    expect(state?.capabilityIds).toContain(HARDWARE_CAPABILITY_IDS.YOLO_RPS.RPS_GESTURE_RECOGNITION);
    expect(state?.capabilityIds).toContain(HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK);
  });

  it('summarizes a complete face-recognition welcome workflow', async () => {
    const { orchestrator, sessionService, llmClient } = createOrchestrator();
    const session = sessionService.getOrCreate();

    const response = await orchestrator.process(
      '当摄像头检测到人脸时，播放欢迎语音',
      session.id
    );

    expect(response.type).toBe('summary_ready');
    expect(response.message).toContain('摄像头');
    expect(response.message).toContain('欢迎语音');
    expect(llmClient.chat).toHaveBeenCalledTimes(2);
    expect(sessionService.getTraceEvents(session.id).some((event) => event.phase === 'capability_discovery')).toBe(true);
    expect(sessionService.getTraceEvents(session.id).some((event) => event.phase === 'response')).toBe(true);
  });

  it('uses ai semantic discovery for visual trigger and chassis rotation', async () => {
    const { orchestrator, sessionService } = createOrchestrator();
    const session = sessionService.getOrCreate();

    const response = await orchestrator.process('看到我后原地转个圈', session.id);

    expect(response.type).toBe('summary_ready');
    expect(sessionService.getOrchestratorState(session.id)?.capabilityIds)
      .toContain(HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION);
    expect(sessionService.getOrchestratorState(session.id)?.capabilityIds)
      .toContain(HARDWARE_CAPABILITY_IDS.WHEEL.MOVEMENT_EXECUTE);
    expect(sessionService.getOrchestratorState(session.id)?.topologyHint)
      .toContain('face_net');
    expect(sessionService.getTraceEvents(session.id).some((event) => event.title === 'AI 语义发现完成')).toBe(true);
  });

  it('persists structured entities and topology hint from semantic discovery', async () => {
    const { orchestrator, sessionService } = createOrchestrator();
    const session = sessionService.getOrCreate();

    const response = await orchestrator.process(
      '见到老刘机器人竖个中指骂人，见到老付机器人比个V打招呼',
      session.id
    );

    expect(response.type).toBe('summary_ready');
    expect(sessionService.getOrchestratorState(session.id)?.entities).toEqual([
      {
        name: '老刘',
        key: 'liu',
        bindings: {
          gesture: 'Middle_Finger',
          tts_text: '滚',
        },
      },
      {
        name: '老付',
        key: 'fu',
        bindings: {
          gesture: 'Victory',
          tts_text: '你长得好帅',
        },
      },
    ]);
    expect(sessionService.getOrchestratorState(session.id)?.topologyHint)
      .toContain('fan-out');
  });

  it('generates a workflow after summary confirmation', async () => {
    const { orchestrator, sessionService } = createOrchestrator();
    const session = sessionService.getOrCreate();

    sessionService.setOrchestratorState(session.id, {
      phase: 'reflection',
      decision: 'direct_accept',
      userIntent: '当摄像头检测到人脸时，播放欢迎语音',
      capabilityIds: [
        HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
        HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
        HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION,
        HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK,
      ],
      searchKeywords: ['人脸检测', '欢迎语音', '摄像头', '喇叭'],
      missingFields: [],
      pendingQuestions: [],
      reasoningSummary: '触发条件和反馈动作都已明确，可以直接进入工作流生成。',
      recognizedRequirements: ['触发: 检测到人脸', '动作: 播放欢迎语音'],
      confidence: 0.95,
      complete: true,
      canProceed: true,
    });
    const response = await orchestrator.confirm(session.id);

    expect(response.type).toBe('workflow_ready');
    if (response.type !== 'workflow_ready') {
      throw new Error('Expected workflow_ready response');
    }

    const categories = extractCategories(response.workflow);
    expect(categories).toContain('CAM');
    expect(categories).toContain('SPEAKER');
    expect(response.metadata?.iterations).toBeGreaterThanOrEqual(1);
  });

  it('routes confirm through WorkflowArchitect primary path before falling back', async () => {
    const llmClient = {
      classify: vi.fn(),
      chat: vi.fn(),
    } as any;
    const workflowArchitect = {
      generateWorkflow: vi.fn().mockResolvedValue({
        success: true,
        workflow: {
          name: 'gesture_branching_workflow',
          nodes: [
            {
              id: 'trigger-1',
              name: 'schedule_trigger_5s',
              type: 'n8n-nodes-base.scheduleTrigger',
              typeVersion: 1.1,
              position: [0, 0],
              parameters: { rule: { interval: [{}] } },
              notes: { category: 'BASE', title: '触发器' },
            },
            {
              id: 'if-1',
              name: 'if_identity_is_liu',
              type: 'n8n-nodes-base.if',
              typeVersion: 2.2,
              position: [220, 0],
              parameters: { conditions: { options: { version: 3 }, combinator: 'and', conditions: [] } },
              notes: { category: 'BASE', title: '人物分支' },
            },
            {
              id: 'speaker-1',
              name: 'code_speaker_play_audio_liu',
              type: 'n8n-nodes-base.code',
              typeVersion: 2,
              position: [440, 0],
              parameters: { language: 'javaScript', jsCode: 'return items;' },
              notes: { category: 'SPEAKER', title: '语音播报' },
            },
          ],
          connections: {
            schedule_trigger_5s: {
              main: [[{ node: 'if_identity_is_liu', type: 'main', index: 0 }]],
            },
            if_identity_is_liu: {
              main: [[{ node: 'code_speaker_play_audio_liu', type: 'main', index: 0 }]],
            },
          },
          settings: {},
        },
        iterations: 1,
        reasoning: 'workflow-architect primary path',
      }),
    };
    const sessionService = new SessionService();
    const orchestrator = new Orchestrator(
      TEST_CONFIG,
      llmClient,
      sessionService,
      HARDWARE_COMPONENTS,
      workflowArchitect as any
    );
    const session = sessionService.getOrCreate();

    sessionService.setOrchestratorState(session.id, {
      phase: 'reflection',
      decision: 'direct_accept',
      userIntent: '见到老刘机器人竖个中指骂人，见到老付机器人比个V打招呼',
      capabilityIds: [
        HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
        HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
        HARDWARE_CAPABILITY_IDS.HAND.GESTURE_EXECUTE,
        HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION,
        HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK,
      ],
      searchKeywords: ['老刘', '老付', '中指', 'V手势'],
      entities: [
        {
          name: '老刘',
          key: 'liu',
          bindings: { gesture: 'Middle_Finger', tts_text: '滚' },
        },
        {
          name: '老付',
          key: 'fu',
          bindings: { gesture: 'Victory', tts_text: '你长得好帅' },
        },
      ],
      topologyHint: 'fan-out: face_net 识别后按人物分支',
      missingFields: [],
      pendingQuestions: [],
      reasoningSummary: '人物条件、动作和语音反馈都已明确，可以直接进入方案拆解。',
      recognizedRequirements: ['人物: 老刘/老付', '动作: 中指/V手势', '输出: 语音'],
      confidence: 0.95,
      complete: true,
      canProceed: true,
    });

    const response = await orchestrator.confirm(session.id);

    expect(response.type).toBe('workflow_ready');
    expect(workflowArchitect.generateWorkflow).toHaveBeenCalledTimes(1);
    expect(workflowArchitect.generateWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        structuredEntities: expect.arrayContaining([
          expect.objectContaining({ key: 'liu' }),
          expect.objectContaining({ key: 'fu' }),
        ]),
        topologyHint: expect.stringContaining('fan-out'),
      })
    );
  });

  it('does not skip semantic discovery llm for low-signal greeting input in ai-first mode', async () => {
    const { orchestrator, sessionService, llmClient } = createOrchestrator();
    const session = sessionService.getOrCreate();

    const response = await orchestrator.process('你好', session.id);

    expect(response.type).toBe('guidance');
    expect(llmClient.chat).toHaveBeenCalledTimes(2);
    expect(sessionService.getTraceEvents(session.id).some((event) => event.title === 'Orchestrator 语义发现增强')).toBe(true);
    expect(sessionService.getTraceEvents(session.id).some((event) => event.title === '跳过 AI 语义发现')).toBe(false);
  });

  it('focuses rock-paper-scissors clarification options on the top missing categories first', async () => {
    const llmClient = {
      classify: vi.fn(),
      chat: vi.fn().mockImplementation(async (messages: Array<{ role: string; content: string }>) => {
        const systemPrompt = messages[0]?.content ?? '';

        if (systemPrompt.includes('机器人能力映射助手')) {
          return JSON.stringify({
            reasoning_summary: '猜拳需要识别手势、随机出拳和出拳动作执行。',
            recognized_requirements: ['玩家参与石头剪刀布', '机器人需要出拳'],
            capability_ids: [
              HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
              HARDWARE_CAPABILITY_IDS.YOLO_RPS.RPS_GESTURE_RECOGNITION,
              HARDWARE_CAPABILITY_IDS.RAM.RANDOM_CHOICE,
              HARDWARE_CAPABILITY_IDS.HAND.GESTURE_EXECUTE,
              HARDWARE_CAPABILITY_IDS.SCREEN.EMOJI_DISPLAY,
              HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK,
            ],
            search_terms: ['石头剪刀布', '随机出拳', '胜负反馈'],
          });
        }

        return JSON.stringify({
          decision: 'clarify_needed',
          reasoning_summary: '猜拳核心链路基本明确，但还需要先补齐输入方式和出拳逻辑。',
          recognized_requirements: ['识别石头剪刀布手势', '机器人需要出拳'],
          supported_capability_ids: [
            HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
            HARDWARE_CAPABILITY_IDS.YOLO_RPS.RPS_GESTURE_RECOGNITION,
            HARDWARE_CAPABILITY_IDS.RAM.RANDOM_CHOICE,
            HARDWARE_CAPABILITY_IDS.HAND.GESTURE_EXECUTE,
            HARDWARE_CAPABILITY_IDS.SCREEN.EMOJI_DISPLAY,
            HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK,
          ],
          missing_info: [
            {
              category: 'trigger',
              description: '玩家怎么开始出拳还没明确。',
              priority: 1,
              blocking: true,
            },
            {
              category: 'logic',
              description: '机器人按什么规则出拳还没明确。',
              priority: 2,
              blocking: true,
            },
            {
              category: 'feedback',
              description: '胜负结果怎么反馈还没明确。',
              priority: 3,
              blocking: false,
            },
          ],
          clarification_questions: [
            {
              question: '玩家怎么出拳？',
              options: ['对着摄像头比手', '收到开始口令再出拳'],
              priority: 1,
              context: 'trigger',
            },
            {
              question: '机器人按什么逻辑出拳？',
              options: ['随机出拳', '固定只出布'],
              priority: 2,
              context: 'logic',
            },
            {
              question: '胜负结果怎么反馈？',
              options: ['语音播报输赢', '屏幕显示输赢'],
              priority: 3,
              context: 'feedback',
            },
          ],
          suggested_user_actions: [
            {
              label: '语音播报输赢',
              value: '语音播报输赢',
              reason: '先决定胜负反馈方式。',
              category: 'feedback',
            },
            {
              label: '随机出拳',
              value: '随机出拳',
              reason: '先明确机器人出拳逻辑。',
              category: 'logic',
            },
            {
              label: '对着摄像头比手',
              value: '对着摄像头比手',
              reason: '先明确玩家输入方式。',
              category: 'trigger',
            },
            {
              label: '屏幕显示输赢',
              value: '屏幕显示输赢',
              reason: '反馈方式也可以后面再补。',
              category: 'feedback',
            },
            {
              label: '固定只出布',
              value: '固定只出布',
              reason: '也可以先确定固定出拳逻辑。',
              category: 'logic',
            },
            {
              label: '收到开始口令再出拳',
              value: '收到开始口令再出拳',
              reason: '也可以先确认口令触发。',
              category: 'trigger',
            },
          ],
          out_of_scope_reasons: [],
          confidence: 0.74,
        });
      }),
    } as any;
    const sessionService = new SessionService();
    const orchestrator = new Orchestrator(
      TEST_CONFIG,
      llmClient,
      sessionService,
      HARDWARE_COMPONENTS
    );
    const session = sessionService.getOrCreate();

    const response = await orchestrator.process('我想要一个玩石头剪刀布的机器人', session.id);

    expect(response.type).toBe('guidance');
    if (response.type !== 'guidance') {
      throw new Error('Expected guidance response');
    }

    const labels = response.interaction?.options.map((option) => option.label) ?? [];
    expect(labels[0]).toContain('触发');
    expect(labels[0]).toContain('对着摄像头比手');
    expect(labels[1]).toContain('触发');
    expect(labels[1]).toContain('收到开始口令再出拳');
    expect(labels.length).toBe(2);
    expect(labels.some((label) => label.includes('逻辑'))).toBe(false);
    expect(labels.some((label) => label.includes('反馈'))).toBe(false);
  });

  it('still recovers follow-car capabilities from registry semantics when semantic discovery times out', async () => {
    const llmClient = {
      classify: vi.fn(),
      chat: vi.fn().mockRejectedValue(new Error('Request timed out after 1000ms (elapsed 1002ms)')),
    } as any;
    const sessionService = new SessionService();
    const orchestrator = new Orchestrator(
      TEST_CONFIG,
      llmClient,
      sessionService,
      HARDWARE_COMPONENTS
    );
    const session = sessionService.getOrCreate();

    const response = await orchestrator.process('我想做一个能自动跟着我走的小车', session.id);

    expect(response.type).toBe('summary_ready');
    expect(sessionService.getOrchestratorState(session.id)?.capabilityIds ?? []).toEqual(
      expect.arrayContaining([
        'camera.snapshot_input',
        'face_net.face_recognition',
        'wheel.movement_execute',
      ])
    );
    expect(sessionService.getTraceEvents(session.id).some((event) => event.title === 'AI 语义发现回退')).toBe(true);
  });

  it('builds clarification options from ai question options instead of static missing-field templates', async () => {
    const llmClient = {
      classify: vi.fn(),
      chat: vi.fn().mockImplementation(async (messages: Array<{ role: string; content: string }>) => {
        const systemPrompt = messages[0]?.content ?? '';
        const userPrompt = messages[1]?.content ?? '';

        if (systemPrompt.includes('机器人能力映射助手')) {
          expect(userPrompt).toContain('需求=我想做一个看见我就能对我生气的机器人。');
          return JSON.stringify({
            reasoning_summary: '用户明确了视觉触发和情绪目标，但未说明如何表达生气。',
            recognized_requirements: ['触发: 看见我', '情绪: 生气'],
            capability_ids: [
              HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
              HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
            ],
            search_terms: ['看见我', '生气'],
          });
        }

        return JSON.stringify({
          decision: 'clarify_needed',
          reasoning_summary: '需要确认机器人通过什么方式表达生气。',
          recognized_requirements: ['触发: 看见我', '情绪: 生气'],
          supported_capability_ids: [
            HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
            HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
          ],
          missing_info: [
            {
              category: 'action',
              description: '需要确认生气的表达方式。',
              priority: 1,
              blocking: true,
            },
          ],
          clarification_questions: [
            {
              question: '你希望机器人怎么表达生气？',
              options: ['屏幕显示生气表情', '机械臂做出生气动作', '开口说我生气了'],
              priority: 1,
              context: 'action',
            },
          ],
          suggested_user_actions: [],
          out_of_scope_reasons: [],
          confidence: 0.82,
        });
      }),
    } as any;

    const sessionService = new SessionService();
    const orchestrator = new Orchestrator(
      TEST_CONFIG,
      llmClient,
      sessionService,
      HARDWARE_COMPONENTS
    );
    const session = sessionService.getOrCreate();

    const response = await orchestrator.process('我想做一个看见我就能对我生气的机器人。', session.id);

    expect(response.type).toBe('guidance');
    expect(response.interaction?.options.map((item) => item.value)).toEqual([
      '屏幕显示生气表情',
      '机械臂做出生气动作',
      '开口说我生气了',
    ]);
    expect(response.interaction?.options.some((item) => item.value === '看到我就触发')).toBe(false);
    expect(response.interaction?.options.every((item) => item.label.startsWith('执行动作:'))).toBe(true);
  });

  it('supplements clarification options across categories when the primary category only yields one option', async () => {
    const llmClient = {
      classify: vi.fn(),
      chat: vi.fn().mockImplementation(async (messages: Array<{ role: string; content: string }>) => {
        const systemPrompt = messages[0]?.content ?? '';
        const userPrompt = messages[1]?.content ?? '';

        if (systemPrompt.includes('机器人能力映射助手')) {
          expect(userPrompt).toContain('需求=我想做一个看见我就提醒我的机器人。');
          return JSON.stringify({
            reasoning_summary: '用户明确了视觉触发，但还没定动作和反馈方式。',
            recognized_requirements: ['触发: 看见我', '目标: 提醒我'],
            capability_ids: [
              HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
              HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
            ],
            search_terms: ['看到我', '提醒'],
          });
        }

        return JSON.stringify({
          decision: 'clarify_needed',
          reasoning_summary: '还需要先确认提醒动作和提醒反馈方式。',
          recognized_requirements: ['触发: 看见我', '目标: 提醒我'],
          supported_capability_ids: [
            HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
            HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
          ],
          missing_info: [
            {
              category: 'action',
              description: '需要先确认提醒动作。',
              priority: 1,
              blocking: true,
            },
            {
              category: 'feedback',
              description: '需要确认提醒反馈方式。',
              priority: 2,
              blocking: true,
            },
          ],
          clarification_questions: [
            {
              question: '你希望它做什么动作来提醒你？',
              options: ['屏幕闪一下'],
              priority: 1,
              context: 'action',
            },
            {
              question: '你希望它怎么反馈提醒？',
              options: ['语音提醒', '屏幕显示文字'],
              priority: 2,
              context: 'feedback',
            },
          ],
          suggested_user_actions: [],
          out_of_scope_reasons: [],
          confidence: 0.73,
        });
      }),
    } as any;

    const sessionService = new SessionService();
    const orchestrator = new Orchestrator(
      TEST_CONFIG,
      llmClient,
      sessionService,
      HARDWARE_COMPONENTS
    );
    const session = sessionService.getOrCreate();

    const response = await orchestrator.process('我想做一个看见我就提醒我的机器人。', session.id);

    expect(response.type).toBe('guidance');
    expect(response.interaction?.options.map((item) => item.value)).toEqual([
      '屏幕闪一下',
      '语音提醒',
      '屏幕显示文字',
    ]);
  });

  it('keeps clarification interaction when only one valid suggestion remains', async () => {
    const llmClient = {
      classify: vi.fn(),
      chat: vi.fn().mockImplementation(async (messages: Array<{ role: string; content: string }>) => {
        const systemPrompt = messages[0]?.content ?? '';
        const userPrompt = messages[1]?.content ?? '';

        if (systemPrompt.includes('机器人能力映射助手')) {
          expect(userPrompt).toContain('需求=我想做一个看见我就能对我生气的机器人。');
          return JSON.stringify({
            reasoning_summary: '用户明确了视觉触发和情绪目标，但没说明如何表达生气。',
            recognized_requirements: ['触发: 看见我', '情绪: 生气'],
            capability_ids: [
              HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
              HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
            ],
            search_terms: ['看见我', '生气'],
          });
        }

        return JSON.stringify({
          decision: 'clarify_needed',
          reasoning_summary: '需要确认通过什么方式表达生气。',
          recognized_requirements: ['触发: 看见我', '情绪: 生气'],
          supported_capability_ids: [
            HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
            HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
          ],
          missing_info: [
            {
              category: 'action',
              description: '需要确认生气的表达方式。',
              priority: 1,
              blocking: true,
            },
          ],
          clarification_questions: [
            {
              question: '你希望机器人怎么表达生气？',
              options: ['屏幕显示生气表情'],
              priority: 1,
              context: 'action',
            },
          ],
          suggested_user_actions: [],
          out_of_scope_reasons: [],
          confidence: 0.71,
        });
      }),
    } as any;

    const sessionService = new SessionService();
    const orchestrator = new Orchestrator(
      TEST_CONFIG,
      llmClient,
      sessionService,
      HARDWARE_COMPONENTS
    );
    const session = sessionService.getOrCreate();

    const response = await orchestrator.process('我想做一个看见我就能对我生气的机器人。', session.id);

    expect(response.type).toBe('guidance');
    expect(response.interaction?.options.map((item) => item.value)).toEqual([
      '屏幕显示生气表情',
    ]);
  });

  it('treats the next user turn as a fresh intent after a reject_out_of_scope decision', async () => {
    const llmClient = {
      classify: vi.fn(),
      chat: vi.fn().mockImplementation(async (messages: Array<{ role: string; content: string }>) => {
        const systemPrompt = messages[0]?.content ?? '';
        const userPrompt = messages[1]?.content ?? '';

        expect(userPrompt.includes('遛狗') && userPrompt.includes('看家的呢')).toBe(false);

        if (systemPrompt.includes('机器人能力映射助手')) {
          if (userPrompt.includes('需求=我想做一个帮我遛狗的机器人。')) {
            return JSON.stringify({
              reasoning_summary: '遛狗至少涉及移动执行。',
              recognized_requirements: ['目标: 帮我遛狗'],
              capability_ids: [HARDWARE_CAPABILITY_IDS.WHEEL.MOVEMENT_EXECUTE],
              search_terms: ['遛狗', '移动'],
            });
          }

          if (userPrompt.includes('需求=看家的呢')) {
            return JSON.stringify({
              reasoning_summary: '看家可从视觉监控切入，但还要确认监控方式和反馈方式。',
              recognized_requirements: ['目标: 看家'],
              capability_ids: [HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT],
              search_terms: ['看家', '监控'],
            });
          }
        }

        if (userPrompt.includes('需求=我想做一个帮我遛狗的机器人。')) {
          return JSON.stringify({
            decision: 'reject_out_of_scope',
            reasoning_summary: '遛狗依赖牵引装置、狗行为感知和户外导航，当前目录不支持。',
            recognized_requirements: ['目标: 帮我遛狗'],
            supported_capability_ids: [],
            missing_info: [],
            clarification_questions: [],
            suggested_user_actions: [],
            out_of_scope_reasons: ['缺少牵引装置', '缺少狗行为感知', '缺少户外导航'],
            confidence: 0.95,
          });
        }

        if (userPrompt.includes('需求=看家的呢')) {
          return JSON.stringify({
            decision: 'clarify_needed',
            reasoning_summary: '看家方向可以继续，但要先确认是固定监控还是移动巡看，以及如何反馈结果。',
            recognized_requirements: ['目标: 看家'],
            supported_capability_ids: [HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT],
            missing_info: [
              {
                category: 'condition',
                description: '需要确认固定监控还是移动巡看。',
                priority: 1,
                blocking: true,
              },
              {
                category: 'feedback',
                description: '需要确认看见异常后如何反馈。',
                priority: 1,
                blocking: true,
              },
            ],
            clarification_questions: [
              {
                question: '你希望它固定监控，还是在家里来回巡看？',
                options: ['固定监控', '在家里来回巡看'],
                priority: 1,
                context: 'condition',
              },
              {
                question: '发现异常后怎么告诉你？',
                options: ['屏幕提示', '语音提醒'],
                priority: 1,
                context: 'feedback',
              },
            ],
            suggested_user_actions: [],
            out_of_scope_reasons: [],
            confidence: 0.81,
          });
        }

        throw new Error(`Unexpected prompt: ${userPrompt}`);
      }),
    } as any;

    const sessionService = new SessionService();
    const orchestrator = new Orchestrator(
      TEST_CONFIG,
      llmClient,
      sessionService,
      HARDWARE_COMPONENTS
    );
    const session = sessionService.getOrCreate();

    const rejected = await orchestrator.process('我想做一个帮我遛狗的机器人。', session.id);
    expect(rejected.type).toBe('guidance');
    expect(rejected.message).toContain('超出我当前支持的硬件边界');

    const followUp = await orchestrator.process('看家的呢', session.id);
    expect(followUp.type).toBe('guidance');
    expect(followUp.message).toContain('看家');
    expect(followUp.message).not.toContain('遛狗');
    expect(followUp.interaction?.options.map((item) => item.value)).toEqual([
      '固定监控',
      '在家里来回巡看',
    ]);
    expect(sessionService.getOrchestratorState(session.id)?.userIntent).toBe('看家的呢');
  });
});
