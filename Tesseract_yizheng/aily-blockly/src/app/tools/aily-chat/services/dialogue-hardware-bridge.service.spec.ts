/**
 * [INPUT]: 依赖 DialogueHardwareBridgeService 与本地硬件桥 payload。
 * [OUTPUT]: 对外提供桥接层 snapshot 归一化、MimicLaw relay 聚合与 transport chat_id 约束回归测试。
 * [POS]: tools/aily-chat/services 的硬件桥契约测试，锁住 `device_info` -> `connectedComponents + portId` 映射与 MimicLaw transport 边界。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { DialogueHardwareBridgeService } from './dialogue-hardware-bridge.service';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  readonly sent: any[] = [];
  readyState = WebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(public readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  open(): void {
    this.readyState = WebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  send(payload: string): void {
    this.sent.push(JSON.parse(payload));
  }

  emitMessage(payload: Record<string, unknown>): void {
    this.onmessage?.({
      data: JSON.stringify(payload),
    } as MessageEvent);
  }
}

describe('DialogueHardwareBridgeService', () => {
  let service: DialogueHardwareBridgeService;
  let originalWebSocket: typeof WebSocket;
  let originalElectronApi: any;

  beforeEach(() => {
    originalWebSocket = window.WebSocket;
    originalElectronApi = (window as any).electronAPI;
    (window as any).WebSocket = FakeWebSocket;
    (window as any).electronAPI = undefined;
    FakeWebSocket.instances = [];
    service = new DialogueHardwareBridgeService();
  });

  afterEach(() => {
    service.ngOnDestroy();
    (window as any).WebSocket = originalWebSocket;
    (window as any).electronAPI = originalElectronApi;
  });

  it('normalizes snapshot payload into connectedComponents with preserved port ids', () => {
    const event = (service as any).normalizeEvent(JSON.stringify({
      timestamp: '2026-04-01T10:30:00.000Z',
      eventType: 'snapshot',
      device_info: [
        {
          port_id: 'port_2',
          status: 'plug_in',
          device_id: 'hand-001',
          device_type: 'mechanical_hand',
          notes: {
            display_name: '机械手',
            component_id: 'mechanical_hand',
            model_id: 'claw-v1',
          },
        },
        {
          port_id: 'port_7',
          status: 'plug_in',
          device_id: 'cam-001',
          device_type: 'camera',
          notes: {
            display_name: '摄像头',
            component_id: 'camera',
            model_id: 'cam-001',
          },
        },
      ],
    }));

    expect(event).toEqual(jasmine.objectContaining({
      eventType: 'snapshot',
      connectedComponents: [
        jasmine.objectContaining({
          componentId: 'mechanical_hand',
          portId: 'port_2',
          modelId: 'claw-v1',
        }),
        jasmine.objectContaining({
          componentId: 'camera',
          portId: 'port_7',
          modelId: 'cam-001',
        }),
      ],
    }));
  });

  it('parses heartbeat devices when payload uses a JSON string list', () => {
    const event = (service as any).normalizeEvent(JSON.stringify({
      type: 'heartbeat',
      devices: 'cam1,hand1',
      timestamp: '2026-04-07T06:03:22.127Z',
    }));

    expect(event).toEqual(jasmine.objectContaining({
      eventType: 'snapshot',
      connectedComponents: [
        jasmine.objectContaining({
          componentId: 'camera',
          deviceId: 'cam1',
          status: 'connected',
        }),
        jasmine.objectContaining({
          componentId: 'mechanical_hand',
          deviceId: 'hand1',
          status: 'connected',
        }),
      ],
    }));
  });

  it('recognizes mimiclaw heartbeat devices as the phosphor usb bridge', () => {
    const event = (service as any).normalizeEvent(JSON.stringify({
      type: 'heartbeat',
      devices: 'mimiclaw1',
      timestamp: '2026-04-15T00:30:00.000Z',
    }));

    expect(event).toEqual(jasmine.objectContaining({
      eventType: 'snapshot',
      connectedComponents: [
        jasmine.objectContaining({
          componentId: 'mimiclaw',
          deviceId: 'mimiclaw1',
          displayName: '磷虾U盘',
          status: 'connected',
        }),
      ],
    }));
  });

  it('parses heartbeat devices from plain-text log payloads', () => {
    const event = (service as any).normalizeEvent(
      '硬件心跳: connected source=poll | connection=connected | heartbeat=2026-04-07T06:03:22.127Z | deviceCount=2 | devices=cam1,hand1 | message=MQTT 心跳正常，2 个设备在线'
    );

    expect(event).toEqual(jasmine.objectContaining({
      eventType: 'snapshot',
      connectedComponents: [
        jasmine.objectContaining({
          componentId: 'camera',
          deviceId: 'cam1',
        }),
        jasmine.objectContaining({
          componentId: 'mechanical_hand',
          deviceId: 'hand1',
        }),
      ],
    }));
  });

  it('parses all devices when heartbeat logs are wrapped inside a JSON message field', () => {
    const event = (service as any).normalizeEvent(JSON.stringify({
      type: 'heartbeat',
      message:
        'connected source=poll | connection=connected | heartbeat=2026-04-07T06:03:22.127Z | deviceCount=2 | devices=cam1,hand1 | message=MQTT 心跳正常，2 个设备在线',
    }));

    expect(event).toEqual(jasmine.objectContaining({
      eventType: 'snapshot',
      connectedComponents: [
        jasmine.objectContaining({
          componentId: 'camera',
          deviceId: 'cam1',
        }),
        jasmine.objectContaining({
          componentId: 'mechanical_hand',
          deviceId: 'hand1',
        }),
      ],
    }));
  });

  it('parses multiline edge2cloud status blocks into connected components', () => {
    const event = (service as any).normalizeEvent(`
[2026-04-07 15:19:25.953206] ◀ 收到端侧状态:
  主题: qsf/aibox001/edge2cloud
  端侧时间戳: 20536
  设备数量: 1
    - cam: online (cam1) @ /dev/video2 | port=3-1.3 | vid_pid=0BDC:8080
    `);

    expect(event).toEqual(jasmine.objectContaining({
      eventType: 'snapshot',
      connectedComponents: [
        jasmine.objectContaining({
          componentId: 'camera',
          deviceId: 'cam1',
          portId: '3-1.3',
          status: 'connected',
        }),
      ],
    }));
  });

  it('relays MimicLaw chat frames without polluting hardware snapshots', async () => {
    const relayPromise = service.relayChatMessage('你是谁', {
      chatId: 'chat-1',
      idleMs: 5,
      timeoutMs: 200,
    });
    const socket = FakeWebSocket.instances[0];
    socket.open();
    await Promise.resolve();

    expect(socket.sent[0]).toEqual({
      type: 'message',
      content: '你是谁',
      chat_id: 'chat-1',
    });

    socket.emitMessage({
      type: 'response',
      content: 'mimi is working...',
      chat_id: 'chat-1',
    });
    socket.emitMessage({
      type: 'response',
      content: '我是 **MimiClaw**',
      chat_id: 'chat-1',
    });

    const result = await relayPromise;
    expect(result.chatId).toBe('chat-1');
    expect(result.messages.length).toBe(2);
    expect(result.content).toContain('mimi is working...');
    expect(result.content).toContain('我是 **MimiClaw**');
    expect(service.snapshot.components).toEqual([]);
  });

  it('falls back to accumulated progress frames when MimicLaw never emits a final answer', async () => {
    const relayPromise = service.relayChatMessage('你是谁', {
      chatId: 'chat-progress',
      idleMs: 5,
      timeoutMs: 40,
    });
    const socket = FakeWebSocket.instances[0];
    socket.open();
    await Promise.resolve();

    socket.emitMessage({
      type: 'response',
      content: '🐱mimi is working...',
      chat_id: 'chat-progress',
    });

    const result = await relayPromise;
    expect(result.chatId).toBe('chat-progress');
    expect(result.messages.length).toBe(1);
    expect(result.content).toContain('mimi is working');
  });

  it('shortens overlong MimicLaw chat ids before sending transport frames', async () => {
    const requestedChatId = 'dialogue-tesseract-1775037904415-1775037962393';
    const relayPromise = service.relayChatMessage('你是谁', {
      chatId: requestedChatId,
      idleMs: 5,
      timeoutMs: 200,
    });
    const socket = FakeWebSocket.instances[0];
    socket.open();
    await Promise.resolve();

    const transportChatId = socket.sent[0].chat_id;
    expect(transportChatId).not.toBe(requestedChatId);
    expect(typeof transportChatId).toBe('string');
    expect(transportChatId.length).toBeLessThanOrEqual(30);
    expect(transportChatId).toMatch(/^dlg-[a-z0-9]+-[a-z0-9]+$/);

    socket.emitMessage({
      type: 'response',
      content: '我是 **MimiClaw**',
      chat_id: transportChatId,
    });

    const result = await relayPromise;
    expect(result.chatId).toBe(transportChatId);
    expect(result.content).toContain('我是 **MimiClaw**');
  });

  it('reads ws runtime config from electron env before opening the socket', async () => {
    (window as any).electronAPI = {
      env: {
        get: jasmine.createSpy('get').and.callFake((key: string) => {
          const values: Record<string, string> = {
            AILY_DIALOGUE_WS_URL: 'ws://127.0.0.1:19999/',
            AILY_DIALOGUE_RELAY_TIMEOUT_MS: '31000',
            AILY_DIALOGUE_RELAY_IDLE_MS: '1700',
          };
          return Promise.resolve(values[key] || '');
        }),
      },
    };

    await service.ensureConnected();

    expect(FakeWebSocket.instances[0]?.url).toBe('ws://127.0.0.1:19999/');
  });
});
