/**
 * [INPUT]: 无（硬件规范 id 常量）
 * [OUTPUT]: 对外提供 HARDWARE_COMPONENT_IDS、HARDWARE_CAPABILITY_KEYS、HARDWARE_CAPABILITY_IDS 与规范能力 id 类型
 * [POS]: agents 的硬件 id 中枢；统一声明组件 id、能力 key 与 canonical capability id，避免字符串漂移
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const HARDWARE_COMPONENT_IDS = {
  BASE: 'base',
  CAMERA: 'camera',
  MICROPHONE: 'microphone',
  YOLO_RPS: 'yolo_rps',
  YOLO_HAND: 'yolo_hand',
  FACE_NET: 'face_net',
  TTS: 'tts',
  ASR: 'asr',
  LLM: 'llm',
  LLM_EMO: 'llm_emo',
  RAM: 'ram',
  ASSIGN: 'assign',
  HAND: 'hand',
  SPEAKER: 'speaker',
  SCREEN: 'screen',
  WHEEL: 'wheel',
} as const;

export const HARDWARE_CAPABILITY_KEYS = {
  BASE: {
    SCHEDULE_TRIGGER: 'schedule_trigger',
    CONDITIONAL_BRANCH: 'conditional_branch',
    BATCH_LOOP: 'batch_loop',
  },
  CAMERA: {
    SNAPSHOT_INPUT: 'snapshot_input',
  },
  MICROPHONE: {
    AUDIO_INPUT: 'audio_input',
  },
  YOLO_RPS: {
    RPS_GESTURE_RECOGNITION: 'rps_gesture_recognition',
  },
  YOLO_HAND: {
    HAND_GESTURE_RECOGNITION: 'hand_gesture_recognition',
  },
  FACE_NET: {
    FACE_RECOGNITION: 'face_recognition',
  },
  TTS: {
    AUDIO_GENERATION: 'audio_generation',
  },
  ASR: {
    SPEECH_RECOGNITION: 'speech_recognition',
  },
  LLM: {
    PROMPT_REPLY: 'prompt_reply',
  },
  LLM_EMO: {
    EMOTION_CLASSIFICATION: 'emotion_classification',
  },
  RAM: {
    RANDOM_CHOICE: 'random_choice',
  },
  ASSIGN: {
    MEMORY_ASSIGNMENT: 'memory_assignment',
  },
  HAND: {
    GESTURE_EXECUTE: 'gesture_execute',
    ARM_EMOTIVE_MOTION: 'arm_emotive_motion',
  },
  SPEAKER: {
    AUDIO_PLAYBACK: 'audio_playback',
  },
  SCREEN: {
    EMOJI_DISPLAY: 'emoji_display',
  },
  WHEEL: {
    MOVEMENT_EXECUTE: 'movement_execute',
  },
} as const;

function buildCapabilityIds<
  ComponentId extends string,
  CapabilityKeyMap extends Record<string, string>,
>(
  componentId: ComponentId,
  capabilityKeys: CapabilityKeyMap
): { [Key in keyof CapabilityKeyMap]: `${ComponentId}.${CapabilityKeyMap[Key] & string}` } {
  return Object.fromEntries(
    Object.entries(capabilityKeys).map(([key, capabilityKey]) => [
      key,
      `${componentId}.${capabilityKey}`,
    ])
  ) as { [Key in keyof CapabilityKeyMap]: `${ComponentId}.${CapabilityKeyMap[Key] & string}` };
}

export const HARDWARE_CAPABILITY_IDS = {
  BASE: buildCapabilityIds(HARDWARE_COMPONENT_IDS.BASE, HARDWARE_CAPABILITY_KEYS.BASE),
  CAMERA: buildCapabilityIds(HARDWARE_COMPONENT_IDS.CAMERA, HARDWARE_CAPABILITY_KEYS.CAMERA),
  MICROPHONE: buildCapabilityIds(HARDWARE_COMPONENT_IDS.MICROPHONE, HARDWARE_CAPABILITY_KEYS.MICROPHONE),
  YOLO_RPS: buildCapabilityIds(HARDWARE_COMPONENT_IDS.YOLO_RPS, HARDWARE_CAPABILITY_KEYS.YOLO_RPS),
  YOLO_HAND: buildCapabilityIds(HARDWARE_COMPONENT_IDS.YOLO_HAND, HARDWARE_CAPABILITY_KEYS.YOLO_HAND),
  FACE_NET: buildCapabilityIds(HARDWARE_COMPONENT_IDS.FACE_NET, HARDWARE_CAPABILITY_KEYS.FACE_NET),
  TTS: buildCapabilityIds(HARDWARE_COMPONENT_IDS.TTS, HARDWARE_CAPABILITY_KEYS.TTS),
  ASR: buildCapabilityIds(HARDWARE_COMPONENT_IDS.ASR, HARDWARE_CAPABILITY_KEYS.ASR),
  LLM: buildCapabilityIds(HARDWARE_COMPONENT_IDS.LLM, HARDWARE_CAPABILITY_KEYS.LLM),
  LLM_EMO: buildCapabilityIds(HARDWARE_COMPONENT_IDS.LLM_EMO, HARDWARE_CAPABILITY_KEYS.LLM_EMO),
  RAM: buildCapabilityIds(HARDWARE_COMPONENT_IDS.RAM, HARDWARE_CAPABILITY_KEYS.RAM),
  ASSIGN: buildCapabilityIds(HARDWARE_COMPONENT_IDS.ASSIGN, HARDWARE_CAPABILITY_KEYS.ASSIGN),
  HAND: buildCapabilityIds(HARDWARE_COMPONENT_IDS.HAND, HARDWARE_CAPABILITY_KEYS.HAND),
  SPEAKER: buildCapabilityIds(HARDWARE_COMPONENT_IDS.SPEAKER, HARDWARE_CAPABILITY_KEYS.SPEAKER),
  SCREEN: buildCapabilityIds(HARDWARE_COMPONENT_IDS.SCREEN, HARDWARE_CAPABILITY_KEYS.SCREEN),
  WHEEL: buildCapabilityIds(HARDWARE_COMPONENT_IDS.WHEEL, HARDWARE_CAPABILITY_KEYS.WHEEL),
} as const;

export type HardwareComponentId =
  typeof HARDWARE_COMPONENT_IDS[keyof typeof HARDWARE_COMPONENT_IDS];

export type HardwareCapabilityKey =
  {
    [Group in keyof typeof HARDWARE_CAPABILITY_KEYS]:
      (typeof HARDWARE_CAPABILITY_KEYS)[Group][keyof (typeof HARDWARE_CAPABILITY_KEYS)[Group]];
  }[keyof typeof HARDWARE_CAPABILITY_KEYS];

export type CanonicalHardwareCapabilityId =
  {
    [Group in keyof typeof HARDWARE_CAPABILITY_IDS]:
      (typeof HARDWARE_CAPABILITY_IDS)[Group][keyof (typeof HARDWARE_CAPABILITY_IDS)[Group]];
  }[keyof typeof HARDWARE_CAPABILITY_IDS];
