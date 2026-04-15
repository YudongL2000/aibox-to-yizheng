/**
 * [INPUT]: 依赖 agents/types 的 NodeCategory 类型
 * [OUTPUT]: 对外提供 WorkflowArchitect 节点分类常量与共享规则函数
 * [POS]: workflow-architect/node 的规则层，被 normalizer 与 notes-enricher 共同消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { NodeCategory } from '../../types';

export const NODE_CATEGORY_SET = new Set<NodeCategory>([
  'BASE',
  'CAM',
  'MIC',
  'FACE-NET',
  'YOLO-HAND',
  'YOLO-RPS',
  'ASR',
  'LLM',
  'LLM-EMO',
  'TTS',
  'RAM',
  'ASSIGN',
  'HAND',
  'WHEEL',
  'SPEAKER',
  'SCREEN',
]);

export const LEGACY_NODE_SUB_KEYS = new Set([
  'ttsVoice',
  'ttsText',
  'confidence',
  'emoConfidence',
  'countdownVoice',
  'resultVoice',
  'text',
  'audioUrl',
]);

export const GLOBAL_NODE_SUB_KEYS = new Set([
  'expected_screen_emoji',
  'expected_gesture',
  'expected_hand_gesture',
  'expected_emoji',
]);

export const NODE_SUB_KEYS_BY_CATEGORY: Record<NodeCategory, string[]> = {
  BASE: ['seconds'],
  CAM: ['output'],
  MIC: ['output', 'mic_output'],
  'FACE-NET': ['facenet_input', 'facenet_output', 'face_info'],
  'YOLO-HAND': ['yolov_input', 'yolov_output'],
  'YOLO-RPS': ['yolov_input', 'yolov_output'],
  ASR: ['asr_input', 'asr_output'],
  LLM: ['prompt'],
  'LLM-EMO': ['prompt', 'llm_emo_input', 'llm_emo_output'],
  TTS: ['TTS_input', 'audio_name'],
  RAM: ['random_rule', 'output'],
  ASSIGN: ['robotGesture'],
  HAND: ['execute_gesture'],
  WHEEL: [],
  SPEAKER: ['audio_name'],
  SCREEN: ['execute_emoji'],
};

export function isIdentityIfNodeName(nodeName: string): boolean {
  const normalized = (nodeName || '').trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    normalized.startsWith('if_identity_') ||
    normalized.startsWith('if_person_') ||
    normalized.startsWith('if_face_') ||
    normalized.startsWith('if_liu') ||
    normalized.startsWith('if_fu') ||
    normalized.startsWith('if_wang') ||
    normalized.includes('_person_') ||
    normalized.includes('identity_match')
  );
}
