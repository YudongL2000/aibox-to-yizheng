# Quickstart: 数字孪生唯一真相源同步

## Preconditions

- 启动 `backend` Agent 服务
- 启动 `frontend` Web 数字孪生入口
- 启动 `aily-blockly` Angular dev server
- 用 `npm run electron:reuse` 或等价方式拉起 Electron 客户端
- 确保数字孪生入口可打开独立子窗口

## Scenario 1: speaker 端口确认后实时更新数字孪生

1. 打开教学模式，推进到需要 mock 插入 speaker 的步骤
2. 打开数字孪生窗口，确认初始只显示底座 `device-001 / 5.glb`
3. 在右侧配置卡片中选择 `接口2 · 侧面B`
4. 点击确认/标记节点已处理
5. 验证 embedded 数字孪生无需刷新、重开窗口或手动切换即可出现 speaker，并挂载到 `port_2`

## Scenario 2: 冷启动嵌入页不会吞掉首帧 scene

1. 彻底关闭数字孪生窗口
2. 在教学模式中推进到可确认组件的步骤
3. 重新打开数字孪生窗口
4. 立刻确认一个组件端口
5. 验证即使嵌入页刚冷启动，仍能通过 ready-handshake/replay 得到最新 scene，而不是只显示底座

## Scenario 3: 同类逻辑节点不重复投影物理模型

1. 使用一个包含多个 `SPEAKER` 逻辑节点的教学 workflow
2. 完成 speaker 端口确认
3. 验证数字孪生里只显示一个 speaker 模型
4. 验证其接口位置来自最终确认的端口，而不是默认端口或随机旧端口

## Scenario 4: 数字孪生窗口保持在客户端顶部

1. 打开数字孪生窗口
2. 回到主客户端内点击聊天区、工作区和按钮区
3. 验证数字孪生窗口仍位于主客户端之上
4. 再次点击“数字孪生”入口，验证复用同一窗口并被带到最前

## Latest Validation

- 2026-04-03: `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npx tsc -p tsconfig.app.json --noEmit && npx tsc -p tsconfig.spec.json --noEmit` 通过
- 2026-04-03: `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npx ng build --configuration development` 通过
- 2026-04-03: `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/frontend && flutter analyze lib/module/home/home_workspace_page.dart lib/module/home/controller/digital_twin_console_controller.dart lib/module/login/ui/splash_page.dart` 通过
- 2026-04-03: `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/backend && npx vitest run --coverage.enabled false tests/unit/agents/digital-twin-scene.test.ts tests/unit/agent-server/agent-service.test.ts` 通过
