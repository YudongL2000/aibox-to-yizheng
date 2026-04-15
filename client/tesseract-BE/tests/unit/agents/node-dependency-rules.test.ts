/**
 * [INPUT]: 依赖 node-dependency-rules.ts 的验证函数
 * [OUTPUT]: 对外提供节点依赖规则单元测试
 * [POS]: agents 测试集的依赖规则验证，确保工作流结构正确性
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it } from 'vitest';
import {
  validateSpeakerHasTts,
  validateYoloHasCam,
  validateHandHasAssign,
  validateWorkflowDependencies,
  type WorkflowNode,
  type WorkflowValidationContext,
} from '../../../src/agents/prompts/node-dependency-rules';

// ============================================================
// 测试辅助函数
// ============================================================

function createNode(
  name: string,
  category: string,
  sub?: Record<string, unknown>
): WorkflowNode {
  return {
    id: name,
    name,
    type: 'n8n-nodes-base.set',
    notes: JSON.stringify({ category, sub }),
  };
}

// ============================================================
// validateSpeakerHasTts 测试
// ============================================================

describe('validateSpeakerHasTts', () => {
  it('有 TTS 前驱时返回 valid', () => {
    const speaker = createNode('speaker_1', 'SPEAKER', { audio_name: 'audio' });
    const tts = createNode('tts_1', 'TTS', { audio_name: 'audio' });

    const result = validateSpeakerHasTts(speaker, [tts]);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.fix).toBeUndefined();
  });

  it('无 TTS 前驱时返回 invalid 并提供修复建议', () => {
    const speaker = createNode('speaker_1', 'SPEAKER', { audio_name: 'my_audio' });
    const cam = createNode('cam_1', 'CAM');

    const result = validateSpeakerHasTts(speaker, [cam]);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('TTS');
    expect(result.fix).toBeDefined();
    expect(result.fix?.action).toBe('INSERT_BEFORE');
    expect(result.fix?.targetNode).toBe('speaker_1');
    expect(result.fix?.insertNode.category).toBe('TTS');
    expect(result.fix?.insertNode.sub?.audio_name).toBe('my_audio');
  });

  it('无前驱时返回 invalid', () => {
    const speaker = createNode('speaker_1', 'SPEAKER');

    const result = validateSpeakerHasTts(speaker, []);

    expect(result.valid).toBe(false);
    expect(result.fix?.insertNode.sub?.audio_name).toBe('audio'); // 默认值
  });
});

// ============================================================
// validateYoloHasCam 测试
// ============================================================

describe('validateYoloHasCam', () => {
  it('有 CAM 前驱时返回 valid', () => {
    const yolo = createNode('yolo_1', 'YOLO-RPS', { yolov_input: 'camera1' });
    const cam = createNode('cam_1', 'CAM', { output: 'camera1' });

    const result = validateYoloHasCam(yolo, [cam]);

    expect(result.valid).toBe(true);
  });

  it('无 CAM 前驱时返回 invalid 并提供修复建议', () => {
    const yolo = createNode('yolo_1', 'YOLO-RPS', { yolov_input: 'cam_output' });
    const tts = createNode('tts_1', 'TTS');

    const result = validateYoloHasCam(yolo, [tts]);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('CAM');
    expect(result.fix?.action).toBe('INSERT_BEFORE');
    expect(result.fix?.targetNode).toBe('yolo_1');
    expect(result.fix?.insertNode.category).toBe('CAM');
    expect(result.fix?.insertNode.sub?.output).toBe('cam_output');
  });
});

// ============================================================
// validateHandHasAssign 测试
// ============================================================

describe('validateHandHasAssign', () => {
  it('有 ASSIGN 后继时返回 valid', () => {
    const hand = createNode('hand_1', 'HAND', { execute_gesture: 'Rock' });
    const assign = createNode('assign_1', 'ASSIGN', { robotGesture: 'rock' });

    const result = validateHandHasAssign(hand, [assign]);

    expect(result.valid).toBe(true);
  });

  it('无 ASSIGN 后继时返回 invalid 并提供修复建议', () => {
    const hand = createNode('hand_1', 'HAND', { execute_gesture: 'Paper' });
    const screen = createNode('screen_1', 'SCREEN');

    const result = validateHandHasAssign(hand, [screen]);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('ASSIGN');
    expect(result.fix?.action).toBe('INSERT_AFTER');
    expect(result.fix?.targetNode).toBe('hand_1');
    expect(result.fix?.insertNode.category).toBe('ASSIGN');
    expect(result.fix?.insertNode.sub?.robotGesture).toBe('paper'); // 小写
  });

  it('execute_gesture 为空时 robotGesture 为空字符串', () => {
    const hand = createNode('hand_1', 'HAND');

    const result = validateHandHasAssign(hand, []);

    expect(result.fix?.insertNode.sub?.robotGesture).toBe('');
  });
});

// ============================================================
// validateWorkflowDependencies 批量验证测试
// ============================================================

describe('validateWorkflowDependencies', () => {
  it('完整工作流无依赖错误', () => {
    const nodes: WorkflowNode[] = [
      createNode('trigger', 'BASE'),
      createNode('cam_1', 'CAM', { output: 'camera1' }),
      createNode('yolo_1', 'YOLO-RPS', { yolov_input: 'camera1' }),
      createNode('hand_1', 'HAND', { execute_gesture: 'Rock' }),
      createNode('assign_1', 'ASSIGN', { robotGesture: 'rock' }),
      createNode('tts_1', 'TTS', { audio_name: 'audio' }),
      createNode('speaker_1', 'SPEAKER', { audio_name: 'audio' }),
    ];

    const context: WorkflowValidationContext = {
      nodes,
      getPredecessors: (node) => {
        const idx = nodes.findIndex((n) => n.name === node.name);
        return nodes.slice(0, idx);
      },
      getSuccessors: (node) => {
        const idx = nodes.findIndex((n) => n.name === node.name);
        return nodes.slice(idx + 1);
      },
    };

    const result = validateWorkflowDependencies(context);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.fixes).toHaveLength(0);
  });

  it('缺失 TTS 时返回错误和修复建议', () => {
    const nodes: WorkflowNode[] = [
      createNode('trigger', 'BASE'),
      createNode('speaker_1', 'SPEAKER', { audio_name: 'audio' }),
    ];

    const context: WorkflowValidationContext = {
      nodes,
      getPredecessors: (node) => {
        const idx = nodes.findIndex((n) => n.name === node.name);
        return nodes.slice(0, idx);
      },
      getSuccessors: (node) => {
        const idx = nodes.findIndex((n) => n.name === node.name);
        return nodes.slice(idx + 1);
      },
    };

    const result = validateWorkflowDependencies(context);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('TTS');
    expect(result.fixes).toHaveLength(1);
    expect(result.fixes[0].insertNode.category).toBe('TTS');
  });

  it('多个依赖错误时全部返回', () => {
    const nodes: WorkflowNode[] = [
      createNode('trigger', 'BASE'),
      createNode('yolo_1', 'YOLO-RPS'), // 缺 CAM
      createNode('hand_1', 'HAND'), // 缺 ASSIGN
      createNode('speaker_1', 'SPEAKER'), // 缺 TTS
    ];

    const context: WorkflowValidationContext = {
      nodes,
      getPredecessors: (node) => {
        const idx = nodes.findIndex((n) => n.name === node.name);
        return nodes.slice(0, idx);
      },
      getSuccessors: (node) => {
        const idx = nodes.findIndex((n) => n.name === node.name);
        return nodes.slice(idx + 1);
      },
    };

    const result = validateWorkflowDependencies(context);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);
    expect(result.fixes).toHaveLength(3);

    const categories = result.fixes.map((f) => f.insertNode.category);
    expect(categories).toContain('CAM');
    expect(categories).toContain('ASSIGN');
    expect(categories).toContain('TTS');
  });

  it('非目标 category 节点不触发验证', () => {
    const nodes: WorkflowNode[] = [
      createNode('trigger', 'BASE'),
      createNode('cam_1', 'CAM'),
      createNode('tts_1', 'TTS'),
      createNode('ram_1', 'RAM'),
      createNode('screen_1', 'SCREEN'),
    ];

    const context: WorkflowValidationContext = {
      nodes,
      getPredecessors: () => [],
      getSuccessors: () => [],
    };

    const result = validateWorkflowDependencies(context);

    // RAM/SCREEN/CAM/TTS 不触发依赖检查
    expect(result.valid).toBe(true);
  });
});
