# Core Beliefs

## 1. Tesseract-first, not Blockly-first
默认产品叙事已经切换为 Tesseract Studio。Blockly 仍然重要，但它承担的是兼容与补位，而不是主入口。

## 2. Workflow-first beats widget-first
主工作区围绕工作流而不是围绕零散控件堆叠。用户首先要确认的是系统行为，而不是先被迫理解底层 UI 组件树。

## 3. Local runtime management beats deep embedding
Electron 负责托管本地 runtime，而不是把整个 backend TypeScript 直接塞进主进程。这样能减少耦合、降低构建链复杂度、保留独立演进能力。

## 4. Reuse the proven shell
聊天渲染、项目管理、串口、构建/烧录、开发板生态这些旧能力不该被推倒重来。真正有价值的是在旧壳里建立新主链，而不是制造第二套体系。

## 5. Fallback is a strategy, not an excuse
保留 legacy Blockly 是为了平稳切换，不是为了让任何新设计都退化成“以后再说”。每一条回退路径都应该指向更清晰的主路径，而不是永久分叉。

## 6. One docs root, no wandering context
规划、规格、设计、可靠性与安全都应收敛到 `docs/`。散落在仓库根目录的文档会制造认知分叉，最终比代码更先腐烂。
