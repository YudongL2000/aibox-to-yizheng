# node/
> L2 | 父级: ../CLAUDE.md

成员清单
node-rules.ts: 节点分类共享规则与 canonical sub-key 常量，避免 normalizer/notes-enricher 各自维护一份。
notes-enricher.ts: 节点 notes/sub/title/subtitle 补全器，统一 category 推断、sub 清洗与标题生成。
normalizer.ts: 节点归一化主流程，负责 node type 对齐、参数修复、legacy IF 条件迁移与后处理调度。
topology-resolver.ts: 连接归一化与图操作工具，负责 edge 去重、passthrough 裁剪、入边/出边查询与主链保留。

法则: 节点结构修复先走 `normalizer.ts`，notes 语义只在 `notes-enricher.ts` 收口，图连线只在 `topology-resolver.ts` 收口。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
