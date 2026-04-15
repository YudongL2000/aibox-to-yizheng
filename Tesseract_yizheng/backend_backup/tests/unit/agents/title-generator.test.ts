import { describe, expect, it } from 'vitest';
import { generateNodeTitleSubtitle } from '../../../src/agents/prompts/title-generator';

describe('title-generator', () => {
  it('为情绪 IF 节点生成中文条件标题', () => {
    const result = generateNodeTitleSubtitle(
      {
        type: 'n8n-nodes-base.if',
        name: 'if_emotion_is_happy',
        sub: {},
      },
      'BASE'
    );

    expect(result.title).toBe('如果用户的情绪是开心');
    expect(result.subtitle).toContain('仅在识别结果为开心时触发该分支');
  });
});

