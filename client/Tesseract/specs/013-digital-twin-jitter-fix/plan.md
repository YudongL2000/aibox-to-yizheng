# Plan: 013 - 数字孪生心跳抖动修复

**Feature**: 013-digital-twin-jitter-fix  
**Parent Spec**: spec.md  
**Tech Stack**: Angular 17+, TypeScript, Electron IPC  
**New Dependencies**: 无

---

## Root Cause Analysis

```
HardwareRuntimeService.syncDigitalTwinScene()
  └─ syncKey = JSON.stringify({
       source,            // ← 每次 poll/ws 事件都不同
       heartbeatAt,       // ← 每次心跳时间戳都不同
       baseModelId,
       modelCount,
       modelIds,
     })
  └─ syncKey !== lastSceneSyncKey  [始终为 true，因 source/heartbeatAt 变化]
       └─ digitalTwin.setScene IPC 每次心跳都触发
            └─ 数字孪生界面抖动 ❌
```

## Fix Strategy

**P0 — 去重键语义纯化**: 从 syncKey 中移除 `source` 和 `heartbeatAt`，仅保留真正代表场景内容变化的三个字段：`baseModelId`、`modelCount`、`modelIds`。

`source` 和 `heartbeatAt` 保留在 `logService.update` 调用中，调试信息不丢失。

---

## Files to Modify

| 文件 | 变更说明 |
|------|---------|
| `aily-blockly/src/app/services/hardware-runtime.service.ts` | 重构 `syncDigitalTwinScene` 中的 syncKey 构造，移除 `source` 和 `heartbeatAt`；更新 L3 文件头 |

---

## Design Decisions

### 1. 为何只移除这两个字段而不重构整个方法？

`source` 和 `heartbeatAt` 是心跳事件的元数据，与「场景内容是否变化」完全正交。
去重的语义应该是「组件构成是否变化」，而不是「这次事件从哪里来」或「发生在什么时间」。
最小化改动降低风险，避免引入新 bug。

### 2. 为何不在 `logService.update` 中移除这两个字段？

日志的目的是调试溯源，`source` 和 `heartbeatAt` 在日志中有价值（帮助排查是哪次 ws/poll 触发了更新）。
去重键只影响 IPC 调用频率，日志记录不受约束。

### 3. modelIds 顺序敏感性

`JSON.stringify` 对数组顺序敏感。若同一批组件以不同顺序出现，当前实现会触发一次额外的场景更新。
这是保守行为（宁可多更新一次），不在本修复范围内，可作为后续优化点（如排序后再 stringify）。

---

## Implementation Order

1. 修改 `syncDigitalTwinScene` 中的 syncKey 构造（移除 `source` 和 `heartbeatAt`）
2. 确认 `logService.update` 调用中 `source` 和 `heartbeatAt` 仍保留（不改动日志）
3. 更新 `hardware-runtime.service.ts` 的 L3 文件头
4. 创建 `specs/013-digital-twin-jitter-fix/AGENTS.md`
5. 更新根 `specs/AGENTS.md` 添加 013 条目
