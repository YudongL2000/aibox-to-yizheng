# Quickstart: MQTT 硬件运行时闭环

## Goal

验证真实 heartbeat、真实命令下发、真实 skills 路由和数字孪生预览在客户端内形成闭环。

## Preconditions

- backend agent 服务已启动
- `aily-blockly` renderer/dev shell 已启动
- embedded frontend 数字孪生页已启动
- MQTT 可访问，且能收到 `qsf/{deviceId}/edge2cloud` heartbeat
- P2P/WebRTC 摄像头预览所需地址可访问

## Validation Flow

1. 启动客户端
   - 顶部显示硬件状态框
   - 底部日志窗口开始滚动 heartbeat（如果在线）
2. 观察 heartbeat 驱动的数字孪生挂载
   - `cam @ 3-1.4` -> `port_3`
   - `hand @ 3-1.6` -> `port_4`
   - `wifi @ 3-1.2` -> 状态可见但不显示模型
3. 在对话模式输入一个已存在于真实 skills 库中的技能需求
   - 不再出现 mock skill 选项
   - backend 选择 specs/001 A/B/C 或 MimicLaw
4. 完成所有节点配置
   - 出现 `上传到硬件` 与 `停止工作流`
5. 点击 `上传到硬件`
   - 底部日志记录 `▶ 发送到 qsf/.../cloud2edge`
   - 随后出现端侧回包或明确失败
6. 点击数字孪生顶部 `麦克风`
   - 左侧显示麦克风波形预览
   - 底部日志记录对应命令与回包
7. 点击顶部 `扬声器`
   - 左侧显示扬声器波形预览
   - 底部日志记录对应命令与回包
8. 点击数字孪生中的摄像头模型
   - 左侧出现摄像头画面或可读失败提示
9. 点击 `停止工作流`
   - 底部日志记录停止命令与回包

## Expected Result

- 客户端不再使用 mock 热插拔或 mock skill 数据
- heartbeat、命令、回包、数字孪生、预览面板和对话分流全部围绕同一个 backend runtime state 工作
- 用户无需离开客户端即可判断：
  - 硬件是否在线
  - 当前挂载是否正确
  - 工作流是否成功下发/停止
  - 摄像头/麦克风/扬声器是否真的工作
