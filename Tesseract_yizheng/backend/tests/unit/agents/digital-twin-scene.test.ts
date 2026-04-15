/**
 * [INPUT]: 依赖 digital-twin-scene 构造器与 ConfigAgentState 类型，消费配置态节点样本。
 * [OUTPUT]: 对外提供数字孪生投影回归测试，锁住“单一物理硬件只挂载一次”的真相源契约。
 * [POS]: tests/unit/agents 的数字孪生投影测试，防止同 category 多逻辑节点再次把一个物理模块投影成多个模型。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { describe, expect, it } from 'vitest';
import {
  buildDigitalTwinSceneFromConfigState,
  normalizeDigitalTwinInterfaceId,
} from '../../../src/agents/digital-twin-scene';
import type { ConfigAgentState, ConfigurableNode } from '../../../src/agents/types';

function createConfiguredNode(
  overrides: Partial<ConfigurableNode> = {}
): ConfigurableNode {
  return {
    name: overrides.name || 'node',
    type: overrides.type || 'n8n-nodes-base.code',
    category: overrides.category || 'HAND',
    title: overrides.title || '测试节点',
    subtitle: overrides.subtitle || '测试节点描述',
    status: overrides.status || 'configured',
    extra: overrides.extra || 'configured',
    configFields: overrides.configFields || null,
    configValues: overrides.configValues || {},
  };
}

function createConfigState(nodes: ConfigurableNode[]): ConfigAgentState {
  return {
    sessionId: 'session-1',
    workflowId: 'workflow-1',
    workflowName: 'Demo Workflow',
    currentIndex: 0,
    configurableNodes: nodes,
    progress: {
      total: nodes.length,
      completed: nodes.filter((node) => node.status === 'configured').length,
      percentage: 100,
    },
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('buildDigitalTwinSceneFromConfigState', () => {
  it('只暴露真实 5 口并把 mic/speaker 收口到 builtin top controls', () => {
    const state = createConfigState([
      createConfiguredNode({
        name: 'camera_primary',
        category: 'CAM',
        configValues: {
          topology: 'port_3',
          device_ID: 'camera-live-001',
        },
      }),
      createConfiguredNode({
        name: 'hand_primary',
        category: 'HAND',
        configValues: {
          topology: 'port_4',
          device_ID: 'hand-live-001',
        },
      }),
      createConfiguredNode({
        name: 'mic_prompt',
        category: 'MIC',
        configValues: {
          topology: 'port_2',
          device_ID: 'mic-001',
        },
      }),
      createConfiguredNode({
        name: 'speaker_reply',
        category: 'SPEAKER',
        configValues: {
          topology: 'port_1',
          device_ID: 'speaker-001',
        },
      }),
    ]);

    const scene = buildDigitalTwinSceneFromConfigState(state) as {
      models: Array<Record<string, unknown>>;
      interfaces: Array<Record<string, unknown>>;
      top_controls: Array<Record<string, unknown>>;
    };

    expect(scene.interfaces.map((item) => item.id)).toEqual([
      'port_1',
      'port_2',
      'port_3',
      'port_4',
      'port_hdmi',
      'port_7',
    ]);
    expect(scene.top_controls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'builtin_microphone', role: 'microphone', status: 'connected' }),
        expect.objectContaining({ id: 'builtin_speaker', role: 'speaker', status: 'connected' }),
      ])
    );
    expect(scene.models.some((model) => model['id'] === 'model_speaker')).toBe(false);
    expect(scene.models.some((model) => model['id'] === 'model_mic')).toBe(false);
    expect(scene.models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'model_3',
          interface_id: 'port_3',
          device_id: 'camera-live-001',
        }),
        expect.objectContaining({
          id: 'model_4',
          interface_id: 'port_4',
          device_id: 'hand-live-001',
        }),
      ])
    );
  });

  it('同一物理 category 的多个逻辑节点只投影一个挂载模型', () => {
    const state = createConfigState([
      createConfiguredNode({
        name: 'camera_prompt',
        category: 'CAM',
        configValues: {
          topology: 'port_3',
          device_ID: 'camera-001',
        },
      }),
      createConfiguredNode({
        name: 'camera_reply',
        category: 'CAM',
        configValues: {
          topology: 'port_3',
          device_ID: 'camera-001',
        },
      }),
    ]);

    const scene = buildDigitalTwinSceneFromConfigState(state) as {
      models: Array<Record<string, unknown>>;
    };

    const cameraModels = scene.models.filter((model) => model['id'] === 'model_3');
    expect(cameraModels).toHaveLength(1);
    expect(cameraModels[0]).toEqual(
      expect.objectContaining({
        interface_id: 'port_3',
        device_id: 'camera-001',
      })
    );
  });

  it('同类节点冲突时优先选择携带显式 portId 的节点', () => {
    const state = createConfigState([
      createConfiguredNode({
        name: 'wheel_default',
        category: 'WHEEL',
        configValues: {},
      }),
      createConfiguredNode({
        name: 'wheel_bound',
        category: 'WHEEL',
        configValues: {
          portId: 'port_1',
          device_ID: 'wheel-live-001',
        },
      }),
    ]);

    const scene = buildDigitalTwinSceneFromConfigState(state) as {
      models: Array<Record<string, unknown>>;
    };

    const wheelModel = scene.models.find((model) => model['id'] === 'model_1');
    expect(wheelModel).toEqual(
      expect.objectContaining({
        interface_id: 'port_1',
        device_id: 'wheel-live-001',
      })
    );
  });

  it('把物理口别名规范化成 canonical interface id', () => {
    expect(normalizeDigitalTwinInterfaceId('3-1.2')).toBe('port_1');
    expect(normalizeDigitalTwinInterfaceId('3-1.3')).toBe('port_2');
    expect(normalizeDigitalTwinInterfaceId('3-1.4')).toBe('port_3');
    expect(normalizeDigitalTwinInterfaceId('3-1.6')).toBe('port_4');
    expect(normalizeDigitalTwinInterfaceId('3-1.7')).toBe('port_7');
    expect(normalizeDigitalTwinInterfaceId('/dev/hdmi')).toBe('port_hdmi');
  });
});
