/**
 * [INPUT]: 无
 * [OUTPUT]: 对外提供 FEW_SHOT_EXAMPLES few-shot 示例
 * [POS]: agents/prompts 的示例库，强调拓扑与组件组合
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

import { LOGIC_NODE_TYPES, NodeCategory, NodeNotes, NodeSubParams } from '../types';

export interface FewShotExample {
  title: string;
  userIntent: string;
  topology: string;
  componentAssembly: string[];
  keyNodes: Array<{
    nodeType: string;
    purpose: string;
  }>;
}

export const FEW_SHOT_EXAMPLES: FewShotExample[] = [
  {
    title: '个性化手势交互',
    userIntent: '见到老刘竖个中指骂人',
    topology:
      '触发器 → 人脸识别 → IF(识别到老刘) → 机械手动作 → 喇叭播报',
    componentAssembly: [
      'schedule_trigger',
      'camera_input',
      'yolov8_identify',
      'single_condition',
      'mechanical_hand_execute',
      'tts_speaker_output',
    ],
    keyNodes: [
      {
        nodeType: 'n8n-nodes-base.set',
        purpose: '容错表达式提取 imageBase64',
      },
      {
        nodeType: 'n8n-nodes-base.httpRequest',
        purpose: '人脸识别 API（环境变量 + timeout）',
      },
      {
        nodeType: 'n8n-nodes-base.set',
        purpose: '解析识别结果（person）',
      },
      {
        nodeType: 'n8n-nodes-base.if',
        purpose: 'IF v2 判断 person == "liu"',
      },
      {
        nodeType: 'n8n-nodes-base.set',
        purpose: '输出准备：gesture/TTS_input',
      },
    ],
  },
  {
    title: '情感交互',
    userIntent: '当我难过时安慰我',
    topology: '触发器 → CAM+MIC → YOLO/ASR/LLM-EMO → IF(happy/sad) → HAND+SCREEN+TTS → SPEAKER',
    componentAssembly: [
      'schedule_trigger',
      'camera_input',
      'microphone_input',
      'yolov8_identify',
      'asr_recognize',
      'structbert_emotion',
      'multi_condition_or',
      'mechanical_hand_execute',
      'screen_display',
      'tts_speaker_output',
    ],
    keyNodes: [
      {
        nodeType: 'n8n-nodes-base.scheduleTrigger',
        purpose: '定时触发器（5秒轮询）',
      },
      {
        nodeType: 'n8n-nodes-base.set',
        purpose: '情绪处理器节点固定命名为 set_llm_emotion（不使用 set_structbert_emotion）',
      },
      {
        nodeType: 'n8n-nodes-base.if',
        purpose: '仅两个 IF：if_emotion_is_happy / if_emotion_is_sad，true 分支并列执行',
      },
      {
        nodeType: 'n8n-nodes-base.code',
        purpose: '执行器节点固定 code：HAND/SCREEN/SPEAKER',
      },
    ],
  },
  {
    title: '石头剪刀布',
    userIntent: '我想玩石头剪刀布',
    topology: '触发器 → 摄像头手势识别 → 计算胜负 → 喇叭播报',
    componentAssembly: [
      'schedule_trigger',
      'camera_input',
      'yolov8_gesture',
      'multi_condition_and',
      'tts_speaker_output',
    ],
    keyNodes: [
      {
        nodeType: 'n8n-nodes-base.scheduleTrigger',
        purpose: '定时触发器（游戏回合）',
      },
      {
        nodeType: 'n8n-nodes-base.set',
        purpose: '处理器节点仅保留空参数结构（assignments: []），业务值写入 notes.sub',
      },
      {
        nodeType: 'n8n-nodes-base.if',
        purpose: 'IF v2 判断（机器人出拳与胜负分支）',
      },
      {
        nodeType: 'n8n-nodes-base.code',
        purpose: '执行器节点（HAND/SPEAKER/SCREEN）必须带最小可执行模板：language=javaScript, jsCode=return items;',
      },
      {
        nodeType: 'n8n-nodes-base.httpRequest',
        purpose: '摄像头抓拍节点（CAM），method/url/options 三字段',
      },
      {
        nodeType: 'n8n-nodes-base.set',
        purpose: '禁止 set_extract_* / set_result_* 冗余节点，保持数据直连',
      },
    ],
  },
];

const NODE_CATEGORY_SET = new Set<NodeCategory>([
  'BASE',
  'CAM',
  'FACE-NET',
  'YOLO-RPS',
  'TTS',
  'RAM',
  'ASSIGN',
  'HAND',
  'SPEAKER',
  'SCREEN',
]);

export function generateNodeNotes(params: {
  title: string;
  subtitle: string;
  category: NodeCategory;
  sessionId: string;
  nodeType: string;
  sub?: NodeSubParams;
}): NodeNotes {
  const { title, subtitle, category, sessionId, nodeType, sub } = params;
  const extra = LOGIC_NODE_TYPES.includes(nodeType as (typeof LOGIC_NODE_TYPES)[number])
    ? 'configured'
    : 'pending';

  return {
    title,
    subtitle,
    category,
    session_ID: sessionId,
    extra,
    ...(sub && Object.keys(sub).length > 0 ? { sub } : {}),
  };
}

export function isNodeCategory(value: unknown): value is NodeCategory {
  return typeof value === 'string' && NODE_CATEGORY_SET.has(value as NodeCategory);
}
