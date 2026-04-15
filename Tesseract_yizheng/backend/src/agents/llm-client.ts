/**
 * [INPUT]: 依赖 AgentConfig、Intent 类型、OpenAI SDK 与 logger
 * [OUTPUT]: 对外提供 LLMClient 接口、OpenAILLMClient 实现、trace 感知的 ChatOptions 与 createLLMClient 工厂
 * [POS]: agents 模块的 LLM 适配层，负责真实调用、可中止超时、调试流上报与未配置场景的统一降级
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type OpenAI from 'openai';
import { AgentConfig } from './agent-config';
import type {
  AgentTraceEventInput,
  AgentTracePhase,
  AgentTraceSource,
  AgentTraceWriter,
  Intent,
} from './types';
import { logger } from '../utils/logger';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  jsonMode?: boolean;
  signal?: AbortSignal;
  trace?: AgentTraceWriter;
  traceContext?: {
    source?: AgentTraceSource;
    phase: AgentTracePhase;
    title?: string;
    detail?: string;
    data?: Record<string, unknown>;
  };
}

export interface LLMClient {
  classify(systemPrompt: string, userMessage: string): Promise<Intent>;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
}

class DisabledLLMClient implements LLMClient {
  constructor(private readonly reason: string) {}

  async classify(): Promise<Intent> {
    throw new Error(this.reason);
  }

  async chat(_messages?: ChatMessage[], options?: ChatOptions): Promise<string> {
    emitTrace(options, {
      source: options?.traceContext?.source ?? 'llm_client',
      phase: options?.traceContext?.phase ?? 'reflection',
      kind: 'llm',
      status: 'failed',
      title: options?.traceContext?.title ?? 'LLM 请求不可用',
      detail: this.reason,
      data: options?.traceContext?.data,
    });
    throw new Error(this.reason);
  }
}

export class OpenAILLMClient implements LLMClient {
  private client: OpenAI;
  private model: string;
  private timeoutMs: number;

  constructor(apiKey: string, model: string, baseUrl?: string, timeoutMs = 30000) {
    const OpenAIClient = loadOpenAIClient();
    this.client = new OpenAIClient({
      apiKey,
      baseURL: baseUrl,
      timeout: timeoutMs,
    });
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  async classify(systemPrompt: string, userMessage: string): Promise<Intent> {
    logger.debug('OpenAILLMClient: classify request', {
      model: this.model,
      baseUrl: this.client.baseURL ?? null,
      userMessageLength: userMessage.length,
      systemPromptLength: systemPrompt.length,
    });
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    }, {
      timeout: this.timeoutMs,
    });

    const choices = Array.isArray(response.choices) ? response.choices : [];
    const choice = choices[0];
    const content = choice?.message?.content;
    if (!content) {
      logger.warn('OpenAILLMClient: classify response missing content', {
        model: this.model,
        choiceCount: choices.length,
        responseMeta: {
          id: (response as any)?.id ?? null,
          object: (response as any)?.object ?? null,
          model: (response as any)?.model ?? null,
          usage: (response as any)?.usage ?? null,
          error: (response as any)?.error ?? null,
          keys: response && typeof response === 'object' ? Object.keys(response as any) : [],
        },
      });
      throw new Error('LLM response missing content');
    }

    logger.info('OpenAILLMClient: classify response received', {
      model: this.model,
      contentLength: content.length,
      content,
    });
    try {
      return JSON.parse(content) as Intent;
    } catch (error) {
      logger.warn('OpenAILLMClient: classify response not valid JSON', {
        model: this.model,
        contentSnippet: content.slice(0, 200),
      });
      throw error;
    }
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const startedAt = Date.now();
    const timeoutMs = options?.timeoutMs ?? this.timeoutMs;
    const promptChars = messages.reduce((total, message) => total + message.content.length, 0);
    emitTrace(options, {
      source: options?.traceContext?.source ?? 'llm_client',
      phase: options?.traceContext?.phase ?? 'reflection',
      kind: 'llm',
      status: 'started',
      title: options?.traceContext?.title ?? 'LLM 对话请求',
      detail: options?.traceContext?.detail,
      data: {
        ...(options?.traceContext?.data ?? {}),
        model: this.model,
        messageCount: messages.length,
        timeoutMs,
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 1000,
        jsonMode: options?.jsonMode ?? false,
        promptChars,
      },
    });
    logger.debug('OpenAILLMClient: chat request', {
      model: this.model,
      baseUrl: this.client.baseURL ?? null,
      messageCount: messages.length,
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 1000,
      timeoutMs,
      jsonMode: options?.jsonMode ?? false,
      promptChars,
    });
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    const abortListener = () => controller.abort(options?.signal?.reason);
    if (options?.signal) {
      if (options.signal.aborted) {
        controller.abort(options.signal.reason);
      } else {
        options.signal.addEventListener('abort', abortListener, { once: true });
      }
    }
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
        ...(options?.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
      }, {
        timeout: timeoutMs,
        signal: controller.signal,
      });

      const content = response.choices?.[0]?.message?.content || '';
      const finishReason = response.choices?.[0]?.finish_reason ?? 'unknown';
      const elapsedMs = Date.now() - startedAt;
      if (finishReason === 'length') {
        logger.warn('OpenAILLMClient: response truncated by max_tokens limit', {
          model: this.model,
          elapsedMs,
          contentLength: content.length,
          finishReason,
        });
      }
      logger.info('OpenAILLMClient: chat response received', {
        model: this.model,
        elapsedMs,
        contentLength: content.length,
        finishReason,
        content,
      });
      emitTrace(options, {
        source: options?.traceContext?.source ?? 'llm_client',
        phase: options?.traceContext?.phase ?? 'reflection',
        kind: 'llm',
        status: 'completed',
        title: options?.traceContext?.title ?? 'LLM 对话完成',
        detail: content ? `返回 ${content.length} 字符` : '返回空内容',
        data: {
          ...(options?.traceContext?.data ?? {}),
          elapsedMs,
          promptChars,
          contentLength: content.length,
          contentPreview: content.slice(0, 160),
          contentText: content.slice(0, 4000),
        },
      });
      return content;
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      const normalizedError = normalizeChatError(error, timeoutMs, elapsedMs);
      logger.warn('OpenAILLMClient: chat request failed', {
        model: this.model,
        elapsedMs,
        timeoutMs,
        promptChars,
        error: normalizedError.message,
      });
      emitTrace(options, {
        source: options?.traceContext?.source ?? 'llm_client',
        phase: options?.traceContext?.phase ?? 'reflection',
        kind: 'llm',
        status: 'failed',
        title: options?.traceContext?.title ?? 'LLM 对话失败',
        detail: normalizedError.message,
        data: {
          ...(options?.traceContext?.data ?? {}),
          elapsedMs,
          promptChars,
          timeoutMs,
        },
      });
      throw normalizedError;
    } finally {
      clearTimeout(timeoutHandle);
      if (options?.signal) {
        options.signal.removeEventListener('abort', abortListener);
      }
    }
  }
}

export function createLLMClient(config: AgentConfig): LLMClient {
  if (config.llmEnabled === false || !config.llmApiKey) {
    return new DisabledLLMClient(
      'LLM 未配置，无法处理自然语言需求。请设置 AI_API_KEY、OPENAI_API_KEY 或 api_key 后重试。'
    );
  }

  return new OpenAILLMClient(
    config.llmApiKey,
    config.llmModel,
    config.llmBaseUrl,
    config.llmTimeoutMs
  );
}

function loadOpenAIClient(): typeof import('openai').default {
  const openaiModule = require('openai');
  return openaiModule.default ?? openaiModule;
}

function emitTrace(options: ChatOptions | undefined, event: AgentTraceEventInput): void {
  options?.trace?.(event);
}

function normalizeChatError(error: unknown, timeoutMs: number, elapsedMs: number): Error {
  if (isTimeoutError(error)) {
    return new Error(`Request timed out after ${timeoutMs}ms (elapsed ${elapsedMs}ms)`);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('未知错误');
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return error.name === 'AbortError' ||
    message.includes('timed out') ||
    message.includes('timeout');
}
