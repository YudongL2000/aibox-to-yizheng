/**
 * [INPUT]: 依赖 DesktopDigitalTwinStateService 与 window.electronAPI runtime flag mock。
 * [OUTPUT]: 对外提供 renderer-side digital twin state 合并规则测试，锁住 `config_complete` metadata 不会被同场景 hardware_status 覆盖。
 * [POS]: app/services 的数字孪生状态服务测试文件，防止嵌入数字孪生的下发 CTA 被 runtime scene 刷掉。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { DesktopDigitalTwinStateService } from './desktop-digital-twin-state.service';

describe('DesktopDigitalTwinStateService', () => {
  let service: DesktopDigitalTwinStateService;
  let originalElectronApi: any;

  const demoScene = {
    base_model_id: 'device-001',
    models: [
      {
        id: 'device-001',
        url: '/assets/models/device.glb',
      },
      {
        id: 'camera-main',
        url: '/assets/models/camera.glb',
        interface_id: 'port_3',
      },
    ],
  };

  beforeEach(() => {
    originalElectronApi = (window as any).electronAPI;
    (window as any).electronAPI = {
      runtimeFlags: {
        desktopTwinMode: 'flutter-workspace',
      },
      digitalTwin: {
        setScene: jasmine.createSpy('setScene').and.resolveTo({ ok: true }),
        setPreviewState: jasmine.createSpy('setPreviewState').and.resolveTo({ ok: true }),
      },
    };
    service = new DesktopDigitalTwinStateService();
  });

  afterEach(() => {
    (window as any).electronAPI = originalElectronApi;
  });

  it('preserves config_complete metadata when hardware runtime refreshes the same scene', () => {
    service.applyScene({
      sessionId: 'session-1',
      sourcePhase: 'configuring',
      responseType: 'config_complete',
      scene: demoScene,
    });

    const merged = service.applyScene({
      sessionId: null,
      sourcePhase: 'mqtt-runtime',
      responseType: 'hardware_status',
      scene: {
        baseModelId: 'device-001',
        models: [
          {
            id: 'camera-main',
            interfaceId: 'port_3',
          },
          {
            id: 'device-001',
          },
        ],
      },
    }) as Record<string, unknown>;

    expect(merged['responseType']).toBe('config_complete');
    expect(merged['sessionId']).toBe('session-1');
    expect(merged['sourcePhase']).toBe('mqtt-runtime');
  });

  it('does not preserve config_complete metadata when runtime scene identity changes', () => {
    service.applyScene({
      sessionId: 'session-1',
      sourcePhase: 'configuring',
      responseType: 'config_complete',
      scene: demoScene,
    });

    const merged = service.applyScene({
      sessionId: null,
      sourcePhase: 'mqtt-runtime',
      responseType: 'hardware_status',
      scene: {
        base_model_id: 'device-001',
        models: [
          {
            id: 'device-001',
            url: '/assets/models/device.glb',
          },
          {
            id: 'speaker-main',
            url: '/assets/models/speaker.glb',
            interface_id: 'port_5',
          },
        ],
      },
    }) as Record<string, unknown>;

    expect(merged['responseType']).toBe('hardware_status');
    expect(merged['sessionId']).toBeNull();
  });
});
