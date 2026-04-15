/**
 * [INPUT]: 依赖 types.ts 的 NodeCategory/HardwareCapabilityEndpoint，依赖 hardware-capability-ids.ts 的规范组件/能力 id 常量，依赖 utils/code-node-parameters.ts 的 code 节点模板
 * [OUTPUT]: 对外提供 SCENE_NODE_TYPE_VERSIONS、SCENE_NOTES_FIELDS、SCENE_COMPONENT_DEFINITIONS 与 HARDWARE_COMPONENTS
 * [POS]: agents 的组件能力真相层；场景定义是唯一真相，运行时组件由这份目录直接派生
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { HardwareCapabilityEndpoint, NodeCategory } from './types';
import { buildExecutableCodeNodeParameters } from '../utils/code-node-parameters';
import {
  HARDWARE_CAPABILITY_IDS,
  HARDWARE_CAPABILITY_KEYS,
  HARDWARE_COMPONENT_IDS,
} from './hardware-capability-ids';

export type SceneComponentCategory = NodeCategory;

export interface SceneNotesFieldDefinition {
  key: string;
  description: string;
}

export interface SceneCapabilityFieldDefinition {
  key: string;
  owner: 'IntakeAgent' | 'ConfigAgent' | 'fixed';
  description: string;
  allowedValues?: string[];
}

export interface SceneCapabilityDefinition {
  id: string;
  displayName: string;
  summary: string;
  keywords: string[];
  nodeType?: string;
  typeVersion?: number;
  subFields?: SceneCapabilityFieldDefinition[];
  dependencies?: string[];
  apiEndpoint?: HardwareCapabilityEndpoint;
  notes?: string;
}

export interface SceneComponentDefinition {
  componentId: string;
  lookupNames: string[];
  category: SceneComponentCategory;
  displayName: string;
  summary: string;
  capabilities: SceneCapabilityDefinition[];
}

export interface HardwareCapabilityDetail {
  displayName?: string;
  keywords?: string[];
  dependencies?: string[];
  apiEndpoint?: HardwareCapabilityEndpoint;
  nodeType?: string;
  typeVersion?: number;
}

export interface HardwareComponent {
  id: string;
  name: string;
  lookupNames: string[];
  displayName: string;
  nodeType: string;
  category: NodeCategory;
  defaultConfig: Record<string, unknown>;
  capabilityDetails: Record<string, HardwareCapabilityDetail>;
  capabilities: string[];
}

export const SCENE_NODE_TYPE_VERSIONS = {
  'n8n-nodes-base.scheduleTrigger': 1.1,
  'n8n-nodes-base.if': 2.2,
  'n8n-nodes-base.splitInBatches': 3,
  'n8n-nodes-base.set': 3.4,
  'n8n-nodes-base.httpRequest': 4.3,
  'n8n-nodes-base.code': 2,
} as const;

export const SCENE_NOTES_FIELDS: SceneNotesFieldDefinition[] = [
  { key: 'extra', description: '前端状态自定义字段' },
  { key: 'device_ID', description: '硬件侧组件 id 字段' },
  { key: 'session_ID', description: '服务端会话 ID' },
  { key: 'topology', description: '硬件侧组件插入的接口' },
  { key: 'title', description: '前端显示节点名字' },
  { key: 'subtitle', description: '前端节点功能解释字段' },
  {
    key: 'category',
    description: '组件分类字段：MIC | LLM | CAM | HAND | YOLO-HAND | YOLO-RPS | FACE-NET | BASE | TTS | ASR | SCREEN | SPEAKER | WHEEL | RAM | ASSIGN | LLM-EMO',
  },
  { key: 'sub', description: '硬件侧解析保留的二级内容字段' },
];

/*
 * ============================================================
 * Canonical Scene Catalog
 * 只保留用户给出的场景定义；同 category 能力在这里合并。
 * 运行时组件、能力 id 与旧别名全部由这份真相层派生。
 * ============================================================
 */
