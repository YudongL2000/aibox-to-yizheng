/**
 * [INPUT]: 依赖连接工具、notes 标准化与 node-rules 的 identity 规则
 * [OUTPUT]: 对外提供 WorkflowTopologyResolver，负责连接、图遍历与节点去重修复
 * [POS]: workflow-architect/node 的拓扑层，被 normalizer 与 scene flows 共同消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { randomUUID } from 'crypto';
import { WorkflowDefinition } from '../../types';
import { normalizeNodeNotes } from '../../../utils/node-notes';
import {
  dedupeMainEdges as dedupeMainEdgesUtil,
  ensureEdge as ensureEdgeUtil,
  findIncomingEdges as findIncomingEdgesUtil,
  type MainEdge,
  setOutputPrimaryTarget as setOutputPrimaryTargetUtil,
} from '../connection-utils';

export class WorkflowTopologyResolver {
  normalizeConnections(workflow: WorkflowDefinition): void {
    if (!workflow.connections || typeof workflow.connections !== 'object') {
      return;
    }
    const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
    const idToName = new Map<string, string>();
    nodes.forEach((node) => {
      if (typeof node?.id === 'string' && typeof node?.name === 'string') {
        idToName.set(node.id, node.name);
      }
    });

    const normalized: Record<string, unknown> = {};
    Object.entries(workflow.connections).forEach(([source, mapping]) => {
      const sourceName = idToName.get(source) ?? source;
      normalized[sourceName] = this.normalizeConnectionMapping(mapping, idToName);
    });
    workflow.connections = normalized as WorkflowDefinition['connections'];
  }

  addDefaultConnections(workflow: WorkflowDefinition): void {
    const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
    if (nodes.length < 2) {
      return;
    }

    const connections: Record<string, any> = workflow.connections ?? {};
    for (let index = 0; index < nodes.length - 1; index += 1) {
      const source = nodes[index];
      const target = nodes[index + 1];
      const sourceName = typeof source?.name === 'string' ? source.name : null;
      const targetName = typeof target?.name === 'string' ? target.name : null;
      if (!sourceName || !targetName) {
        continue;
      }

      const entry = (connections[sourceName] ?? {}) as { main?: Array<any> };
      if (source.type === 'n8n-nodes-base.if') {
        const trueBranch = Array.isArray(entry.main?.[0]) ? entry.main![0] : [];
        trueBranch.push({ node: targetName, type: 'main', index: 0 });
        const falseBranch = Array.isArray(entry.main?.[1]) ? entry.main![1] : [];
        entry.main = [trueBranch, falseBranch];
      } else {
        const main = Array.isArray(entry.main?.[0]) ? entry.main![0] : [];
        main.push({ node: targetName, type: 'main', index: 0 });
        entry.main = [main];
      }

      connections[sourceName] = entry;
    }

    workflow.connections = connections as WorkflowDefinition['connections'];
  }

  remapConnectionNodeNames(workflow: WorkflowDefinition, nameRemap: Map<string, string>): void {
    if (!workflow.connections || typeof workflow.connections !== 'object' || nameRemap.size === 0) {
      return;
    }
    const remappedConnections: Record<string, unknown> = {};
    Object.entries(workflow.connections).forEach(([sourceName, mapping]) => {
      const nextSourceName = nameRemap.get(sourceName) ?? sourceName;
      const nextMapping = this.remapConnectionTargets(mapping, nameRemap);
      remappedConnections[nextSourceName] = nextMapping;
    });
    workflow.connections = remappedConnections as WorkflowDefinition['connections'];
  }

  ensureNodeIds(nodes: Array<Record<string, any>>): void {
    const seen = new Set<string>();
    nodes.forEach((node) => {
      if (!node || typeof node !== 'object') {
        return;
      }
      let id = typeof node.id === 'string' ? node.id : '';
      if (!id || seen.has(id)) {
        id = randomUUID();
        node.id = id;
      }
      seen.add(id);
    });
  }

  ensureUniqueNodeNames(
    nodes: Array<Record<string, any>>,
    nameRemap: Map<string, string>
  ): void {
    const usedNames = new Set<string>();
    const counters = new Map<string, number>();

    nodes.forEach((node, index) => {
      if (!node || typeof node !== 'object') {
        return;
      }
      const currentName =
        typeof node.name === 'string' && node.name.trim()
          ? node.name.trim()
          : `node_${index + 1}`;
      let nextName = currentName;
      if (usedNames.has(currentName)) {
        const baseCount = counters.get(currentName) ?? 0;
        let counter = baseCount + 1;
        nextName = `${currentName}_${counter}`;
        while (usedNames.has(nextName)) {
          counter += 1;
          nextName = `${currentName}_${counter}`;
        }
        counters.set(currentName, counter);
      } else {
        counters.set(currentName, counters.get(currentName) ?? 0);
      }

      usedNames.add(nextName);
      if (nextName !== currentName) {
        node.name = nextName;
        nameRemap.set(currentName, nextName);
      }
    });
  }

  pruneRedundantSetNodes(workflow: WorkflowDefinition): void {
    if (!Array.isArray(workflow.nodes) || !workflow.connections || typeof workflow.connections !== 'object') {
      return;
    }

    const removableNames = workflow.nodes
      .filter((node) => this.isRedundantSetNode(node, workflow))
      .map((node) => String(node.name || ''))
      .filter(Boolean);

    removableNames.forEach((nodeName) => {
      this.pruneSinglePassthroughNode(workflow, nodeName);
    });
  }

  pruneSinglePassthroughNode(workflow: WorkflowDefinition, nodeName: string): void {
    const connections = workflow.connections as Record<string, any>;
    const incomingEdges: Array<{ source: string; outputIndex: number }> = [];
    const outgoingTargets: Array<{ node: string; type: string; index: number }> = [];

    Object.entries(connections).forEach(([source, mapping]) => {
      const main = Array.isArray(mapping?.main) ? mapping.main : [];
      main.forEach((group: Array<{ node: string; type: string; index: number }>, outputIndex: number) => {
        if (!Array.isArray(group)) {
          return;
        }
        group.forEach((connection) => {
          if (connection?.node !== nodeName) {
            return;
          }
          incomingEdges.push({ source, outputIndex });
        });
      });
    });

    const currentMapping = connections[nodeName];
    const currentMain = Array.isArray(currentMapping?.main) ? currentMapping.main : [];
    const firstBranch = Array.isArray(currentMain[0]) ? currentMain[0] : [];
    firstBranch.forEach((connection) => {
      const targetNode = typeof connection?.node === 'string' ? connection.node : null;
      if (!targetNode) {
        return;
      }
      outgoingTargets.push({
        node: targetNode,
        type: typeof connection?.type === 'string' ? connection.type : 'main',
        index: typeof connection?.index === 'number' ? connection.index : 0,
      });
    });

    incomingEdges.forEach(({ source, outputIndex }) => {
      const mapping = connections[source];
      const main = Array.isArray(mapping?.main) ? mapping.main : [];
      const group = Array.isArray(main[outputIndex]) ? main[outputIndex] : [];
      const filtered = group.filter((connection: { node?: string }) => connection?.node !== nodeName);
      const merged = [...filtered, ...outgoingTargets];
      main[outputIndex] = this.dedupeMainEdges(merged);
      mapping.main = main;
      connections[source] = mapping;
    });

    delete connections[nodeName];
    workflow.nodes = workflow.nodes.filter((node) => String(node?.name || '') !== nodeName);
  }

  removeNodeCompletely(workflow: WorkflowDefinition, nodeName: string): void {
    if (!Array.isArray(workflow.nodes) || !workflow.connections || typeof workflow.connections !== 'object') {
      return;
    }
    const connections = workflow.connections as Record<string, any>;
    Object.values(connections).forEach((mapping) => {
      const mainOutputs = Array.isArray((mapping as any)?.main) ? (mapping as any).main : [];
      mainOutputs.forEach((group: Array<Record<string, any>>) => {
        if (!Array.isArray(group)) {
          return;
        }
        for (let i = group.length - 1; i >= 0; i -= 1) {
          if (group[i]?.node === nodeName) {
            group.splice(i, 1);
          }
        }
      });
    });
    delete connections[nodeName];
    workflow.nodes = workflow.nodes.filter((node) => String(node?.name || '') !== nodeName);
  }

  findPredecessors(
    nodeName: string,
    nodes: Array<Record<string, any>>,
    connections: Record<string, any>
  ): Array<Record<string, any>> {
    const incomingEdges = this.findIncomingEdges(nodeName, connections);
    const nodeByName = new Map(nodes.map((node) => [String(node.name || ''), node] as const));
    return incomingEdges
      .map((edge) => nodeByName.get(edge.sourceName))
      .filter((node): node is Record<string, any> => Boolean(node));
  }

  findIncomingEdges(
    nodeName: string,
    connections: Record<string, any>
  ): Array<{ sourceName: string; outputIndex: number }> {
    return findIncomingEdgesUtil(nodeName, connections).map(({ sourceName, outputIndex }) => ({
      sourceName,
      outputIndex,
    }));
  }

  findSuccessors(
    nodeName: string,
    nodes: Array<Record<string, any>>,
    connections: Record<string, any>
  ): Array<Record<string, any>> {
    const targetNames = this.findOutgoingTargets(nodeName, connections);
    const nodeByName = new Map(nodes.map((node) => [String(node.name || ''), node] as const));
    return targetNames
      .map((name) => nodeByName.get(name))
      .filter((node): node is Record<string, any> => Boolean(node));
  }

  findOutgoingTargets(nodeName: string, connections: Record<string, any>): string[] {
    const mapping = connections[nodeName];
    const mainOutputs = Array.isArray(mapping?.main) ? mapping.main : [];
    const targets: string[] = [];
    mainOutputs.forEach((group: Array<Record<string, any>>) => {
      if (!Array.isArray(group)) {
        return;
      }
      group.forEach((edge) => {
        const targetName = typeof edge?.node === 'string' ? edge.node : '';
        if (targetName) {
          targets.push(targetName);
        }
      });
    });
    return Array.from(new Set(targets));
  }

  redirectEdge(
    connections: Record<string, any>,
    sourceName: string,
    oldTargetName: string,
    newTargetName: string
  ): void {
    const mapping = connections[sourceName];
    const mainOutputs = Array.isArray(mapping?.main) ? mapping.main : [];
    mainOutputs.forEach((group: Array<Record<string, any>>) => {
      if (!Array.isArray(group)) {
        return;
      }
      group.forEach((edge) => {
        if (edge?.node === oldTargetName) {
          edge.node = newTargetName;
        }
      });
    });
    mapping.main = mainOutputs;
    connections[sourceName] = mapping;
  }

  ensureEdge(workflow: WorkflowDefinition, sourceName: string, targetName: string): void {
    ensureEdgeUtil(workflow, sourceName, targetName);
  }

  dedupeMainEdges(edges: MainEdge[]): MainEdge[] {
    return dedupeMainEdgesUtil(edges);
  }

  setOutputPrimaryTarget(
    connections: Record<string, any>,
    sourceName: string,
    targetName: string,
    outputIndex: number
  ): void {
    setOutputPrimaryTargetUtil(connections, sourceName, targetName, outputIndex);
  }

  retainPrimaryTriggerChain(workflow: WorkflowDefinition): void {
    if (!Array.isArray(workflow.nodes) || !workflow.connections || typeof workflow.connections !== 'object') {
      return;
    }
    const primaryTriggerName = this.findPrimaryTriggerNodeName(workflow.nodes as Array<Record<string, any>>);
    if (!primaryTriggerName) {
      return;
    }
    const connections = workflow.connections as Record<string, any>;
    const preserved = new Set<string>();
    const queue = [primaryTriggerName];

    while (queue.length > 0) {
      const currentName = queue.shift();
      if (!currentName || preserved.has(currentName)) {
        continue;
      }
      preserved.add(currentName);
      this.findOutgoingTargets(currentName, connections).forEach((targetName) => {
        if (targetName && !preserved.has(targetName)) {
          queue.push(targetName);
        }
      });
    }

    workflow.nodes = workflow.nodes.filter((node) => {
      const nodeName = typeof node?.name === 'string' ? node.name : '';
      return !nodeName || preserved.has(nodeName);
    });

    const filteredConnections: Record<string, any> = {};
    Object.entries(connections).forEach(([sourceName, mapping]) => {
      if (!preserved.has(sourceName)) {
        return;
      }
      const mainOutputs = Array.isArray((mapping as any)?.main) ? (mapping as any).main : [];
      const normalizedMain = mainOutputs.map((group: Array<Record<string, any>>) => {
        if (!Array.isArray(group)) {
          return [];
        }
        return this.dedupeMainEdges(
          group.filter((edge) => {
            const targetName = typeof edge?.node === 'string' ? edge.node : '';
            return !targetName || preserved.has(targetName);
          }) as MainEdge[]
        );
      });
      filteredConnections[sourceName] = {
        ...(mapping as Record<string, unknown>),
        main: normalizedMain,
      };
    });
    workflow.connections = filteredConnections as WorkflowDefinition['connections'];
  }

  private normalizeConnectionMapping(mapping: unknown, idToName: Map<string, string>): unknown {
    if (!mapping || typeof mapping !== 'object') {
      return mapping;
    }
    const result: Record<string, unknown> = {};
    Object.entries(mapping as Record<string, unknown>).forEach(([key, groups]) => {
      if (!Array.isArray(groups)) {
        result[key] = groups;
        return;
      }
      result[key] = groups.map((group) => {
        if (!Array.isArray(group)) {
          return group;
        }
        return group.map((connection) => {
          if (!connection || typeof connection !== 'object') {
            return connection;
          }
          const nodeRef = (connection as { node?: string }).node;
          const nodeName = nodeRef ? idToName.get(nodeRef) ?? nodeRef : nodeRef;
          return { ...(connection as Record<string, unknown>), node: nodeName };
        });
      });
    });
    return result;
  }

  private remapConnectionTargets(mapping: unknown, nameRemap: Map<string, string>): unknown {
    if (!mapping || typeof mapping !== 'object') {
      return mapping;
    }
    const result: Record<string, unknown> = {};
    Object.entries(mapping as Record<string, unknown>).forEach(([key, groups]) => {
      if (!Array.isArray(groups)) {
        result[key] = groups;
        return;
      }
      result[key] = groups.map((group) => {
        if (!Array.isArray(group)) {
          return group;
        }
        return group.map((connection) => {
          if (!connection || typeof connection !== 'object') {
            return connection;
          }
          const targetNode = (connection as { node?: string }).node;
          return {
            ...(connection as Record<string, unknown>),
            node: targetNode ? nameRemap.get(targetNode) ?? targetNode : targetNode,
          };
        });
      });
    });
    return result;
  }

  private isRedundantSetNode(node: Record<string, any>, workflow: WorkflowDefinition): boolean {
    if (!node || node.type !== 'n8n-nodes-base.set') {
      return false;
    }
    const notes = normalizeNodeNotes(node.notes);
    const params = node.parameters && typeof node.parameters === 'object' ? node.parameters : {};
    const assignments = (params as Record<string, any>).assignments;
    const assignmentItems = assignments && Array.isArray(assignments.assignments) ? assignments.assignments : [];
    if (assignmentItems.length > 0) {
      return false;
    }

    const normalizedName = String(node.name || '').trim().toLowerCase();
    if (
      normalizedName === 'passthrough' ||
      normalizedName.includes('_passthrough') ||
      normalizedName.startsWith('set_extract_') ||
      normalizedName.includes('extract_audio_url') ||
      normalizedName.includes('extract_user_gesture') ||
      normalizedName.startsWith('set_result_gesture_empty')
    ) {
      return true;
    }

    if (normalizedName.includes('countdown_config')) {
      const connections =
        workflow.connections && typeof workflow.connections === 'object'
          ? (workflow.connections as Record<string, any>)
          : {};
      const successors = this.findOutgoingTargets(String(node.name || ''), connections);
      return successors.some((targetName) => {
        const targetNode = (workflow.nodes || []).find((candidate) => String(candidate?.name || '') === targetName);
        const targetNotes = normalizeNodeNotes(targetNode?.notes);
        return (
          targetNode?.type === 'n8n-nodes-base.httpRequest' ||
          targetNotes.category === 'TTS' ||
          String(targetNode?.name || '').toLowerCase().includes('tts')
        );
      });
    }

    if (notes.category !== 'BASE') {
      return false;
    }
    const sub = notes.sub && typeof notes.sub === 'object' ? notes.sub : {};
    return Object.keys(sub).length === 0 && normalizedName.includes('passthrough');
  }

  private findPrimaryTriggerNodeName(nodes: Array<Record<string, any>>): string | null {
    const preferredTypes = [
      'n8n-nodes-base.scheduleTrigger',
      'n8n-nodes-base.webhook',
      'n8n-nodes-base.manualTrigger',
    ];
    for (const nodeType of preferredTypes) {
      const matched = nodes.find((node) => node?.type === nodeType);
      if (matched?.name) {
        return String(matched.name);
      }
    }
    return null;
  }
}
