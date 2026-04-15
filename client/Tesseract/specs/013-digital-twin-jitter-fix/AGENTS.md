# 013-digital-twin-jitter-fix

> 修复数字孪生界面在每次硬件心跳时抖动的问题。

## 变更说明

`hardware-runtime.service.ts` 的 `syncDigitalTwinScene` 方法使用 `syncKey` 去重，原 key 包含 `source` 和 `heartbeatAt`，导致每次心跳均触发 IPC 调用。
修复后 `syncKey` 仅含场景内容字段（`baseModelId`, `modelCount`, `modelIds`），只有组件实际变化时才触发数字孪生更新。

## 文件清单

- `aily-blockly/src/app/services/hardware-runtime.service.ts` — 去重 key 修复

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
