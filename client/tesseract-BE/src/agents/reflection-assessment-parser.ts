/**
 * [INPUT]: 依赖 ReflectionDecisionPolicy 类型与 HardwareCapability 目录
 * [OUTPUT]: 对外提供 ReflectionAssessment 的 JSON 修复、解析与协议归一化
 * [POS]: agents 的反思协议解析层，被 reflection-engine 用作唯一 assessment parser
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import {
  REFLECTION_CATEGORY_LABELS,
  type ReflectionPolicyActionSuggestion,
  type ReflectionPolicyAssessment,
  type ReflectionPolicyDecision,
  type ReflectionPolicyMissingCategory,
  type ReflectionPolicyMissingInfo,
  type ReflectionPolicyQuestion,
} from './reflection-decision-policy';
import type { HardwareCapability } from './types';

export function parseReflectionAssessmentResponse(
  response: string,
  capabilityCatalog: HardwareCapability[],
  maxQuestions: number = 5
): ReflectionPolicyAssessment | null {
  const parsed = safeParseJson(response);
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const container = parsed as Record<string, unknown>;
  const catalogIds = new Set(capabilityCatalog.map((capability) => capability.id));
  const decision = normalizeDecision(container.decision);
  if (!decision) {
    return null;
  }

  const missingInfo = normalizeMissingInfo(container.missing_info);

  return {
    decision,
    reasoningSummary: normalizeSummary(container.reasoning_summary),
    recognizedRequirements: normalizeRecognizedRequirements(container.recognized_requirements),
    supportedCapabilityIds: normalizeSupportedCapabilityIds(
      container.supported_capability_ids ?? container.capability_ids,
      catalogIds
    ),
    missingInfo,
    questions: normalizeQuestions(container.clarification_questions, missingInfo, maxQuestions),
    suggestedActions: normalizeSuggestedActions(container.suggested_user_actions, missingInfo),
    outOfScopeReasons: normalizeOutOfScopeReasons(container.out_of_scope_reasons),
    confidence: normalizeConfidence(container.confidence),
  };
}

function normalizeDecision(value: unknown): ReflectionPolicyDecision | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim() as ReflectionPolicyDecision;
  if (
    normalized === 'direct_accept' ||
    normalized === 'clarify_needed' ||
    normalized === 'reject_out_of_scope'
  ) {
    return normalized;
  }

  return null;
}

function normalizeMissingInfo(value: unknown): ReflectionPolicyMissingInfo[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const missing: ReflectionPolicyMissingInfo[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const record = item as Record<string, unknown>;
    const category = normalizeMissingCategory(record.category);
    const description = normalizeSummary(record.description);
    if (!category || !description || seen.has(category)) {
      return;
    }

    seen.add(category);
    missing.push({
      category,
      description,
      priority: toPriority(Number(record.priority ?? 2)),
      blocking: Boolean(record.blocking ?? true),
    });
  });

  return missing.sort((left, right) => left.priority - right.priority);
}

function normalizeMissingCategory(value: unknown): ReflectionPolicyMissingCategory | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim() as ReflectionPolicyMissingCategory;
  if (
    normalized === 'trigger' ||
    normalized === 'action' ||
    normalized === 'condition' ||
    normalized === 'feedback' ||
    normalized === 'logic'
  ) {
    return normalized;
  }

  return null;
}

function normalizeQuestions(
  value: unknown,
  missingInfo: ReflectionPolicyMissingInfo[],
  maxQuestions: number
): ReflectionPolicyQuestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const defaultContext = new Map(missingInfo.map((item) => [item.category, item.description]));
  const seen = new Set<string>();
  const questions: ReflectionPolicyQuestion[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const record = item as Record<string, unknown>;
    const question = normalizeQuestionText(String(record.question ?? ''));
    if (!question || seen.has(question)) {
      return;
    }

    seen.add(question);
    questions.push({
      question,
      options: normalizeOptions(record.options),
      priority: toPriority(Number(record.priority ?? 2)),
      context: typeof record.context === 'string'
        ? record.context.trim()
        : Array.from(defaultContext.values())[0] ?? '澄清核心需求',
    });
  });

  return questions
    .sort((left, right) => left.priority - right.priority)
    .slice(0, maxQuestions);
}

function normalizeSuggestedActions(
  value: unknown,
  missingInfo: ReflectionPolicyMissingInfo[]
): ReflectionPolicyActionSuggestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const allowedCategories = new Set(missingInfo.map((item) => item.category));
  const seen = new Set<string>();
  const suggestions: ReflectionPolicyActionSuggestion[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const record = item as Record<string, unknown>;
    const category = normalizeSuggestedActionCategory(record.category, allowedCategories);
    const valueText = normalizeQuestionText(String(record.value ?? ''));
    if (!category || !isUsableSuggestedActionValue(valueText) || seen.has(valueText)) {
      return;
    }

    seen.add(valueText);
    const rawLabel = normalizeQuestionText(String(record.label ?? ''));
    const label = isUsableChoiceText(rawLabel) ? rawLabel : valueText;
    suggestions.push({
      category,
      value: valueText,
      label,
      reason: normalizeSummary(record.reason),
    });
  });

  return suggestions.slice(0, 6);
}

function normalizeSuggestedActionCategory(
  value: unknown,
  allowedCategories: Set<ReflectionPolicyMissingCategory>
): ReflectionPolicyMissingCategory | null {
  const category = normalizeMissingCategory(value);
  if (!category) {
    return null;
  }
  if (allowedCategories.size > 0 && !allowedCategories.has(category)) {
    return null;
  }
  return category;
}

function normalizeSupportedCapabilityIds(
  value: unknown,
  catalogIds: Set<string>
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item && catalogIds.has(item))
  )).slice(0, 8);
}

function normalizeOutOfScopeReasons(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .map((item) => normalizeSummary(item))
      .filter((item): item is string => Boolean(item))
  )).slice(0, 4);
}

function normalizeRecognizedRequirements(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .map((item) => normalizeSummary(item))
      .filter((item): item is string => Boolean(item))
  )).slice(0, 8);
}

function normalizeSummary(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized ? normalized.slice(0, 280) : undefined;
}

function normalizeOptions(options: unknown): string[] | undefined {
  if (!Array.isArray(options)) {
    return undefined;
  }
  const normalized = options
    .map((option) => (typeof option === 'string' ? normalizeQuestionText(option) : ''))
    .filter((option) => isUsableChoiceText(option))
    .slice(0, 5);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeConfidence(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined;
  }
  return clamp(value, 0, 1);
}

function safeParseJson(raw: string): unknown | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const direct = tryParse(trimmed);
  if (direct !== null) {
    return direct;
  }
  const repairedDirect = tryRepairParse(trimmed);
  if (repairedDirect !== null) {
    return repairedDirect;
  }
  const sanitizedDirect = tryParse(sanitizeJsonStringQuotes(trimmed));
  if (sanitizedDirect !== null) {
    return sanitizedDirect;
  }

  const firstBraceIndex = trimmed.indexOf('{');
  const lastBraceIndex = trimmed.lastIndexOf('}');
  if (firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex) {
    const candidate = trimmed.slice(firstBraceIndex, lastBraceIndex + 1);
    const objectParsed = tryParse(candidate);
    if (objectParsed !== null) {
      return objectParsed;
    }
    const repairedObject = tryRepairParse(candidate);
    if (repairedObject !== null) {
      return repairedObject;
    }
    const sanitizedObject = tryParse(sanitizeJsonStringQuotes(candidate));
    if (sanitizedObject !== null) {
      return sanitizedObject;
    }
  }

  const firstBracketIndex = trimmed.indexOf('[');
  const lastBracketIndex = trimmed.lastIndexOf(']');
  if (firstBracketIndex >= 0 && lastBracketIndex > firstBracketIndex) {
    const candidate = trimmed.slice(firstBracketIndex, lastBracketIndex + 1);
    return tryParse(candidate);
  }

  return null;
}

function tryParse(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function tryRepairParse(raw: string): unknown | null {
  try {
    const { jsonrepair } = require('jsonrepair');
    return JSON.parse(jsonrepair(raw));
  } catch {
    return null;
  }
}

function sanitizeJsonStringQuotes(raw: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escaped = true;
      continue;
    }

    if (char !== '"') {
      result += char;
      continue;
    }

    if (!inString) {
      inString = true;
      result += char;
      continue;
    }

    const nextNonSpace = nextNonSpaceChar(raw, index + 1);
    if (
      nextNonSpace === ':' ||
      nextNonSpace === ',' ||
      nextNonSpace === '}' ||
      nextNonSpace === ']' ||
      nextNonSpace === ''
    ) {
      inString = false;
      result += char;
      continue;
    }

    result += '＂';
  }

  return result;
}

function nextNonSpaceChar(raw: string, start: number): string {
  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];
    if (!/\s/.test(char)) {
      return char;
    }
  }

  return '';
}

function toPriority(priority: number): 1 | 2 | 3 {
  if (priority <= 1) return 1;
  if (priority >= 3) return 3;
  return 2;
}

function normalizeQuestionText(question: string): string {
  return question.trim().replace(/\s+/g, ' ');
}

function isUsableChoiceText(text: string): boolean {
  if (!text) {
    return false;
  }

  if (text.length <= 2) {
    return false;
  }

  if (/^(用|先|再|都行|都可以|任意|默认|其他|它看|它听|它说|看它|听它)$/.test(text)) {
    return false;
  }

  return /[\p{L}\p{N}]/u.test(text);
}

function isUsableSuggestedActionValue(text: string): boolean {
  if (!isUsableChoiceText(text)) {
    return false;
  }

  if (text.length < 6) {
    return false;
  }

  return /我|机器人|通过|用|看到|听到|识别|屏幕|语音|动作|表情|触发/u.test(text);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
