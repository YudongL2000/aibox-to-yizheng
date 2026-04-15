/**
 * [INPUT]: 依赖 agents/types 的工作流与 trace 协议，依赖外部注入的 compose/validate/autofix 能力
 * [OUTPUT]: 对外提供 AgentLoop.run()，承载确认构建后的组合-校验-修复闭环
 * [POS]: agents 的确认闭环内核，从 Orchestrator 中抽离主循环与验证反馈分发
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { AgentTraceEventInput, WorkflowDefinition } from './types';

export type AgentLoopDisposition = 'valid' | 'autoFixable' | 'needsModel' | 'needsUser';

export interface AgentLoopValidationIssue {
  message: string;
  code?: string;
  fix?: unknown;
}

export interface AgentLoopValidationResult {
  isValid: boolean;
  errors: AgentLoopValidationIssue[];
  warnings?: AgentLoopValidationIssue[];
  disposition?: AgentLoopDisposition;
}

export interface AgentLoopValidationClient {
  validateWorkflow(workflow: WorkflowDefinition): Promise<AgentLoopValidationResult>;
  autofixWorkflow?(workflow: WorkflowDefinition): Promise<WorkflowDefinition>;
}

export interface AgentLoopRunOptions {
  compose: () => Promise<WorkflowDefinition>;
  normalize: (workflow: WorkflowDefinition) => WorkflowDefinition;
  validateStructure: (workflow: WorkflowDefinition) => string[];
  autofixStructure: (workflow: WorkflowDefinition) => WorkflowDefinition;
  isSameWorkflow: (left: WorkflowDefinition, right: WorkflowDefinition) => boolean;
  emitTrace: (event: AgentTraceEventInput) => void;
  workflowValidator?: AgentLoopValidationClient;
  repairWithModel?: (
    workflow: WorkflowDefinition,
    errors: string[]
  ) => Promise<WorkflowDefinition | null>;
}

export interface AgentLoopRunResult {
  valid: boolean;
  workflow: WorkflowDefinition;
  errors: string[];
  iterations: number;
  disposition: AgentLoopDisposition;
}

export class AgentLoop {
  constructor(private readonly maxValidationLoops = 3) {}

  async run(options: AgentLoopRunOptions): Promise<AgentLoopRunResult> {
    let candidate = options.normalize(await options.compose());
    let lastErrors: string[] = [];
    let lastDisposition: AgentLoopDisposition = 'needsModel';

    for (let attempt = 1; attempt <= this.maxValidationLoops; attempt += 1) {
      options.emitTrace({
        source: 'workflow_validator',
        phase: 'validation',
        kind: 'phase',
        status: 'started',
        title: `开始第 ${attempt} 轮工作流校验`,
        detail: `候选工作流节点 ${candidate.nodes.length} 个`,
      });

      const structuralErrors = options.validateStructure(candidate);
      if (structuralErrors.length > 0) {
        lastErrors = structuralErrors;
        lastDisposition = 'autoFixable';
        options.emitTrace({
          source: 'workflow_validator',
          phase: 'validation',
          kind: 'tool',
          status: 'fallback',
          title: '结构校验失败，尝试本地修复',
          detail: structuralErrors.join('；'),
          data: {
            attempt,
            errorCount: structuralErrors.length,
            disposition: lastDisposition,
          },
        });

        const fixed = options.autofixStructure(candidate);
        if (options.isSameWorkflow(candidate, fixed)) {
          break;
        }

        candidate = options.normalize(fixed);
        continue;
      }

      if (!options.workflowValidator) {
        options.emitTrace({
          source: 'workflow_validator',
          phase: 'validation',
          kind: 'phase',
          status: 'completed',
          title: '未注入外部校验器，跳过 MCP 校验',
          detail: '仅使用本地结构校验结果',
          data: {
            attempt,
            disposition: 'valid',
          },
        });
        return {
          valid: true,
          workflow: candidate,
          errors: [],
          iterations: attempt,
          disposition: 'valid',
        };
      }

      options.emitTrace({
        source: 'workflow_validator',
        phase: 'validation',
        kind: 'tool',
        status: 'started',
        title: '调用工具 validate_workflow',
        detail: `第 ${attempt} 轮外部校验`,
      });

      const validation = await options.workflowValidator.validateWorkflow(candidate);
      if (validation.isValid) {
        options.emitTrace({
          source: 'workflow_validator',
          phase: 'validation',
          kind: 'tool',
          status: 'completed',
          title: '工具 validate_workflow 通过',
          detail: `第 ${attempt} 轮校验成功`,
          data: {
            attempt,
            nodeCount: candidate.nodes.length,
            disposition: 'valid',
          },
        });
        return {
          valid: true,
          workflow: candidate,
          errors: [],
          iterations: attempt,
          disposition: 'valid',
        };
      }

      lastErrors = validation.errors.map((error) => error.message);
      lastDisposition = validation.disposition ?? 'needsModel';
      options.emitTrace({
        source: 'workflow_validator',
        phase: 'validation',
        kind: 'tool',
        status: 'failed',
        title: '工具 validate_workflow 未通过',
        detail: lastErrors.join('；'),
        data: {
          attempt,
          errorCount: lastErrors.length,
          disposition: lastDisposition,
        },
      });

      if (lastDisposition === 'needsUser') {
        break;
      }

      if (lastDisposition === 'needsModel') {
        const repaired = options.repairWithModel
          ? await options.repairWithModel(candidate, lastErrors)
          : null;
        if (!repaired || options.isSameWorkflow(candidate, repaired)) {
          break;
        }

        options.emitTrace({
          source: 'workflow_validator',
          phase: 'validation',
          kind: 'tool',
          status: 'completed',
          title: '模型修复已生成新候选',
          detail: '进入下一轮校验',
          data: {
            attempt,
            disposition: lastDisposition,
          },
        });
        candidate = options.normalize(repaired);
        continue;
      }

      if (!options.workflowValidator.autofixWorkflow) {
        break;
      }

      options.emitTrace({
        source: 'workflow_validator',
        phase: 'validation',
        kind: 'tool',
        status: 'started',
        title: '调用工具 autofix_workflow',
        detail: `第 ${attempt} 轮自动修复`,
      });

      const fixed = await options.workflowValidator.autofixWorkflow(candidate);
      if (options.isSameWorkflow(candidate, fixed)) {
        options.emitTrace({
          source: 'workflow_validator',
          phase: 'validation',
          kind: 'tool',
          status: 'failed',
          title: '工具 autofix_workflow 未产生变更',
          detail: '候选工作流保持不变',
          data: {
            attempt,
            disposition: lastDisposition,
          },
        });
        break;
      }

      options.emitTrace({
        source: 'workflow_validator',
        phase: 'validation',
        kind: 'tool',
        status: 'completed',
        title: '工具 autofix_workflow 完成',
        detail: '已生成新的候选工作流，进入下一轮校验',
        data: {
          attempt,
          disposition: lastDisposition,
        },
      });
      candidate = options.normalize(fixed);
    }

    options.emitTrace({
      source: 'workflow_validator',
      phase: 'validation',
      kind: 'phase',
      status: 'failed',
      title: '工作流校验结束',
      detail: lastErrors.length > 0 ? lastErrors.join('；') : '工作流校验失败',
      data: {
        iterations: this.maxValidationLoops,
        disposition: lastDisposition,
      },
    });

    return {
      valid: false,
      workflow: candidate,
      errors: lastErrors.length > 0 ? lastErrors : ['工作流校验失败'],
      iterations: this.maxValidationLoops,
      disposition: lastDisposition,
    };
  }
}
