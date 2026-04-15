#!/usr/bin/env python3
"""
Mock chatbot: WebSocket on WS_PORT (default 443), HTTPS replies on HTTP_PORT (default 8080).
Receives pushed `message` when sender=user; replies via HTTPS POST sender=chatbot.

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


def post_chatbot_message(
    api_root: str,
    chatbot_token: str,
    chatbot_id: str,
    user_id: str,
    text: str,
    reply_to_message_id: str | None = None,
) -> tuple[int, str]:
    url = f"{api_root}/v1/messages"
    body: dict = {
        "sender": "chatbot",
        "chatbot_id": chatbot_id,
        "user_id": user_id,
        "text": text,
        "user_info": {},
        "chatbot_info": {"mock": "chatbot"},
    }
    if reply_to_message_id:
        body["reply_to_message_id"] = reply_to_message_id
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {chatbot_token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30, context=_ssl_ctx()) as resp:
            return resp.getcode(), resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")


def main() -> None:
    p = argparse.ArgumentParser(description="Mock chatbot: HTTPS + WS")
    p.add_argument("--host", default=os.environ.get("RELAY_HOST", "115.191.66.174"))
    p.add_argument("--http-port", type=int, default=8080)
    p.add_argument(
        "--ws-port",
        type=int,
        default=443,
    )
    p.add_argument("--chatbot-id", default=os.environ.get("CHATBOT_ID", "mock_bot"))
    args = p.parse_args()

    token = os.environ.get("CHATBOT_TOKEN", "botsecret")
    chatbot_id = args.chatbot_id
    api_root = https_base(args.host, args.http_port)
    url = ws_url(args.host, args.ws_port, "/ws")
    print(f"[chatbot] HTTPS API base: {api_root}")
    print(f"[chatbot] WebSocket URL: {url}")

    ready = threading.Event()
    stop = threading.Event()

    def on_message(_ws: websocket.WebSocketApp, message: str | bytes) -> None:
        if isinstance(message, (bytes, bytearray)):
            print(f"[chatbot] recv binary frame ({len(message)} bytes): {bytes(message)!r}")
            print(f"[chatbot] recv UTF-8 string after decode: {message.decode('utf-8')}")
        try:
            data = _parse_ws_json(message)
        except json.JSONDecodeError:
            print("[chatbot] non-json:", message, file=sys.stderr)
            return
        typ = data.get("type")
        if typ == "handshake_ack":
            if data.get("ok"):
                print("[chatbot] handshake ok", flush=True)
                ready.set()
            return
        if typ == "error":
            print("[chatbot] error:", data, file=sys.stderr)
            return
        if typ == "pong":
            return
        if typ == "message" and data.get("sender") == "user":
            uid = data.get("user_id")
            text = data.get("text", "")
            mid = data.get("message_id")
            print(
                f"[chatbot] message from=user text={text!r} message_id={mid}",
                flush=True,
            )
            reply_text = f"我正在回复： {text}"
            code, resp = post_chatbot_message(
                api_root,
                token,
                chatbot_id,
                uid,
                reply_text,
                reply_to_message_id=mid if isinstance(mid, str) else None,
            )
            print(f"[chatbot] POST reply -> {code} {resp}", flush=True)
            return
        print("[chatbot] recv:", data, flush=True)

    def on_error(_ws: websocket.WebSocketApp, err: Exception) -> None:
        print("[chatbot] ws error:", err, file=sys.stderr)

    def on_close(_ws: websocket.WebSocketApp, _c, _m) -> None:
        print("[chatbot] connection closed")
        stop.set()

    def on_open(ws: websocket.WebSocketApp) -> None:
        hs = {
            "type": "handshake",
            "role": "chatbot",
            "chatbot_id": chatbot_id,
            "token": token,
        }
        payload = json.dumps(hs).encode("utf-8")
        print(f"[chatbot] handshake UTF-8 bytes ({len(payload)} bytes): {payload!r}")
        print(f"[chatbot] handshake same payload as string: {payload.decode('utf-8')}")
        ws.send(payload, opcode=ABNF.OPCODE_BINARY)
        print("[chatbot] sent handshake (binary frame), waiting for ack …")

    ws_app = websocket.WebSocketApp(
        url,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close,
    )

    def ping_loop() -> None:
        while not stop.is_set():
            time.sleep(25)
            if ready.is_set() and ws_app.sock and ws_app.sock.connected:
                try:
                    ping_payload = json.dumps({"type": "ping"}).encode("utf-8")
                    print(f"[chatbot] ping UTF-8 bytes ({len(ping_payload)} bytes): {ping_payload!r}")
                    print(f"[chatbot] ping same payload as string: {ping_payload.decode('utf-8')}")
                    ws_app.send(ping_payload, opcode=ABNF.OPCODE_BINARY)
                except Exception as e:
                    print("[chatbot] ping failed:", e, file=sys.stderr)
                    return

    t = threading.Thread(target=ping_loop, daemon=True)
    t.start()

    print(f"[chatbot] connecting (chatbot_id={chatbot_id}) …")
    ws_app.run_forever(sslopt=_ws_sslopt(url))


if __name__ == "__main__":
    main()
