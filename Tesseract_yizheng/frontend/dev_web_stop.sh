#!/usr/bin/env bash
# [INPUT]: 依赖 lsof 与本地 18081/18082 端口状态。
# [OUTPUT]: 对外提供开发环境止血入口，结束 Flutter web-server 与本地代理残留进程。
# [POS]: 仓库根目录的兜底清理脚本，用于热重启异常或终端中断后回收单入口开发环境。[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

set -euo pipefail

FLUTTER_PORT="${FLUTTER_PORT:-18081}"
PROXY_PORT="${PROXY_PORT:-18082}"

log() {
  printf '[dev-web] %s\n' "$1"
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
    log "端口 ${port} 没有残留进程"
    return
  fi

  log "结束端口 ${port} 上的进程: ${pids//$'\n'/ }"
  kill $pids 2>/dev/null || true
  sleep 1

  pids="$(find_listen_pids "$port")"
  if [[ -n "$pids" ]]; then
    log "端口 ${port} 上仍有残留，执行强制结束"
    kill -9 $pids 2>/dev/null || true
  fi
}

if ! command -v lsof >/dev/null 2>&1; then
  log "缺少依赖: lsof"
  exit 1
fi

stop_port_listener "$PROXY_PORT"
stop_port_listener "$FLUTTER_PORT"

log "开发环境已清理"
