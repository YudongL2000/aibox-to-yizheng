# DB Schema

`aily-blockly` 本身没有一个单一、内建、强约束的应用数据库模式；它更像一个桌面宿主，围绕多个持久化表面工作。

## 当前主要持久化表面
- `.tesseract/manifest.json`
  - Tesseract 项目的模式标识与元数据
- `.tesseract/workflow.json`
  - 本地工作流快照
- `project.abi`
  - legacy Blockly 项目的模式标识与项目信息
- `electron/config/*.json`
  - 开发板、库、应用配置等静态结构化数据
- 本地 n8n 用户目录中的 SQLite
  - 嵌入式 n8n 运行时自己的数据库，不由 `aily-blockly` 源码直接定义

## 结论
- 项目拥有的是“多存储表面”，不是“单应用 schema”。
- 如果未来需要真正的统一 schema，应先决定由 `aily-blockly` 持有，还是继续把运行态数据委托给 embedded n8n。
