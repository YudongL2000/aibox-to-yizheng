# aily-mermaid-viewer/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/components/AGENTS.md

成员清单
aily-mermaid-viewer.component.ts: Mermaid viewer 主组件，负责解析数据、渲染 SVG、重试、全屏与异常摘要日志。
aily-mermaid-viewer.component.html: Mermaid viewer 模板，承载加载态、错误态与图表容器。
aily-mermaid-viewer.component.scss: Mermaid viewer 样式，负责暗色主题、缩放区与全屏按钮视觉。
mermaid/: 全屏 Mermaid 预览子组件目录。

法则
- Mermaid 渲染失败只能输出摘要日志，必须裁短 `codePreview`；禁止直接把整份源码刷屏。
- viewer 只关心图表渲染，不负责业务分支判定或消息协议适配。
- 2026-04-12 起，viewer 壳层圆角统一跟随 shared radius tokens，默认使用 `var(--radius-base)` / `var(--radius-lg)`，不再保留裸 `8px` / `22px`。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
