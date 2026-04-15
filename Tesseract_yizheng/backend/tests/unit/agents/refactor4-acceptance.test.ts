/**
 * [INPUT]: 依赖 AgentLoop、PropertyFilter、architect prompt 预算工具与源码文件统计
 * [OUTPUT]: 验证 Refactor-4 的核心量化验收标准
 * [POS]: unit/agents 的 Refactor-4 验收护栏，锁住预算、单一入口、文件体积与验证闭环通过率
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { AgentLoop, type AgentLoopValidationResult } from '../../../src/agents/agent-loop';
import { HARDWARE_COMPONENTS } from '../../../src/agents/hardware-components';
import { ALLOWED_NODE_TYPES } from '../../../src/agents/allowed-node-types';
import { buildArchitectSystemPrompt } from '../../../src/agents/prompts/architect-system';
import { selectPromptVariant } from '../../../src/agents/prompts/prompt-variants';
import { n8nDocumentationToolsFinal } from '../../../src/mcp/tools';
import { buildArchitectMessages, buildArchitectToolDescriptions } from '../../../src/agents/workflow-architect/prompt-context';
import {
  ARCHITECT_HISTORY_TOKEN_BUDGET,
  ARCHITECT_SYSTEM_PROMPT_TOKEN_BUDGET,
  ARCHITECT_TOOL_TOKEN_BUDGET,
  estimateMessagesTokenCount,
  estimateTokenCount,
} from '../../../src/agents/workflow-architect/token-budget';
import { PropertyFilter } from '../../../src/services/property-filter';
import type { WorkflowDefinition } from '../../../src/agents/types';

function repoPath(relativePath: string): string {
  return path.resolve(process.cwd(), relativePath);
}

function countFileLines(relativePath: string): number {
  return readFileSync(repoPath(relativePath), 'utf8').trimEnd().split('\n').length;
}

function readSource(relativePath: string): string {
  return readFileSync(repoPath(relativePath), 'utf8');
}

function createWorkflow(name: string, withConnection = true): WorkflowDefinition {
  const workflow: WorkflowDefinition = {
    name,
    nodes: [
      {
        id: `${name}-trigger`,
        name: 'schedule_trigger_start_5s',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1.1,
        position: [0, 0],
        parameters: { rule: { interval: [{}] } },
      } as any,
      {
        id: `${name}-action`,
        name: 'code_speaker_play',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [220, 0],
        parameters: {},
      } as any,
    ],
    connections: withConnection
      ? {
          schedule_trigger_start_5s: {
            main: [[{ node: 'code_speaker_play', type: 'main', index: 0 }]],
          },
        }
      : {},
  };

  return workflow;
}

function validateStructure(workflow: WorkflowDefinition): string[] {
  const nodeNames = new Set(workflow.nodes.map((node: any) => node.name));
  const hasTrigger = workflow.nodes.some((node: any) => String(node.type).includes('scheduleTrigger'));
  const edges = Object.values(workflow.connections ?? {}).flatMap((mapping: any) => {
    if (!mapping || typeof mapping !== 'object') {
      return [];
    }
    return Object.values(mapping).flatMap((groups: any) => {
      if (!Array.isArray(groups)) {
        return [];
      }
      return groups.flatMap((group: any) => Array.isArray(group) ? group : []);
    });
  });

  const errors: string[] = [];
  if (!hasTrigger) {
    errors.push('工作流缺少触发节点');
  }
  if (workflow.nodes.length > 1 && edges.length === 0) {
    errors.push('工作流缺少主链路连接');
  }
  edges.forEach((edge: any) => {
    if (!nodeNames.has(edge.node)) {
      errors.push(`connections 引用了不存在的目标节点: ${edge.node}`);
    }
  });
  return Array.from(new Set(errors));
}

function autofixStructure(workflow: WorkflowDefinition): WorkflowDefinition {
  const nodes = workflow.nodes as any[];
  if (nodes.length < 2) {
    return workflow;
  }
  return {
    ...workflow,
    connections: {
      [nodes[0].name]: {
        main: [[{ node: nodes[1].name, type: 'main', index: 0 }]],
      },
    },
  };
}

function makeValidationResult(
  isValid: boolean,
  disposition: AgentLoopValidationResult['disposition'] | 'autoFixable' | 'needsModel' | 'needsUser',
  message = 'validation failed'
): AgentLoopValidationResult {
  return {
    isValid,
    errors: isValid ? [] : [{ message }],
    warnings: [],
    disposition,
  };
}

describe('refactor4 acceptance', () => {
  it('meets prompt and history token budgets', () => {
    const tools = buildArchitectToolDescriptions();
    const toolTokens = estimateTokenCount(tools.join('\n'));
    const prompt = buildArchitectSystemPrompt(
      HARDWARE_COMPONENTS,
      tools,
      ALLOWED_NODE_TYPES,
      selectPromptVariant('baseline', '石头剪刀布')
    );
    const history = Array.from({ length: 10 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: '这是一段用于验收 Refactor-4 历史压缩预算的长消息。'.repeat(12),
    }));
    const messageTokens = estimateMessagesTokenCount(
      buildArchitectMessages(history, 'system prompt', '继续', ['缺少执行器'])
    );

    expect(toolTokens).toBeLessThanOrEqual(ARCHITECT_TOOL_TOKEN_BUDGET);
    expect(estimateTokenCount(prompt)).toBeLessThanOrEqual(ARCHITECT_SYSTEM_PROMPT_TOKEN_BUDGET);
    expect(messageTokens).toBeLessThanOrEqual(ARCHITECT_HISTORY_TOKEN_BUDGET);
  });

  it('meets file-size and hardcoded-node thresholds', () => {
    const overrideCount = Object.keys((PropertyFilter as any).ESSENTIAL_PROPERTIES).length;

    expect(countFileLines('src/agents/orchestrator.ts')).toBeLessThanOrEqual(500);
    expect(overrideCount).toBeLessThan(20);
  });

  it('routes workflow validation through the unified single-entry facade', () => {
    const mcpClientSource = readSource('src/agents/mcp-client.ts');

    expect(mcpClientSource).toContain("kind: 'workflow'");
    expect(mcpClientSource).toContain('this.unifiedValidator.validate({');
    expect(mcpClientSource).not.toContain('this.unifiedValidator.validateWorkflow(');
  });

  it('keeps node tooling split into focused MCP tools', () => {
    const toolNames = new Set(n8nDocumentationToolsFinal.map((tool) => tool.name));
    const getNodeTool = n8nDocumentationToolsFinal.find((tool) => tool.name === 'get_node');

    expect(toolNames).toContain('get_node');
    expect(toolNames).toContain('get_node_docs');
    expect(toolNames).toContain('search_node_properties');
    expect(toolNames).toContain('get_node_versions');

    expect(getNodeTool).toBeDefined();
    expect(Object.keys(getNodeTool!.inputSchema.properties ?? {})).not.toContain('mode');
    expect(Object.keys(getNodeTool!.inputSchema.properties ?? {}).length).toBeLessThanOrEqual(4);
  });

  it('achieves >85% validation-loop recovery on representative cases', async () => {
    const loop = new AgentLoop(3);
    const traces: unknown[] = [];
    const cases = [
      async () => loop.run({
        compose: async () => createWorkflow('direct-valid'),
        normalize: (workflow) => workflow,
        validateStructure,
        autofixStructure,
        isSameWorkflow: (left, right) => JSON.stringify(left) === JSON.stringify(right),
        emitTrace: (event) => traces.push(event),
      }),
      async () => loop.run({
        compose: async () => createWorkflow('local-fix', false),
        normalize: (workflow) => workflow,
        validateStructure,
        autofixStructure,
        isSameWorkflow: (left, right) => JSON.stringify(left) === JSON.stringify(right),
        emitTrace: (event) => traces.push(event),
      }),
      async () => {
        const validator = {
          validateWorkflow: vi
            .fn()
            .mockResolvedValueOnce(makeValidationResult(false, 'autoFixable', '缺少 = 前缀'))
            .mockResolvedValueOnce(makeValidationResult(true, 'valid')),
          autofixWorkflow: vi.fn().mockImplementation(async (workflow: WorkflowDefinition) => ({
            ...workflow,
            name: `${workflow.name}-autofixed`,
          })),
        };
        return loop.run({
          compose: async () => createWorkflow('external-autofix-a'),
          normalize: (workflow) => workflow,
          validateStructure,
          autofixStructure,
          isSameWorkflow: (left, right) => JSON.stringify(left) === JSON.stringify(right),
          emitTrace: (event) => traces.push(event),
          workflowValidator: validator,
        });
      },
      async () => {
        const validator = {
          validateWorkflow: vi
            .fn()
            .mockResolvedValueOnce(makeValidationResult(false, 'autoFixable', 'resource locator'))
            .mockResolvedValueOnce(makeValidationResult(true, 'valid')),
          autofixWorkflow: vi.fn().mockImplementation(async (workflow: WorkflowDefinition) => ({
            ...workflow,
            name: `${workflow.name}-autofixed-b`,
          })),
        };
        return loop.run({
          compose: async () => createWorkflow('external-autofix-b'),
          normalize: (workflow) => workflow,
          validateStructure,
          autofixStructure,
          isSameWorkflow: (left, right) => JSON.stringify(left) === JSON.stringify(right),
          emitTrace: (event) => traces.push(event),
          workflowValidator: validator,
        });
      },
      async () => {
        const validator = {
          validateWorkflow: vi
            .fn()
            .mockResolvedValueOnce(makeValidationResult(false, 'needsModel', '表达式引用无效'))
            .mockResolvedValueOnce(makeValidationResult(true, 'valid')),
        };
        return loop.run({
          compose: async () => createWorkflow('model-fix-a'),
          normalize: (workflow) => workflow,
          validateStructure,
          autofixStructure,
          isSameWorkflow: (left, right) => JSON.stringify(left) === JSON.stringify(right),
          emitTrace: (event) => traces.push(event),
          workflowValidator: validator,
          repairWithModel: async (workflow) => ({ ...workflow, name: `${workflow.name}-model-fixed` }),
        });
      },
      async () => {
        const validator = {
          validateWorkflow: vi
            .fn()
            .mockResolvedValueOnce(makeValidationResult(false, 'needsModel', '节点连接逻辑错误'))
            .mockResolvedValueOnce(makeValidationResult(true, 'valid')),
        };
        return loop.run({
          compose: async () => createWorkflow('model-fix-b'),
          normalize: (workflow) => workflow,
          validateStructure,
          autofixStructure,
          isSameWorkflow: (left, right) => JSON.stringify(left) === JSON.stringify(right),
          emitTrace: (event) => traces.push(event),
          workflowValidator: validator,
          repairWithModel: async (workflow) => ({ ...workflow, name: `${workflow.name}-model-fixed-b` }),
        });
      },
      async () => {
        const validator = {
          validateWorkflow: vi.fn().mockResolvedValue(makeValidationResult(false, 'needsUser', '缺少 API credentials')),
        };
        return loop.run({
          compose: async () => createWorkflow('needs-user'),
          normalize: (workflow) => workflow,
          validateStructure,
          autofixStructure,
          isSameWorkflow: (left, right) => JSON.stringify(left) === JSON.stringify(right),
          emitTrace: (event) => traces.push(event),
          workflowValidator: validator,
        });
      },
    ];

    let successCount = 0;
    for (const runCase of cases) {
      const result = await runCase();
      if (result.valid) {
        successCount += 1;
      }
    }

    const successRate = successCount / cases.length;
    expect(successRate).toBeGreaterThan(0.85);
  });
});
