/**
 * [INPUT]: 依赖 prompts/workflow-components 的 WorkflowComponent 组件描述
 * [OUTPUT]: 对外提供 ComponentSelector 与 ComponentSelection 能力组合结果
 * [POS]: agents 的能力选择器，根据意图与实体输出动态组件装配
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { WorkflowComponent } from './prompts/workflow-components';

export interface ComponentSelection {
  trigger: string;
  inputs: string[];
  processes: string[];
  decisions: string[];
  outputs: string[];
  topology: string;
  minimumNodes: number;
  componentAssembly: string[];
}

type CompositionBucket = 'inputs' | 'processes' | 'decisions' | 'outputs';

type CapabilityRule = {
  when: (intent: string, entities: Record<string, string>) => boolean;
  add: Partial<Record<CompositionBucket, string[]>>;
};

const TRIGGER_KEYWORDS: Record<string, string[]> = {
  schedule_trigger: ['定时', '每天', '每周', '每月', '每隔', '巡航', '巡逻', '循环'],
  webhook_trigger: ['当', '如果', '收到', '触发', '事件', '请求'],
};

const INPUT_KEYWORDS: Record<string, string[]> = {
  camera_input: ['看', '见到', '识别', '检测', '摄像头', '人脸', '手势', '表情'],
  microphone_input: ['听', '说', '语音', '对话', '麦克风', 'asr'],
};

const PROCESS_KEYWORDS: Record<string, string[]> = {
  face_net_recognition: ['人脸', '身份', '认出', '识别人', '谁'],
  yolov8_identify: ['识别人', '认出', 'vision'],
  yolov8_gesture: ['手势', '石头', '剪刀', '布', '猜拳'],
  structbert_emotion: ['情绪', '难过', '开心', '生气', '高兴', '伤心', '共情', '安慰'],
  asr_recognize: ['语音', '听到', '说的', '转写'],
  llm_generate: ['回复', '生成', '回答', '聊天'],
};

const DECISION_KEYWORDS: Record<string, string[]> = {
  single_condition: ['如果', '当', '识别到', '命中'],
  multi_condition_and: ['并且', '同时', '而且', 'and'],
  multi_condition_or: ['或者', '或', 'or'],
};

const OUTPUT_KEYWORDS: Record<string, string[]> = {
  mechanical_hand_execute: ['手势', '中指', 'v', '大拇指', '比', '竖', '挥手'],
  mechanical_arm_execute: ['机械臂', '抓取', '放下', '递', '夹子'],
  chassis_move: ['移动', '前进', '后退', '转向', '巡航'],
  screen_display: ['显示', '屏幕', '表情', '动画', 'emoji'],
  tts_speaker_output: ['说', '播报', '语音', '喇叭', '安慰', '提醒'],
};

const COMPONENT_LABELS: Record<string, string> = {
  schedule_trigger: '定时触发',
  webhook_trigger: 'Webhook触发',
  camera_input: '摄像头抓拍',
  microphone_input: '麦克风录音',
  yolov8_identify: '视觉识别',
  face_net_recognition: '人脸身份识别',
  yolov8_gesture: '手势识别',
  structbert_emotion: '情绪识别',
  asr_recognize: '语音转写',
  llm_generate: 'LLM生成',
  single_condition: 'IF(单条件)',
  multi_condition_and: 'IF(AND)',
  multi_condition_or: 'IF(OR)',
  mechanical_hand_execute: '机械手动作',
  mechanical_arm_execute: '机械臂动作',
  chassis_move: '底盘移动',
  screen_display: '屏幕显示',
  tts_speaker_output: '语音播报',
};

const CAPABILITY_RULES: CapabilityRule[] = [
  {
    when: (intent, entities) =>
      Boolean(entities.person_name || entities.face_profiles) || /老[\u4e00-\u9fa5]{1,2}/.test(intent),
    add: {
      inputs: ['camera_input'],
      processes: ['face_net_recognition'],
      decisions: ['single_condition'],
    },
  },
  {
    when: (intent, entities) =>
      Boolean(entities.game_type || entities.yolo_gestures || entities.hand_gestures) ||
      ['猜拳', '石头剪刀布', '剪刀石头布'].some((keyword) => intent.includes(keyword)),
    add: {
      inputs: ['camera_input'],
      processes: ['yolov8_gesture'],
      decisions: ['multi_condition_and'],
      outputs: ['mechanical_hand_execute', 'screen_display', 'tts_speaker_output'],
    },
  },
  {
    when: (intent, entities) =>
      Boolean(entities.emotion_mode || entities.emotion_source || entities.emotion_labels) ||
      ['情绪', '共情', '安慰', '难过', '开心', '伤心'].some((keyword) => intent.includes(keyword)),
    add: {
      processes: ['structbert_emotion'],
      decisions: ['multi_condition_or'],
      outputs: ['screen_display', 'tts_speaker_output'],
    },
  },
  {
    when: (_intent, entities) => entities.emotion_source === 'microphone',
    add: {
      inputs: ['microphone_input'],
      processes: ['asr_recognize'],
    },
  },
  {
    when: (_intent, entities) => entities.emotion_source === 'camera',
    add: {
      inputs: ['camera_input'],
    },
  },
];

export class ComponentSelector {
  private componentNodeCounts: Map<string, number>;

  constructor(private components: WorkflowComponent[]) {
    this.componentNodeCounts = new Map(
      components.map((component) => [component.name, component.nodes.length])
    );
  }

  select(userIntent: string, entities: Record<string, string>): ComponentSelection {
    const normalized = userIntent.toLowerCase();
    const trigger = this.analyzeTrigger(normalized, entities);
    const inputs = this.matchKeywords(normalized, INPUT_KEYWORDS);
    const processes = this.matchKeywords(normalized, PROCESS_KEYWORDS);
    const decisions = this.analyzeDecisions(normalized);
    const outputs = this.matchKeywords(normalized, OUTPUT_KEYWORDS);

    this.applyCapabilityRules(userIntent, entities, { inputs, processes, decisions, outputs });
    this.ensureInputCoverage(inputs, processes);
    this.ensureOutputCoverage(outputs, entities, normalized);

    const componentAssembly = this.buildAssembly(trigger, inputs, processes, decisions, outputs);

    return {
      trigger,
      inputs,
      processes,
      decisions,
      outputs,
      topology: this.generateTopology({ trigger, inputs, processes, decisions, outputs }),
      minimumNodes: this.calculateMinimumNodes(componentAssembly),
      componentAssembly,
    };
  }

  private analyzeTrigger(normalizedIntent: string, entities: Record<string, string>): string {
    if (entities.schedule_time || this.hasKeyword(normalizedIntent, TRIGGER_KEYWORDS.schedule_trigger)) {
      return 'schedule_trigger';
    }
    if (this.hasKeyword(normalizedIntent, TRIGGER_KEYWORDS.webhook_trigger)) {
      return 'webhook_trigger';
    }
    return 'schedule_trigger';
  }

  private analyzeDecisions(normalizedIntent: string): string[] {
    if (this.hasKeyword(normalizedIntent, DECISION_KEYWORDS.multi_condition_and)) {
      return ['multi_condition_and'];
    }
    if (this.hasKeyword(normalizedIntent, DECISION_KEYWORDS.multi_condition_or)) {
      return ['multi_condition_or'];
    }
    if (this.hasKeyword(normalizedIntent, DECISION_KEYWORDS.single_condition)) {
      return ['single_condition'];
    }
    return [];
  }

  private applyCapabilityRules(
    intent: string,
    entities: Record<string, string>,
    buckets: Record<CompositionBucket, string[]>
  ): void {
    CAPABILITY_RULES.forEach((rule) => {
      if (!rule.when(intent, entities)) {
        return;
      }
      (Object.keys(rule.add) as CompositionBucket[]).forEach((bucket) => {
        const items = rule.add[bucket] ?? [];
        items.forEach((item) => this.pushUnique(buckets[bucket], item));
      });
    });
  }

  private ensureInputCoverage(inputs: string[], processes: string[]): void {
    if (
      processes.some((process) => ['yolov8_identify', 'face_net_recognition', 'yolov8_gesture'].includes(process))
    ) {
      this.pushUnique(inputs, 'camera_input');
    }
    if (processes.includes('asr_recognize')) {
      this.pushUnique(inputs, 'microphone_input');
    }
    if (processes.includes('structbert_emotion') && inputs.length === 0) {
      this.pushUnique(inputs, 'camera_input');
    }
  }

  private ensureOutputCoverage(outputs: string[], entities: Record<string, string>, normalizedIntent: string): void {
    if (entities.gesture || entities.hand_gestures) {
      this.pushUnique(outputs, 'mechanical_hand_execute');
    }
    if (entities.speech_content || this.hasKeyword(normalizedIntent, ['说', '播报', '语音', '喇叭'])) {
      this.pushUnique(outputs, 'tts_speaker_output');
    }
    if (entities.screen_emoji || this.hasKeyword(normalizedIntent, ['屏幕', 'emoji', '显示'])) {
      this.pushUnique(outputs, 'screen_display');
    }
  }

  private buildAssembly(
    trigger: string,
    inputs: string[],
    processes: string[],
    decisions: string[],
    outputs: string[]
  ): string[] {
    const ordered = [trigger, ...inputs, ...processes, ...decisions, ...outputs].filter(Boolean);
    const deduped: string[] = [];
    ordered.forEach((name) => this.pushUnique(deduped, name));
    return deduped;
  }

  private calculateMinimumNodes(componentAssembly: string[]): number {
    const nodeCount = componentAssembly.reduce((total, name) => {
      return total + (this.componentNodeCounts.get(name) ?? 0);
    }, 0);
    return Math.max(nodeCount, 8);
  }

  private generateTopology(selection: {
    trigger: string;
    inputs: string[];
    processes: string[];
    decisions: string[];
    outputs: string[];
  }): string {
    const segments: string[] = [];

    if (selection.trigger) {
      segments.push(this.describeComponent(selection.trigger));
    }
    if (selection.inputs.length > 0) {
      segments.push(selection.inputs.map((name) => this.describeComponent(name)).join(' + '));
    }
    if (selection.processes.length > 0) {
      segments.push(selection.processes.map((name) => this.describeComponent(name)).join(' + '));
    }
    if (selection.decisions.length > 0) {
      segments.push(selection.decisions.map((name) => this.describeComponent(name)).join(' + '));
    }
    if (selection.outputs.length > 0) {
      segments.push(selection.outputs.map((name) => this.describeComponent(name)).join(' + '));
    }

    return segments.join(' → ');
  }

  private describeComponent(name: string): string {
    return COMPONENT_LABELS[name] ?? name;
  }

  private matchKeywords(normalizedIntent: string, keywordMap: Record<string, string[]>): string[] {
    return Object.entries(keywordMap)
      .filter(([, keywords]) => this.hasKeyword(normalizedIntent, keywords))
      .map(([componentName]) => componentName);
  }

  private hasKeyword(normalizedIntent: string, keywords: string[]): boolean {
    return keywords.some((keyword) => normalizedIntent.includes(keyword.toLowerCase()));
  }

  private pushUnique(collection: string[], item: string): void {
    if (!collection.includes(item)) {
      collection.push(item);
    }
  }
}
