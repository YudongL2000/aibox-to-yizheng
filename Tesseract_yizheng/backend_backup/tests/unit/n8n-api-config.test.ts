import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ENV_KEYS_TO_RESET = [
  'N8N_API_URL',
  'N8N_PUBLIC_URL',
  'N8N_BASE_URL',
  'N8N_API_KEY',
  'N8N_API_TIMEOUT',
  'N8N_API_MAX_RETRIES',
  'TESSERACT_N8N_API_ACCESS_PATH',
];

function restoreEnv(snapshot: NodeJS.ProcessEnv) {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}

describe('getN8nApiConfig', () => {
  const originalEnv = { ...process.env };
  const originalCwd = process.cwd();

  beforeEach(() => {
    vi.resetModules();
    process.chdir(originalCwd);
    for (const key of ENV_KEYS_TO_RESET) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    restoreEnv(originalEnv);
    process.chdir(originalCwd);
  });

  it('prefers embedded localhost api access over stale localhost .env credentials', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-api-config-'));
    process.chdir(tempDir);

    fs.writeFileSync(
      path.join(tempDir, '.env'),
      [
        'N8N_API_URL=http://127.0.0.1:5678/api/v1',
        'N8N_PUBLIC_URL=http://127.0.0.1:5678',
        'N8N_API_KEY=stale-local-key',
      ].join('\n')
    );

    const runtimeAccessPath = path.join(tempDir, '.tesseract-runtime', 'n8n', 'api-access.json');
    fs.mkdirSync(path.dirname(runtimeAccessPath), { recursive: true });
    fs.writeFileSync(
      runtimeAccessPath,
      JSON.stringify({
        baseUrl: 'http://127.0.0.1:5689/api/v1',
        publicUrl: 'http://127.0.0.1:5689',
        apiKey: 'fresh-embedded-key',
      })
    );

    const { getN8nApiConfig } = await import('../../src/config/n8n-api');
    const config = getN8nApiConfig();

    expect(config).toMatchObject({
      baseUrl: 'http://127.0.0.1:5689/api/v1',
      publicUrl: 'http://127.0.0.1:5689',
      apiKey: 'fresh-embedded-key',
    });
  });

  it('keeps explicit external env credentials when embedded runtime access points to localhost', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-api-config-'));
    process.chdir(tempDir);

    fs.writeFileSync(
      path.join(tempDir, '.env'),
      [
        'N8N_API_URL=https://n8n.example.com/api/v1',
        'N8N_PUBLIC_URL=https://n8n.example.com',
        'N8N_API_KEY=external-key',
      ].join('\n')
    );

    const runtimeAccessPath = path.join(tempDir, '.tesseract-runtime', 'n8n', 'api-access.json');
    fs.mkdirSync(path.dirname(runtimeAccessPath), { recursive: true });
    fs.writeFileSync(
      runtimeAccessPath,
      JSON.stringify({
        baseUrl: 'http://127.0.0.1:5689/api/v1',
        publicUrl: 'http://127.0.0.1:5689',
        apiKey: 'embedded-key',
      })
    );

    const { getN8nApiConfig } = await import('../../src/config/n8n-api');
    const config = getN8nApiConfig();

    expect(config).toMatchObject({
      baseUrl: 'https://n8n.example.com/api/v1',
      publicUrl: 'https://n8n.example.com',
      apiKey: 'external-key',
    });
  });
});
