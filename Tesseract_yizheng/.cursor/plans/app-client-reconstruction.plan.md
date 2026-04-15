## 一体化桌面客户端改造计划：所有业务窗口内嵌到单主窗口，桌面链路完全脱 Flutter

### Summary
- 桌面端统一收敛为 **一个 Electron 主窗口 + Angular 主应用**，不再弹出任何业务子窗口；只保留系统级原生对话框，例如文件选择器、权限授权、保存路径选择。
- Flutter 继续保留移动端能力，但从桌面链路中完全移除。桌面数字孪生迁入 Angular 主客户端，桌面不再依赖 `18082`、hidden preload window、外部 Flutter Web。
- 当前所有 `openWindow()` 驱动的业务窗口都要改成主窗口内的 **路由页 / 右侧工作台 / 底部面板 / modal** 四种内嵌承载形态。
- 迁移采用 **分阶段切换**：先搞定开发体验和打包基础，再补齐 Angular 内嵌承载层和桌面数字孪生，再切默认，再删除桌面 Flutter 与 BrowserWindow 业务窗依赖。

---

### Phase 0：开发体验优化（一条命令启动）

> 目标：消灭 4 个 Terminal tab，一条命令拉起全部服务。这是后续所有改造的基础——开发效率先行。

#### 0.1 修改 `electron-dev.js` — 集成全部服务启动

当前 `electron-dev.js` 只管 Angular dev server + Electron。改为同时管理 backend 和 Flutter（过渡期）。

启动流程变为：
```
prepare:tesseract-runtime（确保 backend dist 存在）
    ↓
┌─────────────────────┬──────────────────────────┐
│ Angular dev server  │ Flutter dev server       │
│ (port 4200, HMR)   │ (dev_web_start.sh)       │
│                     │ (port 18081→18082 proxy)  │
└─────────────────────┴──────────────────────────┘
    ↓ 两者都 ready 后
Electron（auto 模式，TesseractRuntime 自动管理 backend 子进程）
```

具体改动：
- 在 `main()` 中 Angular spawn 同时，并行 spawn `frontend/dev_web_start.sh` 作为子进程
- 添加 `waitForPort(18082)` 等待 Flutter ready（timeout 120s，Flutter DDC 较慢）
- 将 Flutter 进程加入 `shutdown()` 清理
- 添加 `--no-flutter` flag 跳过（不需要数字孪生时）
- 不再默认传 `--backend-mode external`，使用 `auto` 模式（TesseractRuntime 自动管理 backend 子进程）
- 添加 `--no-backend` flag 供需要手动调试 backend 的场景

关键文件：`aily-blockly/scripts/electron-dev.js`

#### 0.2 添加统一 npm script

在 `aily-blockly/package.json` 中添加：
```json
"dev": "node scripts/electron-dev.js",
"dev:desktop": "node scripts/electron-dev.js --no-flutter"
```

`dev` = 全量启动（过渡期含 Flutter）；`dev:desktop` = 纯桌面链路（Phase 2+ 后成为默认）。

关键文件：`aily-blockly/package.json`

#### 0.3 更新 `dev-up-macos.sh`

默认行为改为只开一个 Terminal tab 跑 `cd aily-blockly && npm run dev`。保留 `--legacy` flag 兼容旧的 4-tab 模式。

关键文件：`dev-up-macos.sh`

#### 0.4 验证
- `cd aily-blockly && npm run dev` 一条命令启动
- 确认 backend 自动启动：`curl http://127.0.0.1:3005/api/health`
- 确认 Angular HMR 正常
- 确认 Flutter 数字孪生可访问（过渡期）：`http://127.0.0.1:18082`
- Electron 窗口正常加载 Angular

---

### Phase 1：生产打包基础 — 补齐 `.tesseract-runtime` 与 electron-builder

> 目标：让 `npm run build:mac` 产出一个自包含的 .app，双击即可运行，不依赖外部目录或开发工具。

#### 1.1 `prepare-tesseract-runtime.js` 补齐 backend node_modules

当前只复制 `dist/` + `package.json`，缺少 `node_modules`。backend 子进程启动时需要依赖。

