/**
 * [INPUT]: 依赖 scene/safety-net-controls 与 logger mock，验证 enabled/disabled/dormant 三态语义
 * [OUTPUT]: 对外提供 WorkflowSceneSafetyNetController 与 dormant env 解析的单元测试
 * [POS]: tests/unit/agents 中的安全网控制层护栏，锁住 dormant 只观测不改写的行为
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { describe, expect, it, vi } from 'vitest';
import type { WorkflowDefinition } from '../../../src/agents/types';
import {
  parseWorkflowSceneSafetyNetDormantFlags,
  WorkflowSceneSafetyNetController,
} from '../../../src/agents/workflow-architect/scene/safety-net-controls';
import { logger } from '../../../src/utils/logger';

describe('WorkflowSceneSafetyNetController', () => {
  it('skips disabled safety net mutations', () => {
    const workflow = createWorkflow();
    const controller = new WorkflowSceneSafetyNetController({
      ensureResultBranches: false,
    });
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => logger);

    controller.apply(workflow, 'ensureResultBranches', () => {
      mutateWorkflow(workflow, 'code_screen_execute_draw_angry');
    });

    expect(findNode(workflow, 'code_screen_execute_draw_angry')).toBeUndefined();
    expect(infoSpy).toHaveBeenCalledWith(
      'WorkflowArchitect: scene safety net disabled',
      { safetyNet: 'ensureResultBranches' }
    );

    infoSpy.mockRestore();
  });

  it('observes dormant safety nets without mutating original workflow', () => {
    const workflow = createWorkflow();
    const controller = new WorkflowSceneSafetyNetController(
      {},
      { ensureResultBranches: true }
    );
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => logger);

    controller.apply(workflow, 'ensureResultBranches', () => {
      mutateWorkflow(workflow, 'code_screen_execute_draw_angry');
    });

    expect(findNode(workflow, 'code_screen_execute_draw_angry')).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
    expect(controller.states.ensureResultBranches).toBe('dormant');

    warnSpy.mockRestore();
  });
});

describe('parseWorkflowSceneSafetyNetDormantFlags', () => {
  it('parses comma-separated dormant safety nets', () => {
    expect(
      parseWorkflowSceneSafetyNetDormantFlags({
        dormant: 'pruneGestureRedundantTtsNodes,pruneSpeakerRelayNodes',
      })
    ).toEqual({
      pruneGestureRedundantTtsNodes: true,
      pruneSpeakerRelayNodes: true,
    });
  });

  it('treats none as empty dormant list', () => {
    expect(
      parseWorkflowSceneSafetyNetDormantFlags({
        dormant: 'none',
      })
    ).toEqual({});
  });
});

function createWorkflow(): WorkflowDefinition {
  return {
    name: 'SafetyNet Controller Test',
    nodes: [
      {
        id: 'if-1',
        name: 'if_draw',
        type: 'n8n-nodes-base.if',
        typeVersion: 2.2,
        position: [0, 0],
        parameters: {},
        notes: {
          category: 'BASE',
          sub: {},
        },
      },
    ],
    connections: {},
  };
}

function mutateWorkflow(workflow: WorkflowDefinition, nodeName: string): void {
  const nodes = (Array.isArray(workflow.nodes) ? workflow.nodes : []) as Array<Record<string, unknown>>;
  nodes.push({
    id: `node-${nodeName}`,
    name: nodeName,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [220, 0],
    parameters: { jsCode: 'return items;' },
    notes: {
      category: 'SCREEN',
      sub: {},
    },
  });
}

function findNode(workflow: WorkflowDefinition, nodeName: string) {
  return (Array.isArray(workflow.nodes) ? workflow.nodes : []).find(
    (node) => String((node as Record<string, unknown>)?.name || '') === nodeName
  );
}
