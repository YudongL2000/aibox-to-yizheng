/**
 * [INPUT]: 依赖 node 的 child_process.spawnSync，依赖 ./credentials 的 getN8nCredentials
 * [OUTPUT]: 对外提供 isN8nApiAccessibleSync 与 getN8nSkipReason
 * [POS]: tests/integration/n8n-api/utils 的可达性探测器，供 n8n 集成测试统一判定是否跳过
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

import { spawnSync } from 'child_process';
import { getN8nCredentials } from './credentials';

let checked = false;
let available = false;
let skipReason = '';

function buildHealthzUrl(apiUrl: string): string {
  const trimmed = apiUrl.replace(/\/$/, '');
  const baseUrl = trimmed.replace(/\/api\/v\d+$/, '');
  return `${baseUrl}/healthz`;
}

function checkAvailability(): void {
  if (checked) {
    return;
  }
  checked = true;

  try {
    const creds = getN8nCredentials();
    const healthzUrl = buildHealthzUrl(creds.url);
    const result = spawnSync(
      'curl',
      ['-sS', '-o', '/dev/null', '-w', '%{http_code}', healthzUrl],
      { encoding: 'utf8', timeout: 3000 }
    );

    if (result.error) {
      skipReason = result.error.message;
      available = false;
      return;
    }

    const code = Number((result.stdout || '').trim());
    available = Number.isFinite(code) && code >= 200 && code < 400;
    if (!available) {
      skipReason = `healthz status ${result.stdout}`.trim();
    }
  } catch (error) {
    skipReason = error instanceof Error ? error.message : 'unknown error';
    available = false;
  }
}

export function isN8nApiAccessibleSync(): boolean {
  checkAvailability();
  return available;
}

export function getN8nSkipReason(): string {
  checkAvailability();
  return skipReason;
}
