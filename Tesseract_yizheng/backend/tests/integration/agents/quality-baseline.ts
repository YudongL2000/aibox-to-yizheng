/**
 * [INPUT]: 依赖 workflow-architect scene safety-net 名称，只描述 Refactor-5 质量门的静态阈值
 * [OUTPUT]: 对外提供 QUALITY_BASELINES 与 SAFETY_NET_DELTA_BASELINES 两组集成测试基线
 * [POS]: tests/integration/agents 的质量门真相源，被 quality-gate.test.ts 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import type { WorkflowSceneSafetyNetFlags } from '../../../src/agents/workflow-architect/scene/safety-net-controls';

type SceneBaseline = {
  minNodeCoverage: number;
  minCategoryCoverage: number;
  minNodeCount?: number;
  requiredCategories: string[];
};

type DeltaBaselines = Partial<Record<keyof WorkflowSceneSafetyNetFlags, number>>;

export const QUALITY_BASELINES: Record<'gesture' | 'emo' | 'game', SceneBaseline> = {
  gesture: {
    minNodeCoverage: 0.9,
    minCategoryCoverage: 0.95,
    minNodeCount: 12,
    requiredCategories: ['BASE', 'CAM', 'FACE-NET', 'HAND', 'TTS', 'SPEAKER'],
  },
  emo: {
    minNodeCoverage: 0.85,
    minCategoryCoverage: 0.9,
    requiredCategories: ['BASE', 'CAM', 'MIC', 'ASR', 'LLM-EMO', 'SCREEN', 'HAND', 'TTS', 'SPEAKER'],
  },
  game: {
    minNodeCoverage: 0.7,
    minCategoryCoverage: 0.8,
    requiredCategories: ['BASE', 'CAM', 'YOLO-RPS', 'RAM', 'ASSIGN', 'HAND', 'SCREEN', 'TTS', 'SPEAKER'],
  },
};

export const SAFETY_NET_DELTA_BASELINES: Record<'gesture' | 'emo' | 'game', DeltaBaselines> = {
  gesture: {
    ensureGestureIdentityFlow: 0.15,
    ensureSpeakerHasTts: 0.05,
  },
  emo: {
    ensureEmotionInteractionFlow: 0.25,
  },
  game: {
    ensureGameHandExecutor: 0.15,
    ensureResultBranches: 0.15,
    ensureIfDirectExecutorConnections: 0.15,
    ensureHandHasAssign: 0.15,
    ensureSpeakerHasTts: 0.05,
  },
};
