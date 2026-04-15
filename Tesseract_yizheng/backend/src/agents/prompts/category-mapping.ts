/**
 * [INPUT]: 依赖节点 type/name/parameters 信息
 * [OUTPUT]: 对外提供 detectNodeCategory 节点分类能力
 * [POS]: prompts 的节点分类规则中心，被 Intake/Architect 共用
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

import { NodeCategory } from '../types';

export interface NodeMetadataInput {
  type?: unknown;
  name?: unknown;
  parameters?: unknown;
}

const LOGIC_NODE_TYPES = ['if', 'switch', 'merge'];

function readText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function lower(value: unknown): string {
  return readText(value).toLowerCase();
}

function extractUrl(parameters: unknown): string {
  if (!parameters || typeof parameters !== 'object') {
    return '';
  }
  const url = (parameters as Record<string, unknown>).url;
  return lower(url);
}

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function hasCategoryKeyword(name: string, url: string, keywords: string[]): boolean {
  return hasAny(name, keywords) || hasAny(url, keywords);
}

export function detectNodeCategory(node: NodeMetadataInput): NodeCategory {
  const type = lower(node.type);
  const name = lower(node.name);
  const url = extractUrl(node.parameters);

  if (type.includes('scheduletrigger') || type.includes('manualtrigger') || type.includes('webhook')) {
    return 'BASE';
  }

  if (LOGIC_NODE_TYPES.some((logicType) => type.includes(logicType))) {
    return 'BASE';
  }

  if (type.includes('code')) {
    if (hasAny(name, ['wheel', 'chassis', '底盘', '全向轮', '旋转', '前进', '后退'])) {
      return 'WHEEL';
    }
    if (hasAny(name, ['hand', 'gesture', '机械手', '手势'])) {
      return 'HAND';
    }
    if (hasAny(name, ['speaker', '喇叭', '音频', '语音'])) {
      return 'SPEAKER';
    }
    if (hasAny(name, ['screen', 'emoji', '屏幕', '表情'])) {
      return 'SCREEN';
    }
  }

  if (type.includes('httprequest')) {
    if (hasCategoryKeyword(name, url, ['mic', 'microphone', '麦克风', '语音采集', '/mic/'])) {
      return 'MIC';
    }
    if (hasCategoryKeyword(name, url, ['camera', 'snapshot', '摄像头', '抓拍', '/cam/'])) {
      return 'CAM';
    }
    if (hasCategoryKeyword(name, url, ['face', 'face_net', 'facenet', 'identity', '人脸', '身份'])) {
      return 'FACE-NET';
    }
    if (hasCategoryKeyword(name, url, ['yolo', 'expression', 'smile', 'emotion', '表情', '微笑'])) {
      return 'YOLO-HAND';
    }
    if (hasCategoryKeyword(name, url, ['yolo', 'gesture', 'rps', '剪刀', '石头', '布'])) {
      return 'YOLO-RPS';
    }
    if (hasCategoryKeyword(name, url, ['tts', '语音合成'])) {
      return 'TTS';
    }
    if (hasCategoryKeyword(name, url, ['speaker', '喇叭', 'play'])) {
      return 'SPEAKER';
    }
    if (hasCategoryKeyword(name, url, ['hand', '机械手'])) {
      return 'HAND';
    }
    if (hasCategoryKeyword(name, url, ['screen', 'emoji', '屏幕'])) {
      return 'SCREEN';
    }
  }

  if (type.includes('set')) {
    if (hasAny(name, ['asr', '语音识别', '转写'])) {
      return 'ASR';
    }
    if (hasAny(name, ['llm_emotion', 'structbert', '情绪分类', 'emotion'])) {
      return 'LLM-EMO';
    }
    if (hasAny(name, ['llm', '回复', 'reply'])) {
      return 'LLM';
    }
    if (hasAny(name, ['random', '随机', ' n'])) {
      return 'RAM';
    }
    if (hasAny(name, ['robot=', 'robot_gesture', '机器人手势', '赋值'])) {
      return 'ASSIGN';
    }
    if (hasAny(name, ['face', 'face_net', 'facenet', 'identity', '人脸', '身份'])) {
      return 'FACE-NET';
    }
    if (hasAny(name, ['yolo', 'expression', 'smile', 'emotion', '表情', '微笑'])) {
      return 'YOLO-HAND';
    }
    if (hasAny(name, ['yolo', '识别', 'gesture'])) {
      return 'YOLO-RPS';
    }
    if (hasAny(name, ['tts', 'countdown', 'audio', '语音'])) {
      return 'TTS';
    }
  }

  return 'BASE';
}
