# specs/014-hardware-assembly-twin-ux/
> L2 | 父级: specs/AGENTS.md

## 特性摘要
硬件组装数字孪生 UX 重设计：将 hot_plugging 节点从内联聊天卡片移入数字孪生专用窗口，以「开始组装硬件」按钮分隔软件配置阶段与硬件组装阶段，心跳全部就绪后自动关闭组装窗口、确认节点并无缝衔接后续工作流闭环。

## 成员清单
spec.md: 用户故事与验收场景，覆盖两阶段分离、组装窗口生命周期与 confirmNode 闭环。
plan.md: 技术方案，设计决策与两文件改动步骤说明。
tasks.md: 依序排列的 12 条任务，含文件路径与插入位置。

## 核心技术决策
- hot_plugging 从六路 fall-through 中独立为单独 case，输出「开始组装硬件」aily-button 而非「标记节点已处理」。
- extractHotplugRequirements 提取 componentId 清单，payload 随按钮下发。
- AilyChatComponent 新增 dialogueAssemblyPhase / dialoguePendingComponents / assemblyMonitorSubscription 三个状态字段。
- 组装完成后复用现有 confirmNode + applyDialogueResponseSideEffects 闭环，无新服务依赖。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
