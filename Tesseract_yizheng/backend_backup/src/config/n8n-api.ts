/**
 * [INPUT]: 依赖 dotenv 的环境装载、zod 校验、共享运行时凭据文件与 backend/n8n 的约定路径。
 * [OUTPUT]: 对外提供 getN8nApiConfig / isN8nApiConfigured / getN8nApiConfigFromContext，负责收敛 env 与 embedded runtime 的 n8n API 凭据，并把 localhost/127.0.0.1 视作同一嵌入实例；若 embedded n8n 切换了本地端口，也要覆盖过期的 localhost `.env`，且在共享凭据缺席时保持空值安全。
 * [POS]: backend 配置层的 n8n API 真相源；它决定 Agent/Workflow 服务最终拿哪一组 `N8N_API_URL` 与 `N8N_API_KEY`。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// n8n API configuration schema
const n8nApiConfigSchema = z.object({
  N8N_API_URL: z.string().url().optional(),
  N8N_PUBLIC_URL: z.string().url().optional(),
  N8N_BASE_URL: z.string().url().optional(),
  N8N_API_KEY: z.string().min(1).optional(),
  N8N_API_TIMEOUT: z.coerce.number().positive().default(30000),
  N8N_API_MAX_RETRIES: z.coerce.number().positive().default(3),
});

// Track if we've loaded env vars
let envLoaded = false;
const EMBEDDED_API_ACCESS_FILE = path.join('.tesseract-runtime', 'n8n', 'api-access.json');
const LOCAL_N8N_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

type EmbeddedApiAccess = {
  baseUrl?: string;
  publicUrl?: string;
  apiKey?: string;
};

function normalizeApiBaseUrl(baseUrl?: string | null): string {
  const normalizedBaseUrl = String(baseUrl ?? '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/, '/api/v1');

  if (!normalizedBaseUrl) {
    return '';
  }

  try {
    const parsedUrl = new URL(normalizedBaseUrl);
    if (LOCAL_N8N_HOSTNAMES.has(parsedUrl.hostname)) {
      parsedUrl.hostname = '127.0.0.1';
    }

    return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`
      .replace(/\/+$/, '')
      .replace(/\/api\/v1$/, '/api/v1');
  } catch (_error) {
    return normalizedBaseUrl;
  }
}

function isLocalApiBaseUrl(baseUrl?: string | null): boolean {
  const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);
  if (!normalizedBaseUrl) {
    return false;
  }

  try {
    return LOCAL_N8N_HOSTNAMES.has(new URL(normalizedBaseUrl).hostname);
  } catch (_error) {
    return false;
  }
}

function shouldPreferEmbeddedApiAccess(options: {
  normalizedEnvBaseUrl: string;
  envApiKey?: string;
  normalizedEmbeddedBaseUrl: string;
  embeddedApiKey?: string;
}): boolean {
  const {
    normalizedEnvBaseUrl,
    envApiKey,
    normalizedEmbeddedBaseUrl,
    embeddedApiKey,
  } = options;

  if (!normalizedEmbeddedBaseUrl || !embeddedApiKey) {
    return false;
  }

  if (!normalizedEnvBaseUrl || !envApiKey) {
    return true;
  }

  if (normalizedEnvBaseUrl === normalizedEmbeddedBaseUrl) {
    return true;
  }

  return (
    isLocalApiBaseUrl(normalizedEnvBaseUrl) &&
    isLocalApiBaseUrl(normalizedEmbeddedBaseUrl)
  );
}

function getEmbeddedApiAccessCandidates(): string[] {
  return [
    process.env.TESSERACT_N8N_API_ACCESS_PATH || '',
    path.resolve(process.cwd(), EMBEDDED_API_ACCESS_FILE),
    path.resolve(process.cwd(), '..', 'aily-blockly', EMBEDDED_API_ACCESS_FILE),
    path.resolve(__dirname, '..', '..', '..', 'n8n', 'api-access.json'),
    path.resolve(__dirname, '..', '..', '..', 'aily-blockly', EMBEDDED_API_ACCESS_FILE),
  ].filter(Boolean);
}

function readEmbeddedApiAccess(): EmbeddedApiAccess | null {
  for (const candidatePath of getEmbeddedApiAccessCandidates()) {
    if (!candidatePath || !fs.existsSync(candidatePath)) {
      continue;
    }

    try {
      const payload = JSON.parse(fs.readFileSync(candidatePath, 'utf8')) as EmbeddedApiAccess;
      if (payload?.baseUrl && payload?.apiKey) {
        return payload;
      }
    } catch (_error) {
      // Ignore malformed runtime files and continue searching for a valid source.
    }
  }

  return null;
}

// Parse and validate n8n API configuration
export function getN8nApiConfig() {
  // Load environment variables on first access
  if (!envLoaded) {
    dotenv.config();
    envLoaded = true;
  }
  
  const result = n8nApiConfigSchema.safeParse(process.env);
  
  if (!result.success) {
    return null;
  }
  
  const envConfig = result.data;
  const embeddedApiAccess = readEmbeddedApiAccess();
  const normalizedEnvBaseUrl = normalizeApiBaseUrl(envConfig.N8N_API_URL);
  const normalizedEmbeddedBaseUrl = normalizeApiBaseUrl(embeddedApiAccess?.baseUrl);
  const preferEmbeddedApiAccess = shouldPreferEmbeddedApiAccess({
    normalizedEnvBaseUrl,
    envApiKey: envConfig.N8N_API_KEY,
    normalizedEmbeddedBaseUrl,
    embeddedApiKey: embeddedApiAccess?.apiKey,
  });

  const preferredEmbeddedApiAccess = preferEmbeddedApiAccess ? embeddedApiAccess : null;
  const config = preferEmbeddedApiAccess
    ? {
        ...envConfig,
        N8N_API_URL: normalizedEmbeddedBaseUrl,
        N8N_PUBLIC_URL: preferredEmbeddedApiAccess?.publicUrl || envConfig.N8N_PUBLIC_URL,
        N8N_API_KEY: preferredEmbeddedApiAccess?.apiKey || envConfig.N8N_API_KEY,
      }
    : {
        ...envConfig,
        N8N_API_URL: normalizedEnvBaseUrl,
      };
  
  // Check if both URL and API key are provided
  if (!config.N8N_API_URL || !config.N8N_API_KEY) {
    return null;
  }
  
  return {
    baseUrl: config.N8N_API_URL,
    publicUrl: config.N8N_PUBLIC_URL || config.N8N_BASE_URL,
    apiKey: config.N8N_API_KEY,
    timeout: config.N8N_API_TIMEOUT,
    maxRetries: config.N8N_API_MAX_RETRIES,
  };
}

// Helper to check if n8n API is configured (lazy check)
export function isN8nApiConfigured(): boolean {
  const config = getN8nApiConfig();
  return config !== null;
}

/**
 * Create n8n API configuration from instance context
 * Used for flexible instance configuration support
 */
export function getN8nApiConfigFromContext(context: {
  n8nApiUrl?: string;
  n8nPublicUrl?: string;
  n8nBaseUrl?: string;
  n8nApiKey?: string;
  n8nApiTimeout?: number;
  n8nApiMaxRetries?: number;
}): N8nApiConfig | null {
  if (!context.n8nApiUrl || !context.n8nApiKey) {
    return null;
  }

  return {
    baseUrl: context.n8nApiUrl,
    publicUrl: context.n8nPublicUrl ?? context.n8nBaseUrl,
    apiKey: context.n8nApiKey,
    timeout: context.n8nApiTimeout ?? 30000,
    maxRetries: context.n8nApiMaxRetries ?? 3,
  };
}

// Type export
export type N8nApiConfig = NonNullable<ReturnType<typeof getN8nApiConfig>>;
