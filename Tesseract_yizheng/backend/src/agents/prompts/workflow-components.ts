/**
 * [INPUT]: 无
 * [OUTPUT]: 对外提供 WorkflowComponent/WorkflowNodeConfig 类型与 WORKFLOW_COMPONENTS 组件库
 * [POS]: agents/prompts 的组件库定义，用于系统提示词渲染
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

import { getNodeTypeVersion } from '../node-type-versions';
import { logger } from '../../utils/logger';

export type WorkflowComponentCategory = 'INPUT' | 'PROCESS' | 'DECISION' | 'OUTPUT';

export interface WorkflowNodeConfig {
  name: string;
  type: string;
  typeVersion: number;
  parameters: Record<string, unknown>;
}

export type WorkflowNodeConfigBase = Omit<WorkflowNodeConfig, 'typeVersion'> & {
  typeVersion?: number;
};

export interface WorkflowComponent {
  name: string;
  description: string;
  category: WorkflowComponentCategory;
  nodes: WorkflowNodeConfig[];
  outputContract: string[];
  envVars: string[];
  inputContract?: string[];
}

export type WorkflowComponentBase = Omit<WorkflowComponent, 'nodes'> & {
  nodes: WorkflowNodeConfigBase[];
};

const WORKFLOW_COMPONENTS_BASE: WorkflowComponentBase[] = [
  {
    name: 'camera_input',
    description: '摄像头抓拍并提取图片数据',
    category: 'INPUT',
    nodes: [
      {
        name: 'httpRequest - 摄像头抓拍',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          url: '={{$env.CAMERA_SNAPSHOT_URL || "http://robot.local/api/camera/snapshot"}}',
          options: { timeout: 60000 },
        },
      },
      {
        name: 'Set - 提取图片数据',
        type: 'n8n-nodes-base.set',
        parameters: {
          values: {
            string: [
              {
                name: 'imageBase64',
                value:
                  '={{$json.imageBase64 || $json.image || ($json.data && $json.data.imageBase64) || ""}}',
              },
            ],
          },
          options: {},
        },
      },
    ],
    outputContract: ['imageBase64'],
    envVars: ['CAMERA_SNAPSHOT_URL'],
  },
  {
    name: 'microphone_input',
    description: '麦克风录音并提取音频数据',
    category: 'INPUT',
    nodes: [
      {
        name: 'httpRequest - 麦克风录音',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          url: '={{$env.MIC_CAPTURE_URL || "http://robot.local/api/mic/capture"}}',
          options: { timeout: 60000 },
        },
      },
      {
        name: 'Set - 提取音频数据',
        type: 'n8n-nodes-base.set',
        parameters: {
          values: {
            string: [
              {
                name: 'audioData',
                value:
                  '={{$json.audioData || $json.audio || ($json.data && $json.data.audioData) || ""}}',
              },
            ],
          },
          options: {},
        },
      },
    ],
    outputContract: ['audioData'],
    envVars: ['MIC_CAPTURE_URL'],
  },
  {
    name: 'schedule_trigger',
    description: '定时触发工作流',
    category: 'INPUT',
    nodes: [
      {
        name: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        parameters: {
          rule: { interval: [{}] },
        },
      },
    ],
    outputContract: [],
    envVars: [],
  },
  {
    name: 'webhook_trigger',
    description: '外部 HTTP 请求触发工作流',
    category: 'INPUT',
    nodes: [
      {
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        parameters: {
          httpMethod: 'POST',
          path: '={{$parameter.webhookPath || "trigger"}}',
          options: {},
        },
      },
    ],
    outputContract: ['body'],
    envVars: [],
  },
  {
    name: 'yolov8_identify',
    description: '调用 yolov8 进行人脸/物体识别',
    category: 'PROCESS',
    inputContract: ['imageBase64'],
    nodes: [
      {
        name: 'httpRequest - yolov8 识别',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          method: 'POST',
          url: '={{$env.YOLOV8_API_URL || "http://ai.local/api/yolov8/identify"}}',
          options: { timeout: 60000 },
        },
      },
      {
        name: 'Set - 解析识别结果',
        type: 'n8n-nodes-base.set',
        parameters: {
          values: {
            string: [
              {
                name: 'person',
                value:
                  '={{$json.person || $json.bestMatch || $json.name || ($json.result && $json.result.person) || ""}}',
              },
              {
                name: 'visionLabel',
                value:
                  '={{$json.label || $json.class || ($json.result && $json.result.label) || ""}}',
              },
            ],
          },
          options: {},
        },
      },
    ],
    outputContract: ['person', 'visionLabel'],
    envVars: ['YOLOV8_API_URL'],
  },
  {
    name: 'face_net_recognition',
    description: '基于 FaceNet 配置进行身份识别结果解析',
    category: 'PROCESS',
    inputContract: ['imageBase64'],
    nodes: [
      {
        name: 'Set - FaceNet 身份识别',
        type: 'n8n-nodes-base.set',
        parameters: {
          assignments: {
            assignments: [],
          },
          options: {},
        },
      },
    ],
    outputContract: ['facenet_output'],
    envVars: [],
  },
  {
    name: 'yolov8_gesture',
    description: '调用 yolov8 进行手势识别',
    category: 'PROCESS',
    inputContract: ['imageBase64'],
    nodes: [
      {
        name: 'httpRequest - yolov8 手势识别',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          method: 'POST',
          url: '={{$env.YOLOV8_GESTURE_API_URL || "http://ai.local/api/yolov8/gesture"}}',
          options: { timeout: 60000 },
        },
      },
      {
        name: 'Set - 解析手势结果',
        type: 'n8n-nodes-base.set',
        parameters: {
          values: {
            string: [
              {
                name: 'gesture',
                value:
                  '={{$json.gesture || $json.label || ($json.result && $json.result.gesture) || ""}}',
              },
            ],
          },
          options: {},
        },
      },
    ],
    outputContract: ['gesture'],
    envVars: ['YOLOV8_GESTURE_API_URL'],
  },
  {
    name: 'asr_recognize',
    description: '调用 ASR 进行语音转文字',
    category: 'PROCESS',
    inputContract: ['audioData'],
    nodes: [
      {
        name: 'httpRequest - ASR 语音识别',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          method: 'POST',
          url: '={{$env.ASR_API_URL || "http://ai.local/api/asr"}}',
          options: { timeout: 60000 },
        },
      },
      {
        name: 'Set - 解析语音文本',
        type: 'n8n-nodes-base.set',
        parameters: {
          values: {
            string: [
              {
                name: 'text',
                value:
                  '={{$json.text || $json.transcript || ($json.data && $json.data.text) || ""}}',
              },
            ],
          },
          options: {},
        },
      },
    ],
    outputContract: ['text'],
    envVars: ['ASR_API_URL'],
  },
  {
    name: 'structbert_emotion',
    description: '调用 StructBERT 进行情绪分类',
    category: 'PROCESS',
    inputContract: ['text'],
    nodes: [
      {
        name: 'httpRequest - StructBERT 情绪分类',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          method: 'POST',
          url: '={{$env.STRUCTBERT_EMO_API_URL || "http://ai.local/api/structbert/emotion"}}',
          options: { timeout: 60000 },
        },
      },
      {
        name: 'Set - 解析情绪结果',
        type: 'n8n-nodes-base.set',
        parameters: {
          values: {
            string: [
              {
                name: 'emotionText',
                value:
                  '={{$json.label || $json.emotion || ($json.result && $json.result.emotion) || ""}}',
              },
            ],
          },
          options: {},
        },
      },
    ],
    outputContract: ['emotionText'],
    envVars: ['STRUCTBERT_EMO_API_URL'],
  },
  {
    name: 'llm_generate',
    description: '调用 LLM 生成回复文本',
    category: 'PROCESS',
    inputContract: ['prompt'],
    nodes: [
      {
        name: 'httpRequest - LLM 文本生成',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          method: 'POST',
          url: '={{$env.LLM_API_URL || "http://ai.local/api/llm"}}',
          options: { timeout: 60000 },
        },
      },
      {
        name: 'Set - 解析 LLM 回复',
        type: 'n8n-nodes-base.set',
        parameters: {
          values: {
            string: [
              {
                name: 'generatedText',
                value:
                  '={{$json.text || $json.answer || $json.content || ($json.data && $json.data.text) || ""}}',
              },
            ],
          },
          options: {},
        },
      },
    ],
    outputContract: ['generatedText'],
    envVars: ['LLM_API_URL'],
  },
  {
    name: 'single_condition',
    description: '单条件 IF 判断',
    category: 'DECISION',
    nodes: [
      {
        name: 'IF - {{conditionName}}',
        type: 'n8n-nodes-base.if',
        parameters: {
          conditions: {
            options: {
              caseSensitive: true,
              leftValue: '',
              typeValidation: 'strict',
              version: 1,
            },
            conditions: [
              {
                id: '{{uuid}}',
                leftValue: '{{fieldName}}',
                rightValue: '{{expectedValue}}',
                operator: {
                  type: 'string',
                  operation: 'equals',
                  name: 'filter.operator.equals',
                },
              },
            ],
            combinator: 'and',
          },
          options: {},
        },
      },
    ],
    outputContract: ['true分支', 'false分支'],
    envVars: [],
  },
  {
    name: 'multi_condition_and',
    description: '多条件 AND 判断（所有条件都满足）',
    category: 'DECISION',
    nodes: [
      {
        name: 'IF - {{conditionName}}',
        type: 'n8n-nodes-base.if',
        parameters: {
          conditions: {
            options: {
              caseSensitive: true,
              leftValue: '',
              typeValidation: 'strict',
              version: 1,
            },
            conditions: [
              {
                id: '{{uuid1}}',
                leftValue: '{{field1}}',
                rightValue: '{{value1}}',
                operator: {
                  type: 'string',
                  operation: 'equals',
                  name: 'filter.operator.equals',
                },
              },
              {
                id: '{{uuid2}}',
                leftValue: '{{field2}}',
                rightValue: '{{value2}}',
                operator: {
                  type: 'string',
                  operation: 'equals',
                  name: 'filter.operator.equals',
                },
              },
            ],
            combinator: 'and',
          },
          options: {},
        },
      },
    ],
    outputContract: ['true分支', 'false分支'],
    envVars: [],
  },
  {
    name: 'multi_condition_or',
    description: '多条件 OR 判断（任一条件满足）',
    category: 'DECISION',
    nodes: [
      {
        name: 'IF - {{conditionName}}',
        type: 'n8n-nodes-base.if',
        parameters: {
          conditions: {
            options: {
              caseSensitive: true,
              leftValue: '',
              typeValidation: 'strict',
              version: 1,
            },
            conditions: [
              {
                id: '{{uuid1}}',
                leftValue: '{{field1}}',
                rightValue: '{{value1}}',
                operator: {
                  type: 'string',
                  operation: 'equals',
                  name: 'filter.operator.equals',
                },
              },
              {
                id: '{{uuid2}}',
                leftValue: '{{field2}}',
                rightValue: '{{value2}}',
                operator: {
                  type: 'string',
                  operation: 'equals',
                  name: 'filter.operator.equals',
                },
              },
            ],
            combinator: 'or',
          },
          options: {},
        },
      },
    ],
    outputContract: ['true分支', 'false分支'],
    envVars: [],
  },
  {
    name: 'mechanical_hand_execute',
    description: '机械手执行手势动作',
    category: 'OUTPUT',
    inputContract: ['gesture'],
    nodes: [
      {
        name: 'Set - 配置手势参数',
        type: 'n8n-nodes-base.set',
        parameters: {
          values: {
            string: [
              { name: 'handGesture', value: '={{$json.gesture || "default"}}' },
            ],
          },
          options: {},
        },
      },
      {
        name: 'httpRequest - 机械手执行',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          method: 'POST',
          url: '={{$env.ROBOT_HAND_API_URL || "http://robot.local/api/hand/gesture"}}',
          options: { timeout: 60000 },
        },
      },
    ],
    outputContract: ['executeResult'],
    envVars: ['ROBOT_HAND_API_URL'],
  },
  {
    name: 'mechanical_arm_execute',
    description: '机械臂执行动作',
    category: 'OUTPUT',
    inputContract: ['armAction'],
    nodes: [
      {
        name: 'Set - 配置臂部参数',
        type: 'n8n-nodes-base.set',
        parameters: {
          values: {
            string: [{ name: 'action', value: '={{$json.armAction || "default"}}' }],
          },
          options: {},
        },
      },
      {
        name: 'httpRequest - 机械臂执行',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          method: 'POST',
          url: '={{$env.ROBOT_ARM_API_URL || "http://robot.local/api/arm/action"}}',
          options: { timeout: 60000 },
        },
      },
    ],
    outputContract: ['executeResult'],
    envVars: ['ROBOT_ARM_API_URL'],
  },
  {
    name: 'chassis_move',
    description: '底盘移动控制',
    category: 'OUTPUT',
    inputContract: ['direction', 'distance'],
    nodes: [
      {
        name: 'Set - 配置移动参数',
        type: 'n8n-nodes-base.set',
        parameters: {
          values: {
            string: [
              { name: 'moveDirection', value: '={{$json.direction || "forward"}}' },
            ],
            number: [{ name: 'moveDistance', value: '={{$json.distance || 100}}' }],
          },
          options: {},
        },
      },
      {
        name: 'httpRequest - 底盘移动',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          method: 'POST',
          url: '={{$env.ROBOT_BASE_API_URL || "http://robot.local/api/base/move"}}',
          options: { timeout: 60000 },
        },
      },
    ],
    outputContract: ['moveResult'],
    envVars: ['ROBOT_BASE_API_URL'],
  },
  {
    name: 'screen_display',
    description: '屏幕显示内容（emoji/图片/文字）',
    category: 'OUTPUT',
    inputContract: ['displayContent'],
    nodes: [
      {
        name: 'Set - 配置显示参数',
        type: 'n8n-nodes-base.set',
        parameters: {
          values: {
            string: [
              {
                name: 'emoji',
                value: '={{$json.displayContent || $json.emoji || "开心"}}',
              },
            ],
          },
          options: {},
        },
      },
      {
        name: 'httpRequest - 屏幕显示',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          method: 'POST',
          url: '={{$env.SCREEN_EMOJI_API_URL || "http://robot.local/api/screen/emoji"}}',
          options: { timeout: 60000 },
        },
      },
    ],
    outputContract: ['displayResult'],
    envVars: ['SCREEN_EMOJI_API_URL'],
  },
  {
    name: 'tts_speaker_output',
    description: '文本转语音并通过喇叭播放',
    category: 'OUTPUT',
    inputContract: ['text'],
    nodes: [
      {
        name: 'Set - 配置 TTS 参数',
        type: 'n8n-nodes-base.set',
        parameters: {
          values: {
            string: [
              { name: 'TTS_input', value: '={{$json.text || "默认文案"}}' },
              { name: 'audio_name', value: '={{$json.audio_name || "output"}}' },
            ],
          },
          options: {},
        },
      },
      {
        name: 'httpRequest - TTS 生成音频',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          method: 'POST',
          url: '={{$env.TTS_API_URL || "http://ai.local/api/tts"}}',
          options: { timeout: 60000 },
        },
      },
      {
        name: 'Set - 提取音频 URL',
        type: 'n8n-nodes-base.set',
        parameters: {
          values: {
            string: [
              {
                name: 'audioUrl',
                value:
                  '={{$json.audioUrl || $json.url || ($json.data && $json.data.audioUrl) || ""}}',
              },
            ],
          },
          options: {},
        },
      },
      {
        name: 'httpRequest - 喇叭播放',
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          method: 'POST',
          url: '={{$env.SPEAKER_API_URL || "http://robot.local/api/speaker/play"}}',
          options: { timeout: 60000 },
        },
      },
    ],
    outputContract: ['playResult'],
    envVars: ['TTS_API_URL', 'SPEAKER_API_URL'],
  },
];

const loggedUnknownTypes = new Set<string>();

const applyNodeDefaults = (components: WorkflowComponentBase[]): WorkflowComponent[] =>
  components.map((component) => ({
    ...component,
    nodes: component.nodes.map((node) => {
      let resolvedTypeVersion = node.typeVersion ?? getNodeTypeVersion(node.type);
      if (resolvedTypeVersion === undefined) {
        if (!loggedUnknownTypes.has(node.type)) {
          loggedUnknownTypes.add(node.type);
          logger.warn('Workflow components: missing typeVersion mapping', { nodeType: node.type });
        }
        resolvedTypeVersion = 1;
      }
      return {
        ...node,
        typeVersion: resolvedTypeVersion,
      };
    }),
  }));

export const WORKFLOW_COMPONENTS = applyNodeDefaults(WORKFLOW_COMPONENTS_BASE);
