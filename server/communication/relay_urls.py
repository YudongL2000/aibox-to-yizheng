"""Build URLs: HTTPS API on HTTP_PORT (default 8080), WebSocket on WS_PORT.

Public relay: use WS_PORT=443 for ``wss://<host>/ws`` (no :443 in URL).
Local/dev: WS_PORT=80 (ws) or 8082 (direct to Node).
"""


def https_base(host: str, port: int) -> str:
    p = int(port)
    if p == 443:
        return f"https://{host}"
    return f"https://{host}:{p}"


def ws_url(host: str, port: int, path: str = "/ws") -> str:
    p = int(port)
    if p in (80, 443):
        scheme = "wss" if p == 443 else "ws"
        return f"{scheme}://{host}{path}"
    scheme = "wss" if p == 8443 else "ws"
    return f"{scheme}://{host}:{p}{path}"
