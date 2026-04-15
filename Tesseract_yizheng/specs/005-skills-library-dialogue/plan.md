# Implementation Plan: 教学模式存库与对话模式真 Skill 分流

**Branch**: `005-skills-library-dialogue` | **Date**: 2026-04-02 | **Spec**: [/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/005-skills-library-dialogue/spec.md](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/005-skills-library-dialogue/spec.md)
**Input**: Feature specification from `/specs/005-skills-library-dialogue/spec.md`

## Summary

把“教学完成 -> 保存为 skill -> 对话模式命中真实 skill 库 -> 按 specs001 走 A/B/C”收成一条 backend-first 闭环。实现上新增 backend 本地 JSON skill repository 作为唯一技能真相源，教学完成后产出可保存的 skill candidate，对话模式语义路由改为基于真实 skill 库而不是静态常量；`aily-blockly` 负责保存确认、飞入“我的库”动效、真实技能库展示与 mock UI 清理。

## Technical Context

**Language/Version**: TypeScript on Node.js + Angular/Electron desktop renderer  
**Primary Dependencies**: backend `AgentService`/Express server/SessionService、dialogue-mode router、Electron IPC、Angular standalone components、ng-zorro modal  
**Storage**: backend 本地 JSON files under `backend/data/skills/` + 现有 session/config/workflow 内存态与项目快照  
**Testing**: backend Vitest unit/integration tests、`aily-blockly` TypeScript compile/spec compile、Angular build、必要的服务与 adapter 回归测试  
**Target Platform**: 本地 Electron 桌面端 + 本地 backend Agent 服务 + embedded n8n runtime  
**Project Type**: multi-project desktop app with local backend truth source and local renderer consumers  
**Performance Goals**: 保存 skill 确认后 1 秒内出现入库反馈；保存成功后当前会话 1 秒内可在“我的库”看到新增技能；对话模式分流在一次 Agent 响应内得出 A/B/C/闲聊结论  
**Constraints**: backend 必须成为 skills 库与分流的唯一真相源；前端不得继续维护 mock skills 或硬编码快捷技能；skills 库先做本地 JSON，不引入数据库；保持 MimicLaw 闲聊透传不退化  
**Scale/Scope**: 单用户本地技能库、几十个以内的 skill JSON、单客户端单 backend 会话语义检索

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `.specify/memory/constitution.md` 仍是模板占位，仓库当前实际治理依赖根级/模块级 `AGENTS.md`。
- 本轮设计遵守三条现行铁律：
  - 单一真相源：skills 库只存在于 backend JSON repository。
  - 消灭特殊情况：移除前端 mock skills 与硬编码快捷项，不再允许 UI 自己猜分流。
  - 局部改动优先：教学模式与对话模式都落在 `backend + aily-blockly`，不扩散到 `frontend` Flutter。
- Gate result: PASS

## Project Structure

### Documentation (this feature)

```text
specs/005-skills-library-dialogue/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── AGENTS.md
│   └── skill-library-dialogue-contract.md
├── checklists/
│   ├── AGENTS.md
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── data/
│   └── skills/
├── src/
│   ├── agent-server/
│   │   ├── agent-factory.ts
│   │   ├── agent-service.ts
│   │   └── server.ts
│   └── agents/
│       ├── dialogue-mode/
│       │   ├── dialogue-mode-catalog.ts
│       │   ├── dialogue-mode-router.ts
│       │   ├── dialogue-mode-service.ts
│       │   └── skill-library-repository.ts
│       ├── config-workflow-orchestrator.ts
│       ├── session-service.ts
│       └── types.ts
└── tests/
    ├── integration/
    └── unit/

aily-blockly/
├── electron/
│   ├── preload.js
│   ├── tesseract-ipc.js
│   └── tesseract-runtime.js
├── src/app/
│   ├── services/
│   │   └── tesseract-skill-library.service.ts
│   ├── tools/skill-center/
│   │   ├── skill-center.component.ts
│   │   ├── skill-center.component.html
│   │   └── skill-center.component.scss
│   └── tools/aily-chat/
│       ├── aily-chat.component.ts
│       ├── aily-chat.component.html
│       ├── components/x-dialog/x-aily-dialogue-mode-viewer/x-aily-dialogue-mode-viewer.component.ts
│       └── services/
│           ├── tesseract-chat.service.ts
│           ├── tesseract-agent-response-adapter.ts
│           └── tesseract-dialogue.models.ts
```

**Structure Decision**: backend 负责技能库持久化、技能匹配与分流决策；`aily-blockly` 负责消费保存候选、确认入库、展示真实技能库与动效。这样“技能是否存在”“该走 A/B/C 还是 MimicLaw”都不会再被 UI 硬编码污染。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
