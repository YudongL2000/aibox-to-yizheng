# Research: 教学模式存库与对话模式真 Skill 分流

## Decision 1: skills 库落在 backend 本地 JSON repository

**Decision**: 在 `backend/data/skills/` 下以单 skill 单 JSON 文件持久化技能库，由 backend 统一提供 list/save 与对话模式查询能力。

**Rationale**:
- 当前对话模式的真相源本来就在 backend `DialogueModeService`，把技能库继续留在前端只会制造第二真相源。
- 用户明确要求“以 JSON 的方式存入 skills 库”，本地 JSON 比引入数据库更直接、更可调试。
- 每个 skill 单独成文件，便于 diff、备份与人工排查。

**Alternatives considered**:
- 存在 `aily-blockly` 本地项目目录：会让 backend 分流再次依赖前端缓存。
- 存数据库：超出当前范围，调试成本高。
- 继续使用静态 catalog 常量：无法完成教学后入库闭环。

## Decision 2: 教学完成后由 backend 生成 skill save candidate

**Decision**: `config_complete` 响应附带 `skillSaveCandidate`，前端只负责渲染“是否存入技能库”确认，不自己拼 skill JSON。

**Rationale**:
- 教学完成时，backend 同时持有 workflow、summary、configState，是唯一能完整拼装 skill 候选的人。
- 如果前端自己从聊天文案反推 skill，会再次走向脆弱分支和重复逻辑。

**Alternatives considered**:
- 前端点击保存时再临时从 session 抽数据：链路更长，状态更脆。
- 教学结束自动保存：违背用户显式确认需求。

## Decision 3: 对话模式分流继续使用语义路由，但 catalog 改为真实 skill 库

**Decision**: 保留当前 backend LLM-based router + rule fallback 结构，但输入 catalog 不再来自 `DIALOGUE_SKILL_CATALOG` 静态常量，而来自 repository 当前 skill 集合。

**Rationale**:
- 现有 router 已能解决“普通闲聊 vs 技能请求 vs 已知技能”的语义判定。
- 替换 catalog 来源比重写整套路由更稳，能最小代价移除 mock skill 依赖。

**Alternatives considered**:
- 完全规则匹配：对自然语言同义说法不稳。
- 前端先猜是否命中 skill 再问 backend：违反单一真相源。

## Decision 4: `aily-blockly` 用共享 skill library service 收敛 UI 状态

**Decision**: 新增 `TesseractSkillLibraryService`，让聊天面板、Skill Center 和保存动画共享同一份前端可观察状态。

**Rationale**:
- Skill Center 现在是静态原型，聊天区保存成功后如果直接各自改局部状态，很快就会长出第三份真相源。
- 用共享 service 能让“保存成功 -> 飞入动画 -> 我的库刷新”保持单向数据流。

**Alternatives considered**:
- 在 chat component 里直接操控 Skill Center 组件实例：耦合太重。
- 让 Skill Center 自己轮询 backend：无必要，且动画时机不准。

## Decision 5: 飞入动效在 Skill Center `library` 视图内实现

**Decision**: 保存成功后自动打开 Skill Center 的“我的库”视图，并在 modal 内展示一次性飞入动画，再高亮新条目。

**Rationale**:
- 用户想看到的是“技能飞入我的库”，最自然的落点就是库视图本身。
- 在聊天窗口里做飞入而不打开库，会让终点不明确。

**Alternatives considered**:
- 只弹 toast：反馈太弱。
- 跨窗口全局浮层：实现更复杂，且不必要。
