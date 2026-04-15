# components/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/AGENTS.md

成员清单
x-dialog/: 聊天消息渲染树，承接 markdown code block、对话模式主卡片与动作按钮分发。
dialog/: 旧消息气泡渲染链，仍承接部分 markdown / dynamic component fallback。
floating-todo/: 聊天内浮动待办面板。
aily-mermaid-viewer/: Mermaid 图表 viewer，负责渲染、重试、全屏查看与异常裁剪日志。

法则
- 这里的组件只负责“怎么显示”，不负责“业务应该如何判定”。
- `aily-*` 新 block 要先在 `x-dialog/` 认领，再考虑是否下沉成独立 viewer。
- 新增 viewer 时优先沿用 backend envelope 的原始字段语义，禁止前端再发明一套状态命名。
- 图表 viewer 的异常日志必须裁短；一条渲染错误若把整份 Mermaid 源码直接喷进控制台，等同于把信号淹死在噪音里。
- legacy `dialog/`、`aily-*` viewer 与 `floating-todo/` 也必须跟 `x-dialog/` 共用同一套 Spatial dark shell：`var(--surface-*) / var(--border-*) / var(--text-*) / var(--sem-*) / var(--font-*)`，禁止再写本地字体名、裸十六进制色值和独立灰底主题。
- 2026-04-12 起，viewer 外壳圆角也归入同一条设计约束：默认优先复用 `var(--radius-base)` / `var(--radius-lg)`，禁止在 SCSS 或内联 viewer 样式里继续写裸 `8px` / `22px`。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
