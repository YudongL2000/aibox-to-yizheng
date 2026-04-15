# Implementation Plan: MQTT Image Upload (rec_img)

**Branch**: `021-mqtt-image-upload` | **Date**: 2026-04-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/021-mqtt-image-upload/spec.md`

## Summary

Replace the old face-image local-save flow with a backend MQTT bridge that publishes `rec_img` payloads, and update the Flutter FACE-NET upload UI so it sends `width` and `height`, stores `imageId`, and confirms the node with `face_info` only.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js v22 (backend), Dart/Flutter (frontend)  
**Primary Dependencies**: existing `mqtt`, `express`, `dio`, `image_picker`, Flutter `dart:ui` image decoding  
**Storage**: no persistent image storage; upload route is now a transient MQTT bridge  
**Testing**: backend Vitest unit tests + frontend static analysis  
**Target Platform**: Node.js backend + Flutter app UI  
**Project Type**: multi-module app with backend service and Flutter client  
**Performance Goals**: upload request should publish MQTT payload within a single request round-trip  
**Constraints**: keep existing `/api/agent/upload-face` HTTP surface, remove `face_url` dependence from FACE-NET config semantics, avoid new dependencies  
**Scale/Scope**: one backend upload path, FACE-NET config model cleanup, one Flutter upload/confirm flow

## Constitution Check

- No new package dependency: pass
- No local image persistence in upload flow: pass
- Backend log evidence for operational audit: required and implemented
- FACE-NET config contract simplified instead of branching on legacy `face_url`: pass

## Project Structure

### Documentation (this feature)

```text
specs/021-mqtt-image-upload/
├── spec.md
├── plan.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code

```text
backend/src/agent-server/server.ts                    # HTTP upload-face route → MQTT bridge + logs
backend/src/agent-server/agent-service.ts             # publishImageViaMqtt + format/size normalization
backend/src/agents/mqtt-hardware-runtime.ts           # publishRecImg envelope + MQTT publish logs
backend/src/agents/config-agent.ts                    # FACE-NET upload confirmation contract
backend/src/agents/types.ts                           # FACE-NET sub model cleanup
backend/src/agents/orchestrator/workflow-config-normalizer.ts
backend/src/agents/workflow-architect/gesture-identity-builder.ts
backend/src/agents/workflow-architect/node/node-rules.ts
backend/src/agents/prompts/sub-field-extractor.ts
backend/src/agents/prompts/fragments/notes-spec.ts
backend/src/agents/prompts/fragments/entity-multiplication.ts
backend/tests/unit/agents/mqtt-image-upload.test.ts   # upload MQTT unit tests

frontend/lib/server/api/agent_upload_api.dart         # upload request/response DTOs
frontend/lib/server/api/agent_confirm_node_api.dart   # FACE-NET confirm comments/docs
frontend/lib/module/home/widget/ai_interaction_window.dart
                                                   # image selection dimensions + face_info-only confirm
```

## Data Flow

```text
Flutter picks image
  → read bytes
  → decode width/height
  → POST /api/agent/upload-face {
       profile,
       fileName,
       contentBase64,
       width,
       height
     }
  → AgentService.publishImageViaMqtt()
  → MqttHardwareRuntime.publishRecImg()
  → MQTT topic qsf/{deviceId}/cloud2edge payload:
     {
       msg_type: "rec_img",
       msg_content: [{
         image_id,
         format,
         width,
         height,
         encoding: "base64",
         data
       }]
     }
  → backend returns { success, profile, imageId }
  → Flutter confirm-node sub = { face_info }
```

## Risks and Mitigations

- **MQTT disconnected**: route returns structured Chinese error and does not advance FACE-NET config.
- **Missing dimensions**: frontend falls back to `0` width/height; backend also guards with `0` defaults.
- **Legacy `face_url` drift**: prompts, node rules, normalizers, and config-agent were updated together so generated FACE-NET nodes no longer depend on URL semantics.

## Verification Plan

1. Build backend to refresh `backend/dist` used by runtime.
2. Run focused backend unit tests for `publishImageViaMqtt()`.
3. Run frontend static analysis for Dart changes.
4. Trigger a FACE-NET image upload and verify backend logs show `HTTP upload-face request`, `AgentService: publishing face image over MQTT`, and `MqttHardwareRuntime: rec_img publish succeeded`.
