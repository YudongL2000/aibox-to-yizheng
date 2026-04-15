# aily-blockly/
> L2 | 父级: /AGENTS.md

成员清单
AGENTS.md: aily-blockly 模块地图，约束桌面端代码与文档的组织边界。
ARCHITECTURE.md: Electron + Angular + Tesseract + n8n 的运行时总览。
README.md: 英文项目入口，说明 Tesseract-first 定位、命令与主路径。
README_ZH.md: 中文项目入口，说明产品方向、开发入口与依赖前提。
docs/: 人类文档根目录，设计、规格、计划、可靠性与安全内容集中在此，见 docs/AGENTS.md。
electron/: Electron 主进程、IPC、preload 与本地 runtime 管理层。
src/: Angular 渲染端、编辑器、聊天、项目管理与工具系统。
child/: 编译、上传与打包所需的本地工具链资产。
public/: 静态资源、模型、品牌素材与 i18n 资源。
scripts/: 本地开发编排、Tesseract runtime 准备与桌面 smoke 检查脚本，见 scripts/AGENTS.md。
package.json: 前端与桌面端依赖、脚本和构建入口定义。

法则: 文档单根·运行时分层·Tesseract 优先·Blockly 回退

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
