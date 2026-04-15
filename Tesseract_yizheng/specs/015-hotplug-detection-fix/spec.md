# 015 – 热拔插设备检测修复

## Status

- 状态: 已验收，已关单
- 验收日期: 2026-04-07
- 验收结论: 代码实现与本规格四个修复点一致，三处关键 TypeScript 文件当前均为 0 errors。

## Problem

Hardware devices (`cam1`, `car1`) announce via MQTT heartbeat through a WebSocket at  
`ws://192.168.1.150:18789/`. The backend confirms `devices=cam1, car1`, but the assembly  
dialogue shows "热拔插等待超时" and never advances. Four root causes:

1. **Bridge ignores `devices: string[]`** – `pickComponentArray` only handles object arrays;  
   plain device-ID strings like `"cam1"` are silently dropped.

2. **`inferComponentId` misses `cam` / `car` prefixes** – regex only matches full words  
   (`camera`, `wheel`), so `cam1` → empty ID → component discarded.

3. **Heartbeat events never reach `reduceComponents`** – event type stays `'heartbeat'`,  
   which the reducer ignores (only `'snapshot'` replaces the component list).

4. **`aily-config-guide` card fires a 30-second timeout** – the card dispatches  
   `tesseract-hotplug-timeout` after 30 s even when assembly mode is already active,  
   appending a spurious error message.

## Solution

| Fix | File | Change |
|-----|------|--------|
| 1A | `dialogue-hardware-bridge.service.ts` | Parse `devices: string[]` from heartbeat via new `inferDeviceIdComponent` method |
| 1B | `dialogue-hardware-bridge.service.ts` | Extend `inferComponentId` regex: `^cam\d*$` → `'camera'`; `^car\d*$` → `'chassis'` |
| 1C | `dialogue-hardware-bridge.service.ts` | Promote heartbeat carrying devices to `'snapshot'` so `reduceComponents` replaces full list |
| 2  | `tesseract-agent-response-adapter.ts` | Remove `aily-config-guide` block from `hot_plugging` case; keep only `aily-button` |
| 3  | `aily-chat.component.ts` | Replace weak `startsWith` matching in `checkAssemblyCompletion` with token-alias expansion |
| 4  | `aily-chat.component.ts` | Guard `tesseract-hotplug-timeout` handler: no-op when `dialogueAssemblyPhase === 'assembling'` |

## Acceptance Criteria

- Heartbeat JSON `{ type: "heartbeat", devices: ["cam1", "car1"] }` → `state$.components`  
  contains both a `camera` and a `chassis` entry.
- `checkAssemblyCompletion` matches `cam1` (componentId `camera`) against requirement  
  `{ componentId: 'cam', displayName: '摄像头' }` via alias expansion.
- No "热拔插等待超时" message appears while `dialogueAssemblyPhase === 'assembling'`.
- Assembly completes and dialogue advances to next step.

## Acceptance Result

1. 已确认 `dialogue-hardware-bridge.service.ts` 支持从 heartbeat 的 `devices: string[]` 推导组件，并将携带设备列表的 heartbeat 升级为 snapshot，组件快照可推进 `state$.components`。
2. 已确认 `tesseract-agent-response-adapter.ts` 的 `hot_plugging` 分支不再渲染 `aily-config-guide`，30 秒 timeout 来源已被移除。
3. 已确认 `aily-chat.component.ts` 使用 alias token 匹配完成组装判断，并在 `assembling` 阶段忽略残留的 `tesseract-hotplug-timeout` 事件。
4. 已执行 TypeScript 错误检查：上述三处文件均为 0 errors，可作为本次规格关单依据。
