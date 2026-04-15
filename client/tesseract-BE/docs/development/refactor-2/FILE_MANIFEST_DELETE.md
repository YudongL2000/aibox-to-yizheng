# 文件删除清单

## 说明
此文档列出所有需要删除的文件和目录。按模块分组，每项包含：
- 文件路径
- 删除原因
- 依赖影响

---

## 1. 模板系统（Templates）

### 目录
```
DELETE src/templates/                          # 整个目录
```

### 文件
```
src/templates/template-fetcher.ts              # 从 n8n.io 获取模板
src/templates/template-repository.ts           # 模板数据库操作
src/templates/template-service.ts              # 模板业务逻辑
src/templates/batch-processor.ts               # 批量处理模板
src/templates/metadata-generator.ts            # 生成模板元数据
src/templates/README.md                        # 模板说明文档
```

### 脚本
```
src/scripts/fetch-templates.ts                 # 获取模板脚本
src/scripts/fetch-templates-robust.ts          # 健壮版获取
src/scripts/sanitize-templates.ts              # 清理模板
src/scripts/test-templates.js                  # 测试模板功能
```

### MCP 工具文档
```
src/mcp/tool-docs/templates/                   # 整个目录
src/mcp/tool-docs/templates/get-template.ts
src/mcp/tool-docs/templates/search-templates.ts
src/mcp/tool-docs/templates/index.ts
```

### 依赖影响
- 移除 `template-repository` 相关导入
- 更新 `agent-db.ts` 移除 templates 表
- 更新 `mcp/tools.ts` 移除模板工具
- 更新 `package.json` 移除模板相关脚本

---

## 2. 遥测系统（Telemetry）

### 目录
```
DELETE src/telemetry/                          # 整个目录
```

### 文件
```
src/telemetry/batch-processor.ts               # 批量处理
src/telemetry/config-manager.ts                # 配置管理
src/telemetry/early-error-logger.ts            # 早期错误日志
src/telemetry/error-sanitization-utils.ts      # 错误清理工具
src/telemetry/error-sanitizer.ts               # 错误清理
src/telemetry/event-tracker.ts                 # 事件跟踪
src/telemetry/event-validator.ts               # 事件验证
src/telemetry/index.ts                         # 导出
src/telemetry/intent-classifier.ts             # 意图分类
src/telemetry/intent-sanitizer.ts              # 意图清理
src/telemetry/mutation-tracker.ts              # 变更跟踪
src/telemetry/mutation-types.ts                # 变更类型
src/telemetry/mutation-validator.ts            # 变更验证
src/telemetry/performance-monitor.ts           # 性能监控
src/telemetry/rate-limiter.ts                  # 限流
src/telemetry/startup-checkpoints.ts           # 启动检查点
src/telemetry/telemetry-error.ts               # 遥测错误
src/telemetry/telemetry-manager.ts             # 遥测管理器
src/telemetry/telemetry-types.ts               # 遥测类型
src/telemetry/workflow-sanitizer.ts            # 工作流清理
```

### 脚本
```
src/scripts/test-telemetry-mutations.ts
src/scripts/test-telemetry-mutations-verbose.ts
```

### 依赖影响
- 移除所有 telemetry 导入
- 可能需要在 agent-server 中移除遥测调用

---

## 3. 触发器系统（Triggers）

### 目录
```
DELETE src/triggers/                           # 整个目录
```

### 文件
```
src/triggers/handlers/base-handler.ts          # 基础处理器
src/triggers/handlers/chat-handler.ts          # 聊天处理器
src/triggers/handlers/form-handler.ts          # 表单处理器
src/triggers/handlers/webhook-handler.ts       # Webhook 处理器
src/triggers/index.ts                          # 导出
src/triggers/trigger-detector.ts               # 触发器检测
src/triggers/trigger-registry.ts               # 触发器注册表
src/triggers/types.ts                          # 触发器类型
```

### 依赖影响
- 移除 triggers 相关导入
- Agent 不使用触发器系统

---

## 4. n8n 自定义节点

### 目录
```
DELETE src/n8n/                                # 整个目录
```

### 文件
```
src/n8n/MCPApi.credentials.ts                  # MCP API 凭证
src/n8n/MCPNode.node.ts                        # MCP 节点定义
```

### 依赖影响
- Agent 不需要集成到 n8n 作为自定义节点

---

## 5. 测试脚本（Scripts）

