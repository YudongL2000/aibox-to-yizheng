#!/usr/bin/env python3
"""
Mock user: WSS/WS on WS_PORT (default 443), HTTPS POST on HTTP_PORT (default 8080).
Sends messages with sender=user + USER_TOKEN; receives pushed `message` events (chatbot lines).

See protocol.md.
"""

from __future__ import annotations

import argparse
import json
import os
import ssl
import sys
import threading
import time
import urllib.error
import urllib.request

import websocket
from websocket._abnf import ABNF

from relay_urls import https_base, ws_url


def _parse_ws_json(message: str | bytes) -> dict:
    if isinstance(message, (bytes, bytearray)):
        return json.loads(message.decode("utf-8"))
    return json.loads(message)


def _ws_sslopt(url: str) -> dict | None:
    if url.startswith("wss://"):
        return {"cert_reqs": ssl.CERT_NONE, "check_hostname": False}
    return None


def _ssl_ctx() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def post_user_message(
    api_root: str,
    user_token: str,
    chatbot_id: str,
    user_id: str,
    text: str,
) -> tuple[int, str]:
    url = f"{api_root}/v1/messages"
    body = {
        "sender": "user",
        "chatbot_id": chatbot_id,
        "user_id": user_id,
        "text": text,
        "user_info": {"mock": "user"},
        "chatbot_info": {},
    }
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30, context=_ssl_ctx()) as resp:
            return resp.getcode(), resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")


def main() -> None:
    p = argparse.ArgumentParser(description="Mock user: HTTPS + WS")
    p.add_argument("--host", default=os.environ.get("RELAY_HOST", "115.191.66.174"))
    p.add_argument("--http-port", type=int, default=8080)
    p.add_argument(
        "--ws-port",
        type=int,
        default=443,
    )
    p.add_argument("--chatbot-id", default=os.environ.get("CHATBOT_ID", "mock_bot"))
    p.add_argument("--user-id", default=os.environ.get("USER_ID", "mock_user"))
    p.add_argument(
        "--reply-wait",
        type=float,
        default=float(os.environ.get("REPLY_WAIT_SEC", "1.0")),
    )
    args = p.parse_args()

    user_token = os.environ.get("USER_TOKEN", "usersecret")
    chatbot_id = args.chatbot_id
    user_id = args.user_id

    api_root = https_base(args.host, args.http_port)
    url_ws = ws_url(args.host, args.ws_port, "/ws")
    print(f"[user] HTTPS API base: {api_root}")
    print(f"[user] WebSocket URL: {url_ws}")

    ready = threading.Event()

    def on_message(_ws: websocket.WebSocketApp, message: str | bytes) -> None:
        if isinstance(message, (bytes, bytearray)):
            print(f"[user] recv binary frame ({len(message)} bytes): {bytes(message)!r}")
            print(f"[user] recv UTF-8 string after decode: {message.decode('utf-8')}")
        try:
            data = _parse_ws_json(message)
        except json.JSONDecodeError:
            print("[user] non-json:", message, file=sys.stderr)
            return
        typ = data.get("type")
        if typ == "handshake_ack":
            if data.get("ok"):
                print("[user] handshake ok — type lines to send (HTTPS POST, sender=user)")
                ready.set()
            return
        if typ == "error":
            print("[user] error:", data, file=sys.stderr)
            return
        if typ == "pong":
            return
        if typ == "message" and data.get("sender") == "chatbot":
            print(
                f"[user] message from=chatbot text={data.get('text')!r} id={data.get('message_id')} reply_to={data.get('reply_to_message_id')}"
            )
            return
        print("[user] recv:", data)

    def on_error(_ws: websocket.WebSocketApp, err: Exception) -> None:
        print("[user] ws error:", err, file=sys.stderr)

    def on_close(_ws: websocket.WebSocketApp, _c, _m) -> None:
        print("[user] connection closed")

    def on_open(ws: websocket.WebSocketApp) -> None:
        hs = {
            "type": "handshake",
            "role": "user",
            "chatbot_id": chatbot_id,
            "user_id": user_id,
            "token": user_token,
        }
        payload = json.dumps(hs).encode("utf-8")
        print(f"[user] handshake UTF-8 bytes ({len(payload)} bytes): {payload!r}")
        print(f"[user] handshake same payload as string: {payload.decode('utf-8')}")
        ws.send(payload, opcode=ABNF.OPCODE_BINARY)
        print("[user] sent handshake (binary frame) …")

    ws_app = websocket.WebSocketApp(
        url_ws,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close,
    )

    wst = threading.Thread(
        target=lambda: ws_app.run_forever(sslopt=_ws_sslopt(url_ws)),
        daemon=True,
    )
    wst.start()

    if not ready.wait(timeout=20):
        print("[user] timeout waiting for handshake_ack", file=sys.stderr)
        sys.exit(1)

    print("Enter message text (or 'quit'):")
    try:
        while True:
            line = sys.stdin.readline()
            if not line:
                break
            text = line.rstrip("\n\r")
            if text.lower() in ("quit", "exit", "q"):
                break
            if not text:
                continue
            code, resp = post_user_message(api_root, user_token, chatbot_id, user_id, text)
            print(f"[user] POST -> {code} {resp}")
            if code == 202 and args.reply_wait > 0:
                time.sleep(args.reply_wait)
    finally:
        ws_app.close()

    print("[user] done.")


if __name__ == "__main__":
    main()
