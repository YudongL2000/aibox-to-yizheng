# Tasks: 013 - 数字孪生心跳抖动修复

**Feature**: 013-digital-twin-jitter-fix  
**Status**: In Progress

---

## Task 1 — 修复 syncDigitalTwinScene 中的 syncKey 构造

**File**: `aily-blockly/src/app/services/hardware-runtime.service.ts`  
**Scope**: `syncDigitalTwinScene()` 方法中的 `syncKey` 变量  
**Priority**: P0

### 变更说明
从 syncKey 中移除 `source` 和 `heartbeatAt` 字段，只保留场景内容字段：

```typescript
// 仅以场景内容作为去重键，心跳时间戳与 source 变化不触发重渲染
const syncKey = JSON.stringify({
  baseModelId: sceneSummary.baseModelId,
  modelCount: sceneSummary.modelCount,
  modelIds: sceneSummary.modelIds,
});
```

### 验收条件
- [ ] `syncKey` 仅含 `baseModelId`、`modelCount`、`modelIds`
- [ ] 不含 `source` 或 `heartbeatAt`
- [ ] 编译无 TypeScript 错误

---

## Task 2 — 保留 logService.update 中的 source 和 heartbeatAt 调试信息

**File**: `aily-blockly/src/app/services/hardware-runtime.service.ts`  
**Scope**: `syncDigitalTwinScene()` 方法中的 `logService.update` 调用  
**Priority**: P1

### 变更说明
确认（不修改）`logService.update` 调用中仍包含 `source` 和 `heartbeatAt`，调试信息不丢失。
当前代码：
```typescript
this.logService.update({
  title: '数字孪生 · 场景同步',
  detail: [
    `source=${source}`,
    ...
    `heartbeat=${snapshot.hardware?.lastHeartbeatAt ?? snapshot.hardware?.latestHeartbeat?.timestamp ?? 'n/a'}`,
  ].join(' | '),
  ...
});
```
此调用保持不变，仅确认其存在。

### 验收条件
- [ ] `logService.update` detail 中仍含 `source=` 和 `heartbeat=` 字段
- [ ] 调试日志信息无丢失

---

## Task 3 — 更新 hardware-runtime.service.ts 的 L3 文件头

**File**: `aily-blockly/src/app/services/hardware-runtime.service.ts`  
**Scope**: 文件顶部 L3 注释头  
**Priority**: P2

### 变更说明
更新 `[OUTPUT]` 行，说明数字孪生场景同步现在基于内容去重：
- 旧: `数字孪生 scene 同步与连接态快照`
- 新: `数字孪生 scene 同步（内容去重，仅组件变化时触发 IPC）与连接态快照`

### 验收条件
- [ ] L3 头部 `[OUTPUT]` 行已更新
- [ ] `[PROTOCOL]` 行保留不变

---

## Task 4 — 创建 specs/013-digital-twin-jitter-fix/AGENTS.md

**File**: `specs/013-digital-twin-jitter-fix/AGENTS.md`  
**Priority**: P2

### 验收条件
- [ ] 文件存在，包含简短说明、修复内容描述、关键文件列表
- [ ] 含 `[PROTOCOL]` 行

---

## Task 5 — 更新 specs/AGENTS.md 添加 013 条目

**File**: `specs/AGENTS.md`  
**Priority**: P2

### 验收条件
- [ ] `013-digital-twin-jitter-fix/` 条目已添加到成员清单
- [ ] 描述简洁准确

---

## Dependency Order

```
Task 1 (syncKey 修复)
  └─ Task 2 (确认日志不变，可并行验证)
  └─ Task 3 (L3 头更新，依赖 Task 1 完成后确认最终状态)
Task 4 (AGENTS.md 创建，独立)
Task 5 (specs/AGENTS.md 更新，独立)
```
