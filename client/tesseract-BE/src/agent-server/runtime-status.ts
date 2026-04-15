/**
 * [INPUT]: 依赖 AgentConfig 与全局 fetch，对 OpenAI 兼容网关做轻量 completion 探测
 * [OUTPUT]: 对外提供 AgentRuntimeStatusMonitor、AgentRuntimeStatus 类型与静态测试监控器
 * [POS]: agent-server 的运行时诊断中心，负责缓存并暴露 LLM 可用性与探测超时单一真相源
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { AgentConfig } from '../agents/agent-config';

export type AgentLLMStatusState = 'checking' | 'ready' | 'disabled' | 'degraded';
export type AgentLLMStatusCode =
  | 'ok'
  | 'disabled'
  | 'timeout'
  | 'network_error'
  | 'auth_error'
  | 'http_error';

export interface AgentLLMRuntimeStatus {
  state: AgentLLMStatusState;
  code: AgentLLMStatusCode;
  enabled: boolean;
  provider: AgentConfig['llmProvider'];
  model: string;
  baseUrl: string | null;
  message: string;
  checkedAt: string | null;
  latencyMs: number | null;
  probeTimeoutMs: number;
}

export interface AgentRuntimeStatus {
  llm: AgentLLMRuntimeStatus;
}

export interface RuntimeStatusMonitor {
  start(): void;
  getSnapshot(): AgentRuntimeStatus;
  getStatus(forceRefresh?: boolean): Promise<AgentRuntimeStatus>;
}

type ProbeFn = (config: AgentConfig) => Promise<AgentLLMRuntimeStatus>;

const DEFAULT_STATUS_TTL_MS = 30_000;
export class AgentRuntimeStatusMonitor implements RuntimeStatusMonitor {
  private readonly statusTtlMs: number;
  private snapshot: AgentRuntimeStatus;
  private inflight: Promise<AgentRuntimeStatus> | null = null;

  constructor(
    private readonly config: AgentConfig,
    private readonly probeFn: ProbeFn = probeLLMRuntimeStatus,
    statusTtlMs = DEFAULT_STATUS_TTL_MS
  ) {
    this.statusTtlMs = statusTtlMs;
    this.snapshot = {
      llm: createInitialLLMStatus(config),
    };
  }

  start(): void {
    if (this.snapshot.llm.state === 'checking') {
      void this.refresh();
    }
  }

  getSnapshot(): AgentRuntimeStatus {
    return this.snapshot;
  }

  async getStatus(forceRefresh = false): Promise<AgentRuntimeStatus> {
    if (!forceRefresh && !this.isStale()) {
      return this.snapshot;
    }

    return this.refresh();
  }

  private isStale(): boolean {
    if (!this.snapshot.llm.checkedAt) {
      return this.snapshot.llm.state === 'checking';
    }

    const checkedAt = Date.parse(this.snapshot.llm.checkedAt);
    if (Number.isNaN(checkedAt)) {
      return true;
    }

    return Date.now() - checkedAt > this.statusTtlMs;
  }

  private async refresh(): Promise<AgentRuntimeStatus> {
    if (this.inflight) {
      return this.inflight;
    }

    if (this.snapshot.llm.state === 'disabled') {
      return this.snapshot;
    }

    this.inflight = this.probeFn(this.config)
      .then((llmStatus) => {
        this.snapshot = { llm: llmStatus };
        return this.snapshot;
      })
      .catch((error) => {
        this.snapshot = {
          llm: createDegradedStatus(
            this.config,
            'network_error',
            error instanceof Error ? error.message : 'LLM 运行状态探测失败',
            null
          ),
        };
        return this.snapshot;
      })
      .finally(() => {
        this.inflight = null;
      });

    return this.inflight;
  }
}

export function createStaticRuntimeStatusMonitor(
  snapshot: AgentRuntimeStatus
): RuntimeStatusMonitor {
  return {
    start() {
      return;
    },
    getSnapshot() {
      return snapshot;
    },
    async getStatus() {
      return snapshot;
    },
  };
}

async function probeLLMRuntimeStatus(config: AgentConfig): Promise<AgentLLMRuntimeStatus> {
  if (!config.llmEnabled || !config.llmApiKey) {
    return createDisabledStatus(config);
  }

  const startedAt = Date.now();
  const timeoutMs = config.llmHealthTimeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const probeUrl = buildChatCompletionsProbeUrl(config.llmBaseUrl);

  try {
    const response = await fetch(probeUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.llmApiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: config.llmModel,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        temperature: 0,
      }),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;

    if (response.ok) {
      const payload = await response.json().catch(() => null);
      const hasContent = Boolean(
        payload &&
        typeof payload === 'object' &&
        Array.isArray((payload as any).choices) &&
        (payload as any).choices[0]?.message?.content !== undefined
      );
      if (!hasContent) {
        return createDegradedStatus(
          config,
          'http_error',
          'LLM completion 探测返回格式异常，真实生成链路可能不稳定。',
          latencyMs
        );
      }
      return createReadyStatus(config, latencyMs);
    }

    if (response.status === 401 || response.status === 403) {
      return createDegradedStatus(
        config,
        'auth_error',
        `LLM 鉴权失败 (${response.status})，请检查 API Key。`,
        latencyMs
      );
    }

    return createDegradedStatus(
      config,
      'http_error',
      `LLM 网关返回 ${response.status}，当前可能无法稳定生成复杂工作流。`,
      latencyMs
    );
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    if (isAbortError(error)) {
      return createDegradedStatus(
        config,
        'timeout',
        `LLM 网关在 ${timeoutMs}ms 内未响应，当前会退回澄清/兜底路径。`,
        latencyMs
      );
    }

    return createDegradedStatus(
      config,
      'network_error',
      `LLM 网关不可达：${formatErrorMessage(error)}`,
      latencyMs
    );
  } finally {
    clearTimeout(timer);
  }
}

function createInitialLLMStatus(config: AgentConfig): AgentLLMRuntimeStatus {
  if (!config.llmEnabled || !config.llmApiKey) {
    return createDisabledStatus(config);
  }

  return {
    state: 'checking',
    code: 'ok',
    enabled: true,
    provider: config.llmProvider,
    model: config.llmModel,
    baseUrl: config.llmBaseUrl ?? 'https://api.openai.com/v1',
    message: '正在检查 LLM completion 链路可用性...',
    checkedAt: null,
    latencyMs: null,
    probeTimeoutMs: config.llmHealthTimeoutMs,
  };
}

function createReadyStatus(config: AgentConfig, latencyMs: number): AgentLLMRuntimeStatus {
  return {
    state: 'ready',
    code: 'ok',
    enabled: true,
    provider: config.llmProvider,
    model: config.llmModel,
    baseUrl: config.llmBaseUrl ?? 'https://api.openai.com/v1',
    message: 'LLM completion 链路可用，复杂需求将走完整生成链路。',
    checkedAt: new Date().toISOString(),
    latencyMs,
    probeTimeoutMs: config.llmHealthTimeoutMs,
  };
}

function createDisabledStatus(config: AgentConfig): AgentLLMRuntimeStatus {
  return {
    state: 'disabled',
    code: 'disabled',
    enabled: false,
    provider: config.llmProvider,
    model: config.llmModel,
    baseUrl: config.llmBaseUrl ?? null,
    message: 'LLM 未配置，当前只能使用规则兜底与有限澄清。',
    checkedAt: new Date().toISOString(),
    latencyMs: null,
    probeTimeoutMs: config.llmHealthTimeoutMs,
  };
}

function createDegradedStatus(
  config: AgentConfig,
  code: Exclude<AgentLLMStatusCode, 'ok' | 'disabled'>,
  message: string,
  latencyMs: number | null
): AgentLLMRuntimeStatus {
  return {
    state: 'degraded',
    code,
    enabled: true,
    provider: config.llmProvider,
    model: config.llmModel,
    baseUrl: config.llmBaseUrl ?? 'https://api.openai.com/v1',
    message,
    checkedAt: new Date().toISOString(),
    latencyMs,
    probeTimeoutMs: config.llmHealthTimeoutMs,
  };
}

function buildChatCompletionsProbeUrl(baseUrl?: string): string {
  const normalizedBaseUrl = baseUrl ?? 'https://api.openai.com/v1';
  const base = normalizedBaseUrl.endsWith('/') ? normalizedBaseUrl : `${normalizedBaseUrl}/`;
  return new URL('chat/completions', base).toString();
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '未知错误';
}
