# Tasks: 017-hardware-assembly-list-fix

## Phase 1 – Bug Fix: devices 字符串解析

- [x] **T1** `dialogue-hardware-bridge.service.ts` – 在 `readConnectedComponents` 中将 `rawDevices` 规范化为 `string[]`，支持逗号分隔字符串格式
  - 独立可测：注入 `{"devices":"cam1"}` 确认 `state$` 有 camera

## Phase 2 – Backend: 全硬件快照 + 软件优先排序

- [x] **T2** `config-agent.ts` – `extractConfigurableNodes` 末尾添加稳定排序：非硬件节点在前，硬件节点在后
- [x] **T3** `config-agent.ts` – `buildCurrentNodeResponse` 的 hot_plugging 响应中，注入 `allHardwareComponents` 和 `allPendingHardwareNodeNames` 到 metadata（两个返回路径都需处理：isStart=true 和 isStart=false）

## Phase 3 – Adapter: 读取 allHardwareComponents

- [x] **T4** `tesseract-agent-response-adapter.ts` – `extractHotplugRequirements` 最前面：若 `metadata.allHardwareComponents` 非空则直接返回
- [x] **T5** `tesseract-agent-response-adapter.ts` – `hot_plugging` case 的 button payload 加入 `allPendingHardwareNodeNames`

## Phase 4 – iframe 透传链路

- [x] **T6** `iframe.component.ts` – `startAssemblyBridgeRelay` 在 `tesseract-assembly-requirements` postMessage payload 中加入 `allPendingHardwareNodeNames`
- [x] **T7** `iframe.component.ts` – `handleAssemblyCompleteFromTwin` 在 CustomEvent data 中加入 `allPendingHardwareNodeNames`

## Phase 5 – aily-chat: 传递和批量确认

- [x] **T8** `aily-chat.component.ts` – `startHardwareAssembly` 在 openWindow data 中加入 `allPendingHardwareNodeNames`
- [x] **T9** `aily-chat.component.ts` – `tesseract-assembly-completed-from-twin` handler 将 `data?.allPendingHardwareNodeNames` 传入 `confirmHotplugNodeAndContinue`
- [x] **T10** `aily-chat.component.ts` – `confirmHotplugNodeAndContinue` 新增第三参数并实现批量自动确认逻辑

## Phase 6 – Flutter: 存储并回传

- [x] **T11** `home_workspace_page.dart` – 新增 `_assemblyPendingHardwareNodeNames` 字段
- [x] **T12** `home_workspace_page.dart` – `_handleAssemblyRequirements` 读取并存储 `allPendingHardwareNodeNames`
- [x] **T13** `home_workspace_page.dart` – `_onAssemblyComplete` 回传 `allPendingHardwareNodeNames`
- [x] **T14** `home_workspace_page.dart` – 清理时置空 `_assemblyPendingHardwareNodeNames`

## Phase 7 – 文档更新

- [x] **T15** `specs/AGENTS.md` – 添加 017 条目
- [x] **T16** `specs/017-hardware-assembly-list-fix/AGENTS.md` – 创建模块文档
- [x] **T17** 更新 `.specify` 或受影响文件的 L3 头部注释（如有修改)
