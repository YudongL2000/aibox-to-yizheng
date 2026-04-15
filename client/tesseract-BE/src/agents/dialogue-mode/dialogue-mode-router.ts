/**
 * [INPUT]: 依赖 LLMClient、dialogue-mode 技能目录与规则分类兜底。
 * [OUTPUT]: 对外提供 DialogueModeRouter，用语义路由决定 free_chat / matched_skill / skill_request。
 * [POS]: dialogue-mode 的语义分流层，位于纯规则 catalog 与业务 service 之间，负责把“是否走 MimicLaw”收敛成 backend 真相源。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { LLMClient } from '../llm-client';
import type { AgentTraceWriter } from '../types';
import type {
  DialogueInputClassification,
  DialogueModeSkillCatalogEntry,
} from './dialogue-mode-catalog';

type DialogueRouterJson = {
  decision?: 'matched_skill' | 'skill_request' | 'free_chat';
  matched_skill_id?: string | null;
  reasoning?: string;
};

export interface DialogueModeRouter {
  classify(params: {
    message: string;
    catalog: DialogueModeSkillCatalogEntry[];
    fallback: DialogueInputClassification;
    trace?: AgentTraceWriter;
  }): Promise<DialogueInputClassification>;
}

const ROUTER_SYSTEM_PROMPT = [
  '你是 OpenClaw 对话模式的语义路由器。',
  '任务只有一个: 判断用户输入应该流向哪条分支。',
  '返回 JSON，字段固定为 decision / matched_skill_id / reasoning。',
  'decision 只能是:',
  '- matched_skill: 用户明确在调用已存在的技能库技能',
  '- skill_request: 用户提出了一个希望机器人执行/学习/创建的具体能力，但当前技能库不一定已有',
  '- free_chat: 纯闲聊、寒暄、自我介绍、问候、情绪交流、元对话，不要求机器人学习或执行具体技能',
  '判定铁律:',
  '- 任何“请你做某事 / 帮我完成某任务 / 学一个能力 / 打造一个交互”都优先是 skill_request，而不是 free_chat。',
  '- 只有明确是寒暄、问你是谁、聊天、礼貌回应、感受类提问时，才是 free_chat。',
  '- 如果用户表达的是已有技能的同义说法，可以判 matched_skill，并返回 matched_skill_id。',
  '- 不要因为句子短就自动判 free_chat。',
  '- 不要输出 markdown，不要解释，只输出 JSON。',
].join('\n');

export class LLMBasedDialogueModeRouter implements DialogueModeRouter {
  constructor(
    private readonly llmClient: LLMClient,
    private readonly timeoutMs: number
  ) {}

  async classify(params: {
    message: string;
    catalog: DialogueModeSkillCatalogEntry[];
    fallback: DialogueInputClassification;
    trace?: AgentTraceWriter;
  }): Promise<DialogueInputClassification> {
    const catalogSummary = params.catalog.map((skill) => ({
      skill_id: skill.skillId,
      display_name: skill.displayName,
      summary: skill.summary,
      keywords: skill.keywords,
    }));

    const raw = await this.llmClient.chat(
      [
        {
          role: 'system',
          content: ROUTER_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: JSON.stringify({
            message: params.message,
            known_skills: catalogSummary,
          }),
        },
      ],
      {
        jsonMode: true,
        temperature: 0,
        maxTokens: 240,
        timeoutMs: this.timeoutMs,
        trace: params.trace,
        traceContext: {
          source: 'agent_service',
          phase: 'intake',
          title: 'DialogueMode 语义分流',
          detail: params.message,
          data: {
            fallbackDecision: params.fallback.kind,
            catalogSize: params.catalog.length,
          },
        },
      }
    );

    const parsed = this.parseJson(raw);
    if (!parsed) {
      return params.fallback;
    }

    if (parsed.decision === 'matched_skill') {
      const matched = params.catalog.find((skill) => skill.skillId === parsed.matched_skill_id);
      if (matched) {
        return {
          kind: 'matched_skill',
          normalizedMessage: params.message,
          skillEntry: matched,
        };
      }
    }

    if (parsed.decision === 'skill_request') {
      return {
        kind: 'skill_request',
        normalizedMessage: params.message,
      };
    }

    if (parsed.decision === 'free_chat') {
      return {
        kind: 'free_chat',
        normalizedMessage: params.message,
      };
    }

    return params.fallback;
  }

  private parseJson(raw: string): DialogueRouterJson | null {
    try {
      const parsed = JSON.parse(String(raw || '').trim()) as DialogueRouterJson;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
}
