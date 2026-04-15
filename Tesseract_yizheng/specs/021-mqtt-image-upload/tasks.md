# Tasks: 021-mqtt-image-upload

**Input**: Design documents from `/specs/021-mqtt-image-upload/`
**Prerequisites**: plan.md, spec.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Backend — MQTT Publish Method

**Purpose**: Add `publishRecImg()` to `MqttHardwareRuntime`, pass actual width/height, and log the full upload→publish chain.

**Independent Test**: Mock MQTT publish → verify `rec_img` payload shape, including width/height.

- [x] T001 [US1] Add `publishRecImg()` method to `backend/src/agents/mqtt-hardware-runtime.ts`
  - Accept `imageId`, `format`, `dataBase64`, `width`, `height`
  - Publish `msg_type: 'rec_img'` directly to `topicSend`
  - Add success/failure logging around MQTT publish callback

- [x] T002 [US1] Add `publishImageViaMqtt()` to `backend/src/agent-server/agent-service.ts`
  - Strip data-URL prefix
  - Derive format from file extension or data-URL media type
  - Generate `imageId`
  - Normalize width/height and forward them to `publishRecImg()`
  - Log publish intent and publish success

**Checkpoint**: New methods compile with no errors

---

## Phase 2: Backend — Route and FACE-NET Contract Cleanup

**Purpose**: Replace disk-write route with MQTT publish and remove `face_url` from FACE-NET config semantics.

- [x] T003 [US1] Replace `/api/agent/upload-face` in `backend/src/agent-server/server.ts`
  - Remove upload directory creation and filesystem writes
  - Accept `width` and `height` from the client
  - Log request entry, success, and failure
  - Return `{ success: true, profile, imageId }` or `{ success: false, error }`

- [x] T004 [US1] Remove `face_url` from backend FACE-NET model files
  - Updated `config-agent.ts`, `types.ts`, `workflow-config-normalizer.ts`, `gesture-identity-builder.ts`, `sub-field-extractor.ts`, `notes-spec.ts`, `entity-multiplication.ts`, and `node-rules.ts`
  - FACE-NET confirmation now relies on `face_info` only

**Checkpoint**: Backend compiles, route no longer writes to disk

---

## Phase 3: Frontend — Flutter Upload and Confirm Flow

**Purpose**: Send actual image dimensions, store `imageId`, and confirm FACE-NET with `face_info` only.

- [x] T005 [US1] Update `frontend/lib/server/api/agent_upload_api.dart`
  - Request DTO now sends `width` and `height`
  - Response DTO now parses `imageId` and `error`

- [x] T006 [US1] Update `frontend/lib/module/home/widget/ai_interaction_window.dart`
  - Decode image dimensions on selection
  - Upload with `width` and `height`
  - Store `imageId` instead of `url`
  - Confirm FACE-NET node with `{ face_info }` only
  - Keep image preview from base64 after upload

- [x] T007 [US2] Update `frontend/lib/server/api/agent_confirm_node_api.dart`
  - Remove `face_url` guidance from API comments

**Checkpoint**: Frontend compiles, no reference to `face_url`

---

## Phase 4: Tests

- [x] T008 [P] [US1] Extend `backend/tests/unit/agents/mqtt-image-upload.test.ts`
  - Cover base64 stripping, format derivation, offline error path, imageId generation, and width/height forwarding

- [ ] T009 [P] [US1] Run focused verification
  - [x] `cd backend && npm run build`
  - [x] `npx vitest run tests/unit/agents/mqtt-image-upload.test.ts --coverage.enabled false`
  - [ ] `cd ../frontend && flutter analyze` — blocked in current environment because `flutter` CLI is not installed / not on PATH

---

## Phase 5: Cleanup & Docs

- [x] T010 Update `backend/src/agents/mqtt-hardware-runtime.ts` L3 header — include `publishRecImg`
- [x] T011 Update `backend/src/agent-server/agent-service.ts` L3 header — include `publishImageViaMqtt`
- [x] T012 Clean `spec.md` / `plan.md` / `tasks.md` to match the actual Flutter + backend implementation
- [x] T013 Update root `AGENTS.md` — add 021-mqtt-image-upload to Recent Changes

---

## Dependencies

```
T001 → T002 → T003 (sequential: each builds on prior)
T004, T005 (parallel with each other, independent of backend)
T006 → T007 (sequential: test file before suite run)
T008, T009, T010 (parallel: documentation)
```

## Parallel Opportunities

- T004 + T005 can be worked together (same block, same file section)
- T006 + T008 + T009 + T010 can all be done in parallel after T003

## Implementation Notes

- `topicSend` in `MqttHardwareRuntime` is `qsf/${deviceId}/cloud2edge` — already set during init
- `this.transport` is the MQTT client — null if not connected
- `publishCommand` is private; `publishRecImg` calls `this.transport?.publish()` directly (same pattern)
- QoS level: use `this.qos` (same as other methods)
- No `request_id` field in `rec_img` messages (per user-provided protocol spec)
