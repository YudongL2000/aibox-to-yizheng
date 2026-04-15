# Feature Specification: 013 - 数字孪生心跳抖动修复

**Feature Branch**: `013-digital-twin-jitter-fix`  
**Created**: 2026-04-07  
**Status**: Draft  

## User Scenarios & Testing

### User Story 1 - 硬件运行时数字孪生界面不因心跳抖动 (Priority: P1)

用户在硬件运行状态下，数字孪生界面应保持稳定，不因每次心跳到来而触发重新渲染/闪烁。

**Why this priority**: 这是视觉核心缺陷 — 每次心跳都触发 IPC 调用导致 UI 抖动，严重影响用户体验。

**Independent Test**: 硬件连接并持续心跳，在组件构成不变的情况下，数字孪生界面无任何刷新抖动。

**Acceptance Scenarios**:

1. **Given** 硬件已连接并持续发送心跳，**When** 组件构成（modelId/modelCount/modelIds）未发生变化，**Then** `digitalTwin.setScene` IPC 不被重复调用。
2. **Given** 用户切换了机械臂配件（组件构成变化），**When** 新心跳到来，**Then** `digitalTwin.setScene` IPC 被调用一次，数字孪生更新。

---

### User Story 2 - syncDigitalTwinScene 仅在场景内容变化时触发 IPC (Priority: P1)

开发者角度，`syncDigitalTwinScene` 的去重逻辑只基于场景内容字段，与心跳时间戳或 source 无关。

**Why this priority**: 这是根因修复 — 确保去重语义与场景内容严格对齐，杜绝未来因 source/timestamp 变化引发的无效触发。

**Independent Test**: 相同 scene 内容的两次连续调用，第二次调用不触发 IPC。

**Acceptance Scenarios**:

1. **Given** 两次调用 `syncDigitalTwinScene`，scene 内容相同但 `source` 不同，**When** 第二次调用，**Then** 因 syncKey 相同而提前返回，IPC 不触发。
2. **Given** 两次调用 `syncDigitalTwinScene`，scene 内容相同但 `heartbeatAt` 不同，**When** 第二次调用，**Then** 因 syncKey 相同而提前返回，IPC 不触发。

---

### User Story 3 - syncKey 仅由场景内容字段组成 (Priority: P2)

开发者查阅 syncKey 构造逻辑，能清晰理解去重键只包含 `baseModelId`、`modelCount`、`modelIds` 三个场景语义字段，不含任何时序或来源元数据。

**Why this priority**: 代码可读性保障 — 确保维护者不会误将时序字段加回 syncKey。

**Independent Test**: 代码审查 `syncKey` 定义，无 `source`、`heartbeatAt`、`timestamp` 等时序字段。

**Acceptance Scenarios**:

1. **Given** 查看 `syncDigitalTwinScene` 方法中的 syncKey 构建，**Then** 只含 `baseModelId`、`modelCount`、`modelIds` 三个字段。
2. **Given** `source` 和 `heartbeatAt` 仍在 `logService.update` 调用中被记录，**Then** 调试信息不丢失，仅去重键语义纯化。

---

### Edge Cases

- `digitalTwinScene` 为 null 时，`sceneSummary.modelIds` 为空数组，syncKey 稳定为固定字符串，不因每次 null 心跳重复触发。
- `modelIds` 顺序发生变化但 modelCount 不变时，当前实现仍会触发更新（JSON.stringify 顺序敏感）— 这属于预期内的保守行为，不在本修复范围内。

## Requirements

- 单文件修改：`aily-blockly/src/app/services/hardware-runtime.service.ts`
- 不引入新依赖
- 不改变日志记录行为（`source` 和 `heartbeatAt` 仍出现在 logService.update 中）
- 保持 TypeScript 编译无错误
