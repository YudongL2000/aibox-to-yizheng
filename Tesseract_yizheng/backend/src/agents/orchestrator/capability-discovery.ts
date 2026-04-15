/**
 * [INPUT]: 依赖 AgentConfig、LLMClient、CapabilityRegistry 与 trace 回调
 * [OUTPUT]: 对外提供 CapabilityDiscovery 能力发现、语义补强与搜索关键词提取
 * [POS]: orchestrator/ 的能力发现层，承接 Refactor-4 后的 discovery 子流程
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { AgentConfig } from '../agent-config';
import type { CapabilityRegistry } from '../capability-registry';
import type { LLMClient } from '../llm-client';
import type {
  AgentTraceEventInput,
  ConversationTurn,
  DiscoveredEntity,
  EnhancedDiscoveryResult,
  HardwareCapability,
} from '../types';

export type SemanticDiscoveryResult = EnhancedDiscoveryResult;

export interface DiscoveryOutput {
  capabilities: HardwareCapability[];
  entities: DiscoveredEntity[];
  topologyHint: string;
  semanticDiscovery: SemanticDiscoveryResult;
}

type CapabilityDiscoveryDependencies = {
  config: AgentConfig;
  llmClient: LLMClient;
  capabilityRegistry: CapabilityRegistry;
  emitTrace: (sessionId: string, event: AgentTraceEventInput) => void;
};

const SEMANTIC_DISCOVERY_SYSTEM_PROMPT = `你是机器人能力映射助手，只返回最小 JSON。
只提取用户已明确表达，或完成当前目标不可避免的基础能力；不要补方案。
规则：
1. capability_ids 只能从目录中选择。
2. “打招呼”不等于语音、屏幕或挥手。
3. “聊天/回答/陪伴”本身不等于麦克风、喇叭、屏幕或 LLM；除非用户明确说了说话、听、开口、屏幕、文字、AI、智能等交互方式。“对着它说话，它就回答我”只说明输入输出链路，不说明回复机制。
4. “石头剪刀布/游戏”不等于摄像头识别加机械手输出。
5. “看到/看见/观察/监控”可保守映射为 camera.snapshot_input。
6. 屏幕显示/屏幕反馈可保守映射为 screen.emoji_display。
7. “跟随/跟着我走/自动跟随”可保守映射为 camera.snapshot_input + face_net.face_recognition + wheel.movement_execute。
8. search_terms 保持简短。
9. 当用户提到多个人物/对象/条件时，提取 entities 列表：name(中文名)、key(英文标识)、bindings(动作参数如 gesture/tts_text/emotion/emoji)。
10. topology_hint 用一句话描述工作流结构："线性链: A→B→C" 或 "fan-out: X → [Y1, Y2]" 或 "合流再分支: [A,B]→C→[D1,D2]"。
返回：
{"reasoning_summary":"<=40字","recognized_requirements":["string"],"capability_ids":["component.capability"],"search_terms":["string"],"entities":[{"name":"中文名","key":"英文标识","bindings":{"动作类型":"参数值"}}],"topology_hint":"拓扑描述"}`;

export class CapabilityDiscovery {
  constructor(private readonly deps: CapabilityDiscoveryDependencies) {}

  async discoverCapabilities(
    userIntent: string,
    history: ConversationTurn[],
    sessionId: string,
    previousCapabilityIds: string[]
  ): Promise<DiscoveryOutput> {
    const normalizedIntent = this.normalizeText(userIntent);
    const scoreMap = new Map<string, number>();
    const addScore = (capabilityId: string, score: number) => {
      scoreMap.set(capabilityId, (scoreMap.get(capabilityId) ?? 0) + score);
    };

    this.deps.capabilityRegistry
      .query([userIntent, ...this.extractTokens(normalizedIntent)], 24)
      .forEach((capability) => addScore(capability.id, 4));

    this.deps.capabilityRegistry.listCapabilities().forEach((capability) => {
      capability.keywords.forEach((keyword) => {
        if (!keyword) {
          return;
        }
        if (normalizedIntent.includes(keyword)) {
          addScore(capability.id, Math.max(2, Math.min(keyword.length, 6)));
        }
      });
    });

    previousCapabilityIds.forEach((capabilityId) => addScore(capabilityId, 2));

    const semanticDiscovery = await this.semanticDiscoverCapabilities(
      userIntent,
      history,
      sessionId
    );

    semanticDiscovery.capabilityIds.forEach((capabilityId) => addScore(capabilityId, 8));
    this.deps.capabilityRegistry
      .query(semanticDiscovery.searchTerms, 24)
      .forEach((capability) => addScore(capability.id, 5));

    const capabilities = Array.from(scoreMap.entries())
      .sort((left, right) => {
        const scoreDiff = right[1] - left[1];
        if (scoreDiff !== 0) {
          return scoreDiff;
        }
        const leftCapability = this.deps.capabilityRegistry.getCapability(left[0]);
        const rightCapability = this.deps.capabilityRegistry.getCapability(right[0]);
        return (rightCapability?.confidence ?? 0) - (leftCapability?.confidence ?? 0);
      })
      .map(([capabilityId]) => this.deps.capabilityRegistry.getCapability(capabilityId))
      .filter((capability): capability is HardwareCapability => capability !== undefined)
      .slice(0, 8);

    return {
      capabilities,
      entities: semanticDiscovery.entities,
      topologyHint: semanticDiscovery.topologyHint,
      semanticDiscovery,
    };
  }

  resolveSupportedCapabilities(
    discoveredCapabilities: HardwareCapability[],
    reflectedCapabilityIds: string[]
  ): HardwareCapability[] {
    if (reflectedCapabilityIds.length === 0) {
      return discoveredCapabilities;
    }

    const reflected = this.deps.capabilityRegistry.getByIds(reflectedCapabilityIds);
    return reflected.length > 0 ? reflected : discoveredCapabilities;
  }

  extractSearchKeywords(
    userIntent: string,
    capabilities: HardwareCapability[]
  ): string[] {
    const tokens = this.extractTokens(userIntent);
    const capabilityKeywords = capabilities.flatMap((capability) => capability.keywords.slice(0, 2));
    return Array.from(new Set([...tokens, ...capabilityKeywords])).slice(0, 12);
  }

  private async semanticDiscoverCapabilities(
    userIntent: string,
    history: ConversationTurn[],
    sessionId: string
  ): Promise<SemanticDiscoveryResult> {
    this.deps.emitTrace(sessionId, {
      source: 'orchestrator',
      phase: 'capability_discovery',
      kind: 'llm',
      status: 'started',
      title: 'Orchestrator 语义发现增强',
      detail: '尝试用 AI 把自然语言映射成候选能力与检索词',
    });

    try {
      const response = await this.deps.llmClient.chat(
        [
          { role: 'system', content: SEMANTIC_DISCOVERY_SYSTEM_PROMPT },
          { role: 'user', content: this.buildSemanticDiscoveryPrompt(userIntent, history) },
        ],
        {
          temperature: 0.1,
          maxTokens: 180,
          timeoutMs: this.deps.config.llmDiscoveryTimeoutMs ?? this.deps.config.llmTimeoutMs,
          jsonMode: true,
          trace: (event) => this.deps.emitTrace(sessionId, event),
          traceContext: {
            source: 'orchestrator',
            phase: 'capability_discovery',
            title: 'Orchestrator 语义发现增强',
            detail: '让 AI 先理解触发、动作与候选硬件映射',
            data: {
              prompt: 'semantic_capability_discovery',
            },
          },
        }
      );
      const parsed = this.parseSemanticDiscoveryResponse(response);
      if (parsed.capabilityIds.length > 0 || parsed.searchTerms.length > 0) {
        this.deps.emitTrace(sessionId, {
          source: 'orchestrator',
          phase: 'capability_discovery',
          kind: 'result',
          status: 'completed',
          title: 'AI 语义发现完成',
          detail: parsed.reasoningSummary
            ?? `补充能力 ${parsed.capabilityIds.length} 个，检索词 ${parsed.searchTerms.length} 个`,
          data: {
            capabilityIds: parsed.capabilityIds,
            searchTerms: parsed.searchTerms,
            recognizedRequirements: parsed.recognizedRequirements,
            entityCount: parsed.entities.length,
            topologyHint: parsed.topologyHint,
          },
        });
        return parsed;
      }
    } catch {
      this.deps.emitTrace(sessionId, {
        source: 'orchestrator',
        phase: 'capability_discovery',
        kind: 'result',
        status: 'fallback',
        title: 'AI 语义发现回退',
        detail: 'LLM 未返回可解析能力提示，继续使用规则发现',
      });
    }

    return {
      capabilityIds: [],
      searchTerms: [],
      recognizedRequirements: [],
      reasoningSummary: undefined,
      entities: [],
      topologyHint: '',
    };
  }

  private buildSemanticDiscoveryPrompt(
    userIntent: string,
    history: ConversationTurn[]
  ): string {
    const historySummary = this.buildUserHistorySummary(history);
    const compactCatalog = this.deps.capabilityRegistry
      .listCapabilities()
      .map((capability) => `${capability.id}:${capability.displayName}`)
      .join('；');

    return [
      `需求=${userIntent}`,
      `历史=${historySummary || '无'}`,
      `目录=${compactCatalog}`,
      '只返回最相关的 capability_ids 与 search_terms。',
    ].join('\n');
  }

  private buildUserHistorySummary(history: ConversationTurn[]): string {
    return history
      .filter((turn) => turn.role === 'user')
      .slice(-4)
      .map((turn, index) => `u${index + 1}:${turn.content}`)
      .join(' | ');
  }

  private parseSemanticDiscoveryResponse(response: string): SemanticDiscoveryResult {
    const parsed = this.safeParseJson(response);
    if (!parsed || typeof parsed !== 'object') {
      return {
        capabilityIds: [],
        searchTerms: [],
        recognizedRequirements: [],
        reasoningSummary: undefined,
        entities: [],
        topologyHint: '',
      };
    }

    const container = parsed as Record<string, unknown>;
    const capabilityIds = this.normalizeStringArray(container.capability_ids)
      .filter((capabilityId) => Boolean(this.deps.capabilityRegistry.getCapability(capabilityId)))
      .slice(0, 6);
    const searchTerms = this.normalizeStringArray(container.search_terms).slice(0, 8);
    const recognizedRequirements = this.normalizeStringArray(container.recognized_requirements).slice(0, 6);
    const reasoningSummary = this.readText(container.reasoning_summary)?.slice(0, 240);
    const entities = this.normalizeEntities(container.entities).slice(0, 8);
    const topologyHint = (
      this.readText(container.topology_hint)
      ?? this.readText(container.topologyHint)
      ?? ''
    ).slice(0, 160);

    return {
      capabilityIds,
      searchTerms,
      recognizedRequirements,
      reasoningSummary,
      entities,
      topologyHint,
    };
  }

  private readText(value: unknown): string | undefined {
    return typeof value === 'string' ? value.trim() || undefined : undefined;
  }

  private normalizeStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.readText(item))
        .filter((item): item is string => Boolean(item));
    }
    return [];
  }

  private normalizeEntities(value: unknown): DiscoveredEntity[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => this.normalizeEntity(item))
      .filter((item): item is DiscoveredEntity => item !== null);
  }

  private normalizeEntity(value: unknown): DiscoveredEntity | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const record = value as Record<string, unknown>;
    const key = this.readText(record.key);
    if (!key) {
      return null;
    }

    return {
      name: this.readText(record.name) ?? key,
      key,
      bindings: this.normalizeBindings(record.bindings),
    };
  }

  private normalizeBindings(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
      (bindings, [key, bindingValue]) => {
        const normalized = this.readText(bindingValue);
        if (!normalized) {
          return bindings;
        }
        bindings[key] = normalized;
        return bindings;
      },
      {}
    );
  }

  private safeParseJson(raw: string): unknown | null {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }

    const direct = this.tryParseJson(trimmed);
    if (direct !== null) {
      return direct;
    }

    const repairedDirect = this.tryRepairJson(trimmed);
    if (repairedDirect !== null) {
      return repairedDirect;
    }

    const codeFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/i);
    if (codeFenceMatch?.[1]) {
      const candidate = codeFenceMatch[1].trim();
      const parsed = this.tryParseJson(candidate);
      if (parsed !== null) {
        return parsed;
      }
      return this.tryRepairJson(candidate);
    }

    return null;
  }

  private tryParseJson(raw: string): unknown | null {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private tryRepairJson(raw: string): unknown | null {
    const repaired = raw
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/\r/g, '');
    return repaired === raw ? null : this.tryParseJson(repaired);
  }

  private extractTokens(value: string): string[] {
    return this.normalizeText(value)
      .split(/[\s,，。！？!?.、；;]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 1);
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .replace(/[._-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
