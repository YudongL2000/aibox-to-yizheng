#!/usr/bin/env bash
# [INPUT]: 依赖 backend/.env 中的 AGENT_PORT、系统进程查询工具(lsof/fuser/ss) 与 Windows netstat/taskkill 桥、npm agent:dev 脚本。
# [OUTPUT]: 对外提供彻底重启 backend agent 的根目录脚本，负责跨 Linux/WSL 与 Windows 宿主两侧清理占用端口的旧进程后重新拉起开发服务；默认只处理 backend 自身，显式传参时才级联关闭 Electron 父进程。
# [POS]: backend 根目录的本地运维入口，给手工联调提供稳定的“停旧进程 -> 起新进程”单向流程，也是 WSL + Windows 混合端口占用的单一处置点。
# [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/.env"
DEFAULT_PORT=3006
START_RETRY_ATTEMPTS=3
START_RETRY_DELAY_SECONDS=1

STOP_ONLY=0
DRY_RUN=0
PORT_OVERRIDE=""
KILL_ELECTRON_PARENT=0

# ------------------------------------------------------------
# CLI parsing
# ------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --stop-only)
      STOP_ONLY=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --port)
      PORT_OVERRIDE="${2:-}"
      shift 2
      ;;
    -h|--help)
      cat <<'EOF'
Usage: ./restart-agent-dev.sh [--stop-only] [--dry-run] [--port <port>] [--kill-electron-parent]

  --stop-only   Only stop the old backend process, do not start a new one.
  --dry-run     Print detected port/PIDs and intended actions without killing or starting.
  --port        Override AGENT_PORT from .env for this run.
  --kill-electron-parent
                If backend is hosted by aily-blockly Electron, also kill the parent Electron process.
EOF
      exit 0
      ;;
    --kill-electron-parent)
      KILL_ELECTRON_PARENT=1
      shift
      ;;
    *)
      echo "[restart-agent-dev] Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

read_env_value() {
  local key="$1"
  local file="$2"
  [[ -f "$file" ]] || return 1

  awk -F= -v search="$key" '
    $0 ~ "^[[:space:]]*" search "[[:space:]]*=" {
      value = substr($0, index($0, "=") + 1)
      sub(/[[:space:]]*#.*/, "", value)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      gsub(/^["'"'"'"'"'"'"'"'"']|["'"'"'"'"'"'"'"'"']$/, "", value)
      print value
      exit
    }
  ' "$file"
}

resolve_agent_port() {
  if [[ -n "$PORT_OVERRIDE" ]]; then
    echo "$PORT_OVERRIDE"
    return
  fi

  if [[ -n "${AGENT_PORT:-}" ]]; then
    echo "$AGENT_PORT"
    return
  fi

  local env_port=""
  env_port="$(read_env_value AGENT_PORT "$ENV_FILE" || true)"
  echo "${env_port:-$DEFAULT_PORT}"
}

listener_pids_for_port() {
  local port="$1"
  linux_listener_pids_for_port "$port"
}

linux_listener_pids_for_port() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | sort -u
    return
  fi

  if command -v fuser >/dev/null 2>&1; then
    fuser -n tcp "$port" 2>/dev/null | tr ' ' '\n' | awk 'NF' | sort -u
    return
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :$port" 2>/dev/null \
      | awk -F'pid=' 'NR > 1 && NF > 1 { split($2, a, ","); print a[1] }' \
      | sort -u
    return
  fi
}

windows_listener_pids_for_port() {
  local port="$1"

  if ! command -v netstat.exe >/dev/null 2>&1; then
    return
  fi

  netstat.exe -ano -p TCP 2>/dev/null \
    | tr -d '\r' \
    | awk -v port="$port" '
        $1 == "TCP" && $4 == "LISTENING" && $2 ~ ":" port "$" { print $5 }
      ' \
    | sort -u
}

run_windows_cmd() {
  local command="$1"

  if command -v cmd.exe >/dev/null 2>&1; then
    cmd.exe /d /c "$command"
    return
  fi

  return 1
}

windows_process_commandline() {
  local pid="$1"

  command -v powershell.exe >/dev/null 2>&1 || return 0

  powershell.exe -NoProfile -Command "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Get-CimInstance Win32_Process -Filter \"ProcessId=$pid\" | Select-Object -ExpandProperty CommandLine" 2>/dev/null \
    | tr -d '\r' \
    | sed '/^[[:space:]]*$/d'
}

