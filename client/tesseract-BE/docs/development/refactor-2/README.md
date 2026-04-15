# Agent 架构重构 - 执行概览

## 快速索引

| 文档 | 用途 | 链接 |
|------|------|------|
| 执行概览 | 总体规划和执行指南 | 本文档 |
| 重构计划 | 详细的重构策略和步骤 | [REFACTOR_PLAN.md](./REFACTOR_PLAN.md) |
| 删除清单 | 需要删除的文件和模块 | [FILE_MANIFEST_DELETE.md](./FILE_MANIFEST_DELETE.md) |
| 保留清单 | 需要保留的核心文件 | [FILE_MANIFEST_KEEP.md](./FILE_MANIFEST_KEEP.md) |
| 修改清单 | 需要修改的文件和内容 | [FILE_MANIFEST_MODIFY.md](./FILE_MANIFEST_MODIFY.md) |

---

## 目标

将 n8n-mcp 项目精简为 **AI Agent 系统核心**，移除以下模块：
- ❌ 模板系统（Templates）
- ❌ 遥测系统（Telemetry）
- ❌ 触发器系统（Triggers）
- ❌ n8n 自定义节点
- ❌ 大量测试脚本
- ❌ 冗余服务和工具

保留核心模块：
- ✅ Agent 系统（需求理解、工作流生成、硬件管理）
- ✅ n8n-mcp 核心能力（节点查询、验证、API 客户端）
- ✅ MCP 服务器（精简）
- ✅ Agent HTTP/WebSocket API
- ✅ 前端界面

---

## 预期成果

### 代码量
- **删除**: ~15,000 - 20,000 行（60-70%）
- **保留**: ~10,000 - 12,000 行核心代码

### 文件数量
- **删除**: ~80-100 个文件
- **保留**: ~60-80 个核心文件 + apps + tests

### 目录结构
**BEFORE**: 20+ 子目录，150+ 文件
**AFTER**: 11 个核心子目录，~80 个文件

---

## 执行步骤（6 个 Phase）

### Phase 1: 准备 (15 分钟)
```bash
# 1. 创建 Git 分支
git checkout -b refactor/agent-cleanup

# 2. 备份数据库
cp src/database/nodes.db src/database/nodes.db.backup
cp data/agent.db data/agent.db.backup 2>/dev/null || true

# 3. 记录当前状态
git log -1 > docs/refactor_2/pre-refactor-state.txt
npm list > docs/refactor_2/pre-refactor-dependencies.txt
```

### Phase 2: 删除模块 (45 分钟)
**按顺序执行，每步后运行 typecheck**

#### Step 1: Templates
```bash
rm -rf src/templates/
rm -rf src/mcp/tool-docs/templates/
rm src/scripts/fetch-templates*.ts
rm src/scripts/sanitize-templates.ts
rm src/scripts/test-templates.js
npm run typecheck
```

#### Step 2: Telemetry
```bash
rm -rf src/telemetry/
rm src/scripts/test-telemetry-mutations*.ts
npm run typecheck
```

#### Step 3: Triggers
```bash
rm -rf src/triggers/
npm run typecheck
```

#### Step 4: n8n Custom Nodes
```bash
rm -rf src/n8n/
npm run typecheck
```

#### Step 5: Test Scripts
```bash
cd src/scripts/
# 只保留: rebuild.ts, validate.ts, agent-db-init.ts
rm test-*.ts test-*.js debug-*.ts
rm cleanup-nodes.ts cleanup-templates.ts
rm extract-from-docker.ts seed-canonical-ai-examples.ts
rm rebuild-optimized.ts validation-summary.ts
cd ../..
npm run typecheck
```

#### Step 6: Redundant Services
```bash
cd src/services/
rm breaking-change-detector.ts
rm breaking-changes-registry.ts
rm node-migration-service.ts
rm node-version-service.ts
rm post-update-validator.ts
rm workflow-versioning-service.ts
rm sqlite-storage-service.ts
rm tool-variant-generator.ts
rm ai-node-validator.ts
rm ai-tool-validators.ts
rm confidence-scorer.ts
rm error-execution-processor.ts
rm execution-processor.ts
rm node-documentation-service.ts
rm node-sanitizer.ts
rm node-similarity-service.ts
rm operation-similarity-service.ts
rm resource-similarity-service.ts
cd ../..
npm run typecheck
```

