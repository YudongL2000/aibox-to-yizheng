# Contract: Digital Twin Truth Sync

## 1. confirm-node request

```json
{
  "sessionId": "session-1",
  "nodeName": "code_speaker_execute_liu",
  "portId": "port_2",
  "topology": "port_2"
}
```

## 2. confirm-node response

The response may carry a temporary scene, but it is **not** the final source of truth:

```json
{
  "sessionId": "session-1",
  "response": {
    "type": "hot_plugging",
    "message": "请继续插拔组件",
    "digitalTwinScene": {
      "base_model_id": "model_5",
      "models": []
    }
  }
}
```

## 3. canonical config-state response

The persisted backend state is the canonical scene source:

```json
{
  "success": true,
  "data": {
    "sessionId": "session-1",
    "digitalTwinScene": {
      "display_mode": "multi_scene",
      "base_model_id": "model_5",
      "models": [
        {
          "id": "model_5",
          "url": "/assets/assets/models/5.glb"
        },
        {
          "id": "model_speaker",
          "url": "/assets/assets/models/4.glb",
          "interface_id": "port_2",
          "device_id": "speaker-001"
        }
      ]
    }
  }
}
```

## 4. parent -> embedded digital twin message

```json
{
  "type": "tesseract-digital-twin-scene",
  "scene": {
    "display_mode": "multi_scene",
    "base_model_id": "model_5",
    "models": [
      {
        "id": "model_5",
        "url": "/assets/assets/models/5.glb"
      },
      {
        "id": "model_speaker",
        "url": "/assets/assets/models/4.glb",
        "interface_id": "port_2",
        "device_id": "speaker-001"
      }
    ]
  }
}
```

## 5. embedded -> parent ready handshake

```json
{
  "type": "tesseract-digital-twin-ready"
}
```

## 6. Rules

- `confirm-node` may carry a transient `digitalTwinScene`, but renderer must prefer `config-state.data.digitalTwinScene` when available.
- `digitalTwinScene.models[]` must represent physical hardware mounts, not every logical workflow node.
- Every mounted non-base model must expose `interface_id`.
- Duplicate logical nodes for the same physical hardware must collapse to one model.
- Parent window must replay the latest canonical scene after receiving `tesseract-digital-twin-ready`.
- Embedded frontend may cache and replay the last inbound scene, but must never derive a new scene from local `portId/topology`.
- If no canonical scene is available, fallback to base scene must be explicit and traceable.
