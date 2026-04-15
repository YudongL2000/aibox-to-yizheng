# Digital Twin Preview Contract

## Overview

本契约定义 backend canonical scene 如何经 `aily-blockly` 传递给嵌入式 Flutter 数字孪生页，以及 preview/control 元数据如何同步。

## Scene Envelope

```json
{
  "type": "tesseract-digital-twin-scene",
  "revision": 42,
  "generatedAt": "2026-04-05T10:00:00.000Z",
  "scene": {
    "displayMode": "multi_scene",
    "baseModelId": "model_5",
    "interfaces": [],
    "models": []
  },
  "runtimeSnapshot": {
    "connectionState": "connected",
    "components": []
  },
  "previewSessions": [
    {
      "previewType": "microphone",
      "status": "active"
    }
  ],
  "topControls": ["microphone", "speaker"]
}
```

## Embedded Ready Handshake

Child -> parent:

```json
{
  "type": "tesseract-digital-twin-ready"
}
```

Child -> parent after successful consumption:

```json
{
  "type": "tesseract-digital-twin-consumed",
  "revision": 42
}
```

## Preview Commands

Top control or model-click actions are represented as:

```json
{
  "type": "tesseract-digital-twin-control",
  "control": "microphone_start"
}
```

or

```json
{
  "type": "tesseract-digital-twin-control",
  "control": "camera_preview",
  "componentId": "cam",
  "portId": "port_3"
}
```

## Failure Semantics

- If `previewSessions[*].status = "failed"`, UI MUST retain the preview panel frame and show a readable error state.
- If `runtimeSnapshot.connectionState != "connected"`, UI MUST keep built-in controls visible but disabled.