#### Step 7: Redundant Utils
```bash
cd src/utils/
rm documentation-fetcher.ts
rm enhanced-documentation-fetcher.ts
rm template-node-resolver.ts
rm template-sanitizer.ts
rm npm-version-checker.ts
rm node-source-extractor.ts
rm bridge.ts
rm ssrf-protection.ts
rm url-detector.ts
rm mcp-client.ts  # 与 agents/mcp-client.ts 重复
cd ../..
npm run typecheck
```

#### Step 8: Other Files
```bash
# 删除数据和映射器
rm -rf src/data/
rm src/mappers/docs-mapper.ts

# 删除根目录文件
rm ANALYSIS_QUICK_REFERENCE.md
rm MEMORY_N8N_UPDATE.md
rm MEMORY_TEMPLATE_UPDATE.md
rm N8N_HTTP_STREAMABLE_SETUP.md
rm P0-R3-TEST-PLAN.md
rm README_ANALYSIS.md
rm test-output.txt
rm fetch_log.txt
rm coverage.json
rm ':memory:' 2>/dev/null || true
rm thumbnail.png
rm versioned-nodes.md
rm test-reinit-fix.sh
rm monitor_fetch.sh
rm n8n-nodes.db

npm run typecheck
```

### Phase 3: 修复导入 (60 分钟)
**根据 typecheck 错误逐个修复**

#### 自动化搜索
```bash
# 查找导入已删除模块的文件
grep -r "from.*templates" src/ --include="*.ts" | cut -d: -f1 | sort | uniq
grep -r "from.*telemetry" src/ --include="*.ts" | cut -d: -f1 | sort | uniq
grep -r "from.*triggers" src/ --include="*.ts" | cut -d: -f1 | sort | uniq
```

#### 关键文件检查
按此顺序检查和修复：
1. `src/agents/agent-db.ts`
2. `src/agents/intake-agent.ts`
3. `src/agents/workflow-service.ts`
4. `src/agent-server/agent-service.ts`
5. `src/agent-server/server.ts`
6. `src/mcp/server.ts`
7. `src/mcp/tools.ts`
8. `src/types/index.ts`

#### 每次修复后
```bash
npm run typecheck
```

### Phase 4: 更新配置 (30 分钟)

#### package.json
```bash
# 手动编辑 package.json
# 移除所有已删除脚本的命令
# 参考 FILE_MANIFEST_MODIFY.md
```

#### tsconfig.json
```json
{
  "exclude": [
    "node_modules",
    "dist",
    "coverage",
    "**/*.test.ts",
    "**/*.spec.ts",
    "src/templates",
    "src/telemetry",
    "src/triggers",
    "src/n8n"
  ]
}
```

#### docker-compose.yml
```yaml
# 简化环境变量配置
# 移除 TEMPLATE_*, TELEMETRY_* 等变量
```

### Phase 5: 更新文档 (45 分钟)

#### README.md
```markdown
# 更新项目描述
# 更新架构图
# 更新快速开始命令
# 移除模板相关说明
```

#### CLAUDE.md
```markdown
# 更新 Current Architecture
# 更新 Common Development Commands
# 移除模板、遥测相关命令
```

#### docs/refactor/AGENT_REFACTOR_V2.md
```markdown
# 在文档顶部添加:
**状态**: ✅ 已完成清理阶段
**清理报告**: 见 docs/refactor_2/
**清理时间**: 2026-01-16
```

### Phase 6: 测试验证 (60 分钟)

#### 构建验证
```bash
# 1. TypeScript 检查
npm run typecheck
# 预期: ✓ No errors

# 2. 构建项目
npm run build
# 预期: ✓ Successfully compiled

# 3. 检查输出
ls -la dist/
# 预期: agents/, agent-server/, mcp/, services/ 等目录存在
```

#### 单元测试
```bash
npm run test:unit
# 预期: 大部分测试通过（可能有少量失败需要修复）
```

#### 功能测试
```bash
# 1. 启动 Agent 服务器
npm run agent:dev &
AGENT_PID=$!

# 2. 等待启动
sleep 5

# 3. 健康检查
curl http://localhost:3005/api/health
# 预期: {"status":"ok"}

# 4. 测试聊天接口
curl -X POST http://localhost:3005/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"你好"}'
# 预期: 返回 guidance 或其他响应

# 5. 停止服务器
kill $AGENT_PID
```

#### 前端测试
```bash
# 1. 进入前端目录
cd apps/agent-ui

# 2. 安装依赖（如果需要）
npm install

# 3. 启动前端
npm run dev &
UI_PID=$!

# 4. 等待启动
sleep 5

# 5. 访问 http://localhost:5173（或配置的端口）
# 手动验证聊天界面功能

# 6. 停止前端
kill $UI_PID
cd ../..
```

---

