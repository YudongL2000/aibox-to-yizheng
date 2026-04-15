/**
 * [INPUT]: 依赖 hardware-capability-ids.ts 的规范 capability id 常量
 * [OUTPUT]: 对外提供 LEGACY_CAPABILITY_ALIAS_GROUPS 与 HARDWARE_CAPABILITY_ALIASES
 * [POS]: agents 的旧硬件能力别名边界；只负责把历史 capability id 归一化到场景真相层
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { HARDWARE_CAPABILITY_IDS } from './hardware-capability-ids';

export const LEGACY_CAPABILITY_ALIAS_GROUPS = {
  [HARDWARE_CAPABILITY_IDS.YOLO_HAND.HAND_GESTURE_RECOGNITION]: ['camera.gesture_recognition'],
  [HARDWARE_CAPABILITY_IDS.FACE_NET.FACE_RECOGNITION]: ['camera.face_recognition'],
  [HARDWARE_CAPABILITY_IDS.TTS.AUDIO_GENERATION]: ['speaker.text_to_speech'],
  [HARDWARE_CAPABILITY_IDS.ASR.SPEECH_RECOGNITION]: ['microphone.speech_to_text'],
  [HARDWARE_CAPABILITY_IDS.HAND.GESTURE_EXECUTE]: [
    'mechanical_hand.gesture_middle_finger',
    'mechanical_hand.gesture_v_sign',
    'mechanical_hand.gesture_thumbs_up',
    'mechanical_hand.gesture_wave',
    'mechanical_hand.grasp',
    'mechanical_hand.release',
  ],
  [HARDWARE_CAPABILITY_IDS.HAND.ARM_EMOTIVE_MOTION]: [
    'mechanical_arm.lift',
    'mechanical_arm.lower',
    'mechanical_arm.extend',
    'mechanical_arm.retract',
    'mechanical_arm.rotate',
    'mechanical_arm.preset_action',
  ],
  [HARDWARE_CAPABILITY_IDS.WHEEL.MOVEMENT_EXECUTE]: ['chassis.omnidirectional_movement', 'chassis.rotation'],
} as const;

export const HARDWARE_CAPABILITY_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_CAPABILITY_ALIAS_GROUPS).flatMap(([canonicalId, aliases]) =>
    aliases.map((alias) => [alias, canonicalId] as const)
  )
);
