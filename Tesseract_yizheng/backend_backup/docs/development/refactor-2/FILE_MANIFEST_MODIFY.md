# 文件修改清单

## 说明
此文档列出所有需要修改的文件。主要是更新导入、移除对已删除模块的引用、更新配置等。

---

## 1. 配置文件

### package.json
**修改内容**: 移除已删除模块的 scripts

```json
{
  "scripts": {
    // DELETE 以下脚本:
    "fetch:templates": "...",
    "fetch:templates:update": "...",
    "fetch:templates:extract": "...",
    "fetch:templates:robust": "...",
    "test:templates": "...",
    "sanitize:templates": "...",
    "agent:cleanup:nodes": "...",
    "agent:cleanup:templates": "...",
    "test:telemetry-mutations": "...",
    "test:telemetry-mutations-verbose": "...",

    // DELETE 所有 test-* 脚本（除了核心测试命令）
    "test:autofix-documentation": "...",
    "test:autofix-workflow": "...",
    "test:execution-filtering": "...",
    "test:llm-intent": "...",
    "test:node-suggestions": "...",
    "test:protocol-negotiation": "...",
    "test:summary": "...",
    "test:webhook-autofix": "...",
    // ... 其他 test-* 脚本

    // KEEP 核心脚本:
    "build": "tsc -p tsconfig.build.json",
    "rebuild": "node dist/scripts/rebuild.js",
    "validate": "node dist/scripts/validate.js",
    "agent:db:init": "node dist/scripts/agent-db-init.js",
    "agent:start": "npm run build && node dist/agent-server/index.js",
    "agent:dev": "ts-node src/agent-server/index.ts",
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run --config vitest.config.integration.ts",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
  }
}
```

### tsconfig.json
**修改内容**: 排除已删除的目录

```json
{
  "exclude": [
    "node_modules",
    "dist",
    "coverage",
    "**/*.test.ts",
    "**/*.spec.ts",
    // ADD 以下排除项（虽然已删除，但保险起见）:
    "src/templates",
    "src/telemetry",
    "src/triggers",
    "src/n8n"
  ]
}
```

### .gitignore
**修改内容**: 移除对已删除模块的引用（如果有）

```gitignore
# 检查是否有对 templates/telemetry/triggers 的特殊忽略规则
# 如果有，可以删除
```

---

## 2. Agent 系统文件

### src/agents/agent-db.ts
**修改内容**: 移除 scenarios 表定义（如果存在模板相关表）

```typescript
// 检查是否有以下表定义，如果有则删除：
// - scenarios 表
// - templates 相关表

// 保留：
// - sessions 表
// - interactions 表
// - workflow_snapshots 表（如果有）
```

### src/agents/intake-agent.ts
**修改内容**: 移除对已删除模块的导入

```typescript
// DELETE（如果存在）:
import { ... } from '../telemetry/...';
import { ... } from '../triggers/...';
import { ... } from '../templates/...';

// KEEP:
import { llmClient } from './llm-client';
import { sessionService } from './session-service';
import { workflowArchitect } from './workflow-architect';
import { hardwareService } from './hardware-service';
```

### src/agents/workflow-service.ts
**修改内容**: 移除对模板服务的引用

```typescript
// DELETE（如果存在）:
import { TemplateService } from '../templates/template-service';

// 移除任何使用 TemplateService 的代码
```

---

## 3. Agent 服务器

### src/agent-server/agent-service.ts
**修改内容**: 移除对已删除模块的引用

```typescript
// DELETE（如果存在）:
import { ... } from '../telemetry/...';
import { ... } from '../triggers/...';

// 移除遥测调用（如果有）
// 移除触发器注册（如果有）
```

### src/agent-server/server.ts
**修改内容**: 移除对已删除模块的路由和中间件

```typescript
// DELETE（如果存在）:
import { telemetryMiddleware } from '../telemetry/...';

// 移除遥测相关的中间件
// app.use(telemetryMiddleware); // DELETE
```

---

## 4. MCP 服务器

### src/mcp/server.ts
**修改内容**: 移除对模板工具的引用

```typescript
// DELETE（如果存在）:
import { getTemplate } from './tool-docs/templates/get-template';
import { searchTemplates } from './tool-docs/templates/search-templates';

// 从工具列表中移除:
// - get_template
// - search_templates
```

### src/mcp/tools.ts
**修改内容**: 移除模板相关工具定义

```typescript
// DELETE 模板工具定义:
{
  name: 'get_template',
  description: '...',
  inputSchema: { ... }
},
{
  name: 'search_templates',
  description: '...',
  inputSchema: { ... }
}
```

### src/mcp/index.ts
**修改内容**: 移除对已删除模块的导入

```typescript
// DELETE（如果存在）:
import { ... } from '../telemetry/...';
```

