/**
 * [INPUT]: 依赖 ReflectionPromptBuilder、ReflectionDecisionPolicy 规则与硬件能力目录
 * [OUTPUT]: 验证 Reflection system/user prompt 的规则注入与历史裁剪行为
 * [POS]: tests/unit/agents 的提示词构建层护栏测试，防止 prompt 拼装逻辑重新回流 engine
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it } from 'vitest';
import { REFLECTION_DECISION_POLICY_RULES } from '../../../src/agents/reflection-decision-policy';
import {
  buildReflectionAssessmentPrompt,
  buildReflectionSystemPrompt,
} from '../../../src/agents/reflection-prompt-builder';
import type { ConversationTurn, HardwareCapability, NodeCategory } from '../../../src/agents/types';

function createCapability(id: string, category: NodeCategory): HardwareCapability {
  return {
    id,
    component: id.split('.')[0] ?? 'test',
    capability: id.split('.')[1] ?? 'capability',
    displayName: id,
    keywords: ['test'],
    nodeType: 'n8n-nodes-base.httpRequest',
    category,
    apiEndpoint: {
      url: `http://localhost/${id}`,
      method: 'POST',
    },
    dependencies: [],
    confidence: 1,
  };
}

describe('reflection prompt builder', () => {
  it('injects decision policy rules into the system prompt', () => {
    const prompt = buildReflectionSystemPrompt();

    expect(prompt).toContain('你是机器人需求评审助手，只返回最小 JSON。');
    expect(prompt).toContain(`1. ${REFLECTION_DECISION_POLICY_RULES[0]}`);
    expect(prompt).toContain(`${REFLECTION_DECISION_POLICY_RULES.length}. ${REFLECTION_DECISION_POLICY_RULES.at(-1)}`);
    expect(prompt).toContain('"decision":"direct_accept | clarify_needed | reject_out_of_scope"');
    expect(prompt).toContain('suggested_user_actions 不得为空');
    expect(prompt).toContain('suggested_user_actions.category 必须与某条 missing_info.category 精确匹配');
  });

  it('keeps only the last four user turns in the assessment prompt', () => {
    const history: ConversationTurn[] = [
      { role: 'user', content: 'u1' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'u2' },
      { role: 'assistant', content: 'a2' },
      { role: 'user', content: 'u3' },
      { role: 'assistant', content: 'a3' },
      { role: 'user', content: 'u4' },
      { role: 'assistant', content: 'a4' },
      { role: 'user', content: 'u5' },
    ];

    const prompt = buildReflectionAssessmentPrompt({
      userIntent: '看家',
      discoveredCapabilities: [createCapability('camera.snapshot_input', 'CAM')],
      capabilityCatalog: [
        createCapability('camera.snapshot_input', 'CAM'),
        createCapability('screen.emoji_display', 'SCREEN'),
      ],
      history,
    });

    expect(prompt).toContain('需求=看家');
    expect(prompt).toContain('历史=u1:u2 | u2:u3 | u3:u4 | u4:u5');
    expect(prompt).not.toContain('u5:u1');
    expect(prompt).not.toContain('a4');
  });

  it('summarizes candidate and catalog capabilities in the assessment prompt', () => {
    const prompt = buildReflectionAssessmentPrompt({
      userIntent: '看到我后打招呼',
      discoveredCapabilities: [
        createCapability('camera.snapshot_input', 'CAM'),
        createCapability('screen.emoji_display', 'SCREEN'),
      ],
      capabilityCatalog: [
        createCapability('camera.snapshot_input', 'CAM'),
        createCapability('screen.emoji_display', 'SCREEN'),
        createCapability('speaker.audio_playback', 'SPEAKER'),
      ],
      history: [],
    });

    expect(prompt).toContain('候选=camera.snapshot_input:camera.snapshot_input；screen.emoji_display:screen.emoji_display');
    expect(prompt).toContain('目录=camera.snapshot_input:camera.snapshot_input；screen.emoji_display:screen.emoji_display；speaker.audio_playback:speaker.audio_playback');
  });
});
