/**
 * [INPUT]: 依赖 agents/types 的 WorkflowDefinition
 * [OUTPUT]: 对外提供 GroundTruthResult 与 evaluateAgainstGroundTruth 评估入口
 * [POS]: agents/evaluation 的结构评估器，只读取生成结果与 ground truth 做对比，不参与运行时生成
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { WorkflowDefinition } from '../types';

export interface GroundTruthResult {
  nodeCount: { expected: number; actual: number; coverage: number };
  categories: {
    expected: Record<string, number>;
    actual: Record<string, number>;
    missing: string[];
    extra: string[];
  };
  topologyScore: number;
  notesCompleteness: number;
  variableFlowIntegrity: boolean;
}

type WorkflowNode = Record<string, unknown>;

const PRODUCED_SUB_KEYS = new Set([
  'output',
  'mic_output',
  'facenet_output',
  'yolov_output',
  'asr_output',
  'llm_emo_output',
  'audio_name',
]);

const CONSUMED_SUB_KEYS = new Set([
  'facenet_input',
  'yolov_input',
  'asr_input',
  'llm_emo_input',
  'audio_name',
]);

export function evaluateAgainstGroundTruth(
  actual: WorkflowDefinition,
  expected: WorkflowDefinition
): GroundTruthResult {
  const actualNodes = normalizeNodes(actual);
  const expectedNodes = normalizeNodes(expected);

  return {
    nodeCount: {
      expected: expectedNodes.length,
      actual: actualNodes.length,
      coverage: calculateCoverage(actualNodes.length, expectedNodes.length),
    },
    categories: evaluateCategories(actualNodes, expectedNodes),
    topologyScore: evaluateTopologyScore(actual.connections, expected.connections),
    notesCompleteness: evaluateNotesCompleteness(actualNodes),
    variableFlowIntegrity: evaluateVariableFlowIntegrity(actualNodes),
  };
}

function normalizeNodes(workflow: WorkflowDefinition): WorkflowNode[] {
  return Array.isArray(workflow.nodes)
    ? workflow.nodes.filter((node): node is WorkflowNode => Boolean(node && typeof node === 'object'))
    : [];
}

function calculateCoverage(actualCount: number, expectedCount: number): number {
  if (expectedCount === 0) {
    return 1;
  }
  return Math.min(actualCount, expectedCount) / expectedCount;
}

function evaluateCategories(actualNodes: WorkflowNode[], expectedNodes: WorkflowNode[]) {
  const actual = countCategories(actualNodes);
  const expected = countCategories(expectedNodes);
  const allCategories = new Set([...Object.keys(expected), ...Object.keys(actual)]);

  const missing = Array.from(allCategories).filter(
    (category) => (expected[category] ?? 0) > (actual[category] ?? 0)
  );
  const extra = Array.from(allCategories).filter(
    (category) => (actual[category] ?? 0) > (expected[category] ?? 0)
  );

  return { expected, actual, missing, extra };
}

function countCategories(nodes: WorkflowNode[]): Record<string, number> {
  return nodes.reduce<Record<string, number>>((counts, node) => {
    const category = readString(readRecord(node.notes)?.category);
    if (!category) {
      return counts;
    }
    counts[category] = (counts[category] ?? 0) + 1;
    return counts;
  }, {});
}

function evaluateTopologyScore(
  actualConnections: WorkflowDefinition['connections'],
  expectedConnections: WorkflowDefinition['connections']
): number {
  const actualFanOut = collectFanOutSources(actualConnections);
  const expectedFanOut = collectFanOutSources(expectedConnections);

  if (expectedFanOut.size === 0) {
    return actualFanOut.size === 0 ? 1 : 0;
  }

  let matched = 0;
  expectedFanOut.forEach((nodeName) => {
    if (actualFanOut.has(nodeName)) {
      matched += 1;
    }
  });

  return matched / expectedFanOut.size;
}

function collectFanOutSources(connections: WorkflowDefinition['connections']): Set<string> {
  if (!connections || typeof connections !== 'object') {
    return new Set();
  }

  return Object.entries(connections).reduce((fanOut, [sourceName, mapping]) => {
    const mainTargets = readMainTargets(mapping);
    if (mainTargets.length > 1) {
      fanOut.add(sourceName);
    }
    return fanOut;
  }, new Set<string>());
}

function readMainTargets(mapping: unknown): string[] {
  const record = readRecord(mapping);
  const main = Array.isArray(record?.main) ? record.main : [];
  return main
    .flatMap((branch) =>
      Array.isArray(branch)
        ? branch.map((edge) => readString(readRecord(edge)?.node)).filter(Boolean)
        : []
    )
    .filter((nodeName): nodeName is string => Boolean(nodeName));
}

function evaluateNotesCompleteness(nodes: WorkflowNode[]): number {
  if (nodes.length === 0) {
    return 1;
  }

  const scored = nodes.map((node) => {
    const notes = readRecord(node.notes);
    const fields = [
      readString(notes?.title),
      readString(notes?.subtitle),
      readString(notes?.category),
      readRecord(notes?.sub),
    ];
    const present = fields.filter((field) => {
      if (typeof field === 'string') {
        return field.length > 0;
      }
      return Boolean(field);
    }).length;
    return present / fields.length;
  });

  return scored.reduce((sum, score) => sum + score, 0) / scored.length;
}

function evaluateVariableFlowIntegrity(nodes: WorkflowNode[]): boolean {
  const produced = new Set<string>();
  const consumed = new Set<string>();

  nodes.forEach((node) => {
    const sub = readRecord(readRecord(node.notes)?.sub);
    if (!sub) {
      return;
    }

    Object.entries(sub).forEach(([key, value]) => {
      const text = readString(value);
      if (!text || !looksLikeVariable(text)) {
        return;
      }
      if (PRODUCED_SUB_KEYS.has(key)) {
        produced.add(text);
      }
      if (CONSUMED_SUB_KEYS.has(key)) {
        consumed.add(text);
      }
    });
  });

  return Array.from(consumed).every((name) => produced.has(name));
}

function looksLikeVariable(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
