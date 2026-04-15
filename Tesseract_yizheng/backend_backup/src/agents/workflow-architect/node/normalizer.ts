/**
 * [INPUT]: 依赖 notes-enricher、topology-resolver、节点模板与 category/type 规则
 * [OUTPUT]: 对外提供 WorkflowNodeNormalizer，负责节点参数修复与工作流归一化主流程
 * [POS]: workflow-architect/node 的核心归一化器，被 WorkflowArchitect 在 LLM 输出后调用
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { WorkflowDefinition } from '../../types';
import { getNodeTypeVersion } from '../../node-type-versions';
import { buildExecutableCodeNodeParameters } from '../../../utils/code-node-parameters';
import { getNodeParameterTemplate } from '../../prompts/node-templates';
import { resolveExpectedNodeType } from '../../prompts/node-type-mapping';
import { WorkflowNotesEnricher } from './notes-enricher';
import { WorkflowTopologyResolver } from './topology-resolver';
import { isIdentityIfNodeName } from './node-rules';

export interface WorkflowPostProcessor {
  apply(workflow: WorkflowDefinition): void;
}

export class WorkflowNodeNormalizer {
  constructor(
    private notesEnricher: WorkflowNotesEnricher,
    private topologyResolver: WorkflowTopologyResolver,
    private postProcessor?: WorkflowPostProcessor
  ) {}

  normalizeWorkflow(workflow: WorkflowDefinition): WorkflowDefinition {
    if (!Array.isArray(workflow.nodes)) {
      return workflow;
    }
    this.topologyResolver.ensureNodeIds(workflow.nodes as Array<Record<string, any>>);
    const hasConnections =
      workflow.connections &&
      typeof workflow.connections === 'object' &&
      Object.keys(workflow.connections).length > 0;
    if (!hasConnections) {
      workflow.connections = {};
      this.topologyResolver.addDefaultConnections(workflow);
    }
    const nameRemap = new Map<string, string>();
    workflow.nodes.forEach((node) => {
      const previousName = typeof node?.name === 'string' ? node.name : '';
      this.normalizeNode(node as Record<string, any>);
      const normalizedName = typeof node?.name === 'string' ? node.name : '';
      if (previousName && normalizedName && previousName !== normalizedName) {
        nameRemap.set(previousName, normalizedName);
      }
      if (node?.type !== 'n8n-nodes-base.if') {
        return;
      }
      const params = (node?.parameters ?? {}) as Record<string, any>;
      if (!params.conditions) {
        return;
      }
      if (params.conditions.combinator && Array.isArray(params.conditions.conditions)) {
        if (params.combineOperation) {
          delete params.combineOperation;
        }
        return;
      }
      const normalized = this.convertLegacyIfConditions(params.conditions, params.combineOperation);
      if (normalized.conditions.length > 0) {
        params.conditions = normalized;
        delete params.combineOperation;
      }
    });
    this.topologyResolver.normalizeConnections(workflow);
    this.topologyResolver.pruneRedundantSetNodes(workflow);
    this.postProcessor?.apply(workflow);
    this.topologyResolver.ensureUniqueNodeNames(workflow.nodes as Array<Record<string, any>>, nameRemap);
    this.topologyResolver.remapConnectionNodeNames(workflow, nameRemap);
    this.topologyResolver.retainPrimaryTriggerChain(workflow);
    return workflow;
  }

  normalizeNode(node: Record<string, any> | undefined): void {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (!node.parameters || typeof node.parameters !== 'object') {
      node.parameters = {};
    }
    this.notesEnricher.ensureNodeNotes(node);
    this.alignNodeTypeWithCategory(node);
    this.ensureNodeTypeVersion(node);

    switch (node.type) {
      case 'n8n-nodes-base.webhook':
        this.normalizeWebhookNode(node);
        break;
      case 'n8n-nodes-base.if':
        this.normalizeIfNode(node);
        break;
      case 'n8n-nodes-base.set':
        this.normalizeSetNode(node);
        break;
      case 'n8n-nodes-base.httpRequest':
        this.normalizeHttpRequestNode(node);
        break;
      case 'n8n-nodes-base.code':
        this.normalizeCodeNode(node);
        break;
      case 'n8n-nodes-base.scheduleTrigger':
        this.normalizeScheduleTriggerNode(node);
        break;
      case 'n8n-nodes-base.splitInBatches':
        this.normalizeSplitInBatchesNode(node);
        break;
      default:
        break;
    }
  }

  buildFallbackIfConditions(nodeName: string): Record<string, unknown> | null {
    const normalizedName = (nodeName || '').toLowerCase();
    const createCondition = (leftValue: string, rightValue: string | number, type: 'string' | 'number') => ({
      id: `${normalizedName}_${leftValue}_${rightValue}`.replace(/[^a-z0-9_]/g, '_'),
      leftValue,
      rightValue,
      operator: {
        type,
        operation: 'equals',
        name: 'filter.operator.equals',
      },
    });

    if (
      normalizedName.includes('robot_gesture') ||
      normalizedName.includes('robot_n') ||
      normalizedName.includes('n_eq_') ||
      normalizedName.includes('n_equals_')
    ) {
      const matchedNumber = normalizedName.match(/(?:n_eq_|n_equals_)([123])/);
      const rightValue = matchedNumber?.[1] ? Number(matchedNumber[1]) : 1;
      return {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 1 },
        conditions: [createCondition('n', rightValue, 'number')],
        combinator: 'and',
      };
    }

    if (normalizedName.includes('gesture_rock')) {
      return {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 1 },
        conditions: [createCondition('robotGesture', 'rock', 'string')],
        combinator: 'and',
      };
    }
    if (normalizedName.includes('gesture_scissors')) {
      return {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 1 },
        conditions: [createCondition('robotGesture', 'scissors', 'string')],
        combinator: 'and',
      };
    }
    if (normalizedName.includes('gesture_paper')) {
      return {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 1 },
        conditions: [createCondition('robotGesture', 'paper', 'string')],
        combinator: 'and',
      };
    }

    if (normalizedName.includes('emotion_is_happy')) {
      return {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 1 },
        conditions: [createCondition('emotionText', 'happy', 'string')],
        combinator: 'or',
      };
    }
    if (normalizedName.includes('emotion_is_sad')) {
      return {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 1 },
        conditions: [createCondition('emotionText', 'sad', 'string')],
        combinator: 'or',
      };
    }

    return null;
  }

  isIdentityIfNodeName(nodeName: string): boolean {
    return isIdentityIfNodeName(nodeName);
  }

  private alignNodeTypeWithCategory(node: Record<string, any>): void {
    const notes = typeof node.notes === 'object' && node.notes ? (node.notes as Record<string, any>) : {};
    const currentType = typeof node.type === 'string' ? node.type : '';
    const normalizedName = String(node.name || '').toLowerCase();
    let expectedType = resolveExpectedNodeType(notes.category, currentType);
    if (this.isIdentityIfNodeName(normalizedName) && currentType !== 'n8n-nodes-base.if') {
      expectedType = 'n8n-nodes-base.if';
    }
    if (!expectedType || expectedType === currentType) {
      return;
    }
    node.type = expectedType;
    const template = getNodeParameterTemplate(expectedType);
    const currentParams =
      node.parameters && typeof node.parameters === 'object' ? (node.parameters as Record<string, unknown>) : {};

    if (expectedType === 'n8n-nodes-base.httpRequest') {
      const templateParams = template.parameters as Record<string, unknown>;
      const url = typeof currentParams.url === 'string' ? currentParams.url : (templateParams.url as string);
      const method =
        typeof currentParams.method === 'string' ? currentParams.method : (templateParams.method as string);
      node.parameters = { method, url, options: {} };
      return;
    }

    node.parameters = template.parameters;
    if (typeof template.typeVersion === 'number') {
      node.typeVersion = template.typeVersion;
    }
    delete node.onError;
  }

  private ensureNodeTypeVersion(node: Record<string, any>): void {
    const minVersion = getNodeTypeVersion(node.type);
    if (typeof minVersion !== 'number') {
      return;
    }
    if (typeof node.typeVersion !== 'number' || node.typeVersion < minVersion) {
      node.typeVersion = minVersion;
    }
  }

  private normalizeWebhookNode(node: Record<string, any>): void {
    const params = node.parameters as Record<string, any>;
    if (!params.httpMethod) {
      params.httpMethod = 'POST';
    }
    if (!params.path) {
      params.path = 'webhook';
    }
    if (!params.responseMode) {
      params.responseMode = 'onReceived';
    }
    if (!params.options) {
      params.options = {};
    }
    if (params.responseMode === 'responseNode' && node.onError !== 'continueRegularOutput') {
      node.onError = 'continueRegularOutput';
    }
  }

  private normalizeIfNode(node: Record<string, any>): void {
    const params = node.parameters as Record<string, any>;
    if (!params.conditions || !Array.isArray(params.conditions.conditions) || params.conditions.conditions.length === 0) {
      const fallbackConditions = this.buildFallbackIfConditions(String(node.name || ''));
      if (fallbackConditions) {
        params.conditions = fallbackConditions;
      }
    }
    if (!params.conditions) {
      return;
    }
    if (!params.conditions.combinator) {
      params.conditions.combinator = 'and';
    }
    if (!params.conditions.options) {
      params.conditions.options = {
        version: 2,
        caseSensitive: true,
        typeValidation: 'loose',
        leftValue: '',
      };
    }

    if (Array.isArray(params.conditions.conditions)) {
      const normalizedConditions = params.conditions.conditions.map((condition: unknown) => {
        if (!condition || typeof condition !== 'object') {
          return condition;
        }
        const next = condition as Record<string, unknown>;
        if ('leftValue' in next) {
          next.leftValue = this.normalizeIfExpressionValue(next.leftValue);
        }
        if ('rightValue' in next) {
          next.rightValue = this.normalizeIfExpressionValue(next.rightValue);
        }
        return next;
      });
      params.conditions.conditions = normalizedConditions.map((condition: unknown) => {
        if (!condition || typeof condition !== 'object') {
          return condition;
        }
        const next = condition as Record<string, unknown>;
        if (!this.hasNonEmptyString(next.leftValue)) {
          const inferredLeftValue = this.inferMissingIfLeftValue(
            String(node.name || ''),
            next,
            normalizedConditions as Array<Record<string, unknown>>,
            params.conditions.options
          );
          if (inferredLeftValue) {
            next.leftValue = inferredLeftValue;
          }
        }
        return next;
      });
    }
  }

  private hasNonEmptyString(value: unknown): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private inferMissingIfLeftValue(
    nodeName: string,
    condition: Record<string, unknown>,
    allConditions: Array<Record<string, unknown>>,
    options: unknown
  ): string | null {
    const optionLeftValue =
      options && typeof options === 'object'
        ? this.normalizeIfExpressionValue((options as Record<string, unknown>).leftValue)
        : null;
    if (this.hasNonEmptyString(optionLeftValue)) {
      return (optionLeftValue as string).trim();
    }

    for (const item of allConditions) {
      const candidate = this.normalizeIfExpressionValue(item?.leftValue);
      if (this.hasNonEmptyString(candidate)) {
        return (candidate as string).trim();
      }
    }

    const normalizedName = (nodeName || '').toLowerCase();
    if (
      normalizedName.includes('robot_gesture') ||
      normalizedName.includes('robot_n') ||
      normalizedName.includes('n_eq_') ||
      normalizedName.includes('n_equals_')
    ) {
      return 'n';
    }

    const operator =
      condition.operator && typeof condition.operator === 'object'
        ? (condition.operator as Record<string, unknown>)
        : {};
    const operatorType = typeof operator.type === 'string' ? operator.type.toLowerCase() : '';
    const rightValue = condition.rightValue;
    const isRandomBranchValue =
      rightValue === 1 ||
      rightValue === 2 ||
      rightValue === 3 ||
      rightValue === '1' ||
      rightValue === '2' ||
      rightValue === '3';
    if (operatorType === 'number' && isRandomBranchValue) {
      return 'n';
    }

    return null;
  }

  private normalizeIfExpressionValue(value: unknown): unknown {
    const stripJsonExpression = (raw: string): string | null => {
      const trimmed = raw.trim();
      if (!trimmed) {
        return null;
      }

      const withoutEqual = trimmed.startsWith('=') ? trimmed.slice(1).trim() : trimmed;
      const expression =
        withoutEqual.startsWith('{{') && withoutEqual.endsWith('}}')
          ? withoutEqual.slice(2, -2).trim()
          : withoutEqual;

      const directMatch = expression.match(/^\$json\.([A-Za-z_][\w]*)$/);
      if (directMatch?.[1]) {
        return directMatch[1];
      }
      const bracketMatch = expression.match(/^\$json\[['"]([^'"]+)['"]\]$/);
      if (bracketMatch?.[1]) {
        return bracketMatch[1];
      }
      const firstDotMatch = expression.match(/\$json\.([A-Za-z_][\w]*)/);
      if (firstDotMatch?.[1]) {
        return firstDotMatch[1];
      }
      const firstBracketMatch = expression.match(/\$json\[['"]([^'"]+)['"]\]/);
      if (firstBracketMatch?.[1]) {
        return firstBracketMatch[1];
      }

      return null;
    };

    if (typeof value === 'string') {
      const normalized = stripJsonExpression(value);
      return normalized ?? value;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const rl = value as Record<string, unknown>;
      if (rl.__rl === true && typeof rl.value === 'string') {
        const normalized = stripJsonExpression(rl.value);
        if (normalized) {
          return { ...rl, value: normalized };
        }
      }
    }

    return value;
  }

  private normalizeSetNode(node: Record<string, any>): void {
    const template = getNodeParameterTemplate('n8n-nodes-base.set');
    node.parameters = template.parameters;
  }

  private normalizeHttpRequestNode(node: Record<string, any>): void {
    const template = getNodeParameterTemplate('n8n-nodes-base.httpRequest').parameters as Record<string, unknown>;
    const params = (node.parameters as Record<string, unknown>) ?? {};
    const currentUrl = typeof params.url === 'string' ? params.url : '';
    const currentMethod = typeof params.method === 'string' ? params.method : '';
    const currentOptions =
      params.options && typeof params.options === 'object' && !Array.isArray(params.options)
        ? (params.options as Record<string, unknown>)
        : {};

    node.parameters = {
      method: currentMethod || (template.method as string),
      url: currentUrl || (template.url as string),
      options: currentOptions,
    };

    if (node.onError === 'continueErrorOutput') {
      delete node.onError;
    }
  }

  private normalizeScheduleTriggerNode(node: Record<string, any>): void {
    const template = getNodeParameterTemplate('n8n-nodes-base.scheduleTrigger');
    node.parameters = template.parameters;
  }

  private normalizeCodeNode(node: Record<string, any>): void {
    const params =
      node.parameters && typeof node.parameters === 'object'
        ? (node.parameters as Record<string, unknown>)
        : {};
    node.parameters = buildExecutableCodeNodeParameters(params);
    if (node.onError === 'continueErrorOutput') {
      delete node.onError;
    }
  }

  private normalizeSplitInBatchesNode(node: Record<string, any>): void {
    const params = node.parameters as Record<string, any>;
    if (!params.batchSize) {
      params.batchSize = 1;
    }
    if (!params.options) {
      params.options = { reset: false };
    }
  }

  private convertLegacyIfConditions(
    conditions: any,
    combineOperation?: string
  ): {
    conditions: Array<Record<string, unknown>>;
    combinator: 'and' | 'or';
    options: { version: number; caseSensitive: boolean; typeValidation: 'loose' };
  } {
    const legacyGroups = this.collectLegacyIfConditions(conditions);
    const combinator =
      typeof combineOperation === 'string' && combineOperation.toLowerCase() === 'or' ? 'or' : 'and';
    const converted = legacyGroups
      .map((entry) => {
        const leftValue = this.normalizeIfExpressionValue(entry.condition?.leftValue ?? entry.condition?.value1);
        const rightValue = this.normalizeIfExpressionValue(entry.condition?.rightValue ?? entry.condition?.value2);
        const operation = this.mapLegacyOperation(entry.condition?.operation);
        if (!this.hasNonEmptyString(leftValue) && !this.hasNonEmptyString(rightValue)) {
          return null;
        }
        return {
          id: entry.condition?.id ?? `condition_${Math.random().toString(36).slice(2, 10)}`,
          leftValue,
          rightValue,
          operator: {
            type: entry.type,
            operation,
          },
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    return {
      conditions: converted,
      combinator,
      options: {
        version: 3,
        caseSensitive: true,
        typeValidation: 'loose',
      },
    };
  }

  private collectLegacyIfConditions(
    conditions: unknown
  ): Array<{ type: 'string' | 'number' | 'boolean' | 'dateTime'; condition: Record<string, any> }> {
    if (Array.isArray(conditions)) {
      return conditions.map((condition) => ({
        type: typeof condition?.type === 'string' ? condition.type : 'string',
        condition: condition,
      }));
    }
    if (!conditions || typeof conditions !== 'object') {
      return [];
    }

    const buckets = conditions as Record<string, unknown>;
    const bucketTypes: Array<'string' | 'number' | 'boolean' | 'dateTime'> = [
      'string',
      'number',
      'boolean',
      'dateTime',
    ];

    return bucketTypes.flatMap((bucketType) => {
      const bucket = buckets[bucketType];
      if (!Array.isArray(bucket)) {
        return [];
      }
      return bucket.map((condition) => ({
        type: bucketType,
        condition: condition as Record<string, any>,
      }));
    });
  }

  private mapLegacyOperation(operation: string | undefined): string {
    switch (operation) {
      case 'equal':
      case 'equals':
        return 'equals';
      case 'notEqual':
      case 'not_equals':
        return 'notEquals';
      case 'contains':
        return 'contains';
      case 'notContains':
        return 'notContains';
      case 'larger':
      case 'greaterThan':
        return 'larger';
      case 'smaller':
      case 'lessThan':
        return 'smaller';
      default:
        return 'equals';
    }
  }
}
