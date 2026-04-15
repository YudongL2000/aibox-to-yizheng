/**
 * [INPUT]: 依赖 workflow 对象与 connections 映射结构
 * [OUTPUT]: 提供连线去重、主输出设置、入边查找与边补齐工具
 * [POS]: workflow-architect 子模块的通用连线操作工具
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

import type { WorkflowDefinition } from '../types';

export interface MainEdge {
  node: string;
  type: string;
  index: number;
}

export function dedupeMainEdges(edges: MainEdge[]): MainEdge[] {
  const deduped: MainEdge[] = [];
  const seen = new Set<string>();
  edges.forEach((edge) => {
    const key = `${edge.node}|${edge.type}|${edge.index}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    deduped.push(edge);
  });
  return deduped;
}

export function findIncomingEdges(
  targetName: string,
  connections: Record<string, any>
): Array<{ sourceName: string; outputIndex: number }> {
  const edges: Array<{ sourceName: string; outputIndex: number }> = [];
  for (const [sourceName, mapping] of Object.entries(connections)) {
    const sourceMapping = mapping as { main?: Array<Array<{ node: string }>> };
    const mainOutputs = sourceMapping.main || [];
    mainOutputs.forEach((outputs, outputIndex) => {
      if (!Array.isArray(outputs)) {
        return;
      }
      for (const output of outputs) {
        if (output?.node === targetName) {
          edges.push({ sourceName, outputIndex });
        }
      }
    });
  }
  return edges;
}

export function setOutputPrimaryTarget(
  connections: Record<string, any>,
  fromNode: string,
  toNode: string,
  outputIndex: number
): void {
  const mapping = (connections[fromNode] ?? {}) as { main?: Array<Array<Record<string, any>>> };
  const main = Array.isArray(mapping.main) ? mapping.main : [];
  while (main.length <= outputIndex) {
    main.push([]);
  }
  main[outputIndex] = [{ node: toNode, type: 'main', index: 0 }];
  mapping.main = main;
  connections[fromNode] = mapping;
}

export function ensureEdge(
  workflow: WorkflowDefinition,
  sourceName: string,
  targetName: string
): void {
  if (!sourceName || !targetName) {
    return;
  }
  const connections = workflow.connections as Record<string, any>;
  const sourceMapping = (connections[sourceName] ?? {}) as { main?: Array<any> };
  const main = Array.isArray(sourceMapping.main?.[0]) ? sourceMapping.main![0] : [];
  const hasTarget = main.some((entry: any) => entry?.node === targetName);
  if (!hasTarget) {
    main.push({ node: targetName, type: 'main', index: 0 });
  }
  sourceMapping.main = [main];
  connections[sourceName] = sourceMapping;
}

