/**
 * [INPUT]: 依赖 fs/path 读取 docs/development/scene ground truth，依赖 ground-truth-evaluator 做结构评分
 * [OUTPUT]: 锁住 gesture / emo / game 场景的自评基线与关键评分维度
 * [POS]: tests/integration/agents 的 ground truth 回归入口，只验证评估器，不参与运行时生成
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateAgainstGroundTruth } from '../../../src/agents/evaluation/ground-truth-evaluator';

const REPO_ROOT = process.cwd();

const SCENES = [
  {
    name: 'gesture',
    file: 'docs/development/scene/gesture/gesture_0315.json',
    expectedCategories: ['BASE', 'CAM', 'FACE-NET', 'HAND', 'TTS', 'SPEAKER'],
  },
  {
    name: 'emo',
    file: 'docs/development/scene/emo/emo_0310.json',
    expectedCategories: ['BASE', 'CAM', 'MIC', 'ASR', 'LLM-EMO', 'SCREEN', 'HAND', 'SPEAKER'],
  },
  {
    name: 'game',
    file: 'docs/development/scene/game/game_0203.json',
    expectedCategories: ['BASE', 'CAM', 'YOLO-RPS', 'RAM', 'ASSIGN', 'HAND', 'TTS', 'SPEAKER', 'SCREEN'],
  },
] as const;

describe('Ground Truth Evaluation', () => {
  for (const scene of SCENES) {
    it(`${scene.name}: self-evaluation keeps baseline at 100%`, () => {
      const groundTruth = loadGroundTruth(scene.file);
      const result = evaluateAgainstGroundTruth(groundTruth, groundTruth);

      expect(result.nodeCount.coverage).toBe(1);
      expect(result.topologyScore).toBe(1);
      expect(result.notesCompleteness).toBe(1);
      expect(result.variableFlowIntegrity).toBe(true);
      expect(result.categories.missing).toEqual([]);
      scene.expectedCategories.forEach((category) => {
        expect(result.categories.expected[category]).toBeGreaterThan(0);
      });
    });
  }
});

function loadGroundTruth(relativePath: string) {
  return JSON.parse(
    readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8')
  );
}