---

## 5. 服务层

### src/services/ 中保留的文件
**修改内容**: 移除对已删除服务的导入

需要检查以下文件是否导入了已删除的服务：
```
config-validator.ts
enhanced-config-validator.ts
workflow-validator.ts
workflow-auto-fixer.ts
n8n-api-client.ts
```

**示例修改**:
```typescript
// DELETE（如果存在）:
import { NodeMigrationService } from './node-migration-service';
import { BreakingChangeDetector } from './breaking-change-detector';

// 移除对这些服务的调用
```

---

## 6. 工具函数

### src/utils/ 中保留的文件
**修改内容**: 移除对已删除工具的导入

**检查这些文件**:
```
logger.ts
error-handler.ts
validation-schemas.ts
```

**示例修改**:
```typescript
// DELETE（如果存在）:
import { templateSanitizer } from './template-sanitizer';
```

---

## 7. 数据库

### src/database/node-repository.ts
**修改内容**: 移除模板相关查询（如果有）

```typescript
// 检查是否有模板相关的查询方法，如果有则删除：
// - getTemplateById()
// - searchTemplates()
// - getTemplateNodes()
```

---

## 8. 类型定义

### src/types/index.ts
**修改内容**: 移除对已删除模块类型的导出

```typescript
// DELETE（如果存在）:
export * from '../telemetry/telemetry-types';
export * from '../triggers/types';
export * from '../templates/...';
```

---

## 9. 文档

### README.md
**修改内容**: 全面更新以反映新架构

```markdown
# n8n-mcp - AI Agent 系统

## 项目概述
基于 n8n-mcp 的 AI Agent 系统，用于将自然语言需求转换为 n8n 工作流。

## 核心功能
- 需求理解与实体提取（IntakeAgent）
- 动态工作流生成（WorkflowArchitect）
- 工作流验证与自动修复
- n8n API 集成
- 硬件组件管理

## 架构
[更新架构图，移除 templates/telemetry/triggers 模块]

## 快速开始
[更新启动命令，移除模板相关命令]

## API 文档
[链接到 docs/api/agent-api.md]

## 开发指南
[更新开发指南]

## 部署
[更新部署指南]

## 环境变量
[更新环境变量说明，移除模板相关变量]
```

### CLAUDE.md
**修改内容**: 更新项目架构说明

```markdown
## Project Overview
[更新项目描述，强调 Agent 系统]

### Current Architecture:
```
src/
├── agents/          # AI Agent 系统核心
├── agent-server/    # HTTP/WebSocket API
├── database/        # 节点数据库
├── services/        # 核心服务（精简）
├── mcp/             # MCP 服务器（精简）
├── parsers/         # 节点解析
├── loaders/         # 节点加载
├── utils/           # 核心工具（精简）
├── types/           # 类型定义
├── config/          # 配置
└── scripts/         # 核心脚本
```

## Common Development Commands
[更新命令列表，移除模板相关命令]
```

### docs/refactor/AGENT_REFACTOR_V2.md
**修改内容**: 添加完成状态标记

```markdown
# Agent Backend 架构重构方案 V2.0

**状态**: ✅ 已完成清理阶段
**清理报告**: 见 docs/refactor_2/
```

---

## 10. 测试文件

### tests/ 中的文件
**修改内容**: 移除对已删除模块的导入

需要检查并修改的测试文件：
```
tests/unit/agents/*.test.ts
tests/unit/services/*.test.ts
tests/unit/mcp/*.test.ts
tests/integration/agent/*.test.ts
```

**示例修改**:
```typescript
// DELETE（如果存在）:
import { TemplateService } from '../../src/templates/template-service';
import { TelemetryManager } from '../../src/telemetry/telemetry-manager';

// 移除相关测试用例
describe('Template integration', () => { ... }); // DELETE
```

---

## 11. Docker 配置

### Dockerfile
**修改内容**: 移除不必要的构建步骤（如果有）

```dockerfile
# 检查是否有专门为 templates/telemetry 准备的步骤
# 如果有，则删除
```

### docker-compose.yml
**修改内容**: 简化服务配置

```yaml
# 移除不必要的环境变量:
# - TEMPLATE_*
# - TELEMETRY_*

# 保留核心环境变量:
environment:
  - N8N_API_URL
  - N8N_API_KEY
  - OPENAI_API_KEY
  - AGENT_PORT
  - DATABASE_PATH
```

---

## 执行顺序

