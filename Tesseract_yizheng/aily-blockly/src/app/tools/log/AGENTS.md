# log/
> L2 | 父级: /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/AGENTS.md

成员清单
ansi.pipe.ts: ANSI 日志着色管道，把终端序列转成可读 HTML。
log.component.html: 日志面板模板，承载日志列表与导出交互。
log.component.scss: 日志面板样式，负责深色终端风格布局。
log.component.ts: 日志面板容器，订阅 LogService 并执行复制、发送到 AI 与导出动作。

法则
- 这里展示的是 renderer 视角日志，不是 Electron session 全量归档；系统级排障要以 `electron/logger.js` 产出的 session 目录为准。
- 面板导出若未来接入结构化归档，必须直接消费 preload 暴露的日志状态，不得自己猜测 appData 路径。
- 面板内部交互日志必须保持安静；像“单击一条日志”这种正常 UI 事件不该污染调试流。
- 硬件 runtime heartbeat / cloud command 事件由 `services/hardware-runtime.service.ts` 写入，`log/` 只负责呈现，不参与协议解析。

[PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
