/**
 * [INPUT]: 依赖拓扑解析器、节点模板与 notes 标准化
 * [OUTPUT]: 对外提供 WorkflowAudioRepairFlow，负责 gesture/result 场景中的 TTS/SPEAKER 修复
 * [POS]: workflow-architect/scene 的音频链路安全网，被 WorkflowArchitect 后处理阶段调用
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { randomUUID } from 'crypto';
import { normalizeNodeNotes } from '../../../utils/node-notes';
import { getNodeTypeVersion } from '../../node-type-versions';
import { getNodeParameterTemplate } from '../../prompts/node-templates';
import { WorkflowDefinition } from '../../types';
import { logger } from '../../../utils/logger';
import { WorkflowTopologyResolver } from '../node/topology-resolver';
import { WorkflowGestureIdentityFlow } from './gesture-identity-flow';

export class WorkflowAudioRepairFlow {
  constructor(
    private topologyResolver: WorkflowTopologyResolver,
    private gestureIdentityFlow: WorkflowGestureIdentityFlow
  ) {}

  pruneGestureRedundantTtsNodes(workflow: WorkflowDefinition): void {
    if (!Array.isArray(workflow.nodes) || !workflow.connections || typeof workflow.connections !== 'object') {
      return;
    }
    const nodes = workflow.nodes as Array<Record<string, any>>;
    const connections = workflow.connections as Record<string, any>;
    if (!this.gestureIdentityFlow.isGestureFaceScene(nodes)) {
      return;
    }

    const nodeByName = new Map(nodes.map((node) => [String(node.name || ''), node] as const));
    const ttsNodeNames = nodes
      .filter((node) => normalizeNodeNotes(node.notes).category === 'TTS')
      .map((node) => String(node.name || ''))
      .filter(Boolean);

    ttsNodeNames.forEach((ttsName) => {
      const predecessors = this.topologyResolver.findPredecessors(
        ttsName,
        workflow.nodes as Array<Record<string, any>>,
        connections
      );
      const hasTtsPredecessor = predecessors.some(
        (node) => normalizeNodeNotes(node.notes).category === 'TTS'
      );
      if (!hasTtsPredecessor) {
        return;
      }

      const outgoingTargets = this.topologyResolver.findOutgoingTargets(ttsName, connections);
      if (outgoingTargets.length === 0) {
        this.topologyResolver.removeNodeCompletely(workflow, ttsName);
        return;
      }

      const allTargetsSpeakLike = outgoingTargets.every((targetName) => {
        const targetNode = nodeByName.get(targetName);
        const targetCategory = normalizeNodeNotes(targetNode?.notes).category;
        return targetCategory === 'SPEAKER' || targetCategory === 'TTS';
      });
      if (!allTargetsSpeakLike) {
        return;
      }

      const incomingEdges = this.topologyResolver.findIncomingEdges(ttsName, connections);
      incomingEdges.forEach(({ sourceName, outputIndex }) => {
        const sourceMapping = (connections[sourceName] ?? {}) as {
          main?: Array<Array<{ node?: string; type?: string; index?: number }>>;
        };
        const main = Array.isArray(sourceMapping.main) ? sourceMapping.main : [];
        while (main.length <= outputIndex) {
          main.push([]);
        }
        const branch = Array.isArray(main[outputIndex]) ? main[outputIndex] : [];
        const normalized = branch
          .filter((edge) => edge?.node && edge.node !== ttsName)
          .map((edge) => ({
            node: String(edge.node),
            type: typeof edge.type === 'string' ? edge.type : 'main',
            index: typeof edge.index === 'number' ? edge.index : 0,
          }));
        outgoingTargets.forEach((targetName) => {
          normalized.push({ node: targetName, type: 'main', index: 0 });
        });
        main[outputIndex] = this.topologyResolver.dedupeMainEdges(normalized);
        sourceMapping.main = main;
        connections[sourceName] = sourceMapping;
      });

      this.topologyResolver.removeNodeCompletely(workflow, ttsName);
      nodeByName.delete(ttsName);
    });
  }

  pruneSpeakerRelayNodes(workflow: WorkflowDefinition): void {
    if (!Array.isArray(workflow.nodes) || !workflow.connections || typeof workflow.connections !== 'object') {
      return;
    }
    const nodes = workflow.nodes as Array<Record<string, any>>;
    const connections = workflow.connections as Record<string, any>;
    const candidates = nodes
      .filter((node) => normalizeNodeNotes(node.notes).category === 'SPEAKER')
      .map((node) => String(node.name || ''))
      .filter(Boolean);

    candidates.forEach((nodeName) => {
      const predecessors = this.topologyResolver.findPredecessors(nodeName, nodes, connections);
      const hasSpeakerPredecessor = predecessors.some(
        (node) => normalizeNodeNotes(node.notes).category === 'SPEAKER'
      );
      if (!hasSpeakerPredecessor) {
        return;
      }

      const outgoingTargets = this.topologyResolver.findOutgoingTargets(nodeName, connections);
      if (outgoingTargets.length > 0) {
        this.topologyResolver.pruneSinglePassthroughNode(workflow, nodeName);
        return;
      }

      Object.values(connections).forEach((mapping) => {
        const main = Array.isArray((mapping as any)?.main) ? (mapping as any).main : [];
        main.forEach((group: Array<Record<string, any>>) => {
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
    });
  }

  ensureSpeakerHasTts(workflow: WorkflowDefinition): void {
    if (!Array.isArray(workflow.nodes) || !workflow.connections || typeof workflow.connections !== 'object') {
      return;
    }

    const nodes = workflow.nodes as Array<Record<string, any>>;
    const connections = workflow.connections as Record<string, any>;
    const speakerNodes = nodes.filter((node) => normalizeNodeNotes(node.notes).category === 'SPEAKER');

    for (const speakerNode of speakerNodes) {
      const speakerName = String(speakerNode.name || '');
      if (!speakerName) continue;

      const predecessors = this.topologyResolver.findPredecessors(speakerName, nodes, connections);
      const hasTtsPredecessor = predecessors.some(
        (pred) => normalizeNodeNotes(pred.notes).category === 'TTS'
      );
      const hasSpeakerPredecessor = predecessors.some(
        (pred) => normalizeNodeNotes(pred.notes).category === 'SPEAKER'
      );

      if (hasTtsPredecessor || hasSpeakerPredecessor) {
        continue;
      }

      const speakerNotes = normalizeNodeNotes(speakerNode.notes);
      const rawAudioName = speakerNotes.sub?.audio_name;
      const audioName = typeof rawAudioName === 'string' ? rawAudioName : 'audio';
      const ttsNodeName = `set_tts_for_${speakerName.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      const ttsNode = this.buildTtsNode(ttsNodeName, audioName, speakerNode);
      nodes.push(ttsNode);

      const incomingEdges = this.topologyResolver.findIncomingEdges(speakerName, connections);
      for (const edge of incomingEdges) {
        this.topologyResolver.redirectEdge(connections, edge.sourceName, speakerName, ttsNodeName);
      }

      this.topologyResolver.ensureEdge(workflow, ttsNodeName, speakerName);

      logger.info('WorkflowArchitect: inserted TTS node before SPEAKER', {
        ttsNode: ttsNodeName,
        speakerNode: speakerName,
      });
    }
  }

  private buildTtsNode(
    nodeName: string,
    audioName: string,
    speakerNode: Record<string, any>
  ): Record<string, any> {
    const template = getNodeParameterTemplate('n8n-nodes-base.set');
    const speakerPos = Array.isArray(speakerNode.position) ? speakerNode.position : [0, 0];
    const x = typeof speakerPos[0] === 'number' ? speakerPos[0] - 220 : 0;
    const y = typeof speakerPos[1] === 'number' ? speakerPos[1] : 0;

    return {
      id: randomUUID(),
      name: nodeName,
      type: 'n8n-nodes-base.set',
      typeVersion: getNodeTypeVersion('n8n-nodes-base.set') ?? 3.4,
      position: [x, y],
      parameters: template.parameters,
      notes: {
        title: '语音合成',
        subtitle: '将文字转化为语音文件',
        category: 'TTS',
        session_ID: '',
        extra: 'pending',
        topology: null,
        device_ID: null,
        sub: {
          TTS_input: '',
          audio_name: audioName,
        },
      },
    };
  }
}
