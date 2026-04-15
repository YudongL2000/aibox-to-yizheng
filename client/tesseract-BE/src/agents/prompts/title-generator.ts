/**
 * [INPUT]: 依赖节点分类与节点语义线索
 * [OUTPUT]: 对外提供 generateNodeTitleSubtitle 中文标题生成能力
 * [POS]: prompts 的节点文案模板中心，统一前端展示语义
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

import { NodeCategory } from '../types';

interface NodeMetadataInput {
  type?: unknown;
  name?: unknown;
  sub?: unknown;
}

export interface NodeTitleSubtitle {
  title: string;
  subtitle: string;
}

function lower(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function isTrigger(type: string): boolean {
  return type.includes('scheduletrigger') || type.includes('manualtrigger') || type.includes('webhook');
}

function inferVariant(name: string): 'countdown' | 'win' | 'lose' | 'draw' | 'empty' | 'result' {
  if (name.includes('countdown') || name.includes('倒数')) {
    return 'countdown';
  }
  if (name.includes('win') || name.includes('赢')) {
    return 'win';
  }
  if (name.includes('lose') || name.includes('输')) {
    return 'lose';
  }
  if (name.includes('draw') || name.includes('平局')) {
    return 'draw';
  }
  if (name.includes('empty') || name.includes('空')) {
    return 'empty';
  }
  return 'result';
}

function normalizeSource(parts: Array<string | undefined | null>): string {
  return parts
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.toLowerCase())
    .join(' ');
}

function readSubValue(node: NodeMetadataInput, key: string): string {
  const sub = (node.sub && typeof node.sub === 'object' ? node.sub : {}) as Record<string, unknown>;
  const value = sub[key];
  return typeof value === 'string' ? value : '';
}

function inferGestureZh(source: string): string | null {
  if (!source) {
    return null;
  }

  if (source.includes('rock') || source.includes('石头')) {
    return '石头';
  }
  if (source.includes('scissors') || source.includes('剪刀')) {
    return '剪刀';
  }
  if (source.includes('paper') || source.includes('布')) {
    return '布';
  }
  if (source.includes('middle_finger') || source.includes('middle') || source.includes('中指')) {
    return '中指';
  }
  if (source.includes('thumbs_up') || source.includes('thumb') || source.includes('点赞') || source.includes('大拇指')) {
    return '点赞';
  }
  if (source.includes('victory') || source.includes('v_sign') || source.includes('胜利') || source.includes('v')) {
    return '胜利手势';
  }
  return null;
}

function inferEmojiZh(source: string): string | null {
  if (!source) {
    return null;
  }

  if (source.includes('happy') || source.includes('开心')) {
    return '开心';
  }
  if (source.includes('sad') || source.includes('难过')) {
    return '难过';
  }
  if (source.includes('angry') || source.includes('愤怒')) {
    return '愤怒';
  }
  if (source.includes('peace') || source.includes('平静')) {
    return '平静';
  }
  return null;
}

function inferOutcomeZh(variant: 'countdown' | 'win' | 'lose' | 'draw' | 'empty' | 'result'): string | null {
  switch (variant) {
    case 'win':
      return '获胜';
    case 'lose':
      return '失败';
    case 'draw':
      return '平局';
    case 'empty':
      return '空结果';
    default:
      return null;
  }
}

function inferRandomBranch(name: string): '1' | '2' | '3' | null {
  if (name.includes('n==1') || name.includes('n_eq_1') || name.includes('n_1')) {
    return '1';
  }
  if (name.includes('n==2') || name.includes('n_eq_2') || name.includes('n_2')) {
    return '2';
  }
  if (name.includes('n==3') || name.includes('n_eq_3') || name.includes('n_3')) {
    return '3';
  }
  return null;
}

function inferEmotionLabelFromToken(token: string): string | null {
  const normalized = token.toLowerCase();
  if (['happy', 'smile', '开心', '微笑', '高兴'].some((value) => normalized.includes(value))) {
    return '开心';
  }
  if (['sad', '难过', '伤心', '悲伤'].some((value) => normalized.includes(value))) {
    return '难过';
  }
  if (['angry', '愤怒', '生气'].some((value) => normalized.includes(value))) {
    return '生气';
  }
  if (['peace', 'calm', '平和', '平静'].some((value) => normalized.includes(value))) {
    return '平和';
  }
  return null;
}

function inferIfConditionTitle(name: string): NodeTitleSubtitle | null {
  if (!name.startsWith('if_')) {
    return null;
  }

  const emotionMatch = name.match(/if_(?:emotion_)?is_([a-z0-9_]+)/i);
  if (emotionMatch?.[1]) {
    const emotionLabel = inferEmotionLabelFromToken(emotionMatch[1]);
    if (emotionLabel) {
      return {
        title: `如果用户的情绪是${emotionLabel}`,
        subtitle: `条件判断节点，仅在识别结果为${emotionLabel}时触发该分支。`,
      };
    }
  }

  const personMatch = name.match(/if_(?:face|person)_is_([a-z0-9_\u4e00-\u9fa5]+)/i);
  if (personMatch?.[1]) {
    const person = personMatch[1].replace(/_/g, '').trim();
    if (person) {
      return {
        title: `如果识别到的人物是${person}`,
        subtitle: `条件判断节点，仅在识别结果为${person}时触发该分支。`,
      };
    }
  }

  return null;
}

const GENERIC_TITLE_BY_CATEGORY: Record<NodeCategory, string[]> = {
  BASE: ['游戏开始触发器', '机器人出拳分拣', '胜负裁判网关'],
  CAM: ['用户快照'],
  MIC: ['语音音频拾取'],
  'FACE-NET': ['AI 特征识别器'],
  'YOLO-HAND': ['手势识别', '视觉情绪状态标记'],
  'YOLO-RPS': ['用户出拳结果登记', 'AI 手势识别器'],
  ASR: ['用户语音识别'],
  LLM: ['共情行为编排'],
  'LLM-EMO': ['AI情绪分类器'],
  TTS: ['倒数语音合成', '对战脚本合成'],
  RAM: ['随机出拳计算'],
  ASSIGN: ['机器人手势赋值', '机器人意图登记'],
  HAND: ['物理手势驱动', '机械手执行', '机械手动作'],
  WHEEL: ['底盘移动执行', '全向轮动作'],
  SPEAKER: ['倒数音频播报', '结果音频播报'],
  SCREEN: ['胜负表情展示', '屏幕表情'],
};

const GENERIC_SUBTITLE_KEYWORDS = [
  '对应手势形态',
  '对应情绪表情',
  '播报本轮对战结果',
  '将随机结果映射为可执行手势标签',
  '判定输赢结果',
];

function isGenericNodeText(existing: string, category: NodeCategory, field: 'title' | 'subtitle'): boolean {
  const normalized = (existing || '').trim();
  if (!normalized) {
    return true;
  }
  if (field === 'title') {
    return GENERIC_TITLE_BY_CATEGORY[category].some((title) => normalized === title);
  }
  return GENERIC_SUBTITLE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function resolveAdaptiveNodeText(
  existing: string,
  generated: string,
  category: NodeCategory,
  field: 'title' | 'subtitle'
): string {
  const normalizedExisting = (existing || '').trim();
  if (!normalizedExisting) {
    return generated;
  }
  if (!/[\u4e00-\u9fff]/.test(normalizedExisting)) {
    return generated;
  }
  if (normalizedExisting === generated) {
    return generated;
  }
  if (isGenericNodeText(normalizedExisting, category, field)) {
    return generated;
  }
  return normalizedExisting;
}

export function generateNodeTitleSubtitle(
  node: NodeMetadataInput,
  category: NodeCategory
): NodeTitleSubtitle {
  const type = lower(node.type);
  const name = lower(node.name);
  const source = normalizeSource([
    name,
    readSubValue(node, 'execute_gesture'),
    readSubValue(node, 'robotGesture'),
    readSubValue(node, 'execute_emoji'),
    readSubValue(node, 'expected_screen_emoji'),
    readSubValue(node, 'audio_name'),
    readSubValue(node, 'face_info'),
  ]);

  if (category === 'BASE') {
    const ifConditionText = inferIfConditionTitle(name);
    if (ifConditionText) {
      return ifConditionText;
    }

    if (name.includes('identity') || name.includes('liu') || name.includes('fu')) {
      return {
        title: '身份验证网关',
        subtitle: '条件分流核心，根据识别到的身份把流程导向对应执行分支。',
      };
    }
    if (isTrigger(type)) {
      return {
        title: '游戏开始触发器',
        subtitle: '游戏的发令枪，每隔固定时间自动开启一轮新流程。',
      };
    }
    if (name.includes('n==') || name.includes('robot_n') || name.includes('出拳')) {
      const randomBranch = inferRandomBranch(name);
      if (randomBranch) {
        return {
          title: `机器人出拳分拣-N${randomBranch}`,
          subtitle: `内部逻辑开关，根据随机数 N=${randomBranch} 把流程导向对应出拳分支。`,
        };
      }
      return {
        title: '机器人出拳分拣',
        subtitle: '内部逻辑开关，根据随机数把流程导向对应出拳分支。',
      };
    }
    const outcomeZh = inferOutcomeZh(inferVariant(name));
    if (outcomeZh) {
      return {
        title: `胜负裁判网关-${outcomeZh}`,
        subtitle: `核心逻辑枢纽，根据机器人与用户手势判定本轮结果为${outcomeZh}。`,
      };
    }
    return {
      title: '胜负裁判网关',
      subtitle: '核心逻辑枢纽，根据机器人与用户手势判定输赢结果。',
    };
  }

  if (category === 'CAM') {
    return {
      title: '用户快照',
      subtitle: '调用摄像头，在关键时刻捕捉用户手势画面。',
    };
  }

  if (category === 'MIC') {
    return {
      title: '语音音频拾取',
      subtitle: '调用麦克风硬件，采集用户语音输入。',
    };
  }

  if (category === 'FACE-NET') {
    const faceInfo = readSubValue(node, 'face_info').trim();
    const targetName = faceInfo || (name.includes('liu') ? '老刘' : name.includes('fu') ? '老付' : '');
    if (targetName) {
      return {
        title: `AI 特征识别器-${targetName}`,
        subtitle: `视觉分析单元，专注识别${targetName}的人脸身份。`,
      };
    }
    return {
      title: 'AI 特征识别器',
      subtitle: '视觉分析单元，对画面中的人脸进行身份识别并输出匹配结果。',
    };
  }

  if (category === 'YOLO-RPS') {
    if (type.includes('set')) {
      return {
        title: '用户出拳结果登记',
        subtitle: '数据登记单元，将识别到的用户手势写入流程上下文。',
      };
    }
    return {
      title: 'AI 手势识别器',
      subtitle: '视觉分析单元，识别用户当前手势类别。',
    };
  }

  if (category === 'YOLO-HAND') {
    return {
      title: '视觉情绪状态标记',
      subtitle: '视觉分析单元，识别面部/手势结果并写入上下文。',
    };
  }

  if (category === 'ASR') {
    return {
      title: '用户语音识别',
      subtitle: '将语音输入转写为可分析文本。',
    };
  }

  if (category === 'LLM-EMO') {
    return {
      title: 'AI情绪分类器',
      subtitle: '基于文本与场景信号输出标准情绪标签。',
    };
  }

  if (category === 'LLM') {
    return {
      title: '共情行为编排',
      subtitle: '根据情绪标签生成对话语义与执行策略。',
    };
  }

  if (category === 'TTS') {
    if (name.includes('tts_text_')) {
      return {
        title: '语音合成算法',
        subtitle: '表达转换单元，将文本脚本实时合成为可播放语音。',
      };
    }
    const variant = inferVariant(name);
    if (variant === 'countdown') {
      return {
        title: '倒数语音合成',
        subtitle: '表达转换单元，将倒数文本实时转成语音。',
      };
    }
    const outcomeZh = inferOutcomeZh(variant);
    if (outcomeZh) {
      return {
        title: `对战脚本合成-${outcomeZh}`,
        subtitle: `表达转换单元，将${outcomeZh}结果文本实时转成语音。`,
      };
    }
    return {
      title: '对战脚本合成',
      subtitle: '表达转换单元，将对战结果文本实时转成语音。',
    };
  }

  if (category === 'RAM') {
    return {
      title: '随机出拳计算',
      subtitle: '决策单元，在固定规则范围内随机生成机器人出拳值。',
    };
  }

  if (category === 'ASSIGN') {
    const gestureZh = inferGestureZh(source);
    if (gestureZh) {
      return {
        title: `机器人意图登记-${gestureZh}`,
        subtitle: `数据记录单元，将本轮机器人手势登记为${gestureZh}。`,
      };
    }
    return {
      title: '机器人手势赋值',
      subtitle: '数据记录单元，将随机结果映射为可执行手势标签。',
    };
  }

  if (category === 'HAND') {
    const gestureZh = inferGestureZh(source);
    if (gestureZh) {
      return {
        title: `机械手出${gestureZh}`,
        subtitle: `物理动作单元，驱动机械手摆出${gestureZh}手势。`,
      };
    }
    return {
      title: '物理手势驱动',
      subtitle: '物理动作单元，驱动机械手摆出对应手势形态。',
    };
  }

  if (category === 'WHEEL') {
    return {
      title: '底盘移动执行',
      subtitle: '物理动作单元，驱动底盘执行前进、后退或旋转动作。',
    };
  }

  if (category === 'SPEAKER') {
    if (name.includes('speaker_play_audio')) {
      return {
        title: '音频回响器',
        subtitle: '物理反馈单元，通过扬声器播放语音合成结果。',
      };
    }
    const variant = inferVariant(name);
    if (variant === 'countdown') {
      return {
        title: '倒数音频播报',
        subtitle: '物理反馈单元，通过喇叭播报倒数提示。',
      };
    }
    const outcomeZh = inferOutcomeZh(variant);
    if (outcomeZh) {
      return {
        title: `结果音频播报-${outcomeZh}`,
        subtitle: `物理反馈单元，通过喇叭播报${outcomeZh}结果语音。`,
      };
    }
    return {
      title: '结果音频播报',
      subtitle: '物理反馈单元，通过喇叭播报本轮对战结果。',
    };
  }

  const emojiZh = inferEmojiZh(source);
  if (emojiZh) {
    return {
      title: `胜负表情展示-${emojiZh}`,
      subtitle: `物理显示单元，根据结果显示${emojiZh}表情。`,
    };
  }

  return {
    title: '胜负表情展示',
    subtitle: '物理显示单元，根据结果展示对应情绪表情。',
  };
}
