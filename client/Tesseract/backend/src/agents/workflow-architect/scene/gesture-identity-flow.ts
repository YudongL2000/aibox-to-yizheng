/**
 * [INPUT]: 依赖拓扑解析器、身份节点构建器、节点模板与日志能力
 * [OUTPUT]: 对外提供 WorkflowGestureIdentityFlow，负责手势识别人脸场景的身份分支补全
 * [POS]: workflow-architect/scene 的身份拓扑安全网，被 WorkflowArchitect 后处理阶段调用
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { getNodeTypeVersion } from '../../node-type-versions';
import { getNodeParameterTemplate } from '../../prompts/node-templates';
import { normalizeNodeNotes } from '../../../utils/node-notes';
import { WorkflowDefinition } from '../../types';
import { logger } from '../../../utils/logger';
import { WorkflowTopologyResolver } from '../node/topology-resolver';
import {
  aliasToPersonName,
  ensureFaceNetNodeForAlias,
  ensureIdentityIfNode,
  inferFaceAliasFromFaceNode,
  inferIdentityAliasFromIfNode,
  normalizeIdentityAlias,
  resolveExpectedIdentityProfiles,
} from '../gesture-identity-builder';

export class WorkflowGestureIdentityFlow {
  constructor(private topologyResolver: WorkflowTopologyResolver) {}

  ensureGestureIdentityFlow(
    workflow: WorkflowDefinition,
    activeEntities: Record<string, string>
  ): void {
    if (!Array.isArray(workflow.nodes) || !workflow.connections || typeof workflow.connections !== 'object') {
      return;
    }

    const nodes = workflow.nodes as Array<Record<string, any>>;
    const connections = workflow.connections as Record<string, any>;
    if (!this.isGestureFaceScene(nodes)) {
      return;
    }

    const faceNetNodes = nodes.filter((node) => normalizeNodeNotes(node.notes).category === 'FACE-NET');
    if (faceNetNodes.length === 0) {
      return;
    }

    this.ensureGestureScheduleTrigger(nodes);

    const expectedProfiles = resolveExpectedIdentityProfiles(nodes, activeEntities);
    if (expectedProfiles.length === 0) {
      return;
    }
    const expectedAliasSet = new Set(expectedProfiles.map((profile) => profile.alias));

    const primaryFaceNode = faceNetNodes[0];
    const primaryFaceName = String(primaryFaceNode.name || '');
    const facePos = Array.isArray(primaryFaceNode.position) ? primaryFaceNode.position : [0, 0];
    const incomingEdges = primaryFaceName ? this.topologyResolver.findIncomingEdges(primaryFaceName, connections) : [];
    const existingFaceNodeByAlias = new Map<string, Record<string, any>>();
    faceNetNodes.forEach((node, index) => {
      const alias = inferFaceAliasFromFaceNode(node, index);
      if (!alias || existingFaceNodeByAlias.has(alias)) {
        return;
      }
      existingFaceNodeByAlias.set(alias, node);
    });

    const faceNodeNameByAlias = new Map<string, string>();
    expectedProfiles.forEach((profile, index) => {
      const baseNode = existingFaceNodeByAlias.get(profile.alias) ?? primaryFaceNode;
      const faceNode = ensureFaceNetNodeForAlias(
        nodes,
        baseNode,
        profile.alias,
        profile.displayName,
        facePos,
        index
      );
      const faceNodeName = String(faceNode.name || '');
      if (faceNodeName) {
        faceNodeNameByAlias.set(profile.alias, faceNodeName);
      }
    });
    const selectedFaceNodeNames = Array.from(faceNodeNameByAlias.values());
    if (selectedFaceNodeNames.length === 0) {
      return;
    }
    const selectedFaceNodeNameSet = new Set(selectedFaceNodeNames);

    nodes
      .filter((node) => normalizeNodeNotes(node.notes).category === 'FACE-NET')
      .forEach((node) => {
        const nodeName = String(node.name || '');
        if (!nodeName || selectedFaceNodeNameSet.has(nodeName)) {
          return;
        }
        this.topologyResolver.removeNodeCompletely(workflow, nodeName);
      });

    const existingIdentityIfNodes = nodes
      .filter((node) => node.type === 'n8n-nodes-base.if')
      .map((node) => ({ node, alias: inferIdentityAliasFromIfNode(node) }))
      .filter((item) => Boolean(item.alias)) as Array<{ node: Record<string, any>; alias: string }>;

    existingIdentityIfNodes.forEach(({ node, alias }) => {
      const nodeName = String(node.name || '');
      if (!nodeName) {
        return;
      }
      if (!expectedAliasSet.has(alias)) {
        this.topologyResolver.removeNodeCompletely(workflow, nodeName);
      }
    });

    const identityNodeNameByAlias = new Map<string, string>();
    expectedProfiles.forEach((profile, index) => {
      const nodeName = ensureIdentityIfNode(
        nodes,
        facePos,
        profile.alias,
        profile.matchValue,
        index
      );
      if (nodeName) {
        identityNodeNameByAlias.set(profile.alias, nodeName);
      }
    });
    if (identityNodeNameByAlias.size === 0) {
      return;
    }

    const orderedProfiles = expectedProfiles.filter(
      (profile) =>
        Boolean(faceNodeNameByAlias.get(profile.alias)) &&
        Boolean(identityNodeNameByAlias.get(profile.alias))
    );
    const orderedFaceNodeNames = orderedProfiles
      .map((profile) => faceNodeNameByAlias.get(profile.alias) || '')
      .filter(Boolean);
    if (orderedFaceNodeNames.length === 0) {
      return;
    }

    if (incomingEdges.length > 0) {
      incomingEdges.forEach(({ sourceName, outputIndex }) => {
        const sourceMapping = (connections[sourceName] ?? {}) as {
          main?: Array<Array<Record<string, any>>>;
        };
        const mainOutputs = Array.isArray(sourceMapping.main) ? sourceMapping.main : [];
        while (mainOutputs.length <= outputIndex) {
          mainOutputs.push([]);
        }
        const existingEdges = (Array.isArray(mainOutputs[outputIndex]) ? mainOutputs[outputIndex] : [])
          .map((edge) => {
            const node = typeof edge?.node === 'string' ? edge.node : '';
            if (!node) {
              return null;
            }
            return {
              node,
              type: typeof edge?.type === 'string' ? edge.type : 'main',
              index: typeof edge?.index === 'number' ? edge.index : 0,
            };
          })
          .filter((edge): edge is { node: string; type: string; index: number } => Boolean(edge));
        mainOutputs[outputIndex] = this.topologyResolver.dedupeMainEdges([
          ...existingEdges.filter((edge) => !selectedFaceNodeNameSet.has(edge.node)),
          { node: orderedFaceNodeNames[0], type: 'main', index: 0 },
        ]);
        sourceMapping.main = mainOutputs;
        connections[sourceName] = sourceMapping;
      });
    } else {
      const firstCamera = nodes.find((node) => normalizeNodeNotes(node.notes).category === 'CAM');
      const cameraName = String(firstCamera?.name || '');
      if (cameraName) {
        const sourceMapping = (connections[cameraName] ?? {}) as {
          main?: Array<Array<Record<string, any>>>;
        };
        const mainOutputs = Array.isArray(sourceMapping.main) ? sourceMapping.main : [];
        while (mainOutputs.length < 1) {
          mainOutputs.push([]);
        }
        const existingEdges = (Array.isArray(mainOutputs[0]) ? mainOutputs[0] : [])
          .map((edge) => {
            const node = typeof edge?.node === 'string' ? edge.node : '';
            if (!node) {
              return null;
            }
            return {
              node,
              type: typeof edge?.type === 'string' ? edge.type : 'main',
              index: typeof edge?.index === 'number' ? edge.index : 0,
            };
          })
          .filter((edge): edge is { node: string; type: string; index: number } => Boolean(edge));
        mainOutputs[0] = this.topologyResolver.dedupeMainEdges([
          ...existingEdges.filter((edge) => !selectedFaceNodeNameSet.has(edge.node)),
          { node: orderedFaceNodeNames[0], type: 'main', index: 0 },
        ]);
        sourceMapping.main = mainOutputs;
        connections[cameraName] = sourceMapping;
      }
    }

    orderedProfiles.forEach((profile, index) => {
      const faceNodeName = faceNodeNameByAlias.get(profile.alias);
      const ifNodeName = identityNodeNameByAlias.get(profile.alias);
      if (!faceNodeName || !ifNodeName) {
        return;
      }
      const nextFaceNodeName = orderedFaceNodeNames[index + 1];
      const targets = [nextFaceNodeName, ifNodeName].filter(Boolean) as string[];
      const mapping = (connections[faceNodeName] ?? {}) as {
        main?: Array<Array<{ node: string; type: string; index: number }>>;
      };
      const mainOutputs = Array.isArray(mapping.main) ? mapping.main : [];
      while (mainOutputs.length < 1) {
        mainOutputs.push([]);
      }
      mainOutputs[0] = this.topologyResolver.dedupeMainEdges(
        targets.map((targetName) => ({ node: targetName, type: 'main', index: 0 }))
      );
      mapping.main = mainOutputs;
      connections[faceNodeName] = mapping;
    });

    const nodeByName = new Map(nodes.map((node) => [String(node.name || ''), node] as const));
    const handByAlias = new Map<string, string>();
    const ttsByAlias = new Map<string, string>();
    const speakerByAlias = new Map<string, string>();
    nodes.forEach((node) => {
      const nodeName = String(node.name || '');
      if (!nodeName) {
        return;
      }
      const alias = this.inferAliasFromNodeName(nodeName);
      if (!alias) {
        return;
      }
      const category = normalizeNodeNotes(node.notes).category;
      if (category === 'HAND' && !handByAlias.has(alias)) {
        handByAlias.set(alias, nodeName);
      }
      if (category === 'TTS' && !ttsByAlias.has(alias)) {
        ttsByAlias.set(alias, nodeName);
      }
      if (category === 'SPEAKER' && !speakerByAlias.has(alias)) {
        speakerByAlias.set(alias, nodeName);
      }
    });

    const fallbackHandName = String(
      nodes.find((node) => normalizeNodeNotes(node.notes).category === 'HAND')?.name || ''
    );
    const fallbackTtsName = String(
      nodes.find((node) => normalizeNodeNotes(node.notes).category === 'TTS')?.name || ''
    );
    const fallbackSpeakerName = String(
      nodes.find((node) => normalizeNodeNotes(node.notes).category === 'SPEAKER')?.name || ''
    );

    orderedProfiles.forEach((profile) => {
      const ifName = identityNodeNameByAlias.get(profile.alias);
      if (!ifName) {
        return;
      }
      const handName = handByAlias.get(profile.alias) || fallbackHandName;
      const ttsName = ttsByAlias.get(profile.alias) || fallbackTtsName;
      const speakerName = speakerByAlias.get(profile.alias) || fallbackSpeakerName;
      const mapping = (connections[ifName] ?? {}) as { main?: Array<Array<Record<string, any>>> };
      const mainOutputs = Array.isArray(mapping.main) ? mapping.main : [];
      while (mainOutputs.length < 2) {
        mainOutputs.push([]);
      }
      const trueBranch = (Array.isArray(mainOutputs[0]) ? mainOutputs[0] : [])
        .map((edge) => {
          const edgeNodeName = typeof edge?.node === 'string' ? edge.node : '';
          if (!edgeNodeName) {
            return null;
          }
          return {
            node: edgeNodeName,
            type: typeof edge?.type === 'string' ? edge.type : 'main',
            index: typeof edge?.index === 'number' ? edge.index : 0,
          };
        })
        .filter((edge): edge is { node: string; type: string; index: number } => Boolean(edge))
        .filter((edge) => {
          const category = normalizeNodeNotes(nodeByName.get(edge.node)?.notes).category;
          return category !== 'HAND' && category !== 'TTS';
        });
      if (handName) {
        trueBranch.push({ node: handName, type: 'main', index: 0 });
      }
      if (ttsName) {
        trueBranch.push({ node: ttsName, type: 'main', index: 0 });
      }
      mainOutputs[0] = this.topologyResolver.dedupeMainEdges(trueBranch);
      mainOutputs[1] = [];
      mapping.main = mainOutputs;
      connections[ifName] = mapping;
      if (ttsName && speakerName) {
        this.topologyResolver.ensureEdge(workflow, ttsName, speakerName);
      }
    });

    logger.info('WorkflowArchitect: ensured gesture identity flow', {
      identityCount: orderedProfiles.length,
    });
  }

  isGestureFaceScene(nodes: Array<Record<string, any>>): boolean {
    const categories = nodes.map((node) => normalizeNodeNotes(node.notes).category);
    const hasFaceNet = categories.includes('FACE-NET');
    const hasHand = categories.includes('HAND');
    const hasSpeaker = categories.includes('SPEAKER');
    const hasRps = categories.includes('YOLO-RPS') || categories.includes('RAM');
    return hasFaceNet && hasHand && hasSpeaker && !hasRps;
  }

  private ensureGestureScheduleTrigger(nodes: Array<Record<string, any>>): void {
    const hasSchedule = nodes.some((node) => node.type === 'n8n-nodes-base.scheduleTrigger');
    if (hasSchedule) {
      return;
    }
    const webhookNode = nodes.find((node) => node.type === 'n8n-nodes-base.webhook');
    if (!webhookNode) {
      return;
    }
    const template = getNodeParameterTemplate('n8n-nodes-base.scheduleTrigger');
    webhookNode.type = 'n8n-nodes-base.scheduleTrigger';
    webhookNode.typeVersion = getNodeTypeVersion('n8n-nodes-base.scheduleTrigger') ?? template.typeVersion ?? 1.1;
    webhookNode.parameters = template.parameters;
  }

  private inferAliasFromNodeName(nodeName: string): string | undefined {
    const matched = nodeName.match(/_(liu|fu|wang|person_\d+)$/i);
    if (!matched?.[1]) {
      return undefined;
    }
    return normalizeIdentityAlias(matched[1]) ?? matched[1].toLowerCase();
  }
}
