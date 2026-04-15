# Tasks: 教学模式存库与对话模式真 Skill 分流

**Input**: Design documents from `/specs/005-skills-library-dialogue/`  
**Prerequisites**: plan.md, research.md, data-model.md, contracts/

## Phase 1: Setup

- [x] T001 创建 backend skills 数据目录与初始占位规则 in `backend/data/skills/`
- [x] T002 更新 feature 文档索引与模块 AGENTS 地图 in `specs/005-skills-library-dialogue/AGENTS.md`, `specs/AGENTS.md`

## Phase 2: Foundational

- [x] T003 实现 backend JSON skill repository in `backend/src/agents/dialogue-mode/skill-library-repository.ts`
- [x] T004 扩展 dialogue-mode 与 config_complete 契约类型 in `backend/src/agents/types.ts`
- [x] T005 [P] 为 skill repository 补充单元测试 in `backend/tests/unit/agents/dialogue-mode/skill-library-repository.test.ts`

## Phase 3: User Story 1 - 教学完成后保存为技能 (P1)

**Goal**: 教学模式完成后，用户可以确认是否将成果存入真实 skills 库，并获得飞入“我的库”的反馈。  
**Independent Test**: 完成一次教学流程后点击确认存入，技能 JSON 成功写入 backend，并在 `aily-blockly` 中看到飞入技能库动画与新增条目。

- [x] T006 [US1] 让 backend 在 `config_complete` 响应中附带 skill save candidate in `backend/src/agents/config-workflow-orchestrator.ts`
- [x] T007 [US1] 为保存技能新增 backend 服务入口与 HTTP 路由 in `backend/src/agent-server/agent-service.ts`, `backend/src/agent-server/server.ts`
- [x] T008 [P] [US1] 为 config_complete/save-skill 增加 backend 回归测试 in `backend/tests/unit/agent-server/agent-service.test.ts`, `backend/tests/integration/agent/agent-api.test.ts`
- [x] T009 [US1] 扩展 Electron tesseract IPC 以支持 list/save skills in `aily-blockly/electron/tesseract-runtime.js`, `aily-blockly/electron/tesseract-ipc.js`, `aily-blockly/electron/preload.js`, `aily-blockly/src/app/types/electron.d.ts`
- [x] T010 [US1] 新增前端共享 skills 库状态服务 in `aily-blockly/src/app/services/tesseract-skill-library.service.ts`
- [x] T011 [US1] 在教学完成卡片中渲染“存入我的库/暂不保存”动作 in `aily-blockly/src/app/tools/aily-chat/services/tesseract-agent-response-adapter.ts`, `aily-blockly/src/app/tools/aily-chat/services/tesseract-dialogue.models.ts`
- [x] T012 [US1] 在聊天动作流中接入 save-skill 并触发 Skill Center 动画 in `aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts`, `aily-blockly/src/app/tools/aily-chat/services/tesseract-chat.service.ts`
- [x] T013 [US1] 将 Skill Center 的“我的库”改为真实数据与飞入动画 in `aily-blockly/src/app/tools/skill-center/skill-center.component.ts`, `aily-blockly/src/app/tools/skill-center/skill-center.component.html`, `aily-blockly/src/app/tools/skill-center/skill-center.component.scss`
- [x] T014 [P] [US1] 为前端 save-skill/service/skill-center 增加回归测试 in `aily-blockly/src/app/tools/aily-chat/services/tesseract-chat.service.spec.ts`, `aily-blockly/src/app/tools/skill-center/skill-center.component.spec.ts`, `aily-blockly/src/app/services/tesseract-skill-library.service.spec.ts`

## Phase 4: User Story 2 - 对话模式按真实技能库走 A/B/C 分支 (P1)

**Goal**: 对话模式只依赖 backend 真实 skills 库做语义命中与 A/B/C 分流。  
**Independent Test**: 保存一个技能后，在对话模式输入对应需求与未知技能需求，分别进入分支 A/B 或 C；普通闲聊仍走 MimicLaw。

