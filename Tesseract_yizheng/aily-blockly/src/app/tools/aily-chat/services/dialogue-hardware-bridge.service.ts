/**
 * [INPUT]: 依赖浏览器 WebSocket 与 Mimiclaw/MiniClaw 本地桥接消息。
 * [OUTPUT]: 对外提供 DialogueHardwareBridgeService，负责建立本地硬件桥连接、标准化插拔事件（支持 JSON、plain-text heartbeat devices 列表与多行端侧状态块）、代理 MimicLaw 对话并转发物理 cue。
 * [POS]: tools/aily-chat/services 的对话模式桥接入口层，只产出标准事件/relay 结果，不做业务分支判断；缺失 WS 配置时显式报错，不再隐式回退固定地址。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import {
  DialogueComponentStatus,
  DialogueHardwareComponent,
  DialogueHardwareEvent,
  DialogueHardwareEventType,
  DialoguePhysicalCue,
  DialogueRelayMessage,
  DialogueRelayResult,
} from './tesseract-dialogue.models';

const DEFAULT_DIALOGUE_WS_URL = '';
const DEFAULT_RELAY_TIMEOUT_MS = 45000;
const DEFAULT_RELAY_IDLE_MS = 1500;
const MAX_SAFE_RELAY_CHAT_ID_LENGTH = 30;
const RELAY_CHAT_ID_PREFIX = 'dlg';
const DIALOGUE_WS_URL_ENV_KEY = 'AILY_DIALOGUE_WS_URL';
const DIALOGUE_RELAY_TIMEOUT_ENV_KEY = 'AILY_DIALOGUE_RELAY_TIMEOUT_MS';
const DIALOGUE_RELAY_IDLE_ENV_KEY = 'AILY_DIALOGUE_RELAY_IDLE_MS';
const DIALOGUE_WS_URL_DEBUG_KEY = 'aily.dialogue.wsUrl';
const DIALOGUE_RELAY_TIMEOUT_DEBUG_KEY = 'aily.dialogue.relayTimeoutMs';
const DIALOGUE_RELAY_IDLE_DEBUG_KEY = 'aily.dialogue.relayIdleMs';

type PendingRelayRequest = {
  chatId: string;
  messages: DialogueRelayMessage[];
  resolve: (result: DialogueRelayResult) => void;
  reject: (error: Error) => void;
  timeoutHandle: number | null;
  settleHandle: number | null;
  idleMs: number;
};

type DialogueBridgeRuntimeConfig = {
  wsUrl: string;
  relayTimeoutMs: number;
  relayIdleMs: number;
};

export type DialogueBridgeState = {
  connected: boolean;
  connecting: boolean;
  url: string;
  lastError: string | null;
  components: DialogueHardwareComponent[];
};

@Injectable({
  providedIn: 'root',
})
export class DialogueHardwareBridgeService implements OnDestroy {
  private socket: WebSocket | null = null;
  private url = DEFAULT_DIALOGUE_WS_URL;
  private runtimeConfig: DialogueBridgeRuntimeConfig = {
    wsUrl: DEFAULT_DIALOGUE_WS_URL,
    relayTimeoutMs: DEFAULT_RELAY_TIMEOUT_MS,
    relayIdleMs: DEFAULT_RELAY_IDLE_MS,
  };
  private runtimeConfigPromise: Promise<DialogueBridgeRuntimeConfig> | null =
    null;
  private readonly eventsSubject = new Subject<DialogueHardwareEvent>();
  private readonly relayMessagesSubject = new Subject<DialogueRelayMessage>();
  private readonly stateSubject = new BehaviorSubject<DialogueBridgeState>({
    connected: false,
    connecting: false,
    url: DEFAULT_DIALOGUE_WS_URL,
    lastError: null,
    components: [],
  });
  private readonly pendingRelayRequests = new Map<
    string,
    PendingRelayRequest
  >();

  readonly events$: Observable<DialogueHardwareEvent> =
    this.eventsSubject.asObservable();
  readonly relayMessages$: Observable<DialogueRelayMessage> =
    this.relayMessagesSubject.asObservable();
  readonly state$: Observable<DialogueBridgeState> =
    this.stateSubject.asObservable();

  get snapshot(): DialogueBridgeState {
    return this.stateSubject.value;
  }

  async ensureConnected(url = DEFAULT_DIALOGUE_WS_URL): Promise<boolean> {
    const runtimeConfig = await this.ensureRuntimeConfig();
    const targetUrl = String(url || '').trim() || runtimeConfig.wsUrl;

    if (!targetUrl) {
      this.pushError('未配置硬件桥地址，请设置 AILY_DIALOGUE_WS_URL');
      return false;
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      if (this.url === targetUrl) {
        return true;
      }
      this.disconnect();
    }

    this.disconnect();
    this.url = targetUrl;
    this.stateSubject.next({
      ...this.snapshot,
      connecting: true,
      url: this.url,
      lastError: null,
    });

    return new Promise<boolean>((resolve) => {
      try {
        this.socket = new WebSocket(this.url);
      } catch (error: any) {
        this.pushError(error?.message || 'WebSocket 初始化失败');
        resolve(false);
        return;
      }

      const timeout = window.setTimeout(() => {
        this.pushError('硬件桥连接超时');
        this.disconnect();
        resolve(false);
      }, 8000);

      this.socket.onopen = () => {
        window.clearTimeout(timeout);
        this.stateSubject.next({
          ...this.snapshot,
          connected: true,
          connecting: false,
          url: this.url,
          lastError: null,
        });
        resolve(true);
      };

      this.socket.onerror = () => {
        window.clearTimeout(timeout);
        this.pushError('硬件桥连接失败');
        resolve(false);
      };

      this.socket.onclose = () => {
        window.clearTimeout(timeout);
        this.rejectAllRelayRequests('硬件桥连接已断开');
        this.stateSubject.next({
          ...this.snapshot,
          connected: false,
          connecting: false,
        });
      };

      this.socket.onmessage = (event: MessageEvent) => {
        const relayMessage = this.normalizeRelayMessage(event.data);
        if (relayMessage) {
          this.handleRelayMessage(relayMessage);
          return;
        }

        const normalized = this.normalizeEvent(event.data);
        if (!normalized) {
          return;
        }
        this.applyEvent(normalized);
        this.eventsSubject.next(normalized);
      };
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket.close();
    }
    this.socket = null;
    this.stateSubject.next({
      ...this.snapshot,
      connected: false,
      connecting: false,
    });
  }

  dispatchPhysicalCue(
    cue: DialoguePhysicalCue | null,
    sessionId?: string,
  ): boolean {
    if (!cue || cue.action === 'none') {
      return true;
    }

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    const payload = {
      type: 'physical_cue',
      action: cue.action,
      auto_trigger: cue.autoTrigger,
      target_component_id: cue.targetComponentId || null,
      session_id: sessionId || null,
      metadata: cue.metadata || null,
    };

    try {
      this.socket.send(JSON.stringify(payload));
      return true;
    } catch (error: any) {
      this.pushError(error?.message || '物理动作发送失败');
      return false;
    }
  }

  async relayChatMessage(
    content: string,
    options: {
      chatId?: string | null;
      timeoutMs?: number;
      idleMs?: number;
    } = {},
  ): Promise<DialogueRelayResult> {
    const message = String(content || '').trim();
    if (!message) {
      throw new Error('MimicLaw 转发内容不能为空');
    }

    const runtimeConfig = await this.ensureRuntimeConfig();
    const connected = await this.ensureConnected(runtimeConfig.wsUrl);
    if (
      !connected ||
      !this.socket ||
      this.socket.readyState !== WebSocket.OPEN
    ) {
      throw new Error(this.snapshot.lastError || 'MimicLaw WebSocket 未连接');
    }

    const chatId = this.resolveRelayChatId(options.chatId);
    const timeoutMs = options.timeoutMs ?? runtimeConfig.relayTimeoutMs;
    const idleMs = options.idleMs ?? runtimeConfig.relayIdleMs;

    return new Promise<DialogueRelayResult>((resolve, reject) => {
      const pending = this.createPendingRelayRequest(
        chatId,
        idleMs,
        resolve,
        reject,
      );
      pending.timeoutHandle = window.setTimeout(() => {
        if (pending.messages.length > 0) {
          this.resolveRelayRequest(chatId);
          return;
        }
        this.rejectRelayRequest(chatId, 'MimicLaw 响应超时');
      }, timeoutMs);
      this.pendingRelayRequests.set(chatId, pending);

      try {
        this.socket?.send(
          JSON.stringify({
            type: 'message',
            content: message,
            chat_id: chatId,
          }),
        );
      } catch (error: any) {
        this.rejectRelayRequest(
          chatId,
          error?.message || 'MimicLaw 消息发送失败',
        );
      }
    });
  }

  ngOnDestroy(): void {
    this.rejectAllRelayRequests('对话硬件桥已销毁');
    this.disconnect();
    this.eventsSubject.complete();
    this.relayMessagesSubject.complete();
    this.stateSubject.complete();
  }

  private applyEvent(event: DialogueHardwareEvent): void {
    const nextComponents = this.reduceComponents(
      this.snapshot.components,
      event,
    );

    this.stateSubject.next({
      ...this.snapshot,
      connected: this.socket?.readyState === WebSocket.OPEN,
      components: nextComponents,
      lastError:
        event.eventType === 'device_error'
          ? String(
              event.raw?.['content'] || event.raw?.['message'] || '设备异常',
            )
          : null,
    });
  }

  private reduceComponents(
    current: DialogueHardwareComponent[],
    event: DialogueHardwareEvent,
  ): DialogueHardwareComponent[] {
    if (event.eventType === 'snapshot') {
      return (event.connectedComponents || []).filter(
        (item) => item.status !== 'removed',
      );
    }

    if (!event.component) {
      return current;
    }

    const componentKey = this.componentKey(event.component);
    const remaining = current.filter(
      (item) => this.componentKey(item) !== componentKey,
    );

    if (event.eventType === 'device_removed') {
      return remaining;
    }

    return [...remaining, event.component];
  }

  private normalizeEvent(payload: unknown): DialogueHardwareEvent | null {
    const map = this.normalizeMap(payload);
    const text = this.extractText(payload, map);
    const component = this.readComponent(map, text);
    const connectedComponents = this.readConnectedComponents(
      map,
      text,
      component,
    );
    const eventType = this.inferEventType(map, text, component);

    // 若心跳携带设备列表则升级为 snapshot，触发 reduceComponents 替换组件列表
    const effectiveEventType =
      eventType === 'heartbeat' && connectedComponents.length > 0
        ? 'snapshot'
        : eventType;

    if (
      !component &&
      connectedComponents.length === 0 &&
      effectiveEventType === 'heartbeat'
    ) {
      return {
        source: 'miniclaw_ws',
        eventType: effectiveEventType,
        timestamp: new Date().toISOString(),
        raw: map || (text ? { content: text } : null),
      };
    }

    return {
      source: 'miniclaw_ws',
      eventType: effectiveEventType,
      timestamp: this.readTimestamp(map),
      component: component || connectedComponents[0] || null,
      connectedComponents,
      raw: map || (text ? { content: text } : null),
    };
  }

  private normalizeRelayMessage(payload: unknown): DialogueRelayMessage | null {
    const map = this.normalizeMap(payload);
    const type = String(map?.['type'] || '')
      .trim()
      .toLowerCase();
    if (type !== 'response') {
      return null;
    }

    const content = this.extractText(payload, map);
    const chatId = this.pickString(map, ['chat_id', 'chatId']);
    if (!content || !chatId) {
      return null;
    }

    return {
      source: 'mimiclaw_ws',
      chatId,
      content,
      timestamp: this.readTimestamp(map),
      raw: map,
    };
  }

  private normalizeMap(payload: unknown): Record<string, any> | null {
    if (!payload) {
      return null;
    }

    if (typeof payload === 'string') {
      try {
        const parsed = JSON.parse(payload);
        return parsed && typeof parsed === 'object'
          ? (parsed as Record<string, any>)
          : null;
      } catch {
        return null;
      }
    }

    return payload && typeof payload === 'object'
      ? (payload as Record<string, any>)
      : null;
  }

  private extractText(
    payload: unknown,
    map: Record<string, any> | null,
  ): string {
    if (map) {
      return String(
        map['content'] || map['message'] || map['text'] || map['event'] || '',
      ).trim();
    }

    return typeof payload === 'string' ? payload.trim() : '';
  }

  private readComponent(
    map: Record<string, any> | null,
    text: string,
  ): DialogueHardwareComponent | null {
    if (!map) {
      return this.inferTextComponent(text);
    }

    const nested = this.normalizeMap(
      map['component'] || map['device'] || map['hardware'],
    );
    return this.readComponentFromSource(nested || map, text);
  }

  private readComponentFromSource(
    source: Record<string, any> | null,
    text: string,
  ): DialogueHardwareComponent | null {
    if (!source) {
      return this.inferTextComponent(text);
    }

    const notes = this.normalizeMap(
      source['notes'] || source['meta'] || source['metadata'],
    );
    const componentId =
      this.pickString(source, [
        'componentId',
        'component_id',
        'deviceType',
        'device_type',
        'component',
      ]) ||
      this.pickString(notes, [
        'componentId',
        'component_id',
        'deviceType',
        'device_type',
        'component',
      ]) ||
      this.inferComponentId(text);

    if (!componentId) {
      return null;
    }

    const status = this.readStatus(source, text);
    return {
      componentId,
      deviceId:
        this.pickString(source, ['deviceId', 'device_id']) ||
        `${componentId}-001`,
      modelId:
        this.pickString(source, ['modelId', 'model_id']) ||
        this.pickString(notes, ['modelId', 'model_id']) ||
        this.defaultModelId(componentId),
      displayName:
        this.pickString(source, ['displayName', 'display_name']) ||
        this.pickString(notes, ['displayName', 'display_name', 'name']) ||
        this.displayName(componentId),
      portId:
        this.pickString(source, ['portId', 'port_id']) ||
        this.inferPortId(text) ||
        'port_2',
      status,
    };
  }

  private readConnectedComponents(
    map: Record<string, any> | null,
    text: string,
    component: DialogueHardwareComponent | null,
  ): DialogueHardwareComponent[] {
    const componentArrays = [
      this.pickComponentArray(map, [
        'connectedComponents',
        'connected_components',
        'components',
        'device_info',
        'deviceInfo',
      ]),
      this.pickComponentArray(this.normalizeMap(map?.['hardware']), [
        'connectedComponents',
        'connected_components',
        'components',
        'device_info',
        'deviceInfo',
      ]),
      this.pickComponentArray(this.normalizeMap(map?.['snapshot']), [
        'connectedComponents',
        'connected_components',
        'components',
        'device_info',
        'deviceInfo',
      ]),
    ];

    const next = new Map<string, DialogueHardwareComponent>();
    for (const items of componentArrays) {
      for (const item of items) {
        const normalized = this.readComponentFromSource(item, text);
        if (normalized) {
          next.set(this.componentKey(normalized), normalized);
        }
      }
    }

    const detailedTextComponents = this.extractTextComponents(text);
    for (const item of detailedTextComponents) {
      next.set(this.componentKey(item), item);
    }

    // 处理 devices 字段：支持 JSON 数组、JSON 字符串和日志文本里的 devices=cam1,hand1
    const devicesArray = this.extractDeviceIds(map, text);
    if (devicesArray.length > 0) {
      for (const deviceId of devicesArray) {
        const inferred = this.inferDeviceIdComponent(deviceId);
        if (inferred) next.set(this.componentKey(inferred), inferred);
      }
    }

    if (next.size === 0 && component) {
      next.set(this.componentKey(component), component);
    }

    return Array.from(next.values());
  }

  private pickComponentArray(
    map: Record<string, any> | null,
    keys: string[],
  ): Record<string, any>[] {
    if (!map) {
      return [];
    }

    for (const key of keys) {
      const raw = map[key];
      if (!Array.isArray(raw)) {
        continue;
      }
      return raw
        .map((item) => this.normalizeMap(item))
        .filter((item): item is Record<string, any> => Boolean(item));
    }

    return [];
  }

  private inferTextComponent(text: string): DialogueHardwareComponent | null {
    const componentId = this.inferComponentId(text);
    if (!componentId) {
      return null;
    }

    return {
      componentId,
      deviceId: `${componentId}-001`,
      modelId: this.defaultModelId(componentId),
      displayName: this.displayName(componentId),
      portId: this.inferPortId(text) || 'port_2',
      status: this.readStatus(null, text),
    };
  }

  private inferDeviceIdComponent(
    deviceId: string,
  ): DialogueHardwareComponent | null {
    const normalized = String(deviceId || '')
      .trim()
      .toLowerCase();
    if (!normalized) return null;
    const componentId = this.inferComponentId(normalized);
    if (!componentId) return null;
    return {
      componentId,
      deviceId: normalized,
      modelId: this.defaultModelId(componentId),
      displayName: this.displayName(componentId),
      portId: 'port_2',
      status: 'connected',
    };
  }

  private extractTextComponents(text: string): DialogueHardwareComponent[] {
    const normalizedText = String(text || '');
    if (!normalizedText.trim()) {
      return [];
    }

    const next = new Map<string, DialogueHardwareComponent>();
    const linePattern =
      /(?:^|\n)\s*(?:[-*•]\s*)?([a-z_]+)\s*:\s*(online|offline|connected|disconnected|ready|error)\s*\(([^)]+)\)([^\n\r]*)/gi;

    let match: RegExpExecArray | null;
    while ((match = linePattern.exec(normalizedText)) !== null) {
      const typeToken = String(match[1] || '')
        .trim()
        .toLowerCase();
      const statusToken = String(match[2] || '')
        .trim()
        .toLowerCase();
      const deviceId = String(match[3] || '')
        .trim()
        .toLowerCase();
      const tail = String(match[4] || '');
      const componentId = this.inferComponentId(`${typeToken} ${deviceId}`);
      if (!componentId || !deviceId) {
        continue;
      }

      const portId =
        this.extractPortFromSegment(tail) || this.inferPortId(tail) || 'port_2';
      const component: DialogueHardwareComponent = {
        componentId,
        deviceId,
        modelId: this.defaultModelId(componentId),
        displayName: this.displayName(componentId),
        portId,
        status: this.normalizeTextStatus(statusToken),
      };
      next.set(this.componentKey(component), component);
    }

    return Array.from(next.values());
  }

  private extractPortFromSegment(text: string): string {
    const match = String(text || '').match(/\bport\s*=\s*([^|\s]+)/i);
    return String(match?.[1] || '').trim();
  }

  private normalizeTextStatus(status: string): DialogueComponentStatus {
    const normalized = String(status || '')
      .trim()
      .toLowerCase();
    if (!normalized) return 'connected';
    if (/offline|disconnected|removed/.test(normalized)) return 'removed';
    if (/error|failed/.test(normalized)) return 'error';
    if (/ready/.test(normalized)) return 'ready';
    if (/validating|syncing/.test(normalized)) return 'validating';
    return 'connected';
  }

  private extractDeviceIds(
    map: Record<string, any> | null,
    text: string,
  ): string[] {
    const rawDevices =
      map?.['devices'] ?? map?.['deviceIds'] ?? map?.['device_ids'];
    if (Array.isArray(rawDevices)) {
      return rawDevices
        .filter((deviceId): deviceId is string => typeof deviceId === 'string')
        .map((deviceId) => deviceId.trim())
        .filter(Boolean);
    }

    if (typeof rawDevices === 'string' && rawDevices.trim()) {
      return this.splitDeviceIds(rawDevices);
    }

    const devicesMatch = String(text || '').match(
      /(?:^|[\s|])devices\s*=\s*([^|\n\r]+)/i,
    );
    if (!devicesMatch?.[1]) {
      return [];
    }

    return this.splitDeviceIds(devicesMatch[1]);
  }

  private splitDeviceIds(value: string): string[] {
    return String(value || '')
      .split(/[,，]/)
      .map((item) => item.trim().replace(/^[=:]+|[|;]+$/g, ''))
      .filter(Boolean);
  }

  private inferEventType(
    map: Record<string, any> | null,
    text: string,
    component: DialogueHardwareComponent | null,
  ): DialogueHardwareEventType {
    const explicit = String(map?.['eventType'] || map?.['event_type'] || '')
      .trim()
      .toLowerCase();
    if (explicit) {
      return this.normalizeEventType(explicit);
    }

    const normalizedText = text.toLowerCase();
    if (/remove|detach|disconnect|unplug|拔出/.test(normalizedText)) {
      return 'device_removed';
    }
    if (/ready|synced|success|validated|校验成功|准备好/.test(normalizedText)) {
      return 'device_ready';
    }
    if (/error|failed|损坏|异常|没插对/.test(normalizedText)) {
      return 'device_error';
    }
    if (
      /insert|attach|connect|plug|online|插入|已连接|在线/.test(normalizedText)
    ) {
      return 'device_inserted';
    }

    return component ? 'snapshot' : 'heartbeat';
  }

  private normalizeEventType(value: string): DialogueHardwareEventType {
    if (value.includes('remove')) return 'device_removed';
    if (value.includes('ready')) return 'device_ready';
    if (value.includes('error') || value.includes('fail'))
      return 'device_error';
    if (
      value.includes('insert') ||
      value.includes('attach') ||
      value.includes('connect')
    ) {
      return 'device_inserted';
    }
    if (value.includes('snapshot')) return 'snapshot';
    return 'heartbeat';
  }

  private readStatus(
    map: Record<string, any> | null,
    text: string,
  ): DialogueComponentStatus {
    const explicit = String(map?.['status'] || '')
      .trim()
      .toLowerCase();
    if (explicit) {
      if (explicit.includes('remove')) return 'removed';
      if (explicit.includes('offline')) return 'removed';
      if (explicit.includes('ready')) return 'ready';
      if (explicit.includes('error') || explicit.includes('fail'))
        return 'error';
      if (explicit.includes('valid')) return 'validating';
      if (explicit.includes('online') || explicit.includes('connect'))
        return 'connected';
      return 'connected';
    }

    const normalizedText = text.toLowerCase();
    if (/remove|detach|disconnect|拔出/.test(normalizedText)) return 'removed';
    if (/ready|validated|success|准备好|校验成功/.test(normalizedText))
      return 'ready';
    if (/error|failed|异常|损坏/.test(normalizedText)) return 'error';
    if (/offline|离线/.test(normalizedText)) return 'removed';
    if (/online|在线|connected|已连接/.test(normalizedText)) return 'connected';
    if (/validating|同步|校验/.test(normalizedText)) return 'validating';
    return 'connected';
  }

  private readTimestamp(map: Record<string, any> | null): string {
    const raw = String(map?.['timestamp'] || map?.['time'] || '').trim();
    if (!raw) {
      return new Date().toISOString();
    }

    const date = new Date(raw);
    return Number.isNaN(date.getTime())
      ? new Date().toISOString()
      : date.toISOString();
  }

  private inferComponentId(text: string): string {
    const normalizedText = String(text || '').toLowerCase();
    if (
      /\bmimic[_ -]?law\d*\b|\bmagiclaw\d*\b|磷虾u?盘|磷虾/.test(
        normalizedText,
      )
    ) {
      return 'mimiclaw';
    }
    if (/\bcam\d*\b|camera|摄像头|镜头/.test(normalizedText)) return 'camera';
    if (
      /\bhand\d*\b|mechanical[_ -]?hand|claw|夹爪|机械手/.test(normalizedText)
    )
      return 'mechanical_hand';
    if (/\bspk\d*\b|speaker|喇叭|音箱/.test(normalizedText)) return 'speaker';
    if (/\bmic\d*\b|mic|microphone|麦克风/.test(normalizedText))
      return 'microphone';
    if (/\bcar\d*\b|\bwheel\d*\b|chassis|底盘|小车/.test(normalizedText))
      return 'chassis';
    if (
      /\bscreen(?:[_ -]?\d+)?\b|\bdisplay(?:[_ -]?\d+)?\b|屏幕|显示屏/.test(
        normalizedText,
      )
    )
      return 'screen';
    return '';
  }

  private inferPortId(text: string): string {
    const normalizedText = String(text || '').toLowerCase();
    const match = normalizedText.match(/port[_ ]?(\d+)/);
    if (match?.[1]) {
      return `port_${match[1]}`;
    }

    const cnMatch = normalizedText.match(/(\d+)号口/);
    if (cnMatch?.[1]) {
      return `port_${cnMatch[1]}`;
    }

    return '';
  }

  private pickString(map: Record<string, any> | null, keys: string[]): string {
    if (!map) {
      return '';
    }

    for (const key of keys) {
      const value = String(map[key] || '').trim();
      if (value) {
        return value;
      }
    }

    return '';
  }

  private componentKey(component: DialogueHardwareComponent): string {
    return `${component.componentId}:${component.deviceId}:${component.portId}`;
  }

  private defaultModelId(componentId: string): string {
    switch (componentId) {
      case 'mimiclaw':
        return 'mimiclaw-usb-001';
      case 'camera':
        return 'cam-001';
      case 'mechanical_hand':
        return 'claw-v1';
      case 'speaker':
        return 'speaker-001';
      case 'microphone':
        return 'mic-001';
      case 'wheel':
      case 'chassis':
        return 'wheel-001';
      default:
        return `${componentId}-001`;
    }
  }

  private displayName(componentId: string): string {
    switch (componentId) {
      case 'mimiclaw':
        return '磷虾U盘';
      case 'camera':
        return '摄像头';
      case 'mechanical_hand':
        return '机械手';
      case 'speaker':
        return '扬声器';
      case 'microphone':
        return '麦克风';
      case 'wheel':
      case 'chassis':
        return '底盘';
      default:
        return componentId;
    }
  }

  private async ensureRuntimeConfig(): Promise<DialogueBridgeRuntimeConfig> {
    if (!this.runtimeConfigPromise) {
      this.runtimeConfigPromise = this.loadRuntimeConfig();
    }

    this.runtimeConfig = await this.runtimeConfigPromise;
    return this.runtimeConfig;
  }

  private async loadRuntimeConfig(): Promise<DialogueBridgeRuntimeConfig> {
    const configuredWsUrl = await this.readBridgeSetting(
      DIALOGUE_WS_URL_ENV_KEY,
      DIALOGUE_WS_URL_DEBUG_KEY,
    );
    const configuredTimeout = await this.readBridgeSetting(
      DIALOGUE_RELAY_TIMEOUT_ENV_KEY,
      DIALOGUE_RELAY_TIMEOUT_DEBUG_KEY,
    );
    const configuredIdle = await this.readBridgeSetting(
      DIALOGUE_RELAY_IDLE_ENV_KEY,
      DIALOGUE_RELAY_IDLE_DEBUG_KEY,
    );

    return {
      wsUrl: this.normalizeWsUrl(configuredWsUrl, DEFAULT_DIALOGUE_WS_URL),
      relayTimeoutMs: this.normalizePositiveInt(
        configuredTimeout,
        DEFAULT_RELAY_TIMEOUT_MS,
      ),
      relayIdleMs: this.normalizePositiveInt(
        configuredIdle,
        DEFAULT_RELAY_IDLE_MS,
      ),
    };
  }

  private async readBridgeSetting(
    envKey: string,
    debugKey: string,
  ): Promise<string> {
    const electronValue = await this.readElectronEnv(envKey);
    if (electronValue) {
      return electronValue;
    }

    return this.readRendererDebugValue(debugKey);
  }

  private async readElectronEnv(key: string): Promise<string> {
    try {
      const getter = window?.electronAPI?.env?.get;
      if (typeof getter !== 'function') {
        return '';
      }

      const value = await getter(key);
      return String(value || '').trim();
    } catch {
      return '';
    }
  }

  private readRendererDebugValue(key: string): string {
    try {
      const queryValue = new URLSearchParams(
        globalThis.location?.search || '',
      ).get(key);
      if (queryValue && queryValue.trim()) {
        return queryValue.trim();
      }
    } catch {
      // ignore
    }

    try {
      const value = globalThis.localStorage?.getItem(key);
      return String(value || '').trim();
    } catch {
      return '';
    }
  }

  private normalizeWsUrl(value: string, fallback: string): string {
    const normalized = String(value || '').trim();
    return normalized || fallback;
  }

  private normalizePositiveInt(value: string, fallback: number): number {
    const parsed = Number.parseInt(String(value || '').trim(), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private pushError(message: string): void {
    this.stateSubject.next({
      ...this.snapshot,
      connected: false,
      connecting: false,
      lastError: message,
    });
  }

  private handleRelayMessage(message: DialogueRelayMessage): void {
    this.relayMessagesSubject.next(message);
    const pending = this.pendingRelayRequests.get(message.chatId);
    if (!pending) {
      return;
    }

    pending.messages.push(message);
    if (this.isRelayProgressMessage(message.content)) {
      return;
    }
    this.scheduleRelayResolution(pending);
  }

  private createPendingRelayRequest(
    chatId: string,
    idleMs: number,
    resolve: (result: DialogueRelayResult) => void,
    reject: (error: Error) => void,
  ): PendingRelayRequest {
    return {
      chatId,
      messages: [],
      resolve,
      reject,
      timeoutHandle: null,
      settleHandle: null,
      idleMs,
    };
  }

  private scheduleRelayResolution(pending: PendingRelayRequest): void {
    if (pending.settleHandle != null) {
      window.clearTimeout(pending.settleHandle);
    }

    pending.settleHandle = window.setTimeout(() => {
      this.resolveRelayRequest(pending.chatId);
    }, pending.idleMs);
  }

  private resolveRelayRequest(chatId: string): void {
    const pending = this.pendingRelayRequests.get(chatId);
    if (!pending) {
      return;
    }

    this.clearRelayTimers(pending);
    this.pendingRelayRequests.delete(chatId);
    pending.resolve({
      chatId,
      content: pending.messages
        .map((item) => item.content)
        .join('\n\n')
        .trim(),
      messages: [...pending.messages],
    });
  }

  private rejectRelayRequest(chatId: string, message: string): void {
    const pending = this.pendingRelayRequests.get(chatId);
    if (!pending) {
      return;
    }

    this.clearRelayTimers(pending);
    this.pendingRelayRequests.delete(chatId);
    pending.reject(new Error(message));
  }

  private rejectAllRelayRequests(message: string): void {
    for (const chatId of Array.from(this.pendingRelayRequests.keys())) {
      this.rejectRelayRequest(chatId, message);
    }
  }

  private clearRelayTimers(pending: PendingRelayRequest): void {
    if (pending.timeoutHandle != null) {
      window.clearTimeout(pending.timeoutHandle);
    }
    if (pending.settleHandle != null) {
      window.clearTimeout(pending.settleHandle);
    }
  }

  private isRelayProgressMessage(content: string): boolean {
    const normalized = String(content || '').toLowerCase();
    return /working|思考中|处理中|loading|同步中/.test(normalized);
  }

  private resolveRelayChatId(requestedChatId?: string | null): string {
    const sanitized = this.sanitizeRelayChatId(requestedChatId);
    if (sanitized) {
      return sanitized;
    }

    const timestamp = Date.now().toString(36);
    const digest = this.hashToken(
      `${requestedChatId || ''}:${timestamp}:${Math.random()}`,
    );
    return `${RELAY_CHAT_ID_PREFIX}-${timestamp}-${digest}`.slice(
      0,
      MAX_SAFE_RELAY_CHAT_ID_LENGTH,
    );
  }

  private sanitizeRelayChatId(value?: string | null): string {
    const normalized = String(value || '')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '');

    if (!normalized || normalized.length > MAX_SAFE_RELAY_CHAT_ID_LENGTH) {
      return '';
    }

    return normalized;
  }

  private hashToken(value: string): string {
    let hash = 2166136261;
    for (const char of value) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }

    return Math.abs(hash >>> 0)
      .toString(36)
      .slice(0, 8);
  }
}
