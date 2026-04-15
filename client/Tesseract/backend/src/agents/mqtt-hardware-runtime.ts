/**
 * [INPUT]: 依赖 mqtt/paho 协议约定、docs/dev/cloud_mqtt_example.py 的消息工厂语义与 docs/dev/heartbeat.log 的状态日志格式
 * [OUTPUT]: 对外提供 MQTT 硬件运行时真相源、heartbeat 解析器、command 封装器、publishRecImg rec_img 图片发送、可订阅状态 store 与 canonical digitalTwinScene
 * [POS]: agents 的 MQTT 硬件中枢，负责把云端 workflow/command/status 协议收敛成 backend-first runtime snapshot 与 scene envelope
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import mqtt from 'mqtt';
import type { MqttClient, IClientOptions } from 'mqtt';
import { buildDigitalTwinSceneFromDialogueHardware } from './digital-twin-scene';
import { logger } from '../utils/logger';
import type {
  DialogueModeHardwareComponent,
  DialogueModeHardwareSnapshot,
  DialogueModeHardwareSource,
  DialogueModeHardwareValidationStatus,
  WorkflowDefinition,
} from './types';

export type MqttHardwareRuntimeCommandKind =
  | 'workflow_upload'
  | 'workflow_stop'
  | 'microphone_open'
  | 'microphone_close'
  | 'speaker_play'
  | 'hardware_command';

export interface MqttHardwareRuntimeCommand {
  kind: MqttHardwareRuntimeCommandKind;
  requestId: string;
  topic: string;
  payload: Record<string, unknown>;
  publishedAt: string;
}

export interface MqttHardwareRuntimeCommandReceipt extends MqttHardwareRuntimeCommand {
  status: 'queued' | 'sent' | 'acknowledged' | 'failed';
  response?: Record<string, unknown> | null;
  responseAt?: string | null;
}

export interface ParsedHeartbeatDevice {
  deviceType: string;
  deviceStatus: string;
  deviceName: string;
  devicePath: string;
  devicePort?: string;
  interfaceId?: string;
  vidPid?: string;
  raw?: Record<string, unknown>;
}

export interface ParsedHeartbeatRecord {
  source: 'mqtt_runtime';
  topic: string;
  requestId?: string | null;
  timestamp: string;
  edgeTimestamp?: string | number | null;
  deviceCount: number;
  devices: ParsedHeartbeatDevice[];
  raw: Record<string, unknown>;
}

export interface MqttHardwareRuntimeStatus {
  enabled: boolean;
  connectionState: 'disabled' | 'connecting' | 'connected' | 'disconnected' | 'error';
  broker: string;
  port: number;
  deviceId: string;
  topicSend: string;
  topicRecv: string;
  keepalive: number;
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
  lastHeartbeatAt: string | null;
  lastCommandAt: string | null;
  lastError: string | null;
  latestHeartbeat: ParsedHeartbeatRecord | null;
  dialogueHardware: DialogueModeHardwareSnapshot;
  digitalTwinScene: Record<string, unknown> | null;
  lastCommand: MqttHardwareRuntimeCommandReceipt | null;
  message: string;
}

export interface MqttHardwareRuntimeOptions {
  broker: string;
  port: number;
  deviceId: string;
  keepalive?: number;
  enabled?: boolean;
  qos?: number;
  seedHeartbeatText?: string;
  transportFactory?: (options: IClientOptions & { clientId: string; host: string; port: number }) => MqttClient;
}

type HardwareRuntimeListener = (status: MqttHardwareRuntimeStatus) => void;

type IncomingMqttPayload = Record<string, unknown> & {
  msg_type?: string;
  msg_content?: unknown[];
  request_id?: string;
  timestamp?: string | number;
  devices?: unknown[];
};

const HEARTBEAT_PORT_MAP: Record<string, string> = {
  '3-1.2': 'port_1',
  '3-1.3': 'port_2',
  '3-1.4': 'port_3',
  '3-1.6': 'port_4',
  '3-1.7': 'port_7',
  hdmi: 'port_hdmi',
  port_hdmi: 'port_hdmi',
  porthdmi: 'port_hdmi',
  '/dev/hdmi': 'port_hdmi',
  port_1: 'port_1',
  port_2: 'port_2',
  port_3: 'port_3',
  port_4: 'port_4',
  port_7: 'port_7',
};

const HEARTBEAT_DEVICE_TYPE_MAP: Record<string, string> = {
  cam: 'camera',
  camera: 'camera',
  hand: 'hand',
  car: 'wheel',
  wheel: 'wheel',
  chassis: 'wheel',
  screen: 'screen',
  display: 'screen',
  hdmi: 'screen',
  speaker: 'speaker',
  mic: 'microphone',
  microphone: 'microphone',
  wifi: 'wifi',
  mimiclaw: 'mimiclaw',
  mimic_law: 'mimiclaw',
};

const MOUNTABLE_COMPONENT_IDS = new Set([
  'camera',
  'microphone',
  'hand',
  'speaker',
  'wheel',
  'screen',
]);

export function createWorkflowUploadMessage(
  workflow: WorkflowDefinition | Record<string, unknown>,
  requestId: string = randomUUID()
): Record<string, unknown> {
  return {
    msg_type: 'workflow',
    msg_content: [workflow],
    request_id: requestId,
  };
}

export function createWorkflowStopMessage(
  requestId: string = randomUUID()
): Record<string, unknown> {
  return {
    msg_type: 'workflow_stop',
    msg_content: [{}],
    request_id: requestId,
  };
}

export function createMicrophoneOpenMessage(
  requestId: string = randomUUID()
): Record<string, unknown> {
  return createHardwareCommandMessage('microphone', 'open', requestId);
}

export function createMicrophoneCloseMessage(
  requestId: string = randomUUID()
): Record<string, unknown> {
  return createHardwareCommandMessage('microphone', 'close', requestId);
}

export function createSpeakerPlayMessage(
  params: { audioName?: string; path?: string; text?: string },
  requestId: string = randomUUID()
): Record<string, unknown> {
  return createHardwareCommandMessage('speaker', 'play', requestId, params);
}

export function createHardwareCommandMessage(
  deviceType: string,
  cmd: string,
  requestId: string = randomUUID(),
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    msg_type: 'cmd',
    msg_content: [
      {
        device_type: deviceType,
        cmd,
        ...extra,
      },
    ],
    request_id: requestId,
  };
}

export function parseHeartbeatSource(
  raw: unknown,
  topic = ''
): ParsedHeartbeatRecord[] {
  if (typeof raw === 'string') {
    return parseHeartbeatText(raw, topic);
  }

  if (!raw || typeof raw !== 'object') {
    return [];
  }

  const parsed = parseHeartbeatPayload(raw as IncomingMqttPayload, topic);
  return parsed ? [parsed] : [];
}

export function parseHeartbeatText(
  text: string,
  topic = ''
): ParsedHeartbeatRecord[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  if (looksLikeJson(trimmed)) {
    try {
      const payload = JSON.parse(trimmed) as IncomingMqttPayload;
      const parsed = parseHeartbeatPayload(payload, topic);
      return parsed ? [parsed] : [];
    } catch {
      return [];
    }
  }

  const lines = trimmed.split(/\r?\n/);
  const records: ParsedHeartbeatRecord[] = [];
  let current: ParsedHeartbeatRecord | null = null;

  const flushCurrent = () => {
    if (current) {
      current.deviceCount = current.devices.length;
      records.push(current);
    }
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.trim()) {
      continue;
    }

    if (line.startsWith('[') && line.includes('收到端侧状态')) {
      flushCurrent();
      current = {
        source: 'mqtt_runtime',
        topic,
        requestId: null,
        timestamp: parseBracketTimestamp(line),
        edgeTimestamp: null,
        deviceCount: 0,
        devices: [],
        raw: { rawLine: line },
      };
      continue;
    }

    if (!current) {
      continue;
    }

    const topicMatch = line.match(/主题:\s*(.+)$/);
    if (topicMatch) {
      current.topic = topicMatch[1].trim();
      continue;
    }

    const edgeTimestampMatch = line.match(/端侧时间戳:\s*(.+)$/);
    if (edgeTimestampMatch) {
      current.edgeTimestamp = normalizeNumericLike(edgeTimestampMatch[1].trim());
      continue;
    }

    const deviceCountMatch = line.match(/设备数量:\s*(\d+)/);
    if (deviceCountMatch) {
      current.deviceCount = Number(deviceCountMatch[1]);
      continue;
    }

    const deviceMatch = line.match(
      /^-\s*(?<deviceType>[^:]+):\s*(?<deviceStatus>[^(]+)\s*\((?<deviceName>[^)]*)\)\s*@\s*(?<devicePath>[^|]+?)(?:\s*\|\s*port=(?<devicePort>[^|]+))?(?:\s*\|\s*vid_pid=(?<vidPid>.+))?$/
    );
    if (deviceMatch?.groups) {
      const rawDeviceType = deviceMatch.groups.deviceType.trim();
      const devicePath = deviceMatch.groups.devicePath.trim();
      const devicePort = deviceMatch.groups.devicePort?.trim() ?? '';
      current.devices.push({
        deviceType: rawDeviceType,
        deviceStatus: deviceMatch.groups.deviceStatus.trim(),
        deviceName: deviceMatch.groups.deviceName.trim(),
        devicePath,
        devicePort: devicePort || undefined,
        interfaceId: resolveHardwareInterfaceId(devicePort, devicePath),
        vidPid: deviceMatch.groups.vidPid?.trim() || undefined,
      });
    }
  }

  flushCurrent();
  return records;
}

export function parseHeartbeatPayload(
  payload: IncomingMqttPayload,
  topic = ''
): ParsedHeartbeatRecord | null {
  const statusPayload = extractStatusPayload(payload);
  if (!statusPayload) {
    return null;
  }

  const devices = normalizeHeartbeatDevices(statusPayload.devices ?? []);
  return {
    source: 'mqtt_runtime',
    topic: typeof statusPayload.topic === 'string' ? statusPayload.topic : topic,
    requestId: typeof statusPayload.request_id === 'string' ? statusPayload.request_id : null,
    timestamp: normalizeTimestamp(statusPayload.timestamp),
    edgeTimestamp: statusPayload.timestamp ?? null,
    deviceCount: typeof statusPayload.device_count === 'number'
      ? statusPayload.device_count
      : devices.length,
    devices,
    raw: statusPayload,
  };
}

export class MqttHardwareRuntime extends EventEmitter {
  private readonly enabled: boolean;
  private readonly qos: number;
  private readonly keepalive: number;
  private readonly topicSend: string;
  private readonly topicRecv: string;
  private readonly transportFactory?: MqttHardwareRuntimeOptions['transportFactory'];
  private transport?: MqttClient;
  private started = false;
  private latestHeartbeat: ParsedHeartbeatRecord | null = null;
  private lastHeartbeatAt: string | null = null;
  private lastConnectedAt: string | null = null;
  private lastDisconnectedAt: string | null = null;
  private lastCommandAt: string | null = null;
  private lastError: string | null = null;
  private lastCommand: MqttHardwareRuntimeCommandReceipt | null = null;
  private dialogueHardware: DialogueModeHardwareSnapshot = createEmptyDialogueHardwareSnapshot();
  private readonly subscribers = new Set<HardwareRuntimeListener>();

  constructor(private readonly options: MqttHardwareRuntimeOptions) {
    super();
    this.enabled = options.enabled ?? true;
    this.qos = options.qos ?? 1;
    this.keepalive = options.keepalive ?? 60;
    this.topicSend = `qsf/${options.deviceId}/cloud2edge`;
    this.topicRecv = `qsf/${options.deviceId}/edge2cloud`;
    this.transportFactory = options.transportFactory;

    if (options.seedHeartbeatText) {
      const seeded = parseHeartbeatText(options.seedHeartbeatText, this.topicRecv);
      const latest = seeded.at(-1) ?? null;
      if (latest) {
        this.applyHeartbeatRecord(latest);
      }
    }
  }

  async start(): Promise<void> {
    if (!this.enabled || this.started) {
      this.publishStatus();
      return;
    }

    this.started = true;
    const client = this.createTransport();
    this.transport = client;
    this.bindTransport(client);
    this.publishStatus();

    await this.connectTransport(client);
  }

  async stop(): Promise<void> {
    if (!this.transport) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.transport?.end(false, {}, () => resolve());
    });
    this.transport = undefined;
    this.started = false;
    this.lastDisconnectedAt = new Date().toISOString();
    this.publishStatus();
  }

  getStatus(): MqttHardwareRuntimeStatus {
    return {
      enabled: this.enabled,
      connectionState: this.connectionState(),
      broker: this.options.broker,
      port: this.options.port,
      deviceId: this.options.deviceId,
      topicSend: this.topicSend,
      topicRecv: this.topicRecv,
      keepalive: this.keepalive,
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectedAt: this.lastDisconnectedAt,
      lastHeartbeatAt: this.lastHeartbeatAt,
      lastCommandAt: this.lastCommandAt,
      lastError: this.lastError,
      latestHeartbeat: this.latestHeartbeat ? cloneHeartbeatRecord(this.latestHeartbeat) : null,
      dialogueHardware: cloneDialogueHardwareSnapshot(this.dialogueHardware),
      digitalTwinScene: buildDigitalTwinSceneFromDialogueHardware(this.dialogueHardware),
      lastCommand: this.lastCommand ? cloneCommandReceipt(this.lastCommand) : null,
      message: this.buildMessage(),
    };
  }

  getDialogueHardwareSnapshot(): DialogueModeHardwareSnapshot {
    return cloneDialogueHardwareSnapshot(this.dialogueHardware);
  }

  ingestHeartbeat(raw: unknown, topic = this.topicRecv): ParsedHeartbeatRecord | null {
    const records = parseHeartbeatSource(raw, topic);
    const latest = records.at(-1) ?? null;
    if (!latest) {
      return null;
    }

    this.applyHeartbeatRecord(latest);
    return cloneHeartbeatRecord(latest);
  }

  async uploadWorkflow(
    workflow: WorkflowDefinition | Record<string, unknown>
  ): Promise<MqttHardwareRuntimeCommandReceipt> {
    return this.publishCommand({
      kind: 'workflow_upload',
      topic: this.topicSend,
      payload: createWorkflowUploadMessage(workflow),
    });
  }

  async stopWorkflow(): Promise<MqttHardwareRuntimeCommandReceipt> {
    return this.publishCommand({
      kind: 'workflow_stop',
      topic: this.topicSend,
      payload: createWorkflowStopMessage(),
    });
  }

  async openMicrophone(): Promise<MqttHardwareRuntimeCommandReceipt> {
    return this.publishCommand({
      kind: 'microphone_open',
      topic: this.topicSend,
      payload: createMicrophoneOpenMessage(),
    });
  }

  async closeMicrophone(): Promise<MqttHardwareRuntimeCommandReceipt> {
    return this.publishCommand({
      kind: 'microphone_close',
      topic: this.topicSend,
      payload: createMicrophoneCloseMessage(),
    });
  }

  async playSpeaker(
    params: { audioName?: string; path?: string; text?: string }
  ): Promise<MqttHardwareRuntimeCommandReceipt> {
    return this.publishCommand({
      kind: 'speaker_play',
      topic: this.topicSend,
      payload: createSpeakerPlayMessage(params),
    });
  }

  async sendHardwareCommand(params: {
    deviceType: string;
    cmd: string;
    extra?: Record<string, unknown>;
  }): Promise<MqttHardwareRuntimeCommandReceipt> {
    const kind = this.resolveCommandKind(params.deviceType, params.cmd);
    return this.publishCommand({
      kind,
      topic: this.topicSend,
      payload: createHardwareCommandMessage(
        params.deviceType,
        params.cmd,
        undefined,
        params.extra ?? {}
      ),
    });
  }

  // ── 021-mqtt-image-upload: rec_img 协议直发，不经 cmd 封装 ──
  async publishRecImg(params: {
    imageId: string;
    format: string;
    dataBase64: string;
    width?: number;
    height?: number;
  }): Promise<void> {
    if (!this.transport) {
      logger.warn('MqttHardwareRuntime: rec_img publish skipped because transport is unavailable', {
        imageId: params.imageId,
      });
      throw new Error('设备未连接，请先连接硬件后再发送图片');
    }
    const width = Number.isFinite(params.width) ? Math.max(0, Math.trunc(params.width ?? 0)) : 0;
    const height = Number.isFinite(params.height) ? Math.max(0, Math.trunc(params.height ?? 0)) : 0;
    const envelope = {
      msg_type: 'rec_img',
      msg_content: [
        {
          image_id: params.imageId,
          format: params.format,
          width,
          height,
          encoding: 'base64',
          data: params.dataBase64,
        },
      ],
    };
    logger.info('MqttHardwareRuntime: publishing rec_img payload', {
      topic: this.topicSend,
      imageId: params.imageId,
      format: params.format,
      width,
      height,
      dataLength: params.dataBase64.length,
    });
    await new Promise<void>((resolve, reject) => {
      this.transport!.publish(
        this.topicSend,
        JSON.stringify(envelope),
        { qos: this.qos as any },
        (error) => {
          if (error) {
            logger.warn('MqttHardwareRuntime: rec_img publish failed', {
              topic: this.topicSend,
              imageId: params.imageId,
              error: error.message,
            });
            reject(error);
            return;
          }
          logger.info('MqttHardwareRuntime: rec_img publish succeeded', {
            topic: this.topicSend,
            imageId: params.imageId,
          });
          resolve();
        }
      );
    });
  }

  subscribe(listener: HardwareRuntimeListener): () => void {
    this.subscribers.add(listener);
    listener(this.getStatus());
    return () => {
      this.subscribers.delete(listener);
    };
  }

  private createTransport(): MqttClient {
    if (this.transportFactory) {
      return this.transportFactory({
        clientId: `backend_hardware_${this.options.deviceId}_${Date.now()}`,
        host: this.options.broker,
        port: this.options.port,
        protocol: 'mqtt',
        keepalive: this.keepalive,
        reconnectPeriod: 3000,
      });
    }

    return mqtt.connect({
      host: this.options.broker,
      port: this.options.port,
      protocol: 'mqtt',
      keepalive: this.keepalive,
      reconnectPeriod: 3000,
      clientId: `backend_hardware_${this.options.deviceId}_${Date.now()}`,
    });
  }

  private bindTransport(client: MqttClient): void {
    client.on('connect', () => {
      this.lastConnectedAt = new Date().toISOString();
      this.lastError = null;
      client.subscribe(this.topicRecv, { qos: this.qos as any }, (error) => {
        if (error) {
          this.lastError = error.message;
          this.publishStatus();
          return;
        }
        this.publishStatus();
      });
    });

    client.on('message', (topic, payload) => {
      const raw = payload.toString('utf8');
      const records = parseHeartbeatSource(raw, topic);
      const latest = records.at(-1);
      if (latest) {
        this.applyHeartbeatRecord(latest);
        return;
      }

      this.recordCommandResponse(topic, raw);
    });

    client.on('error', (error: Error) => {
      this.lastError = error.message;
      this.publishStatus();
    });

    client.on('close', () => {
      this.lastDisconnectedAt = new Date().toISOString();
      this.publishStatus();
    });
  }

  private async connectTransport(client: MqttClient): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const onConnect = () => {
        cleanup();
        resolve();
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        client.off('connect', onConnect);
        client.off('error', onError);
      };

      client.once('connect', onConnect);
      client.once('error', onError);
    }).catch((error) => {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.publishStatus();
    });
  }

  private async publishCommand(
    command: Pick<MqttHardwareRuntimeCommand, 'kind' | 'topic' | 'payload'>
  ): Promise<MqttHardwareRuntimeCommandReceipt> {
    const requestId = extractRequestId(command.payload) ?? randomUUID();
    const payload = ensureRequestId(command.payload, requestId);
    const receipt: MqttHardwareRuntimeCommandReceipt = {
      kind: command.kind,
      requestId,
      topic: command.topic,
      payload,
      publishedAt: new Date().toISOString(),
      status: 'queued',
      response: null,
      responseAt: null,
    };

    this.lastCommand = receipt;
    this.lastCommandAt = receipt.publishedAt;
    this.publishStatus();

    if (!this.transport) {
      receipt.status = this.enabled ? 'failed' : 'queued';
      if (!this.enabled) {
        receipt.status = 'queued';
      }
      return receipt;
    }

    await new Promise<void>((resolve, reject) => {
      this.transport?.publish(command.topic, JSON.stringify(payload), { qos: this.qos as any }, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    })
      .then(() => {
        receipt.status = 'sent';
        this.lastCommand = receipt;
        this.publishStatus();
      })
      .catch((error) => {
        this.lastError = error instanceof Error ? error.message : String(error);
        receipt.status = 'failed';
        this.lastCommand = receipt;
        this.publishStatus();
      });

    return { ...receipt };
  }

  private applyHeartbeatRecord(record: ParsedHeartbeatRecord): void {
    this.latestHeartbeat = record;
    this.lastHeartbeatAt = new Date().toISOString();
    this.dialogueHardware = toDialogueModeHardwareSnapshot(record);
    this.publishStatus();
  }

  private recordCommandResponse(topic: string, rawPayload: string): void {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawPayload) as Record<string, unknown>;
    } catch {
      payload = {
        msg_type: 'raw',
        raw: rawPayload,
      };
    }

    if (!this.lastCommand) {
      this.publishStatus();
      return;
    }

    const requestId = typeof payload.request_id === 'string' ? payload.request_id : null;
    if (requestId && requestId !== this.lastCommand.requestId) {
      this.publishStatus();
      return;
    }

    this.lastCommand = {
      ...this.lastCommand,
      status: 'acknowledged',
      response: payload,
      responseAt: new Date().toISOString(),
    };
    this.publishStatus();
    this.emit('command_response', { topic, payload });
  }

  private publishStatus(): void {
    const status = this.getStatus();
    for (const listener of this.subscribers) {
      listener(status);
    }
    this.emit('status', status);
  }

  private buildMessage(): string {
    if (!this.enabled) {
      return 'MQTT 硬件运行时未启用';
    }
    if (this.lastError) {
      return `MQTT 运行时异常：${this.lastError}`;
    }
    if (this.latestHeartbeat) {
      return `MQTT 心跳正常，${this.latestHeartbeat.deviceCount} 个设备在线`;
    }
    if (this.connectionState() === 'connected') {
      return 'MQTT 已连接，等待心跳';
    }
    if (this.connectionState() === 'connecting') {
      return 'MQTT 正在连接';
    }
    return 'MQTT 硬件运行时等待启动';
  }

  private connectionState(): MqttHardwareRuntimeStatus['connectionState'] {
    if (!this.enabled) {
      return 'disabled';
    }
    if (this.lastError) {
      return 'error';
    }
    if (this.lastConnectedAt && !this.lastDisconnectedAt) {
      return 'connected';
    }
    if (this.started) {
      return 'connecting';
    }
    return 'disconnected';
  }

  private resolveCommandKind(deviceType: string, cmd: string): MqttHardwareRuntimeCommandKind {
    if (deviceType === 'microphone' && cmd === 'open') {
      return 'microphone_open';
    }
    if (deviceType === 'microphone' && cmd === 'close') {
      return 'microphone_close';
    }
    if (deviceType === 'speaker' && cmd === 'play') {
      return 'speaker_play';
    }
    if (cmd === 'stop' || cmd === 'stop_workflow') {
      return 'workflow_stop';
    }
    return 'hardware_command';
  }
}

export function createEmptyDialogueHardwareSnapshot(): DialogueModeHardwareSnapshot {
  return {
    source: 'mqtt_runtime',
    connectedComponents: [],
    missingRequirements: [],
    validationStatus: 'idle',
    lastEventType: 'snapshot',
    lastEventAt: new Date().toISOString(),
  };
}

export function toDialogueModeHardwareSnapshot(
  record: ParsedHeartbeatRecord
): DialogueModeHardwareSnapshot {
  const connectedComponents = record.devices
    .map((device) => toDialogueHardwareComponent(device))
    .filter((component): component is DialogueModeHardwareComponent => Boolean(component));

  return {
    source: 'mqtt_runtime',
    connectedComponents,
    missingRequirements: [],
    validationStatus: connectedComponents.length > 0 ? 'pending' : 'idle',
    lastEventType: 'heartbeat',
    lastEventAt: record.timestamp,
  };
}

export function normalizeHardwarePortId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  if (HEARTBEAT_PORT_MAP[trimmed]) {
    return HEARTBEAT_PORT_MAP[trimmed];
  }

  const compact = trimmed.replace(/[\s._-]+/g, '').toLowerCase();
  if (HEARTBEAT_PORT_MAP[compact]) {
    return HEARTBEAT_PORT_MAP[compact];
  }

  if (compact.includes('hdmi')) {
    return 'port_hdmi';
  }

  const portMatch = compact.match(/^port(\d+)$/);
  if (portMatch?.[1]) {
    return `port_${portMatch[1]}`;
  }

  const directMatch = trimmed.match(/^port_(\d+)$/);
  if (directMatch?.[1]) {
    return `port_${directMatch[1]}`;
  }

  return trimmed;
}

function toDialogueHardwareComponent(
  device: ParsedHeartbeatDevice
): DialogueModeHardwareComponent | null {
  const componentId = mapDeviceTypeToComponentId(device.deviceType);
  const portId = resolveHardwareInterfaceId(
    device.interfaceId ?? device.devicePort,
    device.devicePath,
  );
  const status = mapDeviceStatus(device.deviceStatus);

  if (!componentId) {
    return null;
  }

  return {
    componentId,
    deviceId: device.deviceName || componentId,
    modelId: getString(device.raw ?? {}, 'model_id') || getString(device.raw ?? {}, 'modelId') || '',
    displayName: device.deviceName || componentId,
    portId,
    status,
  };
}

function mapDeviceTypeToComponentId(raw: string): string {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return '';
  }

  const compact = normalized.replace(/[\s._-]+/g, '');
  return HEARTBEAT_DEVICE_TYPE_MAP[compact] ?? normalized;
}

function mapDeviceStatus(raw: string): DialogueModeHardwareComponent['status'] {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return 'connected';
  }

  if (['online', 'connected', 'ready'].includes(normalized)) {
    return 'connected';
  }
  if (['validating', 'checking'].includes(normalized)) {
    return 'validating';
  }
  if (['removed', 'offline'].includes(normalized)) {
    return 'removed';
  }
  if (['error', 'failed', 'fault'].includes(normalized)) {
    return 'error';
  }
  return 'connected';
}

function resolveHardwareInterfaceId(devicePort?: string, devicePath?: string): string {
  const normalizedPort = normalizeHardwarePortId(devicePort ?? '');
  if (normalizedPort) {
    return normalizedPort;
  }

  // HDMI 心跳经常只有设备路径，没有独立的 port= 字段。
  return normalizeHardwarePortId(devicePath ?? '');
}

function normalizeHeartbeatDevices(devices: unknown[]): ParsedHeartbeatDevice[] {
  const nextDevices: ParsedHeartbeatDevice[] = [];
  for (const device of devices) {
    if (!device || typeof device !== 'object') {
      continue;
    }

    const raw = device as Record<string, unknown>;
    const deviceType = getString(raw, 'device_type') || getString(raw, 'deviceType');
    const deviceStatus = getString(raw, 'device_status') || getString(raw, 'deviceStatus');
    const deviceName = getString(raw, 'device_name') || getString(raw, 'deviceName');
    const devicePath = getString(raw, 'device_path') || getString(raw, 'devicePath');
    const devicePort = getString(raw, 'device_port') || getString(raw, 'devicePort');
    const vidPid = getString(raw, 'vid_pid') || getString(raw, 'vidPid');

    if (!deviceType && !deviceName) {
      continue;
    }

    nextDevices.push({
      deviceType: deviceType || deviceName,
      deviceStatus: deviceStatus || 'online',
      deviceName: deviceName || deviceType || 'unknown',
      devicePath: devicePath || '',
      devicePort: devicePort || undefined,
      interfaceId: resolveHardwareInterfaceId(devicePort, devicePath),
      vidPid: vidPid || undefined,
      raw,
    });
  }

  return nextDevices;
}

function extractStatusPayload(payload: IncomingMqttPayload): IncomingMqttPayload | null {
  if (payload.msg_type === 'status_response') {
    return payload;
  }

  if (Array.isArray(payload.msg_content) && payload.msg_content.length > 0) {
    const candidate = payload.msg_content[0];
    if (candidate && typeof candidate === 'object') {
      const nested = candidate as IncomingMqttPayload;
      if (Array.isArray(nested.devices) || nested.msg_type === 'status_response') {
        return nested;
      }
    }
  }

  if (Array.isArray(payload.devices)) {
    return payload;
  }

  return null;
}

function cloneHeartbeatRecord(record: ParsedHeartbeatRecord): ParsedHeartbeatRecord {
  return {
    ...record,
    raw: { ...record.raw },
    devices: record.devices.map((device) => ({ ...device })),
  };
}

function cloneCommandReceipt(
  command: MqttHardwareRuntimeCommandReceipt
): MqttHardwareRuntimeCommandReceipt {
  return {
    ...command,
    payload: { ...command.payload },
    response: command.response ? { ...command.response } : command.response,
  };
}

function cloneDialogueHardwareSnapshot(
  snapshot: DialogueModeHardwareSnapshot
): DialogueModeHardwareSnapshot {
  return {
    ...snapshot,
    connectedComponents: snapshot.connectedComponents.map((component) => ({ ...component })),
    missingRequirements: snapshot.missingRequirements.map((requirement) => ({ ...requirement })),
  };
}

function getString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTimestamp(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
}

function normalizeNumericLike(value: string): number | string {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

function looksLikeJson(text: string): boolean {
  return text.startsWith('{');
}

function parseBracketTimestamp(line: string): string {
  const match = line.match(/^\[(.*?)\]/);
  if (!match?.[1]) {
    return new Date().toISOString();
  }

  const parsed = new Date(match[1]);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function ensureRequestId(
  payload: Record<string, unknown>,
  requestId: string
): Record<string, unknown> {
  if (typeof payload.request_id === 'string' && payload.request_id.trim()) {
    return payload;
  }

  return {
    ...payload,
    request_id: requestId,
  };
}

function extractRequestId(payload: Record<string, unknown>): string | null {
  const requestId = payload.request_id;
  return typeof requestId === 'string' && requestId.trim() ? requestId.trim() : null;
}
