# Tasks: 014-hardware-assembly-twin-ux

**Feature**: 硬件组装数字孪生 UX 重设计  
**Created**: 2026-04-07

## Task List

### T1 — 更新 L3 头部: tesseract-agent-response-adapter.ts ✅
**File**: `aily-blockly/src/app/tools/aily-chat/services/tesseract-agent-response-adapter.ts`  
**Action**: 在 [OUTPUT] 中追加 `extractHotplugRequirements`。

---

### T2 — 新增 extractHotplugRequirements 函数 ✅
**File**: `tesseract-agent-response-adapter.ts`  
**Location**: `buildConfigButtons` 闭合括号后、`buildHotplugPortOptions` 声明前  
**Action**: 插入 `export function extractHotplugRequirements(response: any): Array<{componentId: string; displayName: string}>` 实现，含 metadata.requiredHardware 优先路径、category map 回落与 displayName 兜底。

---

### T3 — 拆分 hot_plugging case 并生成组装按钮 ✅
**File**: `tesseract-agent-response-adapter.ts`  
**Location**: switch-case 中的六路 fall-through  
**Action**: 将 `hot_plugging` 提取为独立 case，输出 aily-config-guide + 「开始组装硬件」aily-button（payload: sessionId / components / nodeName）；其余五路保持原逻辑。

---

### T4 — 新增组装阶段状态字段到 AilyChatComponent ✅
**File**: `aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts`  
**Location**: `private skillCenterModalRef` 声明之后  
**Action**: 插入 `dialogueAssemblyPhase`、`dialoguePendingComponents`、`private assemblyMonitorSubscription`。

---

### T5 — 处理 tesseract-start-hardware-assembly 动作 ✅
**File**: `aily-chat.component.ts`  
**Location**: `runTesseractAction` 早期返回区（`tesseract-hotplug-timeout` 之后）  
**Action**: 插入 `if (action === 'tesseract-start-hardware-assembly') { await this.startHardwareAssembly(data); return; }`

---

### T6 — 新增 startHardwareAssembly 私有方法 ✅
**File**: `aily-chat.component.ts`  
**Location**: `runTesseractAction` 函数结束后、`continueConversation` 之前  
**Action**: 实现 startHardwareAssembly — 设置 assemblyPhase、调用 uiService.openWindow (digital-twin-assembly)、appendMessage 状态提示、订阅 bridgeService.state$。

---

### T7 — 新增 resolveAssemblyDigitalTwinUrl 私有方法 ✅
**File**: `aily-chat.component.ts`  
**Location**: 同 T6 区域（startHardwareAssembly 之后）  
**Action**: 复用 FloatSiderComponent 的 env-key 查找模式，构建携带 entry=digital-twin&source=aily-blockly 的 URL。

---

### T8 — 新增 checkAssemblyCompletion 私有方法 ✅
**File**: `aily-chat.component.ts`  
**Location**: 同 T6 区域  
**Action**: 检查 detected components 是否覆盖 required 列表（componentId startsWith 匹配），全部就绪时 unsubscribe、关闭窗口、调用 confirmHotplugNodeAndContinue。

---

### T9 — 新增 confirmHotplugNodeAndContinue 私有方法 ✅
**File**: `aily-chat.component.ts`  
**Location**: 同 T6 区域  
**Action**: push [thinking...] 消息、调用 tesseractChatService.confirmNode、applyDialogueResponseSideEffects、replaceLastAilyMessage，catch 中显示 aily-state error，finally 重置 assemblyPhase + dialoguePendingComponents。

---

### T10 — ngOnDestroy 清理 assemblyMonitorSubscription ✅
**File**: `aily-chat.component.ts`  
**Location**: `ngOnDestroy` 中 `this.dialogueHardwareBridgeService.disconnect()` 之前  
**Action**: 插入 assemblyMonitorSubscription 的 unsubscribe + null 赋值。

---

### T11 — 更新 L3 头部: aily-chat.component.ts ✅
**File**: `aily-chat.component.ts`  
**Action**: 在 [POS] 中追加硬件组装阶段管理职责描述。

---

### T12 — 创建/更新 AGENTS.md ✅
**Files**: `specs/014-hardware-assembly-twin-ux/AGENTS.md`、`specs/AGENTS.md`  
**Action**: 创建特性目录 AGENTS.md；更新 specs/ 根 AGENTS.md 追加 014 条目。
