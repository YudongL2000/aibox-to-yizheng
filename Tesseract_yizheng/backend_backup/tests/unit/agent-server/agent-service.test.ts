/**
 * [INPUT]: 依赖 AgentService、SessionService 与 logger
 * [OUTPUT]: 验证 AgentService 的会话路由、dialogue-mode 分支、确认构建与工作流日志输出
 * [POS]: tests/unit/agent-server 的服务层守护测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentService } from '../../../src/agent-server/agent-service';
import { SkillLibraryRepository } from '../../../src/agents/dialogue-mode/skill-library-repository';
import { SessionService } from '../../../src/agents/session-service';
import type {
  ConfigAgentState,
  DialogueModeHardwareSnapshot,
  DialogueModeMatchedSkill,
  SkillSaveCandidate,
  WorkflowDefinition,
} from '../../../src/agents/types';
import { logger } from '../../../src/utils/logger';

const RPS_SKILL: DialogueModeMatchedSkill = {
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

function createReadySnapshot(): DialogueModeHardwareSnapshot {
  return {
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
}

function createSkillRepoFixture() {
  const rootDir = mkdtempSync(join(tmpdir(), 'skills-lib-'));
  const repository = new SkillLibraryRepository(rootDir);
  return {
    repository,
    cleanup: () => rmSync(rootDir, { recursive: true, force: true }),
  };
}

function createCompletedConfigState(workflow: WorkflowDefinition): ConfigAgentState {
  return {
    workflowId: 'wf-skill-1',
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
      {
        name: '机械手出石头',
        type: 'n8n-nodes-base.set',
        category: 'HAND',
        required: true,
        prompt: '请接入机械手',
        configValues: {
          portId: 'port_2',
          topology: 'port_2',
        },
      },
    ],
    currentNodeIndex: 2,
    completed: true,
    progress: {
      total: 2,
      completed: 2,
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
    requiredHardware: RPS_SKILL.requiredHardware,
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

describe('AgentService', () => {
  it('returns session id and response', async () => {
    const intakeAgent = {
      processUserInput: vi.fn().mockResolvedValue({ type: 'guidance', message: 'hi' }),
    };
    const configAgent = {
      processConfigurationInput: vi.fn(),
    };

    const service = new AgentService(intakeAgent as any, new SessionService(), configAgent as any);
    const result = await service.chat('hello');

    expect(result.sessionId).toBeDefined();
    expect(result.response.message).toBe('hi');
  });

  it('returns proxy_chat when dialogue input is plain conversation', async () => {
    const intakeAgent = {
      processUserInput: vi.fn(),
    };
    const configAgent = {
      processConfigurationInput: vi.fn(),
    };
    const service = new AgentService(intakeAgent as any, new SessionService(), configAgent as any);
    const result = await service.chat('你是谁', undefined, {
      interactionMode: 'dialogue',
    });

    expect(result.response.type).toBe('dialogue_mode');
    expect(result.response.dialogueMode.branch).toBe('proxy_chat');
    expect(result.response.dialogueMode.relay).toEqual(
      expect.objectContaining({
        target: 'mimiclaw_ws',
        message: '你是谁',
      })
    );
    expect(result.response.dialogueMode.relay?.chatId).toMatch(/^dlg-[a-z0-9]+-[a-z0-9]+$/);
    expect(result.response.dialogueMode.relay?.chatId?.length).toBeLessThanOrEqual(30);
    expect(result.response.dialogueMode.uiActions).toEqual([]);
    expect(intakeAgent.processUserInput).not.toHaveBeenCalled();
  });

  it('returns dialogue_mode teaching handoff when prompt is an explicit unknown skill request', async () => {
    const intakeAgent = {
      processUserInput: vi.fn(),
    };
    const configAgent = {
      processConfigurationInput: vi.fn(),
    };
    const service = new AgentService(intakeAgent as any, new SessionService(), configAgent as any);
    const result = await service.chat('帮我给花浇水', undefined, {
      interactionMode: 'dialogue',
    });

    expect(result.response.type).toBe('dialogue_mode');
    expect(result.response.dialogueMode.branch).toBe('teaching_handoff');
    expect(result.response.dialogueMode.teachingHandoff?.prefilledGoal).toBe('学习帮我给花浇水');
    expect(result.response.dialogueMode.uiActions[0]?.id).toBe('open_teaching_mode');
    expect(intakeAgent.processUserInput).not.toHaveBeenCalled();
  });

  it('uses injected dialogue router to keep non-chat intents away from MimicLaw fallback', async () => {
    const intakeAgent = {
      processUserInput: vi.fn(),
    };
    const configAgent = {
      processConfigurationInput: vi.fn(),
    };
    const dialogueRouter = {
      classify: vi.fn().mockResolvedValue({
        kind: 'skill_request',
        normalizedMessage: '做一个会在看到人时打招呼的技能',
      }),
    };
    const service = new AgentService(
      intakeAgent as any,
      new SessionService(),
      configAgent as any,
      undefined,
      dialogueRouter as any
    );
    const result = await service.chat('做一个会在看到人时打招呼的技能', undefined, {
      interactionMode: 'dialogue',
    });

    expect(dialogueRouter.classify).toHaveBeenCalled();
    expect(result.response.type).toBe('dialogue_mode');
    expect(result.response.dialogueMode.branch).toBe('teaching_handoff');
    expect(result.response.dialogueMode.relay).toBeNull();
    expect(intakeAgent.processUserInput).not.toHaveBeenCalled();
  });

  it('returns instant play dialogue mode when hardware is ready', async () => {
    const fixture = createSkillRepoFixture();
    try {
      seedRpsSkill(fixture.repository);
      const intakeAgent = {
        processUserInput: vi.fn(),
      };
      const configAgent = {
        processConfigurationInput: vi.fn(),
      };
      const sessionService = new SessionService();
      const session = sessionService.getOrCreate();
      sessionService.setDialogueModeState(session.id, {
        sessionId: session.id,
        interactionMode: 'dialogue',
        userGoal: '跟我玩石头剪刀布',
        branch: 'hardware_guidance',
        phase: 'waiting_for_insert',
        matchedSkill: null,
        hardwareSnapshot: createReadySnapshot(),
        teachingHandoff: null,
        lastAgentUtterance: '',
        updatedAt: new Date().toISOString(),
      });

      const service = new AgentService(
        intakeAgent as any,
        sessionService,
        configAgent as any,
        fixture.repository
      );
      const result = await service.chat('跟我玩石头剪刀布', session.id, {
        interactionMode: 'dialogue',
      });

      expect(result.response.type).toBe('dialogue_mode');
      expect(result.response.dialogueMode.branch).toBe('instant_play');
      expect(result.response.dialogueMode.phase).toBe('interacting');
      expect(result.response.dialogueMode.physicalCue?.action).toBe('hand_stretch');
      expect(intakeAgent.processUserInput).not.toHaveBeenCalled();
    } finally {
      fixture.cleanup();
    }
  });

  it('saves completed teaching workflow into the real skill library and reuses it for matching', async () => {
    const fixture = createSkillRepoFixture();
    try {
      const intakeAgent = {
        processUserInput: vi.fn(),
      };
      const configAgent = {
        processConfigurationInput: vi.fn(),
      };
      const sessionService = new SessionService();
      const workflow: WorkflowDefinition = {
        name: '石头剪刀布',
        nodes: [],
        connections: {},
      };
      const session = sessionService.getOrCreate('save-skill-session');
      session.workflow = workflow;
      session.workflowSummary = '通过摄像头识别手势，并驱动机械手回应石头剪刀布。';
      session.configAgentState = createCompletedConfigState(workflow);
      session.dialogueModeState = {
        sessionId: session.id,
        interactionMode: 'teaching',
        userGoal: '跟我玩石头剪刀布',
        branch: 'teaching_handoff',
        phase: 'handoff_ready',
        matchedSkill: null,
        hardwareSnapshot: createReadySnapshot(),
        teachingHandoff: {
          sourceSessionId: session.id,
          originalPrompt: '跟我玩石头剪刀布',
          prefilledGoal: '学习石头剪刀布',
          entryMode: 'dialogue_handoff',
          createdAt: new Date().toISOString(),
        },
        lastAgentUtterance: '',
        updatedAt: new Date().toISOString(),
      };
      seedRpsSkill(fixture.repository);
      sessionService.setDialogueModeState(session.id, {
        sessionId: session.id,
        interactionMode: 'dialogue',
        userGoal: '跟我玩石头剪刀布',
        branch: 'hardware_guidance',
        phase: 'waiting_for_insert',
        matchedSkill: null,
        hardwareSnapshot: createReadySnapshot(),
        teachingHandoff: null,
        lastAgentUtterance: '',
        updatedAt: new Date().toISOString(),
      });
      const service = new AgentService(
        intakeAgent as any,
        sessionService,
        configAgent as any,
        fixture.repository
      );

      const saved = service.saveSkill(session.id);
      const listed = service.listSkills();
      const result = await service.chat('跟我玩石头剪刀布', session.id, {
        interactionMode: 'dialogue',
      });

      expect(saved.skillId).toMatch(/^skill-/);
      expect(listed[0]).toEqual(
        expect.objectContaining({
          skillId: saved.skillId,
          displayName: saved.displayName,
        })
      );
      expect(result.response.type).toBe('dialogue_mode');
      expect(result.response.dialogueMode.branch).toBe('instant_play');
      expect(result.response.dialogueMode.librarySkills[0]?.skillId).toBe(saved.skillId);
      expect(result.response.dialogueMode.skill?.skillId).toBe(saved.skillId);
    } finally {
      fixture.cleanup();
    }
  });

  it('validates hardware and starts deploy through dialogue mode state', () => {
    const intakeAgent = {
      processUserInput: vi.fn(),
    };
    const configAgent = {
      processConfigurationInput: vi.fn(),
    };
    const sessionService = new SessionService();
    const session = sessionService.getOrCreate();
    sessionService.setDialogueModeState(session.id, {
      sessionId: session.id,
      interactionMode: 'dialogue',
      userGoal: '跟我玩石头剪刀布',
      branch: 'hardware_guidance',
      phase: 'waiting_for_insert',
      matchedSkill: RPS_SKILL,
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
        missingRequirements: [RPS_SKILL.requiredHardware[1]],
        validationStatus: 'pending',
        lastEventType: 'snapshot',
        lastEventAt: new Date().toISOString(),
      },
      teachingHandoff: null,
      lastAgentUtterance: '',
      updatedAt: new Date().toISOString(),
    });

    const service = new AgentService(intakeAgent as any, sessionService, configAgent as any);
    const validate = service.validateDialogueHardware(session.id, {
      source: 'miniclaw_ws',
      eventType: 'snapshot',
      component: {
        componentId: 'mechanical_hand',
        deviceId: 'hand-001',
        modelId: 'claw-v1',
        displayName: '机械手',
        portId: 'port_2',
        status: 'connected',
      },
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
    });

    expect(validate.type).toBe('dialogue_mode');
    expect(validate.dialogueMode.phase).toBe('ready_to_deploy');
    expect(validate.dialogueMode.uiActions[0]?.id).toBe('start_deploy');
    expect(validate.digitalTwinScene?.['models']).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          device_id: 'camera-001',
          interface_id: 'port_7',
        }),
        expect.objectContaining({
          device_id: 'hand-001',
          interface_id: 'port_2',
        }),
      ])
    );

    const started = service.startDialogueDeploy(session.id);
    expect(started.type).toBe('dialogue_mode');
    expect(started.dialogueMode.phase).toBe('interacting');
    expect(started.dialogueMode.physicalCue?.action).toBe('wake');
  });

  it('omits mock insert actions when matched skill is missing hardware', async () => {
    const fixture = createSkillRepoFixture();
    try {
      seedRpsSkill(fixture.repository);
      const intakeAgent = {
        processUserInput: vi.fn(),
      };
      const configAgent = {
        processConfigurationInput: vi.fn(),
      };
      const sessionService = new SessionService();
      const session = sessionService.getOrCreate();
      sessionService.setDialogueModeState(session.id, {
        sessionId: session.id,
        interactionMode: 'dialogue',
        userGoal: '跟我玩石头剪刀布',
        branch: 'hardware_guidance',
        phase: 'waiting_for_insert',
        matchedSkill: null,
        hardwareSnapshot: {
          source: 'backend_cache',
          connectedComponents: [],
          missingRequirements: [],
          validationStatus: 'idle',
          lastEventType: 'snapshot',
          lastEventAt: new Date().toISOString(),
        },
        teachingHandoff: null,
        lastAgentUtterance: '',
        updatedAt: new Date().toISOString(),
      });

      const service = new AgentService(
        intakeAgent as any,
        sessionService,
        configAgent as any,
        fixture.repository
      );
      const result = await service.chat('跟我玩石头剪刀布', session.id, {
        interactionMode: 'dialogue',
      });

      expect(result.response.type).toBe('dialogue_mode');
      expect(result.response.dialogueMode.branch).toBe('hardware_guidance');
      expect(result.response.dialogueMode.uiActions).toEqual([]);
    } finally {
      fixture.cleanup();
    }
  });

  it('does not project dialogue components to a fallback port when portId is missing', () => {
    const intakeAgent = {
      processUserInput: vi.fn(),
    };
    const configAgent = {
      processConfigurationInput: vi.fn(),
    };
    const sessionService = new SessionService();
    const session = sessionService.getOrCreate();
    sessionService.setDialogueModeState(session.id, {
      sessionId: session.id,
      interactionMode: 'dialogue',
      userGoal: '跟我玩石头剪刀布',
      branch: 'hardware_guidance',
      phase: 'waiting_for_insert',
      matchedSkill: RPS_SKILL,
      hardwareSnapshot: {
        source: 'backend_cache',
        connectedComponents: [],
        missingRequirements: RPS_SKILL.requiredHardware,
        validationStatus: 'pending',
        lastEventType: 'snapshot',
        lastEventAt: new Date().toISOString(),
      },
      teachingHandoff: null,
      lastAgentUtterance: '',
      updatedAt: new Date().toISOString(),
    });

    const service = new AgentService(intakeAgent as any, sessionService, configAgent as any);
    const validate = service.validateDialogueHardware(session.id, {
      source: 'miniclaw_ws',
      eventType: 'snapshot',
      connectedComponents: [
        {
          componentId: 'mechanical_hand',
          deviceId: 'hand-001',
          modelId: 'claw-v1',
          displayName: '机械手',
          portId: '',
          status: 'connected',
        },
      ],
    });

    expect(validate.digitalTwinScene?.['models']).toEqual([
      expect.objectContaining({
        device_id: 'device-001',
      }),
    ]);
  });

  it('routes chat to ConfigAgent when session is configuring', async () => {
    const intakeAgent = {
      processUserInput: vi.fn().mockResolvedValue({ type: 'guidance', message: 'intake' }),
    };
    const configAgent = {
      processConfigurationInput: vi.fn().mockResolvedValue({ type: 'hot_plugging', message: 'config' }),
    };
    const sessionService = new SessionService();
    const session = sessionService.getOrCreate();
    sessionService.setPhase(session.id, 'configuring');

    const service = new AgentService(intakeAgent as any, sessionService, configAgent as any);
    const result = await service.chat('配置输入', session.id);

    expect(result.response.message).toBe('config');
    expect(configAgent.processConfigurationInput).toHaveBeenCalledWith(session.id, '配置输入');
    expect(intakeAgent.processUserInput).not.toHaveBeenCalled();
  });

  it('attaches digital twin scene to configuring responses', async () => {
    const intakeAgent = {
      processUserInput: vi.fn(),
    };
    const configAgent = {
      processConfigurationInput: vi.fn().mockResolvedValue({
        type: 'hot_plugging',
        message: '请插上摄像头',
        currentNode: {
          name: 'camera_node',
          type: 'n8n-nodes-base.httpRequest',
          category: 'CAM',
          index: 1,
          status: 'configuring',
          displayName: '摄像头',
        },
        metadata: {
          workflowId: 'wf-1',
          showConfirmButton: true,
        },
      }),
    };
    const sessionService = new SessionService();
    const session = sessionService.getOrCreate();
    sessionService.setPhase(session.id, 'configuring');
    sessionService.setConfigAgentState(session.id, {
      workflowId: 'wf-1',
      workflowSnapshot: {
        name: 'WF',
        nodes: [],
        connections: {},
      },
      configurableNodes: [
        {
          name: 'wheel_node',
          type: 'n8n-nodes-base.code',
          category: 'WHEEL',
          index: 0,
          status: 'configured',
          displayName: '底盘',
          configValues: {
            topology: 'port_1',
            device_ID: 'wheel-live-001',
          },
        },
        {
          name: 'camera_node',
          type: 'n8n-nodes-base.httpRequest',
          category: 'CAM',
          index: 1,
          status: 'configuring',
          displayName: '摄像头',
        },
      ],
      currentNodeIndex: 1,
      completed: false,
      progress: {
        total: 2,
        completed: 1,
        percentage: 50,
      },
    });

    const service = new AgentService(intakeAgent as any, sessionService, configAgent as any);
    const result = await service.chat('继续', session.id);

    expect(result.response.type).toBe('hot_plugging');
    expect(result.response.digitalTwinScene).toBeTruthy();
    expect(result.response.digitalTwinScene?.['base_model_id']).toBe('model_5');
      expect(result.response.digitalTwinScene?.['models']).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'model_5',
            device_id: 'device-001',
          }),
          expect.objectContaining({
            id: 'model_1',
            interface_id: 'port_1',
            device_id: 'wheel-live-001',
          }),
        ])
      );
    expect(intakeAgent.processUserInput).not.toHaveBeenCalled();
  });

  it('confirms workflow using existing session', async () => {
    const intakeAgent = {
      confirmBlueprint: vi.fn().mockResolvedValue({
        type: 'workflow_ready',
        message: 'ok',
        workflow: { name: 'WF', nodes: [], connections: {} },
      }),
    };
    const configAgent = {
      processConfigurationInput: vi.fn(),
    };
    const sessionService = new SessionService();
    const session = sessionService.getOrCreate();
    const service = new AgentService(intakeAgent as any, sessionService, configAgent as any);

    const result = await service.confirm(session.id);

    expect(result.sessionId).toBe(session.id);
    expect(result.response.type).toBe('workflow_ready');
  });

  it('logs full workflow json document when confirm returns workflow_ready', async () => {
    const workflow = {
      name: 'WF',
      nodes: [{ id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} }],
      connections: {},
    };
    const intakeAgent = {
      confirmBlueprint: vi.fn().mockResolvedValue({
        type: 'workflow_ready',
        message: 'ok',
        workflow,
      }),
    };
    const configAgent = {
      processConfigurationInput: vi.fn(),
    };
    const sessionService = new SessionService();
    const session = sessionService.getOrCreate();
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    const service = new AgentService(intakeAgent as any, sessionService, configAgent as any);

    await service.confirm(session.id);

    expect(infoSpy).toHaveBeenCalledWith(
      'AgentService: workflow JSON document for session %s\n%s',
      session.id,
      JSON.stringify(workflow, null, 2)
    );

    infoSpy.mockRestore();
  });

  it('resets session', () => {
    const intakeAgent = { processUserInput: vi.fn() };
    const configAgent = { processConfigurationInput: vi.fn() };
    const sessionService = new SessionService();
    const session = sessionService.getOrCreate();
    const service = new AgentService(intakeAgent as any, sessionService, configAgent as any);

    sessionService.appendTurn(session.id, 'user', 'hello');
    service.resetSession(session.id);

    const resetSession = sessionService.getSession(session.id);
    expect(resetSession?.history.length).toBe(0);
  });
});
