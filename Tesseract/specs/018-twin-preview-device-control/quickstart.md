# Quickstart: 018-twin-preview-device-control 验证指南

## 前提条件
1. Backend agent server 运行中: `cd backend && npm run agent:dev`
2. MQTT broker 可达 (115.190.193.254:17801)
3. 端侧设备在线并发送心跳
4. Aily Blockly Electron 已启动

## 验证步骤

### Step 1: 确认心跳流
打开 Electron DevTools → Console，搜索 `[HardwareRuntime]`，应看到 5 秒间隔的心跳日志。

### Step 2: 打开数字孪生窗口
在对话中触发硬件组装流程，或手动打开数字孪生视图。

### Step 3: 验证预览面板
- 左侧 PREVIEW SESSIONS 面板应展示设备卡片（麦克风、扬声器、Camera P2P）
- 不再显示"等待 preview/runtime state 注入"
- 摄像头卡片若有 streamUrl，点击“连接预览”后才开始 WebRTC 连接

### Step 4: 验证控制按钮
- 点击顶栏麦克风按钮 → DevTools 应显示 MQTT 命令发送日志
- 点击后按钮状态切换（IDLE → LIVE）
- 波形卡片展示动态纹理

### Step 5: 验证工作流下发
- 组装清单全部就绪后，右侧面板直接出现“下发工作流”“停止工作流”按钮
- 点击“下发工作流”后，确认工作流通过已有 `tesseract-hardware-upload` IPC / `cloud_mqtt_example.py` 对应消息形状下发到端侧
- 点击“停止工作流”后，确认工作流通过已有 `tesseract-hardware-stop` IPC 停止端侧运行