export const SCENE_COMPONENT_DEFINITIONS: SceneComponentDefinition[] = [
  {
    componentId: HARDWARE_COMPONENT_IDS.BASE,
    lookupNames: ['base', 'trigger', 'logic'],
    category: 'BASE',
    displayName: '基础控制节点',
    summary: '合并触发器与逻辑器能力，覆盖定时触发、条件分支与批处理循环。',
    capabilities: [
      {
        id: HARDWARE_CAPABILITY_KEYS.BASE.SCHEDULE_TRIGGER,
        displayName: '定时触发',
        summary: '每隔固定秒数启动一轮流程。',
        keywords: ['定时触发', 'schedule trigger', '每隔', 'seconds', '触发器'],
        nodeType: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1.1,
        subFields: [
          {
            key: 'seconds',
            owner: 'IntakeAgent',
            description: '定时秒数，例如 5 秒。',
          },
        ],
      },
      {
        id: HARDWARE_CAPABILITY_KEYS.BASE.CONDITIONAL_BRANCH,
        displayName: '条件分支',
        summary: '根据 leftValue/rightValue 等条件做 IF 分支判断。',
        keywords: ['条件分支', 'if', '判断', 'branch'],
        nodeType: 'n8n-nodes-base.if',
        typeVersion: 2.2,
        notes: '条件主体写在 parameters.conditions.conditions 中，不走 notes.sub。',
      },
      {
        id: HARDWARE_CAPABILITY_KEYS.BASE.BATCH_LOOP,
        displayName: '批量循环',
        summary: '按 batchSize 做批处理或循环逻辑。',
        keywords: ['批量处理', '循环', 'split in batches', 'batch'],
        nodeType: 'n8n-nodes-base.splitInBatches',
        typeVersion: 3,
        notes: '批量大小写在 parameters.batchSize 中，不走 notes.sub。',
      },
    ],
  },
  {
    componentId: HARDWARE_COMPONENT_IDS.CAMERA,
    lookupNames: ['camera', 'cam', '摄像头'],
    category: 'CAM',
    displayName: '摄像头',
    summary: '负责视频/图像输入，不承担识别语义本身。',
    capabilities: [
      {
        id: HARDWARE_CAPABILITY_KEYS.CAMERA.SNAPSHOT_INPUT,
        displayName: '图像采集',
        summary: '调用摄像头抓取当前画面，供后续识别模块使用。',
        keywords: ['摄像头', '视频输入', '快照', 'snapshot', 'camera', '抓拍', '看到', '看见', '观察', '监控', '跟随', '跟着我', '人物跟随'],
        nodeType: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.3,
        apiEndpoint: {
          url: 'http://robot.local/api/camera/snapshot',
          method: 'POST',
        },
        subFields: [
          {
            key: 'output',
            owner: 'IntakeAgent',
            description: '摄像头输出变量名，例如 camera1。',
          },
        ],
      },
    ],
  },
  {
    componentId: HARDWARE_COMPONENT_IDS.MICROPHONE,
    lookupNames: ['microphone', 'mic', '麦克风'],
    category: 'MIC',
    displayName: '麦克风',
    summary: '负责声音输入，不承担语音识别语义本身。',
    capabilities: [
      {
        id: HARDWARE_CAPABILITY_KEYS.MICROPHONE.AUDIO_INPUT,
        displayName: '音频采集',
        summary: '调用麦克风抓取用户声音，供后续 ASR 使用。',
        keywords: ['麦克风', '声音输入', '音频输入', 'microphone', 'mic', '说话输入', '对着它说话', '听我说', '听到声音'],
        nodeType: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.3,
        apiEndpoint: {
          url: 'http://robot.local/api/mic/snapshot',
          method: 'POST',
        },
        subFields: [
          {
            key: 'output',
            owner: 'IntakeAgent',
            description: '麦克风输出变量名，例如 microphone1。',
          },
        ],
      },
    ],
  },
  {
    componentId: HARDWARE_COMPONENT_IDS.YOLO_RPS,
    lookupNames: ['yolo_rps', 'rps', '石头剪刀布'],
    category: 'YOLO-RPS',
    displayName: '石头剪刀布识别',
    summary: '基于摄像头输入识别石头/剪刀/布，并登记识别结果。',
    capabilities: [
      {
        id: HARDWARE_CAPABILITY_KEYS.YOLO_RPS.RPS_GESTURE_RECOGNITION,
        displayName: '猜拳手势识别',
        summary: '将用户猜拳手势识别结果写入系统变量。',
        keywords: ['石头剪刀布', '猜拳', 'yolo rps', 'gesture recognition', '用户出拳'],
        nodeType: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        dependencies: [HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT],
        subFields: [
          {
            key: 'yolov_input',
            owner: 'IntakeAgent',
            description: '前置摄像头输出变量名。',
          },
          {
            key: 'yolov_output',
            owner: 'IntakeAgent',
            description: '识别结果变量名，例如 userGesture。',
          },
        ],
      },
    ],
  },
  {
    componentId: HARDWARE_COMPONENT_IDS.YOLO_HAND,
    lookupNames: ['yolo_hand', 'gesture_recognizer', '手势识别'],
    category: 'YOLO-HAND',
    displayName: '手势识别',
    summary: '识别中指、V 手势、大拇指等泛化手势结果。',
    capabilities: [
      {
        id: HARDWARE_CAPABILITY_KEYS.YOLO_HAND.HAND_GESTURE_RECOGNITION,
        displayName: '通用手势识别',
        summary: '从摄像头输入中识别手势标签并写入变量。',
        keywords: ['手势识别', '中指', 'v 手势', '大拇指', 'yolo hand', 'gesture recognition'],
        nodeType: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        dependencies: [HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT],
        subFields: [
          {
            key: 'yolov_input',
            owner: 'IntakeAgent',
            description: '前置摄像头输出变量名。',
          },
          {
            key: 'yolov_output',
            owner: 'IntakeAgent',
            description: '识别结果变量名，例如 userGesture。',
          },
        ],
      },
    ],
  },
  {
    componentId: HARDWARE_COMPONENT_IDS.FACE_NET,
    lookupNames: ['face_net', 'facenet', 'face', '人脸识别'],
    category: 'FACE-NET',
    displayName: '人脸识别',
    summary: '基于摄像头输入做人脸识别与身份输出。',
    capabilities: [
      {
        id: HARDWARE_CAPABILITY_KEYS.FACE_NET.FACE_RECOGNITION,
        displayName: '人脸识别',
        summary: '将识别结果写入 facenet_output，供身份分支使用。',
        keywords: ['人脸识别', 'face net', '身份识别', 'facenet', 'face recognition', '跟随', '跟着我', '人物跟随', '目标跟随'],
        nodeType: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        dependencies: [HARDWARE_CAPABILITY_IDS.CAMERA.SNAPSHOT_INPUT],
        subFields: [
          {
            key: 'facenet_input',
            owner: 'IntakeAgent',
            description: '前置摄像头输出变量名。',
          },
          {
            key: 'facenet_output',
            owner: 'IntakeAgent',
            description: '识别结果变量名，例如 facenet_output。',
          },
        ],
        notes: '场景描述提到需要上传识别人脸图片，但当前片段未给出显式 notes.sub 字段名。',
      },
    ],
  },
  {
    componentId: HARDWARE_COMPONENT_IDS.TTS,
    lookupNames: ['tts', 'voice', 'speech', '语音合成'],
    category: 'TTS',
    displayName: '语音合成',
    summary: '负责把文字转成音频文件，供喇叭播放。',
    capabilities: [
      {
        id: HARDWARE_CAPABILITY_KEYS.TTS.AUDIO_GENERATION,
        displayName: '音频生成',
        summary: '将文本实时转换为语音文件。',
        keywords: ['tts', '音频生成', '语音合成', 'text to speech', '播报文本', '欢迎语音', '开口说', '说一句', '念出来', '生成语音'],
        nodeType: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        subFields: [
          {
            key: 'TTS_input',
            owner: 'ConfigAgent',
            description: '需要被合成的文本内容。',
          },
          {
            key: 'audio_name',
            owner: 'IntakeAgent',
            description: '生成音频的变量名。',
          },
        ],
        notes: '场景说明中存在音色配置，但当前样例片段未给出显式 notes.sub 字段名。',
      },
    ],
  },
  {
    componentId: HARDWARE_COMPONENT_IDS.ASR,
    lookupNames: ['asr', 'speech_to_text', '语音识别'],
    category: 'ASR',
    displayName: '语音识别',
    summary: '将麦克风输入转换为文字结果。',
    capabilities: [
      {
        id: HARDWARE_CAPABILITY_KEYS.ASR.SPEECH_RECOGNITION,
        displayName: '语音转文本',
        summary: '将音频输入识别成文字输出。',
        keywords: ['asr', '语音识别', 'speech to text', '语音转文本', '识别我说的话', '听懂', '转成文字'],
        nodeType: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        dependencies: [HARDWARE_CAPABILITY_IDS.MICROPHONE.AUDIO_INPUT],
        subFields: [
          {
            key: 'asr_input',
            owner: 'IntakeAgent',
            description: '前置麦克风输出变量名。',
          },
          {
            key: 'asr_output',
            owner: 'IntakeAgent',
            description: 'ASR 输出变量名。',
          },
        ],
      },
    ],
  },
  {
    componentId: HARDWARE_COMPONENT_IDS.LLM,
    lookupNames: ['llm', 'reply', 'ai_reply'],
    category: 'LLM',
    displayName: '大模型回复',
    summary: '负责自由文本回复与角色人设驱动。',
    capabilities: [
      {
        id: HARDWARE_CAPABILITY_KEYS.LLM.PROMPT_REPLY,
        displayName: 'AI 回复',
        summary: '基于 prompt 输出对话内容。',
        keywords: ['llm', 'ai 回复', '共情人设', 'prompt', 'reply', '智能回复', '自由对话', '开放式回答'],
        nodeType: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        subFields: [
          {
            key: 'prompt',
            owner: 'ConfigAgent',
            description: '回复节点的人设或提示词。',
          },
        ],
      },
    ],
  },
  {
    componentId: HARDWARE_COMPONENT_IDS.LLM_EMO,
    lookupNames: ['llm_emo', 'structbert', 'emotion_classifier'],
    category: 'LLM-EMO',
    displayName: '大模型情绪分类',
    summary: '根据用户内容输出固定情绪标签。',
    capabilities: [
      {
        id: HARDWARE_CAPABILITY_KEYS.LLM_EMO.EMOTION_CLASSIFICATION,
        displayName: '情绪分类',
        summary: '将用户输入映射到开心/悲伤/愤怒/平静等情绪标签。',
        keywords: ['llm emo', '情绪分类', 'structbert', 'emotion', '共情分类'],
        nodeType: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        subFields: [
          {
            key: 'prompt',
            owner: 'fixed',
            description: '固定情绪分类提示词。',
          },
        ],
      },
    ],
  },
  {
    componentId: HARDWARE_COMPONENT_IDS.RAM,
    lookupNames: ['ram', 'random', '随机'],
    category: 'RAM',
    displayName: '随机数',
    summary: '负责随机策略或随机出拳决策。',
    capabilities: [
      {
        id: HARDWARE_CAPABILITY_KEYS.RAM.RANDOM_CHOICE,
        displayName: '随机结果生成',
        summary: '在给定规则内生成随机值。',
        keywords: ['随机数', '随机规则', 'random', 'ram'],
        nodeType: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        subFields: [
          {
            key: 'random_rule',
            owner: 'IntakeAgent',
            description: '随机规则上限，例如 3。',
          },
          {
            key: 'output',
            owner: 'IntakeAgent',
            description: '随机结果输出变量名，例如 n。',
          },
        ],
      },
    ],
  },
  {
    componentId: HARDWARE_COMPONENT_IDS.ASSIGN,
    lookupNames: ['assign', '赋值'],
    category: 'ASSIGN',
    displayName: '赋值节点',
    summary: '把中间结果映射成后续执行器可消费的标签。',
    capabilities: [
      {
        id: HARDWARE_CAPABILITY_KEYS.ASSIGN.MEMORY_ASSIGNMENT,
        displayName: '结果赋值',
        summary: '将随机值或判断结果翻译成手势/变量标签。',
        keywords: ['赋值', 'assign', 'robot gesture', '标签映射'],
        nodeType: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        subFields: [
          {
            key: 'robotGesture',
            owner: 'IntakeAgent',
            description: '写入机器人手势标签，例如 paper。',
          },
        ],
      },
    ],
  },
  {
    componentId: HARDWARE_COMPONENT_IDS.HAND,
    lookupNames: ['hand', 'mechanical_hand', 'mechanical_arm', '机械手', '机械臂'],
    category: 'HAND',
    displayName: '手部执行器',
    summary: '合并机械手与机械臂的执行能力，统一归入 HAND 类别。',
    capabilities: [
      {
        id: HARDWARE_CAPABILITY_KEYS.HAND.GESTURE_EXECUTE,
        displayName: '手势执行',
        summary: '驱动机械手执行固定手势。',
        keywords: ['机械手', '手势执行', 'middle finger', 'victory', 'rock', 'paper', 'wave', 'thumbs up', 'grasp', 'release', '挥手', '比划', '做手势', '手部动作', '出拳'],
        nodeType: 'n8n-nodes-base.code',
        typeVersion: 2,
        subFields: [
          {
            key: 'execute_gesture',
            owner: 'IntakeAgent',
            description: '执行的手势或动作标识。',
            allowedValues: ['Waving', 'Middle_Finger', 'Thumbs_Up', 'Rock', 'Scissors', 'Paper', 'Victory', 'Default', 'Put_down'],
          },
        ],
      },
      {
        id: HARDWARE_CAPABILITY_KEYS.HAND.ARM_EMOTIVE_MOTION,
        displayName: '机械臂情感动作',
        summary: '执行放下、抬起并夹两下、挥挥钳子等情感动作。',
        keywords: ['机械臂', '放下', '抬起', '夹两下', '挥挥钳子', 'lift', 'lower', 'preset action'],
        nodeType: 'n8n-nodes-base.code',
        typeVersion: 2,
        notes: '场景描述给出了动作集合，但当前片段未给出显式 notes.sub 字段名；后续迁移建议补正式 schema。',
      },
    ],
  },
  {
    componentId: HARDWARE_COMPONENT_IDS.SPEAKER,
    lookupNames: ['speaker', '喇叭', '扬声器'],
    category: 'SPEAKER',
    displayName: '喇叭',
    summary: '播放由 TTS 或其他模块生成的音频。',
    capabilities: [
      {
        id: HARDWARE_CAPABILITY_KEYS.SPEAKER.AUDIO_PLAYBACK,
        displayName: '音频播放',
        summary: '通过喇叭播放指定音频变量。',
        keywords: ['喇叭', '音频播放', 'speaker', 'playback', '结果播报', '扬声器', '说出来', '播放语音', '开口说'],
        nodeType: 'n8n-nodes-base.code',
        typeVersion: 2,
        dependencies: [HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION],
        subFields: [
          {
            key: 'audio_name',
            owner: 'IntakeAgent',
            description: '前置 TTS 输出的音频变量名。',
          },
        ],
      },
    ],
  },
  {
    componentId: HARDWARE_COMPONENT_IDS.SCREEN,
    lookupNames: ['screen', '屏幕'],
    category: 'SCREEN',
    displayName: '屏幕',
    summary: '显示情绪 emoji 或结果反馈。',
    capabilities: [
      {
        id: HARDWARE_CAPABILITY_KEYS.SCREEN.EMOJI_DISPLAY,
        displayName: '表情显示',
        summary: '在屏幕上显示对应 emoji。',
        keywords: ['屏幕', 'emoji', '表情显示', 'screen', '显示', '显示文字', '屏幕提示', '屏幕反馈'],
        nodeType: 'n8n-nodes-base.code',
        typeVersion: 2,
        subFields: [
          {
            key: 'execute_emoji',
            owner: 'ConfigAgent',
            description: '执行显示的 emoji。',
            allowedValues: ['Happy', 'Sad', 'Angry', 'Peace'],
          },
        ],
      },
    ],
  },
  {
    componentId: HARDWARE_COMPONENT_IDS.WHEEL,
    lookupNames: ['wheel', 'chassis', '底盘', '全向轮'],
    category: 'WHEEL',
    displayName: '底盘（全向轮）',
    summary: '负责前进、后退与旋转等移动动作。',
    capabilities: [
      {
        id: HARDWARE_CAPABILITY_KEYS.WHEEL.MOVEMENT_EXECUTE,
        displayName: '移动执行',
        summary: '执行前进、后退、顺时针旋转 90° 等动作。',
        keywords: ['底盘', '全向轮', '前进', '后退', '顺时针旋转', 'wheel', 'rotation', 'move', '转一圈', '到处转', '来回移动', '巡看', '跟随', '跟着我走', '自动跟随'],
        nodeType: 'n8n-nodes-base.code',
        typeVersion: 2,
        notes: '场景描述给出了动作集合，但当前片段未给出显式节点 JSON；需在后续 schema 中补齐 nodeType/sub 字段。',
      },
    ],
  },
];

