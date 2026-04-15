# daily/
> L2 | 父级: ../CLAUDE.md

成员清单
2026-03-13.md: 今日记忆起始页，记录 memory 体系落地、当前长期主题与首批保留项。
2026-03-15.md: Refactor-5 质量稳定化 Phase 1 记忆页，记录 emo 场景从模板替换降级为增量补全的关键结论。
2026-04-15.md: 数字孪生 viewer 坐标锚点复盘页，记录 3D 资产偏移由 GLB 原始 pivot 泄漏进 host 坐标语义所致。
TEMPLATE.md: 每日记忆模板，固定 New Facts / Decisions / Constraints / Retain 结构。

架构决策
- `daily/` 只承接当日高价值摘要，不保存原始对话，不做大段 transcript 转存。
- 每日文档必须以 `## Retain` 收尾，只保留 2-5 条值得晋升的内容。
- `daily/` 是记忆入口层，不是长期仓库；长期内容必须再晋升到 `bank/` 或 `MEMORY.md`。

开发规范
- 文件名固定为 `YYYY-MM-DD.md`。
- 记录新偏好、新决策、新经验、新约束，不记录机械性操作流水。

变更日志
- 2026-03-13: 建立 daily 目录与首日记忆页。
- 2026-03-13: 新增 TEMPLATE.md，统一每日记录结构与 Retain 收口方式。
- 2026-04-15: 新增 2026-04-15 记忆页，沉淀数字孪生 viewer 坐标锚点与外部 GLB pivot 偏移教训。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
