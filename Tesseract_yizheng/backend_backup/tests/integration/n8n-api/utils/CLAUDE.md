# tests/integration/n8n-api/utils - n8n 集成测试工具箱

<directory>
tests/integration/n8n-api/utils/
  cleanup-helpers.ts - 清理遗留工作流与资源，防止测试残留污染
  credentials.ts - 读取 .env/CI 环境并校验 n8n 测试凭证与 webhook URL
  factories.ts - 构造常用测试数据/参数的工厂
  fixtures.ts - 固定测试工作流/节点示例
  mcp-context.ts - 构建 MCP 调用上下文（InstanceContext）
  n8n-availability.ts - n8n API 可达性同步探测器，驱动条件跳过
  n8n-client.ts - 统一的 N8nApiClient 单例与可达性检查
  node-repository.ts - 测试用 NodeRepository 初始化与关闭
  response-types.ts - n8n API 测试响应类型定义
  test-context.ts - 测试资源追踪与清理上下文
  webhook-workflows.ts - 生成 webhook 测试所需 workflow 结构
</directory>

<dependencies>
- 依赖 src/services/n8n-api-client 与 src/mcp/handlers-n8n-manager
- 依赖 dotenv/.env 与 CI secrets
</dependencies>

<decisions>
- 通过 n8n-availability.ts 在不可达时跳过测试，避免环境阻塞
</decisions>

<change_log>
- 2025-01-17: 新增 n8n-availability.ts，用于集成测试降级
</change_log>

[PROTOCOL]: 变更时更新此文档，然后检查 AGENT.md
