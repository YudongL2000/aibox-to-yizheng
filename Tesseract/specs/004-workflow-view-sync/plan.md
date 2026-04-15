# Implementation Plan: 工作流视图同步闭环

**Branch**: `004-workflow-view-sync` | **Date**: 2026-04-02 | **Spec**: [/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/004-workflow-view-sync/spec.md](/mnt/c/Users/sam/Documents/Sam/code/Tesseract/specs/004-workflow-view-sync/spec.md)
**Input**: Feature specification from `/specs/004-workflow-view-sync/spec.md`

## Summary

修复 `aily-blockly` 中“右侧聊天已创建、左侧活动工作区仍停在主页或旧流程”的裂脑，把 workflow 创建结果、活动工作区 workflow 引用、左侧嵌入式 n8n 视图收成一条单向同步链；无 workflow 的工作区只显示占位态，创建成功后自动聚焦到新 workflow，不再依赖浏览器回退或手动补点。

## Technical Context

**Language/Version**: TypeScript on Node.js + Angular/Electron desktop renderer  
**Primary Dependencies**: Angular router、Electron IPC、embedded n8n runtime、本地项目快照服务  
**Storage**: 本地项目文件与 `.tesseract/workflow.json` 快照  
**Testing**: `npx tsc -p tsconfig.app.json --noEmit`、`npx tsc -p tsconfig.spec.json --noEmit`、`npx ng build --configuration development`、现有 Jasmine specs  
**Target Platform**: Windows/desktop Electron client with embedded n8n webview  
**Project Type**: Desktop app with local runtime + embedded web workspace  
**Performance Goals**: 无 workflow 项目在 2 秒内显示占位；创建成功后 5 秒内自动显示目标 workflow  
**Constraints**: backend workflow 引用是唯一真相源；主路径不得依赖外部浏览器；不得让主页或第三方 workflow 污染无 workflow 活动工作区  
**Scale/Scope**: 单客户端、单活动工作区、单嵌入式 n8n 实例的工作流显示闭环

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- `.specify/memory/constitution.md` 仍是模板占位，仓库当前以根级 `AGENTS.md` 和模块 `AGENTS.md` 作为实际治理规则。
- 设计符合现有约束：不引入第二真相源；优先消除“主页/浏览器回退”这种特殊情况；实现范围集中在 `aily-blockly`，`frontend` 只作行为参考。
- Gate result: PASS

## Project Structure

### Documentation (this feature)

```text
specs/004-workflow-view-sync/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── workflow-view-sync-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
aily-blockly/
├── electron/
│   └── n8n-runtime.js
├── src/app/editors/tesseract-studio/
│   ├── tesseract-studio.component.ts
│   ├── tesseract-studio.component.html
│   └── tesseract-studio.component.scss
└── src/app/tools/aily-chat/
    ├── aily-chat.component.ts
    └── services/
        ├── tesseract-chat.service.ts
        ├── tesseract-chat.service.spec.ts
        ├── tesseract-agent-response-adapter.ts
        └── tesseract-agent-response-adapter.spec.ts

frontend/
└── lib/module/home/widget/ai_interaction_window.dart   # 行为参考，不作为主实现落点
```

**Structure Decision**: 本 feature 的正式改动集中在 `aily-blockly` 的聊天动作层、项目工作区层和 embedded n8n runtime 层；`frontend` 只作为已验证过的 webUI 自动聚焦模式参考，不复制实现。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
