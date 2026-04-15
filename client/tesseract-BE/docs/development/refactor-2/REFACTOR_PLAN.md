# Agent 架构重构计划

## 目标

将 n8n-mcp 项目精简为 AI Agent 系统核心，移除不必要的模块，保留：
1. n8n-mcp 核心能力（节点查询、验证、n8n API 客户端）
2. Agent 系统（需求理解、工作流生成、硬件组件管理）
3. Agent HTTP/WebSocket API
4. 前端界面

---

## 保留的核心模块

### 1. n8n-mcp 核心能力
```
src/database/
├── database-adapter.ts      # 数据库适配器
├── node-repository.ts       # 节点数据访问
├── schema.sql               # 数据库结构
└── nodes.db                 # 节点数据库

src/services/
├── config-validator.ts           # 节点配置验证
├── enhanced-config-validator.ts  # 增强验证
├── expression-validator.ts       # 表达式验证
├── workflow-validator.ts         # 工作流验证
├── workflow-auto-fixer.ts        # 自动修复
├── n8n-api-client.ts             # n8n API 客户端
└── type-structure-service.ts     # 类型结构服务

src/parsers/
├── node-parser.ts           # 节点解析
└── property-extractor.ts    # 属性提取

src/loaders/
└── node-loader.ts           # 节点加载

src/mcp/
├── server.ts                # MCP 服务器核心
├── tools.ts                 # MCP 工具定义
├── handlers-n8n-manager.ts  # n8n 管理处理器
└── tool-docs/               # 工具文档系统（保留核心）
```

### 2. Agent 系统
```
src/agents/
├── intake-agent.ts          # 需求理解
├── workflow-architect.ts    # AI 工作流生成
├── mcp-client.ts            # MCP 工具封装
├── hardware-components.ts   # 硬件组件定义
├── hardware-service.ts      # 硬件服务
├── llm-client.ts            # LLM 客户端
├── session-service.ts       # 会话管理
├── workflow-service.ts      # 工作流服务
├── agent-config.ts          # Agent 配置
├── agent-db.ts              # Agent 数据库
├── types.ts                 # Agent 类型定义
└── prompts/                 # Prompt 模板
    ├── architect-system.ts
    ├── few-shot-examples.ts
    └── error-patterns.ts

src/agent-server/
├── index.ts                 # 服务器入口
├── server.ts                # HTTP 服务器
├── websocket.ts             # WebSocket 处理
├── agent-service.ts         # Agent 服务层
└── agent-factory.ts         # Agent 工厂

apps/agent-ui/               # 前端界面（完整保留）
```

### 3. 核心工具和类型
```
src/utils/
├── logger.ts                # 日志工具
├── console-manager.ts       # 控制台管理
├── error-handler.ts         # 错误处理
├── cache-utils.ts           # 缓存工具
└── validation-schemas.ts    # 验证模式

src/types/
├── index.ts                 # 类型导出
├── node-types.ts            # 节点类型
├── instance-context.ts      # 实例上下文
└── session-state.ts         # 会话状态

src/config/
└── n8n-api.ts               # n8n API 配置
```

### 4. 核心脚本（保留最小集）
```
src/scripts/
├── rebuild.ts               # 重建数据库
├── validate.ts              # 验证数据
└── agent-db-init.ts         # Agent 数据库初始化
```

---

## 移除的模块

### 1. 模板系统（不需要）
```
DELETE src/templates/
├── template-fetcher.ts
├── template-repository.ts
├── template-service.ts
├── batch-processor.ts
└── metadata-generator.ts

DELETE src/scripts/
├── fetch-templates.ts
├── fetch-templates-robust.ts
├── sanitize-templates.ts
└── test-templates.js
```

### 2. 遥测系统（Agent 不需要）
```
DELETE src/telemetry/              # 完整删除
```

### 3. 触发器系统（Agent 不使用）
```
DELETE src/triggers/               # 完整删除
```

### 4. n8n 自定义节点（不需要集成到 n8n）
```
DELETE src/n8n/
├── MCPApi.credentials.ts
└── MCPNode.node.ts
```

