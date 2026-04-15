/**
 * [INPUT]: 依赖 ComponentComposer、CapabilityRegistry 与规范 capability id
 * [OUTPUT]: 验证能力组合后的节点拓扑与 code 节点最小模板
 * [POS]: tests/unit/agents 的组件组合守护测试，防止执行器节点重新退回空参数
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it } from 'vitest';
import { HARDWARE_CAPABILITY_IDS } from '../../../src/agents/hardware-capability-ids';
import { CapabilityRegistry } from '../../../src/agents/capability-registry';
import { ComponentComposer } from '../../../src/agents/component-composer';
import { HARDWARE_COMPONENTS } from '../../../src/agents/hardware-components';

type ConnectionMap = Record<string, { main?: Array<Array<{ node?: string }>> }>;

function extractTargets(connections: ConnectionMap, source: string): string[] {
  const lanes = connections[source]?.main ?? [];
  return lanes.flatMap((lane) => lane.map((edge) => edge.node).filter((value): value is string => Boolean(value)));
}

describe('ComponentComposer', () => {
  it('maps capabilities to nodes and builds topology automatically', async () => {
    const registry = new CapabilityRegistry(HARDWARE_COMPONENTS);
    const composer = new ComponentComposer(registry);
    const capabilities = registry.getByIds([
      HARDWARE_CAPABILITY_IDS.YOLO_HAND.HAND_GESTURE_RECOGNITION,
      HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK,
      HARDWARE_CAPABILITY_IDS.SCREEN.EMOJI_DISPLAY,
    ]);

    const workflow = await composer.compose(capabilities, {
      trigger_type: 'webhook',
      conditions: [{ leftValue: '={{$json.ok}}', rightValue: true }],
      timeoutMs: 1200,
    });

    expect(workflow.nodes.length).toBeGreaterThanOrEqual(5);
    expect(workflow.nodes.some((node) => (node as Record<string, unknown>).name === 'webhook_trigger')).toBe(true);
    expect(workflow.nodes.some((node) => String((node as Record<string, unknown>).type).includes('.if'))).toBe(true);

    const connections = workflow.connections as ConnectionMap;
    const webhookTargets = extractTargets(connections, 'webhook_trigger');
    expect(webhookTargets.length).toBeGreaterThan(0);
    const codeNodes = workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.code');
    expect(codeNodes.length).toBeGreaterThan(0);
    codeNodes.forEach((node) => {
      expect(node.parameters).toMatchObject({
        language: 'javaScript',
        jsCode: 'return items;',
      });
    });
  });

  it('auto-includes required dependencies before composing', async () => {
    const registry = new CapabilityRegistry(HARDWARE_COMPONENTS);
    const composer = new ComponentComposer(registry);
    const capabilities = registry.getByIds([HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK]);

    const workflow = await composer.compose(capabilities, { trigger_type: 'scheduleTrigger' });
    const nodeNames = workflow.nodes.map((node) => String((node as Record<string, unknown>).name));

    expect(nodeNames.some((name) => name.startsWith('tts_audio_generation'))).toBe(true);
    expect(nodeNames.some((name) => name.startsWith('speaker_audio_playback'))).toBe(true);
  });
});