windows_process_parent_pid() {
  local pid="$1"

  command -v powershell.exe >/dev/null 2>&1 || return 0

  powershell.exe -NoProfile -Command "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Get-CimInstance Win32_Process -Filter \"ProcessId=$pid\" | Select-Object -ExpandProperty ParentProcessId" 2>/dev/null \
    | tr -d '\r' \
    | awk 'NF { print; exit }'
}

is_backend_commandline() {
  local commandline="$1"

  [[ "$commandline" =~ backend[\\/](dist|src)[\\/]agent-server[\\/]index\.(js|ts) ]]
}

is_aily_blockly_parent_commandline() {
  local commandline="$1"

  [[ "$commandline" =~ aily-blockly[\\/].*electron[\\/]main\.js[[:space:]]+--serve ]]
}

linux_backend_pids() {
  if command -v pgrep >/dev/null 2>&1; then
    pgrep -f 'agent-server/index\.(ts|js)' 2>/dev/null | sort -u
    return
  fi

  ps -eo pid=,args= 2>/dev/null \
    | awk '/agent-server\/index\.(ts|js)/ && !/restart-agent-dev\.sh/ { print $1 }' \
    | sort -u
}

backend_targets_for_port() {
  local port="$1"
  local linux_pids=""
  local windows_pids=""

  linux_pids="$(linux_backend_pids || true)"
  if [[ -n "$linux_pids" ]]; then
    while read -r pid; do
      [[ -n "$pid" ]] || continue
      echo "linux:$pid"
    done <<< "$linux_pids"
  fi

  windows_pids="$(windows_listener_pids_for_port "$port" || true)"
  if [[ -n "$windows_pids" ]]; then
    while read -r pid; do
      [[ -n "$pid" ]] || continue

      local commandline=""
      local parent_pid=""
      local parent_commandline=""

      commandline="$(windows_process_commandline "$pid")"
      if ! is_backend_commandline "$commandline"; then
        continue
      fi

      parent_pid="$(windows_process_parent_pid "$pid")"
      if [[ -n "$parent_pid" ]]; then
        parent_commandline="$(windows_process_commandline "$parent_pid")"
      fi

      if [[ -n "$parent_pid" ]] && is_aily_blockly_parent_commandline "$parent_commandline"; then
        if [[ "$KILL_ELECTRON_PARENT" -eq 1 ]]; then
          echo "windows:$parent_pid"
        else
          echo "windows:$pid"
        fi
        continue
      fi

      echo "windows:$pid"
    done <<< "$windows_pids"
  fi
}

listener_targets_for_port() {
  local port="$1"
  local linux_pids=""
  local windows_pids=""

  linux_pids="$(linux_listener_pids_for_port "$port" || true)"
  windows_pids="$(windows_listener_pids_for_port "$port" || true)"

  if [[ -n "$linux_pids" ]]; then
    while read -r pid; do
      [[ -n "$pid" ]] || continue
      echo "linux:$pid"
    done <<< "$linux_pids"
  fi

  if [[ -n "$windows_pids" ]]; then
    while read -r pid; do
      [[ -n "$pid" ]] || continue
      echo "windows:$pid"
    done <<< "$windows_pids"
  fi
}

wait_for_port_release() {
  local port="$1"
  local attempts="${2:-20}"

  for ((i = 0; i < attempts; i += 1)); do
    if [[ -z "$(listener_targets_for_port "$port")" ]]; then
      return 0
    fi
    sleep 0.25
  done

  return 1
}

describe_target() {
  local scope="$1"
  local pid="$2"

  if [[ "$scope" == "linux" ]]; then
    ps -p "$pid" -o args= 2>/dev/null || true
    return
  fi

  local commandline=""
  commandline="$(windows_process_commandline "$pid")"
  if [[ -n "$commandline" ]]; then
    echo "$commandline"
    return
  fi

  if command -v tasklist.exe >/dev/null 2>&1; then
    tasklist.exe /FI "PID eq $pid" /FO CSV /NH 2>/dev/null | tr -d '\r' | head -n 1 || true
    return
  fi

  echo "<windows-process>"
}

