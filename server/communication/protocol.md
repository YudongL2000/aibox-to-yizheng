# WebSocket relay protocol (HTTPS API + WebSocket push + SQLite)

## Transport

| Port | Protocol | Purpose |
|------|----------|---------|
| **8080** | **HTTPS** (or HTTP if no TLS certs) | REST: `GET /health`, `POST /v1/messages` — **all chat messages are sent only here** |
| **80** | **WebSocket** (`ws://`) via reverse proxy | Path `/ws`: handshake, **receive-only** push events, optional `ping`/`pong` |

Typically nginx listens on **port 80** and proxies `/ws` to the relay’s internal WebSocket HTTP listener (e.g. port **8082** inside the container). Clients use **`ws://<host>/ws`** (default port 80).

## Roles

| Role      | WebSocket                         | HTTPS POST `sender` |
|-----------|-----------------------------------|---------------------|
| `chatbot` | Receives pushed `message` events | `"chatbot"`         |
| `user`    | Receives pushed `message` events | `"user"`            |

Chat content is **never** sent over WebSocket from clients; only the server **pushes** events to the **receiver**.

## Authentication (environment)

| Variable          | Use |
|-------------------|-----|
| `CHATBOT_TOKEN`   | WebSocket handshake `token` for `role: chatbot`; **Bearer token** when `sender` is `chatbot` on `POST /v1/messages` |
| `USER_TOKEN`      | WebSocket handshake for `role: user`; **Bearer token** when `sender` is `user` on `POST /v1/messages` |

## Handshake (WebSocket, first frame)

**Chatbot**

```json
{
  "type": "handshake",
  "role": "chatbot",
  "chatbot_id": "string",
  "token": "string"
}
```

**User**

```json
{
  "type": "handshake",
  "role": "user",
  "chatbot_id": "string",
  "user_id": "string",
  "token": "string"
}
```

**Success:** `{ "type": "handshake_ack", "ok": true }`  
**Failure:** `{ "type": "error", "code": "UNAUTHORIZED", "message": "..." }`

## HTTPS: send a message

`POST https://<host>:8080/v1/messages`

Headers:

- `Authorization: Bearer <token>` — must match **`sender`**:
  - `sender: "user"` → `USER_TOKEN`
  - `sender: "chatbot"` → `CHATBOT_TOKEN`
- `Content-Type: application/json`

Body:

```json
{
  "sender": "user" | "chatbot",
  "chatbot_id": "string",
  "user_id": "string",
  "text": "string",
  "user_info": {},
  "chatbot_info": {},
  "reply_to_message_id": "optional string"
}
```

`user_info` and `chatbot_info` are optional JSON objects (stored as JSON in the context database).

### Responses

| Status | Meaning |
|--------|---------|
| 202 | Accepted; message stored; `message_id` returned; push sent to receiver WebSocket if connected |
| 401 | Invalid or missing Bearer for `sender` |
| 400 | Invalid body |

Response body:

```json
{ "ok": true, "message_id": "<server-generated uuid>" }
```

The server **always** generates `message_id`.

## WebSocket: push event (server → client)

After a message is stored, the server pushes to the **receiver** (not the sender):

- `sender: "user"` → push to **chatbot** WebSocket for `chatbot_id`
- `sender: "chatbot"` → push to **user** WebSocket for `(chatbot_id, user_id)`

If the receiver is offline, the message remains stored; no WebSocket delivery until they reconnect (no backlog replay in MVP).

```json
{
  "type": "message",
  "message_id": "string",
  "sender": "user" | "chatbot",
  "chatbot_id": "string",
  "user_id": "string",
  "text": "string",
  "user_info": {},
  "chatbot_info": {},
  "reply_to_message_id": "string | null",
  "ts": 1710000000000
}
```

## WebSocket: client → server after handshake

Only:

```json
{ "type": "ping" }
```

Response: `{ "type": "pong", "ts": 1710000000000 }`

Sending chat content over WebSocket is **not** supported.

## Context database

- SQLite file path: `CONTEXT_DB_PATH` (default `/data/context.db` in Docker).
- Each accepted message is inserted with `message_id`, `sender`, ids, `text`, JSON metadata, `reply_to_message_id`, `ts`.

## Server rules

- At most one **chatbot** WebSocket per `chatbot_id` (new connection replaces the old).
- At most one **user** WebSocket per `(chatbot_id, user_id)` (new connection replaces the old).
