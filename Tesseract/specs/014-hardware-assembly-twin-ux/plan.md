# Implementation Plan: 硬件组装数字孪生 UX 重设计

**Feature**: `014-hardware-assembly-twin-ux`  
**Created**: 2026-04-07

## Technical Context

### Affected Files

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `aily-blockly/src/app/tools/aily-chat/services/tesseract-agent-response-adapter.ts` | 修改 | 拆分 hot_plugging case，新增 extractHotplugRequirements 函数 |
| `aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts` | 修改 | 新增组装阶段状态字段、action 处理与私有方法 |

### Reused Patterns

- `uiService.openWindow({ path: 'iframe?url=...', windowRole: 'digital-twin-assembly', ... })` — 复用 FloatSiderComponent.openWorkflowTemplates() 的打开模式
- `DialogueHardwareBridgeService.state$` — 已有的 BehaviorSubject，实时推送已检测组件列表
- `tesseractChatService.confirmNode(...)` + `applyDialogueResponseSideEffects` + `replaceLastAilyMessage` — 与手动「标记节点已处理」完全相同的后续闭环

## Design Decisions

### 决策 1: hot_plugging 独立 case 而非修改 buildConfigButtons

**原因**: `buildConfigButtons` 仅用于 hot_plugging，拆出独立 case 比在 buildConfigButtons 内部条件分支更清晰，不增加分支复杂度。

### 决策 2: 每条 hot_plugging 响应独立触发组装窗口

**原因**: backend 逐节点返回热插拔响应，不存在"一次性确认所有节点"的协议支持。每条响应携带自己的 nodeName，组装完成后 confirmNode 该节点，backend 返回下一步（可能是另一个 hot_plugging 或 config_complete）。这与现有 confirmNode 协议完全兼容。

### 决策 3: 不引入 NgZone 手动包裹

**原因**: `dialogueHardwareBridgeService.state$` 订阅在组件中已有多处使用且均未包裹 NgZone。保持一致。

### 决策 4: resolveAssemblyDigitalTwinUrl 内联实现而非抽取到 service

**原因**: 此方法仅供 AilyChatComponent 的组装流程使用，与 FloatSiderComponent 的私有实现类似，不构成复用点，不应引入 service 耦合。

## Implementation Steps

### Step 1: tesseract-agent-response-adapter.ts

1. 在 `buildConfigButtons` 函数体关闭括号后、`buildHotplugPortOptions` 函数声明前，插入 `extractHotplugRequirements` 导出函数。
2. 在 `adaptTesseractAgentResponse` 的 switch-case 中，将 `hot_plugging` 从六路 fall-through 中提取出来，给它独立的 case block，生成「开始组装硬件」`aily-button`（含 components + nodeName payload）。其余五路 (`select_single` / `select_multi` / `image_upload` / `config_input` / `guidance`) 保持原有逻辑不变。
3. 更新文件头部 L3 [OUTPUT] 字段以包含 extractHotplugRequirements。

### Step 2: aily-chat.component.ts

1. 在 `private skillCenterModalRef` 声明后插入三个新状态字段：`dialogueAssemblyPhase`、`dialoguePendingComponents`、`assemblyMonitorSubscription`。
2. 在 `runTesseractAction` 的早期返回区（`tesseract-hotplug-timeout` 之后）插入 `tesseract-start-hardware-assembly` 的早期返回处理。
3. 在 `runTesseractAction` 函数结束后、`continueConversation` 函数开始前，插入四个新私有方法：
   - `startHardwareAssembly(data)` — 打开组装窗口、开始状态监听
   - `resolveAssemblyDigitalTwinUrl()` — 读取环境变量，构建数字孪生 URL
   - `checkAssemblyCompletion(detected, required, sessionId, nodeName)` — 检测全部就绪后触发确认
   - `confirmHotplugNodeAndContinue(sessionId, nodeName)` — confirmNode + replaceLastAilyMessage 闭环
4. 在 `ngOnDestroy` 的 `this.dialogueHardwareBridgeService.disconnect()` 前，插入 `assemblyMonitorSubscription` 清理代码。
5. 更新文件头部 L3 [POS] 字段以反映新的硬件组装阶段管理职责。

## Verification

- `get_errors` 检查两个被修改文件无 TypeScript 错误
- 回归验证：select_single / select_multi / image_upload / config_input / guidance 的 aily-config-guide 渲染路径不变
- 验证：hot_plugging 响应渲染出「开始组装硬件」按钮而不是「标记节点已处理」
