# 文件保留清单

## 说明
此文档列出所有需要保留的核心文件和目录。这些是 Agent 系统运行所必需的。

---

## 核心架构

```
tesseract/
├── src/
│   ├── agents/              # Agent 系统核心
│   ├── agent-server/        # HTTP/WebSocket API
│   ├── database/            # 节点数据库
│   ├── services/            # 核心服务（精简）
│   ├── mcp/                 # MCP 服务器（精简）
│   ├── parsers/             # 节点解析
│   ├── loaders/             # 节点加载
│   ├── utils/               # 核心工具（精简）
│   ├── types/               # 类型定义
│   ├── config/              # 配置
│   ├── constants/           # 常量
│   ├── errors/              # 错误定义
│   └── scripts/             # 核心脚本（3个）
├── apps/
│   └── agent-ui/            # 前端界面
├── tests/                   # 测试（精简）
├── docs/                    # 文档
└── [配置文件]
```

---

## 1. Agent 系统

### src/agents/
```
KEEP src/agents/ 所有文件：

├── intake-agent.ts                     # 需求理解与实体提取
├── workflow-architect.ts               # AI 动态工作流生成
├── mcp-client.ts                       # MCP 工具封装
├── hardware-components.ts              # 硬件组件定义（7个组件）
├── hardware-service.ts                 # 硬件服务管理
├── llm-client.ts                       # OpenAI 客户端封装
├── session-service.ts                  # 会话管理
├── workflow-service.ts                 # 工作流服务
├── agent-config.ts                     # Agent 配置
├── agent-db.ts                         # Agent 数据库定义
├── agent-db-path.ts                    # 数据库路径
├── agent-logger.ts                     # Agent 日志
├── allowed-node-types.ts               # 允许的节点类型白名单
├── db-maintenance.ts                   # 数据库维护
├── types.ts                            # Agent 类型定义
└── prompts/                            # Prompt 工程
    ├── architect-system.ts             # WorkflowArchitect 系统提示词
    ├── few-shot-examples.ts            # Few-shot 示例
    ├── error-patterns.ts               # 错误模式与修复
    └── prompt-variants.ts              # Prompt 变体
```