改动：在 Step 5（复制 backend dist）之后，增加：
- 在 `.tesseract-runtime/backend/` 中执行 `npm ci --omit=dev`（只装生产依赖，减小体积）
- 或者直接复制 `../backend/node_modules`（更快但更大）
- 推荐方案：`npm ci --omit=dev`，因为 backend 的 devDependencies 不需要打包

关键文件：`aily-blockly/scripts/prepare-tesseract-runtime.js`

#### 1.2 `prepare-tesseract-runtime.js` 增加 n8n 打包

当前 n8n 只在 sibling 目录原地构建，不复制。生产 .app 内找不到 n8n。

改动：在 backend 复制之后，增加 n8n 处理：
1. 在 `../n8n/n8n-master` 中执行 `pnpm --filter @n8n/cli deploy .tesseract-runtime/n8n`
   - `pnpm deploy` 会把 CLI 包及其所有依赖扁平化复制到目标目录，脱离 pnpm workspace
2. 复制 `n8n-cli-bootstrap.js` 到 `.tesseract-runtime/n8n/`（如果 n8n-runtime.js 需要它）
3. 更新 manifest.json

关键文件：`aily-blockly/scripts/prepare-tesseract-runtime.js`

#### 1.3 `n8n-runtime.js` 增加打包路径 fallback

当前 `resolveN8nRoot()` 只查 `../../n8n/n8n-master`（sibling 路径）。

改动：增加 `.tesseract-runtime/n8n` 作为 fallback 路径（与 `tesseract-runtime.js` 的 `resolveBackendRoot()` 同模式）。

关键文件：`aily-blockly/electron/n8n-runtime.js`

#### 1.4 `electron-builder` 配置补齐 extraResources

当前 `.tesseract-runtime/` 未列入 `extraResources`，打包后 .app 内不包含 backend 和 n8n。

改动：在 `package.json` 的 `build.extraResources` 中添加：
```json
{
  "from": ".tesseract-runtime",
  "to": "app/.tesseract-runtime",
  "filter": ["**/*", "!**/manifest.json"]
}
```

关键文件：`aily-blockly/package.json`（build 配置段）

#### 1.5 验证
- `npm run build:mac` 成功产出 .app
- .app 内包含 `Resources/app/.tesseract-runtime/backend/` 和 `Resources/app/.tesseract-runtime/n8n/`
- 双击 .app，backend 和 n8n 子进程自动启动
- `curl http://127.0.0.1:<port>/api/health` 返回 ok

---

### Phase 2：桌面数字孪生迁入 Angular，移除桌面 Flutter 依赖

> 目标：桌面端不再需要 Flutter Web server，数字孪生在 Angular 主窗口内以面板形式呈现。

#### 2.1 three.js viewer 静态资产复制

将 `frontend/web/model_viewer/`（three.js viewer 独立页面）复制到 `aily-blockly/src/assets/model-viewer/` 或通过构建脚本复制到 `dist/` 中。

这个 viewer 是纯静态 HTML+JS，不依赖 Flutter，可以直接被 Angular 的 `<iframe>` 加载。

关键文件：
- 源：`frontend/web/model_viewer/`（`index.html` + `viewer.js`）
- 目标：`aily-blockly/src/assets/model-viewer/`

#### 2.2 新增 Angular 数字孪生状态服务

新建 `DigitalTwinDesktopService`，吸收当前 Flutter 桌面链路承担的职责：

```typescript
// aily-blockly/src/app/services/digital-twin-desktop.service.ts
@Injectable({ providedIn: 'root' })
export class DigitalTwinDesktopService {
  applyScene(envelope: DigitalTwinSceneEnvelope): void;
  applyPreviewState(envelope: PreviewStateEnvelope): void;
  setInteractionMode(mode: string): void;
  handleViewerReady(payload: any): void;
  handleConsumedAck(payload: any): void;
}
```

该服务通过 Electron IPC 接收 `digital-twin-scene-updated` / `digital-twin-preview-state-updated` 事件，转发给 viewer iframe。

协议桥接：复用 `iframe.component.ts` 中已有的 `postMessage` 协议（`tesseract-digital-twin-*` 消息族），Angular 组件作为中间层在 IPC 和 iframe postMessage 之间转译。

