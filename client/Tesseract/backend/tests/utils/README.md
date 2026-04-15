# Test Database Utilities

Lightweight helpers for creating a SQLite test database with the core schema and a `NodeRepository`.

## Usage

```typescript
import { createTestDatabase } from '../utils/database-utils';

describe('My Test', () => {
  let testDb;

  afterEach(async () => {
    if (testDb) await testDb.cleanup();
  });

  it('should test something', async () => {
    testDb = await createTestDatabase();

    // Use testDb.nodeRepository / testDb.adapter
  });
});
```

## API

### createTestDatabase(options?)
Creates a test database with core schema.

Options:
- `inMemory` (boolean, default: true)
- `dbPath` (string, for file-based database)
- `initSchema` (boolean, default: true)
