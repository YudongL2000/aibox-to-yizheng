# Skill Center UI Interaction

## Current Rules

- `Digital Twin / Workflow` 是唯一一层主任务 tab，由 `tesseract-studio` 内层独占渲染。
- Electron shell header 不再复制 `Digital Twin / Workflow`；它只保留产品入口和窗口壳控制。
- 右上角入口按产品优先级组织为：`我的库 / 广场 / AI / 模型 / 串口`。
- `我的库 / 广场` 是 deep link，实际打开 `Assets > Skills > ...`。
- `AI / 模型 / 串口` 是一级内容入口，打开右侧支持面板的对应 section。

## Right Panel

- header 已经承担一级入口后，右侧面板内部不再重复渲染 `Assistant / Assets / Runtime`。
- 面板内部只保留必要的二级切换：
  - `Assets > Skills / Model Store`
  - `Skills > 我的库 / 广场 / 备份`
- `Assistant` 与 `Runtime` 直接进入内容区，不再加解释型顶部说明。

## Copy Rules

- 删除没有决策价值的 subtitle、说明段落和重复解释。
- 保留真正有用的信息：
  - 当前 section / 当前资源类型
  - 状态 badge
  - 可执行动作
  - 真实 skill 摘要
- 禁止使用这类占位文案：
  - “这里负责……”
  - “当前先……后续再……”
  - “建议进入完整……处理”
  - 任何和当前操作无直接关系的教学式说明

## Header Priority

- `我的库 / 广场` 采用更强的胶囊样式，表示资产来源入口。
- `AI / 模型 / 串口` 采用次一级的 icon + label 入口，表示当前工作区支持能力。
- 不在同一排继续混入零散工具入口，避免退回“工具集合”观感。