function buildComponentDefaultConfig(nodeTypes: string[]): Record<string, unknown> {
  const uniqueNodeTypes = Array.from(new Set(nodeTypes.filter(Boolean)));
  if (uniqueNodeTypes.length !== 1) {
    return {};
  }

  const [nodeType] = uniqueNodeTypes;
  switch (nodeType) {
    case 'n8n-nodes-base.httpRequest':
      return {
        method: 'POST',
        options: {},
      };
    case 'n8n-nodes-base.set':
      return {
        assignments: { assignments: [] },
        options: {},
      };
    case 'n8n-nodes-base.code':
      return buildExecutableCodeNodeParameters();
    case 'n8n-nodes-base.scheduleTrigger':
      return {
        rule: {
          interval: [{}],
        },
      };
    case 'n8n-nodes-base.if':
      return {
        conditions: {
          options: {
            version: 3,
            caseSensitive: true,
            typeValidation: 'loose',
          },
          combinator: 'and',
          conditions: [],
        },
      };
    case 'n8n-nodes-base.splitInBatches':
      return {
        batchSize: 1,
        options: {
          reset: false,
        },
      };
    default:
      return {};
  }
}

function buildCapabilityEndpoint(
  component: SceneComponentDefinition,
  capability: SceneCapabilityDefinition
): HardwareCapabilityEndpoint {
  if (capability.apiEndpoint) {
    return capability.apiEndpoint;
  }

  return {
    url: `http://hardware-api/${component.componentId}/${capability.id}`,
    method: 'POST',
  };
}

