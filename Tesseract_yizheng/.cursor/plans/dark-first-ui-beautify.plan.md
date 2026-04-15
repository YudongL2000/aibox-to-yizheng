# Dark-First Spatial UI 收敛方案（Flutter + Electron 同构，含 `ref-design.jsx` 参考约束）

## Summary
以 `Spatial Wireframe` 为唯一设计语言，第一波同时覆盖 **Flutter 工作台** 与 **Electron 主窗口**，确保 dark mode 为默认，且两端在面板层级、按钮语法、状态表达、文字语气上表现一致。`agent-ui` 作为同语法控制台分支同步收敛，但优先级低于 Flutter/Electron 主链路。

设计真相源按以下优先级执行：
1. `docs/spatial-wireframe-design-ref.md`：token 与原则真相源
2. `docs/ref-design.jsx`：版式、原子组件、交互语法参考稿
3. 各端 ref 文件：Flutter `spatial_design_ref.dart`、Electron `spatial-design-ref.scss`、agent-ui `spatial-design-ref.css`

当实现拿捏不准时，不是自由发挥，而是回看 [docs/ref-design.jsx](/Users/skylerwang/Documents/yudong/Tesseract/docs/ref-design.jsx) 的以下特征再做 dark 化落地：
- 32px 网格背景
- `panel / data-block / list-item / mono-label / status-dot / toggle / primary-secondary-danger button`
- 1px 实线边框 + dashed 分隔
- hover 以前景/背景反转为主，不靠重 glow
- 中文主体说明 + 英文系统标签
- 极少量语义色，只用于状态与 AI/流程强调

## Key Changes

### 1. 先把规范补成“可执行语法”，不止是 token 表
扩展三端设计 ref，统一这些语义层：
- Surface：`base / panel / elevated / muted / overlay`
- Border：`solid / subtle / dashed / focus / danger`
- Text：`primary / secondary / muted / inverse / accent / status`
- Status：`info / success / warning / danger / neural`
- Radius：`sm / md / lg / pill`
- Spacing：4px 基数 scale
- Motion：`fast / base / slow`
- Typography roles：`hero / section / card / body / caption / mono`

同时把 `ref-design.jsx` 里的原子语言正式转成跨端规范：
- `panel`
- `data-block`
- `list-item`
- `status-chip`
- `status-dot`
- `toggle-switch`
- `mono-tag`
- `primary / secondary / danger / disabled button`

### 2. Flutter 增加正式消费层，再迁移主工作台
在 `spatial_design_ref.dart` 基础上补一层正式 API，避免页面继续手写颜色。
- 新增 `ThemeExtension` 或等价访问层，暴露 semantic surface/text/border/status/spacing/radius/motion
- 新增工作台 primitives：
  - shell panel
  - elevated panel
  - section header
  - mono badge
  - status chip
  - action button
  - list row
- 第一波迁移范围：
  - `HomeWorkspacePage`
  - `AiInteractionWindow`
  - `digital_twin_preview_pane`
  - `assembly_checklist_panel`
  - workflow/dialogue 相关交互卡片
- 迁移标准：
  - 不再直接写 `Color(0x...)`、`Colors.white`、`Colors.black`
  - hero 区、tab 区、stat chip、输入区、资源附件区统一为 Spatial dark shell
  - 视觉上贴近 `ref-design.jsx` 的 panel/data-block/list-item 关系，而不是继续沿用赛博蓝渐变块
- Flutter 桌面适配要求：
  - 宽屏三段式与窄屏收缩态都保持同一层级
  - 数字孪生区和 workflow 区是同一套设计语法，不像两套产品拼接

### 3. Electron 先统一壳层与 AI 主链路，跟 Flutter 同构
Electron 侧优先统一主窗口结构，不做全仓页面一次性换皮。
- 第一波迁移范围：
  - main window shell
  - header
  - 底部日志/终端面板
  - 右侧 AI Chat 主面板
  - Skill Center 壳层与关键卡片
- 在 `spatial-design-ref.scss` 补 semantic vars 与兼容 alias：
  - 保留现有基础 token
  - 增加 `--surface-panel`、`--surface-elevated`、`--border-subtle`、`--focus-ring`、`--text-muted`、`--chip-*`、`--space-*`、`--radius-*`
  - 为现有壳层依赖补旧变量兼容，避免局部错色
