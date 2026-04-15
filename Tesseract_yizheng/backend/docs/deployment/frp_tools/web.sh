#!/bin/sh
# [INPUT]: 依赖当前目录下的 frpc 与 frpc.toml
# [OUTPUT]: 对外提供与 cwd 无关的 FRP Web 隧道启动命令
# [POS]: deployment/frp_tools 的真实启动脚本，被 deployment/web.sh 包装调用
# [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

set -eu

FRP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

exec "$FRP_DIR/frpc" -c "$FRP_DIR/frpc.toml"