function projectSceneComponent(component: SceneComponentDefinition): HardwareComponent {
  const firstNodeType =
    component.capabilities.find((capability) => capability.nodeType)?.nodeType ??
    'n8n-nodes-base.set';
  const capabilityNodeTypes = component.capabilities
    .map((capability) => capability.nodeType ?? '')
    .filter(Boolean);

  const capabilityDetails = Object.fromEntries(
    component.capabilities.map((capability) => [
      capability.id,
      {
        displayName: capability.displayName,
        keywords: [capability.summary, ...capability.keywords],
        dependencies: capability.dependencies ?? [],
        apiEndpoint: buildCapabilityEndpoint(component, capability),
        nodeType: capability.nodeType,
        typeVersion: capability.typeVersion,
      } satisfies HardwareCapabilityDetail,
    ])
  );

  return {
    id: component.componentId,
    name: component.componentId,
    lookupNames: component.lookupNames,
    displayName: component.displayName,
    nodeType: firstNodeType,
    category: component.category,
    defaultConfig: buildComponentDefaultConfig(capabilityNodeTypes),
    capabilityDetails,
    capabilities: component.capabilities.map((capability) => capability.id),
  };
}

export const HARDWARE_COMPONENTS: HardwareComponent[] =
  SCENE_COMPONENT_DEFINITIONS.map(projectSceneComponent);

export const HARDWARE_COMPONENT_NAME_ALIASES: Record<string, string> = Object.fromEntries(
  HARDWARE_COMPONENTS.flatMap((component) =>
    component.lookupNames.map((name) => [name.toLowerCase(), component.id] as const)
  )
);
