# memory/
> L2 | 父级: ../CLAUDE.md

成员清单
MEMORY.md: 跨会话必须始终携带的小核心，只保留长期稳定背景、目标与约束。
OPERATING_RULES.md: Memory 体系操作规程，定义加载顺序、晋升规则、防膨胀策略与日常维护动作。
daily/: 每日高价值摘要目录，先落地新信息，再决定是否晋升。
bank/: 稳定事实、经验、偏好与实体页目录，承接从 daily 晋升的长期记忆。

架构决策
- `memory/` 不是知识库，而是长时程开发上下文层；目标是低体积、高信噪比、可持续重写。
- 所有新信息先进入 `daily/`，只有稳定、重复、高价值内容才允许晋升到 `bank/` 或 `MEMORY.md`。
- `MEMORY.md` 只放“每次会话都该知道”的小核心，禁止无限追加。
- `OPERATING_RULES.md` 负责定义日常使用法；跨项目初始化 Skill 放在仓库顶层 `skills/`，避免和项目内记忆内容混在一起。

开发规范
- 修改 `MEMORY.md` 时优先重写整理，不做流水账 append。
- `daily/` 不保存整段 transcript，不保存密钥、token、密码。
- `bank/entities/` 仅为反复出现的人、项目、产品建页，避免目录膨胀。

变更日志
- 2026-03-13: 建立 memory 长时程记忆目录，按 `MEMORY.md + daily/ + bank/` 实现 OpenClaw 风格的项目上下文沉淀。
- 2026-03-13: 新增 OPERATING_RULES.md、daily 模板与 memory-bootstrap Skill，补齐初始化与日常维护流程。
- 2026-03-13: 将 memory-bootstrap Skill 提升到仓库顶层 `skills/`，消除文档层与可迁移 Skill 的双份维护。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
