# digital-twin-panel/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/components/.folder.md

成员清单
digital-twin-panel.component.ts: 数字孪生 panel 宿主，负责根据 runtime flag 决定 Flutter workspace 或兼容嵌入页来源，并把 Electron 当前 theme 一并传给 Flutter，同时把外层 chrome 控制在最小范围。
digital-twin-panel.component.spec.ts: 数字孪生 panel 回归测试，锁住 active assembly session 会覆盖 stale workbench payload，避免组装检测台掉回旧 panel 状态。
digital-twin-panel.component.html: 数字孪生 panel 模板，仅保留 iframe 容器，不再复制 Flutter 内部标题或状态胶囊。
digital-twin-panel.component.scss: 数字孪生 panel 样式，负责把默认工作区里的 twin surface 收到更克制的 Spatial shell，不再保留独立渐变底色与厚重阴影。

法则
- 这个目录属于 Electron 默认工作区活跃视觉链路；frame shell 必须直接消费 `src/spatial-design-ref.scss` 里的语义变量。
- 这里只负责 desktop shell 与 iframe 宿主，不重复实现 Flutter 侧的内部 chrome，也不再新增 workflow tab。
- Flutter workspace URL 的 `theme` 参数必须从 Electron 当前 `data-theme` 派生；不能让宿主是 dark、嵌入页还是 light，反之亦然。
- Flutter 页面里已经有自己的状态表达时，这里不得再套一层标题、badge 或说明文案。
- digital twin 宿主页面基底必须与 workflow surface 保持一致；这里只允许保留共享 frame shell，不允许再叠独立 grid / bgBase 页面底。

变更日志
- 2026-04-15: active assembly session 现在优先覆盖 stale `digital-twin` workbench payload；当组装 session 已结束时，宿主会主动剥离遗留的 `hardware-assembly` payload，避免检测台卡在旧模式。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
