/**
 * [INPUT]: 依赖 ReflectionAssessmentParser、硬件能力目录与规范 capability id 常量
 * [OUTPUT]: 验证 reflection assessment 的 JSON 修复、字段归一化与目录过滤行为
 * [POS]: tests/unit/agents 的反思协议解析层护栏测试，防止 parser 逻辑重新回流 engine
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it } from 'vitest';
import { HARDWARE_CAPABILITY_IDS } from '../../../src/agents/hardware-capability-ids';
import { parseReflectionAssessmentResponse } from '../../../src/agents/reflection-assessment-parser';
import type { HardwareCapability, NodeCategory } from '../../../src/agents/types';

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
    dependencies: [],
    confidence: 1,
  };
}

describe('reflection-assessment parser', () => {
  const catalog = [
    createCapability(HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT, 'CAM'),
    createCapability(HARDWARE_CAPABILITY_IDS.SPEAKER.AUDIO_PLAYBACK, 'SPEAKER'),
  ];

  it('parses json embedded in plain text and keeps normalized question options', () => {
    const result = parseReflectionAssessmentResponse(
      '以下是结果：{"decision":"clarify_needed","reasoning_summary":"还缺触发方式。","recognized_requirements":["目标: 看家"],"supported_capability_ids":["camera.snapshot_input"],"missing_info":[{"category":"trigger","description":"触发方式未明确。","priority":1,"blocking":true}],"clarification_questions":[{"question":" 什么时候开始监控？ ","options":[" 看到我 "," 定时触发 "],"priority":1,"context":"trigger"}],"suggested_user_actions":[],"out_of_scope_reasons":[],"confidence":0.61}',
      catalog,
      5
    );

    expect(result?.decision).toBe('clarify_needed');
    expect(result?.supportedCapabilityIds).toEqual([HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT]);
    expect(result?.questions[0]?.question).toBe('什么时候开始监控？');
    expect(result?.questions[0]?.options).toEqual(['看到我', '定时触发']);
  });

  it('filters invalid capability ids and suggested action categories outside missing info', () => {
    const result = parseReflectionAssessmentResponse(
      JSON.stringify({
        decision: 'clarify_needed',
        reasoning_summary: '还缺触发方式。',
        recognized_requirements: ['目标: 看家'],
        supported_capability_ids: [
          HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT,
          'unknown.capability',
        ],
        missing_info: [
          {
            category: 'trigger',
            description: '触发方式未明确。',
            priority: 1,
            blocking: true,
          },
        ],
        clarification_questions: [],
        suggested_user_actions: [
          {
            label: '触发: 看到我就开始',
            value: '看到我就开始',
            reason: '补齐触发方式',
            category: 'trigger',
          },
          {
            label: '反馈: 用语音提醒',
            value: '用语音提醒',
            reason: '补齐反馈方式',
            category: 'feedback',
          },
        ],
        out_of_scope_reasons: [],
        confidence: 0.7,
      }),
      catalog,
      5
    );

    expect(result?.supportedCapabilityIds).toEqual([HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT]);
    expect(result?.suggestedActions.map((item) => item.value)).toEqual(['看到我就开始']);
  });

  it('drops fragmentary question options and low-signal suggested actions', () => {
    const result = parseReflectionAssessmentResponse(
      JSON.stringify({
        decision: 'clarify_needed',
        reasoning_summary: '还缺触发方式。',
        recognized_requirements: ['目标: 猜拳'],
        supported_capability_ids: [HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT],
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
            question: '每局游戏怎么触发？',
            options: ['用', '对着摄像头比手', '  '],
            priority: 1,
            context: 'trigger',
          },
        ],
        suggested_user_actions: [
          {
            label: '用',
            value: '用',
            reason: '无效碎片',
            category: 'trigger',
          },
          {
            label: '触发: 对着摄像头比手',
            value: '对着摄像头比手',
            reason: '这是完整的触发短句。',
            category: 'trigger',
          },
        ],
        out_of_scope_reasons: [],
        confidence: 0.66,
      }),
      catalog,
      5
    );

    expect(result?.questions[0]?.options).toEqual(['对着摄像头比手']);
    expect(result?.suggestedActions.map((item) => item.value)).toEqual(['对着摄像头比手']);
  });

  it('repairs inner quotes in json strings before parsing', () => {
    const raw = '{"decision":"clarify_needed","reasoning_summary":"当前还缺 "触发方式"。","recognized_requirements":[],"supported_capability_ids":[],"missing_info":[{"category":"trigger","description":"触发方式未明确。","priority":1,"blocking":true}],"clarification_questions":[],"suggested_user_actions":[],"out_of_scope_reasons":[],"confidence":0.4}';
    const result = parseReflectionAssessmentResponse(raw, catalog, 5);

    expect(result?.reasoningSummary).toContain('触发方式');
    expect(result?.missingInfo.map((item) => item.category)).toEqual(['trigger']);
  });
});