### 删除大部分测试脚本，只保留核心
```
DELETE src/scripts/ 中的以下文件：

test-*.ts/js                                   # 所有测试脚本
├── test-autofix-documentation.ts
├── test-autofix-workflow.ts
├── test-execution-filtering.ts
├── test-llm-intent.ts
├── test-node-suggestions.ts
├── test-protocol-negotiation.ts
├── test-summary.ts
├── test-webhook-autofix.ts
├── test-nodes.ts
├── test-essentials.js
├── test-enhanced-validation.js
├── test-ai-workflow-validation.js
├── test-mcp-tools.js
├── test-n8n-validate-workflow.js
├── test-typeversion-validation.js
├── test-workflow-diff.js
├── test-tools-documentation.js
└── ... 所有其他 test-*.ts/js

debug-*.ts                                     # 所有调试脚本
├── debug-http-search.ts

cleanup-*.ts                                   # 清理脚本（已执行）
├── cleanup-nodes.ts
├── cleanup-templates.ts

其他
├── extract-from-docker.ts                     # Docker 提取
├── seed-canonical-ai-examples.ts              # 播种示例数据
├── rebuild-optimized.ts                       # 优化版重建（保留 rebuild.ts）
├── validation-summary.ts                      # 验证摘要
```

### 保留的核心脚本
```
KEEP:
src/scripts/rebuild.ts                         # 重建数据库
src/scripts/validate.ts                        # 验证数据
src/scripts/agent-db-init.ts                   # Agent 数据库初始化
```

---

## 6. 冗余服务（Services）

```
DELETE src/services/ 中的以下文件：

breaking-change-detector.ts                    # 破坏性变更检测
breaking-changes-registry.ts                   # 破坏性变更注册表
node-migration-service.ts                      # 节点迁移服务
node-version-service.ts                        # 节点版本服务
post-update-validator.ts                       # 更新后验证
workflow-versioning-service.ts                 # 工作流版本控制
sqlite-storage-service.ts                      # SQLite 存储（如果不用）
tool-variant-generator.ts                      # 工具变体生成器
ai-node-validator.ts                           # AI 节点验证器（可能冗余）
ai-tool-validators.ts                          # AI 工具验证器（可能冗余）
confidence-scorer.ts                           # 置信度评分
error-execution-processor.ts                   # 错误执行处理
execution-processor.ts                         # 执行处理器
node-documentation-service.ts                  # 节点文档服务（如果不用）
node-sanitizer.ts                              # 节点清理
node-similarity-service.ts                     # 节点相似度
operation-similarity-service.ts                # 操作相似度
resource-similarity-service.ts                 # 资源相似度
```

### 保留的核心服务
```
KEEP:
src/services/config-validator.ts
src/services/enhanced-config-validator.ts
src/services/expression-validator.ts
src/services/workflow-validator.ts
src/services/workflow-auto-fixer.ts
src/services/workflow-diff-engine.ts
src/services/n8n-api-client.ts
src/services/n8n-validation.ts
src/services/type-structure-service.ts
src/services/property-filter.ts
src/services/task-templates.ts
src/services/example-generator.ts
src/services/property-dependencies.ts
src/services/node-specific-validators.ts
src/services/universal-expression-validator.ts
src/services/expression-format-validator.ts
```

---

## 7. 冗余工具（Utils）

```
DELETE src/utils/ 中的以下文件：

documentation-fetcher.ts                       # 文档获取（模板相关）
enhanced-documentation-fetcher.ts              # 增强文档获取
template-node-resolver.ts                      # 模板节点解析
template-sanitizer.ts                          # 模板清理
npm-version-checker.ts                         # npm 版本检查
node-source-extractor.ts                       # 节点源提取
bridge.ts                                      # 桥接（用途不明）
ssrf-protection.ts                             # SSRF 保护（如果不需要）
url-detector.ts                                # URL 检测（如果不需要）
mcp-client.ts                                  # 工具类 MCP 客户端（与 agents/mcp-client.ts 重复）
```

### 保留的核心工具
```
KEEP:
src/utils/logger.ts
src/utils/console-manager.ts
src/utils/error-handler.ts
src/utils/cache-utils.ts
src/utils/simple-cache.ts
src/utils/validation-schemas.ts
src/utils/expression-utils.ts
src/utils/fixed-collection-validator.ts
src/utils/node-classification.ts
src/utils/node-type-normalizer.ts
src/utils/node-type-utils.ts
src/utils/node-utils.ts
src/utils/protocol-version.ts
src/utils/version.ts
src/utils/auth.ts
src/utils/n8n-errors.ts
```

---

## 8. 冗余数据文件

```
DELETE:
src/data/canonical-ai-tool-examples.json       # AI 工具示例数据
```

---

## 9. 冗余映射器

```
DELETE:
src/mappers/docs-mapper.ts                     # 文档映射器（如果不需要）
```

---

## 10. 根目录文件

```
DELETE 根目录中的以下文件：

ANALYSIS_QUICK_REFERENCE.md                   # 分析快速参考
MEMORY_N8N_UPDATE.md                           # n8n 更新记忆
MEMORY_TEMPLATE_UPDATE.md                      # 模板更新记忆
N8N_HTTP_STREAMABLE_SETUP.md                   # HTTP 流式设置
P0-R3-TEST-PLAN.md                             # 测试计划
README_ANALYSIS.md                             # 分析 README
test-output.txt                                # 测试输出
fetch_log.txt                                  # 获取日志
coverage.json                                  # 旧覆盖率数据
:memory:                                       # 不明文件
thumbnail.png                                  # 缩略图
versioned-nodes.md                             # 版本化节点文档
test-reinit-fix.sh                             # 测试重新初始化修复
monitor_fetch.sh                               # 监控获取脚本
n8n-nodes.db                                   # 空数据库文件
```

