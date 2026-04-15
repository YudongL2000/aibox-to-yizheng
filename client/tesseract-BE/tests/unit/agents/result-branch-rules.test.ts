import { describe, expect, it } from 'vitest';
import {
  RESULT_BRANCH_CONFIGS,
  IF_TO_BRANCH_MAP,
  resolveResultBranchType,
  resolveResultBranchTypeFromIfNode,
} from '../../../src/agents/prompts/result-branch-rules';

describe('RESULT_BRANCH_CONFIGS', () => {
  it('包含 4 种分支类型', () => {
    expect(Object.keys(RESULT_BRANCH_CONFIGS)).toEqual(['empty', 'draw', 'win', 'lose']);
  });

  it('每个分支包含完整的 SCREEN/TTS/SPEAKER 配置', () => {
    for (const config of Object.values(RESULT_BRANCH_CONFIGS)) {
      expect(config.screen.nodeName).toBeTruthy();
      expect(config.screen.emoji).toMatch(/^(Angry|Happy|Sad)$/);
      expect(config.tts.nodeName).toBeTruthy();
      expect(config.tts.audioName).toBeTruthy();
      expect(config.tts.defaultInput).toBeTruthy();
      expect(config.speaker.nodeName).toBeTruthy();
      expect(config.speaker.audioName).toBeTruthy();
    }
  });

  it('胜负表情映射正确', () => {
    expect(RESULT_BRANCH_CONFIGS.win.screen.emoji).toBe('Happy');
    expect(RESULT_BRANCH_CONFIGS.lose.screen.emoji).toBe('Sad');
    expect(RESULT_BRANCH_CONFIGS.empty.screen.emoji).toBe('Angry');
    expect(RESULT_BRANCH_CONFIGS.draw.screen.emoji).toBe('Angry');
  });
});

describe('IF_TO_BRANCH_MAP', () => {
  it('空手势 IF 映射到 empty', () => {
    expect(IF_TO_BRANCH_MAP.if_gesture_empty).toBe('empty');
    expect(IF_TO_BRANCH_MAP.if_user_gesture_empty).toBe('empty');
  });

  it('平局 IF 映射到 draw', () => {
    expect(IF_TO_BRANCH_MAP.if_draw).toBe('draw');
    expect(IF_TO_BRANCH_MAP.if_draw_game).toBe('draw');
  });

  it('赢 IF 映射到 win', () => {
    expect(IF_TO_BRANCH_MAP.if_rock_vs_scissors).toBe('win');
    expect(IF_TO_BRANCH_MAP.if_scissors_vs_paper).toBe('win');
    expect(IF_TO_BRANCH_MAP.if_paper_vs_rock).toBe('win');
  });

  it('输 IF 映射到 lose', () => {
    expect(IF_TO_BRANCH_MAP.if_rock_vs_paper).toBe('lose');
    expect(IF_TO_BRANCH_MAP.if_scissors_vs_rock).toBe('lose');
    expect(IF_TO_BRANCH_MAP.if_paper_vs_scissors).toBe('lose');
  });
});

describe('resolveResultBranchType', () => {
  it('支持显式映射与兜底规则', () => {
    expect(resolveResultBranchType('if_robot_rock_user_scissors_win')).toBe('win');
    expect(resolveResultBranchType('if_robot_scissors_user_rock_lose')).toBe('lose');
    expect(resolveResultBranchType('if_gesture_empty')).toBe('empty');
    expect(resolveResultBranchType('if_draw_game')).toBe('draw');
    expect(resolveResultBranchType('if_rock_vs_paper')).toBe('lose');
  });

  it('避免误判普通 win/lose 命名节点', () => {
    expect(resolveResultBranchType('if_result_win')).toBeNull();
    expect(resolveResultBranchType('if_result_lose')).toBeNull();
  });
});

describe('resolveResultBranchTypeFromIfNode', () => {
  it('可从 IF 条件语义推断 win/lose/draw', () => {
    expect(
      resolveResultBranchTypeFromIfNode({
        name: 'if_branch_a',
        parameters: {
          conditions: {
            conditions: [
              { id: 'robot_rock', leftValue: '={{$json.robotGesture}}', rightValue: 'rock' },
              { id: 'user_scissors', leftValue: '={{$json.userGesture}}', rightValue: 'scissors' },
            ],
          },
        },
      })
    ).toBe('win');

    expect(
      resolveResultBranchTypeFromIfNode({
        name: 'if_branch_b',
        parameters: {
          conditions: {
            conditions: [
              { id: 'robot_scissors', leftValue: '={{$json.robotGesture}}', rightValue: 'scissors' },
              { id: 'user_rock', leftValue: '={{$json.userGesture}}', rightValue: 'rock' },
            ],
          },
        },
      })
    ).toBe('lose');

    expect(
      resolveResultBranchTypeFromIfNode({
        name: 'if_branch_c',
        parameters: {
          conditions: {
            conditions: [
              { id: 'robot_paper', leftValue: '={{$json.robotGesture}}', rightValue: 'paper' },
              { id: 'user_paper', leftValue: '={{$json.userGesture}}', rightValue: 'paper' },
            ],
          },
        },
      })
    ).toBe('draw');
  });

  it('可识别空手势条件', () => {
    expect(
      resolveResultBranchTypeFromIfNode({
        name: 'if_branch_empty',
        parameters: {
          conditions: {
            conditions: [
              { id: 'cond_empty', leftValue: '={{$json.userGesture}}', rightValue: '' },
            ],
          },
        },
      })
    ).toBe('empty');
  });
});