关键文件：
- 新建：`aily-blockly/src/app/services/digital-twin-desktop.service.ts`
- 复用：`aily-blockly/src/app/windows/iframe/iframe.component.ts`（postMessage 协议）

#### 2.3 新增数字孪生内嵌面板组件

新建 `DigitalTwinPanelComponent`，作为右侧工作台的一个面板：

- 内嵌 `<iframe>` 加载 `assets/model-viewer/index.html`（three.js viewer）
- 在 iframe 上层叠加 Angular 原生的控制面板（preview sessions、control console）
  - v1 可以先只做 viewer + 基础控制，逐步补齐 Flutter 端的完整 UI
- 通过 `DigitalTwinDesktopService` 接收场景数据并转发给 iframe

关键文件：
- 新建：`aily-blockly/src/app/components/digital-twin-panel/`
- 参考：`frontend/lib/features/digital_twin/` 中的 Flutter 实现

#### 2.4 feature flag 双轨切换

添加 feature flag `DESKTOP_DIGITAL_TWIN=angular`（默认）/ `flutter`（回退）：
- `angular`：数字孪生走 Angular 内嵌面板
- `flutter`：保留旧链路（需要 Flutter dev server）

关键文件：`aily-blockly/electron/config/config.json` 或环境变量

#### 2.5 移除 Electron 端 Flutter 相关逻辑

当 feature flag 切到 `angular` 后：
- `window.js` 中 `preloadDigitalTwin()` 不再创建 hidden BrowserWindow
- `window.js` 中 `broadcastDigitalTwinScene/PreviewState` 改为向主窗口 renderer 发送 IPC
- 移除 `AILY_TESSERACT_FRONTEND_URL` / `TESSERACT_FRONTEND_URL` 环境变量依赖

关键文件：
- `aily-blockly/electron/window.js`
- `aily-blockly/electron/main.js`

#### 2.6 验证
- 桌面数字孪生在主窗口右侧面板内正常渲染
- viewer ready → scene replay → consumed ack 完整链路通过
- preview state 实时更新
- 不再创建 hidden digital twin BrowserWindow
- 桌面运行链路不再依赖 `18082`
- Flutter 移动端仍能独立运行

---

### Phase 3：UI orchestration 重构 — 废弃业务级 `openWindow`

> 目标：所有业务功能收进主窗口，`openWindow()` 仅保留系统级用途。

#### 3.1 主窗口承载层落地

在 Angular 主窗口中新增三个承载区域的 host 组件：

```typescript
// 面板 ID 类型定义
type WorkbenchPanelId = 'ai-chat' | 'digital-twin' | 'model-store' | 'skill-center';
type BottomPanelId = 'terminal' | 'log' | 'serial-monitor';
type ModalId = 'project-new' | 'settings' | 'history' | 'about';
```

关键文件：
- `aily-blockly/src/app/services/ui.service.ts`（扩展 API）
- 主窗口布局组件（新增 workbench host、bottom panel host）

#### 3.2 `UiService` 扩展

在现有 `UiService` 上新增四类动作（保持向后兼容）：

```typescript
navigateToWorkspace(route: string, context?: any): void;
openWorkbenchPanel(panelId: WorkbenchPanelId, payload?: any): void;
openBottomPanel(panelId: BottomPanelId, payload?: any): void;
openModal(modalId: ModalId, payload?: any): void;
```

`openWindow()` 保留但加 `console.warn` 告警，短期只允许系统级或迁移白名单调用。

关键文件：`aily-blockly/src/app/services/ui.service.ts`

#### 3.3 逐个迁移 openWindow 调用点

完整调用点清单及迁移目标：

