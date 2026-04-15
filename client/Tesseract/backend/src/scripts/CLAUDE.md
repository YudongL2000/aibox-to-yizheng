# scripts/
> L2 | 父级: ../CLAUDE.md

成员清单
agent-db-init.ts: 初始化 Agent 侧表结构与种子数据，面向 agent-server 启动前准备。
rebuild.ts: 全量重建 nodes.db，把当前 n8n 安装态解析进数据库并做基础一致性检查。
validate.ts: 验证 nodes.db 的关键节点、统计摘要与版本兼容 critical checks，避免发布前拿过期假设做校验。

架构决策
- `rebuild.ts` 负责生成数据库事实，`validate.ts` 负责验证数据库事实；两者职责必须分离，不能让重建脚本顺手携带版本脆弱的发布规则。
- `validate.ts` 对易漂移节点使用候选 type 列表回退，兼容 n8n 包升级后的重命名，不再把单一 node_type 写死成系统脆点。
- 当前节点重建流程不生成长文档字段，校验优先验证 description/displayName 等真实可用文本，而不是强行要求 `documentation` 非空。

开发规范
- 新增脚本必须同步本文件。
- 改脚本输入/输出或发布语义时，先更新文件头，再更新本文件。

变更日志
- 2026-03-06: 建立 scripts 模块地图，明确 rebuild/validate/agent-db-init 的职责边界。
- 2026-03-06: validate.ts 改为基于候选 node_type 与 reference text 的版本兼容校验，移除对过期文档字段和过期 AI Agent 节点名的硬依赖。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
