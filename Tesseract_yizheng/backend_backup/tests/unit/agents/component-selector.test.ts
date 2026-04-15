/**
 * [INPUT]: 依赖 ComponentSelector 与组件库
 * [OUTPUT]: 验证能力驱动组件选择与拓扑输出
 * [POS]: agents 单元测试，覆盖组件选择器核心路径
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it } from 'vitest';
import { ComponentSelector } from '../../../src/agents/component-selector';
import { WORKFLOW_COMPONENTS } from '../../../src/agents/prompts/workflow-components';

describe('ComponentSelector', () => {
  it('selects person reaction composition from entities', () => {
    const selector = new ComponentSelector(WORKFLOW_COMPONENTS);
    const selection = selector.select('见到老刘竖个中指', {
      person_name: '老刘',
      gesture: '中指',
    });

    expect(selection.trigger).toBe('schedule_trigger');
    expect(selection.inputs).toContain('camera_input');
    expect(selection.processes).toContain('face_net_recognition');
    expect(selection.decisions).toContain('single_condition');
    expect(selection.outputs).toContain('mechanical_hand_execute');
    expect(selection.topology).toContain('人脸身份识别');
    expect(selection.componentAssembly.length).toBeGreaterThan(0);
  });

  it('selects emotion feedback composition from keywords', () => {
    const selector = new ComponentSelector(WORKFLOW_COMPONENTS);
    const selection = selector.select('当我难过时安慰我', {});

    expect(selection.processes).toContain('structbert_emotion');
    expect(selection.decisions).toContain('multi_condition_or');
    expect(selection.outputs).toContain('screen_display');
    expect(selection.outputs).toContain('tts_speaker_output');
  });

  it('selects gesture game composition without scenario template', () => {
    const selector = new ComponentSelector(WORKFLOW_COMPONENTS);
    const selection = selector.select('我想玩石头剪刀布', {});

    expect(selection.inputs).toContain('camera_input');
    expect(selection.processes).toContain('yolov8_gesture');
    expect(selection.decisions).toContain('multi_condition_and');
    expect(selection.outputs).toContain('mechanical_hand_execute');
    expect(selection.outputs).toContain('screen_display');
    expect(selection.outputs).toContain('tts_speaker_output');
    expect(selection.minimumNodes).toBeGreaterThanOrEqual(8);
  });

  it('injects microphone chain when emotion source is microphone', () => {
    const selector = new ComponentSelector(WORKFLOW_COMPONENTS);
    const selection = selector.select('请根据语音安慰我', { emotion_source: 'microphone' });

    expect(selection.inputs).toContain('microphone_input');
    expect(selection.processes).toContain('asr_recognize');
  });

  it('keeps component assembly deduplicated', () => {
    const selector = new ComponentSelector(WORKFLOW_COMPONENTS);
    const selection = selector.select('说句话并显示表情', {
      speech_content: '你好',
      screen_emoji: '开心',
    });

    const deduped = new Set(selection.componentAssembly);
    expect(deduped.size).toBe(selection.componentAssembly.length);
  });
});
