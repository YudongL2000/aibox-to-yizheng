/**
 * [INPUT]: 依赖 CapabilityRegistry 提供能力定义，依赖 WorkflowArchitect（可选）后处理与可选 trace writer
 * [OUTPUT]: 对外提供 ComponentComposer 能力到节点的动态组合与组合过程上报
 * [POS]: agents 的能力驱动拼装器，负责能力映射与拓扑自动构建
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { randomUUID } from 'node:crypto';
import { getNodeTypeVersion } from './node-type-versions';
import { CapabilityRegistry } from './capability-registry';
import { buildExecutableCodeNodeParameters } from '../utils/code-node-parameters';
import type {
  AgentTraceWriter,
  HardwareCapability,
  NodeCategory,
  NodeSubParams,
  WorkflowDefinition,
} from './types';

interface ComposerMeta {
  role: 'trigger' | 'capability' | 'logic';
  stage: number;
  capabilityId?: string;
  dependencies: string[];
}

type ComposerNode = {
  id: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  notes?: Record<string, unknown>;
  __composer: ComposerMeta;
};

export class ComponentComposer {
  constructor(
    private capabilityRegistry: CapabilityRegistry,
    private workflowArchitect?: unknown
  ) {}

  async compose(
    capabilities: HardwareCapability[],
    userRequirements: Record<string, any>,
    trace?: AgentTraceWriter
  ): Promise<WorkflowDefinition> {
    trace?.({
      source: 'component_composer',
      phase: 'composition',
      kind: 'phase',
      status: 'started',
      title: 'ComponentComposer 开始组合',
      detail: `输入能力 ${capabilities.length} 个`,
    });
    const resolvedCapabilities = this.resolveCapabilities(capabilities, userRequirements);
    trace?.({
      source: 'component_composer',
      phase: 'composition',
      kind: 'result',
      status: 'completed',
      title: '能力解析完成',
      detail: resolvedCapabilities.map((capability) => capability.displayName).join(' / ') || '未命中能力',
      data: {
        capabilityIds: resolvedCapabilities.map((capability) => capability.id),
      },
    });
    const nodes = this.capabilitiesToNodes(resolvedCapabilities, userRequirements);
    trace?.({
      source: 'component_composer',
      phase: 'composition',
      kind: 'result',
      status: 'completed',
      title: '节点草图已生成',
      detail: `生成 ${nodes.length} 个节点草图`,
    });
    const topology = this.buildTopology(nodes, resolvedCapabilities);
    const workflow = this.fillParameters(topology, userRequirements);
    const finalWorkflow = this.generateExpressions(workflow);

    // 预留钩子：后续可接入 WorkflowArchitect 的标准化/验证链
    void this.workflowArchitect;

    trace?.({
      source: 'component_composer',
      phase: 'composition',
      kind: 'phase',
      status: 'completed',
      title: 'ComponentComposer 组合完成',
      detail: `工作流含 ${finalWorkflow.nodes.length} 个节点`,
      data: {
        nodeCount: finalWorkflow.nodes.length,
      },
    });

    return finalWorkflow;
  }

  private resolveCapabilities(
    capabilities: HardwareCapability[],
    userRequirements: Record<string, any>
  ): HardwareCapability[] {
    const selected = capabilities.length > 0
      ? capabilities
      : this.capabilityRegistry.query(this.extractQueryKeywords(userRequirements));

    const deduped = new Map<string, HardwareCapability>();
    selected.forEach((capability) => deduped.set(capability.id, capability));

    const validation = this.capabilityRegistry.canCompose(Array.from(deduped.keys()));
    if (!validation.valid) {
      this.capabilityRegistry.getByIds(validation.missing).forEach((capability) => {
        deduped.set(capability.id, capability);
      });
    }

    return Array.from(deduped.values()).sort((a, b) => {
      const stageDiff = this.resolveStage(a) - this.resolveStage(b);
      if (stageDiff !== 0) {
        return stageDiff;
      }
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return a.id.localeCompare(b.id);
    });
  }

  private extractQueryKeywords(userRequirements: Record<string, any>): string[] {
    const candidates: string[] = [];

    const intent = userRequirements.userIntent;
    if (typeof intent === 'string' && intent.trim()) {
      candidates.push(...intent.split(/[\s,，。！？!?.、]+/).filter(Boolean));
    }

    const rawKeywords = userRequirements.keywords;
    if (Array.isArray(rawKeywords)) {
      rawKeywords.forEach((keyword) => {
        if (typeof keyword === 'string') {
          candidates.push(keyword);
        }
      });
    }

    return Array.from(new Set(candidates));
  }

  private capabilitiesToNodes(
    capabilities: HardwareCapability[],
    requirements: Record<string, any>
  ): ComposerNode[] {
    const nodes: ComposerNode[] = [];

    nodes.push(this.createTriggerNode(requirements.trigger_type, requirements));

    capabilities.forEach((capability, index) => {
      nodes.push(this.createCapabilityNode(capability, requirements, index));
    });

    if (this.needsLogicNode(capabilities, requirements)) {
      nodes.push(this.createLogicNode(requirements));
    }

    return nodes;
  }

  private buildTopology(
    nodes: ComposerNode[],
    capabilities: HardwareCapability[]
  ): WorkflowDefinition {
    const trigger = nodes.find((node) => node.__composer.role === 'trigger') ??
      this.createTriggerNode('webhook', {});
    const others = nodes
      .filter((node) => node.id !== trigger.id)
      .sort((a, b) => {
        if (a.__composer.stage !== b.__composer.stage) {
          return a.__composer.stage - b.__composer.stage;
        }
        return a.name.localeCompare(b.name);
      });

    const capNodeNameById = new Map<string, string>();
    others.forEach((node) => {
      if (node.__composer.capabilityId) {
        capNodeNameById.set(node.__composer.capabilityId, node.name);
      }
    });

    const connections: Record<string, unknown> = {};
    let previousNodeName = trigger.name;

    others.forEach((node, index) => {
      const dependencySources = node.__composer.dependencies
        .map((dependencyId) => capNodeNameById.get(dependencyId))
        .filter((name): name is string => Boolean(name));

      const sources = dependencySources.length > 0
        ? dependencySources
        : this.resolveFallbackSources(others, index, trigger.name, previousNodeName);

      sources.forEach((source) => this.addConnection(connections, source, node.name));
      previousNodeName = node.name;
    });

    this.applyAutoLayout(trigger, others);

    const workflowNodes = [trigger, ...others].map((node) => {
      const { __composer, ...rest } = node;
      void __composer;
      return rest as Record<string, unknown>;
    });

    return {
      name: this.resolveWorkflowName(capabilities),
      nodes: workflowNodes,
      connections,
      settings: {},
    };
  }

  private resolveFallbackSources(
    orderedNodes: ComposerNode[],
    currentIndex: number,
    triggerName: string,
    previousNodeName: string
  ): string[] {
    const current = orderedNodes[currentIndex];

    if (current.__composer.role === 'logic') {
      const previousProcessor = orderedNodes
        .slice(0, currentIndex)
        .reverse()
        .find((node) => node.__composer.stage <= current.__composer.stage);
      if (previousProcessor) {
        return [previousProcessor.name];
      }
    }

    if (currentIndex === 0) {
      return [triggerName];
    }

    return [previousNodeName];
  }

  private createTriggerNode(triggerType: unknown, requirements: Record<string, any>): ComposerNode {
    const useSchedule = triggerType === 'scheduleTrigger' || Boolean(requirements.schedule_time);
    const type = useSchedule ? 'n8n-nodes-base.scheduleTrigger' : 'n8n-nodes-base.webhook';

    return {
      id: randomUUID(),
      name: useSchedule ? 'schedule_trigger' : 'webhook_trigger',
      type,
      typeVersion: getNodeTypeVersion(type),
      position: [0, 0],
      parameters: useSchedule
        ? {
            rule: {
              interval: [
                {
                  field: 'minutes',
                  minutesInterval: 1,
                },
              ],
            },
          }
        : {
            httpMethod: 'POST',
            path: requirements.webhookPath ?? 'component-composer',
          },
      notes: {
        category: 'BASE',
      },
      __composer: {
        role: 'trigger',
        stage: 0,
        dependencies: [],
      },
    };
  }

  private createCapabilityNode(
    capability: HardwareCapability,
    requirements: Record<string, any>,
    index: number
  ): ComposerNode {
    const nodeType = capability.nodeType;
    const nodeName = this.buildNodeName(capability, index);

    return {
      id: randomUUID(),
      name: nodeName,
      type: nodeType,
      typeVersion: getNodeTypeVersion(nodeType),
      position: [0, 0],
      parameters: this.buildCapabilityNodeParameters(capability),
      notes: {
        category: capability.category,
        sub: this.extractSubParams(capability, requirements),
      },
      __composer: {
        role: 'capability',
        stage: this.resolveStage(capability),
        capabilityId: capability.id,
        dependencies: capability.dependencies ?? [],
      },
    };
  }

  private buildNodeName(capability: HardwareCapability, index: number): string {
    const raw = `${capability.component}_${capability.capability}_${index + 1}`;
    return raw.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  }

  private extractSubParams(
    capability: HardwareCapability,
    requirements: Record<string, any>
  ): Partial<NodeSubParams> {
    const capabilityParams = this.readRecord(requirements.capabilityParams)?.[capability.id];
    if (this.isRecord(capabilityParams)) {
      return capabilityParams as Partial<NodeSubParams>;
    }

    const componentParams = this.readRecord(requirements.componentParams)?.[capability.component];
    if (this.isRecord(componentParams)) {
      return componentParams as Partial<NodeSubParams>;
    }

    return {};
  }

  private needsLogicNode(
    capabilities: HardwareCapability[],
    requirements: Record<string, any>
  ): boolean {
    const conditions = requirements.conditions;
    if (Array.isArray(conditions) && conditions.length > 0) {
      return true;
    }

    const hasBranchingHint = Boolean(requirements.logicExpression || requirements.branchCount > 1);
    if (hasBranchingHint) {
      return true;
    }

    const hasSensor = capabilities.some((capability) => this.resolveStage(capability) === 1);
    const hasExecutor = capabilities.some((capability) => this.resolveStage(capability) === 3);
    const hasProcessor = capabilities.some((capability) => this.resolveStage(capability) === 2);

    return hasSensor && hasExecutor && !hasProcessor;
  }

  private createLogicNode(requirements: Record<string, any>): ComposerNode {
    const nodeType = 'n8n-nodes-base.if';

    return {
      id: randomUUID(),
      name: 'if_capability_gate',
      type: nodeType,
      typeVersion: getNodeTypeVersion(nodeType),
      position: [0, 0],
      parameters: {
        conditions: requirements.conditions ?? {
          options: {
            caseSensitive: true,
            typeValidation: 'strict',
            version: 1,
          },
          conditions: [
            {
              leftValue: '={{true}}',
              rightValue: true,
              operator: {
                type: 'boolean',
                operation: 'true',
              },
            },
          ],
          combinator: 'and',
        },
      },
      notes: {
        category: 'BASE',
      },
      __composer: {
        role: 'logic',
        stage: 2,
        dependencies: [],
      },
    };
  }

  private resolveStage(capability: Pick<HardwareCapability, 'category' | 'nodeType'>): number {
    if (capability.nodeType === 'n8n-nodes-base.scheduleTrigger') {
      return 0;
    }

    if (['CAM', 'MIC', 'FACE-NET', 'YOLO-HAND', 'YOLO-RPS', 'ASR'].includes(capability.category)) {
      return 1;
    }

    if (
      capability.nodeType === 'n8n-nodes-base.if' ||
      capability.nodeType === 'n8n-nodes-base.splitInBatches' ||
      ['LLM', 'LLM-EMO', 'RAM', 'ASSIGN'].includes(capability.category)
    ) {
      return 2;
    }

    if (['HAND', 'SCREEN', 'TTS', 'SPEAKER', 'WHEEL'].includes(capability.category)) {
      return 3;
    }

    return 2;
  }

  private buildCapabilityNodeParameters(capability: HardwareCapability): Record<string, unknown> {
    switch (capability.nodeType) {
      case 'n8n-nodes-base.httpRequest':
        return {
          method: capability.apiEndpoint.method,
          url: capability.apiEndpoint.url,
          options: {},
          ...(capability.apiEndpoint.parameters ?? {}),
        };
      case 'n8n-nodes-base.set':
        return {
          assignments: {
            assignments: [],
          },
          options: {},
        };
      case 'n8n-nodes-base.code':
        return buildExecutableCodeNodeParameters();
      case 'n8n-nodes-base.scheduleTrigger':
        return {
          rule: {
            interval: [{}],
          },
        };
      case 'n8n-nodes-base.if':
        return {
          conditions: {
            options: {
              version: 3,
              caseSensitive: true,
              typeValidation: 'loose',
            },
            combinator: 'and',
            conditions: [],
          },
        };
      case 'n8n-nodes-base.splitInBatches':
        return {
          batchSize: 1,
          options: {
            reset: false,
          },
        };
      default:
        return {};
    }
  }

  private addConnection(connections: Record<string, unknown>, source: string, target: string): void {
    const current = this.readRecord(connections[source]);
    const main = Array.isArray(current.main) ? current.main : [[]];
    const firstLane = Array.isArray(main[0]) ? main[0] as Array<Record<string, unknown>> : [];

    const exists = firstLane.some((edge) => edge.node === target);
    if (!exists) {
      firstLane.push({ node: target, type: 'main', index: 0 });
    }

    connections[source] = {
      main: [firstLane],
    };
  }

  private applyAutoLayout(trigger: ComposerNode, nodes: ComposerNode[]): void {
    const laneCountByStage = new Map<number, number>();
    trigger.position = [0, 0];

    nodes.forEach((node) => {
      const stage = node.__composer.stage;
      const lane = laneCountByStage.get(stage) ?? 0;
      node.position = [stage * 360, lane * 220];
      laneCountByStage.set(stage, lane + 1);
    });
  }

  private resolveWorkflowName(capabilities: HardwareCapability[]): string {
    if (capabilities.length === 0) {
      return 'capability_workflow';
    }

    const names = capabilities
      .slice(0, 3)
      .map((capability) => capability.component)
      .join('_');

    return `capability_workflow_${names}`;
  }

  private fillParameters(
    workflow: WorkflowDefinition,
    requirements: Record<string, any>
  ): WorkflowDefinition {
    const overrides = this.readRecord(requirements.nodeParameterOverrides);
    const defaultTimeout = typeof requirements.timeoutMs === 'number' ? requirements.timeoutMs : null;

    const nodes = workflow.nodes.map((rawNode) => {
      const node = { ...rawNode } as Record<string, unknown>;
      const nodeName = typeof node.name === 'string' ? node.name : '';
      const nodeType = typeof node.type === 'string' ? node.type : '';
      const parameters = this.readRecord(node.parameters);

      const override = this.readRecord(overrides[nodeName]);
      const mergedParameters = {
        ...parameters,
        ...override,
      };

      if (defaultTimeout && nodeType === 'n8n-nodes-base.httpRequest' && mergedParameters.options === undefined) {
        mergedParameters.options = { timeout: defaultTimeout };
      }

      node.parameters = mergedParameters;
      return node;
    });

    return {
      ...workflow,
      nodes,
    };
  }

  private generateExpressions(workflow: WorkflowDefinition): WorkflowDefinition {
    const nodes = workflow.nodes.map((rawNode) => {
      const node = { ...rawNode } as Record<string, unknown>;
      if (node.type !== 'n8n-nodes-base.webhook') {
        return node;
      }

      const parameters = this.readRecord(node.parameters);
      const path = parameters.path;
      if (typeof path === 'string' && path.includes('{{')) {
        parameters.path = `=${path}`;
      }
      node.parameters = parameters;
      return node;
    });

    return {
      ...workflow,
      nodes,
    };
  }

  private readRecord(value: unknown): Record<string, any> {
    return this.isRecord(value) ? value : {};
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}
