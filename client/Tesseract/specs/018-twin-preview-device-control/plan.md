# Implementation Plan: 018-twin-preview-device-control

**Branch**: `018-twin-preview-device-control` | **Date**: 2026-04-07 | **Spec**: [spec.md](spec.md)

## Summary

将数字孪生窗口左侧 PREVIEW SESSIONS 面板从静态占位 UI 驱动为实时可操控状态：Angular iframe.component 订阅 MQTT 心跳 → 提取设备状态/streamUrl → postMessage 注入 Flutter 预览面板 → 用户通过顶栏按钮发送 MQTT 控制指令 → 复用已有工作流下发通道。

## Technical Context

**Language/Version**: TypeScript 5.x (Angular 17 / Node.js 18+), Dart 3.x (Flutter 3.22)  
**Primary Dependencies**: Angular, Electron IPC, RxJS, Flutter Web, ZLMRTCClient.js, paho-mqtt  
**Storage**: In-memory BehaviorSubject (HardwareRuntimeService), backend MQTT session state  
**Testing**: Vitest (backend), Angular/Karma (aily-blockly), flutter_test (frontend)  
**Target Platform**: Electron desktop (Windows/macOS), Flutter Web embedded iframe  
**Project Type**: Desktop app + embedded web app  
**Performance Goals**: 心跳 → 面板更新 ≤ 1s, WebRTC 首帧 ≤ 5s, MQTT 命令→回包 ≤ 2s  
**Constraints**: MQTT broker 外网延迟 ≤ 200ms, WebRTC 仅局域网, 单摄像头  
**Scale/Scope**: 单设备控制, 3 种设备类型 (camera/microphone/speaker)

## Constitution Check

Constitution 为空模板，无活跃约束。跳过 gate 检查。

## Project Structure

```text
specs/018-twin-preview-device-control/
├── spec.md
├── plan.md                    # 本文件
├── research.md                # Phase 0 研究结论
├── data-model.md              # Phase 1 数据模型
├── quickstart.md              # Phase 1 快速验证指南
├── contracts/
│   └── postmessage-protocol.md  # iframe ↔ Flutter 消息契约
├── checklists/
│   └── requirements.md        # 需求质量检查表
└── tasks.md                   # Phase 2 任务列表
```

### Source Code (变更涉及的文件)

```text
aily-blockly/src/app/windows/iframe/
└── iframe.component.ts            # 核心: 心跳→预览状态转换+控制命令中继

aily-blockly/src/app/services/
└── hardware-runtime.service.ts    # 已有: MQTT 心跳订阅 (需在子窗口 start)

aily-blockly/src/app/tools/aily-chat/
├── aily-chat.component.ts         # 已有: 工作流下发 action handler
└── services/
    └── tesseract-chat.service.ts  # 已有: 设备控制 IPC 封装

aily-blockly/electron/
├── tesseract-ipc.js               # 已有: IPC handler (mic/speaker/workflow)
└── tesseract-runtime.js           # 已有: HTTP→backend 设备控制调用

backend/src/agent-server/
├── server.ts                      # 已有: /api/agent/hardware/* 端点
├── agent-service.ts               # 已有: openMicrophone/playSpeaker facade
└── mqtt-hardware-runtime.ts       # 已有: MQTT publish + heartbeat parse

frontend/lib/module/home/
├── home_workspace_page.dart       # 已有: _handlePreviewStateMessage 注入
└── widget/
    └── digital_twin_preview_pane.dart  # 已有: 预览卡片 UI 渲染

frontend/web/model_viewer/
├── p2p_preview.html               # 已有: WebRTC 预览页
└── p2p_preview.js                 # 已有: ZLMRTCClient bridge
```

**Structure Decision**: 无需新建文件——所有变更基于已有的 iframe.component.ts 状态注入管道和已有的 backend MQTT 端点。核心工作是在 iframe.component 中新增心跳→预览状态转换逻辑和控制命令中继逻辑。
