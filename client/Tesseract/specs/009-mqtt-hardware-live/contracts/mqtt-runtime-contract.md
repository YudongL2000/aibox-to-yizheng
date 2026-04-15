# MQTT Runtime Contract

## Overview

本契约定义 `docs/dev/cloud_mqtt_example.py` 的消息形状如何被 backend 归一化成系统内部的 hardware runtime event。

## MQTT Topics

- Cloud to edge: `qsf/{deviceId}/cloud2edge`
- Edge to cloud: `qsf/{deviceId}/edge2cloud`

## Inbound Heartbeat Payload

Source: `edge2cloud`

```json
{
  "msg_type": "status",
  "msg_content": [
    {
      "device_type": "cam",
      "device_name": "cam1",
      "device_status": "online",
      "port": "3-1.4",
      "device_path": "/dev/video2",
      "vid_pid": "0BDC:8080"
    }
  ],
  "timestamp": 90169
}
```

## Internal Normalized Heartbeat Event

```json
{
  "type": "hardware_heartbeat",
  "deviceId": "aibox001",
  "receivedAt": "2026-04-05T10:00:00.000Z",
  "components": [
    {
      "componentType": "cam",
      "instanceId": "cam1",
      "status": "online",
      "physicalPort": "3-1.4",
      "mappedPort": "port_3",
      "devicePath": "/dev/video2",
      "vidPid": "0BDC:8080",
      "modelVisible": true
    }
  ]
}
```

## Outbound Command Shapes

### Workflow Upload

```json
{
  "msg_type": "workflow",
  "request_id": "uuid",
  "msg_content": [
    {
      "workflow_id": "backend-id",
      "workflow_name": "用户技能名",
      "steps": []
    }
  ]
}
```

### Workflow Stop

```json
{
  "msg_type": "workflow_stop",
  "request_id": "uuid",
  "msg_content": [{}]
}
```

### Device Command

```json
{
  "msg_type": "cmd",
  "request_id": "uuid",
  "msg_content": [
    {
      "device_type": "audio",
      "cmd": "start"
    }
  ]
}
```

Supported normalized command kinds:

- `workflow_upload`
- `workflow_stop`
- `microphone_start`
- `microphone_stop`
- `speaker_play`
- `speaker_stop`
- `camera_start`
- `camera_stop`

## Device Ack Payload

Source: `edge2cloud`

```json
{
  "msg_type": "cmd",
  "request_id": "uuid",
  "msg_content": [
    {
      "device_type": "audio",
      "cmd": "stop",
      "result": "成功",
      "message": "ok"
    }
  ],
  "timestamp": 106897
}
```

## Internal Normalized Log Event

```json
{
  "type": "hardware_log",
  "requestId": "uuid",
  "direction": "edge2cloud",
  "kind": "speaker_stop",
  "status": "ack",
  "message": "ok",
  "occurredAt": "2026-04-05T10:00:00.000Z"
}
```
