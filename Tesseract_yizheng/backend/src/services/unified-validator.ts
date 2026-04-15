/**
 * [INPUT]: 依赖 workflow/expression validators 与 NodeRepository，统一封装多入口验证能力
 * [OUTPUT]: 对外提供 UnifiedValidator 及 validate(target) 单入口协议
 * [POS]: services 的验证脊柱门面，给 Agent/MCP 提供单一验证契约
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { WorkflowDefinition } from '../agents/types';
import { NodeRepository } from '../database/node-repository';
import { EnhancedConfigValidator } from './enhanced-config-validator';
import { ExpressionFormatValidator, type ExpressionFormatIssue, type ValidationContext as ExpressionFormatContext } from './expression-format-validator';
import { ExpressionValidator } from './expression-validator';
import type { ValidationIssue, WorkflowValidationResult } from './workflow-validator';
import { WorkflowValidator } from './workflow-validator';

type WorkflowValidationProfile = 'minimal' | 'runtime' | 'ai-friendly' | 'strict';

export type UnifiedValidationDisposition = 'valid' | 'autoFixable' | 'needsModel' | 'needsUser';

export type UnifiedValidationTarget =
  | {
      kind: 'workflow';
      workflow: WorkflowDefinition;
      options?: {
        validateNodes?: boolean;
        validateConnections?: boolean;
        validateExpressions?: boolean;
        profile?: WorkflowValidationProfile;
      };
    }
  | {
      kind: 'expression';
      expression: string;
      context: {
        availableNodes: string[];
        currentNodeName?: string;
        isInLoop?: boolean;
        hasInputData?: boolean;
      };
    }
  | {
      kind: 'expression-format';
      parameters: unknown;
      context: ExpressionFormatContext;
    };

type WorkflowValidationTarget = Extract<UnifiedValidationTarget, { kind: 'workflow' }>;
type ExpressionValidationTarget = Extract<UnifiedValidationTarget, { kind: 'expression' }>;

export interface UnifiedWorkflowValidation {
  kind: 'workflow';
  valid: boolean;
  disposition: UnifiedValidationDisposition;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  suggestions: string[];
  statistics: WorkflowValidationResult['statistics'];
}

export interface UnifiedExpressionValidation {
  kind: 'expression';
  valid: boolean;
  disposition: UnifiedValidationDisposition;
  errors: string[];
  warnings: string[];
  usedVariables: string[];
  usedNodes: string[];
}

export interface UnifiedExpressionFormatValidation {
  kind: 'expression-format';
  valid: boolean;
  disposition: UnifiedValidationDisposition;
  issues: ExpressionFormatIssue[];
}

export type UnifiedValidationResult =
  | UnifiedWorkflowValidation
  | UnifiedExpressionValidation
  | UnifiedExpressionFormatValidation;

type WorkflowValidatorLike = Pick<WorkflowValidator, 'validateWorkflow'>;

export interface UnifiedValidatorOptions {
  workflowValidator?: WorkflowValidatorLike;
}

const USER_ACTION_PATTERNS = [
  /credential/i,
  /authentication/i,
  /api key/i,
  /topology/i,
  /device/i,
  /upload/i,
  /not allowed/i,
  /权限/i,
  /凭证/i,
  /设备/i,
  /上传/i,
  /超出/i,
];

const AUTO_FIX_PATTERNS = [
  /缺少触发节点/,
  /节点名称重复/,
  /connections 引用了不存在/,
  /缺少 type/,
  /missing-prefix/i,
  /resource locator/i,
  /expression/i,
  /single-node workflows/i,
];

export class UnifiedValidator {
  private readonly workflowValidator: WorkflowValidatorLike;

  constructor(nodeRepository: NodeRepository, options: UnifiedValidatorOptions = {}) {
    this.workflowValidator =
      options.workflowValidator ??
      new WorkflowValidator(nodeRepository, EnhancedConfigValidator);
  }

  async validate(target: UnifiedValidationTarget): Promise<UnifiedValidationResult> {
    switch (target.kind) {
      case 'workflow':
        return this.validateWorkflowTarget(target.workflow, target.options);
      case 'expression':
        return this.validateExpressionTarget(target.expression, target.context);
      case 'expression-format':
        return this.validateExpressionFormatTarget(target.parameters, target.context);
    }
  }

  private async validateWorkflowTarget(
    workflow: WorkflowDefinition,
    options?: WorkflowValidationTarget['options']
  ): Promise<UnifiedWorkflowValidation> {
    const result = await this.workflowValidator.validateWorkflow(workflow as any, options);
    return {
      kind: 'workflow',
      valid: result.valid,
      disposition: result.valid ? 'valid' : this.classifyWorkflowDisposition(result.errors),
      errors: result.errors,
      warnings: result.warnings,
      suggestions: result.suggestions,
      statistics: result.statistics,
    };
  }

  private validateExpressionTarget(
    expression: string,
    context: ExpressionValidationTarget['context']
  ): UnifiedExpressionValidation {
    const result = ExpressionValidator.validateExpression(expression, context);
    return {
      kind: 'expression',
      valid: result.valid,
      disposition: result.valid ? 'valid' : 'needsModel',
      errors: [...result.errors],
      warnings: [...result.warnings],
      usedVariables: [...result.usedVariables],
      usedNodes: [...result.usedNodes],
    };
  }

  private validateExpressionFormatTarget(
    parameters: unknown,
    context: ExpressionFormatContext
  ): UnifiedExpressionFormatValidation {
    const issues = ExpressionFormatValidator.validateNodeParameters(parameters, context);
    return {
      kind: 'expression-format',
      valid: issues.length === 0,
      disposition: issues.length === 0 ? 'valid' : 'autoFixable',
      issues,
    };
  }

  private classifyWorkflowDisposition(errors: ValidationIssue[]): Exclude<UnifiedValidationDisposition, 'valid'> {
    if (errors.some((issue) => this.isUserActionIssue(issue))) {
      return 'needsUser';
    }

    if (errors.every((issue) => this.isAutofixableIssue(issue))) {
      return 'autoFixable';
    }

    return 'needsModel';
  }

  private isUserActionIssue(issue: ValidationIssue): boolean {
    const text = [issue.message, issue.details, issue.code].filter(Boolean).join(' ');
    return USER_ACTION_PATTERNS.some((pattern) => pattern.test(text));
  }

  private isAutofixableIssue(issue: ValidationIssue): boolean {
    if (issue.fix) {
      return true;
    }

    const text = [issue.message, issue.details, issue.code].filter(Boolean).join(' ');
    return AUTO_FIX_PATTERNS.some((pattern) => pattern.test(text));
  }
}
