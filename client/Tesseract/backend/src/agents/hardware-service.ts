/**
 * [INPUT]: 依赖 types 的 Intent 与硬件组件定义
 * [OUTPUT]: 对外提供 HardwareService 组件查询与推断能力
 * [POS]: agents 的硬件发现入口，负责意图实体到硬件集合映射
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Intent } from './types';
import {
  HARDWARE_COMPONENT_NAME_ALIASES,
  HARDWARE_COMPONENTS,
  HardwareComponent,
} from './hardware-components';

export class HardwareService {
  async listComponents(): Promise<HardwareComponent[]> {
    return HARDWARE_COMPONENTS;
  }

  async getComponentByName(name: string): Promise<HardwareComponent | null> {
    const normalized = name.trim().toLowerCase();
    const componentId = HARDWARE_COMPONENT_NAME_ALIASES[normalized] ?? normalized;
    return HARDWARE_COMPONENTS.find((component) => component.id === componentId) || null;
  }

  inferComponentsFromIntent(intent: Intent): string[] {
    const components = new Set<string>();
    const entities = intent.entities || {};

    const entries = Object.entries(entities);
    entries.forEach(([key, value]) => {
      const normalizedValue = this.normalizeEntityValue(value);
      if (!normalizedValue) {
        return;
      }

      if (key.includes('gesture') || key.includes('action')) {
        if (
          ['竖中指', '比个V', '比V', '挥手', '握手', '招手', '点赞'].some((action) =>
            normalizedValue.includes(action)
          )
        ) {
          components.add('hand');
        }
      }

      if (key.includes('speech') || key.includes('voice') || normalizedValue.includes('说')) {
        components.add('tts');
        components.add('speaker');
      }

      if (key === 'emotion_source') {
        if (normalizedValue.includes('camera')) {
          components.add('camera');
        }
        if (normalizedValue.includes('microphone')) {
          components.add('microphone');
        }
      }

      if (key.includes('person') || key.includes('face')) {
        components.add('camera');
        components.add('face_net');
      }

      if (key.includes('screen') || normalizedValue.includes('emoji')) {
        components.add('screen');
      }

      if (key.includes('arm')) {
        components.add('hand');
      }

      if (key.includes('chassis')) {
        components.add('wheel');
      }

      if (this.hasWheelAlias(normalizedValue)) {
        components.add('wheel');
      }

      if (key.includes('hardware')) {
        if (normalizedValue.includes('摄像头')) components.add('camera');
        if (normalizedValue.includes('麦克风')) components.add('microphone');
        if (normalizedValue.includes('喇叭')) components.add('speaker');
        if (normalizedValue.includes('机械手')) components.add('hand');
        if (normalizedValue.includes('机械臂')) components.add('hand');
        if (normalizedValue.includes('屏幕')) components.add('screen');
        if (normalizedValue.includes('底盘') || this.hasWheelAlias(normalizedValue)) components.add('wheel');
      }
    });

    const categoryHint = this.normalizeEntityValue(intent.category).toLowerCase();
    if (categoryHint.includes('face') || categoryHint.includes('recogn')) {
      components.add('camera');
      components.add('face_net');
    }
    if (categoryHint.includes('emotion') || categoryHint.includes('sentiment')) {
      components.add('camera');
      components.add('microphone');
      components.add('asr');
      components.add('llm_emo');
      components.add('tts');
      components.add('speaker');
      components.add('screen');
      components.add('hand');
    }
    if (categoryHint.includes('game') || categoryHint.includes('gesture')) {
      components.add('camera');
      components.add('yolo_rps');
      components.add('tts');
      components.add('speaker');
      components.add('hand');
    }
    if (this.hasWheelAlias(categoryHint)) {
      components.add('wheel');
    }

    if (entities.game_type || entities.yolo_gestures) {
      components.add('camera');
      components.add('yolo_rps');
    }
    if (entities.hand_gestures || entities.gesture) {
      components.add('hand');
      components.add('yolo_hand');
    }

    return Array.from(components);
  }

  private normalizeEntityValue(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === 'string' ? item : ''))
        .filter(Boolean)
        .join(' ');
    }
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '';
      }
    }
    return String(value);
  }

  private hasWheelAlias(value: string): boolean {
    return ['底盘', '小车', '麦克纳姆', 'mecanum', 'cart', 'chassis'].some((keyword) =>
      value.includes(keyword)
    );
  }
}
