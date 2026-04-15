# 工程整改执行文档

## 定位

这不是设计稿，也不是技术愿景文档。
这是一份执行清单，用来把当前仓库从“能跑的原型”收敛到“可持续开发的工程”。

当前需求“数字孪生组件坐标实时显示与直接调节”不取消，但不直接硬上。
先修复会污染需求开发的基础问题，再进入功能开发。

## 当前基线

- `flutter analyze --no-pub`: `61 error / 63 warning / 1162 info`
- `lib` 下 Dart 文件数: `154`
- `test` 下 Dart 文件数: `1`
- `print(` 调用数: `254`
- `TODO:` 标记数: `43`
- `dart:html` / `dart:js` 引用数: `14`

## 当前执行状态

- `Phase 0`: 已完成第一轮止血
  - 登录链路已改为读取真实输入，不再使用固定账号密码
  - 部署链路已去掉伪成功与硬编码 Bearer token，失败时明确报错
- `Phase 1`: 已完成第一轮静态健康恢复
  - `flutter analyze --no-pub` 已达到 `0 error / 60 warning / 1202 info`
  - 通过兼容 getter、上传兜底适配器和旧依赖清理，消除了仓库级红灯
- `Phase 2`: 已完成
  - 数字孪生场景协议已补齐 `rotation`，并以 degree 为统一展示单位
  - Flutter 与 iframe 已建立带 `source/channel/version` 的稳定协议
  - `workflow.meta` 中的数字孪生场景现在会注入工作台
- `Phase 3`: 已完成
  - 支持选中特定模型、平移/旋转模式切换、实时坐标显示与数值回写
  - 支持坐标快速微调与回到场景初始位姿
- `Phase 4`: 已完成当前阶段封口
  - `flutter test --no-pub` 通过
  - `flutter build web --no-pub --dart-define=USE_WEB_PROXY=true --dart-define=SKIP_LOGIN=true` 通过
  - 项目地图与模块级 AGENTS 已同步

## 总目标

1. 恢复仓库一致性，让“可运行”和“可维护”不再互相矛盾。
2. 清理假状态、假成功、硬编码凭据和漂移配置。
3. 收口数字孪生渲染边界，为坐标编辑功能建立稳定落点。
4. 在可验证前提下实现“选中组件、实时查看坐标、直接调节坐标”的需求。

## 执行原则

- 先消除撒谎的路径，再开发新功能。
- 先清零 active path 的 error，再谈结构优化。
- 先建立边界，再加交互。
- 每个阶段都必须有可验收出口，不能只做“差不多”。

## Phase 0 - 止血与恢复真实状态

### 目标

让系统先说真话。

### 任务

1. 去掉登录链路中的固定账号密码，登录请求改为真实读取输入框内容。
2. 去掉部署链路中 `ok = true` 的伪成功逻辑，未完成部署时不得显示“已部署”。
3. 移除源码中的硬编码 Bearer token，统一改为从受控配置或会话状态获取。
4. 统一 HTTP 配置出口，避免页面和 API 层继续散落硬编码地址。

### 主要文件

- `lib/module/login/ui/login_page_new.dart`
- `lib/server/api/login_api.dart`
- `lib/module/home/widget/ai_interaction_window.dart`
- `lib/server/Http_config.dart`
- `lib/server/api/agent_*.dart`
- `lib/server/api/workflow_api.dart`

### 验收标准

- 页面输入什么账号密码，请求就发送什么账号密码。
- 部署失败时界面明确失败，不再提示“已部署”。
- 仓库中不再存在硬编码业务 token。
- 主流程不再依赖源码里的固定后端地址片段。

## Phase 1 - 仓库一致性与静态健康恢复

### 目标

把当前仓库从“局部可运行”拉回“整体可分析”。

### 任务

1. 清理 `flutter analyze` 的 `error` 级问题，优先处理 active path 和明显断裂模块。
2. 修正已失效的配置字段引用，例如 `HttpConfig.baseAdminUrl`、`HttpConfig.assetsImgUrl`。
3. 处理缺失文件与缺失依赖，例如上传链路和 `flutter_bloc` 引用漂移。
4. 删除或隔离已经失效但仍被扫描到的旧模块，避免死代码持续制造红灯。
5. 建立最低限度规范：
   - `print` 改为受控日志入口
   - 新增 TODO 必须带 owner 和退出条件
   - Web-only 代码不允许继续侵入业务页

### 主要文件

- `lib/server/http_config_admission.dart`
- `lib/utils/ui_utils/default.dart`
- `lib/utils/ui_utils/hx_end_drawer.dart`
- `lib/utils/ui_utils/hx_image.dart`
- `lib/utils/tools/upload_img_utils.dart`
- `lib/utils/import/web_work_his.dart`
- `pubspec.yaml`
- `analysis_options.yaml`

### 验收标准

- `flutter analyze --no-pub` 至少达到 `0 error`。
- 仓库不存在“引用不存在字段/文件/依赖”的断裂代码。
- active path 的 warning 明显下降，死代码被标记或移除。

