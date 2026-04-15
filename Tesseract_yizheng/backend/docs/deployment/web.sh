#!/bin/sh
# [INPUT]: 依赖 docs/deployment/frp_tools/web.sh 的实际 FRP 启动能力
# [OUTPUT]: 对外提供仓库级部署入口，允许从任意 cwd 启动 FRP Web 隧道
# [POS]: deployment 目录的稳定包装层，被人工命令 `./docs/deployment/web.sh` 直接调用
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

exec "$SCRIPT_DIR/frp_tools/web.sh"
