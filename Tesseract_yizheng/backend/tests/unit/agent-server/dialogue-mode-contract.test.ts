/**
 * [INPUT]: 依赖 AgentService、SessionService 与 dialogue-mode 领域类型
 * [OUTPUT]: 锁住 dialogue-mode 响应必须附带 backend-first digital twin scene
 * [POS]: tests/unit/agent-server 的对话模式契约守护测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it, vi } from 'vitest';
import { AgentService } from '../../../src/agent-server/agent-service';
import { SessionService } from '../../../src/agents/session-service';
import type {
  DialogueModeHardwareSnapshot,
  DialogueModeMatchedSkill,
} from '../../../src/agents/types';

const RPS_SKILL: DialogueModeMatchedSkill = {
  skillId: 'skill_rps',
  displayName: '石头剪刀布',
  matchStatus: 'matched',
  confidence: 0.98,
  gameplayGuide: '装备全齐，来玩吧。',
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

describe('dialogue-mode contract', () => {
  it('attaches digital twin scene to instant-play dialogue responses', async () => {
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
      branch: 'instant_play',
      phase: 'interacting',
      matchedSkill: RPS_SKILL,
      hardwareSnapshot: createReadySnapshot(),
      teachingHandoff: null,
      lastAgentUtterance: '',
      updatedAt: new Date().toISOString(),
    });

    const hardwareRuntime = {
      getDialogueHardwareSnapshot: () => ({
        source: 'mqtt_runtime',
        connectedComponents: [
          {
            componentId: 'camera',
            deviceId: 'camera-rt-001',
            modelId: '',
            displayName: '摄像头',
            portId: 'port_3',
            status: 'connected',
          },
          {
            componentId: 'mechanical_hand',
            deviceId: 'hand-rt-001',
            modelId: '',
            displayName: '机械手',
            portId: 'port_4',
            status: 'connected',
          },
        ],
        missingRequirements: [],
        validationStatus: 'success',
        lastEventType: 'heartbeat',
        lastEventAt: new Date().toISOString(),
      }),
    };

    const service = new AgentService(
      intakeAgent as any,
      sessionService,
      configAgent as any,
      undefined,
      undefined,
      hardwareRuntime as any
    );
    const result = await service.chat('跟我玩石头剪刀布', session.id, {
      interactionMode: 'dialogue',
    });

    expect(result.response.type).toBe('dialogue_mode');
    expect(result.response.digitalTwinScene).toBeDefined();

    const scene = result.response.digitalTwinScene as {
      models: Array<Record<string, unknown>>;
    };
    expect(scene.models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          device_id: 'device-001',
          url: '/assets/assets/models/base.glb',
        }),
        expect.objectContaining({
          device_id: 'camera-rt-001',
          interface_id: 'port_3',
          url: '/assets/assets/models/cam.glb',
        }),
        expect.objectContaining({
          device_id: 'hand-rt-001',
          interface_id: 'port_4',
          url: '/assets/assets/models/hand.glb',
        }),
      ])
    );
  });
});
