import { createDatabaseAdapter, type DatabaseAdapter } from '../../src/database/database-adapter';
import { NodeRepository } from '../../src/database/node-repository';
import * as fs from 'fs';
import * as path from 'path';

export interface TestDatabaseOptions {
  inMemory?: boolean;
  dbPath?: string;
  initSchema?: boolean;
}

export interface TestDatabase {
  adapter: DatabaseAdapter;
  nodeRepository: NodeRepository;
  path: string;
  cleanup: () => Promise<void>;
}

export async function createTestDatabase(options: TestDatabaseOptions = {}): Promise<TestDatabase> {
  const {
    inMemory = true,
    dbPath,
    initSchema = true
  } = options;

  const finalPath = inMemory
    ? ':memory:'
    : dbPath || path.join(__dirname, `../temp/test-${Date.now()}.db`);

  if (!inMemory) {
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const adapter = await createDatabaseAdapter(finalPath);

  if (initSchema) {
    const schemaPath = path.join(__dirname, '../../src/database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    adapter.exec(schema);
  }

  const nodeRepository = new NodeRepository(adapter);

  const cleanup = async () => {
    adapter.close();
    if (!inMemory && finalPath !== ':memory:' && fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
    }
  };

  return {
    adapter,
    nodeRepository,
    path: finalPath,
    cleanup
  };
}
