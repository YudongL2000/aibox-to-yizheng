# Quickstart: Mock 插拔端口同步验收

## 目标

验证默认底座、mock 插入、mock 拔出、多组件快照和 dialogue-mode 场景桥接是否都服从同一份 backend scene 真相。

## 步骤

1. 启动 `backend`
2. 启动 `aily-blockly`
3. 打开数字孪生窗口，确认初始只有底座 `device-001 / 5.glb`
4. 触发一次带 `portId=port_2` 的 mock 插入，确认组件实时挂到 `port_2`
5. 再触发一次带 `portId=port_7` 的 mock 插入，确认第二个组件挂到 `port_7`，第一个组件仍保留
6. 触发 `device_removed`，确认对应组件被移除，其余组件不受影响
7. 触发一次 snapshot，包含两件组件与不同端口，确认数字孪生一次性重建整份场景
8. 触发缺失或非法端口事件，确认系统不伪装成正确挂载，而是回退到可信状态

## 推荐自动化命令

- `cd backend && npm run build`
- `cd backend && npx vitest run --coverage.enabled false tests/unit/agent-server/agent-service.test.ts tests/unit/agent-server/dialogue-mode-contract.test.ts`
- `cd aily-blockly && npx tsc -p tsconfig.app.json --noEmit`
- `cd aily-blockly && npx tsc -p tsconfig.spec.json --noEmit`
- `cd aily-blockly && npx ng build --configuration development`
- `cd frontend && flutter test test/hardware_bridge_service_test.dart`

## 通过标准

- 默认底座正确显示
- 插入/拔出/快照都能在 1 秒内刷新数字孪生
- 不再出现“全部退化到 `port_2`”或“数字孪生残留上一帧组件”的现象
