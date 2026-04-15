/**
 * [INPUT]: 依赖节点原始名称、类型与分类信息
 * [OUTPUT]: 对外提供 generateNodeName/normalizeNodeName 节点命名标准化能力
 * [POS]: prompts 的命名规范器，统一中文业务语义节点名并为运行时归一化提供兜底
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
  'n8n-nodes-base.scheduleTrigger': '定时触发',
  'n8n-nodes-base.httpRequest': '接口请求',
  'n8n-nodes-base.set': '数据设置',
  'n8n-nodes-base.code': '逻辑处理',
  'n8n-nodes-base.if': '条件判断',
  'n8n-nodes-base.switch': '条件分流',
  'n8n-nodes-base.merge': '结果汇总',
};

const CATEGORY_PREFIX: Record<NodeCategory, string> = {
  BASE: '基础流程',
  CAM: '摄像头',
  MIC: '麦克风',
  WHEEL: '底盘',
  'FACE-NET': '人脸识别',
  'YOLO-HAND': '视觉识别',
  'YOLO-RPS': '猜拳识别',
  ASR: '语音识别',
  LLM: '语义生成',
  'LLM-EMO': '情绪分析',
  TTS: '语音播报',
  RAM: '随机生成',
  ASSIGN: '动作设定',
  HAND: '机械手',
  SPEAKER: '扬声器',
  SCREEN: '屏幕',
};

function sanitize(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function pickChineseText(...values: Array<string | undefined>): string {
  return values.find((value) => typeof value === 'string' && /[\u4e00-\u9fff]/.test(value))?.trim() || '';
}

function inferVariantLabel(name: string): string {
  if (name.includes('倒数')) {
    return '倒计时';
  }
  if (name.includes('赢')) {
    return '胜利反馈';
  }
  if (name.includes('输')) {
    return '失败反馈';
  }
  if (name.includes('平局')) {
    return '平局反馈';
  }
  if (name.includes('结果')) {
    return '结果播报';
  }
  return '语音播报';
}

function inferActionDetail(category: NodeCategory, currentName: string, sub?: NodeSubParams): string {
  const chineseName = pickChineseText(
    currentName,
    sub?.robotGesture,
    sub?.execute_gesture,
    sub?.execute_emoji,
    sub?.face_info,
    sub?.audio_name,
    sub?.prompt
  );

  switch (category) {
    case 'BASE':
      if (currentName.includes('trigger') || currentName.includes('触发')) {
        const seconds = sub?.seconds ?? 0.5;
        return `每${seconds}秒触发`;
      }
      return chineseName || '条件路由';

    case 'CAM':
      return chineseName || '抓拍输入';

    case 'MIC':
      return chineseName || '音频采集';

    case 'FACE-NET':
      return chineseName || '目标识别';

    case 'YOLO-HAND':
      return chineseName || '表情识别';

    case 'YOLO-RPS':
      return currentName.includes('set') || currentName.includes('写入') ? '结果写入' : chineseName || '手势识别';

    case 'ASR':
      return chineseName || '语音转写';

    case 'LLM':
      return chineseName || '生成回复';

    case 'LLM-EMO':
      return chineseName || '情绪判断';

    case 'TTS':
      return chineseName || inferVariantLabel(currentName);

    case 'RAM':
      return chineseName || '随机数生成';

    case 'ASSIGN':
      return chineseName || '动作赋值';

    case 'HAND':
      return chineseName ? `执行${chineseName}` : '执行动作';

    case 'WHEEL':
      return chineseName || '移动控制';

    case 'SPEAKER':
      return chineseName || inferVariantLabel(currentName);

    case 'SCREEN':
      return chineseName ? `显示${chineseName}` : '表情显示';

    default:
      return chineseName || '处理步骤';
  }
}

export function normalizeNodeName(name: string): string {
  return sanitize(name || '节点');
}

export function generateNodeName(input: NodeNameInput): string {
  const { nodeType, currentName, category, sub } = input;
  const trimmedCurrentName = currentName.trim();
  if (trimmedCurrentName.length > 0 && /[\u4e00-\u9fff]/.test(trimmedCurrentName)) {
    return normalizeNodeName(trimmedCurrentName);
  }

  const prefix = TYPE_PREFIX[nodeType] ?? CATEGORY_PREFIX[category] ?? '处理节点';
  const detail = inferActionDetail(category, trimmedCurrentName, sub);
  return normalizeNodeName(detail === prefix ? detail : `${prefix}_${detail}`);
}
