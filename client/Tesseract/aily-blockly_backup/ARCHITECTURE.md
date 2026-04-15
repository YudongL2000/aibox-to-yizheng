# Aily Blockly Architecture

## 定位
`aily-blockly` 当前不是单纯的 Blockly IDE，而是一个 Tesseract-first 的桌面硬件工作台。它保留 legacy Blockly 与硬件工具链，同时把自然语言 -> 工作流 -> 硬件配置这条主链收敛到本地桌面端。

## 运行时分层
- Electron Main: 托管窗口、IPC、preload，以及本地 Tesseract Agent sidecar 和本地 n8n runtime。
- Angular Renderer: 承载项目管理、Tesseract Studio、legacy Blockly、aily-chat、串口与工具面板。
- Tesseract Agent: 负责需求理解、蓝图生成、配置引导与工作流相关操作。
- n8n Runtime: 负责本地工作流编辑、保存、预览与部署。

## 项目模式
- Tesseract 项目
  - 标识文件: `.tesseract/manifest.json`
  - 工作流快照: `.tesseract/workflow.json`
  - 默认路由: `/main/tesseract-studio`
- Legacy Blockly 项目
  - 标识文件: `project.abi`
  - 默认路由: `/main/blockly-editor`
- 兜底模式
  - 无上述标识时进入代码编辑器

## 主数据流
1. 用户在桌面端描述硬件场景。
2. Electron 通过 preload API 把请求发给本地 Tesseract Agent。
3. Agent 生成蓝图或配置引导结果，Angular 通过 `aily-*` viewer 渲染。
4. 用户确认后，Electron 驱动本地 n8n 打开或更新工作流。
5. 后续配置通过项目文件、串口、构建链与运行时工具下发到硬件。

## 目录边界
- `electron/`: 只负责桌面宿主能力，不塞入整套 backend TypeScript 源码。
- `src/app/editors/tesseract-studio/`: Tesseract-first 工作区与嵌入式 n8n 壳层。
- `src/app/tools/aily-chat/`: 本地/远端聊天模式切换与 markdown viewer 生态。
- `src/app/components/float-sider/`: 按项目模式切换的侧栏入口。
- `child/`: Arduino/PlatformIO 相关本地工具。
- `docs/`: 当前项目的人类文档单根。

## 文档入口
- `docs/DESIGN.md`: 设计文档导航
- `docs/PLANS.md`: 计划与技术债导航
- `docs/PRODUCT_SENSE.md`: 产品目标、用户路径与边界
- `docs/RELIABILITY.md`: 运行前提、健康检查与故障入口
- `docs/SECURITY.md`: 路径、命令与审计安全约束
