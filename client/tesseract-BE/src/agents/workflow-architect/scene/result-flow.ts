/**
 * [INPUT]: 依赖结果分支规则、拓扑解析器、节点模板与 notes 标准化
 * [OUTPUT]: 对外提供 WorkflowResultFlow，负责猜拳结果分支的独立链路构建
 * [POS]: workflow-architect/scene 的结果分支安全网，被 WorkflowArchitect 后处理阶段调用
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { randomUUID } from 'crypto';
import { normalizeNodeNotes } from '../../../utils/node-notes';
import { getNodeTypeVersion } from '../../node-type-versions';
import {
  RESULT_BRANCH_CONFIGS,
  type ResultBranchConfig,
  type ResultBranchType,
  resolveResultBranchTypeFromIfNode,
} from '../../prompts/result-branch-rules';
import { WorkflowDefinition } from '../../types';
import { logger } from '../../../utils/logger';
import { WorkflowTopologyResolver } from '../node/topology-resolver';

export class WorkflowResultFlow {
  constructor(private topologyResolver: WorkflowTopologyResolver) {}

  ensureResultBranches(workflow: WorkflowDefinition): void {
    if (!Array.isArray(workflow.nodes) || !workflow.connections || typeof workflow.connections !== 'object') {
      return;
    }
    if (!this.shouldEnforceResultBranches(workflow)) {
      return;
    }

    const nodes = workflow.nodes as Array<Record<string, any>>;
    const connections = workflow.connections as Record<string, any>;
    const branchGroups: Record<ResultBranchType, Array<Record<string, any>>> = {
      empty: [],
      draw: [],
      win: [],
      lose: [],
    };

    for (const node of nodes) {
      if (node?.type !== 'n8n-nodes-base.if') {
        continue;
      }
      const nodeName = String(node?.name || '');
      const branchType = resolveResultBranchTypeFromIfNode({
        name: nodeName,
        parameters: node?.parameters,
      });
      if (!branchType) {
        continue;
      }
      branchGroups[branchType].push(node);
    }

    const totalIfCount = Object.values(branchGroups).reduce((sum, list) => sum + list.length, 0);
    if (totalIfCount === 0) {
      return;
    }

    const sessionId = this.resolveWorkflowSessionId(nodes);
    const branchOrder: ResultBranchType[] = ['empty', 'draw', 'win', 'lose'];

    branchOrder.forEach((branchType, orderIndex) => {
      const ifNodes = branchGroups[branchType];
      if (ifNodes.length === 0) {
        return;
      }

      const config = RESULT_BRANCH_CONFIGS[branchType];
      const anchorNode = ifNodes[0];
      const basePosition = this.resolveResultBranchBasePosition(anchorNode, orderIndex);

      let screenNode = this.findNodeByName(nodes, config.screen.nodeName);
      if (!screenNode) {
        screenNode = this.buildResultScreenNode(config, sessionId, basePosition);
        nodes.push(screenNode);
      }

      let ttsNode = this.findNodeByName(nodes, config.tts.nodeName);
      if (!ttsNode) {
        ttsNode = this.buildResultTtsNode(config, sessionId, basePosition);
        nodes.push(ttsNode);
      }

      let speakerNode = this.findNodeByName(nodes, config.speaker.nodeName);
      if (!speakerNode) {
        speakerNode = this.buildResultSpeakerNode(config, sessionId, basePosition);
        nodes.push(speakerNode);
      }

      for (const ifNode of ifNodes) {
        const ifNodeName = String(ifNode.name || '');
        if (!ifNodeName) {
          continue;
        }
        this.topologyResolver.setOutputPrimaryTarget(connections, ifNodeName, config.screen.nodeName, 0);
      }

      this.topologyResolver.setOutputPrimaryTarget(connections, config.screen.nodeName, config.tts.nodeName, 0);
      this.topologyResolver.setOutputPrimaryTarget(connections, config.tts.nodeName, config.speaker.nodeName, 0);

      logger.info('WorkflowArchitect: ensured result branch chain', {
        branchType,
        ifCount: ifNodes.length,
        screenNode: config.screen.nodeName,
        ttsNode: config.tts.nodeName,
        speakerNode: config.speaker.nodeName,
      });
    });
  }

  private shouldEnforceResultBranches(workflow: WorkflowDefinition): boolean {
    if (!Array.isArray(workflow.nodes)) {
      return false;
    }

    const nodes = workflow.nodes as Array<Record<string, any>>;
    return nodes.some((node) => {
      if (node?.type !== 'n8n-nodes-base.if') {
        return false;
      }
      return Boolean(
        resolveResultBranchTypeFromIfNode({
          name: String(node?.name || ''),
          parameters: node?.parameters,
        })
      );
    });
  }

  private findNodeByName(
    nodes: Array<Record<string, any>>,
    nodeName: string
  ): Record<string, any> | undefined {
    return nodes.find((node) => String(node?.name || '') === nodeName);
  }

  private resolveWorkflowSessionId(nodes: Array<Record<string, any>>): string {
    for (const node of nodes) {
      const notes = normalizeNodeNotes(node?.notes);
      if (typeof notes.session_ID === 'string' && notes.session_ID.trim().length > 0) {
        return notes.session_ID.trim();
      }
    }
    return '';
  }

  private resolveResultBranchBasePosition(
    anchorIfNode: Record<string, any>,
    orderIndex: number
  ): [number, number] {
    const anchorPos = Array.isArray(anchorIfNode?.position) ? anchorIfNode.position : [0, 0];
    const anchorX = typeof anchorPos[0] === 'number' ? anchorPos[0] : 0;
    const anchorY = typeof anchorPos[1] === 'number' ? anchorPos[1] : 0;
    return [anchorX + 260, anchorY + orderIndex * 20];
  }

  private buildResultScreenNode(
    config: ResultBranchConfig,
    sessionId: string,
    basePosition: [number, number]
  ): Record<string, any> {
    return {
      id: randomUUID(),
      name: config.screen.nodeName,
      type: 'n8n-nodes-base.code',
      typeVersion: getNodeTypeVersion('n8n-nodes-base.code') ?? 2,
      position: [basePosition[0], basePosition[1]],
      parameters: { jsCode: 'return items;' },
      notes: {
        title: '胜负表情展示',
        subtitle: '物理显示单元。根据裁判结果，在屏幕上显示出机器人此时的情绪眼神。',
        category: 'SCREEN',
        session_ID: sessionId,
        extra: 'pending',
        topology: null,
        device_ID: null,
        sub: {
          execute_emoji: config.screen.emoji,
        },
      },
    };
  }

  private buildResultTtsNode(
    config: ResultBranchConfig,
    sessionId: string,
    basePosition: [number, number]
  ): Record<string, any> {
    return {
      id: randomUUID(),
      name: config.tts.nodeName,
      type: 'n8n-nodes-base.set',
      typeVersion: getNodeTypeVersion('n8n-nodes-base.set') ?? 3.4,
      position: [basePosition[0] + 240, basePosition[1]],
      parameters: {
        assignments: {
          assignments: [],
        },
        options: {},
      },
      notes: {
        title: '对战脚本合成',
        subtitle: '策略编排单元。根据输赢结果，匹配对应的表情和回复文字。',
        category: 'TTS',
        session_ID: sessionId,
        extra: 'pending',
        topology: null,
        device_ID: null,
        sub: {
          TTS_input: config.tts.defaultInput,
          audio_name: config.tts.audioName,
        },
      },
    };
  }

  private buildResultSpeakerNode(
    config: ResultBranchConfig,
    sessionId: string,
    basePosition: [number, number]
  ): Record<string, any> {
    return {
      id: randomUUID(),
      name: config.speaker.nodeName,
      type: 'n8n-nodes-base.code',
      typeVersion: getNodeTypeVersion('n8n-nodes-base.code') ?? 2,
      position: [basePosition[0] + 480, basePosition[1]],
      parameters: { jsCode: 'return items;' },
      notes: {
        title: '结果音频播报',
        subtitle: '物理表达单元。最后播放出语音反馈，完成本轮游戏交互。',
        category: 'SPEAKER',
        session_ID: sessionId,
        extra: 'pending',
        topology: null,
        device_ID: null,
        sub: {
          audio_name: config.speaker.audioName,
        },
      },
    };
  }
}
