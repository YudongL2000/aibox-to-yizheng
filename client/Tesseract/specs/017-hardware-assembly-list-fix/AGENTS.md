# specs/017-hardware-assembly-list-fix/
> L2 | 父级: specs/AGENTS.md

## 功能概述

硬件组装清单三联修 — 修复三个从真机测试截图中确认的 Bug/Gap。

## 成员清单

spec.md: 特性规格，用户故事 P1~P2、验收场景与功能需求（FR-001~007）。  
plan.md: 实现方案，7 个 Fix 的技术细节、改动文件、架构决策。  
tasks.md: 任务清单，T1~T17 按阶段排列，含独立测试标准。

## 变更范围

| 文件 | 改动 | Fix# |
|------|------|------|
| `dialogue-hardware-bridge.service.ts` | devices 字符串/逗号分隔格式支持 | 1 |
| `config-agent.ts` | 软件优先排序 + allHardwareComponents 快照 | 2, 3 |
| `tesseract-agent-response-adapter.ts` | extractHotplugRequirements 读 allHardwareComponents；按钮 payload 注入 allPendingHardwareNodeNames | 4, 5 |
| `iframe.component.ts` | 透传 allPendingHardwareNodeNames | 6, 7 |
| `aily-chat.component.ts` | 接收 + 批量自动确认 | 8, 9, 10 |
| `home_workspace_page.dart` | 存储并回传 allPendingHardwareNodeNames | 11–14 |

## 关键数据流

```
backend hot_plugging response
  └─ metadata.allHardwareComponents        ← 所有硬件组件视觉标识
  └─ metadata.allPendingHardwareNodeNames  ← 所有硬件节点名（批量确认用）
       ↓ adapter extractHotplugRequirements
  button payload.components
  button payload.allPendingHardwareNodeNames
       ↓ startHardwareAssembly
  openWindow data.allPendingHardwareNodeNames
       ↓ startAssemblyBridgeRelay (iframe)
  tesseract-assembly-requirements postMessage
       ↓ Flutter _handleAssemblyRequirements
  _assemblyPendingHardwareNodeNames
       ↓ Flutter _onAssemblyComplete
  tesseract-assembly-complete postMessage
       ↓ handleAssemblyCompleteFromTwin (iframe)
  CustomEvent data.allPendingHardwareNodeNames
       ↓ confirmHotplugNodeAndContinue
  批量 confirmNode 调用
```

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
