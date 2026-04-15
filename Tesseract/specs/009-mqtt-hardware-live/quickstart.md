# Quickstart: MQTT Hardware Live Integration

## Prerequisites

- Backend agent server can start locally.
- Desktop client `aily-blockly` can run against local backend.
- Flutter `frontend` web build can be loaded by the digital twin iframe.
- MQTT broker and hardware box are reachable.

## Scenario A: Heartbeat Drives Status And Digital Twin

1. Start backend agent server.
2. Start `aily-blockly` dev server and Electron shell.
3. Open the digital twin window.
4. Observe:
   - Header shows hardware `未连接`.
   - Bottom log shows waiting/idle runtime state.
   - Digital twin shows only base + built-in mic/speaker controls.
5. Send or wait for heartbeat from hardware.
6. Verify within 2 seconds:
   - Header flips to connected.
   - Bottom log appends readable heartbeat entries.
   - Digital twin mounts `cam/hand/car/screen` only at mapped ports.
   - `wifi/mimiclaw` appear in logs/state but not as 3D models.

## Scenario B: Teaching Or Dialogue Upload / Stop

1. Reach `all nodes configured` in teaching or dialogue branch.
2. Verify `上传到硬件` and `停止工作流` buttons are visible.
3. Click upload.
4. Verify:
   - Outbound command appears in bottom log.
   - Success/failure/timeout feedback is visible in UI.
5. Click stop.
6. Verify stop command and device ack are appended to bottom log.

## Scenario C: Built-in Microphone And Speaker

1. Open digital twin.
2. Click top `麦克风`.
3. Verify:
   - Command log entry appears.
   - Left preview pane opens.
   - Waveform begins animating or enters failed state within 5 seconds.
4. Click top `扬声器`.
5. Verify:
   - Play command is logged.
   - Speaker preview pane shows waveform or failed state within 5 seconds.

## Scenario D: Camera Preview

1. Ensure a camera component is online in heartbeat.
2. Click the camera model in the twin.
3. Verify:
   - Camera preview pane opens on the left.
   - P2P/WebRTC connection state becomes connecting/active/failed within 5 seconds.

## Scenario E: Dialogue Branching

1. Save a skill into skills library.
2. Ask for that capability in dialogue mode with required hardware online.
3. Verify branch A is chosen.
4. Repeat with one required hardware module offline.
5. Verify branch B is chosen and waits on heartbeat instead of mock insert buttons.
6. Ask for an unknown capability.
7. Verify branch C is chosen and teaching handoff is offered.
