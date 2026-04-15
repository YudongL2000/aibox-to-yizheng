# web/
> L2 | 父级: ../AGENTS.md

成员清单
index.html: Flutter Web 入口页，承载 bootstrap、model-viewer 依赖与 DWDS main fallback；[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
manifest.json: Web 应用 manifest，声明 PWA 元数据；[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
favicon.png: 浏览器 favicon 静态资源；[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
icons/: Flutter Web/PWA 图标资源目录；[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
model_viewer/: three.js 数字孪生模型 viewer 静态宿主，被 Flutter `HtmlElementView` iframe 消费；[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md

架构决策
Web 开发入口不能依赖 DWDS 在所有嵌入容器中必然主动触发 `main()`；入口页保留一个有界 fallback，只在 `$dartRunMain` 已存在且 `$dartMainExecuted` 仍为 false 时执行。`source=aily-blockly` 的嵌入 digital twin 只允许延迟 fallback，不能彻底禁用，否则 Electron iframe 内会出现 Flutter 根节点永远不启动的白屏。

开发规范
静态入口变更后必须用真实浏览器或 Electron 验证 Flutter 根节点是否出现，不能只用 `curl` 判断。
