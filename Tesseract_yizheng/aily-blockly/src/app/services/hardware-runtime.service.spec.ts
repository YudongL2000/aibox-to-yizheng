/**
 * [INPUT]: 依赖 HardwareRuntimeService、HttpClientTestingModule、LogService 与 fake WebSocket。
 * [OUTPUT]: 对外提供硬件运行时 service 回归测试，锁住本地 IPC 优先级、HTTP fallback、WS 命令回包与 heartbeat/command 日志写入。
 * [POS]: app/services 的硬件运行时测试文件，防止前端把状态流重新散成组件私有逻辑。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HardwareRuntimeService, HardwareRuntimeStatus } from './hardware-runtime.service';
import { LogService } from './log.service';
import { API } from '../configs/api.config';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readonly url: string;
  readyState = FakeWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  emitMessage(payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent);
  }
}

describe('HardwareRuntimeService', () => {
  let service: HardwareRuntimeService;
  let httpMock: HttpTestingController;
  let logService: LogService;
  let originalWebSocket: typeof WebSocket;
  let originalElectronApi: any;
  let digitalTwinSetScene: jasmine.Spy;
  let hardwareStatusBridge: jasmine.Spy;

  const hardwareUrl = (): string => {
    const url = new URL(API.startSession);
    url.pathname = '/api/agent/hardware/status';
    url.search = '';
    url.hash = '';
    return url.toString();
  };

  beforeEach(() => {
    (window as any).env = {
      get: () => '',
    };
    originalElectronApi = (window as any).electronAPI;
    hardwareStatusBridge = jasmine.createSpy('hardwareStatus');
    digitalTwinSetScene = jasmine.createSpy('setScene').and.resolveTo({ ok: true, revision: 1 });
    (window as any).electronAPI = {
      tesseract: {
        hardwareStatus: hardwareStatusBridge,
      },
      digitalTwin: {
        setScene: digitalTwinSetScene,
      },
    };
    originalWebSocket = window.WebSocket;
    (window as any).WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    FakeWebSocket.instances = [];

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [HardwareRuntimeService, LogService],
    });

    service = TestBed.inject(HardwareRuntimeService);
    httpMock = TestBed.inject(HttpTestingController);
    logService = TestBed.inject(LogService);
  });

  afterEach(() => {
    service.stop();
    httpMock.verify();
    (window as any).WebSocket = originalWebSocket;
    (window as any).electronAPI = originalElectronApi;
  });

  it('publishes hardware heartbeat from HTTP status and logs it once', async () => {
    delete (window as any).electronAPI?.tesseract;
    const status: HardwareRuntimeStatus = {
      connectionState: 'connected',
      deviceId: 'mini-claw-001',
      lastHeartbeatAt: '2026-04-05T10:00:00.000Z',
      latestHeartbeat: {
        timestamp: '2026-04-05T10:00:00.000Z',
        deviceCount: 2,
        devices: [
          {
            deviceType: 'microphone',
            deviceStatus: 'online',
            deviceName: 'mic',
            devicePath: '/dev/mic0',
          },
          {
            deviceType: 'speaker',
            deviceStatus: 'online',
            deviceName: 'speaker',
            devicePath: '/dev/spk0',
          },
        ],
      },
      message: 'heartbeat ok',
    };

    service.start();

    const request = httpMock.expectOne(hardwareUrl());
    request.flush({
      success: true,
      data: status,
    });

    await Promise.resolve();

    expect(service.snapshot.hardware?.deviceId).toBe('mini-claw-001');
    expect(service.snapshot.hardware?.latestHeartbeat?.deviceCount).toBe(2);
    expect(logService.list.length).toBe(1);
    expect(logService.list[0].title).toContain('硬件心跳');
    expect(logService.list[0].detail).toContain('deviceCount=2');
    expect(logService.list[0].detail).toContain('mic');
  });

  it('prefers local tesseract hardware bridge over remote HTTP and logs mqtt broker details', async () => {
    hardwareStatusBridge.and.resolveTo({
      success: true,
      data: {
        connectionState: 'connected',
        broker: '127.0.0.1',
        port: 1883,
        deviceId: 'aibox001',
        topicSend: 'qsf/aibox001/cloud2edge',
        topicRecv: 'qsf/aibox001/edge2cloud',
        latestHeartbeat: {
          timestamp: '2026-04-06T02:02:03.000Z',
          deviceCount: 1,
          devices: [],
        },
        digitalTwinScene: {
          base_model_id: 'device-001',
          models: [],
        },
      } satisfies HardwareRuntimeStatus,
    });

    service.start();
    await Promise.resolve();
    await Promise.resolve();

    httpMock.expectNone(hardwareUrl());
    expect(hardwareStatusBridge).toHaveBeenCalled();
    expect(logService.list.some((entry) => entry.title === 'MQTT 连接已建立')).toBeTrue();
    expect(logService.list.some((entry) => entry.detail?.includes('broker=127.0.0.1:1883'))).toBeTrue();
  });

  it('pushes canonical digital twin scene into electron cache when hardware status changes', async () => {
    delete (window as any).electronAPI?.tesseract;
    const scene = {
      base_model_id: 'device-001',
      models: [
        {
          id: 'cam-main',
          asset: 'cam.glb',
          port_id: 'port_3',
        },
      ],
    };

    service.start();

    const request = httpMock.expectOne(hardwareUrl());
    request.flush({
      success: true,
      data: {
        connectionState: 'connected',
        lastHeartbeatAt: '2026-04-05T10:00:00.000Z',
        latestHeartbeat: {
          timestamp: '2026-04-05T10:00:00.000Z',
          deviceCount: 1,
          devices: [],
        },
        digitalTwinScene: scene,
      } satisfies HardwareRuntimeStatus,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(digitalTwinSetScene).toHaveBeenCalledWith({
      sessionId: null,
      projectPath: null,
      sourcePhase: 'mqtt-runtime',
      responseType: 'hardware_status',
      scene,
    });
    expect(logService.list.some((entry) => entry.title?.includes('数字孪生 · 场景同步'))).toBeTrue();
  });

  it('writes cloud command receipts into the log stream', async () => {
    delete (window as any).electronAPI?.tesseract;
    service.start();

    const request = httpMock.expectOne(hardwareUrl());
    request.flush({
      success: true,
      data: {
        connectionState: 'connected',
        lastHeartbeatAt: '2026-04-05T10:00:00.000Z',
        latestHeartbeat: {
          timestamp: '2026-04-05T10:00:00.000Z',
          deviceCount: 1,
          devices: [],
        },
      },
    });

    const socket = FakeWebSocket.instances[0];
    socket.emitMessage({
      type: 'hardware_response',
      action: 'microphone_open',
      data: {
        kind: 'microphone_open',
        requestId: 'req-100',
        topic: 'hardware/runtime',
        payload: {
          device_type: 'microphone',
          cmd: 'open',
        },
        publishedAt: '2026-04-05T10:01:00.000Z',
        status: 'acknowledged',
      },
    });

    expect(logService.list.some((entry) => entry.title?.includes('云侧命令'))).toBeTrue();
    const lastEntry = logService.list[logService.list.length - 1];
    expect(lastEntry.detail).toContain('requestId=req-100');
    expect(lastEntry.detail).toContain('microphone_open');
  });
});