### 5. 大量测试脚本（保留核心验证脚本）
```
DELETE src/scripts/
├── test-*.ts                      # 删除所有测试脚本
├── debug-*.ts                     # 删除调试脚本
├── extract-from-docker.ts
├── seed-canonical-ai-examples.ts
├── cleanup-nodes.ts               # 已执行完成，可删除
└── cleanup-templates.ts           # 已执行完成，可删除
```

### 6. 冗余服务（Agent 不使用）
```
DELETE src/services/
├── breaking-change-detector.ts
├── breaking-changes-registry.ts
├── node-migration-service.ts
├── node-version-service.ts
├── post-update-validator.ts
├── workflow-versioning-service.ts
├── sqlite-storage-service.ts      # 如果 Agent 不用 SQLite 存储
└── tool-variant-generator.ts
```

### 7. 冗余工具
```
DELETE src/utils/
├── documentation-fetcher.ts       # 模板相关
├── enhanced-documentation-fetcher.ts
├── template-node-resolver.ts
├── template-sanitizer.ts
├── npm-version-checker.ts         # 不需要检查 npm 版本
├── node-source-extractor.ts
├── bridge.ts                      # 不清楚用途
└── ssrf-protection.ts             # 如果 Agent 不需要
```

### 8. 冗余数据和映射器
```
DELETE src/data/
└── canonical-ai-tool-examples.json

DELETE src/mappers/
└── docs-mapper.ts                 # 如果不需要文档映射
```

### 9. MCP 工具文档系统（简化）
```
SIMPLIFY src/mcp/tool-docs/
# 只保留 Agent 需要的工具文档：
# - search-nodes
# - get-node
# - validate-node
# - validate-workflow
# - n8n-create-workflow
# - n8n-validate-workflow

DELETE:
├── templates/                     # 模板工具文档
└── guides/ai-agents-guide.ts      # 可能冗余
```

### 10. 根目录文件清理
```
DELETE:
├── ANALYSIS_QUICK_REFERENCE.md
├── MEMORY_N8N_UPDATE.md
├── MEMORY_TEMPLATE_UPDATE.md
├── N8N_HTTP_STREAMABLE_SETUP.md
├── P0-R3-TEST-PLAN.md
├── README_ANALYSIS.md
├── VERIFICATION_REPORT.md         # 在 docs/refactor 下
├── test-output.txt
├── fetch_log.txt
├── coverage.json                  # 旧的覆盖率数据
├── :memory:                       # 不明文件
└── thumbnail.png
```

### 11. Docker 和部署文件（简化）
```
DELETE docker/                     # 如果不需要
DELETE deploy/                     # 如果不需要
DELETE examples/                   # 示例文件

SIMPLIFY:
- 只保留一个主 Dockerfile
- 删除 docker-compose.*.yml 中不必要的配置
```

### 12. 测试文件（重新组织）
```
KEEP tests/ 但清理：
- 删除与已移除模块相关的测试
- 删除集成测试中的模板相关测试
- 保留 Agent 系统测试
- 保留核心验证测试
```

---

## 执行步骤

### Phase 1: 准备与备份
1. 创建 Git 分支 `refactor/agent-cleanup`
2. 备份当前数据库
3. 记录当前依赖版本

### Phase 2: 移除模块（按顺序）
1. **Templates** - 删除模板系统
   ```bash
   rm -rf src/templates/
   rm src/scripts/fetch-templates*.ts
   rm src/scripts/sanitize-templates.ts
   rm src/scripts/test-templates.js
   ```

2. **Telemetry** - 删除遥测系统
   ```bash
   rm -rf src/telemetry/
   ```

3. **Triggers** - 删除触发器系统
   ```bash
   rm -rf src/triggers/
   ```

4. **n8n Custom Nodes** - 删除自定义节点
   ```bash
   rm -rf src/n8n/
   ```

5. **Test Scripts** - 清理测试脚本
   ```bash
   cd src/scripts/
   # 只保留: rebuild.ts, validate.ts, agent-db-init.ts
   ```

