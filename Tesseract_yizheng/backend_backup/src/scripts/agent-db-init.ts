/**
 * [INPUT]: 依赖 database-adapter、agent-db 表结构与种子数据函数
 * [OUTPUT]: 对外提供 Agent 侧数据表初始化与种子填充
 * [POS]: scripts 的 Agent 数据初始化入口，给 agent-server 启动前准备基础数据
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import path from 'path';
import { createDatabaseAdapter } from '../database/database-adapter';
import { ensureAgentTables, seedAgentData } from '../agents/agent-db';
import { logger } from '../utils/logger';

async function run() {
  const dbPath = process.env.NODE_DB_PATH || path.join(process.cwd(), 'data', 'nodes.db');
  const adapter = await createDatabaseAdapter(dbPath);
  try {
    await ensureAgentTables(adapter);
    await seedAgentData(adapter);
    logger.info('Agent tables initialized.');
  } finally {
    adapter.close();
  }
}

run().catch((error) => {
  logger.error('Failed to initialize agent tables:', error);
  process.exit(1);
});
