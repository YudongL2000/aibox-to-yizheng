/**
 * [INPUT]: 依赖本地 Electron `tesseract.hardwareStatus()` 桥与 browser fallback `/api/agent/hardware/status`、`/ws` 事件流、HttpClient 和 LogService。
 * [OUTPUT]: 对外提供 HardwareRuntimeService，统一承接硬件运行时状态、连接/订阅日志、heartbeat/command 日志、数字孪生 scene 同步（内容去重，仅组件变化时触发 IPC）与连接态快照。
 * [POS]: services 层的硬件真相源，被 main-window 顶栏、底部日志面板与数字孪生 Electron scene cache 共同消费；桌面端优先走本地 Tesseract runtime，不再误打远端 API。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { API } from '../configs/api.config';
import { LogService } from './log.service';
import { DesktopDigitalTwinStateService } from './desktop-digital-twin-state.service';

export type HardwareRuntimeTransportState = 'idle' | 'connecting' | 'connected' | 'degraded' | 'error';

export interface HardwareRuntimeHeartbeatDevice {
  deviceType: string;
  deviceStatus: string;
  deviceName: string;
  devicePath: string;
  devicePort?: string;
  interfaceId?: string;
  vidPid?: string;
  raw?: Record<string, unknown>;
}

export interface HardwareRuntimeHeartbeatRecord {
  source?: string;
  topic?: string;
  requestId?: string | null;
  timestamp?: string;
  edgeTimestamp?: string | number | null;
  deviceCount?: number;
  devices?: HardwareRuntimeHeartbeatDevice[];
  raw?: Record<string, unknown>;
}

export interface HardwareRuntimeCommandReceipt {
  kind: string;
  requestId: string;
  topic: string;
  payload: Record<string, unknown>;
  publishedAt: string;
  status?: 'queued' | 'sent' | 'acknowledged' | 'failed' | string;
  response?: Record<string, unknown> | null;
  responseAt?: string | null;
}

export interface HardwareRuntimeStatus {
  enabled?: boolean;
  connectionState?: 'disabled' | 'connecting' | 'connected' | 'disconnected' | 'error' | string;
  broker?: string;
  port?: number;
  deviceId?: string;
  topicSend?: string;
  topicRecv?: string;
  keepalive?: number;
  lastConnectedAt?: string | null;
  lastDisconnectedAt?: string | null;
  lastHeartbeatAt?: string | null;
  lastCommandAt?: string | null;
  lastError?: string | null;
  latestHeartbeat?: HardwareRuntimeHeartbeatRecord | null;
  dialogueHardware?: Record<string, unknown> | null;
  digitalTwinScene?: Record<string, unknown> | null;
  lastCommand?: HardwareRuntimeCommandReceipt | null;
  message?: string;
}

export interface HardwareRuntimeSnapshot {
  hardware: HardwareRuntimeStatus | null;
  transport: {
    http: boolean;
    ws: boolean;
  };
  transportState: HardwareRuntimeTransportState;
  lastSyncAt: string | null;
  lastError: string | null;
  source: 'init' | 'http' | 'ws' | 'socket-open' | 'socket-close' | 'socket-error' | 'poll';
}

interface HardwareRuntimeHttpEnvelope {
  success?: boolean;
  data?: HardwareRuntimeStatus | null;
  hardware?: HardwareRuntimeStatus | null;
  status?: HardwareRuntimeStatus | null;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class HardwareRuntimeService implements OnDestroy {
  private readonly pollIntervalMs = 5000;
  private readonly reconnectDelayMs = 4000;
  private readonly statusSubject = new BehaviorSubject<HardwareRuntimeSnapshot>(
    this.createInitialSnapshot(),
  );
  private started = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private socket: WebSocket | null = null;
  private lastHeartbeatKey = '';
  private lastCommandKey = '';
  private lastBrokerKey = '';
  private lastSceneSyncKey = '';
  private lastFailureKey = '';

  readonly status$ = this.statusSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly logService: LogService,
    private readonly desktopDigitalTwinState: DesktopDigitalTwinStateService,
  ) {}

  get snapshot(): HardwareRuntimeSnapshot {
    return this.statusSubject.value;
  }

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    void this.refreshHardwareStatus('init');
    if (!this.shouldUseLocalTesseractBridge()) {
      this.connectWebSocket();
    }
    this.pollTimer = setInterval(() => {
      void this.refreshHardwareStatus('poll');
    }, this.pollIntervalMs);
  }

  stop(): void {
    this.started = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      try {
        this.socket.close();
      } catch (_) {
        // 关闭失败不影响状态释放。
      }
      this.socket = null;
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private createInitialSnapshot(): HardwareRuntimeSnapshot {
    return {
      hardware: null,
      transport: {
        http: false,
        ws: false,
      },
      transportState: 'connecting',
      lastSyncAt: null,
      lastError: null,
      source: 'init',
    };
  }

  private async refreshHardwareStatus(source: HardwareRuntimeSnapshot['source']): Promise<void> {
    try {
      if (this.shouldUseLocalTesseractBridge()) {
        const response = await window.electronAPI.tesseract.hardwareStatus();
        this.ingestHardwareStatus(this.extractHardwareStatus(response), source, {
          http: true,
        });
        return;
      }

      const response = await firstValueFrom(
        this.http.get<HardwareRuntimeHttpEnvelope>(this.resolveHardwareStatusUrl()),
      );
      this.ingestHardwareStatus(this.extractHardwareStatus(response), source, {
        http: true,
      });
    } catch (error) {
      this.updateFailure('http', error, source);
    }
  }

  private connectWebSocket(): void {
    if (typeof WebSocket === 'undefined') {
      this.updateFailure('ws', new Error('WebSocket 不可用'), 'socket-error');
      return;
    }

    if (this.socket &&
        (this.socket.readyState === WebSocket.OPEN ||
          this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.socket = new WebSocket(this.resolveWebSocketUrl());
    } catch (error) {
      this.updateFailure('ws', error, 'socket-error');
      return;
    }

    this.socket.onopen = () => {
      this.ingestTransportState({ ws: true }, 'socket-open');
      void this.refreshHardwareStatus('socket-open');
    };

    this.socket.onmessage = (event) => {
      const payload = this.parseSocketMessage(event.data);
      if (!payload) {
        return;
      }

      if (payload.type === 'hardware_status') {
        this.ingestHardwareStatus(this.extractHardwareStatus(payload), 'ws', {
          ws: true,
        });
        return;
      }

      if (payload.type === 'hardware_response') {
        this.logHardwareCommand(
          this.normalizeCommandReceipt(payload.action, payload.data),
          'ws',
        );
        return;
      }

      if (payload.type === 'runtime_status') {
        this.ingestTransportState({ ws: true }, 'ws');
      }
    };

    this.socket.onerror = () => {
      this.updateFailure('ws', new Error('WebSocket 连接异常'), 'socket-error');
    };

    this.socket.onclose = () => {
      this.ingestTransportState({ ws: false }, 'socket-close');
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (!this.started || this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.started) {
        return;
      }
      this.connectWebSocket();
    }, this.reconnectDelayMs);
  }

  private ingestHardwareStatus(
    hardware: HardwareRuntimeStatus | null,
    source: HardwareRuntimeSnapshot['source'],
    transportPatch: Partial<HardwareRuntimeSnapshot['transport']> = {},
  ): void {
    const current = this.snapshot;
    const nextHardware = hardware ? this.normalizeHardwareStatus(hardware) : current.hardware;
    this.lastFailureKey = '';
    const nextSnapshot = this.reduceSnapshot(current, {
      hardware: nextHardware,
      transport: {
        ...current.transport,
        ...transportPatch,
      },
      lastSyncAt: new Date().toISOString(),
      lastError: nextHardware?.lastError ?? current.lastError,
      source,
    });

    this.statusSubject.next(nextSnapshot);
    this.logBrokerConnection(nextSnapshot, source);
    this.logHeartbeat(nextSnapshot, source);
    this.logHardwareCommand(nextSnapshot.hardware?.lastCommand ?? null, source);
    void this.syncDigitalTwinScene(nextSnapshot, source);
  }

  private ingestTransportState(
    transportPatch: Partial<HardwareRuntimeSnapshot['transport']>,
    source: HardwareRuntimeSnapshot['source'],
  ): void {
    const current = this.snapshot;
    const hasSuccessTransport = Object.values(transportPatch).some((value) => value === true);
    if (hasSuccessTransport) {
      this.lastFailureKey = '';
    }
    this.statusSubject.next(
      this.reduceSnapshot(current, {
        transport: {
          ...current.transport,
          ...transportPatch,
        },
        lastSyncAt: new Date().toISOString(),
        source,
      }),
    );
  }

  private updateFailure(
    channel: 'http' | 'ws',
    error: unknown,
    source: HardwareRuntimeSnapshot['source'],
  ): void {
    const errorText = this.formatError(error);
    const failureKey = [channel, source, errorText].join('|');
    const current = this.snapshot;
    this.statusSubject.next(
      this.reduceSnapshot(current, {
        transport: {
          ...current.transport,
          [channel]: false,
        },
        lastError: errorText,
        lastSyncAt: new Date().toISOString(),
        source,
      }),
    );

    if (this.lastFailureKey === failureKey) {
      return;
    }
    this.lastFailureKey = failureKey;

    this.logService.update({
      title: `硬件运行时 · ${channel.toUpperCase()} 失败`,
      detail: errorText,
      state: 'error',
    });

    if (channel === 'ws') {
      this.scheduleReconnect();
    }
  }

  private logHeartbeat(
    snapshot: HardwareRuntimeSnapshot,
    source: HardwareRuntimeSnapshot['source'],
  ): void {
    const hardware = snapshot.hardware;
    if (!hardware) {
      return;
    }

    const heartbeatKey = this.buildHeartbeatKey(hardware);
    if (heartbeatKey === this.lastHeartbeatKey) {
      return;
    }
    this.lastHeartbeatKey = heartbeatKey;

    const deviceSummary = this.buildDeviceSummary(hardware.latestHeartbeat?.devices ?? []);
    const statusLabel = this.normalizeConnectionState(hardware.connectionState);
    const detailParts = [
      `source=${source}`,
      `connection=${statusLabel}`,
      `heartbeat=${hardware.lastHeartbeatAt ?? hardware.latestHeartbeat?.timestamp ?? 'n/a'}`,
      `deviceCount=${hardware.latestHeartbeat?.deviceCount ?? 0}`,
    ];
    if (deviceSummary) {
      detailParts.push(`devices=${deviceSummary}`);
    }
    if (hardware.message) {
      detailParts.push(`message=${hardware.message}`);
    }

    this.logService.update({
      title: `硬件心跳 · ${statusLabel}`,
      detail: detailParts.join(' | '),
      state: statusLabel === 'error' || statusLabel === 'disconnected' ? 'warn' : 'info',
    });
  }

  private logBrokerConnection(
    snapshot: HardwareRuntimeSnapshot,
    source: HardwareRuntimeSnapshot['source'],
  ): void {
    const hardware = snapshot.hardware;
    if (!hardware) {
      return;
    }

    const statusLabel = this.normalizeConnectionState(hardware.connectionState);
    const brokerKey = [
      source,
      statusLabel,
      hardware.broker ?? 'n/a',
      hardware.port ?? 'n/a',
      hardware.topicRecv ?? 'n/a',
      hardware.topicSend ?? 'n/a',
    ].join('|');

    if (brokerKey === this.lastBrokerKey) {
      return;
    }
    this.lastBrokerKey = brokerKey;

    if (statusLabel === 'connected') {
      this.logService.update({
        title: 'MQTT 连接已建立',
        detail: [
          `source=${source}`,
          `broker=${hardware.broker ?? 'n/a'}:${hardware.port ?? 'n/a'}`,
          `recv=${hardware.topicRecv ?? 'n/a'}`,
          `send=${hardware.topicSend ?? 'n/a'}`,
          `deviceId=${hardware.deviceId ?? 'n/a'}`,
        ].join(' | '),
        state: 'info',
      });
      return;
    }

    if (statusLabel === 'connecting' || statusLabel === 'disconnected' || statusLabel === 'error') {
      this.logService.update({
        title: 'MQTT 连接状态',
        detail: [
          `source=${source}`,
          `state=${statusLabel}`,
          `broker=${hardware.broker ?? 'n/a'}:${hardware.port ?? 'n/a'}`,
          hardware.lastError ? `error=${hardware.lastError}` : null,
        ].filter(Boolean).join(' | '),
        state: statusLabel === 'error' ? 'error' : 'warn',
      });
    }
  }

  private logHardwareCommand(
    command: HardwareRuntimeCommandReceipt | null,
    source: HardwareRuntimeSnapshot['source'],
  ): void {
    if (!command) {
      return;
    }

    const commandKey = this.buildCommandKey(command);
    if (commandKey === this.lastCommandKey) {
      return;
    }
    this.lastCommandKey = commandKey;

    const detailParts = [
      `source=${source}`,
      `requestId=${command.requestId}`,
      `topic=${command.topic}`,
      `status=${command.status ?? 'unknown'}`,
      `publishedAt=${command.publishedAt}`,
    ];
    if (command.responseAt) {
      detailParts.push(`responseAt=${command.responseAt}`);
    }
    if (command.response) {
      detailParts.push(`response=${this.truncate(JSON.stringify(command.response), 200)}`);
    }

    this.logService.update({
      title: `云侧命令 · ${command.kind}`,
      detail: detailParts.join(' | '),
      state: command.status === 'failed' ? 'error' : 'info',
    });
  }

  private async syncDigitalTwinScene(
    snapshot: HardwareRuntimeSnapshot,
    source: HardwareRuntimeSnapshot['source'],
  ): Promise<void> {
    const scene = snapshot.hardware?.digitalTwinScene ?? null;
    const sceneSummary = this.summarizeDigitalTwinScene(scene);
    // 仅以场景内容作为去重键，心跳时间戳与 source 变化不触发重渲染
    const syncKey = JSON.stringify({
      baseModelId: sceneSummary.baseModelId,
      modelCount: sceneSummary.modelCount,
      modelIds: sceneSummary.modelIds,
    });
    if (syncKey === this.lastSceneSyncKey) {
      return;
    }
    this.lastSceneSyncKey = syncKey;

    console.info('[HardwareRuntimeService][DigitalTwin] syncing hardware runtime scene', {
      source,
      transportState: snapshot.transportState,
      sceneSummary,
    });

    try {
      const setSceneResult = this.desktopDigitalTwinState.applyScene({
        sessionId: null,
        projectPath: null,
        sourcePhase: 'mqtt-runtime',
        responseType: 'hardware_status',
        scene,
      });

      console.info('[HardwareRuntimeService][DigitalTwin] scene cached in electron', {
        source,
        sceneSummary,
        setSceneResult,
      });

      this.logService.update({
        title: '数字孪生 · 场景同步',
        detail: [
          `source=${source}`,
          `transport=${snapshot.transportState}`,
          `baseModelId=${sceneSummary.baseModelId ?? 'n/a'}`,
          `modelCount=${sceneSummary.modelCount}`,
          `modelIds=${sceneSummary.modelIds.join(',') || 'none'}`,
          `heartbeat=${snapshot.hardware?.lastHeartbeatAt ?? snapshot.hardware?.latestHeartbeat?.timestamp ?? 'n/a'}`,
        ].join(' | '),
        state: 'info',
      });
    } catch (error) {
      const errorText = this.formatError(error);
      console.warn('[HardwareRuntimeService][DigitalTwin] sync failed:', error);
      this.logService.update({
        title: '数字孪生 · 场景同步失败',
        detail: [
          `source=${source}`,
          `transport=${snapshot.transportState}`,
          `error=${errorText}`,
        ].join(' | '),
        state: 'error',
      });
    }
  }

  private reduceSnapshot(
    current: HardwareRuntimeSnapshot,
    patch: Partial<HardwareRuntimeSnapshot>,
  ): HardwareRuntimeSnapshot {
    const hardware = patch.hardware ?? current.hardware;
    const transport = patch.transport ?? current.transport;
    return {
      hardware,
      transport,
      transportState: patch.transportState ?? this.resolveTransportState(hardware, transport),
      lastSyncAt: patch.lastSyncAt ?? current.lastSyncAt,
      lastError: patch.lastError ?? current.lastError,
      source: patch.source ?? current.source,
    };
  }

  private resolveTransportState(
    hardware: HardwareRuntimeStatus | null,
    transport: HardwareRuntimeSnapshot['transport'],
  ): HardwareRuntimeTransportState {
    const backendState = this.normalizeConnectionState(hardware?.connectionState);
    if (backendState === 'error') {
      return 'error';
    }
    if (backendState === 'disconnected') {
      return transport.http || transport.ws ? 'degraded' : 'error';
    }
    if (backendState === 'connected') {
      return 'connected';
    }
    if (backendState === 'connecting') {
      return 'connecting';
    }
    if (backendState === 'disabled') {
      return 'idle';
    }
    if (transport.ws || transport.http) {
      return transport.ws ? 'connected' : 'degraded';
    }
    return 'connecting';
  }

  private shouldUseLocalTesseractBridge(): boolean {
    return Boolean(window?.electronAPI?.tesseract?.hardwareStatus);
  }

  private normalizeConnectionState(
    state: HardwareRuntimeStatus['connectionState'],
  ): HardwareRuntimeTransportState | HardwareRuntimeStatus['connectionState'] {
    if (state === 'connected' ||
        state === 'connecting' ||
        state === 'disconnected' ||
        state === 'error' ||
        state === 'disabled') {
      return state;
    }
    return 'connecting';
  }

  private normalizeHardwareStatus(
    hardware: HardwareRuntimeStatus,
  ): HardwareRuntimeStatus {
    return {
      ...hardware,
      latestHeartbeat: hardware.latestHeartbeat
        ? {
            ...hardware.latestHeartbeat,
            devices: Array.isArray(hardware.latestHeartbeat.devices)
              ? hardware.latestHeartbeat.devices.map((device) => ({ ...device }))
              : [],
            raw: hardware.latestHeartbeat.raw ? { ...hardware.latestHeartbeat.raw } : undefined,
          }
        : null,
      lastCommand: hardware.lastCommand
        ? {
            ...hardware.lastCommand,
            payload: { ...hardware.lastCommand.payload },
            response: hardware.lastCommand.response
              ? { ...hardware.lastCommand.response }
              : hardware.lastCommand.response,
          }
        : null,
      dialogueHardware: hardware.dialogueHardware
        ? { ...hardware.dialogueHardware }
        : hardware.dialogueHardware,
      digitalTwinScene: hardware.digitalTwinScene
        ? { ...hardware.digitalTwinScene }
        : hardware.digitalTwinScene,
    };
  }

  private summarizeDigitalTwinScene(scene: Record<string, unknown> | null) {
    const models = Array.isArray(scene?.['models']) ? (scene?.['models'] as Array<Record<string, unknown>>) : [];
    return {
      baseModelId: (scene?.['base_model_id'] as string | null | undefined)
        ?? (scene?.['baseModelId'] as string | null | undefined)
        ?? null,
      modelCount: models.length,
      modelIds: models
        .map((item) => typeof item?.['id'] === 'string' ? item['id'] : null)
        .filter((id): id is string => Boolean(id))
        .slice(0, 8),
    };
  }

  private extractHardwareStatus(payload: HardwareRuntimeHttpEnvelope | Record<string, unknown> | null): HardwareRuntimeStatus | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const envelope = payload as HardwareRuntimeHttpEnvelope & Record<string, unknown>;
    if (envelope.data && typeof envelope.data === 'object') {
      return envelope.data as HardwareRuntimeStatus;
    }
    if (envelope.hardware && typeof envelope.hardware === 'object') {
      return envelope.hardware as HardwareRuntimeStatus;
    }
    if (envelope.status && typeof envelope.status === 'object') {
      return envelope.status as HardwareRuntimeStatus;
    }
    if (
      'connectionState' in envelope ||
      'lastHeartbeatAt' in envelope ||
      'lastCommandAt' in envelope
    ) {
      return envelope as HardwareRuntimeStatus;
    }
    return null;
  }

  private normalizeCommandReceipt(
    kind: string,
    raw: unknown,
  ): HardwareRuntimeCommandReceipt | null {
    if (!kind || !raw || typeof raw !== 'object') {
      return null;
    }

    const payload = raw as Record<string, unknown>;
    const receipt = payload as Partial<HardwareRuntimeCommandReceipt>;
    const requestId = this.readString(receipt.requestId ?? payload['requestId'] ?? payload['request_id']);
    const topic = this.readString(receipt.topic ?? payload['topic']) ?? 'hardware/runtime';
    if (!requestId) {
      return {
        kind,
        requestId: this.readString(payload['request_id']) ?? `${kind}-${Date.now()}`,
        topic,
        payload: this.normalizeRecord(payload) ?? {},
        publishedAt: this.readString(receipt.publishedAt ?? payload['publishedAt']) ?? new Date().toISOString(),
        status: this.readString(receipt.status ?? payload['status']) ?? 'acknowledged',
        response: this.normalizeRecord(receipt.response ?? payload['response']),
        responseAt: this.readString(receipt.responseAt ?? payload['responseAt']) ?? null,
      };
    }

    return {
      kind,
      requestId,
      topic,
      payload: this.normalizeRecord(receipt.payload ?? payload['payload'] ?? payload) ?? {},
      publishedAt: this.readString(receipt.publishedAt ?? payload['publishedAt']) ?? new Date().toISOString(),
      status: this.readString(receipt.status ?? payload['status']) ?? 'acknowledged',
      response: this.normalizeRecord(receipt.response ?? payload['response']),
      responseAt: this.readString(receipt.responseAt ?? payload['responseAt']) ?? null,
    };
  }

  private parseSocketMessage(raw: unknown): { type?: string; action?: string; data?: unknown } | null {
    if (typeof raw === 'string') {
      try {
        return this.parseSocketMessage(JSON.parse(raw));
      } catch (_) {
        return null;
      }
    }

    if (!raw || typeof raw !== 'object') {
      return null;
    }

    return raw as { type?: string; action?: string; data?: unknown };
  }

  private resolveHardwareStatusUrl(): string {
    const url = new URL(API.startSession);
    url.pathname = '/api/agent/hardware/status';
    url.search = '';
    url.hash = '';
    return url.toString();
  }

  private resolveWebSocketUrl(): string {
    const url = new URL(API.startSession);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws';
    url.search = '';
    url.hash = '';
    return url.toString();
  }

  private buildHeartbeatKey(hardware: HardwareRuntimeStatus): string {
    const heartbeat = hardware.latestHeartbeat;
    return [
      hardware.connectionState ?? 'unknown',
      hardware.lastHeartbeatAt ?? heartbeat?.timestamp ?? 'n/a',
      heartbeat?.requestId ?? 'n/a',
      heartbeat?.deviceCount ?? 0,
    ].join('|');
  }

  private buildCommandKey(command: HardwareRuntimeCommandReceipt): string {
    return [
      command.kind,
      command.requestId,
      command.status ?? 'n/a',
      command.responseAt ?? 'n/a',
    ].join('|');
  }

  private buildDeviceSummary(devices: HardwareRuntimeHeartbeatDevice[]): string {
    return devices
      .slice(0, 4)
      .map((device) => device.deviceName || device.deviceType || device.interfaceId || device.devicePort || 'device')
      .join(', ');
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength - 1)}…`;
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    try {
      return JSON.stringify(error);
    } catch (_) {
      return '未知硬件运行时错误';
    }
  }

  private normalizeRecord(raw: unknown): Record<string, unknown> | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return null;
    }
    return { ...(raw as Record<string, unknown>) };
  }

  private readString(raw: unknown): string | null {
    if (typeof raw !== 'string') {
      return null;
    }
    const value = raw.trim();
    return value.length > 0 ? value : null;
  }
}