## 检查清单

### 删除阶段
- [ ] Templates 模块已删除
- [ ] Telemetry 模块已删除
- [ ] Triggers 模块已删除
- [ ] n8n Custom Nodes 已删除
- [ ] Test Scripts 已清理
- [ ] Redundant Services 已删除
- [ ] Redundant Utils 已删除
- [ ] Root Files 已清理

### 修复阶段
- [ ] 所有导入错误已修复
- [ ] `npm run typecheck` 通过
- [ ] `npm run build` 成功

### 配置阶段
- [ ] package.json 已更新
- [ ] tsconfig.json 已更新
- [ ] docker-compose.yml 已简化

### 文档阶段
- [ ] README.md 已更新
- [ ] CLAUDE.md 已更新
- [ ] AGENT_REFACTOR_V2.md 已标记完成

### 测试阶段
- [ ] 构建验证通过
- [ ] 单元测试通过（或失败已记录）
- [ ] Agent 服务器可启动
- [ ] 聊天功能正常
- [ ] 前端界面正常

### 提交阶段
- [ ] Git 提交信息清晰
- [ ] 所有变更已暂存
- [ ] 创建 PR 或合并到主分支

---

## 常见问题

### Q1: typecheck 报错怎么办？
**A**:
1. 阅读错误信息，定位到具体文件和行号
2. 检查是否是导入已删除模块导致
3. 删除相关导入和使用代码
4. 重新运行 typecheck

### Q2: build 失败怎么办？
**A**:
1. 确保 typecheck 先通过
2. 检查是否有语法错误
3. 清理 dist 目录后重试: `rm -rf dist && npm run build`

### Q3: 测试失败怎么办？
**A**:
1. 检查测试是否依赖已删除的模块
2. 更新或删除相关测试
3. 如果是核心功能测试失败，需要修复代码

### Q4: Agent 服务器启动失败？
**A**:
1. 检查环境变量是否配置正确（OPENAI_API_KEY, N8N_API_URL 等）
2. 检查数据库文件是否存在
3. 查看控制台错误日志
4. 运行 `npm run agent:db:init` 初始化数据库

### Q5: 前端连接失败？
**A**:
1. 确认后端已启动且端口正确（默认 3005）
2. 检查前端配置中的 API 地址
3. 检查 CORS 配置

---

## 回滚方案

如果重构出现严重问题，可以回滚：

### 方式 1: Git 回滚
```bash
# 丢弃所有更改
git reset --hard HEAD

# 切换回原分支
git checkout main
```

### 方式 2: 恢复数据库
```bash
# 恢复节点数据库
cp src/database/nodes.db.backup src/database/nodes.db

# 恢复 Agent 数据库
cp data/agent.db.backup data/agent.db
```

---

## 时间估算

| Phase | 任务 | 预计时间 |
|-------|------|---------|
| 1 | 准备与备份 | 15 分钟 |
| 2 | 删除模块 | 45 分钟 |
| 3 | 修复导入 | 60 分钟 |
| 4 | 更新配置 | 30 分钟 |
| 5 | 更新文档 | 45 分钟 |
| 6 | 测试验证 | 60 分钟 |
| **总计** | | **4-5 小时** |

---

## 成功指标

### 代码质量
- ✅ TypeScript 无编译错误
- ✅ 构建成功
- ✅ 核心测试通过率 ≥ 80%

### 功能完整性
- ✅ Agent 服务器正常启动
- ✅ 聊天功能正常
- ✅ 工作流生成功能正常
- ✅ 工作流验证功能正常
- ✅ n8n API 集成正常
- ✅ 前端界面正常

### 项目精简
- ✅ 代码行数减少 60%+
- ✅ 文件数量减少 50%+
- ✅ 依赖清晰明确
- ✅ 文档准确完整

---

## 下一步

重构完成后，建议：

1. **创建 PR**: 请求代码审查
2. **部署测试**: 在测试环境验证
3. **更新 CI/CD**: 更新自动化测试和部署流程
4. **用户测试**: 邀请用户测试 Agent 功能
5. **性能优化**: 根据使用情况优化性能
6. **功能增强**: 根据 AGENT_EXECUTION_PLAN_V2.md 实施下一阶段功能

---

## 联系与支持

**执行负责人**: Claude Code Agent
**审核人**: User
**文档位置**: `/mnt/e/tesseract/docs/refactor_2/`
**Git 分支**: `refactor/agent-cleanup`

---

**创建时间**: 2026-01-16
**最后更新**: 2026-01-16
**版本**: v1.0
**状态**: ✅ 计划完成，待执行
