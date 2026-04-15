# scripts/
> L2 | 父级: ../CLAUDE.md

目录结构
git/: 仓库治理脚本目录，放分支清理等 git 运维入口。
test-*.{ts,js,sh}: 调试/回归脚本族，验证单点能力或集成链路。
generate-*.js: 报告与发布说明生成脚本族。
deploy-*.sh: 部署脚本族，负责本地或远端服务发布。
migrate-*.ts: 数据迁移脚本族，负责数据库或工具文档迁移。
update-*.{js,sh}: 版本与发布准备脚本族。

高频入口
analyze-optimization.sh: 性能分析包装脚本，串起 bench 与报告生成。
deploy-http.sh: HTTP 模式部署脚本，封装构建与服务启动。
deploy-to-vm.sh: VM 部署脚本，负责远端同步与启动。
publish-npm.sh: NPM 发布脚本，封装 build 与 publish 流程。
rebuild.ts: 全量重建 nodes 数据库的事实生成脚本。
validate.ts: 对 nodes 数据库做发布前关键校验与统计摘要。
update-and-publish-prep.sh: 更新依赖并准备发布的组合脚本。

架构决策
- `scripts/` 放仓库级运维与发布脚本，不承载运行时业务逻辑。
- `scripts/git/` 承接仓库治理脚本，把 git 清理规则从发布/测试脚本中拆开，减少同层职责混杂。
- 默认 dry-run，显式 `--apply` 才执行删除；破坏性动作必须先可见，再可做。

开发规范
- 新增脚本必须同步本文件，并在脚本头部补全 L3 契约。
- 会修改仓库状态的脚本默认先 dry-run，再用独立参数进入 apply。

变更日志
- 2026-03-12: 新增 scripts/git 子模块并迁移 git-prune-merged-branches.sh，收紧 scripts/ 的职责边界。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
