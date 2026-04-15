/**
 * [INPUT]: 依赖 topology-resolver、节点模板与 notes/category 规范
 * [OUTPUT]: 对外提供 WorkflowGameSceneFlow，负责 game 场景的执行器拓扑兜底
 * [POS]: workflow-architect/scene 的猜拳场景后处理器，被 scene-post-processor 调度
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { randomUUID } from 'crypto';
import { normalizeNodeNotes } from '../../../utils/node-notes';
import { getNodeTypeVersion } from '../../node-type-versions';
import { NodeCategory, WorkflowDefinition } from '../../types';
import { getNodeParameterTemplate } from '../../prompts/node-templates';
import { generateNodeTitleSubtitle } from '../../prompts/title-generator';
import { WorkflowTopologyResolver } from '../node/topology-resolver';

export class WorkflowGameSceneFlow {
  constructor(private topologyResolver: WorkflowTopologyResolver) {}

  ensureGameHandExecutor(workflow: WorkflowDefinition): void {
    if (!Array.isArray(workflow.nodes) || !workflow.connections || typeof workflow.connections !== 'object') {
      return;
    }

    const nodes = workflow.nodes as Array<Record<string, any>>;
    const hasRam = nodes.some((node) => normalizeNodeNotes(node.notes).category === 'RAM');
    const hasYolo = nodes.some((node) => normalizeNodeNotes(node.notes).category === 'YOLO-RPS');
    const assignNodes = nodes.filter((node) => normalizeNodeNotes(node.notes).category === 'ASSIGN');
    const handNodes = nodes.filter((node) => normalizeNodeNotes(node.notes).category === 'HAND');
    if (!hasRam || !hasYolo || assignNodes.length === 0 || handNodes.length > 0) {
      return;
    }

    assignNodes.forEach((assignNode) => {
      const gesture = this.extractAssignGesture(assignNode);
      const handNodeName = this.buildGameHandNodeName(nodes, gesture);
      const handNode = this.buildGameHandNode(handNodeName, assignNode, gesture);
      nodes.push(handNode);
      this.topologyResolver.ensureEdge(workflow, String(assignNode.name || ''), handNodeName);
    });
  }

  ensureIfDirectExecutorConnections(workflow: WorkflowDefinition): void {
    if (!Array.isArray(workflow.nodes) || !workflow.connections || typeof workflow.connections !== 'object') {
      return;
    }

    const nodes = workflow.nodes as Array<Record<string, any>>;
    const connections = workflow.connections as Record<string, any>;
    const nodeByName = new Map<string, Record<string, any>>(
      nodes
        .map((node) => [String(node.name || ''), node] as const)
        .filter(([name]) => Boolean(name))
    );
    const bridgeNodeNames = new Set<string>();
    const variantCache = new Map<string, string>();

    for (const ifNode of nodes) {
      if (ifNode.type !== 'n8n-nodes-base.if') {
        continue;
      }

      const ifName = String(ifNode.name || '');
      if (!ifName) {
        continue;
      }

      const ifMapping = connections[ifName] as
        | { main?: Array<Array<{ node?: string; type?: string; index?: number }>> }
        | undefined;
      if (!ifMapping || !Array.isArray(ifMapping.main)) {
        continue;
      }

      ifMapping.main = ifMapping.main.map((branch) => {
        if (!Array.isArray(branch)) {
          return [];
        }
        return this.rewriteIfBranchToExecutor(
          workflow,
          ifNode,
          branch,
          nodeByName,
          connections,
          bridgeNodeNames,
          variantCache
        );
      });
      connections[ifName] = ifMapping;
    }

    bridgeNodeNames.forEach((nodeName) => {
      this.topologyResolver.pruneSinglePassthroughNode(workflow, nodeName);
      this.pruneOrphanBridgeNode(workflow, nodeName);
    });
  }

  private buildGameHandNode(
    nodeName: string,
    assignNode: Record<string, any>,
    gesture: string
  ): Record<string, any> {
    const template = getNodeParameterTemplate('n8n-nodes-base.code');
    const pos = Array.isArray(assignNode.position) ? assignNode.position : [];
    const sourceX = typeof pos[0] === 'number' ? pos[0] : 0;
    const sourceY = typeof pos[1] === 'number' ? pos[1] : 0;

    return {
      id: randomUUID(),
      name: nodeName,
      type: 'n8n-nodes-base.code',
      typeVersion: getNodeTypeVersion('n8n-nodes-base.code') ?? 2,
      position: [sourceX + 220, sourceY],
      parameters: template.parameters,
      notes: {
        title: '物理手势驱动',
        subtitle: '驱动机械手执行对应手势',
        category: 'HAND',
        session_ID: '',
        extra: 'pending',
        topology: null,
        device_ID: null,
        sub: { execute_gesture: gesture },
      },
    };
  }

  private buildGameHandNodeName(
    nodes: Array<Record<string, any>>,
    gesture: string
  ): string {
    const suffix = this.normalizeHandGestureName(gesture).toLowerCase();
    return this.buildUniqueNodeName(nodes, `code_hand_execute_${suffix}`);
  }

  private extractAssignGesture(assignNode: Record<string, any>): string {
    const notes = normalizeNodeNotes(assignNode.notes);
    const sub =
      notes.sub && typeof notes.sub === 'object' ? (notes.sub as Record<string, unknown>) : {};
    const fromNotes = this.firstNonEmptyString(sub.robotGesture, sub.execute_gesture);
    if (fromNotes) {
      return this.normalizeHandGestureName(fromNotes);
    }

    const fromName = this.inferExpectedExecutorValueFromName(String(assignNode.name || ''), 'HAND');
    if (fromName) {
      return fromName;
    }

    return 'Rock';
  }

  private rewriteIfBranchToExecutor(
    workflow: WorkflowDefinition,
    sourceIfNode: Record<string, any>,
    branch: Array<{ node?: string; type?: string; index?: number }>,
    nodeByName: Map<string, Record<string, any>>,
    connections: Record<string, any>,
    bridgeNodeNames: Set<string>,
    variantCache: Map<string, string>
  ): Array<{ node: string; type: string; index: number }> {
    const rewritten: Array<{ node: string; type: string; index: number }> = [];

    for (const edge of branch) {
      const fallbackNode = String(edge?.node || '');
      if (!fallbackNode) {
        continue;
      }

      let finalTargetName = fallbackNode;
      let executorName: string | null = null;
      let bridgeNodeName: string | null = null;
      let bridgeExpectedValue: string | null = null;
      const currentTarget = nodeByName.get(fallbackNode);

      if (currentTarget) {
        const bypassTargetName = this.canBypassSetBetweenIfAndExecutor(
          currentTarget,
          nodeByName,
          connections
        );
        if (bypassTargetName) {
          const executorNode = nodeByName.get(bypassTargetName);
          if (executorNode) {
            bridgeExpectedValue = this.extractExpectedExecutorValueFromBridge(currentTarget, executorNode);
            executorName = bypassTargetName;
            bridgeNodeName = fallbackNode;
          }
        } else {
          const category = normalizeNodeNotes(currentTarget.notes).category;
          if (category === 'HAND' || category === 'SCREEN') {
            executorName = fallbackNode;
          }
        }
      }

      if (executorName) {
        const executorNode = nodeByName.get(executorName);
        if (executorNode) {
          const category = normalizeNodeNotes(executorNode.notes).category;
          const expectedValue =
            bridgeExpectedValue ?? this.inferExpectedExecutorValue(sourceIfNode, category);
          if (expectedValue) {
            finalTargetName = this.resolveExecutorVariantNode(
              workflow,
              nodeByName,
              connections,
              variantCache,
              executorNode,
              category,
              expectedValue,
              String(sourceIfNode.name || '')
            );
          } else {
            finalTargetName = executorName;
          }
        }
      }

      if (bridgeNodeName) {
        bridgeNodeNames.add(bridgeNodeName);
      }

      rewritten.push({
        node: finalTargetName,
        type: typeof edge?.type === 'string' ? edge.type : 'main',
        index: typeof edge?.index === 'number' ? edge.index : 0,
      });
    }

    return this.topologyResolver.dedupeMainEdges(rewritten);
  }

  private inferExpectedExecutorValue(sourceIfNode: Record<string, any>, category: string): string | null {
    return (
      this.inferExpectedExecutorValueFromMetadata(sourceIfNode, category) ??
      this.inferExpectedExecutorValueFromCondition(sourceIfNode, category) ??
      this.inferExpectedExecutorValueFromName(String(sourceIfNode.name || ''), category)
    );
  }

  private inferExpectedExecutorValueFromMetadata(
    sourceIfNode: Record<string, any>,
    category: string
  ): string | null {
    const notes = normalizeNodeNotes(sourceIfNode.notes);
    const sub = notes.sub && typeof notes.sub === 'object' ? (notes.sub as Record<string, unknown>) : {};
    if (category === 'HAND') {
      const value = this.firstNonEmptyString(sub.expected_hand_gesture, sub.expected_gesture, sub.execute_gesture);
      return value ? this.normalizeHandGestureName(value) : null;
    }
    if (category === 'SCREEN') {
      const value = this.firstNonEmptyString(sub.expected_screen_emoji, sub.expected_emoji, sub.execute_emoji);
      return value ? this.normalizeScreenEmojiName(value) : null;
    }
    return null;
  }

  private inferExpectedExecutorValueFromCondition(
    sourceIfNode: Record<string, any>,
    category: string
  ): string | null {
    const params =
      sourceIfNode.parameters && typeof sourceIfNode.parameters === 'object'
        ? (sourceIfNode.parameters as Record<string, unknown>)
        : {};
    const conditionsRoot =
      params.conditions && typeof params.conditions === 'object'
        ? (params.conditions as Record<string, unknown>)
        : {};
    const conditionList = Array.isArray(conditionsRoot.conditions)
      ? (conditionsRoot.conditions as Array<Record<string, unknown>>)
      : [];
    const firstCondition = conditionList[0];
    if (!firstCondition || typeof firstCondition !== 'object') {
      return null;
    }
    const rightValue = this.firstNonEmptyString(firstCondition.rightValue);
    if (!rightValue) {
      return null;
    }

    const normalized = rightValue.trim().toLowerCase();
    if (category === 'HAND') {
      if (normalized === '1' || normalized === 'rock' || normalized === '石头') return 'Rock';
      if (normalized === '2' || normalized === 'scissors' || normalized === '剪刀') return 'Scissors';
      if (normalized === '3' || normalized === 'paper' || normalized === '布') return 'Paper';
      return null;
    }

    if (category === 'SCREEN') {
      if (normalized === 'win' || normalized === '赢' || normalized === 'happy') return 'Happy';
      if (normalized === 'lose' || normalized === '输' || normalized === 'sad') return 'Sad';
      if (normalized === 'peace' || normalized === '平静') return 'Peace';
      if (normalized === 'draw' || normalized === '平局' || normalized === 'empty' || normalized === '空' || normalized === 'angry') {
        return 'Angry';
      }
      return null;
    }

    return null;
  }

  private inferExpectedExecutorValueFromName(ifName: string, category: string): string | null {
    const normalized = ifName.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    if (category === 'HAND') {
      if (normalized.includes('rock') || normalized.includes('石头') || normalized.includes('n_eq_1') || normalized.includes('n_equals_1')) return 'Rock';
      if (normalized.includes('scissors') || normalized.includes('剪刀') || normalized.includes('n_eq_2') || normalized.includes('n_equals_2')) return 'Scissors';
      if (normalized.includes('paper') || normalized.includes('布') || normalized.includes('n_eq_3') || normalized.includes('n_equals_3')) return 'Paper';
      return null;
    }
    if (category === 'SCREEN') {
      if (normalized.includes('happy') || normalized.includes('开心') || normalized.includes('win') || normalized.includes('赢')) return 'Happy';
      if (normalized.includes('sad') || normalized.includes('难过') || normalized.includes('lose') || normalized.includes('输')) return 'Sad';
      if (normalized.includes('peace') || normalized.includes('平静')) return 'Peace';
      if (normalized.includes('angry') || normalized.includes('愤怒') || normalized.includes('draw') || normalized.includes('平局') || normalized.includes('empty') || normalized.includes('空')) {
        return 'Angry';
      }
      return null;
    }
    return null;
  }

  private resolveExecutorVariantNode(
    workflow: WorkflowDefinition,
    nodeByName: Map<string, Record<string, any>>,
    connections: Record<string, any>,
    variantCache: Map<string, string>,
    executorNode: Record<string, any>,
    category: string,
    expectedValue: string,
    sourceIfName: string
  ): string {
    const executorName = String(executorNode.name || '');
    if (!executorName) {
      return executorName;
    }

    const expectedSignature = this.normalizeExecutorValue(category, expectedValue);
    const currentSignature = this.getExecutorSignature(executorNode, category);

    if (!expectedSignature || currentSignature === expectedSignature) {
      this.setExecutorExpectedSub(executorNode, category, expectedValue);
      return executorName;
    }
    if (this.isExclusiveIfTarget(executorName, sourceIfName, connections, nodeByName)) {
      this.setExecutorExpectedSub(executorNode, category, expectedValue);
      return executorName;
    }

    const cacheKey = `${executorName}|${category}|${expectedSignature}`;
    const cachedVariant = variantCache.get(cacheKey);
    if (cachedVariant && nodeByName.has(cachedVariant)) {
      return cachedVariant;
    }

    const cloneNode = this.cloneExecutorNodeForBranch(
      workflow,
      connections,
      executorNode,
      category,
      expectedValue
    );
    (workflow.nodes as Array<Record<string, any>>).push(cloneNode);
    nodeByName.set(String(cloneNode.name || ''), cloneNode);
    variantCache.set(cacheKey, String(cloneNode.name || ''));
    return String(cloneNode.name || executorName);
  }

  private isExclusiveIfTarget(
    targetNodeName: string,
    sourceIfName: string,
    connections: Record<string, any>,
    nodeByName: Map<string, Record<string, any>>
  ): boolean {
    if (!sourceIfName) {
      return false;
    }
    const ifSources = this.collectIfSourcesForExecutorTarget(targetNodeName, connections, nodeByName);
    return ifSources.size <= 1 && ifSources.has(sourceIfName);
  }

  private collectIfSourcesForExecutorTarget(
    targetNodeName: string,
    connections: Record<string, any>,
    nodeByName: Map<string, Record<string, any>>
  ): Set<string> {
    const ifSources = new Set<string>();
    for (const [sourceName, mapping] of Object.entries(connections)) {
      const sourceNode = nodeByName.get(sourceName);
      if (!sourceNode || sourceNode.type !== 'n8n-nodes-base.if') {
        continue;
      }
      const mainOutputs = Array.isArray((mapping as any)?.main) ? (mapping as any).main : [];
      for (const outputs of mainOutputs) {
        if (!Array.isArray(outputs)) {
          continue;
        }
        for (const output of outputs) {
          const directTarget = String(output?.node || '');
          if (!directTarget) {
            continue;
          }
          if (directTarget === targetNodeName) {
            ifSources.add(sourceName);
            continue;
          }
          const bridgeNode = nodeByName.get(directTarget);
          if (!bridgeNode) {
            continue;
          }
          const bypassTarget = this.canBypassSetBetweenIfAndExecutor(bridgeNode, nodeByName, connections);
          if (bypassTarget === targetNodeName) {
            ifSources.add(sourceName);
          }
        }
      }
    }
    return ifSources;
  }

  private cloneExecutorNodeForBranch(
    workflow: WorkflowDefinition,
    connections: Record<string, any>,
    sourceNode: Record<string, any>,
    category: string,
    expectedValue: string
  ): Record<string, any> {
    const sourceName = String(sourceNode.name || '');
    const cloneNode = JSON.parse(JSON.stringify(sourceNode)) as Record<string, any>;
    cloneNode.id = randomUUID();
    cloneNode.name = this.buildUniqueNodeName(
      workflow.nodes as Array<Record<string, any>>,
      `${sourceName}_${expectedValue.toLowerCase()}`
    );
    this.setExecutorExpectedSub(cloneNode, category, expectedValue);

    const sourcePos = Array.isArray(sourceNode.position) ? sourceNode.position : [0, 0];
    const x = typeof sourcePos[0] === 'number' ? sourcePos[0] + 140 : 140;
    const y = typeof sourcePos[1] === 'number' ? sourcePos[1] + 120 : 120;
    cloneNode.position = [x, y];

    const targets =
      category === 'HAND'
        ? this.resolveHandCloneTargets(sourceName, workflow.nodes as Array<Record<string, any>>, connections)
        : this.topologyResolver.findOutgoingTargets(sourceName, connections);
    if (targets.length > 0) {
      connections[String(cloneNode.name || '')] = {
        main: [targets.map((targetName) => ({ node: targetName, type: 'main', index: 0 }))],
      };
    }

    return cloneNode;
  }

  private resolveHandCloneTargets(
    handNodeName: string,
    nodes: Array<Record<string, any>>,
    connections: Record<string, any>
  ): string[] {
    const nodeByName = new Map(
      nodes.map((node) => [String(node.name || ''), node] as const).filter(([name]) => Boolean(name))
    );
    const directTargets = this.topologyResolver.findOutgoingTargets(handNodeName, connections);
    const resolvedTargets = new Set<string>();

    directTargets.forEach((targetName) => {
      const targetNode = nodeByName.get(targetName);
      if (!targetNode) {
        return;
      }
      const targetCategory = normalizeNodeNotes(targetNode.notes).category;
      if (targetCategory === 'ASSIGN') {
        this.topologyResolver.findOutgoingTargets(targetName, connections).forEach((nextTarget) => resolvedTargets.add(nextTarget));
      } else {
        resolvedTargets.add(targetName);
      }
    });

    return Array.from(resolvedTargets);
  }

  private buildUniqueNodeName(nodes: Array<Record<string, any>>, baseName: string): string {
    const normalizedBase = baseName.replace(/[^a-zA-Z0-9_]/g, '_');
    const existing = new Set(nodes.map((node) => String(node.name || '')));
    if (!existing.has(normalizedBase)) {
      return normalizedBase;
    }
    let suffix = 2;
    let candidate = `${normalizedBase}_${suffix}`;
    while (existing.has(candidate)) {
      suffix += 1;
      candidate = `${normalizedBase}_${suffix}`;
    }
    return candidate;
  }

  private getExecutorSignature(node: Record<string, any>, category: string): string {
    const notes = normalizeNodeNotes(node.notes);
    const sub = notes.sub && typeof notes.sub === 'object' ? (notes.sub as Record<string, unknown>) : {};
    if (category === 'HAND') {
      const value = this.firstNonEmptyString(sub.execute_gesture, sub.robotGesture);
      return this.normalizeExecutorValue(category, value || '');
    }
    if (category === 'SCREEN') {
      const value = this.firstNonEmptyString(sub.execute_emoji, (sub as any).emoji);
      return this.normalizeExecutorValue(category, value || '');
    }
    return '';
  }

  private normalizeExecutorValue(category: string, value: string): string {
    const raw = value.trim();
    if (!raw) {
      return '';
    }
    if (category === 'HAND') {
      return this.normalizeHandGestureName(raw).toLowerCase();
    }
    if (category === 'SCREEN') {
      return this.normalizeScreenEmojiName(raw).toLowerCase();
    }
    return raw.toLowerCase();
  }

  private setExecutorExpectedSub(
    node: Record<string, any>,
    category: string,
    expectedValue: string
  ): void {
    const notes = normalizeNodeNotes(node.notes);
    const sub =
      notes.sub && typeof notes.sub === 'object' ? { ...(notes.sub as Record<string, unknown>) } : {};

    if (category === 'HAND') {
      sub.execute_gesture = this.normalizeHandGestureName(expectedValue);
    } else if (category === 'SCREEN') {
      sub.execute_emoji = this.normalizeScreenEmojiName(expectedValue);
    }

    let nextTitle = notes.title;
    let nextSubtitle = notes.subtitle;
    if (category === 'HAND' || category === 'SCREEN') {
      const generated = generateNodeTitleSubtitle(
        { type: node.type, name: node.name, sub },
        category as NodeCategory
      );
      nextTitle = generated.title;
      nextSubtitle = generated.subtitle;
    }

    node.notes = { ...notes, title: nextTitle, subtitle: nextSubtitle, sub };
  }

  private canBypassSetBetweenIfAndExecutor(
    middleNode: Record<string, any>,
    nodeByName: Map<string, Record<string, any>>,
    connections: Record<string, any>
  ): string | null {
    const middleName = String(middleNode.name || '');
    const bridgeLikeNode =
      middleNode.type === 'n8n-nodes-base.set' || middleName.toLowerCase().startsWith('set_');
    if (!bridgeLikeNode || !middleName) {
      return null;
    }

    const outgoingTargets = this.topologyResolver.findOutgoingTargets(middleName, connections);
    if (outgoingTargets.length !== 1) {
      return null;
    }

    const executorNode = nodeByName.get(outgoingTargets[0]);
    if (!executorNode) {
      return null;
    }

    const executorCategory = normalizeNodeNotes(executorNode.notes).category;
    if (executorCategory !== 'HAND' && executorCategory !== 'SCREEN') {
      return null;
    }

    return outgoingTargets[0];
  }

  private extractExpectedExecutorValueFromBridge(
    setNode: Record<string, any>,
    executorNode: Record<string, any>
  ): string | null {
    const setNotes = normalizeNodeNotes(setNode.notes);
    const executorNotes = normalizeNodeNotes(executorNode.notes);
    const setSub =
      setNotes.sub && typeof setNotes.sub === 'object' ? (setNotes.sub as Record<string, unknown>) : {};

    if (executorNotes.category === 'HAND') {
      const candidateGesture = this.firstNonEmptyString(setSub.execute_gesture, setSub.robotGesture);
      if (candidateGesture) {
        return this.normalizeHandGestureName(candidateGesture);
      }
    }
    if (executorNotes.category === 'SCREEN') {
      const candidateEmoji = this.firstNonEmptyString(setSub.execute_emoji, (setSub as any).emoji);
      if (candidateEmoji) {
        return this.normalizeScreenEmojiName(candidateEmoji);
      }
    }
    return null;
  }

  private pruneOrphanBridgeNode(workflow: WorkflowDefinition, nodeName: string): void {
    if (!Array.isArray(workflow.nodes) || !workflow.connections || typeof workflow.connections !== 'object') {
      return;
    }
    const connections = workflow.connections as Record<string, any>;
    const incomingEdges = this.topologyResolver.findIncomingEdges(nodeName, connections);
    if (incomingEdges.length > 0) {
      return;
    }

    const node = workflow.nodes.find((item) => String(item?.name || '') === nodeName) as Record<string, any> | undefined;
    if (!node) {
      return;
    }

    delete connections[nodeName];
    workflow.nodes = workflow.nodes.filter((item) => String(item?.name || '') !== nodeName);
  }

  private firstNonEmptyString(...values: unknown[]): string | null {
    for (const value of values) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }
    return null;
  }

  private normalizeHandGestureName(rawGesture: string): string {
    const normalized = rawGesture.trim().toLowerCase();
    const mapping: Record<string, string> = {
      rock: 'Rock',
      paper: 'Paper',
      scissors: 'Scissors',
      waving: 'Waving',
      middle_finger: 'Middle_Finger',
      thumbs_up: 'Thumbs_Up',
      put_down: 'Put_down',
      victory: 'Victory',
    };
    return mapping[normalized] ?? rawGesture.trim();
  }

  private normalizeScreenEmojiName(rawEmoji: string): string {
    const normalized = rawEmoji.trim().toLowerCase();
    const mapping: Record<string, string> = {
      happy: 'Happy',
      sad: 'Sad',
      angry: 'Angry',
      peace: 'Peace',
    };
    return mapping[normalized] ?? rawEmoji.trim();
  }
}
