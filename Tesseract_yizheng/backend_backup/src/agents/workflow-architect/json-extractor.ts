/**
 * [INPUT]: 依赖 LLMClient、AgentLogger 与 workflow normalizer 回调
 * [OUTPUT]: 对外提供 WorkflowJsonExtractor，负责 reasoning 提取、JSON 解析与修复
 * [POS]: workflow-architect 的 JSON 入口层，被 WorkflowArchitect 生成循环调用
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { logger } from '../../utils/logger';
import { LLMClient, type ChatMessage } from '../llm-client';
import { WorkflowDefinition } from '../types';
import { AgentLogger } from '../agent-logger';

export interface WorkflowJsonExtractorOptions {
  llmTimeoutMs: number;
  normalizeWorkflow: (workflow: WorkflowDefinition) => WorkflowDefinition;
}

export class WorkflowJsonExtractor {
  constructor(
    private llmClient: LLMClient,
    private agentLogger: AgentLogger,
    private options: WorkflowJsonExtractorOptions
  ) {}

  extractReasoning(response: string): string {
    const match = response.match(/Reasoning:\s*([\s\S]*?)(\n```json|\n\{)/i);
    if (match) {
      return match[1].trim();
    }
    return '';
  }

  extractWorkflow(response: string): WorkflowDefinition {
    const candidates = this.extractJsonCandidates(response);
    if (candidates.length === 0) {
      candidates.push(response);
    }

    const errors: string[] = [];
    for (const candidate of candidates) {
      try {
        const parsed = this.parseWorkflow(candidate);
        if (!parsed?.nodes) {
          throw new Error('工作流JSON缺少nodes');
        }
        if (!parsed.name) {
          parsed.name = 'Generated Workflow';
        }
        if (!parsed.connections || typeof parsed.connections !== 'object') {
          parsed.connections = {};
          this.options.normalizeWorkflow(parsed);
        }
        return parsed;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : '无法解析工作流JSON');
      }
    }

    throw new Error(errors[0] ?? 'LLM未返回有效的工作流JSON');
  }

  extractJsonCandidate(response: string): string | null {
    return this.extractJsonCandidates(response)[0] ?? null;
  }

  async repairWorkflowJson(
    response: string,
    sessionId: string
  ): Promise<WorkflowDefinition | null> {
    const repairSystemPrompt = `
你是一个JSON修复工具。请将输入中的工作流JSON修复为严格有效的JSON。
要求：
1. 只输出JSON本体，不要解释、不要markdown代码块。
2. 保留原意，不要添加新字段。
3. 确保JSON可以被JSON.parse解析。
`.trim();
    const candidate = this.extractJsonCandidate(response);
    const repairUserMessage = `修复以下JSON并仅输出修复后的JSON：\n${candidate ?? response}`;
    const repairResponse = await this.callLLM([
      { role: 'system', content: repairSystemPrompt },
      { role: 'user', content: repairUserMessage },
    ]);
    this.agentLogger.logLLMCall({
      sessionId,
      phase: 'generating',
      systemPrompt: repairSystemPrompt,
      userMessage: repairUserMessage,
      response: repairResponse,
    });

    try {
      const repaired = this.extractWorkflow(repairResponse);
      return this.options.normalizeWorkflow(repaired);
    } catch (error) {
      logger.warn('WorkflowArchitect: JSON repair failed', {
        error: error instanceof Error ? error.message : 'unknown error',
        jsonSnippet: this.truncateForLog(candidate ?? response, 2000),
      });
      return null;
    }
  }

  truncateForLog(value: string, maxLength: number): string {
    if (!value) {
      return '';
    }
    if (value.length <= maxLength) {
      return value;
    }
    return `${value.slice(0, maxLength)}... [truncated ${value.length - maxLength} chars]`;
  }

  private async callLLM(messages: ChatMessage[]): Promise<string> {
    return this.llmClient.chat(messages, {
      maxTokens: 10000,
      timeoutMs: this.options.llmTimeoutMs,
    });
  }

  private extractJsonCandidates(response: string): string[] {
    const candidates: string[] = [];
    const seen = new Set<string>();
    const fencePattern = /```(?:json)?\s*([\s\S]*?)```/gi;
    let match: RegExpExecArray | null = null;
    while ((match = fencePattern.exec(response)) !== null) {
      const candidate = match[1]?.trim();
      if (!candidate) {
        continue;
      }
      const extracted = candidate.startsWith('{')
        ? candidate
        : this.extractBalancedJson(candidate) ?? candidate;
      if (!seen.has(extracted)) {
        seen.add(extracted);
        candidates.push(extracted);
      }
    }

    const balanced = this.extractBalancedJson(response);
    if (balanced && !seen.has(balanced)) {
      seen.add(balanced);
      candidates.push(balanced);
    }
    return candidates;
  }

  private extractBalancedJson(response: string): string | null {
    let inString = false;
    let escape = false;
    let depth = 0;
    let start = -1;

    for (let index = 0; index < response.length; index += 1) {
      const char = response[index];
      if (inString) {
        if (escape) {
          escape = false;
          continue;
        }
        if (char === '\\') {
          escape = true;
          continue;
        }
        if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === '{') {
        if (depth === 0) {
          start = index;
        }
        depth += 1;
        continue;
      }
      if (char === '}' && depth > 0) {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          return response.slice(start, index + 1);
        }
      }
    }

    if (start >= 0) {
      return response.slice(start);
    }
    return null;
  }

  private parseWorkflow(rawJson: string): WorkflowDefinition {
    const trimmed = rawJson.trim();
    try {
      return JSON.parse(trimmed) as WorkflowDefinition;
    } catch (error) {
      const repaired = this.repairJson(trimmed);
      if (repaired && repaired !== trimmed) {
        return JSON.parse(repaired) as WorkflowDefinition;
      }
      throw error;
    }
  }

  private repairJson(rawJson: string): string | null {
    if (!rawJson.startsWith('{')) {
      return null;
    }
    const openCurly = (rawJson.match(/{/g) ?? []).length;
    const closeCurly = (rawJson.match(/}/g) ?? []).length;
    const openSquare = (rawJson.match(/\[/g) ?? []).length;
    const closeSquare = (rawJson.match(/]/g) ?? []).length;

    let repaired = rawJson;
    if (openSquare > closeSquare) {
      repaired += ']'.repeat(openSquare - closeSquare);
    }
    if (openCurly > closeCurly) {
      repaired += '}'.repeat(openCurly - closeCurly);
    }
    return repaired;
  }
}