| # | 调用位置 | 当前 path | 迁移目标 |
|---|---|---|---|
| 1 | `header.component.ts:467` | `project-new` | `openModal('project-new')` |
| 2 | `header.component.ts:528` | `settings` | `openModal('settings')` |
| 3 | `tool-container.component.ts` | `simulator` | 主工作区二级 route |
| 4 | `tool-container.component.ts` | `model-store` | `openWorkbenchPanel('model-store')` |
| 5 | `tool-container.component.ts` | `serial-monitor` | `openBottomPanel('serial-monitor')` |
| 6 | `pinmap.component.ts` | `iframe?url=pinmap` | 主窗口内嵌 iframe 容器 |
| 7 | `circuit-graph.component.ts` | `iframe?url=circuit` | 主窗口内嵌 iframe 容器 |
| 8 | `circuit-graph.component.ts` | `iframe?url=circuit(readonly)` | 主窗口内嵌 iframe 容器 |
| 9 | `float-sider.component.ts:221` | `iframe?url=digital-twin` | `openWorkbenchPanel('digital-twin')` |
| 10 | `aily-chat.component.ts:6263` | `iframe?url=digital-twin-assembly` | `openWorkbenchPanel('digital-twin')` + assembly mode |
| 11 | `model-store.component.ts:246` | `model-train` | 死代码，直接删除 |
| 12 | `model-detail.component.ts:140` | `model-deploy/*` | `openModal('model-deploy')` |

关键文件：上表中所有调用位置文件

#### 3.4 `IframeComponent` 解耦

`IframeComponent` 不再与 BrowserWindow 强绑定，变成主窗口内可嵌入的通用外部页容器。

关键文件：`aily-blockly/src/app/windows/iframe/iframe.component.ts`

#### 3.5 验证
- 所有业务入口在主窗口内完成跳转或展开，不弹独立窗口
- `openWindow()` 调用只剩系统级场景
- 各面板切换流畅，状态保持正确

---

### Phase 4：切默认并清理旧链路

> 目标：删除所有桌面 Flutter 依赖和业务 BrowserWindow 逻辑。

#### 4.1 删除桌面 Flutter 链路
- 删除 `preloadDigitalTwin()` 函数及调用
- 删除 `broadcastDigitalTwinScene/PreviewState` 中的子窗口广播逻辑
- 删除 `AILY_TESSERACT_FRONTEND_URL` / `TESSERACT_FRONTEND_URL` 环境变量处理
- 删除 `windowRole='digital-twin'` / `'digital-twin-assembly'` 特殊处理
- 删除 `electron-dev.js` 中的 Flutter dev server 启动逻辑
- `dev:desktop` 变为默认的 `dev`

#### 4.2 删除业务 BrowserWindow 逻辑
- `window.js` 中 `window-open` handler 只保留系统级白名单
- 清理 `openWindows` Map 中的业务窗口管理代码
- 删除 `windows/*` 路由中不再需要的独立窗口页面

#### 4.3 更新开发脚本
- `dev-up-macos.sh` 默认行为变为 `cd aily-blockly && npm run dev`（不含 Flutter）
- 移除 `--legacy` 4-tab 模式
- 更新 `quickstart.md` 和相关文档

#### 4.4 验证
- 完整回归测试（见下方 Test Plan）
- 确认 Flutter 移动端仍能独立运行
- 确认桌面链路无任何 Flutter / 18082 依赖残留

---

### Interfaces / Contract Changes
- 新增 Angular 内部工作台契约：
  - `WorkbenchPanelId = 'ai-chat' | 'digital-twin' | 'model-store' | 'skill-center' | ...`
  - `BottomPanelId = 'terminal' | 'log' | 'serial-monitor'`
  - `ModalId = 'project-new' | 'settings' | 'history' | 'about'`
- 数字孪生桌面状态服务提供固定接口：
  - `applyScene(envelope)`
  - `applyPreviewState(envelope)`
  - `setInteractionMode(mode)`
  - `handleViewerReady(payload)`
  - `handleConsumedAck(payload)`
- backend 与 runtime 对外协议不改：scene envelope、preview state、control message、consumed ack 语义保持兼容，Angular 桌面版必须吃现有 payload。
- 废弃项：
  - 业务级 `UiService.openWindow()` 默认用法
  - Electron `preloadDigitalTwin()` 默认链路
  - 所有桌面数字孪生外部 URL / Flutter Web 默认依赖
  - `windowRole='digital-twin'` 等业务子窗口角色

---

### Test Plan

