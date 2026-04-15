# Tasks: 工作流视图同步闭环

**Input**: Design documents from `/specs/004-workflow-view-sync/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 为了锁住这次裂脑问题，保留针对核心同步链的现有 TypeScript/Jasmine 校验任务。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared Context)

**Purpose**: 锁定这次 feature 的单一真相源和触点文件

- [x] T001 对齐 `specs/004-workflow-view-sync/` 文档集合并补齐 AGENTS 映射
- [x] T002 审计 `aily-blockly` 中 workflow 创建、项目路径、嵌入式 n8n 视图同步链并确认最小改动文件集合

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 先收口单一 workflow 视图真相源，阻断主页/浏览器回退继续污染主流程

- [x] T003 在 `/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/services/tesseract-chat.service.ts` 收口 workflow 引用持久化与会话缓存，确保 backend workflow 结果可被活动工作区稳定消费
- [x] T004 在 `/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts` 收口“当前工作区上下文”获取与客户端内工作区切换入口，避免 create/open 动作因缺失上下文退回外部浏览器
- [x] T005 在 `/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/editors/tesseract-studio/tesseract-studio.component.ts` 建立“占位态 / 待对齐态 / workflow-ready”统一判定，禁止主页在无 workflow 工作区中露出

**Checkpoint**: workflow 引用、项目上下文和主工作区目标页已形成单向同步链

---

## Phase 3: User Story 1 - 创建后即时看到工作流 (Priority: P1) 🎯 MVP

**Goal**: 点击“创建工作流”成功后，左侧主工作区在客户端内自动显示新 workflow

**Independent Test**: 在活动工作区中点击“创建工作流”，无需手动点“打开工作流”，左侧直接切到本次创建的 workflow

### Tests for User Story 1

- [x] T006 [P] [US1] 扩展 `/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/services/tesseract-chat.service.spec.ts`，覆盖创建成功后 workflow 引用持久化与项目上下文回流
- [x] T007 [P] [US1] 扩展 `/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/services/tesseract-agent-response-adapter.spec.ts`，锁定“创建成功后客户端优先更新内工作区”语义

### Implementation for User Story 1

- [x] T008 [US1] 调整 `/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/services/tesseract-chat.service.ts`，让 create 成功结果优先回灌当前工作区 workflow 引用
- [x] T009 [US1] 调整 `/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts`，让“创建工作流”成功后直接驱动客户端 `tesseract-studio` 更新而不是停留在按钮回退语义
- [x] T010 [US1] 调整 `/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/editors/tesseract-studio/tesseract-studio.component.ts`，让已挂载的嵌入式工作区在收到新 workflow 目标时自动对齐而不是继续停在主页

**Checkpoint**: 创建成功即可在客户端内看到对应 workflow，浏览器打开不再是主路径

---

## Phase 4: User Story 2 - 无工作流时显示明确占位态 (Priority: P2)

**Goal**: 无 workflow 的活动工作区只显示占位提示，不显示主页/历史流程

**Independent Test**: 打开客户端或进入无 workflow 的工作区时，左侧只显示文字占位，不出现 n8n Overview/Workflows 列表

### Implementation for User Story 2

- [x] T011 [US2] 调整 `/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/editors/tesseract-studio/tesseract-studio.component.ts`，确保活动工作区在无 workflow 时直接短路为占位态
- [x] T012 [US2] 调整 `/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/editors/tesseract-studio/tesseract-studio.component.html` 与 `/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/editors/tesseract-studio/tesseract-studio.component.scss`，让占位态成为主工作区的唯一空态
- [x] T013 [US2] 更新 `/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/editors/tesseract-studio/AGENTS.md`，固化“无 workflow 只允许占位态”的模块法则

**Checkpoint**: 无 workflow 的项目不会再露出主页或第三方流程

---

## Phase 5: User Story 3 - 异步准备阶段也能最终对齐 (Priority: P3)

**Goal**: 聊天结果先到、工作区后就绪或已切换时，系统仍能最终自动对齐，且不会串台

**Independent Test**: 让工作区重载或晚于创建结果准备完成，最终仍能自动显示正确 workflow；切换项目后旧结果不会污染新项目

### Tests for User Story 3

- [x] T014 [P] [US3] 增加活动工作区延迟结果与项目切换保护回归测试，锁住全局工作区 `workflowId` 聚焦与防串台场景

### Implementation for User Story 3

- [x] T015 [US3] 调整 `/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/editors/tesseract-studio/tesseract-studio.component.ts`，引入待对齐目标并在工作区准备完成后继续自动刷新
- [x] T016 [US3] 调整 `/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/aily-chat.component.ts`，在项目切换或上下文缺失时阻断旧结果污染当前工作区

**Checkpoint**: 工作区和聊天区的时序错位不会再造成主页回退或串台

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 收尾验证与文档同步

- [x] T017 [P] 更新 `/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/AGENTS.md` 与 `/mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly/src/app/tools/aily-chat/services/AGENTS.md`
- [x] T018 运行 `/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/004-workflow-view-sync/quickstart.md` 中的关键验收路径并记录结果
- [x] T019 运行 `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npx tsc -p tsconfig.app.json --noEmit`
- [x] T020 运行 `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npx tsc -p tsconfig.spec.json --noEmit`
- [x] T021 运行 `cd /mnt/c/Users/sam/Documents/Sam/code/Tesseract/aily-blockly && npx ng build --configuration development`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: 立即开始
- **Phase 2**: 依赖 Phase 1 完成；阻塞全部用户故事
- **Phase 3**: 依赖 Phase 2 完成
- **Phase 4**: 依赖 Phase 3 的 workflow 真相源已打通
- **Phase 5**: 依赖 Phase 3、4 完成
- **Phase 6**: 依赖所有用户故事完成

### User Story Dependencies

- **US1**: MVP，必须先完成
- **US2**: 依赖 US1 已确定 workflow 切换入口
- **US3**: 依赖 US1/US2 的基础同步链

### Parallel Opportunities

- T006 与 T007 可并行
- T014 可与部分文档更新并行
- Phase 6 中的文档更新与编译验收可部分并行

## Implementation Strategy

### MVP First

1. 完成 Phase 1-2，先消灭多真相源
2. 完成 US1，让“创建即显示”先跑通
3. 再补 US2 空态正确性
4. 最后补 US3 的时序保护

### Notes

- 这次 feature 的本质不是“再补一个按钮”，而是让 workflow 创建结果、项目上下文、左侧工作区目标页只剩一条单向同步链。
- 任何继续依赖主页、浏览器或手动补点的方案，都算没有完成这次闭环。
- 本轮已实跑 `tsconfig.app/spec` 编译与 `ng build --configuration development`；定向 `ng test --include ...` 仍受当前 Angular/Karma harness 配置限制，失败原因为 spec 文件未被 builder 的 TypeScript 编译清单显式纳入，而不是业务代码错误。
