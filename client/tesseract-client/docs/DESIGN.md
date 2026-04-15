# Design

这个目录把 `aily-blockly` 的设计意图收敛为一条清晰主线: 为什么它从 Blockly IDE 演化为 Tesseract-first 桌面工作台，以及哪些设计原则不应再反复争论。

优先阅读顺序:
- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [design-docs/index.md](./design-docs/index.md)
- [design-docs/core-beliefs.md](./design-docs/core-beliefs.md)
- [design-docs/tesseract-integration-context.md](./design-docs/tesseract-integration-context.md)

设计上的硬边界:
- 主工作区以 Tesseract Studio 和 n8n 工作流为中心。
- legacy Blockly 是兼容路径，不再是默认产品叙事。
- Electron 负责宿主与 runtime 管理，不直接承载整套 backend 源码。
- 文档只保留一个人类入口，即当前 `docs/`。