#### 功能验证
- 启动桌面客户端后，只存在一个主业务窗口；任意业务入口都不会再弹独立 Electron 窗口
- 以下入口都必须在主窗口内完成跳转或展开：
  - float sider 打开数字孪生
  - AI chat 打开装配/数字孪生
  - project-new / settings / history / about
  - model deploy / model train / simulator
- 桌面数字孪生内嵌版必须完整通过：
  - viewer ready
  - scene replay
  - consumed ack
  - preview state 更新
  - top control / interaction mode 同步

#### 运行时验证
- `tesseract-studio` 现有 workflow 行为不能退化：
  - 无 workflow 占位态
  - workflow sync target 聚焦
  - n8n runtime 启停与嵌入
  - save snapshot / deploy workflow
- 生产打包验证：
  - `npm run build:mac` 产出 .app
  - .app 内包含 `Resources/app/.tesseract-runtime/backend/`（含 node_modules）
  - .app 内包含 `Resources/app/.tesseract-runtime/n8n/`
  - 双击 .app，backend + n8n 子进程自动启动
  - 所有功能正常工作，无需安装任何开发工具

#### 回归验证
- 移动端回归：Flutter 仍能独立运行，数字孪生与场景配置消费能力保持可用
- 禁回归检查：
  - 桌面运行链路不再依赖 `18082`
  - 不再自动创建 hidden digital twin BrowserWindow
  - 业务代码中不再新增 `openWindow()` 调用

---

### Execution Order & Dependencies

```
Phase 0（开发体验，1-2 天）:
  0.1: electron-dev.js 集成全部服务启动        [无依赖]
  0.2: 添加 npm run dev / dev:desktop          [依赖 0.1]
  0.3: 更新 dev-up-macos.sh                    [依赖 0.2]

Phase 1（生产打包基础，2-3 天）:
  1.1: prepare-tesseract-runtime 补齐 backend node_modules  [无依赖]
  1.2: prepare-tesseract-runtime 增加 n8n 打包              [无依赖，可与 1.1 并行]
  1.3: n8n-runtime.js 增加打包路径 fallback                 [依赖 1.2]
  1.4: electron-builder extraResources 配置                 [依赖 1.1, 1.2]

Phase 2（数字孪生迁移，5-7 天）:
  2.1: three.js viewer 静态资产复制             [无依赖]
  2.2: Angular 数字孪生状态服务                 [无依赖，可与 2.1 并行]
  2.3: 数字孪生内嵌面板组件                     [依赖 2.1, 2.2]
  2.4: feature flag 双轨切换                    [依赖 2.3]
  2.5: 移除 Electron 端 Flutter 逻辑            [依赖 2.4 验证通过]

Phase 3（UI orchestration 重构，5-7 天）:
  3.1: 主窗口承载层 host 组件                   [无依赖，可与 Phase 2 并行]
  3.2: UiService 扩展                          [依赖 3.1]
  3.3: 逐个迁移 openWindow 调用点               [依赖 3.2]
  3.4: IframeComponent 解耦                     [依赖 3.3]

Phase 4（清理，2-3 天）:
  4.1: 删除桌面 Flutter 链路                    [依赖 Phase 2 完成]
  4.2: 删除业务 BrowserWindow 逻辑              [依赖 Phase 3 完成]
  4.3: 更新开发脚本和文档                       [依赖 4.1, 4.2]
```

### Assumptions / Defaults
- "不要弹出来"按最严格口径执行：所有业务窗口都要内嵌到单主窗口；仅系统原生文件/权限对话框可保留。
- 桌面唯一主 UI 框架固定为 Angular，不做 Flutter 桌面共存方案。
- 为降低风险，数字孪生渲染层 v1 复用现有 Web viewer（`frontend/web/model_viewer/`），而不是重写 three.js 逻辑。
- 迁移按分阶段进行，但目标态是彻底去掉桌面 Flutter 与业务 BrowserWindow；不是长期双轨。
- n8n 通过 `pnpm deploy` 扁平化打包，脱离 pnpm workspace 依赖。
- backend 生产打包使用 `npm ci --omit=dev` 只装生产依赖，控制体积。
