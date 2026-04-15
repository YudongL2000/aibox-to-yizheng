# Frontend

## 范围
这里的“frontend”指 `aily-blockly` 的桌面前端整体: Electron 宿主 + Angular 渲染层 + 与本地 Tesseract/n8n runtime 的桥接面。

## 技术栈
- 宿主层: Electron
- 渲染层: Angular
- 工作流编辑: 嵌入式 n8n
- 兼容编辑器: legacy Blockly

## 开发命令
```bash
cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly
npm install
npm start
npm run electron
npm run build
```

## 环境准备
- Windows
  - 复制 `child/windows/*` 到 `child/`
  - 解压 `child/node-v22.*.*-win-x64.7z` 为 `child/node`
  - 解压 `child/aily-builder-*.7z` 为 `child/aily-builder`
- macOS
  - 复制 `child/macos/*` 到 `child/`

## 关键目录
- `src/app/`: Angular 应用主体
- `src/app/editors/tesseract-studio/`: Tesseract-first 工作区
- `src/app/editors/blockly-editor/`: legacy Blockly 路径
- `src/app/tools/aily-chat/`: 聊天 UI 与 viewer 生态
- `electron/`: 主进程、IPC、runtime manager、preload bridge
- `child/`: 编译、上传与本地工具链
- `public/`: 模型、图片、i18n 与静态资源

## 打包说明
- 生产构建通过 `npm run build`
- Windows 打包需要开启开发者模式
- 产物默认输出到 `dist/aily-blockly`

## 当前前端原则
- 新能力优先进入 Tesseract Studio，不复制到 legacy Blockly
- Electron 负责本地 runtime 生命周期，Angular 只通过 API 交互
- 文档入口以 `docs/` 为准，避免再向仓库根散落前端说明
