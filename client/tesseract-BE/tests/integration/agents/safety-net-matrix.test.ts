/**
 * [INPUT]: 依赖 WorkflowArchitect 的 scene safety-net flags、ground-truth-evaluator 与 safety-net-fixtures 场景库，对同一原始 workflow 做开/关对照
 * [OUTPUT]: 对外提供 Refactor-5 SafetyNet 对照测试，逐场景验证关键 safety net 的必要性
 * [POS]: tests/integration/agents 的 SafetyNet 矩阵回归入口，消费独立 fixture 库来判断哪些后处理仍然必须保留
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { describe, expect, it } from 'vitest';
import { WorkflowArchitect, type WorkflowSceneSafetyNetFlags } from '../../../src/agents/workflow-architect';
import { evaluateAgainstGroundTruth } from '../../../src/agents/evaluation/ground-truth-evaluator';
import type { WorkflowDefinition } from '../../../src/agents/types';
import {
  buildEmotionDuplicateWorkflow,
  buildEmotionStructuredWorkflow,
  buildGameBridgeWorkflow,
  buildGameMissingHandWorkflow,
  buildGameStructuredBridgeWorkflow,
  buildGameStructuredMissingAssignWorkflow,
  buildGameStructuredMissingDrawBranchWorkflow,
  buildGameStructuredMissingHandsWorkflow,
  buildGameStructuredSpeakerPairedWorkflow,
  buildGameSharedResultWorkflow,
  buildGestureRedundantTtsWorkflow,
  buildGestureStructuredSpeakerPairedWorkflow,
  buildGestureStructuredWorkflow,
  buildGestureSharedIdentityWorkflow,
  buildGestureSpeakerRelayWorkflow,
  buildGestureSpeakerWithoutTtsWorkflow,
  buildHandWithoutAssignWorkflow,
  createRequest,
  loadGroundTruth,
} from './safety-net-fixtures';

describe('WorkflowArchitect SafetyNet Matrix', () => {
  describe('gesture scene', () => {
    it('ensureGestureIdentityFlow lifts multi-person gesture topology toward ground truth', async () => {
      const groundTruth = loadGroundTruth('docs/development/scene/gesture/gesture_0315.json');
      const request = createRequest(
        '见到老刘竖个中指说一句滚，见到老付比个V说你长得好帅',
        { person_name: '老刘,老付', gesture: '中指,V' }
      );

      const enabled = await runContrast({
        workflow: buildGestureSharedIdentityWorkflow(),
        request,
        groundTruth,
      });
      const disabled = await runContrast({
        workflow: buildGestureSharedIdentityWorkflow(),
        request,
        groundTruth,
        disabledFlag: 'ensureGestureIdentityFlow',
      });

      expect(readCategoryCount(enabled.workflow, 'FACE-NET')).toBeGreaterThan(readCategoryCount(disabled.workflow, 'FACE-NET'));
      expect(enabled.evaluation.nodeCount.coverage).toBeGreaterThan(disabled.evaluation.nodeCount.coverage);
    });

    it('ensureSpeakerHasTts inserts missing TTS bridge in gesture-like audio chain', async () => {
      const groundTruth = loadGroundTruth('docs/development/scene/gesture/gesture_0315.json');
      const request = createRequest('见到老刘后播放一段语音', { person_name: '老刘' });

      const enabled = await runContrast({
        workflow: buildGestureSpeakerWithoutTtsWorkflow(),
        request,
        groundTruth,
      });
      const disabled = await runContrast({
        workflow: buildGestureSpeakerWithoutTtsWorkflow(),
        request,
        groundTruth,
        disabledFlag: 'ensureSpeakerHasTts',
      });

      expect(readCategoryCount(enabled.workflow, 'TTS')).toBeGreaterThan(readCategoryCount(disabled.workflow, 'TTS'));
      expect(readIncomingSources(enabled.workflow, 'code_speaker_play_audio').some((name) => /^set_tts_for_/.test(name))).toBe(true);
      expect(readIncomingSources(disabled.workflow, 'code_speaker_play_audio').some((name) => /^set_tts_for_/.test(name))).toBe(false);
    });

    it('pruneGestureRedundantTtsNodes removes redundant gesture TTS relay node', async () => {
      const request = createRequest('见到老刘后说一句欢迎回来', { person_name: '老刘' });

      const enabled = await runContrast({
        workflow: buildGestureRedundantTtsWorkflow(),
        request,
      });
      const disabled = await runContrast({
        workflow: buildGestureRedundantTtsWorkflow(),
        request,
        disabledFlag: 'pruneGestureRedundantTtsNodes',
      });

      expect(findNode(enabled.workflow, 'set_tts_bridge_welcome')).toBeUndefined();
      expect(findNode(disabled.workflow, 'set_tts_bridge_welcome')).toBeDefined();
      expect(readPrimaryTarget(enabled.workflow, 'set_tts_text_welcome')).toBe('code_speaker_play_audio');
      expect(readPrimaryTarget(disabled.workflow, 'set_tts_text_welcome')).toBe('set_tts_bridge_welcome');
    });

    it('pruneSpeakerRelayNodes removes duplicate speaker relay and rewires downstream target', async () => {
      const request = createRequest('见到老刘后播放欢迎语音并显示表情', { person_name: '老刘' });

      const enabled = await runContrast({
        workflow: buildGestureSpeakerRelayWorkflow(),
        request,
      });
      const disabled = await runContrast({
        workflow: buildGestureSpeakerRelayWorkflow(),
        request,
        disabledFlag: 'pruneSpeakerRelayNodes',
      });

      expect(findNode(enabled.workflow, 'code_speaker_relay')).toBeUndefined();
      expect(findNode(disabled.workflow, 'code_speaker_relay')).toBeDefined();
      expect(readPrimaryTarget(enabled.workflow, 'code_speaker_primary')).toBe('code_screen_execute_emoji_happy');
      expect(readPrimaryTarget(disabled.workflow, 'code_speaker_primary')).toBe('code_speaker_relay');
    });

    it('keeps gesture scene above 0.8 coverage without ensureGestureIdentityFlow after fragment strengthening', async () => {
      const groundTruth = loadGroundTruth('docs/development/scene/gesture/gesture_0315.json');
      const request = createRequest(
        '见到老刘竖个中指说一句滚，见到老付比个V说你长得好帅',
        { person_name: '老刘,老付', gesture: '中指,V' }
      );

      const enabled = await runContrast({
        workflow: buildGestureStructuredWorkflow(),
        request,
        groundTruth,
      });
      const disabled = await runContrast({
        workflow: buildGestureStructuredWorkflow(),
        request,
        groundTruth,
        disabledFlag: 'ensureGestureIdentityFlow',
      });

      expect(disabled.evaluation.nodeCount.coverage).toBeGreaterThanOrEqual(0.8);
      expect(enabled.evaluation.nodeCount.coverage - disabled.evaluation.nodeCount.coverage).toBeLessThanOrEqual(0.15);
    });

    it('keeps speaker pairing intact without ensureSpeakerHasTts for structured gesture output', async () => {
      const request = createRequest('见到老刘后说一句欢迎回来', { person_name: '老刘' });

      const enabled = await runContrast({
        workflow: buildGestureStructuredSpeakerPairedWorkflow(),
        request,
      });
      const disabled = await runContrast({
        workflow: buildGestureStructuredSpeakerPairedWorkflow(),
        request,
        disabledFlag: 'ensureSpeakerHasTts',
      });

      expect(findSpeakerWithoutTts(enabled.workflow)).toEqual([]);
      expect(findSpeakerWithoutTts(disabled.workflow)).toEqual([]);
    });
  });

  describe('emo scene', () => {
    it('ensureEmotionInteractionFlow collapses duplicated ASR/LLM-EMO nodes into singleton chain', async () => {
      const groundTruth = loadGroundTruth('docs/development/scene/emo/emo_0310.json');
      const request = createRequest('我想做一个和我共情的机器人');

      const enabled = await runContrast({
        workflow: buildEmotionDuplicateWorkflow(),
        request,
        groundTruth,
      });
      const disabled = await runContrast({
        workflow: buildEmotionDuplicateWorkflow(),
        request,
        groundTruth,
        disabledFlag: 'ensureEmotionInteractionFlow',
      });

      expect(readCategoryCount(enabled.workflow, 'ASR')).toBe(1);
      expect(readCategoryCount(enabled.workflow, 'LLM-EMO')).toBe(1);
      expect(enabled.evaluation.categories.missing.length).toBeLessThan(disabled.evaluation.categories.missing.length);
      expect(enabled.evaluation.nodeCount.coverage).toBeGreaterThan(disabled.evaluation.nodeCount.coverage);
    });

    it('keeps emo scene usable without safety net after fragment strengthening', async () => {
      const groundTruth = loadGroundTruth('docs/development/scene/emo/emo_0310.json');
      const request = createRequest('我想做一个和我共情的机器人');

      const enabled = await runContrast({
        workflow: buildEmotionStructuredWorkflow(),
        request,
        groundTruth,
      });
      const disabled = await runContrast({
        workflow: buildEmotionStructuredWorkflow(),
        request,
        groundTruth,
        disabledFlag: 'ensureEmotionInteractionFlow',
      });

      expect(disabled.evaluation.nodeCount.coverage).toBeGreaterThanOrEqual(0.7);
      expect(enabled.evaluation.nodeCount.coverage).toBeGreaterThanOrEqual(0.95);
      expect(enabled.evaluation.nodeCount.coverage).toBeGreaterThanOrEqual(disabled.evaluation.nodeCount.coverage);
    });
  });

  describe('game scene', () => {
    it('ensureGameHandExecutor restores per-gesture HAND nodes', async () => {
      const groundTruth = loadGroundTruth('docs/development/scene/game/game_0203.json');
      const request = createRequest('我想有一个和我玩石头剪刀布的机器人');

      const enabled = await runContrast({
        workflow: buildGameMissingHandWorkflow(),
        request,
        groundTruth,
      });
      const disabled = await runContrast({
        workflow: buildGameMissingHandWorkflow(),
        request,
        groundTruth,
        disabledFlag: 'ensureGameHandExecutor',
      });

      expect(readCategoryCount(enabled.workflow, 'HAND')).toBeGreaterThan(readCategoryCount(disabled.workflow, 'HAND'));
      expect(enabled.evaluation.nodeCount.coverage).toBeGreaterThan(disabled.evaluation.nodeCount.coverage);
    });

    it('keeps game scene within 15% coverage drop without ensureGameHandExecutor on structured output', async () => {
      const groundTruth = loadGroundTruth('docs/development/scene/game/game_0203.json');
      const request = createRequest('我想有一个和我玩石头剪刀布的机器人');

      const enabled = await runContrast({
        workflow: buildGameStructuredMissingHandsWorkflow(),
        request,
        groundTruth,
      });
      const disabled = await runContrast({
        workflow: buildGameStructuredMissingHandsWorkflow(),
        request,
        groundTruth,
        disabledFlag: 'ensureGameHandExecutor',
      });

      expect(enabled.evaluation.nodeCount.coverage - disabled.evaluation.nodeCount.coverage).toBeLessThanOrEqual(0.15);
    });

    it('ensureResultBranches expands shared result output into win/draw/lose chains', async () => {
      const groundTruth = loadGroundTruth('docs/development/scene/game/game_0203.json');
      const request = createRequest('我想有一个和我玩石头剪刀布的机器人');

      const enabled = await runContrast({
        workflow: buildGameSharedResultWorkflow(),
        request,
        groundTruth,
      });
      const disabled = await runContrast({
        workflow: buildGameSharedResultWorkflow(),
        request,
        groundTruth,
        disabledFlag: 'ensureResultBranches',
      });

      expect(readCategoryCount(enabled.workflow, 'SCREEN')).toBeGreaterThan(readCategoryCount(disabled.workflow, 'SCREEN'));
      expect(readCategoryCount(enabled.workflow, 'TTS')).toBeGreaterThan(readCategoryCount(disabled.workflow, 'TTS'));
      expect(readCategoryCount(enabled.workflow, 'SPEAKER')).toBeGreaterThan(readCategoryCount(disabled.workflow, 'SPEAKER'));
      expect(enabled.evaluation.nodeCount.coverage).toBeGreaterThan(disabled.evaluation.nodeCount.coverage);
      expect(findNode(enabled.workflow, 'code_screen_execute_draw_angry')).toBeDefined();
      expect(findNode(disabled.workflow, 'code_screen_execute_draw_angry')).toBeUndefined();
    });

    it('keeps game scene within 15% coverage drop without ensureResultBranches on structured output', async () => {
      const groundTruth = loadGroundTruth('docs/development/scene/game/game_0203.json');
      const request = createRequest('我想有一个和我玩石头剪刀布的机器人');

      const enabled = await runContrast({
        workflow: buildGameStructuredMissingDrawBranchWorkflow(),
        request,
        groundTruth,
      });
      const disabled = await runContrast({
        workflow: buildGameStructuredMissingDrawBranchWorkflow(),
        request,
        groundTruth,
        disabledFlag: 'ensureResultBranches',
      });

      expect(enabled.evaluation.nodeCount.coverage - disabled.evaluation.nodeCount.coverage).toBeLessThanOrEqual(0.15);
    });

    it('ensureIfDirectExecutorConnections removes relay SET nodes between IF and executors', async () => {
      const request = createRequest('我想有一个和我玩石头剪刀布的机器人');

      const enabled = await runContrast({
        workflow: buildGameBridgeWorkflow(),
        request,
      });
      const disabled = await runContrast({
        workflow: buildGameBridgeWorkflow(),
        request,
        disabledFlag: 'ensureIfDirectExecutorConnections',
      });

      expect(findNode(enabled.workflow, 'set_robot_rock_bridge')).toBeUndefined();
      expect(findNode(enabled.workflow, 'set_screen_win_bridge')).toBeUndefined();
      expect(findNode(disabled.workflow, 'set_robot_rock_bridge')).toBeDefined();
      expect(findNode(disabled.workflow, 'set_screen_win_bridge')).toBeDefined();
      expect(readPrimaryTarget(enabled.workflow, 'if_robot_choice')).toBe('code_hand_rock');
      expect(readPrimaryTarget(enabled.workflow, 'if_result_win')).toBe('code_screen_win');
      expect(readPrimaryTarget(disabled.workflow, 'if_robot_choice')).toBe('set_robot_rock_bridge');
      expect(readPrimaryTarget(disabled.workflow, 'if_result_win')).toBe('set_screen_win_bridge');
    });

    it('keeps game scene within 15% coverage drop without ensureIfDirectExecutorConnections on structured output', async () => {
      const groundTruth = loadGroundTruth('docs/development/scene/game/game_0203.json');
      const request = createRequest('我想有一个和我玩石头剪刀布的机器人');

      const enabled = await runContrast({
        workflow: buildGameStructuredBridgeWorkflow(),
        request,
        groundTruth,
      });
      const disabled = await runContrast({
        workflow: buildGameStructuredBridgeWorkflow(),
        request,
        groundTruth,
        disabledFlag: 'ensureIfDirectExecutorConnections',
      });

      expect(enabled.evaluation.nodeCount.coverage - disabled.evaluation.nodeCount.coverage).toBeLessThanOrEqual(0.15);
      expect(readPrimaryTarget(enabled.workflow, 'if_robot_n_eq_1')).toBe('code_hand_execute_rock');
      expect(readPrimaryTarget(disabled.workflow, 'if_robot_n_eq_1')).toBe('set_robot_rock_bridge');
    });

    it('ensureHandHasAssign inserts ASSIGN bridge after HAND executor', async () => {
      const request = createRequest('我想有一个和我玩石头剪刀布的机器人');

      const enabled = await runContrast({
        workflow: buildHandWithoutAssignWorkflow(),
        request,
      });
      const disabled = await runContrast({
        workflow: buildHandWithoutAssignWorkflow(),
        request,
        disabledFlag: 'ensureHandHasAssign',
      });

      expect(readCategoryCount(enabled.workflow, 'ASSIGN')).toBeGreaterThan(readCategoryCount(disabled.workflow, 'ASSIGN'));
      const enabledHand = findNodeByCategory(enabled.workflow, 'HAND');
      const disabledHand = findNodeByCategory(disabled.workflow, 'HAND');
      expect(readPrimaryTarget(enabled.workflow, String(enabledHand?.name || ''))).toMatch(/^set_assign_for_/);
      expect(readPrimaryTarget(disabled.workflow, String(disabledHand?.name || ''))).toBe('http_camera_snapshot');
    });

    it('keeps game scene within 15% coverage drop without ensureHandHasAssign on structured output', async () => {
      const groundTruth = loadGroundTruth('docs/development/scene/game/game_0203.json');
      const request = createRequest('我想有一个和我玩石头剪刀布的机器人');

      const enabled = await runContrast({
        workflow: buildGameStructuredMissingAssignWorkflow(),
        request,
        groundTruth,
      });
      const disabled = await runContrast({
        workflow: buildGameStructuredMissingAssignWorkflow(),
        request,
        groundTruth,
        disabledFlag: 'ensureHandHasAssign',
      });

      expect(enabled.evaluation.nodeCount.coverage - disabled.evaluation.nodeCount.coverage).toBeLessThanOrEqual(0.15);
    });

    it('keeps speaker pairing intact without ensureSpeakerHasTts for structured game output', async () => {
      const request = createRequest('我想有一个和我玩石头剪刀布的机器人');

      const enabled = await runContrast({
        workflow: buildGameStructuredSpeakerPairedWorkflow(),
        request,
      });
      const disabled = await runContrast({
        workflow: buildGameStructuredSpeakerPairedWorkflow(),
        request,
        disabledFlag: 'ensureSpeakerHasTts',
      });

      expect(findSpeakerWithoutTts(enabled.workflow)).toEqual([]);
      expect(findSpeakerWithoutTts(disabled.workflow)).toEqual([]);
    });
  });
});

type ContrastResult = {
  workflow: WorkflowDefinition;
  evaluation: ReturnType<typeof evaluateAgainstGroundTruth>;
};

async function runContrast(input: {
  workflow: WorkflowDefinition;
  request: {
    userIntent: string;
    entities: Record<string, string>;
  };
  groundTruth?: WorkflowDefinition;
  disabledFlag?: keyof WorkflowSceneSafetyNetFlags;
}): Promise<ContrastResult> {
  const llmClient = {
    chat: async () =>
      ['Reasoning: SafetyNet 对照测试。', '```json', JSON.stringify(clone(input.workflow), null, 2), '```'].join('\n'),
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
        triggerNodes: Array.isArray(workflow.nodes)
          ? workflow.nodes.filter((node) => String((node as Record<string, unknown>)?.type || '').includes('Trigger')).length
          : 0,
        validConnections: countEdges(workflow),
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
    evaluation: evaluateAgainstGroundTruth(
      workflow,
      input.groundTruth ?? workflow
    ),
  };
}

function readCategoryCount(workflow: WorkflowDefinition, category: string): number {
  return normalizeNodes(workflow).filter((node) => node.notes?.category === category).length;
}

function readPrimaryTarget(workflow: WorkflowDefinition, sourceName: string): string | undefined {
  const mapping = workflow.connections?.[sourceName] as
    | { main?: Array<Array<{ node?: string }>> }
    | undefined;
  return mapping?.main?.[0]?.[0]?.node;
}

function readIncomingSources(workflow: WorkflowDefinition, targetName: string): string[] {
  if (!workflow.connections || typeof workflow.connections !== 'object') {
    return [];
  }

  return Object.entries(workflow.connections).flatMap(([sourceName, mapping]) => {
    const main = Array.isArray((mapping as { main?: unknown[] })?.main)
      ? ((mapping as { main: unknown[] }).main)
      : [];
    const hits = main.some((branch) =>
      Array.isArray(branch) && branch.some((edge) => (edge as { node?: string })?.node === targetName)
    );
    return hits ? [sourceName] : [];
  });
}

function findSpeakerWithoutTts(workflow: WorkflowDefinition): string[] {
  return normalizeNodes(workflow)
    .filter((node) => node.notes?.category === 'SPEAKER')
    .map((node) => String(node.name || ''))
    .filter((speakerName) => {
      const incoming = readIncomingSources(workflow, speakerName);
      return !incoming.some((sourceName) => {
        const sourceNode = findNode(workflow, sourceName);
        return sourceNode?.notes?.category === 'TTS';
      });
    });
}

function findNode(workflow: WorkflowDefinition, nodeName: string) {
  return normalizeNodes(workflow).find((node) => node.name === nodeName);
}

function findNodeByCategory(workflow: WorkflowDefinition, category: string) {
  return normalizeNodes(workflow).find((node) => node.notes?.category === category);
}

function normalizeNodes(workflow: WorkflowDefinition) {
  return (Array.isArray(workflow.nodes) ? workflow.nodes : []) as Array<Record<string, any>>;
}

function countEdges(workflow: WorkflowDefinition): number {
  if (!workflow.connections || typeof workflow.connections !== 'object') {
    return 0;
  }

  return Object.values(workflow.connections).reduce((total, mapping) => {
    const main = Array.isArray((mapping as { main?: unknown[] })?.main)
      ? ((mapping as { main: unknown[] }).main)
      : [];
    return total + main.reduce((sum, branch) => sum + (Array.isArray(branch) ? branch.length : 0), 0);
  }, 0);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
