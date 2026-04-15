# Quickstart: OpenClaw 对话模式

## 目标

在本地环境验证三条对话模式路径：
- 分支 A：技能已备，硬件就绪，直接开始互动
- 分支 B：技能已备，硬件缺失，插入后校验并点击“开始部署”
- 分支 C：未知技能，跳转教学模式并保留预填目标

## 环境准备

1. 启动 backend Agent：

```bash
cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend
npm run agent:dev
```

2. 启动 Flutter Web 工作台：

```bash
cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend
bash dev_web_start.sh
```

3. 如果通过桌面壳联调，再启动 Electron：

```bash
cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly
npm run electron
```

4. 本地硬件桥准备二选一：
- MiniClaw / Mimiclaw WebSocket：`ws://192.168.1.150:18789/`
- 现有 MQTT 代理：`device/usb/event`

## Branch A: 极速响应模式

前置条件：
- 技能库中存在“石头剪刀布”
- 机械手与摄像头均处于 ready

步骤：
1. 打开 AI 面板并切到“对话模式”。
2. 输入：`跟我玩石头剪刀布`
3. 观察 AI 是否在同一轮响应中给出玩法引导。
4. 观察设备是否同步触发初始化动作。
5. 验证页面未出现“开始部署”按钮且会话未跳转教学模式。

通过标准：
- 3 秒内进入互动准备态。
- 数字孪生和对话状态均显示已直接进入互动。

## Branch B: 协作引导模式

前置条件：
- 技能库中存在“石头剪刀布”
- 摄像头 ready，机械手缺失

步骤：
1. 输入：`跟我玩石头剪刀布`
2. 验证 AI 是否指出缺少“机械手”并提示用户插到允许的接口。
3. 模拟插入机械手。
4. 验证 UI 是否在 1 秒内进入“正在校验硬件/同步数据...”状态。
5. 校验成功后验证 AI 是否输出“已经准备好”类文案，并出现“开始部署”按钮。
6. 点击“开始部署”。
7. 验证硬件是否触发“苏醒”动作并进入互动状态。

异常路径：
1. 插错口或注入错误型号。
2. 验证 UI 是否停留在失败/待重试态。
3. 验证 AI 是否提示“好像没插对哦，再检查一下接口”一类温和文案。

## Branch C: 智能共创模式

前置条件：
- 技能库中不存在“给花浇水”

步骤：
1. 输入：`帮我给花浇水`
2. 验证 AI 是否以学习邀请方式回应，而不是简单报错。
3. 验证对话中是否出现“开启教学模式”按钮。
4. 点击该按钮。
5. 验证跳转后的教学页是否已经预填 `学习给花浇水`。
6. 验证无需再次手动输入原始需求。

## 建议的自动化切片

- backend：
  - 技能命中 + readiness 判断单元测试
  - 对话模式响应 envelope 契约测试
  - 缺件插拔后校验/部署状态迁移测试
- frontend：
  - AI 面板状态机 widget test
  - 教学接力预填测试
  - 硬件事件适配层标准化测试