---

## 11. Docker 和部署（简化）

```
CONSIDER DELETE:
docker/                                        # Docker 相关文件
deploy/                                        # 部署文件
examples/                                      # 示例文件

docker-compose.extract.yml                     # 提取配置
docker-compose.n8n.yml                         # n8n 配置
docker-compose.test-n8n.yml                    # 测试 n8n
docker-compose.buildkit.yml                    # Buildkit 配置
Dockerfile.railway                             # Railway 部署
Dockerfile.test                                # 测试 Docker

KEEP:
Dockerfile                                     # 主 Dockerfile
docker-compose.yml                             # 主配置
```

---

## 12. 测试文件（tests/ 目录）

### 需要检查和清理的测试
```
tests/unit/templates/                          # 模板测试
tests/unit/telemetry/                          # 遥测测试
tests/unit/triggers/                           # 触发器测试
tests/integration/templates/                   # 模板集成测试

以及所有引用已删除模块的测试文件
```

---

## 13. 其他配置文件

```
CONSIDER DELETE:
.env.docker                                    # Docker 环境变量
.env.n8n.example                               # n8n 示例环境
railway.json                                   # Railway 配置
codecov.yml                                    # Codecov 配置
renovate.json                                  # Renovate 配置
_config.yml                                    # Jekyll 配置
.npmignore                                     # npm 忽略文件
package.runtime.json                           # 运行时包配置
vitest.config.benchmark.ts                     # 基准测试配置
```

---

## 执行命令

### 批量删除目录
```bash
cd /mnt/e/tesseract

# 删除模板系统
rm -rf src/templates/
rm -rf src/mcp/tool-docs/templates/

# 删除遥测系统
rm -rf src/telemetry/

# 删除触发器系统
rm -rf src/triggers/

# 删除 n8n 自定义节点
rm -rf src/n8n/

# 删除冗余数据
rm -rf src/data/
```

### 批量删除文件（需要逐个检查）
```bash
# 删除测试脚本
cd src/scripts/
ls test-*.* | xargs rm
ls debug-*.* | xargs rm
rm cleanup-nodes.ts cleanup-templates.ts
rm extract-from-docker.ts
rm seed-canonical-ai-examples.ts
rm rebuild-optimized.ts
rm validation-summary.ts

# 删除冗余服务
cd ../services/
rm breaking-change-detector.ts
rm breaking-changes-registry.ts
rm node-migration-service.ts
rm node-version-service.ts
rm post-update-validator.ts
rm workflow-versioning-service.ts
# ... 其他

# 删除冗余工具
cd ../utils/
rm documentation-fetcher.ts
rm enhanced-documentation-fetcher.ts
rm template-node-resolver.ts
rm template-sanitizer.ts
rm npm-version-checker.ts
# ... 其他

# 删除根目录文件
cd ../../
rm ANALYSIS_QUICK_REFERENCE.md
rm MEMORY_*.md
rm N8N_HTTP_STREAMABLE_SETUP.md
rm P0-R3-TEST-PLAN.md
rm README_ANALYSIS.md
rm test-output.txt
rm fetch_log.txt
rm coverage.json
rm :memory:
rm thumbnail.png
rm versioned-nodes.md
```

---

## 删除后验证

### 1. 检查构建
```bash
npm run typecheck
npm run build
```

### 2. 检查导入错误
```bash
# 查找可能的导入错误
grep -r "from.*templates" src/
grep -r "from.*telemetry" src/
grep -r "from.*triggers" src/
```

### 3. 更新配置
- 更新 `tsconfig.json` 排除已删除目录
- 更新 `package.json` 移除相关脚本
- 更新 `.gitignore` 如果需要

---

## 预估影响

### 代码行数
- **templates**: ~1,500 行
- **telemetry**: ~2,500 行
- **triggers**: ~800 行
- **n8n nodes**: ~400 行
- **test scripts**: ~5,000 行
- **redundant services**: ~3,000 行
- **redundant utils**: ~1,500 行
- **其他**: ~1,000 行

**总计删除**: ~15,700 行

### 文件数量
- **删除**: ~80-100 个文件
- **保留**: ~60-80 个核心文件

---

## 注意事项

1. **逐步删除**: 每删除一个模块后运行 typecheck
2. **保留 Git 历史**: 不要使用 `git rm -f`，保留历史以便回滚
3. **检查依赖**: 删除前搜索是否有其他文件引用
4. **更新文档**: 删除后更新 CLAUDE.md 和 README.md
5. **测试验证**: 确保 Agent 核心功能正常

---

**最后更新**: 2026-01-16
**执行状态**: 待执行
**风险等级**: 中等
