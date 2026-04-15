# Implementation Plan: 017-hardware-assembly-list-fix

## Technical Context

**Stack**: TypeScript (backend Node.js), TypeScript (Angular/Electron aily-blockly), Dart (Flutter frontend)  
**Branch**: `017-hardware-assembly-list-fix`

## Fix Summary

| # | Fix | File(s) | Type |
|---|-----|---------|------|
| 1 | devices 字符串处理 | `dialogue-hardware-bridge.service.ts` | Bug |
| 2 | 全硬件快照 in hot_plugging metadata | `config-agent.ts` | Bug+Feature |
| 3 | 软件优先排序 | `config-agent.ts` | Feature |
| 4 | adapter 读取 allHardwareComponents | `tesseract-agent-response-adapter.ts` | Bug |
| 5 | 透传 allPendingHardwareNodeNames 全链路 | `iframe.component.ts`, `aily-chat.component.ts` | Feature |
| 6 | Flutter 存储并回传 allPendingHardwareNodeNames | `home_workspace_page.dart` | Feature |
| 7 | 批量自动确认剩余硬件节点 | `aily-chat.component.ts` | Feature |

## Fix 1: `readConnectedComponents` – 字符串 devices 支持

**File**: `aily-blockly/src/app/tools/aily-chat/services/dialogue-hardware-bridge.service.ts`

将原有:
```typescript
const rawDevices = map?.['devices'];
if (Array.isArray(rawDevices) && next.size === 0) {
  for (const deviceId of rawDevices) {
    if (typeof deviceId === 'string') { ... }
  }
}
```
改为统一规范化为 `string[]` 再处理，支持数组和逗号分隔字符串两种格式。

## Fix 2 & 3: `config-agent.ts` 改造

**File**: `backend/src/agents/config-agent.ts`

### Fix 3 - 软件优先排序
在 `extractConfigurableNodes` 末尾的 `return nodes` 之前，对 nodes 做稳定排序：非硬件节点在前，硬件节点在后。

### Fix 2 - 全硬件快照
在 `buildCurrentNodeResponse` 中，当响应类型为 `hot_plugging` 时：
1. 提取从 `currentNodeIndex` 开始所有剩余硬件节点
2. 映射 category → `{componentId, displayName}`
3. 向 metadata 注入 `allHardwareComponents` + `allPendingHardwareNodeNames`

常量映射（内联）:
```
CAM   → {camera,   摄像头}
MIC   → {microphone, 麦克风}
WHEEL → {chassis,  底盘}
HAND  → {mechanical_hand, 机械手}
SPEAKER → {speaker, 扬声器}
SCREEN  → {screen,  屏幕}
```

## Fix 4: `extractHotplugRequirements` 读取 allHardwareComponents

**File**: `aily-blockly/src/app/tools/aily-chat/services/tesseract-agent-response-adapter.ts`

在 `extractHotplugRequirements` 中，在现有 `metadata.requiredHardware` 判断之前，新增：  
若 `metadata.allHardwareComponents` 存在且非空，直接返回该列表（优先级最高）。

在 `hot_plugging` case 的 button payload 中，透传：
```typescript
allPendingHardwareNodeNames: Array.isArray(response?.metadata?.allPendingHardwareNodeNames)
  ? response.metadata.allPendingHardwareNodeNames
  : []
```

## Fix 5: iframe 透传链路

**File**: `aily-blockly/src/app/windows/iframe/iframe.component.ts`

1. `startAssemblyBridgeRelay` 从 `windowData['allPendingHardwareNodeNames']` 读取并加入 `tesseract-assembly-requirements` postMessage
2. `handleAssemblyCompleteFromTwin` 从 payload 读取并加入 CustomEvent data

## Fix 6: Flutter 存储并回传

**File**: `frontend/lib/module/home/home_workspace_page.dart`

1. 新增 `List<String> _assemblyPendingHardwareNodeNames = []` 字段
2. `_handleAssemblyRequirements` 读取 `payload['allPendingHardwareNodeNames']`
3. `_onAssemblyComplete` 在 postMessage 中加入 `allPendingHardwareNodeNames`
4. 清理时置空

## Fix 7: `startHardwareAssembly` + `confirmHotplugNodeAndContinue` 批量确认

**File**: `aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts`

1. `startHardwareAssembly(data)` – 在 openWindow data 中加入 `allPendingHardwareNodeNames: data?.allPendingHardwareNodeNames || []`
2. `tesseract-assembly-completed-from-twin` handler – 将 `data?.allPendingHardwareNodeNames` 传入 `confirmHotplugNodeAndContinue`
3. `confirmHotplugNodeAndContinue` – 新增第三参数 `allPendingHardwareNodeNames: string[] = []`；当前节点 confirm 完成后，排除当前节点，循环 confirm 剩余节点（单个失败静默跳过）

## Architecture Decision

- `allHardwareComponents` 和 `allPendingHardwareNodeNames` 只在 `hot_plugging` 类型响应中存在
- 批量确认是幂等的：已 configured 的节点再次 confirm 只会更新状态，不会报错
- Flutter 不做业务逻辑，只负责存储和回传 token 列表
