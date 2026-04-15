# scripts/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/AGENTS.md

成员清单
AGENTS.md: scripts 模块地图，约束本地开发、运行时准备与 smoke 校验脚本的职责边界。
electron-dev.js: 本地桌面开发编排器，负责补齐缺失的 Rollup native 依赖、注入 Electron 镜像环境，并支持“一次性拉起”/“复用现成 Angular dev server”/“只 attach 外部 backend”的 Electron 快启模式。
prepare-tesseract-runtime.js: 构建前 runtime 资产准备脚本，把 Tesseract 运行时依赖整理到桌面端可消费位置；n8n runtime 先 deploy 到临时目录，补齐顶层软链后再原子替换正式目录，避免 PNPM legacy deploy 在复用目录上报 `ERR_PNPM_ENOTEMPTY`。
tesseract-smoke.js: Tesseract 桌面链路 smoke 检查脚本，用来快速验证关键运行时资产和入口是否可用。

架构
- 该目录只承载“启动、准备、校验”三类脚本，不放业务逻辑与 UI 状态。
- `electron-dev.js` 现在直接调用 Electron 二进制，主动移除 `ELECTRON_RUN_AS_NODE` 污染，启动前修复 npm 漏装的 Rollup optional native 包，并把 dev server 的“慢启动”和“提前崩溃”分开判定；在 WSL 拉起 Windows `electron.exe` 时会把入口脚本路径转换成 Windows 形态，默认等待窗口也可用 `AILY_BLOCKLY_DEV_SERVER_WAIT_MS` 覆盖。
- 需要快启时，先常驻 `npm start`，再用 `npm run electron:reuse` 只拉 Electron 壳；复用模式的目标地址可由 `--dev-server-url` 或 `AILY_BLOCKLY_DEV_SERVER_URL` 指定。
- 若要让 backend 重启与客户端编译解耦，使用 `--backend-mode external` 或 `npm run electron:reuse:external`；此时 Electron 只能 attach 已启动 backend，不得再托管 backend 子进程。
- `prepare-tesseract-runtime.js` 不得直接把 `pnpm deploy` 输出写进长期复用目录；必须先落到新的临时 deploy 根，再在完整性校验通过后替换 `.tesseract-runtime/n8n`，否则 macOS 上的 PNPM legacy deploy 容易在清理旧包目录时报 `ENOTEMPTY`。
- 替换 `.tesseract-runtime/n8n` 时必须保留共享 `api-access.json`；它是 embedded n8n API key 的唯一真相源，丢失后 workflow create 会回退到陈旧 `.env` 凭据并触发 `401 unauthorized`。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
