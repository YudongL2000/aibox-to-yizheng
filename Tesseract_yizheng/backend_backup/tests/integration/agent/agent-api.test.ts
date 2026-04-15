/**
 * [INPUT]: 依赖 AgentHttpServer、createAgentStack、CapabilityRegistry 与网络测试助手
 * [OUTPUT]: 验证 HTTP Agent API 的能力驱动编排、dialogue-mode 路由与工作流创建路径
 * [POS]: tests/integration/agent 的 HTTP 集成测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentHttpServer } from '../../../src/agent-server/server';
import { createAgentStack } from '../../../src/agent-server/agent-factory';
import { createStaticRuntimeStatusMonitor } from '../../../src/agent-server/runtime-status';
import { HARDWARE_CAPABILITY_IDS } from '../../../src/agents/hardware-capability-ids';
import type {
  AgentResponse,
  ConfigAgentState,
  DialogueModeHardwareSnapshot,
  DialogueModeMatchedSkill,
  Intent,
  SkillSaveCandidate,
  WorkflowDefinition,
} from '../../../src/agents/types';
import { CapabilityRegistry } from '../../../src/agents/capability-registry';
import { ComponentComposer } from '../../../src/agents/component-composer';
import { HARDWARE_COMPONENTS } from '../../../src/agents/hardware-components';
import { SkillLibraryRepository } from '../../../src/agents/dialogue-mode/skill-library-repository';
import { canListen, getJson, postJson } from '../../utils/test-helpers';

function createDeterministicAgentLlmClient() {
  return {
    classify: async (): Promise<Intent> => ({
      category: 'gesture_game',
      entities: { game_type: 'rps' },
      confidence: 0.9,
      missingInfo: [],
    }),
    chat: async (messages: Array<{ role: string; content: string }>) => {
      const systemPrompt = messages[0]?.content ?? '';
      const userPrompt = messages[1]?.content ?? '';

      if (systemPrompt.includes('机器人能力映射助手')) {
        return JSON.stringify({
          reasoning_summary: '用户明确提出摄像头检测人脸后播放欢迎语音。',
          recognized_requirements: ['触发: 检测到人脸', '动作: 播放欢迎语音'],
          capability_ids: [
            HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
            HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
            HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION,
            HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK,
          ],
          search_terms: ['人脸检测', '欢迎语音', '摄像头', '喇叭'],
        });
      }

      if (userPrompt.includes('当摄像头检测到人脸时，播放欢迎语音')) {
        return JSON.stringify({
          decision: 'direct_accept',
          reasoning_summary: '触发条件和反馈动作都已明确，可以直接生成摘要。',
          recognized_requirements: ['触发: 检测到人脸', '动作: 播放欢迎语音'],
          supported_capability_ids: [
            HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
            HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
            HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION,
            HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK,
          ],
          missing_info: [],
          clarification_questions: [],
          suggested_user_actions: [],
          out_of_scope_reasons: [],
        });
      }

      return JSON.stringify({
        decision: 'clarify_needed',
        reasoning_summary: '当前信息不足，需要继续澄清。',
        recognized_requirements: [],
        supported_capability_ids: [],
        missing_info: [
          {
            category: 'trigger',
            description: '触发方式未明确。',
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
      });
    },
  };
}

function createCompletedConfigState(workflow: WorkflowDefinition): ConfigAgentState {
  return {
    workflowId: 'wf-library-1',
    workflowSnapshot: workflow,
    configurableNodes: [
      {
        name: '摄像头抓拍',
        type: 'n8n-nodes-base.httpRequest',
        category: 'CAM',
        required: true,
        prompt: '请插上摄像头',
        configValues: {
          portId: 'port_7',
          topology: 'port_7',
        },
      },
    ],
    currentNodeIndex: 1,
    completed: true,
    progress: {
      total: 1,
      completed: 1,
      percentage: 100,
    },
  };
}

function seedRpsSkill(repository: SkillLibraryRepository) {
  const workflow: WorkflowDefinition = {
    name: '石头剪刀布',
    nodes: [],
    connections: {},
  };
  const candidate: SkillSaveCandidate = {
    skillId: 'skill-rps',
    displayName: '石头剪刀布',
    summary: '通过摄像头识别用户手势，再用机械手回应石头剪刀布。',
    keywords: ['石头剪刀布', '猜拳', '手势'],
    gameplayGuide: '没问题！我看到装备全齐，我已经等不及要赢你一把了。你先出拳，我会立刻识别并回应。',
    requiredHardware: [
      {
        componentId: 'camera',
        displayName: '摄像头',
        requiredCapability: 'rps_gesture_recognition',
        acceptablePorts: ['port_7'],
        requiredModelIds: ['cam-001', 'camera-001'],
        isOptional: false,
      },
      {
        componentId: 'mechanical_hand',
        displayName: '机械手',
        requiredCapability: 'hand_execute',
        acceptablePorts: ['port_2', 'port_5'],
        requiredModelIds: ['claw-v1', 'mimiclaw-hand-v1'],
        isOptional: false,
      },
    ],
    initialPhysicalCue: {
      action: 'hand_stretch',
      autoTrigger: true,
      targetComponentId: 'mechanical_hand',
    },
    workflowId: 'wf-rps',
    workflowName: workflow.name,
    sourceSessionId: 'seed-session',
  };
  return repository.save(candidate, workflow);
}

describe('Agent API integration', () => {
  it('handles chat flow and workflow creation', async () => {
    if (!(await canListen())) {
      return;
    }
    const llmClient = createDeterministicAgentLlmClient();

    const config = {
      llmProvider: 'openai' as const,
      llmModel: 'test-model',
      llmApiKey: 'test-key',
      maxConversationTurns: 4,
      convergenceThreshold: 0.7,
      llmTimeoutMs: 1000,
      llmHealthTimeoutMs: 5000,
      workflowCacheTtlSeconds: 300,
      maxIterations: 2,
      promptVariant: 'baseline',
    };
    const runtimeStatusMonitor = createStaticRuntimeStatusMonitor({
      llm: {
        state: 'ready',
        code: 'ok',
        enabled: true,
        provider: 'openai',
        model: 'test-model',
        baseUrl: 'https://example.com/v1',
        message: 'LLM 网关可用',
        checkedAt: new Date().toISOString(),
        latencyMs: 42,
        probeTimeoutMs: 5000,
      },
    });

    const workflow = { name: 'Demo', nodes: [], connections: {} };
    const workflowArchitect = {
      generateWorkflow: async () => ({
        success: true,
        workflow,
        iterations: 1,
        reasoning: 'test',
      }),
    } as any;
    const mcpClient = {
      searchNodes: async () => ({ nodes: [], total: 0 }),
      getNode: async () => ({}),
      validateWorkflow: async () => ({
        isValid: true,
        errors: [],
        warnings: [],
      }),
      autofixWorkflow: async (workflowToFix: typeof workflow) => workflowToFix,
    } as any;

    const skillLibraryDir = mkdtempSync(join(tmpdir(), 'agent-api-skills-'));
    const skillLibraryRepository = new SkillLibraryRepository(skillLibraryDir);
    seedRpsSkill(skillLibraryRepository);
    const {
      agentService,
      sessionService,
      runtimeStatusMonitor: createdRuntimeStatusMonitor,
      close,
    } = await createAgentStack({
      config,
      llmClient,
      workflowArchitect,
      mcpClient,
      hardwareComponents: [],
      skillLibraryRepository,
      runtimeStatusMonitor,
    });

    const workflowService = {
      createWorkflow: async () => ({
        workflowId: 'wf-1',
        workflowName: 'WF',
        workflowUrl: 'http://localhost:5678/workflow/wf-1',
      }),
    } as any;

    const server = new AgentHttpServer(agentService, workflowService, createdRuntimeStatusMonitor);
    const { port } = await server.start({ host: '0.0.0.0', port: 0 });

    try {
      const healthResult = await getJson<{ status: string; runtime: { llm: { state: string } } }>(
        `http://127.0.0.1:${port}/api/health`
      );
      expect(healthResult.response.status).toBe(200);
      expect(healthResult.data.runtime.llm.state).toBe('ready');

      const runtimeResult = await getJson<{ success: boolean; data: { llm: { state: string; latencyMs: number; probeTimeoutMs: number } } }>(
        `http://127.0.0.1:${port}/api/agent/runtime-status`
      );
      expect(runtimeResult.response.status).toBe(200);
      expect(runtimeResult.data.success).toBe(true);
      expect(runtimeResult.data.data.llm.state).toBe('ready');
      expect(runtimeResult.data.data.llm.latencyMs).toBe(42);
      expect(runtimeResult.data.data.llm.probeTimeoutMs).toBe(5000);

      const rpsSkill: DialogueModeMatchedSkill = {
        skillId: 'skill_rps',
        displayName: '石头剪刀布',
        matchStatus: 'matched',
        confidence: 0.97,
        gameplayGuide: '没问题！我看到装备全齐，我已经等不及要赢你一把了。你先出拳，我会立刻识别并回应。',
        requiredHardware: [
          {
            componentId: 'camera',
            displayName: '摄像头',
            requiredCapability: 'rps_gesture_recognition',
            acceptablePorts: ['port_7'],
            requiredModelIds: ['cam-001', 'camera-001'],
            isOptional: false,
          },
          {
            componentId: 'mechanical_hand',
            displayName: '机械手',
            requiredCapability: 'hand_execute',
            acceptablePorts: ['port_2', 'port_5'],
            requiredModelIds: ['claw-v1', 'mimiclaw-hand-v1'],
            isOptional: false,
          },
        ],
        initialPhysicalCue: {
          action: 'hand_stretch',
          autoTrigger: true,
          targetComponentId: 'mechanical_hand',
        },
      };

      const readySnapshot: DialogueModeHardwareSnapshot = {
        source: 'miniclaw_ws',
        connectedComponents: [
          {
            componentId: 'camera',
            deviceId: 'camera-001',
            modelId: 'cam-001',
            displayName: '摄像头',
            portId: 'port_7',
            status: 'connected',
          },
          {
            componentId: 'mechanical_hand',
            deviceId: 'hand-001',
            modelId: 'claw-v1',
            displayName: '机械手',
            portId: 'port_2',
            status: 'connected',
          },
        ],
        missingRequirements: [],
        validationStatus: 'success',
        lastEventType: 'snapshot',
        lastEventAt: new Date().toISOString(),
      };

      sessionService.setDialogueModeState('dialogue-ready', {
        sessionId: 'dialogue-ready',
        interactionMode: 'dialogue',
        userGoal: '跟我玩石头剪刀布',
        branch: 'hardware_guidance',
        phase: 'waiting_for_insert',
        matchedSkill: null,
        hardwareSnapshot: readySnapshot,
        teachingHandoff: null,
        lastAgentUtterance: '',
        updatedAt: new Date().toISOString(),
      });

      const dialogueChat = await postJson<{ sessionId: string; response: AgentResponse }>(
        `http://127.0.0.1:${port}/api/agent/chat`,
        { sessionId: 'dialogue-ready', message: '跟我玩石头剪刀布', interactionMode: 'dialogue' }
      );
      expect(dialogueChat.response.status).toBe(200);
      expect(dialogueChat.data.response.type).toBe('dialogue_mode');
      expect(dialogueChat.data.response.dialogueMode.branch).toBe('instant_play');

      const dialogueProxy = await postJson<{ sessionId: string; response: AgentResponse }>(
        `http://127.0.0.1:${port}/api/agent/chat`,
        { message: '你是谁', interactionMode: 'dialogue' }
      );
      expect(dialogueProxy.response.status).toBe(200);
      expect(dialogueProxy.data.response.type).toBe('dialogue_mode');
      expect(dialogueProxy.data.response.dialogueMode.branch).toBe('proxy_chat');
      expect(dialogueProxy.data.response.dialogueMode.relay).toEqual(
        expect.objectContaining({
          target: 'mimiclaw_ws',
          message: '你是谁',
        })
      );
      expect(dialogueProxy.data.response.dialogueMode.relay?.chatId).toMatch(/^dlg-[a-z0-9]+-[a-z0-9]+$/);
      expect(dialogueProxy.data.response.dialogueMode.relay?.chatId?.length).toBeLessThanOrEqual(30);

      sessionService.setDialogueModeState('dialogue-hardware', {
        sessionId: 'dialogue-hardware',
        interactionMode: 'dialogue',
        userGoal: '跟我玩石头剪刀布',
        branch: 'hardware_guidance',
        phase: 'waiting_for_insert',
        matchedSkill: rpsSkill,
        hardwareSnapshot: {
          source: 'backend_cache',
          connectedComponents: [
            {
              componentId: 'camera',
              deviceId: 'camera-001',
              modelId: 'cam-001',
              displayName: '摄像头',
              portId: 'port_7',
              status: 'connected',
            },
          ],
          missingRequirements: [rpsSkill.requiredHardware[1]],
          validationStatus: 'pending',
          lastEventType: 'snapshot',
          lastEventAt: new Date().toISOString(),
        },
        teachingHandoff: null,
        lastAgentUtterance: '',
        updatedAt: new Date().toISOString(),
      });

      const dialogueMissing = await postJson<{ sessionId: string; response: AgentResponse }>(
        `http://127.0.0.1:${port}/api/agent/chat`,
        { sessionId: 'dialogue-hardware', message: '跟我玩石头剪刀布', interactionMode: 'dialogue' }
      );
      expect(dialogueMissing.response.status).toBe(200);
      expect(dialogueMissing.data.response.type).toBe('dialogue_mode');
      expect(dialogueMissing.data.response.dialogueMode.branch).toBe('hardware_guidance');
      expect(dialogueMissing.data.response.dialogueMode.uiActions).toEqual([]);

      const dialogueValidate = await postJson<{ sessionId: string; response: AgentResponse }>(
        `http://127.0.0.1:${port}/api/agent/dialogue/validate-hardware`,
        {
          sessionId: 'dialogue-hardware',
          event: {
            source: 'miniclaw_ws',
            eventType: 'device_inserted',
            component: {
              componentId: 'mechanical_hand',
              deviceId: 'hand-001',
              modelId: 'claw-v1',
              displayName: '机械手',
              portId: 'port_2',
              status: 'connected',
            },
          },
        }
      );
      expect(dialogueValidate.response.status).toBe(200);
      expect(dialogueValidate.data.response.type).toBe('dialogue_mode');
      expect(dialogueValidate.data.response.dialogueMode.phase).toBe('ready_to_deploy');

      const dialogueStartDeploy = await postJson<{ sessionId: string; response: AgentResponse }>(
        `http://127.0.0.1:${port}/api/agent/dialogue/start-deploy`,
        { sessionId: 'dialogue-hardware' }
      );
      expect(dialogueStartDeploy.response.status).toBe(200);
      expect(dialogueStartDeploy.data.response.type).toBe('dialogue_mode');
      expect(dialogueStartDeploy.data.response.dialogueMode.phase).toBe('interacting');

      const chatResult = await postJson<{ sessionId: string; response: AgentResponse }>(
        `http://127.0.0.1:${port}/api/agent/chat`,
        { message: '当摄像头检测到人脸时，播放欢迎语音' }
      );

      expect(chatResult.response.status).toBe(200);
      expect(chatResult.data.sessionId).toBeTruthy();
      expect(chatResult.data.response.type).toBe('summary_ready');

      const confirmResult = await postJson<{ sessionId: string; response: AgentResponse }>(
        `http://127.0.0.1:${port}/api/agent/confirm`,
        { sessionId: chatResult.data.sessionId }
      );
      expect(confirmResult.response.status).toBe(200);
      sessionService.setWorkflow(chatResult.data.sessionId, workflow);

      const workflowResult = await postJson<{ workflowId: string }>(
        `http://127.0.0.1:${port}/api/workflow/create`,
        { sessionId: chatResult.data.sessionId }
      );
      expect(workflowResult.response.status).toBe(200);
      expect(workflowResult.data.workflowId).toBe('wf-1');

      const skillWorkflow: WorkflowDefinition = {
        name: '石头剪刀布',
        nodes: [],
        connections: {},
      };
      const skillSession = sessionService.getOrCreate('skill-session');
      skillSession.workflow = skillWorkflow;
      skillSession.workflowSummary = '通过摄像头识别石头剪刀布手势后，让机械手同步回应。';
      skillSession.configAgentState = createCompletedConfigState(skillWorkflow);
      skillSession.dialogueModeState = {
        sessionId: skillSession.id,
        interactionMode: 'teaching',
        userGoal: '跟我玩石头剪刀布',
        branch: 'teaching_handoff',
        phase: 'handoff_ready',
        matchedSkill: null,
        hardwareSnapshot: readySnapshot,
        teachingHandoff: {
          sourceSessionId: skillSession.id,
          originalPrompt: '跟我玩石头剪刀布',
          prefilledGoal: '学习石头剪刀布',
          entryMode: 'dialogue_handoff',
          createdAt: new Date().toISOString(),
        },
        lastAgentUtterance: '',
        updatedAt: new Date().toISOString(),
      };

      const saveSkillResult = await postJson<{
        success: boolean;
        skill: { skillId: string; displayName: string };
      }>(
        `http://127.0.0.1:${port}/api/agent/save-skill`,
        { sessionId: skillSession.id }
      );
      expect(saveSkillResult.response.status).toBe(200);
      expect(saveSkillResult.data.success).toBe(true);
      expect(saveSkillResult.data.skill.skillId).toMatch(/^skill-/);

      const listSkillResult = await getJson<{
        success: boolean;
        skills: Array<{ skillId: string; displayName: string }>;
      }>(
        `http://127.0.0.1:${port}/api/agent/skills`
      );
      expect(listSkillResult.response.status).toBe(200);
      expect(listSkillResult.data.success).toBe(true);
      expect(listSkillResult.data.skills[0]?.displayName).toContain('石头剪刀布');
    } finally {
      await server.stop();
      close();
      rmSync(skillLibraryDir, { recursive: true, force: true });
    }
  });

  it('composes workflow from arbitrary capability combinations without scenario guidance', async () => {
    const registry = new CapabilityRegistry(HARDWARE_COMPONENTS);
    const composer = new ComponentComposer(registry);
    const capabilities = registry.getByIds([
      HARDWARE_CAPABILITY_IDS.YOLO_HAND.HAND_GESTURE_RECOGNITION,
      HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK,
      HARDWARE_CAPABILITY_IDS.SCREEN.EMOJI_DISPLAY,
      HARDWARE_CAPABILITY_IDS.HAND.GESTURE_EXECUTE,
    ]);

    const start = Date.now();
    const workflow = await composer.compose(capabilities, {
      userIntent: '识别用户手势并同步语音和屏幕反馈',
      trigger_type: 'webhook',
      conditions: [{ leftValue: '={{$json.gesture}}', rightValue: '石头' }],
      timeoutMs: 1000,
    });
    const elapsedMs = Date.now() - start;

    expect(workflow.nodes.length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(workflow.connections).length).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(500);
  });
});
