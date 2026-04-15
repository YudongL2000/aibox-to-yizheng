#!/usr/bin/env bash
# [INPUT]: 依赖本地 Flutter SDK、Node.js、dev_web_proxy.js 与 18081/18082 端口可用性。
# [OUTPUT]: 对外提供一键开发启动入口，前台运行 Flutter web-server，后台托管同源代理。
# [POS]: 仓库根目录的单入口启动脚本，负责清理残留进程、统一端口并强制用户只走 18082。[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FLUTTER_BIN="${FLUTTER_BIN:-/mnt/c/Users/sam/.codex/flutter/bin/flutter}"
NODE_BIN="${NODE_BIN:-node}"
FLUTTER_HOST="${FLUTTER_HOST:-127.0.0.1}"
FLUTTER_PORT="${FLUTTER_PORT:-18081}"
PROXY_PORT="${PROXY_PORT:-18082}"
AGENT_API="${AGENT_API:-http://127.0.0.1:3005}"
LOCAL_DEVICE_EVENT_PREVIEW="${LOCAL_DEVICE_EVENT_PREVIEW:-false}"
LOG_DIR="${LOG_DIR:-$ROOT_DIR/.dart_tool/codex_dev_web}"
PROXY_LOG="$LOG_DIR/proxy.log"
FLUTTER_SERVER_URL="http://${FLUTTER_HOST}:${FLUTTER_PORT}"
APP_URL="http://${FLUTTER_HOST}:${PROXY_PORT}"

proxy_pid=""
node_cmd=""
proxy_entry="$ROOT_DIR/dev_web_proxy.js"

log() {
  printf '[dev-web] %s\n' "$1"
}

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    log "缺少依赖: $command_name"
    exit 1
  fi
}

resolve_node_bin() {
  local candidate

  for candidate in \
    "$NODE_BIN" \
    "/mnt/c/Program Files/nodejs/node.exe"
  do
    if [[ "$candidate" == */* ]]; then
      if [[ -x "$candidate" ]]; then
        printf '%s\n' "$candidate"
        return 0
      fi
      continue
    fi

    if command -v "$candidate" >/dev/null 2>&1; then
      command -v "$candidate"
      return 0
    fi
  done

  return 1
}

resolve_proxy_entry() {
  if [[ "$node_cmd" == *.exe ]]; then
    wslpath -w "$ROOT_DIR/dev_web_proxy.js"
    return 0
  fi

  printf '%s\n' "$ROOT_DIR/dev_web_proxy.js"
}

find_listen_pids() {
  local port="$1"
  lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
}

stop_port_listener() {
  local port="$1"
  local pids

  pids="$(find_listen_pids "$port")"
  if [[ -z "$pids" ]]; then
    return
  fi

  log "清理端口 ${port} 上的旧进程: ${pids//$'\n'/ }"
  kill $pids 2>/dev/null || true
  sleep 1

  pids="$(find_listen_pids "$port")"
  if [[ -n "$pids" ]]; then
    log "端口 ${port} 上仍有残留，执行强制结束"
    kill -9 $pids 2>/dev/null || true
  fi
}

cleanup() {
  if [[ -n "$proxy_pid" ]] && kill -0 "$proxy_pid" 2>/dev/null; then
    kill "$proxy_pid" 2>/dev/null || true
    wait "$proxy_pid" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

require_command lsof
require_command wslpath
if ! node_cmd="$(resolve_node_bin)"; then
  log "缺少依赖: node / node.exe"
  log "可通过 NODE_BIN=/path/to/node 覆盖默认路径"
  exit 1
fi
proxy_entry="$(resolve_proxy_entry)"

if [[ ! -x "$FLUTTER_BIN" ]]; then
  log "Flutter 不可执行: $FLUTTER_BIN"
  log "可通过 FLUTTER_BIN=/path/to/flutter 覆盖默认路径"
  exit 1
fi

mkdir -p "$LOG_DIR"

stop_port_listener "$PROXY_PORT"
stop_port_listener "$FLUTTER_PORT"

: >"$PROXY_LOG"
"$node_cmd" \
  "$proxy_entry" \
  "--port=$PROXY_PORT" \
  "--agent-api=$AGENT_API" \
  "--flutter-web-server=$FLUTTER_SERVER_URL" >"$PROXY_LOG" 2>&1 &
proxy_pid="$!"

sleep 1
if ! kill -0 "$proxy_pid" 2>/dev/null; then
  log "代理启动失败，日志如下:"
  cat "$PROXY_LOG"
  exit 1
fi

log "代理已启动: $APP_URL"
log "Flutter Web Server: $FLUTTER_SERVER_URL"
log "Agent API: $AGENT_API"
log "Node: $node_cmd"
log "代理日志: $PROXY_LOG"
log "浏览器只打开这个地址: $APP_URL"
log "Flutter 交互命令仍然可用，改默认场景后优先按大写 R"
log "本地设备预览: $LOCAL_DEVICE_EVENT_PREVIEW"

flutter_args=(
  run
  -d
  web-server
  --web-hostname
  "$FLUTTER_HOST"
  --web-port
  "$FLUTTER_PORT"
  --dart-define=USE_WEB_PROXY=true
  --dart-define=SKIP_LOGIN=true
  --dart-define=USE_LOCAL_DEVICE_EVENT_PREVIEW="$LOCAL_DEVICE_EVENT_PREVIEW"
  --no-pub
)

set +e
"$FLUTTER_BIN" "${flutter_args[@]}"
flutter_status=$?
set -e

exit "$flutter_status"
