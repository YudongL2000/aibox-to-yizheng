/**
 * [INPUT]: 依赖 WorkflowArchitect、ground-truth-evaluator、quality-baseline 与结构化场景 fixture
 * [OUTPUT]: 对外提供 Refactor-5 质量门测试，锁定三场景全网开启质量和关键 SafetyNet 退步幅度
 * [POS]: tests/integration/agents 的 CI 质量门入口，被默认 vitest 套件直接执行
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { describe, expect, it } from 'vitest';
import { WorkflowArchitect, type WorkflowSceneSafetyNetFlags } from '../../../src/agents/workflow-architect';
import { evaluateAgainstGroundTruth, type GroundTruthResult } from '../../../src/agents/evaluation/ground-truth-evaluator';
import type { WorkflowDefinition } from '../../../src/agents/types';
import { QUALITY_BASELINES, SAFETY_NET_DELTA_BASELINES } from './quality-baseline';
import {
  buildEmotionQualityWorkflow,
  buildEmotionStructuredWorkflow,
  buildGameStructuredBridgeWorkflow,
  buildGameStructuredMissingAssignWorkflow,
  buildGameStructuredMissingDrawBranchWorkflow,
  buildGameStructuredMissingHandsWorkflow,
  buildGameStructuredSpeakerPairedWorkflow,
  buildGestureStructuredSpeakerPairedWorkflow,
  buildGestureStructuredWorkflow,
  createRequest,
  loadGroundTruth,
} from './safety-net-fixtures';

describe('Refactor-5 Quality Gate', () => {
  it('gesture scene meets quality baseline with safety nets enabled', async () => {
    const result = await runScenario({
      workflow: buildGestureStructuredWorkflow(),
      request: createRequest(
        '见到老刘竖个中指说一句滚，见到老付比个V说你长得好帅',
        { person_name: '老刘,老付', gesture: '中指,V' }
      ),
      groundTruth: loadGroundTruth('docs/development/scene/gesture/gesture_0315.json'),
    });

    assertBaseline('gesture', result.evaluation);
  });

  it('emo scene meets quality baseline with safety nets enabled', async () => {
    const result = await runScenario({
      workflow: buildEmotionQualityWorkflow(),
      request: createRequest('我想做一个和我共情的机器人'),
      groundTruth: loadGroundTruth('docs/development/scene/emo/emo_0310.json'),
    });

    assertBaseline('emo', result.evaluation);
  });

  it('game scene meets quality baseline with safety nets enabled', async () => {
    const result = await runScenario({
      workflow: buildGameStructuredMissingHandsWorkflow(),
      request: createRequest('我想有一个和我玩石头剪刀布的机器人'),
      groundTruth: loadGroundTruth('docs/development/scene/game/game_0203.json'),
    });

    assertBaseline('game', result.evaluation);
  });

  it('tracks gesture safety-net deltas within budget', async () => {
    const groundTruth = loadGroundTruth('docs/development/scene/gesture/gesture_0315.json');
    const request = createRequest(
      '见到老刘竖个中指说一句滚，见到老付比个V说你长得好帅',
      { person_name: '老刘,老付', gesture: '中指,V' }
    );

    await assertDeltaBudget({
      scene: 'gesture',
      safetyNet: 'ensureGestureIdentityFlow',
      workflow: buildGestureStructuredWorkflow(),
      request,
      groundTruth,
    });

    await assertDeltaBudget({
      scene: 'gesture',
      safetyNet: 'ensureSpeakerHasTts',
      workflow: buildGestureStructuredSpeakerPairedWorkflow(),
      request: createRequest('见到老刘后说一句欢迎回来', { person_name: '老刘' }),
      groundTruth,
    });
  });

  it('tracks emo safety-net delta within budget', async () => {
    await assertDeltaBudget({
      scene: 'emo',
      safetyNet: 'ensureEmotionInteractionFlow',
      workflow: buildEmotionStructuredWorkflow(),
      request: createRequest('我想做一个和我共情的机器人'),
      groundTruth: loadGroundTruth('docs/development/scene/emo/emo_0310.json'),
    });
  });

  it('tracks game safety-net deltas within budget', async () => {
    const groundTruth = loadGroundTruth('docs/development/scene/game/game_0203.json');
    const request = createRequest('我想有一个和我玩石头剪刀布的机器人');

    await assertDeltaBudget({
      scene: 'game',
      safetyNet: 'ensureGameHandExecutor',
      workflow: buildGameStructuredMissingHandsWorkflow(),
      request,
      groundTruth,
    });

    await assertDeltaBudget({
      scene: 'game',
      safetyNet: 'ensureResultBranches',
      workflow: buildGameStructuredMissingDrawBranchWorkflow(),
      request,
      groundTruth,
    });

    await assertDeltaBudget({
      scene: 'game',
      safetyNet: 'ensureIfDirectExecutorConnections',
      workflow: buildGameStructuredBridgeWorkflow(),
      request,
      groundTruth,
    });

    await assertDeltaBudget({
      scene: 'game',
      safetyNet: 'ensureHandHasAssign',
      workflow: buildGameStructuredMissingAssignWorkflow(),
      request,
      groundTruth,
    });

    await assertDeltaBudget({
      scene: 'game',
      safetyNet: 'ensureSpeakerHasTts',
      workflow: buildGameStructuredSpeakerPairedWorkflow(),
      request,
      groundTruth,
    });
  });
});

type ScenarioInput = {
  workflow: WorkflowDefinition;
  request: {
    userIntent: string;
    entities: Record<string, string>;
  };
  groundTruth: WorkflowDefinition;
  disabledFlag?: keyof WorkflowSceneSafetyNetFlags;
};

type ScenarioResult = {
  workflow: WorkflowDefinition;
  evaluation: GroundTruthResult;
};

async function runScenario(input: ScenarioInput): Promise<ScenarioResult> {
  const llmClient = {
    chat: async () =>
      ['Reasoning: Quality gate fixture replay.', '```json', JSON.stringify(clone(input.workflow), null, 2), '```'].join('\n'),
  };
  const mcpClient = {
    searchNodes: async () => ({ nodes: [], total: 0 }),
    getNode: async () => ({
      nodeType: 'n8n-nodes-base.code',
      displayName: 'Code',
      defaultVersion: 2,
      properties: [],
    }),
    validateWorkflow: async (workflow: WorkflowDefinition) => ({
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      statistics: {
        totalNodes: Array.isArray(workflow.nodes) ? workflow.nodes.length : 0,
        enabledNodes: Array.isArray(workflow.nodes) ? workflow.nodes.length : 0,
        triggerNodes: 0,
        validConnections: 0,
        invalidConnections: 0,
        expressionsValidated: 0,
      },
    }),
    autofixWorkflow: async () => undefined,
  } as const;

  const architect = new WorkflowArchitect(llmClient as any, mcpClient as any, {
    maxIterations: 1,
    sceneSafetyNetFlags: input.disabledFlag ? { [input.disabledFlag]: false } : {},
  });
  const result = await architect.generateWorkflow({
    userIntent: input.request.userIntent,
    entities: input.request.entities,
    hardwareComponents: [],
    conversationHistory: [],
  });

  expect(result.success).toBe(true);
  expect(result.workflow).toBeDefined();

  const workflow = result.workflow as WorkflowDefinition;
  return {
    workflow,
    evaluation: evaluateAgainstGroundTruth(workflow, input.groundTruth),
  };
}

function assertBaseline(scene: keyof typeof QUALITY_BASELINES, evaluation: GroundTruthResult): void {
  const baseline = QUALITY_BASELINES[scene];
  const actualNodeCount = evaluation.nodeCount.actual;
  const categoryCoverage = readCategoryCoverage(evaluation);

  expect(evaluation.nodeCount.coverage).toBeGreaterThanOrEqual(baseline.minNodeCoverage);
  expect(categoryCoverage).toBeGreaterThanOrEqual(baseline.minCategoryCoverage);
  expect(readMissingRequiredCategories(evaluation, baseline.requiredCategories)).toEqual([]);
  if (typeof baseline.minNodeCount === 'number') {
    expect(actualNodeCount).toBeGreaterThanOrEqual(baseline.minNodeCount);
  }
}

async function assertDeltaBudget(input: {
  scene: keyof typeof SAFETY_NET_DELTA_BASELINES;
  safetyNet: keyof WorkflowSceneSafetyNetFlags;
  workflow: WorkflowDefinition;
  request: {
    userIntent: string;
    entities: Record<string, string>;
  };
  groundTruth: WorkflowDefinition;
}): Promise<void> {
  const budget = SAFETY_NET_DELTA_BASELINES[input.scene][input.safetyNet];
  if (typeof budget !== 'number') {
    throw new Error(`Missing delta budget for ${input.scene}.${input.safetyNet}`);
  }

  const enabled = await runScenario({
    workflow: input.workflow,
    request: input.request,
    groundTruth: input.groundTruth,
  });
  const disabled = await runScenario({
    workflow: input.workflow,
    request: input.request,
    groundTruth: input.groundTruth,
    disabledFlag: input.safetyNet,
  });
  const delta = enabled.evaluation.nodeCount.coverage - disabled.evaluation.nodeCount.coverage;

  console.info(
    `[quality-delta] scene=${input.scene} safetyNet=${input.safetyNet} on=${enabled.evaluation.nodeCount.coverage.toFixed(3)} off=${disabled.evaluation.nodeCount.coverage.toFixed(3)} delta=${delta.toFixed(3)}`
  );
  expect(delta).toBeLessThanOrEqual(budget);
}

function readCategoryCoverage(evaluation: GroundTruthResult): number {
  const expectedCategories = Object.keys(evaluation.categories.expected);
  if (expectedCategories.length === 0) {
    return 1;
  }
  const matched = expectedCategories.filter(
    (category) => (evaluation.categories.actual[category] ?? 0) >= (evaluation.categories.expected[category] ?? 0)
  );
  return matched.length / expectedCategories.length;
}

function readMissingRequiredCategories(
  evaluation: GroundTruthResult,
  requiredCategories: string[]
): string[] {
  return requiredCategories.filter((category) => (evaluation.categories.actual[category] ?? 0) === 0);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
