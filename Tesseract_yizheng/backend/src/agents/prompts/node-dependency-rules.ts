/**
 * [INPUT]: 依赖 types.ts 的 NodeCategory, NodeNotes
 * [OUTPUT]: 对外提供节点依赖验证规则和修复函数
 * [POS]: prompts 模块的节点依赖规则，确保工作流结构正确
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { NodeCategory, NodeSubParams } from '../types';

// ============================================================
// 类型定义
// ============================================================

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  notes: string | Record<string, unknown>;
  parameters?: Record<string, unknown>;
}

export interface NodeInsertion {
  action: 'INSERT_BEFORE' | 'INSERT_AFTER';
  targetNode: string;
  insertNode: {
    category: NodeCategory;
    sub: Partial<NodeSubParams>;
  };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  fix?: NodeInsertion;
}

// ============================================================
// 节点依赖规则定义
// ============================================================

/**
 * 规则 1：SPEAKER 前必须有 TTS
 * 原因：SPEAKER 播放的音频来自 TTS 合成
 * 依赖：SPEAKER.sub.audio_name = TTS.sub.audio_name
 */
export const SPEAKER_REQUIRES_TTS = {
  targetCategory: 'SPEAKER' as NodeCategory,
  requiredPredecessor: 'TTS' as NodeCategory,
  linkField: 'audio_name',
  errorMessage: 'SPEAKER 节点前必须有 TTS 节点提供音频源'
};

/**
 * 规则 2：YOLO-RPS 前必须有 CAM
 * 原因：YOLO 识别需要摄像头图像输入
 * 依赖：YOLO-RPS.sub.yolov_input = CAM.sub.output
 */
export const YOLO_REQUIRES_CAM = {
  targetCategory: 'YOLO-RPS' as NodeCategory,
  requiredPredecessor: 'CAM' as NodeCategory,
  linkField: { from: 'output', to: 'yolov_input' },
  errorMessage: 'YOLO-RPS 节点前必须有 CAM 节点提供图像输入'
};

/**
 * 规则 3：HAND 后必须有 ASSIGN
 * 原因：需要存储机器人手势状态供后续胜负判断使用
 * 依赖：ASSIGN.sub.robotGesture = HAND.sub.execute_gesture
 */
export const HAND_REQUIRES_ASSIGN = {
  targetCategory: 'HAND' as NodeCategory,
  requiredSuccessor: 'ASSIGN' as NodeCategory,
  linkField: { from: 'execute_gesture', to: 'robotGesture' },
  errorMessage: 'HAND 节点后必须有 ASSIGN 节点存储手势状态'
};

// ============================================================
// 辅助函数
// ============================================================

function parseNotes(
  notes: string | Record<string, unknown> | undefined
): { category?: NodeCategory; sub?: Partial<NodeSubParams> } | null {
  if (!notes) return null;
  if (typeof notes === 'string') {
    try {
      return JSON.parse(notes);
    } catch {
      return null;
    }
  }
  if (typeof notes === 'object' && !Array.isArray(notes)) {
    return notes as { category?: NodeCategory; sub?: Partial<NodeSubParams> };
  }
  return null;
}

function getNodeCategory(node: WorkflowNode): NodeCategory | null {
  const notes = parseNotes(node.notes);
  return notes?.category || null;
}

function getNodeSub(node: WorkflowNode): Partial<NodeSubParams> | null {
  const notes = parseNotes(node.notes);
  return notes?.sub || null;
}

// ============================================================
// 验证函数
// ============================================================

/**
 * 验证 SPEAKER 节点前是否有 TTS 节点
 */
