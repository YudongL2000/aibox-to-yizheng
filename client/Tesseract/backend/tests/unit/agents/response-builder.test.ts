/**
 * [INPUT]: 依赖 OrchestratorResponseBuilder、HardwareComponent、ReflectionResult 类型
 * [OUTPUT]: 验证 response-builder 的 markdown 格式化、澄清选项 fallback、组合失败响应
 * [POS]: tests/unit/agents 的响应构建层测试
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { describe, expect, it } from 'vitest';
import type { HardwareComponent } from '../../../src/agents/hardware-components';
import type { ReflectionResult } from '../../../src/agents/reflection-engine';
import { OrchestratorResponseBuilder } from '../../../src/agents/orchestrator/response-builder';
import type { HardwareCapability, OrchestratorState, WorkflowBlueprint } from '../../../src/agents/types';

// ========== 测试用固定数据 ==========

const MOCK_COMPONENTS: HardwareComponent[] = [
  {
    id: 'camera',
    name: 'camera',
    lookupNames: ['摄像头'],
    displayName: '摄像头模块',
    nodeType: 'n8n-nodes-base.httpRequest',
    category: 'CAM',
    defaultConfig: {},
    capabilityDetails: {},
    capabilities: ['face_detect', 'snapshot'],
  },
  {
    id: 'speaker',
    name: 'speaker',
    lookupNames: ['扬声器'],
    displayName: '扬声器模块',
    nodeType: 'n8n-nodes-base.httpRequest',
    category: 'SPEAKER',
    defaultConfig: {},
    capabilityDetails: {},
    capabilities: ['tts_play'],
  },
];

const MOCK_CAPABILITIES: HardwareCapability[] = [
  {
    id: 'face_detect',
    component: 'camera',
    capability: 'face_detect',
    displayName: '人脸检测',
    keywords: ['人脸'],
    nodeType: 'n8n-nodes-base.httpRequest',
    category: 'CAM',
    apiEndpoint: { method: 'POST', path: '/api/camera/detect' },
    dependencies: [],
    confidence: 0.9,
  },
  {
    id: 'tts_play',
    component: 'speaker',
    capability: 'tts_play',
    displayName: '语音播报',
    keywords: ['说话'],
    nodeType: 'n8n-nodes-base.httpRequest',
    category: 'SPEAKER',
    apiEndpoint: { method: 'POST', path: '/api/speaker/tts' },
    dependencies: [],
    confidence: 0.8,
  },
];

function makeReflection(overrides: Partial<ReflectionResult> = {}): ReflectionResult {
  return {
    decision: 'clarify_needed',
    complete: false,
    confidence: 0.5,
    missing_info: [
      { category: 'trigger', description: '需要确认触发方式', priority: 1, blocking: true },
      { category: 'feedback', description: '确认反馈形式', priority: 2, blocking: true },
    ],
    clarification_questions: [
      { question: '什么时候触发？', options: ['定时', '手动'], priority: 1, context: 'trigger' },
    ],
    reasoning_summary: '已识别视觉与语音组件，需确认串联逻辑。',
    recognized_requirements: ['看到人脸后打招呼', '使用语音播报'],
    suggested_user_actions: [],
    supported_capability_ids: ['face_detect', 'tts_play'],
    out_of_scope_reasons: [],
    can_proceed: false,
    ...overrides,
  };
}

const MOCK_BLUEPRINT: WorkflowBlueprint = {
  intentSummary: '看到人脸就打招呼',
  triggers: [{ type: 'webhook', config: {} }],
  logic: [],
  executors: [],
  missingFields: ['trigger'],
  componentSelection: {
    trigger: 'webhook',
    inputs: ['人脸检测'],
    processes: [],
    decisions: [],
    outputs: ['语音播报'],
    topology: 'webhook -> 人脸检测 -> 语音播报',
    minimumNodes: 3,
    componentAssembly: ['webhook', '人脸检测', '语音播报'],
  },
};

function buildDecision(
  builder: OrchestratorResponseBuilder,
  intent: string,
  caps: HardwareCapability[],
  reflection: ReflectionResult
) {
  const state = builder.buildState(intent, caps, reflection, intent, ['人脸', '打招呼']);
  return builder.buildDecisionResponse(state, MOCK_BLUEPRINT, intent, caps, reflection);
}

// ========== 测试 ==========

describe('OrchestratorResponseBuilder', () => {
  const builder = new OrchestratorResponseBuilder(MOCK_COMPONENTS);

  // ---- T008: markdown 格式化验证 ----

  describe('buildGuidanceResponse markdown output', () => {
    it('guidance message 包含 bold 段落标题与 bullet list', () => {
      const response = buildDecision(builder, '看到人脸就打招呼', MOCK_CAPABILITIES, makeReflection());
      const msg = response.message;

      expect(msg).toContain('**已匹配能力**');
      expect(msg).toContain('- **摄像头模块**');
      expect(msg).toContain('- **扬声器模块**');
      expect(msg).toContain('**已理解需求**');
      expect(msg).toContain('1. 看到人脸后打招呼');
      expect(msg).toContain('2. 使用语音播报');
      expect(msg).toContain('**当前判断**');
      expect(msg).toContain('**当前先确认**');
      expect(msg).toContain('触发方式');
      expect(msg).toContain('**后续待确认**');
      expect(msg).toMatch(/^>/m); // blockquote 提示行
    });

    it('无能力时不输出 bullet list', () => {
      const response = buildDecision(builder, '你好', [], makeReflection({ supported_capability_ids: [] }));
      expect(response.message).toContain('还没有匹配到足够明确的硬件能力');
      expect(response.message).not.toContain('**已匹配能力**');
    });

    it('reject 响应使用 markdown 段落', () => {
      const response = buildDecision(builder, '帮我写一首诗', [], makeReflection({
        decision: 'reject_out_of_scope',
        out_of_scope_reasons: ['诗歌不属于机器人控制'],
      }));
      expect(response.message).toContain('**超出边界的原因**');
      expect(response.message).toContain('- 诗歌不属于机器人控制');
      expect(response.message).toMatch(/^>/m);
    });
  });

  describe('buildSummaryMessage markdown output', () => {
    it('summary 包含 bold 段落标题和 blockquote', () => {
      const msg = builder.buildSummaryMessage(
        '看到人脸就打招呼',
        MOCK_CAPABILITIES,
        makeReflection({ decision: 'direct_accept' })
      );
      expect(msg).toContain('**能力组合**');
      expect(msg).toContain('- **摄像头模块**');
      expect(msg).toContain('**需求总结**');
      expect(msg).toContain('> 如果这就是你的目标');
    });
  });

  describe('buildPendingGuidanceResponse markdown output', () => {
    it('pending guidance 包含 bold 段落标题', () => {
      const state = builder.buildState(
        '看到人脸就打招呼',
        MOCK_CAPABILITIES,
        makeReflection(),
        '看到人脸就打招呼',
        ['人脸', '打招呼']
      );
      const response = builder.buildPendingGuidanceResponse(state);

      expect(response.message).toContain('**当前已明确**');
      expect(response.message).toContain('**当前判断**');
      expect(response.message).toContain('**当前先确认**');
    });
  });

  // ---- T010: 澄清选项 fallback 验证 ----

  describe('clarification options fallback', () => {
    it('questions 无 options 时仅为当前优先环节合成具体中文候选', () => {
      const reflection = makeReflection({
        clarification_questions: [
          { question: '什么时候触发？', priority: 1, context: 'trigger' },
          { question: '如何反馈？', priority: 2, context: 'feedback' },
        ],
        suggested_user_actions: [],
      });

      const response = buildDecision(builder, '看到人脸就打招呼', MOCK_CAPABILITIES, reflection);

      // interaction 不应为 undefined（fallback 应该产生了选项）
      expect(response.interaction).toBeDefined();
      expect(response.interaction!.options.length).toBeGreaterThanOrEqual(2);

      const labels = response.interaction!.options.map((o) => o.label);
      expect(labels).toContain('对着机器人说话');
      expect(labels).toContain('识别到对应人脸表情');

      const values = response.interaction!.options.map((o) => o.value);
      expect(values.every((value) => !value.endsWith('_clarify'))).toBe(true);
      expect(values.some((value) => value.includes('对机器人说话'))).toBe(true);
      expect(labels.some((l) => l.includes('语音回复'))).toBe(false);
    });

    // ---- T011: suggested_user_actions 优先于 missing_info fallback ----

    it('有 suggested_user_actions 时不触发 missing_info fallback', () => {
      const reflection = makeReflection({
        clarification_questions: [
          { question: '什么时候触发？', priority: 1, context: 'trigger' },
        ],
        suggested_user_actions: [
          { label: '定时每5秒', value: 'timer_5s', reason: '常见选择', category: 'trigger' },
          { label: '手动按钮', value: 'manual', reason: '手动控制', category: 'trigger' },
        ],
      });

      const response = buildDecision(builder, '看到人脸就打招呼', MOCK_CAPABILITIES, reflection);

      expect(response.interaction).toBeDefined();
      const values = response.interaction!.options.map((o) => o.value);
      expect(values).toContain('timer_5s');
      expect(values).toContain('manual');
      // 不应含 fallback 生成的 _clarify 后缀
      expect(values.every((v) => !v.endsWith('_clarify'))).toBe(true);
    });
  });

  // ---- T008/T009: 组合失败响应 ----

  describe('buildCompositionFailureResponse', () => {
    function makeState(overrides: Partial<OrchestratorState> = {}): OrchestratorState {
      return {
        decision: 'clarify_needed',
        capabilityIds: ['face_detect', 'tts_play'],
        missingFields: ['trigger'],
        userIntent: '看到人脸就打招呼',
        confidenceScore: 0.5,
        reasoningSummary: '已识别视觉与语音组件',
        canProceed: false,
        phase: 'composition',
        ...overrides,
      } as OrchestratorState;
    }

    it('返回 guidance 类型且包含中文失败消息和建议', () => {
      const response = builder.buildCompositionFailureResponse(
        new Error('Request was aborted.'),
        1,
        makeState()
      );

      expect(response.type).toBe('guidance');
      expect(response.message).toContain('工作流生成过程中遇到问题');
      expect(response.message).toContain('Request was aborted.');
      expect(response.message).toContain('**建议**');
      expect((response as { suggestions?: string[] }).suggestions).toBeDefined();
      expect((response as { suggestions?: string[] }).suggestions!.length).toBeGreaterThanOrEqual(2);
    });

    it('第 3 次失败包含降级建议', () => {
      const response = builder.buildCompositionFailureResponse(
        new Error('timeout'),
        3,
        makeState()
      );

      const suggestions = (response as { suggestions?: string[] }).suggestions ?? [];
      expect(suggestions).toContain('请尝试简化需求或分步描述');
    });

    it('前 2 次失败不包含降级建议', () => {
      const response = builder.buildCompositionFailureResponse(
        new Error('timeout'),
        2,
        makeState()
      );

      const suggestions = (response as { suggestions?: string[] }).suggestions ?? [];
      expect(suggestions.every((s) => !s.includes('简化需求'))).toBe(true);
    });

    it('包含 reasoningSummary 时消息中展示当前理解', () => {
      const response = builder.buildCompositionFailureResponse(
        new Error('fail'),
        1,
        makeState({ reasoningSummary: '识别到摄像头和语音模块' })
      );

      expect(response.message).toContain('**当前理解**');
      expect(response.message).toContain('识别到摄像头和语音模块');
    });

    it('metadata 中 showConfirmBuildButton 为 true 以允许重试', () => {
      const response = builder.buildCompositionFailureResponse(
        new Error('fail'),
        1,
        makeState()
      );

      expect((response as { metadata?: { showConfirmBuildButton?: boolean } }).metadata?.showConfirmBuildButton).toBe(true);
    });
  });
});
