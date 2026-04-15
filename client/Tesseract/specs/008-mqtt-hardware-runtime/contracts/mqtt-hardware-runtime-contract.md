# Contract: MQTT 硬件运行时闭环

## 1. Heartbeat Ingestion Contract

### Input

- Topic: `qsf/{deviceId}/edge2cloud`
- Payload shape:
  - `msg_type = status_response`
  - `timestamp`
  - `devices[]`

### Parsing Rules

- 每个 `devices[]` 元素至少尝试读取：
  - `device_type`
  - `device_status`
  - `device_name`
  - `device_path`
  - `device_port`
  - `vid_pid`
- `device_port` 映射：
  - `3-1.2 -> port_1`
  - `3-1.3 -> port_2`
  - `3-1.4 -> port_3`
  - `3-1.6 -> port_4`
  - `3-1.7 -> port_7`
- 未知接口：
  - 记录 warning
  - 不生成可渲染挂载

### Output

- 更新 backend `HardwareRuntimeState`
- 追加一条可读 heartbeat 日志
- 广播新的 canonical `digitalTwinScene`

## 2. Command Dispatch Contract

### Supported Commands

- `workflow`
- `workflow_stop`
- `cmd`

### Downstream Log Requirement

- 所有发送到 `cloud2edge` 的 payload 必须同步进入底部日志窗口
- 关联字段：
  - `request_id`
  - `msg_type`
  - 关键命令摘要

### Response Handling

- 端侧 `cmd_response`/其它回包必须按 `request_id` 或退化匹配关联到最近一次命令
- 结果进入：
  - backend runtime command result
  - `aily-blockly` 底部日志窗口
  - 相关按钮/预览状态反馈

## 3. Dialogue Routing Contract

### Input

- 用户自然语言输入
- 当前 `SkillLibraryEntry[]`
- 当前 `HardwareRuntimeState`

### Output

- `DialogueSkillMatch`
- 仅允许四种路由结果：
  - `branch_a`
  - `branch_b`
  - `branch_c`
  - `mimiclaw`

### Rules

- 前端不得保留 mock skills 或硬编码快捷技能判断
- 已命中技能且硬件满足：走 A
- 已命中技能但硬件不满足：走 B
- 未命中技能但属于技能学习诉求：走 C
- 其余自然对话：走 MimicLaw

## 4. Digital Twin Consumer Contract

### Canonical Scene Fields

- detachable mounts 仅来自 heartbeat 解析结果
- built-in controls 固定包含：
  - `microphone`
  - `speaker`
- preview pane state 包含：
  - `camera`
  - `microphone`
  - `speaker`
- 每次更新必须携带 `revision`

### Consumer Behavior

- `aily-blockly` 与 embedded frontend 只消费 canonical scene，不自行推导组件挂载
- `wifi` 与 `mimiclaw` 不生成 3D 外设模型
- 摄像头模型点击触发 camera preview
- 顶部 mic/speaker 按钮触发内置外设命令与预览

## 5. Preview Contracts

### Camera Preview

- Trigger: 用户点击数字孪生中的摄像头模型
- Runtime requirement:
  - 发起 P2P/WebRTC 连接
  - 左侧显示视频预览
  - 失败时显示明确错误状态

### Microphone Preview

- Trigger: 用户点击顶部麦克风按钮
- Side effects:
  - 下发麦克风打开命令
  - 左侧显示波形预览
  - 日志显示命令与结果

### Speaker Preview

- Trigger: 用户点击顶部扬声器按钮
- Side effects:
  - 下发播放示例音频命令
  - 左侧显示波形预览
  - 日志显示命令与结果
