# Feature Specification: MQTT Image Upload (rec_img)

**Feature Branch**: `021-mqtt-image-upload`  
**Created**: 2026-04-08  
**Status**: Draft  
**Input**: User description: "Replace face image local save with MQTT rec_img base64 publish"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload Face Photo via MQTT (Priority: P1)

When a user reaches the "face recognition" configuration step, they select a profile and upload a photo. Instead of saving to a backend folder, the image is published directly to the hardware device via MQTT using the `rec_img` protocol.

**Why this priority**: This is the entire scope of the feature — the primary behavior change from disk-save to MQTT push.

**Independent Test**: User navigates to face-recognition config step, selects a profile, picks a photo — after submit the image arrives on the MQTT subscriber (not saved to `backend/data/uploads/`).

**Acceptance Scenarios**:

1. **Given** the hardware is connected via MQTT and user is on the `image_upload` config step, **When** user selects a profile and a JPEG image and submits, **Then** an MQTT message is published with `msg_type: "rec_img"` containing the image in base64 in the `data` field.
2. **Given** the user submits, **When** the MQTT publish succeeds, **Then** the frontend shows success confirmation and the session proceeds to the next config step.
3. **Given** the user submits a PNG image, **When** the system processes it, **Then** the `format` field in `msg_content[0]` reflects the correct image format (e.g. `"png"`).

---

### User Story 2 - Graceful Failure When Hardware Not Connected (Priority: P2)

When the user uploads an image but MQTT is not connected, the system provides a clear error — not a silent failure.

**Why this priority**: Hardware connectivity is optional in dev environments; silent failure would be confusing.

**Independent Test**: With no MQTT broker connected, submit an image — frontend receives a distinct error message.

**Acceptance Scenarios**:

1. **Given** MQTT is not connected, **When** user submits image, **Then** a user-friendly Chinese error message is returned and shown in the chat.
2. **Given** a partial MQTT publish failure, **When** the system detects the error, **Then** the session can retry — `showConfirmBuildButton` stays accessible.

---

### Edge Cases

- What happens when the image file is very large? (>2 MB base64 payload in MQTT message)
- What is the `image_id`? — derived from profile name + short uuid, e.g. `"alice_a1b2c3"`
- What are `width`/`height` values when not provided? — publish `0` as defaults (hardware ignores if zero)
- What if the data-URL prefix needs stripping? — strip `data:image/*;base64,` prefix before sending
- The old `/api/agent/upload-face` endpoint: remain or remove? — keep as no-op stub or remove route, do not write to disk

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `image_upload` config step MUST publish an MQTT message with `msg_type: "rec_img"` instead of saving the image to the backend filesystem.
- **FR-002**: The MQTT `msg_content[0]` MUST include `image_id` (profile+uuid), `format` (derived from file extension or data-URL media type), `width` (0 if unknown), `height` (0 if unknown), `encoding: "base64"`, and `data` (raw base64 without data-URL prefix).
- **FR-003**: On successful MQTT publish, the backend MUST return `{ success: true, profile, imageId }` to the frontend.
- **FR-004**: On MQTT publish failure, the backend MUST return `{ success: false, error: '<Chinese message>' }` with HTTP 200 (no 500).
- **FR-005**: The frontend MUST NOT call the old file-upload HTTP endpoint — MQTT publish replaces it entirely.
- **FR-006**: After a successful publish, the session MUST auto-advance via `confirmNode` with `face_info: profile` (no `face_url` required).
# Feature Specification: MQTT Image Upload (rec_img)

**Feature Branch**: `021-mqtt-image-upload`  
**Created**: 2026-04-08  
**Status**: Implemented  
**Input**: User description: "Replace face image local save with MQTT rec_img base64 publish"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Face Upload Goes Directly to Hardware (Priority: P1)

When a user reaches the FACE-NET configuration step, they select a face image and click upload. The application sends the image to the backend, and the backend immediately publishes a `rec_img` MQTT message to the hardware instead of saving the image to a local uploads directory.

**Why this priority**: This is the core business behavior of the feature. Without it, face recognition setup is still tied to the old local-file model.

