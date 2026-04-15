#!/usr/bin/env bash
# [INPUT]: 依赖 backend/restart-agent-dev.sh、frontend/dev_web_start.sh、aily-blockly package scripts 与 macOS 上可用的 osascript/open。 
# [OUTPUT]: 对外提供 Apple Silicon macOS 单入口开发启动脚本，按固定顺序拉起 backend、Flutter 数字孪生 Web、Angular dev server 与 Electron 外部 backend 模式。
# [POS]: 根仓本地 orchestration 入口，服务于 macOS 开发机，把四段启动链压成一个命令，同时保持 backend 与客户端生命周期解耦。
# [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
AILY_DIR="$ROOT_DIR/aily-blockly"

OPEN_TERMINALS=1
RESTART_BACKEND=1
START_FRONTEND=1
START_ANGULAR=1
START_ELECTRON=1

usage() {
  cat <<'EOF'
Usage: ./dev-up-macos.sh [options]

Options:
  --no-backend     Skip backend restart
  --no-frontend    Skip Flutter digital-twin web startup
  --no-angular     Skip Angular dev server startup
  --no-electron    Skip Electron startup
  --inline         Run commands in current shell sequentially instead of opening Terminal tabs
  -h, --help       Show this help

Default behavior:
  1. backend      -> npm run agent:restart
  2. frontend     -> ./dev_web_start.sh
  3. aily-blockly -> npm start -- --host 127.0.0.1 --port 4200
  4. aily-blockly -> npm run electron:reuse:external
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-backend)
      RESTART_BACKEND=0
      shift
      ;;
    --no-frontend)
      START_FRONTEND=0
      shift
      ;;
    --no-angular)
      START_ANGULAR=0
      shift
      ;;
    --no-electron)
      START_ELECTRON=0
      shift
      ;;
    --inline)
      OPEN_TERMINALS=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[dev-up-macos] Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

require_dir() {
  local dir="$1"
  [[ -d "$dir" ]] || {
    echo "[dev-up-macos] Missing directory: $dir" >&2
    exit 1
  }
}

require_command() {
  local command_name="$1"
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "[dev-up-macos] Missing command: $command_name" >&2
    exit 1
  }
}

run_in_terminal() {
  local title="$1"
  local command="$2"

  osascript <<EOF
tell application "Terminal"
  activate
  do script "printf '\\\\e]1;${title}\\\\a'; cd ${ROOT_DIR@Q}; ${command}"
end tell
EOF
}

run_inline() {
  local title="$1"
  local command="$2"
  printf '\n[dev-up-macos] === %s ===\n' "$title"
  bash -lc "cd ${ROOT_DIR@Q}; ${command}"
}

dispatch() {
  local title="$1"
  local command="$2"

  if [[ "$OPEN_TERMINALS" -eq 1 ]]; then
    run_in_terminal "$title" "$command"
  else
    run_inline "$title" "$command"
  fi
}

require_dir "$BACKEND_DIR"
require_dir "$FRONTEND_DIR"
require_dir "$AILY_DIR"

if [[ "$OPEN_TERMINALS" -eq 1 ]]; then
  require_command osascript
fi

echo "[dev-up-macos] root=$ROOT_DIR"
echo "[dev-up-macos] mode=$([[ "$OPEN_TERMINALS" -eq 1 ]] && echo terminal-tabs || echo inline)"

if [[ "$RESTART_BACKEND" -eq 1 ]]; then
  dispatch \
    "Tesseract Backend" \
    "cd ${BACKEND_DIR@Q} && npm run agent:restart"
fi

if [[ "$START_FRONTEND" -eq 1 ]]; then
  dispatch \
    "Tesseract Frontend" \
    "cd ${FRONTEND_DIR@Q} && ./dev_web_start.sh"
fi

if [[ "$START_ANGULAR" -eq 1 ]]; then
  dispatch \
    "Tesseract Angular" \
    "cd ${AILY_DIR@Q} && npm start -- --host 127.0.0.1 --port 4200"
fi

if [[ "$START_ELECTRON" -eq 1 ]]; then
  dispatch \
    "Tesseract Electron" \
    "sleep 3; cd ${AILY_DIR@Q} && npm run electron:reuse:external"
fi

if [[ "$OPEN_TERMINALS" -eq 1 ]]; then
  echo "[dev-up-macos] Launched macOS Terminal tabs."
else
  echo "[dev-up-macos] Inline mode finished."
fi
