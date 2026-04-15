/**
 * [INPUT]: 依赖 MqttHardwareRuntime、heartbeat.log 样本与命令封装器
 * [OUTPUT]: 对外提供 MQTT 硬件运行时解析、映射、命令封装与 raw audio-test publish 回归测试
 * [POS]: tests/unit/agents 中守住 MQTT runtime 真相源的测试文件
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  createMicrophoneCloseMessage,
  createMicrophoneOpenMessage,
  createSpeakerPlayMessage,
  createWorkflowStopMessage,
  createWorkflowUploadMessage,
  MqttHardwareRuntime,
  normalizeHardwarePortId,
  parseHeartbeatText,
} from '../../../src/agents/mqtt-hardware-runtime';
import type { WorkflowDefinition } from '../../../src/agents/types';

class FakeMqttClient extends EventEmitter {
  published: Array<{ topic: string; payload: string }> = [];
  subscribed: Array<{ topic: string; qos?: number }> = [];
  publishError: Error | null = null;

  publish(
    topic: string,
    payload: string,
    _options: { qos?: number },
    callback: (error?: Error | null) => void
  ): void {
    this.published.push({ topic, payload });
    if (this.publishError) {
      const error = this.publishError;
      this.publishError = null;
      callback(error);
      return;
    }
    callback(null);
  }

  subscribe(
    topic: string,
    options: { qos?: number },
    callback: (error?: Error | null) => void
  ): void {
    this.subscribed.push({ topic, qos: options.qos });
    callback(null);
  }

  end(_force?: boolean, _options?: Record<string, unknown>, callback?: () => void): void {
    callback?.();
  }
}

function readHeartbeatLog(): string {
  return readFileSync(join(process.cwd(), '..', 'docs', 'dev', 'heartbeat.log'), 'utf8');
}

describe('MqttHardwareRuntime', () => {
  it('parses heartbeat log text and keeps canonical mount ports stable', () => {
    const records = parseHeartbeatText(readHeartbeatLog());
    const latest = records.at(-1);

    expect(records).toHaveLength(3);
    expect(latest?.deviceCount).toBe(3);
    expect(latest?.devices.map((device) => device.interfaceId)).toEqual([
      'port_3',
      'port_4',
      'port_1',
    ]);
    expect(normalizeHardwarePortId('3-1.2')).toBe('port_1');
    expect(normalizeHardwarePortId('3-1.4')).toBe('port_3');
    expect(normalizeHardwarePortId('3-1.7')).toBe('port_7');
    expect(normalizeHardwarePortId('/dev/hdmi')).toBe('port_hdmi');
  });

  it('encodes workflow upload and hardware commands with request ids', async () => {
    const transport = new FakeMqttClient();
    const runtime = new MqttHardwareRuntime({
      enabled: true,
      broker: '127.0.0.1',
      port: 1883,
      deviceId: 'aibox001',
      transportFactory: () => {
        queueMicrotask(() => transport.emit('connect'));
        return transport as never;
      },
    });

    await runtime.start();

    const workflow: WorkflowDefinition = {
      name: 'demo',
      nodes: [],
      connections: {},
    };

    const upload = await runtime.uploadWorkflow(workflow);
    const micOpen = await runtime.openMicrophone();
    const micClose = await runtime.closeMicrophone();
    const speakerPlay = await runtime.playSpeaker({ audioName: 'welcome.mp3' });

    expect(upload.kind).toBe('workflow_upload');
    expect(micOpen.kind).toBe('microphone_open');
    expect(micClose.kind).toBe('microphone_close');
    expect(speakerPlay.kind).toBe('speaker_play');
    expect(transport.subscribed[0]?.topic).toBe('qsf/aibox001/edge2cloud');
    expect(transport.published.map((item) => JSON.parse(item.payload))).toEqual([
      expect.objectContaining({ msg_type: 'workflow', request_id: expect.any(String) }),
      expect.objectContaining({
        msg_type: 'cmd',
        msg_content: [expect.objectContaining({ device_type: 'microphone', cmd: 'open' })],
      }),
      expect.objectContaining({
        msg_type: 'cmd',
        msg_content: [expect.objectContaining({ device_type: 'microphone', cmd: 'close' })],
      }),
      expect.objectContaining({
        msg_type: 'cmd',
        msg_content: [expect.objectContaining({ device_type: 'speaker', cmd: 'play' })],
      }),
    ]);

    const status = runtime.getStatus();
    expect(status.connectionState).toBe('connected');
    expect(status.dialogueHardware.connectedComponents).toEqual([]);
    expect(status.digitalTwinScene).toEqual(
      expect.objectContaining({
        interfaces: expect.arrayContaining([
          expect.objectContaining({ id: 'port_1' }),
          expect.objectContaining({ id: 'port_2' }),
          expect.objectContaining({ id: 'port_3' }),
          expect.objectContaining({ id: 'port_4' }),
          expect.objectContaining({ id: 'port_hdmi' }),
          expect.objectContaining({ id: 'port_7' }),
        ]),
        top_controls: expect.arrayContaining([
          expect.objectContaining({ role: 'microphone', status: 'idle' }),
          expect.objectContaining({ role: 'speaker', status: 'idle' }),
        ]),
      })
    );
    await runtime.stop();
  });

  it('keeps generic p2p hardware commands on the existing command channel and folds successful cmd_response into lastCommand', async () => {
    const transport = new FakeMqttClient();
    const runtime = new MqttHardwareRuntime({
      enabled: true,
      broker: '127.0.0.1',
      port: 1883,
      deviceId: 'aibox001',
      transportFactory: () => {
        queueMicrotask(() => transport.emit('connect'));
        return transport as never;
      },
    });

    await runtime.start();

    const receipt = await runtime.sendHardwareCommand({
      deviceType: 'p2p',
      cmd: 'start',
    });

    expect(receipt.kind).toBe('hardware_command');
    expect(JSON.parse(transport.published.at(-1)?.payload || '{}')).toEqual(
      expect.objectContaining({
        msg_type: 'cmd',
        request_id: receipt.requestId,
        msg_content: [
          expect.objectContaining({
            device_type: 'p2p',
            cmd: 'start',
          }),
        ],
      })
    );

    transport.emit(
      'message',
      'qsf/aibox001/edge2cloud',
      Buffer.from(JSON.stringify({
        msg_type: 'cmd_response',
        request_id: receipt.requestId,
        timestamp: 1712736000,
        device_type: 'p2p',
        cmd: 'start',
        result: 0,
        message: 'p2p stream started',
      }))
    );

    const status = runtime.getStatus();
    expect(status.lastCommand).toEqual(
      expect.objectContaining({
        requestId: receipt.requestId,
        status: 'acknowledged',
        response: expect.objectContaining({
          device_type: 'p2p',
          cmd: 'start',
          result: 0,
          message: 'p2p stream started',
        }),
      })
    );

    await runtime.stop();
  });

  it('publishes raw audio test envelopes without cmd wrappers and surfaces publish failures', async () => {
    const transport = new FakeMqttClient();
    const runtime = new MqttHardwareRuntime({
      enabled: true,
      broker: '127.0.0.1',
      port: 1883,
      deviceId: 'aibox001',
      transportFactory: () => {
        queueMicrotask(() => transport.emit('connect'));
        return transport as never;
      },
    });

    await runtime.start();

    const micReceipt = await runtime.publishAudioTestMessage('test_mic');
    const speakerReceipt = await runtime.publishAudioTestMessage('test_speaker');

    expect(micReceipt).toEqual(
      expect.objectContaining({
        messageType: 'test_mic',
        topic: 'qsf/aibox001/cloud2edge',
        payload: {
          msg_type: 'test_mic',
          msg_content: [],
        },
      })
    );
    expect(speakerReceipt).toEqual(
      expect.objectContaining({
        messageType: 'test_speaker',
        topic: 'qsf/aibox001/cloud2edge',
        payload: {
          msg_type: 'test_speaker',
          msg_content: [],
        },
      })
    );
    expect(transport.published.slice(-2).map((item) => JSON.parse(item.payload))).toEqual([
      {
        msg_type: 'test_mic',
        msg_content: [],
      },
      {
        msg_type: 'test_speaker',
        msg_content: [],
      },
    ]);

    transport.publishError = new Error('publish failed');
    await expect(runtime.publishAudioTestMessage('test_mic')).rejects.toThrow('publish failed');

    await runtime.stop();
  });

  it('seeds dialogue hardware from heartbeat json payloads', () => {
    const transport = new FakeMqttClient();
    const runtime = new MqttHardwareRuntime({
      enabled: false,
      broker: '127.0.0.1',
      port: 1883,
      deviceId: 'aibox001',
      transportFactory: () => transport as never,
    });

    runtime.ingestHeartbeat(
      {
        msg_type: 'status_response',
        timestamp: 123,
        devices: [
          {
            device_type: 'cam',
            device_status: 'online',
            device_name: 'cam1',
            device_path: '/dev/video2',
            device_port: '3-1.4',
            vid_pid: '0BDC:8080',
          },
          {
            device_type: 'wifi',
            device_status: 'online',
            device_name: 'wifi1',
            device_path: '/dev/tty_wifi',
            device_port: '3-1.2',
            vid_pid: '1E0E:9011',
          },
        ],
      },
      'qsf/aibox001/edge2cloud'
    );

    const status = runtime.getStatus();
    expect(status.latestHeartbeat?.deviceCount).toBe(2);
    expect(status.dialogueHardware.connectedComponents.map((item) => item.portId)).toEqual([
      'port_3',
      'port_1',
    ]);
    expect(status.dialogueHardware.connectedComponents[1]?.componentId).toBe('wifi');
    expect(status.digitalTwinScene).toEqual(
      expect.objectContaining({
        top_controls: expect.arrayContaining([
          expect.objectContaining({ role: 'microphone', status: 'idle' }),
          expect.objectContaining({ role: 'speaker', status: 'idle' }),
        ]),
      })
    );
  });

  it('maps car heartbeat devices into wheel-mounted digital twin models', () => {
    const runtime = new MqttHardwareRuntime({
      enabled: false,
      broker: '127.0.0.1',
      port: 1883,
      deviceId: 'aibox001',
    });

    runtime.ingestHeartbeat(
      {
        msg_type: 'status_response',
        timestamp: 456,
        devices: [
          {
            device_type: 'car',
            device_status: 'online',
            device_name: 'car1',
            device_path: '/dev/tty_car',
            device_port: '3-1.2',
            vid_pid: '1A86:7523',
          },
        ],
      },
      'qsf/aibox001/edge2cloud'
    );

    const status = runtime.getStatus();
    expect(status.dialogueHardware.connectedComponents).toEqual([
      expect.objectContaining({
        componentId: 'wheel',
        deviceId: 'car1',
        portId: 'port_1',
        status: 'connected',
      }),
    ]);
    expect(status.digitalTwinScene).toEqual(
      expect.objectContaining({
        models: expect.arrayContaining([
          expect.objectContaining({
            id: 'model_1',
            url: '/assets/assets/models/car.glb',
            interface_id: 'port_1',
            device_id: 'car1',
          }),
        ]),
      })
    );
  });

  it('maps hdmi heartbeat devices into the dedicated screen HDMI port without explicit port fields', () => {
    const runtime = new MqttHardwareRuntime({
      enabled: false,
      broker: '127.0.0.1',
      port: 1883,
      deviceId: 'aibox001',
    });

    const heartbeatText = [
      '[2025-03-01 10:00:00] 收到端侧状态',
      '主题: qsf/aibox001/edge2cloud',
      '- hdmi: online (screen) @ /dev/hdmi | vid_pid=0000:0000',
    ].join('\n');

    const parsed = runtime.ingestHeartbeat(heartbeatText, 'qsf/aibox001/edge2cloud');
    const status = runtime.getStatus();

    expect(parsed?.devices).toEqual([
      expect.objectContaining({
        deviceType: 'hdmi',
        deviceName: 'screen',
        interfaceId: 'port_hdmi',
      }),
    ]);
    expect(status.dialogueHardware.connectedComponents).toEqual([
      expect.objectContaining({
        componentId: 'screen',
        deviceId: 'screen',
        displayName: 'screen',
        portId: 'port_hdmi',
        status: 'connected',
      }),
    ]);
    expect(status.digitalTwinScene).toEqual(
      expect.objectContaining({
        interfaces: expect.arrayContaining([
          expect.objectContaining({ id: 'port_hdmi' }),
        ]),
        models: expect.arrayContaining([
          expect.objectContaining({
            id: 'model_2',
            url: '/assets/assets/models/screen.glb',
            interface_id: 'port_hdmi',
            device_id: 'screen',
          }),
        ]),
      })
    );
  });
});