## Phase 2 - 数字孪生链路收口

### 目标

给数字孪生功能建立可扩展边界，避免继续把 Flutter 页面、iframe、three.js 交互和业务状态揉在一起。

### 任务

1. 抽出数字孪生状态模型，明确：
   - 当前场景配置
   - 当前模型变换状态
   - 当前选中模型
   - 当前交互模式（平移 / 旋转）
2. 给 3D viewer 建立明确通信协议：
   - Flutter -> iframe: 选择模型、设置交互模式、设置位置/旋转
   - iframe -> Flutter: 选中变化、位置变化、旋转变化、加载状态
3. 在场景配置中补足 `rotation` 字段，并定义单位。
4. 把工作台页面里的数字孪生状态读写收口到一处，避免多个来源同时改 UI。

### 主要文件

- `lib/module/home/home_workspace_page.dart`
- `lib/module/home/widget/model_3d_viewer.dart`
- `lib/module/device/model/device_event_model.dart`
- `web/model_viewer/index.html`
- `web/model_viewer/viewer.js`

### 验收标准

- 数字孪生 viewer 与 Flutter 间存在稳定的消息协议。
- 模型位置和旋转都有单一真相源。
- 页面不再直接推断 three.js 内部状态。
- 后续坐标编辑需求可以不依赖临时变量或散落回调实现。

## Phase 3 - 当前需求开发：坐标实时显示与直接调节

### 目标

实现“手动调整模型时，位置坐标与旋转坐标实时变化，并可直接输入调节”。

### 任务

1. 支持在数字孪生界面选中特定模型。
2. 支持平移与旋转两种编辑模式切换。
3. 组件被拖动或旋转时，实时回传：
   - `position.x / y / z`
   - `rotation.x / y / z`
4. 页面显示当前选中模型的实时坐标面板。
5. 页面支持直接输入坐标数值并同步回写到 3D 模型。
6. 场景卡片中同步显示当前模型坐标，方便识别与比对。
7. 明确旋转单位，默认使用对业务更友好的展示单位。

### 主要文件

- `lib/module/home/home_workspace_page.dart`
- `lib/module/home/widget/model_3d_viewer.dart`
- `lib/module/device/model/device_event_model.dart`
- `web/model_viewer/viewer.js`

### 验收标准

- 手动拖动模型时，位置数值实时刷新。
- 手动旋转模型时，旋转数值实时刷新。
- 输入框修改数值后，模型立即更新到目标坐标。
- 多模型场景下可以明确区分当前选中的模型及其坐标。
- 刷新页面后，默认场景和手动调节结果的来源关系清晰，不出现“双真相源”。

## Phase 4 - 回归验证与交付门禁

### 目标

避免新功能再次把系统带回不可控状态。

### 任务

1. 为场景模型和变换模型补纯逻辑测试。
2. 为 Flutter 与 iframe 协议补最小回归测试或模拟验证。
3. 补充工作台交互 smoke checklist：
   - 启动
   - 登录
   - 工作流创建
   - 场景注入
   - 模型选中
   - 平移
   - 旋转
   - 数值输入回写
4. 更新项目地图文档，确保后来者能找到坐标编辑相关入口。

### 主要文件

- `test/widget_test.dart`
- `CLAUDE.md`
- `AGENTS.md`
- `lib/module/home/CLAUDE.md`
- `lib/module/home/widget/CLAUDE.md`
- `lib/module/device/model/CLAUDE.md`

### 验收标准

- `flutter test --no-pub` 通过。
- 当前主流程 smoke checklist 全部通过。
- 变更入口、数据流和调试方式在文档中可追踪。

## 当前需求的准入条件

进入 Phase 3 之前，至少满足以下条件：

1. `Phase 0` 完成。
2. `flutter analyze --no-pub` 达到 `0 error`。
3. 数字孪生渲染链路的消息协议已经建立，不再直接靠页面猜测 iframe 内部状态。

原因很简单：
如果现在直接在现有结构上追加坐标编辑，结果只会是又一个功能能演示，但状态源更多、回归更难、后面更难维护。

## 建议排期

- `Phase 0`: 1 到 2 天
- `Phase 1`: 2 到 4 天
- `Phase 2`: 2 到 4 天
- `Phase 3`: 2 到 3 天
- `Phase 4`: 1 到 2 天

总计：`8 到 15 天`，取决于 dead code 清理范围和是否同步做结构拆分。

## 不在本轮处理的内容

- 全量 UI 重设计
- 非 Web 平台兼容性全面回收
- 旧业务模块的彻底重构
- 与当前数字孪生链路无关的历史页面翻修

## 执行顺序

1. 先完成 `Phase 0`
2. 再完成 `Phase 1`
3. 接着做 `Phase 2`
4. 条件满足后进入 `Phase 3`
5. 最后用 `Phase 4` 封口

没有完成前一阶段验收，不进入下一阶段。
