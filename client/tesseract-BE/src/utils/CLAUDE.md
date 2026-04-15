# utils/ - 通用工具集
> L2 | 父级: ../CLAUDE.md

目录结构
utils/
├── auth.ts - 权限与认证辅助
├── cache-utils.ts - 缓存与互斥工具
├── code-node-parameters.ts - code 节点最小可执行参数单一真相源
├── console-manager.ts - 控制台输出管理
├── error-handler.ts - 错误处理器
├── example-generator.ts - 示例生成器
├── expression-utils.ts - 表达式处理工具
├── fixed-collection-validator.ts - 固定集合校验
├── logger.ts - 日志封装与北京时间日志/归档文件名 helper 真相源
├── n8n-errors.ts - n8n 错误适配
├── node-classification.ts - 节点分类工具
├── node-notes.ts - 节点 notes 结构化归一化
├── node-type-normalizer.ts - 节点类型标准化
├── node-type-utils.ts - 节点类型工具
├── node-utils.ts - 节点通用工具
├── protocol-version.ts - 协议版本信息
├── simple-cache.ts - 简易缓存实现
├── validation-schemas.ts - 结构校验 schema
└── version.ts - 版本信息

架构决策
- 通用逻辑集中在 utils，避免跨模块重复实现。
- `code-node-parameters.ts` 统一约束 code 节点的最小可执行模板，避免 agents/services/prompts 各自手写 `jsCode` 默认值。
- `logger.ts` 同时是日志文件名与 workflow 归档文件名的北京时间 token 真相源；任何命名格式调整都必须从这里统一出发。

开发规范
- 新增/删除/移动文件必须同步本文件。

变更日志
- 2026-01-28: 新增 node-notes.ts 统一 notes 结构化处理。
- 2026-03-13: 新增 code-node-parameters.ts，统一 code 节点最小可执行模板。
- 2026-04-13: `logger.ts` 导出北京时间文件名 helper，供 log 文件与 workflow JSON 归档共用。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