- [x] T015 [US2] 将 dialogue-mode catalog 从静态常量切到 repository 真相源 in `backend/src/agents/dialogue-mode/dialogue-mode-catalog.ts`, `backend/src/agents/dialogue-mode/dialogue-mode-service.ts`
- [x] T016 [US2] 让语义 router 以真实 skills 库作为 known_skills 输入 in `backend/src/agents/dialogue-mode/dialogue-mode-router.ts`, `backend/src/agent-server/agent-factory.ts`
- [x] T017 [US2] 为 dialogue envelope 输出真实 library skill previews in `backend/src/agents/dialogue-mode/dialogue-mode-service.ts`, `backend/src/agents/types.ts`
- [x] T018 [P] [US2] 为 backend A/B/C + free_chat 分流补充回归测试 in `backend/tests/unit/agent-server/agent-service.test.ts`, `backend/tests/integration/agent/agent-api.test.ts`
- [x] T019 [US2] 让前端 dialogue card 只消费 backend 返回的真实 skills 列表 in `aily-blockly/src/app/tools/aily-chat/services/tesseract-agent-response-adapter.ts`, `aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-dialogue-mode-viewer/x-aily-dialogue-mode-viewer.component.ts`
- [x] T020 [P] [US2] 为 dialogue adapter/viewer 增加真实 skill 列表回归测试 in `aily-blockly/src/app/tools/aily-chat/services/tesseract-agent-response-adapter.spec.ts`, `aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-dialogue-mode-viewer/x-aily-dialogue-mode-viewer.component.spec.ts`

## Phase 5: User Story 3 - 技能库与对话界面不再展示 mock 技能 (P2)

**Goal**: 清空所有 mock skills 与硬编码快捷选项，让 UI 只显示真实技能库或可信空态。  
**Independent Test**: 在空技能库状态下，Skill Center 与对话模式都不再显示石头剪刀布/自动避障/添加技能等硬编码内容。

- [x] T021 [US3] 移除 `aily-chat` 顶部硬编码 dialogue quick prompts in `aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts`, `aily-blockly/src/app/tools/aily-chat/aily-chat.component.html`, `aily-blockly/src/app/tools/aily-chat/aily-chat.component.scss`
- [x] T022 [US3] 移除 Skill Center 静态本地库 mock 卡片并改为真实空态 in `aily-blockly/src/app/tools/skill-center/skill-center.component.ts`, `aily-blockly/src/app/tools/skill-center/skill-center.component.html`
- [x] T023 [US3] 为 mock 清理与空态展示补充回归测试 in `aily-blockly/src/app/tools/skill-center/skill-center.component.spec.ts`, `aily-blockly/src/app/tools/aily-chat/services/tesseract-agent-response-adapter.spec.ts`

## Final Phase: Polish & Validation

- [x] T024 更新 backend dialogue-mode 模块文档 in `backend/src/agents/dialogue-mode/AGENTS.md`, `backend/src/agent-server/CLAUDE.md`
- [x] T025 更新 aily-blockly services/skill-center/dialogue viewer 文档 in `aily-blockly/src/app/services/AGENTS.md`, `aily-blockly/src/app/tools/skill-center/AGENTS.md`, `aily-blockly/src/app/tools/aily-chat/services/AGENTS.md`, `aily-blockly/src/app/tools/aily-chat/components/x-dialog/x-aily-dialogue-mode-viewer/AGENTS.md`
- [x] T026 运行 backend 构建与测试验收 in `backend/`
- [x] T027 运行 aily-blockly 编译与构建验收 in `aily-blockly/`

## Dependencies

- Phase 1 -> Phase 2 -> US1 -> US2 -> US3 -> Polish
- US2 依赖 US1 的 repository 与 save contract 完成，否则对话模式没有真实 skills 真相源
- US3 可在 US2 后并行清理 mock 展示

## Parallel Examples

- T005 与 T003/T004 可并行
- T008 与 T006/T007 可并行
- T014 中不同 spec 文件可并行
- T018 与 T015/T016/T017 可并行

## Implementation Strategy

- 先打通 backend JSON repository 与教学完成存库闭环
- 再把对话模式从静态 catalog 切到真实 skills 库
- 最后清除前端 mock UI，确保所有展示都只来自真实数据
