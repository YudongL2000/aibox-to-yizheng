# tesseract_FE - 面向 Web 优先交付的 Flutter 控制台应用
Flutter + Dart + Provider + Dio + MQTT + WebView/Model Viewer

<directory>
assets/ - 静态资源仓，承载图片、3D 模型与视频素材
lib/ - 应用主代码，聚合页面模块、网络层、缓存层与 UI 组件
test/ - 回归测试入口，优先放纯逻辑与可在 VM 自证的测试
web/ - Web 宿主壳与前端静态桥接资源
</directory>

<config>
pubspec.yaml - 依赖、资源声明与 Flutter 平台配置
analysis_options.yaml - Dart/Flutter 静态分析规则
README.md - 项目基础说明，当前信息较薄
dev_web_proxy.js - 本地 Web 同源代理，前置 Flutter web-server 并转发后端请求
dev_web_start.sh - 单入口开发启动脚本，前台跑 Flutter、后台托管代理并固定只走 18082
dev_web_stop.sh - 单入口开发清理脚本，结束 18081/18082 残留进程
ENGINEERING_REMEDIATION_PLAN.md - 分阶段整改执行文档，规定止血、收口、功能开发与回归门禁的落地顺序
CLAUDE.md - 项目宪法与全局地图，供后续 agent 快速建立上下文
</config>

变更日志
- 2026-03-17: 新增 `ENGINEERING_REMEDIATION_PLAN.md`，把仓库整改与数字孪生坐标编辑需求串成分阶段执行计划。
- 2026-03-17: 完成数字孪生 Phase 2/3，建立 Flutter <-> iframe 协议、workflow.meta 场景注入与坐标实时查看/调节能力。
- 2026-03-14: 补回 Web 单入口启动链，新增代理脚本、登录绕过开关与纯逻辑回归测试，恢复新解压目录的可启动状态。

法则: 极简·稳定·导航·版本精确
