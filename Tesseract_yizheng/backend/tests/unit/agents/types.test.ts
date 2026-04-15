import { describe, expect, it } from 'vitest';
import {
  NodeCategory,
  NodeExtraStatus,
  NodeNotes,
  LOGIC_NODE_TYPES,
  CONFIG_AGENT_FIELDS,
  HARDWARE_CATEGORIES,
} from '../../../src/agents/types';

describe('NodeCategory Types', () => {
  it('should have correct categories defined', () => {
    const categories: NodeCategory[] = [
      'BASE',
      'CAM',
      'YOLO-RPS',
      'TTS',
      'RAM',
      'ASSIGN',
      'HAND',
      'WHEEL',
      'SPEAKER',
      'SCREEN',
    ];

    expect(categories).toHaveLength(10);
  });

  it('should have correct extra status values', () => {
    const statuses: NodeExtraStatus[] = ['pending', 'configuring', 'configured'];
    expect(statuses).toHaveLength(3);
  });
});

describe('LOGIC_NODE_TYPES', () => {
  it('should contain n8n logic nodes', () => {
    expect(LOGIC_NODE_TYPES).toContain('n8n-nodes-base.if');
    expect(LOGIC_NODE_TYPES).toContain('n8n-nodes-base.switch');
    expect(LOGIC_NODE_TYPES).toContain('n8n-nodes-base.merge');
    expect(LOGIC_NODE_TYPES).toContain('n8n-nodes-base.noOp');
  });
});

describe('CONFIG_AGENT_FIELDS', () => {
  it('should contain TTS_input and execute_emoji', () => {
    expect(CONFIG_AGENT_FIELDS).toContain('TTS_input');
    expect(CONFIG_AGENT_FIELDS).toContain('execute_emoji');
    expect(CONFIG_AGENT_FIELDS).toHaveLength(2);
  });
});

describe('HARDWARE_CATEGORIES', () => {
  it('should contain hardware node categories', () => {
    expect(HARDWARE_CATEGORIES).toContain('CAM');
    expect(HARDWARE_CATEGORIES).toContain('WHEEL');
    expect(HARDWARE_CATEGORIES).toContain('HAND');
    expect(HARDWARE_CATEGORIES).toContain('SPEAKER');
    expect(HARDWARE_CATEGORIES).toContain('SCREEN');
  });
});

describe('NodeNotes interface', () => {
  it('should accept valid notes object', () => {
    const notes: NodeNotes = {
      title: '欢迎语音',
      subtitle: '播放游戏开始欢迎语',
      category: 'TTS',
      session_ID: 'sess_123',
      extra: 'pending',
      sub: {
        TTS_input: '欢迎来到猜拳游戏',
      },
    };

    expect(notes.extra).toBe('pending');
    expect(notes.sub?.TTS_input).toBe('欢迎来到猜拳游戏');
  });
});