terminate_targets() {
  local port="$1"
  local targets="$2"

  [[ -n "$targets" ]] || return 0

  echo "[restart-agent-dev] Releasing AGENT_PORT=$port"
  while read -r target; do
    [[ -n "$target" ]] || continue
    local scope="${target%%:*}"
    local pid="${target#*:}"
    local cmdline=""
    cmdline="$(describe_target "$scope" "$pid")"
    echo "[restart-agent-dev] TERM scope=$scope pid=$pid cmd=${cmdline:-<unknown>}"
    if [[ "$DRY_RUN" -eq 1 ]]; then
      continue
    fi

    if [[ "$scope" == "linux" ]]; then
      kill -TERM "$pid" 2>/dev/null || true
      continue
    fi

    if command -v cmd.exe >/dev/null 2>&1 || command -v taskkill.exe >/dev/null 2>&1; then
      run_windows_cmd "taskkill /PID $pid /T" >/dev/null 2>&1 || true
    fi
  done <<< "$targets"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    return 0
  fi

  if wait_for_port_release "$port"; then
    return 0
  fi

  while read -r target; do
    [[ -n "$target" ]] || continue
    local scope="${target%%:*}"
    local pid="${target#*:}"
    echo "[restart-agent-dev] KILL scope=$scope pid=$pid"

    if [[ "$scope" == "linux" ]]; then
      if kill -0 "$pid" 2>/dev/null; then
        kill -KILL "$pid" 2>/dev/null || true
      fi
      continue
    fi

    if command -v cmd.exe >/dev/null 2>&1 || command -v taskkill.exe >/dev/null 2>&1; then
      run_windows_cmd "taskkill /PID $pid /T /F" >/dev/null 2>&1 || true
    fi
  done <<< "$targets"

  wait_for_port_release "$port" || {
    echo "[restart-agent-dev] Failed to release port $port" >&2
    exit 1
  }
}

start_agent_dev_with_retry() {
  local port="$1"
  local attempt=1
  local log_file=""
  local status=0

  while (( attempt <= START_RETRY_ATTEMPTS )); do
    echo "[restart-agent-dev] Starting backend attempt=$attempt port=$port"
    log_file="$(mktemp)"

    set +e
    npm run agent:dev 2>&1 | tee "$log_file"
    status=${PIPESTATUS[0]}
    set -e

    if [[ "$status" -eq 0 ]]; then
      rm -f "$log_file"
      return 0
    fi

    if grep -q "EADDRINUSE: address already in use .*:$port" "$log_file"; then
      echo "[restart-agent-dev] Detected EADDRINUSE on port $port during startup"
      local retry_targets=""
      retry_targets="$(backend_targets_for_port "$port" || true)"
      if [[ -z "$retry_targets" ]]; then
        retry_targets="$(listener_targets_for_port "$port" || true)"
      fi
      if [[ -n "$retry_targets" ]]; then
        terminate_targets "$port" "$retry_targets"
      fi
      rm -f "$log_file"
      (( attempt += 1 ))
      if (( attempt <= START_RETRY_ATTEMPTS )); then
        sleep "$START_RETRY_DELAY_SECONDS"
        continue
      fi
    fi

    echo "[restart-agent-dev] Backend start failed with status=$status" >&2
    rm -f "$log_file"
    return "$status"
  done

  echo "[restart-agent-dev] Exhausted startup retries for port $port" >&2
  return 1
}

main() {
  local port=""
  local targets=""
  local listener_targets=""

  port="$(resolve_agent_port)"
  targets="$(backend_targets_for_port "$port" || true)"

  echo "[restart-agent-dev] root=$ROOT_DIR"
  echo "[restart-agent-dev] port=$port"
  echo "[restart-agent-dev] killElectronParent=$KILL_ELECTRON_PARENT"

  if [[ -n "$targets" ]]; then
    terminate_targets "$port" "$(printf '%s\n' "$targets" | sort -u)"
  fi

  listener_targets="$(listener_targets_for_port "$port" || true)"
  if [[ -n "$listener_targets" ]]; then
    terminate_targets "$port" "$(printf '%s\n' "$listener_targets" | sort -u)"
  elif [[ -z "$targets" ]]; then
    echo "[restart-agent-dev] No listener found on port $port"
  fi

  if [[ -n "$targets" || -n "$listener_targets" ]]; then
    :
  else
    echo "[restart-agent-dev] No backend target found on port $port"
  fi

  if [[ "$STOP_ONLY" -eq 1 ]]; then
    echo "[restart-agent-dev] stop-only complete"
    return 0
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[restart-agent-dev] dry-run complete"
    echo "[restart-agent-dev] would run: npm run agent:dev"
    return 0
  fi

  cd "$ROOT_DIR"
  start_agent_dev_with_retry "$port"
}

main
