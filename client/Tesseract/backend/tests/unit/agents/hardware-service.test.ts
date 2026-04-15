import { describe, expect, it } from 'vitest';
import { HardwareService } from '../../../src/agents/hardware-service';
import { Intent } from '../../../src/agents/types';

const service = new HardwareService();

describe('HardwareService', () => {
  it('infers components from intent entities', () => {
    const intent: Intent = {
      category: 'face_recognition_action',
      entities: {
        gesture: '竖中指',
        speech_content: '滚',
      },
      confidence: 0.9,
    };

    const components = service.inferComponentsFromIntent(intent);
    expect(components).toContain('hand');
    expect(components).toContain('tts');
    expect(components).toContain('speaker');
    expect(components).toContain('camera');
    expect(components).toContain('face_net');
  });

  it('returns hardware definitions by name', async () => {
    const component = await service.getComponentByName('camera');
    expect(component?.displayName).toBe('摄像头');
  });

  it('handles non-string entity values without crashing', () => {
    const intent: Intent = {
      category: 'custom',
      entities: {
        hardware: ['摄像头', '屏幕'] as unknown as string,
        gesture: { value: '挥手' } as unknown as string,
      },
      confidence: 0.6,
    };

    const components = service.inferComponentsFromIntent(intent);
    expect(components).toContain('camera');
    expect(components).toContain('screen');
    expect(components).toContain('hand');
  });
});