**Independent Test**: Start the backend with MQTT enabled, upload a JPEG or PNG from the Flutter UI, and verify the backend log contains an `upload-face` request followed by a `rec_img` publish with matching `imageId`.

**Acceptance Scenarios**:

1. **Given** the user is on the FACE-NET upload step, **When** they select a JPEG image and click upload, **Then** the backend publishes `msg_type: "rec_img"` and `msg_content[0].data` contains the raw base64 payload without a data-URL prefix.
2. **Given** the uploaded image dimensions are available, **When** the publish payload is built, **Then** `width` and `height` are filled with the actual image dimensions.
3. **Given** the upload succeeds, **When** the FACE-NET node is confirmed, **Then** the node config continues with `face_info` only and no `face_url` field.

---

### User Story 2 - Upload Failure Is Visible and Recoverable (Priority: P2)

When MQTT is unavailable or the publish fails, the user sees a clear Chinese error instead of a false success state.

**Why this priority**: Silent failure makes the workflow look configured while the hardware has never received the sample image.

**Independent Test**: Start the UI with backend running but MQTT disconnected, upload an image, and verify the UI shows the backend error message and does not advance FACE-NET configuration.

**Acceptance Scenarios**:

1. **Given** MQTT transport is unavailable, **When** the upload button is clicked, **Then** the backend returns `{ success: false, error: '<Chinese message>' }` and the UI shows that error.
2. **Given** an upload failure occurs, **When** the user remains on the FACE-NET step, **Then** they can retry without restarting the whole session.

## Edge Cases

- Uploaded image is missing a standard extension: derive `format` from the data-URL media type.
- Uploaded image dimensions cannot be decoded: send `0` for `width` and `height` as a safe fallback.
- Profile contains spaces or symbols: sanitize it before deriving `image_id`.
- Backend receives empty `contentBase64`: reject with HTTP 400.
- FACE-NET workflow generation or normalization still tries to keep `face_url`: remove it from prompts, normalizers, and node rules.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The image upload button in the Flutter FACE-NET configuration flow MUST send the selected image to `/api/agent/upload-face` with `profile`, `fileName`, `contentBase64`, `width`, and `height`.
- **FR-002**: The backend `/api/agent/upload-face` handler MUST publish a MQTT payload in this shape:
  `{ msg_type: "rec_img", msg_content: [{ image_id, format, width, height, encoding: "base64", data }] }`.
- **FR-003**: The backend MUST strip the data-URL prefix before putting the image content into `msg_content[0].data`.
- **FR-004**: The backend MUST return `{ success: true, profile, imageId }` on publish success, and `{ success: false, profile, imageId: '', error }` on publish failure.
- **FR-005**: After a successful upload, FACE-NET confirmation MUST continue with `sub.face_info` only; `face_url` is no longer part of the FACE-NET config contract.
- **FR-006**: FACE-NET prompt fragments, workflow normalizers, node rules, and config models MUST no longer require `face_url`.
- **FR-007**: The backend MUST write structured logs for upload entry, MQTT publish intent, and MQTT publish success/failure so the feature can be audited from logs.

### Key Entities

- **UploadFaceRequest**: `{ profile, fileName, contentBase64, width, height }` from Flutter to backend.
- **UploadFaceResponse**: `{ success, profile, imageId, error? }` from backend to Flutter.
- **MqttRecImgMessage**: `{ msg_type: "rec_img", msg_content: [{ image_id, format, width, height, encoding, data }] }`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uploading a face sample no longer writes image files into `backend/data/uploads/`.
- **SC-002**: Uploading an image produces backend log evidence for request receipt and MQTT `rec_img` publish within the same request flow.
- **SC-003**: After a successful upload, FACE-NET confirmation advances with `face_info` only and no `face_url` field remains in backend source code.
- **SC-004**: Backend unit tests covering `publishImageViaMqtt()` pass after the change.

## Assumptions

- The backend MQTT runtime is already initialized before the user reaches FACE-NET upload.
- Flutter can decode image dimensions from the selected file before upload.
- `image_id` is derived as `<sanitized-profile>_<6-char-uuid-suffix>`.
- The backend upload endpoint remains the transport bridge, but its behavior is MQTT publish, not filesystem persistence.
---