export function validateSpeakerHasTts(
  speakerNode: WorkflowNode,
  predecessors: WorkflowNode[]
): ValidationResult {
  const hasTts = predecessors.some(n => getNodeCategory(n) === 'TTS');

  if (!hasTts) {
    const speakerSub = getNodeSub(speakerNode);
    return {
      valid: false,
      error: SPEAKER_REQUIRES_TTS.errorMessage,
      fix: {
        action: 'INSERT_BEFORE',
        targetNode: speakerNode.name,
        insertNode: {
          category: 'TTS',
          sub: {
            TTS_input: '',  // ConfigAgent 填充
            audio_name: speakerSub?.audio_name || 'audio'
          }
        }
      }
    };
  }

  return { valid: true };
}

/**
 * 验证 YOLO-RPS 节点前是否有 CAM 节点
 */
export function validateYoloHasCam(
  yoloNode: WorkflowNode,
  predecessors: WorkflowNode[]
): ValidationResult {
  const hasCam = predecessors.some(n => getNodeCategory(n) === 'CAM');

  if (!hasCam) {
    const yoloSub = getNodeSub(yoloNode);
    return {
      valid: false,
      error: YOLO_REQUIRES_CAM.errorMessage,
      fix: {
        action: 'INSERT_BEFORE',
        targetNode: yoloNode.name,
        insertNode: {
          category: 'CAM',
          sub: {
            output: yoloSub?.yolov_input || 'camera1'
          }
        }
      }
    };
  }

  return { valid: true };
}

/**
 * 验证 HAND 节点后是否有 ASSIGN 节点
 */
export function validateHandHasAssign(
  handNode: WorkflowNode,
  successors: WorkflowNode[]
): ValidationResult {
  const hasAssign = successors.some(n => getNodeCategory(n) === 'ASSIGN');

  if (!hasAssign) {
    const handSub = getNodeSub(handNode);
    const gesture = handSub?.execute_gesture || '';
    return {
      valid: false,
      error: HAND_REQUIRES_ASSIGN.errorMessage,
      fix: {
        action: 'INSERT_AFTER',
        targetNode: handNode.name,
        insertNode: {
          category: 'ASSIGN',
          sub: {
            robotGesture: typeof gesture === 'string' ? gesture.toLowerCase() : ''
          }
        }
      }
    };
  }

  return { valid: true };
}

// ============================================================
// 批量验证函数
// ============================================================

export interface WorkflowValidationContext {
  nodes: WorkflowNode[];
  getPredecessors: (node: WorkflowNode) => WorkflowNode[];
  getSuccessors: (node: WorkflowNode) => WorkflowNode[];
}

/**
 * 验证整个工作流的节点依赖关系
 */
export function validateWorkflowDependencies(
  context: WorkflowValidationContext
): { valid: boolean; errors: string[]; fixes: NodeInsertion[] } {
  const errors: string[] = [];
  const fixes: NodeInsertion[] = [];

  for (const node of context.nodes) {
    const category = getNodeCategory(node);
    if (!category) continue;

    const predecessors = context.getPredecessors(node);
    const successors = context.getSuccessors(node);

    // 规则 1: SPEAKER 前必须有 TTS
    if (category === 'SPEAKER') {
      const result = validateSpeakerHasTts(node, predecessors);
      if (!result.valid) {
        errors.push(result.error!);
        if (result.fix) fixes.push(result.fix);
      }
    }

    // 规则 2: YOLO-RPS 前必须有 CAM
    if (category === 'YOLO-RPS') {
      const result = validateYoloHasCam(node, predecessors);
      if (!result.valid) {
        errors.push(result.error!);
        if (result.fix) fixes.push(result.fix);
      }
    }

    // 规则 3: HAND 后必须有 ASSIGN
    if (category === 'HAND') {
      const result = validateHandHasAssign(node, successors);
      if (!result.valid) {
        errors.push(result.error!);
        if (result.fix) fixes.push(result.fix);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    fixes
  };
}

// ============================================================
// 导出所有规则
// ============================================================

export const NODE_DEPENDENCY_RULES = {
  SPEAKER_REQUIRES_TTS,
  YOLO_REQUIRES_CAM,
  HAND_REQUIRES_ASSIGN
};