- 视觉落地要求：
  - header、工具按钮、硬件状态、底部 tab 全部改成统一 shell bar 语法
  - 去掉主窗口与 AI Chat 中大面积旧紫/青渐变、重阴影、局部硬编码 glow
  - `aily-chat` 的技能条、消息区、发送区、模式切换器改用 `ref-design.jsx` 的 panel/button/list-item 逻辑做 dark 化
- Electron 桌面适配要求：
  - 在常见桌面宽度下主窗口顶部、侧栏、底栏边界清晰
  - 缩窄后按钮、状态标签、面板标题不挤压失真

### 4. agent-ui 收敛为同语法控制台，不再独立一套 cyan 视觉
`agent-ui` 保留控制台定位，但不再用 Tailwind 颜色类直接决定设计。
- 第一波迁移范围：
  - `Header`
  - `AIHealthLab`
  - `ChatInterface`
  - `InteractionCard`
  - `N8nIframe`
- 接口调整：
  - `runtimeStatusView` 输出语义 tone key，不再输出绑定具体 cyan/amber/rose 的样式语义
  - 组件侧改用 CSS vars + semantic utility class 渲染 tone
- 视觉要求：
  - panel、chip、message bubble、config form、trace block 全部对齐 Spatial dark shell
  - 保留信息密度，但减少“黑底 + 青边 + 发光”的实验台风格
  - 标题与系统标签语言跟 Flutter/Electron 一致

### 5. 文案与系统语言统一
默认采用“中文优先 + 系统标签英文”。
- 中文：标题说明、按钮、空态、错误、帮助文案
- 英文 mono：状态短标签、系统 phase、元信息标签
- 禁止同层级里混杂三种口吻：
  - 生活化中文
  - 赛博英文 slogan
  - 工程缩写
- `ref-design.jsx` 里像 `PRODUCT_PHILOSOPHY / SEMANTIC_COLOR_SYSTEM / EXECUTABLE / AWAITING` 这类写法只保留为系统标签语法，不泛滥到所有正文

## Public Interfaces / Types
本轮需要补或调整这些公共消费接口：
- Flutter：
  - 为 `ThemeData` 增加正式的 spatial semantic access 层
  - 页面和组件改从 semantic theme 取值，而非直接引用裸 token
- Electron：
  - `spatial-design-ref.scss` 增加 semantic CSS vars 与兼容 alias
  - app-shell 与主链路组件统一消费 semantic vars
- agent-ui：
  - `runtimeStatusView` 改为输出语义 tone，不输出具体颜色取向
  - 全局 CSS 增加 semantic panel/chip/button/input/list utilities

## Test Plan
1. Flutter
- `cd frontend && flutter analyze`
- `cd frontend && flutter test`
- 手动验证 dark mode 默认启动
- 手动验证桌面宽屏/窄屏下：
  - 工作台 tab
  - AI 面板
  - 数字孪生区
  - workflow 区
  - 状态 chip / 输入区 / 资源附件区
  视觉一致且无旧色残留

2. Electron
- `cd aily-blockly && npm start`
- `cd aily-blockly && npm run build`
- 手动验证：
  - 启动 loading
  - main window header
  - 底部日志/终端
  - 右侧 AI Chat
  - Skill Center 入口与主内容
- 验证桌面常见宽度与缩窄时的 shell 一致性

3. agent-ui
- `cd backend/apps/agent-ui && npm test`
- `cd backend/apps/agent-ui && npm run build`
- 手动验证 Header / AIHealthLab / ChatInterface / InteractionCard / N8nIframe 已从 cyan-heavy 风格收敛到 Spatial dark shell

4. 跨端验收
- Flutter 与 Electron 并排对比时，必须一致：
  - 背景网格密度
  - panel/data-block/list-item 层级
  - 按钮 hover 反转逻辑
  - mono 标签语法
  - 状态色使用边界
  - 中文主体文案 + 英文系统标签策略

## Assumptions
- 本轮重点是“Flutter + Electron 主链路同构美化”，不是全仓页面一次性重绘。
- `docs/ref-design.jsx` 是实现犹豫时的结构参考稿，但运行时默认仍以 dark mode 落地，不回退成 light 风格。
- 训练页、设备页、登录页、历史遗留弹窗暂不作为第一波主验收范围。
- 所有涉及样式语义、组件契约、壳层行为变化的修改，都同步更新对应 `AGENTS.md` / `.folder.md` / 文档头。
