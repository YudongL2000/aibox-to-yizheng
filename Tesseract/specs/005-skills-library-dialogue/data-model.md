# Data Model: 教学模式存库与对话模式真 Skill 分流

## SkillRecord

教学模式确认入库后持久化到 backend JSON 的真实技能资产。

**Fields**
- `skillId`: 稳定 ID
- `displayName`: 用户可见技能名称
- `summary`: 技能语义摘要
- `keywords`: 用于语义检索的短语数组
- `gameplayGuide`: 命中该技能后给用户的引导文案
- `requiredHardware[]`: 技能所需硬件列表
- `workflowId`: 来源 workflow ID
- `workflowName`: 来源 workflow 名称
- `workflow`: workflow JSON 快照
- `sourceSessionId`: 生成该技能的教学会话
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

**Validation**
- `displayName` 非空
- `workflow` 必须存在
- `requiredHardware` 至少反映本次教学中真实装配到的物理组件

## SkillSaveCandidate

教学完成后等待用户确认是否入库的临时快照。

**Fields**
- `displayName`
- `summary`
- `keywords[]`
- `requiredHardware[]`
- `workflowId`
- `sourceSessionId`

**State transitions**
- `proposed` -> `saved`
- `proposed` -> `dismissed`

## SkillLibrarySnapshot

frontend 消费的技能库视图模型集合。

**Fields**
- `items[]`
- `total`
- `updatedAt`

## DialogueRouteDecision

backend 在对话模式中做出的单一分流结论。

**Fields**
- `branch`: `instant_play | hardware_guidance | teaching_handoff | proxy_chat | validation_failed`
- `phase`
- `matchedSkill`
- `librarySkills[]`
- `relay`
- `deploymentPrompt`

**Rules**
- 只要命中真实 `SkillRecord`，才允许进入分支 A/B。
- 未命中但属于明确能力请求，进入分支 C。
- 普通闲聊进入 MimicLaw relay。

## LibrarySkillPreview

用于 Skill Center 与对话模式卡片的轻量技能摘要。

**Fields**
- `skillId`
- `displayName`
- `summary`
- `tags[]`
- `requiredHardware[]`
- `savedAt`

## Relationships

- 一个 `SkillSaveCandidate` 在用户确认后生成一个 `SkillRecord`
- `SkillLibrarySnapshot.items[]` 是 `SkillRecord` 的前端折叠视图
- `DialogueRouteDecision.matchedSkill` 引用单个 `SkillRecord`
- `DialogueRouteDecision.librarySkills[]` 引用多个 `LibrarySkillPreview`
