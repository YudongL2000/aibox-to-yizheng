/**
 * [INPUT]: 依赖 SkillLibraryRepository 与 skill candidate 构造函数。
 * [OUTPUT]: 对外提供 skills JSON repository 回归测试，锁住教学完成产物的落盘与对话预览折叠。
 * [POS]: tests/unit/agents/dialogue-mode 的 repository 守护测试，防止技能库存储退回临时内存或丢失端口/物理 cue。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AgentSession, WorkflowDefinition } from '../../../../src/agents/types';
import {
  buildSkillSaveCandidateFromSession,
  SkillLibraryRepository,
  toDialogueModeLibrarySkillPreview,
} from '../../../../src/agents/dialogue-mode/skill-library-repository';

function createWorkflow(): WorkflowDefinition {
  return {
    name: '猜拳互动',
    nodes: [],
    connections: {},
  };
}

function createSession(): AgentSession {
  const workflow = createWorkflow();
  const now = new Date().toISOString();
  return {
    id: 'session-save-skill',
    phase: 'configuring',
    history: [],
    confirmedEntities: {},
    traceEvents: [],
    traceSequence: 0,
    confirmed: false,
    userTurns: 0,
    lastSummaryTurn: 0,
    createdAt: now,
    updatedAt: now,
    workflow,
    workflowSummary: '通过摄像头识别手势并驱动机械手回应。',
    dialogueModeState: {
      userGoal: '跟我玩石头剪刀布',
      matchedSkill: undefined,
      hardwareSnapshot: undefined as any,
      branch: 'teaching_handoff',
      phase: 'handoff_ready',
      teachingHandoff: undefined,
    },
    configAgentState: {
      workflowId: 'wf-rps',
      workflowSnapshot: workflow,
      configurableNodes: [
        {
          name: '摄像头抓拍',
          type: 'n8n-nodes-base.httpRequest',
          category: 'CAM',
          required: true,
          prompt: '请插上摄像头',
          configValues: {
            portId: 'port_7',
            topology: 'port_7',
          },
        },
        {
          name: '机械手出拳',
          type: 'n8n-nodes-base.set',
          category: 'HAND',
          required: true,
          prompt: '请插上机械手',
          configValues: {
            portId: 'port_2',
            topology: 'port_2',
          },
        },
      ],
      currentNodeIndex: 2,
      completed: true,
      progress: {
        total: 2,
        completed: 2,
        percentage: 100,
      },
    },
  } as AgentSession;
}

describe('SkillLibraryRepository', () => {
  it('builds a save candidate from a completed teaching session', () => {
    const candidate = buildSkillSaveCandidateFromSession(createSession());

    expect(candidate).toEqual(expect.objectContaining({
      workflowId: 'wf-rps',
      sourceSessionId: 'session-save-skill',
    }));
    expect(candidate?.requiredHardware).toEqual([
      expect.objectContaining({
        componentId: 'camera',
        acceptablePorts: ['port_7'],
      }),
      expect.objectContaining({
        componentId: 'mechanical_hand',
        acceptablePorts: ['port_2'],
      }),
    ]);
    expect(candidate?.initialPhysicalCue).toEqual({
      action: 'hand_stretch',
      autoTrigger: true,
      targetComponentId: 'mechanical_hand',
    });
  });

  it('persists saved skills as json files and exports dialogue previews', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'skill-library-'));
    try {
      const repository = new SkillLibraryRepository(rootDir);
      const workflow = createWorkflow();
      const candidate = buildSkillSaveCandidateFromSession(createSession());
      if (!candidate) {
        throw new Error('expected skill candidate');
      }

      const saved = repository.save(candidate, workflow);
      const list = repository.list();
      const preview = toDialogueModeLibrarySkillPreview(saved);

      expect(saved.skillId).toBe(candidate.skillId);
      expect(list).toHaveLength(1);
      expect(list[0]?.requiredHardware[1]?.acceptablePorts).toEqual(['port_2']);
      expect(preview).toEqual(expect.objectContaining({
        skillId: saved.skillId,
        displayName: saved.displayName,
        wakePrompt: saved.displayName,
      }));
      expect(preview.tags).toContain('摄像头');
      expect(preview.tags).toContain('机械手');
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });
});
