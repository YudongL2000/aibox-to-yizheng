/**
 * [INPUT]: 依赖 CapabilityRegistry 与 HARDWARE_COMPONENTS
 * [OUTPUT]: 验证能力注册表的查询、依赖校验与性能基线
 * [POS]: tests/unit/agents 的 Refactor-3 基础设施测试入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { HARDWARE_CAPABILITY_IDS } from '../../../src/agents/hardware-capability-ids';
import { CapabilityRegistry } from '../../../src/agents/capability-registry';
import { HARDWARE_COMPONENTS } from '../../../src/agents/hardware-components';

describe('CapabilityRegistry', () => {
  const registry = new CapabilityRegistry(HARDWARE_COMPONENTS);

  it('builds registry from HARDWARE_COMPONENTS', () => {
    const expectedSize = HARDWARE_COMPONENTS.reduce(
      (count, component) => count + component.capabilities.length,
      0
    );

    expect(registry.listCapabilities()).toHaveLength(expectedSize);
    expect(registry.getCapability(HARDWARE_CAPABILITY_IDS.YOLO_HAND.HAND_GESTURE_RECOGNITION)).toBeDefined();
  });

  it('keeps capabilities synced with capabilityDetails keys', () => {
    HARDWARE_COMPONENTS.forEach((component) => {
      expect(component.capabilities).toEqual(Object.keys(component.capabilityDetails));
    });
  });

  it('builds display name from capabilityDetails metadata', () => {
    const capability = registry.getCapability(HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION);
    const component = HARDWARE_COMPONENTS.find((item) => item.id === 'face_net');
    expect(capability?.displayName).toBe(component?.capabilityDetails.face_recognition?.displayName);
  });

  it('normalizes legacy aliases to canonical capabilities', () => {
    const faceCapability = registry.getCapability('camera.face_recognition');
    const chassisCapability = registry.getCapability('chassis.rotation');

    expect(faceCapability?.id).toBe(HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION);
    expect(chassisCapability?.id).toBe(HARDWARE_CAPABILITY_IDS.WHEEL.MOVEMENT_EXECUTE);
  });

  it('uses scene-defined endpoint when provided', () => {
    const capability = registry.getCapability(HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT);
    expect(capability?.apiEndpoint.url).toBe('http://robot.local/api/camera/snapshot');
    expect(capability?.apiEndpoint.method).toBe('POST');
  });

  it('falls back to default API endpoint for scene capabilities without explicit endpoint', () => {
    const capability = registry.getCapability(HARDWARE_CAPABILITY_IDS.HAND.ARM_EMOTIVE_MOTION);
    expect(capability?.apiEndpoint.url).toBe('http://hardware-api/hand/arm_emotive_motion');
    expect(capability?.apiEndpoint.method).toBe('POST');
  });

  it('queries capability by Chinese keyword', () => {
    const results = registry.query('手势识别');
    expect(results[0]?.id).toBe(HARDWARE_CAPABILITY_IDS.YOLO_HAND.HAND_GESTURE_RECOGNITION);
    expect(
      results.some((item) => item.id === HARDWARE_CAPABILITY_IDS.YOLO_HAND.HAND_GESTURE_RECOGNITION)
    ).toBe(true);
  });

  it('queries capability by keyword array', () => {
    const results = registry.query(['语音', '播报']);
    expect(results.some((item) => item.id === HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION)).toBe(true);
    expect(results.some((item) => item.id === HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK)).toBe(true);
  });

  it('supports fuzzy matching for Chinese phrase', () => {
    const results = registry.query('手势识别功能');
    expect(
      results.some((item) => item.id === HARDWARE_CAPABILITY_IDS.YOLO_HAND.HAND_GESTURE_RECOGNITION)
    ).toBe(true);
  });

  it('supports fuzzy matching for ASCII typo', () => {
    const results = registry.query('gestur recognition');
    expect(
      results.some((item) => item.id === HARDWARE_CAPABILITY_IDS.YOLO_HAND.HAND_GESTURE_RECOGNITION)
    ).toBe(true);
  });

  it('returns empty results for blank query', () => {
    expect(registry.query('   ')).toEqual([]);
    expect(registry.query([])).toEqual([]);
  });

  it('validates dependency composition when dependency is satisfied', () => {
    const result = registry.canCompose([
      HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
      HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION,
    ]);

    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('reports missing dependencies with display-name suggestions', () => {
    const result = registry.canCompose([HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK]);

    expect(result.valid).toBe(false);
    expect(result.missing).toContain(HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION);
    expect(result.suggestions).toContain('音频生成');
  });

  it('handles unknown capability ids safely', () => {
    const result = registry.canCompose(['unknown.capability']);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['unknown.capability']);
    expect(result.suggestions).toEqual(['unknown.capability']);
  });

  it('keeps average query latency under 10ms', () => {
    const totalRuns = 2000;
    const samples = ['手势识别', '语音播报', '底盘旋转', 'face recognition', 'gestur recognition'];
    const start = performance.now();

    for (let index = 0; index < totalRuns; index += 1) {
      registry.query(samples[index % samples.length]);
    }

    const averageLatency = (performance.now() - start) / totalRuns;
    expect(averageLatency).toBeLessThan(10);
  });
});
