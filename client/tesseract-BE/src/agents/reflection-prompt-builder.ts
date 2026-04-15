/**
 * [INPUT]: 依赖 ReflectionDecisionPolicy 规则、ConversationTurn 与 HardwareCapability 目录
 * [OUTPUT]: 对外提供 Reflection system prompt 与 assessment prompt 构建函数
 * [POS]: agents 的反思提示词构建层，被 reflection-engine 作为唯一 prompt builder 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { REFLECTION_DECISION_POLICY_RULES } from './reflection-decision-policy';
import type {
  ConversationTurn,
  HardwareCapability,
} from './types';

export interface ReflectionAssessmentPromptInput {
  userIntent: string;
  discoveredCapabilities: HardwareCapability[];
  capabilityCatalog: HardwareCapability[];
  history: ConversationTurn[];
}

export function buildReflectionSystemPrompt(): string {
  return [
    '你是机器人需求评审助手，只返回最小 JSON。',
    '决策：',
    '- direct_accept: 已闭环且目录内可做',
    '- clarify_needed: 还缺关键闭环信息，不能默认',
    '- reject_out_of_scope: 明确依赖目录外能力',
    '规则：',
    ...REFLECTION_DECISION_POLICY_RULES.map((rule, index) => `${index + 1}. ${rule}`),
    '返回：',
    '{',
    '  "decision":"direct_accept | clarify_needed | reject_out_of_scope",',
    '  "reasoning_summary":"<=50字",',
    '  "recognized_requirements":["string"],',
    '  "supported_capability_ids":["component.capability"],',
    '  "missing_info":[{"category":"trigger | action | condition | feedback | logic","description":"string","priority":1,"blocking":true}],',
    '  "clarification_questions":[{"question":"string","options":["string"],"priority":1,"context":"string"}],',
    '  "suggested_user_actions":[{"label":"语音回复","value":"我希望用语音回复","reason":"string","category":"feedback"}],',
    '  "out_of_scope_reasons":["string"],',
    '  "confidence":0.92',
    '}',
    '约束：',
    '- 最小闭环只需「触发方式」+「反馈方式」。仅 trigger 和 feedback 可设 blocking:true；action/condition/logic 一律 blocking:false（AI 可推断默认值）。',
    '- suggested_user_actions.label 必须是 ≤8 个汉字的简洁短语，禁止包含类别前缀（如"反馈方式:"）或描述性句子。',
    '- recognized_requirements 最多 4 条，missing_info 最多 3 条，clarification_questions 最多 3 条，suggested_user_actions 最多 6 条。',
    '- clarify_needed 时 suggested_user_actions 不得为空，必须给 2-4 条，每条覆盖一个 missing_info 类别，value 必须是用户可以直接发送的完整短句。',
    '- 每条 suggested_user_actions.category 必须与某条 missing_info.category 精确匹配。',
    '- clarification_questions.options 和 suggested_user_actions.value 必须是完整短句，不能只返回 用、语音、屏幕 这类残缺词。',
    '- JSON 字符串里不要用半角双引号包词语。',
    '- 只返回 JSON。',
  ].join('\n');
}

export function buildReflectionAssessmentPrompt(
  input: ReflectionAssessmentPromptInput
): string {
  const candidateSummary = input.discoveredCapabilities.length > 0
    ? input.discoveredCapabilities
        .map((capability) => `${capability.id}:${capability.displayName}`)
        .join('；')
    : '无';
  const catalogSummary = input.capabilityCatalog
    .map((capability) => `${capability.id}:${capability.displayName}`)
    .join('；');
  const historySummary = buildUserHistorySummary(input.history);

  return [
    `需求=${input.userIntent}`,
    `历史=${historySummary || '无'}`,
    `候选=${candidateSummary}`,
    `目录=${catalogSummary}`,
    '请输出最终判定。',
  ].join('\n');
}

function buildUserHistorySummary(history: ConversationTurn[]): string {
  return history
    .filter((turn) => turn.role === 'user')
    .slice(-4)
    .map((turn, index) => `u${index + 1}:${turn.content}`)
    .join(' | ');
}