6. **Services** - 删除冗余服务
   ```bash
   cd src/services/
   rm breaking-change-detector.ts
   rm breaking-changes-registry.ts
   rm node-migration-service.ts
   # ... 其他
   ```

7. **Utils** - 删除冗余工具
   ```bash
   cd src/utils/
   rm documentation-fetcher.ts
   rm template-*.ts
   # ... 其他
   ```

8. **Root Files** - 清理根目录
   ```bash
   cd /mnt/e/tesseract/
   rm ANALYSIS_*.md
   rm MEMORY_*.md
   rm test-output.txt
   # ... 其他
   ```

### Phase 3: 更新导入和引用
1. 查找并修复所有 import 错误
   ```bash
   npm run typecheck
   ```

2. 更新 package.json scripts，移除已删除模块的命令

3. 更新 tsconfig.json 排除已删除的目录

### Phase 4: 测试和验证
1. 构建项目
   ```bash
   npm run build
   ```

2. 运行核心测试
   ```bash
   npm run test:unit
   ```

3. 启动 Agent 服务器
   ```bash
   npm run agent:dev
   ```

4. 验证前端
   ```bash
   cd apps/agent-ui
   npm run dev
   ```

### Phase 5: 文档更新
1. 更新 CLAUDE.md 反映新架构
2. 更新 README.md 移除已删除功能的说明
3. 创建 docs/refactor_2/CLEANUP_REPORT.md 记录删除详情

### Phase 6: 提交和测试
1. 提交变更
   ```bash
   git add .
   git commit -m "refactor: 移除冗余模块，精简为 Agent 核心架构"
   ```

2. 运行完整测试套件

3. 创建 PR 并进行代码审查

---

## 预期效果

### 代码量变化
- **删除行数**: ~15,000 - 20,000 行
- **保留核心**: ~10,000 - 12,000 行
- **减少幅度**: 约 60-70%

### 目录结构简化
```
BEFORE:
src/
├── 20+ 子目录
└── 150+ 文件

AFTER:
src/
├── agents/          # Agent 核心
├── agent-server/    # API 服务器
├── database/        # 数据库
├── services/        # 核心服务（精简）
├── mcp/             # MCP 服务器（精简）
├── parsers/         # 节点解析
├── loaders/         # 节点加载
├── utils/           # 工具（精简）
├── types/           # 类型定义
├── config/          # 配置
└── scripts/         # 核心脚本（3个）
```

### 依赖清理
```json
// package.json - 可移除的依赖
{
  "devDependencies": {
    // 可能不再需要的包
  }
}
```

---

## 风险与缓解

### 风险 1: 误删重要模块
**缓解**:
- 在独立分支操作
- 每次删除后运行 typecheck
- 保留 Git 历史便于回滚

### 风险 2: 破坏现有功能
**缓解**:
- 每个 Phase 后运行测试
- 先删除最外围的模块
- 保持核心 Agent 功能完整

### 风险 3: 导入依赖复杂
**缓解**:
- 使用 IDE 的重构工具
- 批量查找和替换
- 利用 TypeScript 编译器错误定位问题

---

## 检查清单

### 删除前检查
- [ ] 创建 Git 分支
- [ ] 备份数据库
- [ ] 记录当前状态

### 删除后检查（每个 Phase）
- [ ] `npm run typecheck` 通过
- [ ] `npm run build` 成功
- [ ] 核心测试通过
- [ ] Agent 服务器可启动

### 最终检查
- [ ] 完整测试套件通过
- [ ] Agent UI 功能正常
- [ ] 文档已更新
- [ ] 提交信息清晰

---

## 附录

### A. 保留文件完整清单
见 `FILE_MANIFEST_KEEP.md`

### B. 删除文件完整清单
见 `FILE_MANIFEST_DELETE.md`

### C. 修改文件清单
见 `FILE_MANIFEST_MODIFY.md`

---

**执行负责人**: Claude Code Agent
**审核人**: User
**预计工时**: 4-6 小时
**风险等级**: 中等
**可回滚性**: 高（Git 分支保护）
