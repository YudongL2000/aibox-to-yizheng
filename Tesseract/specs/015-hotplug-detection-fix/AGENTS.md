# specs/015-hotplug-detection-fix/
> L2 | 父级: specs/AGENTS.md

## 特性摘要
热拔插设备检测修复：修复 heartbeat `devices: string[]` 被桥接层丢弃、`cam1/car1` 无法映射为标准组件、组装判定 alias 过弱以及残留 timeout 误报，保证数字孪生与对话推进使用同一份硬件快照。

## 成员清单

spec.md: 功能规格与关单记录，描述四个根因、修复方案、验收标准与本次验收结论。

## 核心技术决策
- `DialogueHardwareBridgeService` 补齐 `devices: string[]` 解析与 `cam1/car1` -> 标准 `componentId` 归一化。
- heartbeat 只要携带组件列表，就提升为 `snapshot` 事件，避免 reducer 因 eventType 漏更新。
- `AilyChatComponent` 的组装完成判定改用 alias token 集合，而不是脆弱的字符串前缀比较。
- 组装阶段屏蔽残留 timeout 事件，并移除 `hot_plugging` 内联 `aily-config-guide`，从源头消除误报。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