### Phase 1: 自动化检查和收集
```bash
#!/bin/bash
# 收集所有需要修改的文件

# 查找导入已删除模块的文件
echo "=== 查找导入 templates 的文件 ==="
grep -r "from.*templates" src/ --include="*.ts" | cut -d: -f1 | sort | uniq

echo "=== 查找导入 telemetry 的文件 ==="
grep -r "from.*telemetry" src/ --include="*.ts" | cut -d: -f1 | sort | uniq

echo "=== 查找导入 triggers 的文件 ==="
grep -r "from.*triggers" src/ --include="*.ts" | cut -d: -f1 | sort | uniq

echo "=== 查找导入 n8n/ 的文件 ==="
grep -r "from.*n8n/" src/ --include="*.ts" | cut -d: -f1 | sort | uniq
```

### Phase 2: 逐文件修改
1. **配置文件**
   - package.json
   - tsconfig.json
   - .gitignore

2. **Agent 系统**
   - agent-db.ts
   - intake-agent.ts
   - workflow-service.ts

3. **Agent 服务器**
   - agent-service.ts
   - server.ts

4. **MCP 服务器**
   - server.ts
   - tools.ts
   - index.ts

5. **服务层**
   - 检查所有保留的服务文件

6. **工具函数**
   - 检查所有保留的工具文件

7. **类型定义**
   - types/index.ts

8. **文档**
   - README.md
   - CLAUDE.md
   - docs/refactor/AGENT_REFACTOR_V2.md

9. **测试**
   - 检查并修改所有保留的测试文件

10. **Docker**
    - Dockerfile
    - docker-compose.yml

### Phase 3: 验证
```bash
# 运行 TypeScript 检查
npm run typecheck

# 修复所有导入错误
# 重复运行直到无错误

# 构建项目
npm run build

# 运行测试
npm run test:unit
```

---

## 修改模板

### 导入修复模板
```typescript
// BEFORE:
import { TemplateService } from '../templates/template-service';
import { TelemetryManager } from '../telemetry/telemetry-manager';
import { TriggerDetector } from '../triggers/trigger-detector';

// AFTER:
// 删除这些导入
// 删除所有使用这些导入的代码
```

### 类型导出修复模板
```typescript
// BEFORE:
export * from '../templates/...';
export * from '../telemetry/telemetry-types';
export * from '../triggers/types';

// AFTER:
// 删除这些导出
```

### package.json 脚本修复模板
```json
// BEFORE:
{
  "scripts": {
    "fetch:templates": "node dist/scripts/fetch-templates.js",
    "test:telemetry-mutations": "node dist/scripts/test-telemetry-mutations.js"
  }
}

// AFTER:
{
  "scripts": {
    // 删除这些脚本
  }
}
```

---

## 检查清单

### 配置文件
- [ ] package.json 已更新
- [ ] tsconfig.json 已更新
- [ ] .gitignore 已检查

### 代码文件
- [ ] agent-db.ts 已检查
- [ ] intake-agent.ts 已检查
- [ ] workflow-service.ts 已检查
- [ ] agent-service.ts 已检查
- [ ] server.ts 已检查
- [ ] mcp/server.ts 已检查
- [ ] mcp/tools.ts 已检查
- [ ] types/index.ts 已检查

### 文档
- [ ] README.md 已更新
- [ ] CLAUDE.md 已更新
- [ ] AGENT_REFACTOR_V2.md 已标记完成

### 测试
- [ ] 所有测试导入已修复
- [ ] 测试套件可运行

### 验证
- [ ] `npm run typecheck` 通过
- [ ] `npm run build` 成功
- [ ] `npm run test:unit` 通过
- [ ] Agent 服务器可启动

---

## 预期结果

### 构建输出
```
$ npm run typecheck
✓ No TypeScript errors found

$ npm run build
✓ Successfully compiled TypeScript
✓ Output to dist/
```

### 测试输出
```
$ npm run test:unit
✓ All tests passed
✓ Coverage: 65%
```

### 服务器启动
```
$ npm run agent:dev
✓ Agent server started on port 3005
✓ Database connected
✓ LLM client initialized
```

---

## 风险与缓解

### 风险 1: 遗漏某些导入
**缓解**: 使用自动化脚本全局搜索

### 风险 2: 类型错误
**缓解**: 频繁运行 typecheck

### 风险 3: 运行时错误
**缓解**: 运行完整测试套件

---

## 自动化脚本

### 批量移除导入脚本
```bash
#!/bin/bash
# scripts/remove-deleted-imports.sh

# 移除 templates 导入
find src/ -name "*.ts" -exec sed -i '/from.*templates/d' {} \;

# 移除 telemetry 导入
find src/ -name "*.ts" -exec sed -i '/from.*telemetry/d' {} \;

# 移除 triggers 导入
find src/ -name "*.ts" -exec sed -i '/from.*triggers/d' {} \;

# 注意: 这个脚本可能过于激进，建议手动检查每个文件
```

---

**最后更新**: 2026-01-16
**执行状态**: 待执行
**预计工时**: 2-3 小时
