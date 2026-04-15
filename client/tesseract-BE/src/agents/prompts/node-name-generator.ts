/**
 * [INPUT]: 依赖节点原始名称、类型与分类信息
 * [OUTPUT]: 对外提供 generateNodeName/normalizeNodeName 节点命名标准化能力
 * [POS]: prompts 的命名规范器，统一 {type}_{category}_{action}_{detail}
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

import { NodeCategory, NodeSubParams } from '../types';

interface NodeNameInput {
  nodeType: string;
  currentName: string;
  category: NodeCategory;
  sub?: NodeSubParams;
}

const TYPE_PREFIX: Record<string, string> = {
  'n8n-nodes-base.scheduleTrigger': 'schedule_trigger',
  'n8n-nodes-base.httpRequest': 'http_request',
  'n8n-nodes-base.set': 'set',
  'n8n-nodes-base.code': 'code',
  'n8n-nodes-base.if': 'if',
  'n8n-nodes-base.switch': 'switch',
  'n8n-nodes-base.merge': 'merge',
};

const CN_TO_EN: Array<[RegExp, string]> = [
  [/摄像头/g, 'camera'],
  [/人脸/g, 'face'],
  [/身份/g, 'identity'],
  [/抓拍/g, 'snapshot'],
  [/手势/g, 'gesture'],
  [/麦克风/g, 'microphone'],
  [/语音/g, 'voice'],
  [/识别/g, 'recognition'],
  [/情绪/g, 'emotion'],
  [/微笑/g, 'smile'],
  [/倒数/g, 'countdown'],
  [/喇叭/g, 'speaker'],
  [/播放/g, 'play'],
  [/机械手/g, 'hand'],
  [/屏幕/g, 'screen'],
  [/开心/g, 'happy'],
  [/难过/g, 'sad'],
  [/愤怒/g, 'angry'],
  [/平局/g, 'draw'],
  [/输/g, 'lose'],
  [/赢/g, 'win'],
  [/石头/g, 'rock'],
  [/剪刀/g, 'scissors'],
  [/布/g, 'paper'],
  [/随机/g, 'random'],
  [/结果/g, 'result'],
  [/提取/g, 'extract'],
  [/配置/g, 'config'],
  [/生成/g, 'generate'],
  [/赋值/g, 'assign'],
];

function sanitize(text: string): string {
  let normalized = text;
  CN_TO_EN.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, ` ${replacement} `);
  });

  normalized = normalized
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .toLowerCase()
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  return normalized;
}

function inferVariant(name: string): string {
  if (name.includes('countdown')) {
    return 'countdown';
  }
  if (name.includes('win')) {
    return 'win';
  }
  if (name.includes('lose')) {
    return 'lose';
  }
  if (name.includes('draw')) {
    return 'draw';
  }
  if (name.includes('empty')) {
    return 'empty';
  }
  if (name.includes('result')) {
    return 'result';
  }
  return 'step';
}

function inferActionDetail(category: NodeCategory, normalizedName: string, sub?: NodeSubParams): string {
  switch (category) {
    case 'BASE':
      if (normalizedName.includes('trigger')) {
        const seconds = sub?.seconds ?? 0.5;
        return `start_${seconds}s`;
      }
      if (normalizedName.includes('n_eq_1') || normalizedName.includes('n_1')) {
        return 'robot_n_eq_1';
      }
      if (normalizedName.includes('n_eq_2') || normalizedName.includes('n_2')) {
        return 'robot_n_eq_2';
      }
      if (normalizedName.includes('n_eq_3') || normalizedName.includes('n_3')) {
        return 'robot_n_eq_3';
      }
      return 'condition_route';

    case 'CAM':
      return 'camera_snapshot';

    case 'MIC':
      return 'microphone_capture';

    case 'FACE-NET':
      return 'face_net_recognition';

    case 'YOLO-HAND':
      return 'yolov8_expression';

    case 'YOLO-RPS':
      return normalizedName.includes('set') ? 'result_register' : 'gesture_recognition';

    case 'ASR':
      return 'asr_recognition';

    case 'LLM':
      return 'llm_reply';

    case 'LLM-EMO':
      return 'llm_emotion';

    case 'TTS':
      return `audio_generate_${inferVariant(normalizedName)}`;

    case 'RAM':
      return 'generate_random_n';

    case 'ASSIGN':
      return `robot_gesture_${sanitize(sub?.robotGesture || normalizedName).replace(/^_+|_+$/g, '') || 'assign'}`;

    case 'HAND':
      return `hand_execute_${sanitize(sub?.execute_gesture || normalizedName) || 'gesture'}`;

    case 'WHEEL':
      return 'wheel_execute_motion';

    case 'SPEAKER':
      return `speaker_execute_${inferVariant(normalizedName)}`;

    case 'SCREEN':
      return `screen_execute_${sanitize(sub?.execute_emoji || normalizedName) || 'emoji'}`;

    default:
      return 'step';
  }
}

export function normalizeNodeName(name: string): string {
  return sanitize(name || 'node');
}

export function generateNodeName(input: NodeNameInput): string {
  const { nodeType, currentName, category, sub } = input;
  const existing = normalizeNodeName(currentName);
  if (/^[A-Za-z0-9_]+$/.test(currentName) && currentName.length > 0) {
    return currentName;
  }

  const prefix = TYPE_PREFIX[nodeType] ?? 'node';
  const detail = inferActionDetail(category, existing, sub);
  const generated = `${prefix}_${category.toLowerCase()}_${detail}`;
  return normalizeNodeName(generated);
}
