/**
 * [INPUT]: 依赖 HAND->ASSIGN 依赖规则、拓扑解析器、节点模板与 notes 标准化
 * [OUTPUT]: 对外提供 WorkflowAssignFlow，负责补齐 HAND 后置 ASSIGN 状态节点
 * [POS]: workflow-architect/scene 的状态桥接安全网，被 WorkflowArchitect 后处理阶段调用
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { randomUUID } from 'crypto';
import { getNodeTypeVersion } from '../../node-type-versions';
import { getNodeParameterTemplate } from '../../prompts/node-templates';
import { validateHandHasAssign, WorkflowNode as DependencyWorkflowNode } from '../../prompts/node-dependency-rules';
import { normalizeNodeNotes } from '../../../utils/node-notes';
import { WorkflowDefinition } from '../../types';
import { logger } from '../../../utils/logger';
import { WorkflowTopologyResolver } from '../node/topology-resolver';

export class WorkflowAssignFlow {
  constructor(private topologyResolver: WorkflowTopologyResolver) {}

  ensureHandHasAssign(workflow: WorkflowDefinition): void {
    if (!Array.isArray(workflow.nodes) || !workflow.connections || typeof workflow.connections !== 'object') {
      return;
    }

    if (!this.shouldEnforceHandAssign(workflow)) {
      return;
    }

    const nodes = workflow.nodes as Array<Record<string, any>>;
    const connections = workflow.connections as Record<string, any>;
    const handNodes = nodes.filter((node) => normalizeNodeNotes(node.notes).category === 'HAND');

    for (const handNode of handNodes) {
      const handName = String(handNode.name || '');
      if (!handName) {
        continue;
      }

      const successors = this.topologyResolver.findSuccessors(handName, nodes, connections);
      const validation = validateHandHasAssign(
        this.toDependencyNode(handNode),
        successors.map((node) => this.toDependencyNode(node))
      );
      if (validation.valid) {
        continue;
      }

      const assignName = `set_assign_for_${handName.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      const assignNode = this.buildAssignNode(assignName, handNode, validation.fix?.insertNode.sub?.robotGesture);
      nodes.push(assignNode);

      const outgoingTargets = this.topologyResolver.findOutgoingTargets(handName, connections);
      connections[handName] = {
        main: [[{ node: assignName, type: 'main', index: 0 }]],
      };
      outgoingTargets.forEach((targetName) => {
        this.topologyResolver.ensureEdge(workflow, assignName, targetName);
      });

      logger.info('WorkflowArchitect: inserted ASSIGN node after HAND', {
        handNode: handName,
        assignNode: assignName,
        successorCount: outgoingTargets.length,
      });
    }
  }

  private shouldEnforceHandAssign(workflow: WorkflowDefinition): boolean {
    if (!Array.isArray(workflow.nodes)) {
      return false;
    }
    return (workflow.nodes as Array<Record<string, any>>).some(
      (node) => normalizeNodeNotes(node.notes).category === 'HAND'
    );
  }

  private buildAssignNode(
    nodeName: string,
    handNode: Record<string, any>,
    robotGesture?: string
  ): Record<string, any> {
    const template = getNodeParameterTemplate('n8n-nodes-base.set');
    const handNotes = normalizeNodeNotes(handNode.notes);
    const handPos = Array.isArray(handNode.position) ? handNode.position : [0, 0];
    const x = typeof handPos[0] === 'number' ? handPos[0] + 220 : 220;
    const y = typeof handPos[1] === 'number' ? handPos[1] : 0;
    const executeGesture = handNotes.sub?.execute_gesture;
    const fallbackGesture =
      typeof executeGesture === 'string' ? executeGesture.toLowerCase() : '';
    const finalGesture = typeof robotGesture === 'string' ? robotGesture : fallbackGesture;

    return {
      id: randomUUID(),
      name: nodeName,
      type: 'n8n-nodes-base.set',
      typeVersion: getNodeTypeVersion('n8n-nodes-base.set') ?? 3.4,
      position: [x, y],
      parameters: template.parameters,
      notes: {
        title: '机器人手势赋值',
        subtitle: '记录机械手执行结果，供后续胜负判断复用',
        category: 'ASSIGN',
        session_ID: '',
        extra: 'pending',
        topology: null,
        device_ID: null,
        sub: {
          robotGesture: finalGesture,
        },
      },
    };
  }

  private toDependencyNode(node: Record<string, any>): DependencyWorkflowNode {
    const notesValue = node.notes;
    const notes =
      typeof notesValue === 'string'
        ? notesValue
        : JSON.stringify(notesValue && typeof notesValue === 'object' ? notesValue : {});
    return {
      id: String(node.id || randomUUID()),
      name: String(node.name || ''),
      type: String(node.type || ''),
      notes,
      parameters: node.parameters && typeof node.parameters === 'object' ? node.parameters : {},
    };
  }
}