**用途说明**:
- **intake-agent**: 理解用户需求，提取意图和实体，管理对话流程
- **workflow-architect**: 使用 LLM + Tool Use 动态生成 n8n 工作流
- **mcp-client**: 封装 n8n-mcp 工具（search_nodes, get_node, validate_workflow）
- **hardware-components**: 定义 7 个硬件组件（摄像头、机械手、喇叭等）
- **hardware-service**: 管理硬件配置和交互选项
- **llm-client**: OpenAI API 调用封装，支持 Tool Use
- **session-service**: 管理会话状态、历史、蓝图
- **workflow-service**: 工作流部署逻辑
- **prompts/**: Prompt Engineering 核心，包含系统提示词和示例

---

## 2. Agent 服务器

### src/agent-server/
```
KEEP src/agent-server/ 所有文件：

├── index.ts                            # 服务器启动入口
├── server.ts                           # Express HTTP 服务器
├── websocket.ts                        # WebSocket 处理
├── agent-service.ts                    # Agent 服务层（业务逻辑）
└── agent-factory.ts                    # Agent 工厂（依赖注入）
```

**用途说明**:
- **server.ts**: 提供 REST API（/api/agent/chat, /api/agent/confirm 等）
- **websocket.ts**: WebSocket 实时通信
- **agent-service.ts**: 业务逻辑封装，连接 IntakeAgent 和 API
- **agent-factory.ts**: 创建和管理 Agent 实例

---

## 3. 数据库层

### src/database/
```
KEEP:
├── database-adapter.ts                 # 通用数据库适配器（支持 better-sqlite3 和 sql.js）
├── node-repository.ts                  # 节点数据访问层
├── schema.sql                          # 完整数据库结构
├── schema-optimized.sql                # 优化版结构
├── nodes.db                            # 节点数据库（运行时生成）
└── migrations/                         # 数据库迁移
    ├── add-agent-tables.sql            # Agent 表结构
    └── add-template-node-configs.sql   # 节点配置扩展
```

**用途说明**:
- **database-adapter**: 数据库抽象层，支持多种 SQLite 实现
- **node-repository**: 提供节点查询、搜索、验证接口
- **schema.sql**: 定义 nodes, properties, operations 等表
- **migrations/**: 数据库结构升级脚本

---

## 4. 核心服务

### src/services/
```
KEEP 核心验证和 API 服务：

├── config-validator.ts                 # 节点配置验证（多 profile）
├── enhanced-config-validator.ts        # 增强验证（操作感知）
├── expression-validator.ts             # n8n 表达式语法验证
├── expression-format-validator.ts      # 表达式格式验证
├── universal-expression-validator.ts   # 通用表达式验证
├── workflow-validator.ts               # 完整工作流验证
├── workflow-auto-fixer.ts              # 自动修复工作流错误
├── workflow-diff-engine.ts             # 工作流增量更新
├── n8n-api-client.ts                   # n8n REST API 客户端
├── n8n-validation.ts                   # n8n 验证逻辑
├── n8n-version.ts                      # n8n 版本管理
├── type-structure-service.ts           # 类型结构验证（filter, resourceMapper）
├── property-filter.ts                  # 属性过滤（AI 友好）
├── property-dependencies.ts            # 属性依赖分析
├── task-templates.ts                   # 任务模板
├── example-generator.ts                # 示例生成器
└── node-specific-validators.ts         # 节点特定验证逻辑
```

**用途说明**:
- **config-validator**: 核心验证引擎，支持 minimal/runtime/ai-friendly/strict 模式
- **workflow-validator**: 调用其他验证器完成完整工作流验证
- **workflow-auto-fixer**: 自动修复 typeVersion 缺失、连接格式错误等
- **n8n-api-client**: 与 n8n 实例通信（创建、更新、删除工作流）
- **type-structure-service**: 验证 filter、resourceMapper 等复杂类型

---

## 5. MCP 服务器

### src/mcp/
```
KEEP:
├── server.ts                           # MCP 服务器核心
├── index.ts                            # MCP 入口（stdio/HTTP 模式选择）
├── stdio-wrapper.ts                    # stdio 模式封装
├── tools.ts                            # MCP 工具定义
├── tools-documentation.ts              # 工具文档生成
├── tools-n8n-manager.ts                # n8n 管理工具
├── tools-n8n-friendly.ts               # 友好格式工具
├── handlers-n8n-manager.ts             # n8n 管理处理器
├── handlers-workflow-diff.ts           # 工作流增量处理器
├── workflow-examples.ts                # 工作流示例
└── tool-docs/                          # 工具文档系统（精简）
    ├── index.ts
    ├── types.ts
    ├── discovery/                      # 节点发现工具
    │   ├── index.ts
    │   └── search-nodes.ts
    ├── configuration/                  # 节点配置工具
    │   ├── index.ts
    │   └── get-node.ts
    ├── validation/                     # 验证工具
    │   ├── index.ts
    │   ├── validate-node.ts
    │   └── validate-workflow.ts
    ├── workflow_management/            # 工作流管理工具
    │   ├── index.ts
    │   ├── n8n-create-workflow.ts
    │   ├── n8n-get-workflow.ts
    │   ├── n8n-update-partial-workflow.ts
    │   ├── n8n-update-full-workflow.ts
    │   ├── n8n-delete-workflow.ts
    │   ├── n8n-list-workflows.ts
    │   ├── n8n-validate-workflow.ts
    │   ├── n8n-autofix-workflow.ts
    │   ├── n8n-test-workflow.ts
    │   ├── n8n-executions.ts
    │   ├── n8n-workflow-versions.ts
    │   └── n8n-deploy-template.ts
    ├── system/                         # 系统工具
    │   ├── index.ts
    │   ├── n8n-health-check.ts
    │   ├── n8n-diagnostic.ts
    │   ├── n8n-list-available-tools.ts
    │   └── tools-documentation.ts
    └── guides/                         # 指南
        ├── index.ts
        └── ai-agents-guide.ts
```

**用途说明**:
- **server.ts**: 实现 MCP 协议，处理工具调用
- **tools.ts**: 定义所有 MCP 工具的接口
- **tool-docs/**: 为每个工具生成详细文档，供 LLM 使用
- **handlers-n8n-manager.ts**: 连接 n8n API
- **workflow-diff.ts**: 支持增量更新工作流

---

## 6. 解析器和加载器

### src/parsers/
```
KEEP:
├── node-parser.ts                      # 节点元数据解析
├── property-extractor.ts               # 属性深度提取
└── simple-parser.ts                    # 简单解析器
```

### src/loaders/
```
KEEP:
├── node-loader.ts                      # 从 npm 包加载节点
```

**用途说明**:
- **node-parser**: 解析 n8n 节点的 description.ts 文件
- **property-extractor**: 提取节点的 properties 和 operations
- **node-loader**: 从 n8n-nodes-base 和 @n8n/n8n-nodes-langchain 加载节点

---

## 7. 工具函数

### src/utils/
```
KEEP:
├── logger.ts                           # 日志工具
├── console-manager.ts                  # 控制台输出隔离
├── error-handler.ts                    # 错误处理
├── cache-utils.ts                      # 缓存工具
├── simple-cache.ts                     # 简单缓存实现
├── validation-schemas.ts               # Zod 验证模式
├── expression-utils.ts                 # 表达式工具
├── fixed-collection-validator.ts       # FixedCollection 验证
├── node-classification.ts              # 节点分类
├── node-type-normalizer.ts             # 节点类型规范化
├── node-type-utils.ts                  # 节点类型工具
├── node-utils.ts                       # 节点工具
├── protocol-version.ts                 # 协议版本
├── version.ts                          # 版本工具
├── auth.ts                             # 认证工具
└── n8n-errors.ts                       # n8n 错误定义
```

**用途说明**:
- **logger**: 统一日志接口
- **console-manager**: 隔离 MCP stdio 和 console.log
- **error-handler**: 统一错误处理
- **validation-schemas**: Zod 定义的验证模式
- **expression-utils**: 处理 n8n 表达式语法

---

## 8. 类型定义

### src/types/
```
KEEP:
├── index.ts                            # 类型导出
├── node-types.ts                       # 节点类型
├── instance-context.ts                 # n8n 实例上下文
├── session-state.ts                    # 会话状态
├── type-structures.ts                  # 类型结构
├── n8n-api.ts                          # n8n API 类型
└── workflow-diff.ts                    # 工作流差异类型
```

---

## 9. 配置

### src/config/
```
KEEP:
└── n8n-api.ts                          # n8n API 配置
```

---

## 10. 常量

### src/constants/
```
KEEP:
└── type-structures.ts                  # 22 个完整类型结构定义
```

---

## 11. 错误定义

### src/errors/
```
KEEP:
└── validation-service-error.ts         # 验证服务错误
```

---

## 12. 核心脚本

### src/scripts/
```
KEEP（仅 3 个核心脚本）:
├── rebuild.ts                          # 重建节点数据库
├── validate.ts                         # 验证节点数据
└── agent-db-init.ts                    # 初始化 Agent 数据库
```

**用途说明**:
- **rebuild.ts**: 从 n8n 包重新构建节点数据库
- **validate.ts**: 验证数据库中的节点数据完整性
- **agent-db-init.ts**: 创建 Agent 所需的表结构

---

## 13. 前端界面

### apps/agent-ui/
```
KEEP apps/agent-ui/ 完整保留（所有文件和目录）

这是 Agent 的前端界面，提供：
- 聊天界面
- 工作流预览
- 交互选项（单选、多选、图片上传）
- 摘要展示
- 确认按钮
```

---

## 14. 测试（精简）

### tests/
```
KEEP 与保留模块相关的测试：

tests/unit/
├── agents/                             # Agent 系统测试
├── services/                           # 核心服务测试（精简）
│   ├── config-validator.test.ts
│   ├── workflow-validator.test.ts
│   ├── expression-validator.test.ts
│   └── ...
├── database/                           # 数据库测试
├── mcp/                                # MCP 服务器测试（精简）
└── utils/                              # 工具测试（精简）

tests/integration/
├── agent/                              # Agent 集成测试
├── n8n-api/                            # n8n API 集成测试
└── mcp/                                # MCP 集成测试

tests/e2e/
└── agent-ui/                           # 前端 E2E 测试
```

---

## 15. 文档

### docs/
```
KEEP docs/ 核心文档：

├── api/
│   ├── agent-api.md                    # Agent API 文档
│   └── agent-api.openapi.json          # OpenAPI 规范
├── refactor/
│   ├── Agent_Design_v2.md              # Agent 设计 v2
│   ├── AGENT_REFACTOR_V2.md            # 重构方案 v2
│   ├── AGENT_EXECUTION_PLAN_V2.md      # 执行计划 v2
│   ├── AGENT_QUICKSTART.md             # 快速开始
│   ├── AGENT_DEPLOYMENT.md             # 部署指南
│   ├── AGENT_DB_SETUP.md               # 数据库设置
│   ├── PROMPT_ENGINEERING_GUIDE.md     # Prompt 工程指南
│   └── n8n/                            # n8n 相关文档
│       ├── node_define.md
│       ├── valiadtion_logic.md
│       └── link_tips.md
└── refactor_2/                         # 本次重构文档
    ├── REFACTOR_PLAN.md
    ├── FILE_MANIFEST_DELETE.md
    ├── FILE_MANIFEST_KEEP.md           # 本文件
    └── FILE_MANIFEST_MODIFY.md
```

---

## 16. 配置文件

### 根目录配置
```
KEEP:
├── package.json                        # 项目配置（需更新 scripts）
├── package-lock.json                   # 依赖锁定
├── tsconfig.json                       # TypeScript 配置
├── tsconfig.build.json                 # 构建配置
├── vitest.config.ts                    # 测试配置
├── vitest.config.integration.ts        # 集成测试配置
├── .env                                # 环境变量（本地）
├── .env.example                        # 环境变量示例
├── .env.test                           # 测试环境变量
├── .env.test.example                   # 测试环境示例
├── .gitignore                          # Git 忽略
├── .dockerignore                       # Docker 忽略
├── Dockerfile                          # Docker 镜像
├── docker-compose.yml                  # Docker Compose（简化）
├── LICENSE                             # 许可证
├── README.md                           # 项目说明（需更新）
├── CLAUDE.md                           # Claude Code 指令（需更新）
├── CHANGELOG.md                        # 变更日志
├── ATTRIBUTION.md                      # 归属说明
├── PRIVACY.md                          # 隐私政策
└── SECURITY.md                         # 安全政策
```

---

## 17. HTTP 服务器

### 根目录
```
KEEP:
├── src/http-server.ts                  # HTTP 模式服务器
├── src/http-server-single-session.ts   # 单会话 HTTP 服务器
├── src/mcp-engine.ts                   # MCP 引擎封装
└── src/mcp-tools-engine.ts             # MCP 工具引擎
```

---

## 18. 入口文件

### src/
```
KEEP:
└── src/index.ts                        # 库导出入口
```

---

## 文件统计

### 保留的核心文件
```
src/agents/                15 个文件
src/agent-server/           5 个文件
src/database/               6 个文件 + migrations
src/services/              16 个文件
src/mcp/                   10 个文件 + tool-docs
src/parsers/                3 个文件
src/loaders/                1 个文件
src/utils/                 15 个文件
src/types/                  7 个文件
src/config/                 1 个文件
src/constants/              1 个文件
src/errors/                 1 个文件
src/scripts/                3 个文件
apps/agent-ui/            完整保留
tests/                    精简保留
docs/                     核心文档
配置文件                   ~15 个

总计: 约 60-80 个核心文件 + apps/agent-ui + tests + docs
```

### 目录结构（精简后）
```
tesseract/
├── src/                   # ~80 个核心文件
│   ├── agents/           (15)
│   ├── agent-server/     (5)
│   ├── database/         (6+)
│   ├── services/         (16)
│   ├── mcp/              (10+)
│   ├── parsers/          (3)
│   ├── loaders/          (1)
│   ├── utils/            (15)
│   ├── types/            (7)
│   ├── config/           (1)
│   ├── constants/        (1)
│   ├── errors/           (1)
│   └── scripts/          (3)
├── apps/agent-ui/         # 前端（完整）
├── tests/                 # 测试（精简）
├── docs/                  # 文档
├── .serena/               # Serena 配置
├── .github/               # GitHub 配置
└── [配置文件]             (~15)
```

---

## 核心依赖（package.json）

### 运行时依赖
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "n8n-workflow": "^1.x",
    "n8n-core": "^1.x",
    "n8n-nodes-base": "^1.x",
    "@n8n/n8n-nodes-langchain": "^1.x",
    "openai": "^4.x",
    "express": "^4.x",
    "ws": "^8.x",
    "better-sqlite3": "^9.x",
    "zod": "^3.x",
    "uuid": "^9.x"
  }
}
```

### 开发依赖
```json
{
  "devDependencies": {
    "typescript": "^5.x",
    "vitest": "^1.x",
    "@types/node": "^20.x",
    "@types/express": "^4.x",
    "@types/ws": "^8.x",
    "ts-node": "^10.x",
    "tsx": "^4.x"
  }
}
```

---

## 环境变量

### 必需的环境变量
```bash
# LLM 配置（Agent 核心）
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o

# n8n API 配置
N8N_API_URL=http://localhost:5678/api/v1
N8N_API_KEY=your-api-key
N8N_PUBLIC_URL=http://localhost:5678

# Agent 服务器配置
AGENT_PORT=3005
AGENT_HOST=0.0.0.0

# 数据库配置
DATABASE_PATH=./src/database/nodes.db
AGENT_DB_PATH=./data/agent.db
```

---

## 启动命令

### 开发模式
```bash
# 构建项目
npm run build

# 启动 Agent 服务器
npm run agent:dev

# 启动前端
cd apps/agent-ui && npm run dev
```

### 生产模式
```bash
# 构建所有
npm run build
cd apps/agent-ui && npm run build

# 启动 Agent 服务器
npm run agent:start

# 启动前端（假设使用 serve）
cd apps/agent-ui && npx serve -s dist -l 3000
```

### 测试
```bash
# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行覆盖率
npm run test:coverage
```

---

## 验证清单

### 构建验证
- [ ] `npm run typecheck` 无错误
- [ ] `npm run build` 成功
- [ ] 生成的 `dist/` 目录结构正确

### 功能验证
- [ ] Agent 服务器启动成功
- [ ] 前端可以连接到后端
- [ ] 聊天功能正常
- [ ] 工作流生成功能正常
- [ ] 工作流验证功能正常
- [ ] 工作流创建到 n8n 成功

### 测试验证
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 覆盖率 ≥ 60%

---

## 注意事项

1. **完整性检查**: 删除文件前，确认没有其他保留文件依赖它
2. **分步验证**: 每删除一个模块后，立即运行 typecheck 和 build
3. **测试覆盖**: 确保核心功能有测试覆盖
4. **文档同步**: 更新 CLAUDE.md 和 README.md 反映新结构
5. **Git 历史**: 保留 Git 历史以便回溯

---

**最后更新**: 2026-01-16
**版本**: v1.0
**状态**: 待执行
