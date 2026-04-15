/**
 * [INPUT]: 依赖 dialogue-mode 相关领域类型
 * [OUTPUT]: 对外提供对话模式技能目录、输入分类与匹配工具
 * [POS]: dialogue-mode 的技能真相源，定义已知技能、硬件需求、玩法引导与“技能请求/普通对话”边界
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type {
  DialogueModeHardwareRequirement,
  DialogueModeMatchedSkill,
  DialogueModePhysicalCue,
  DialogueModeSkillMatchStatus,
  SkillLibraryRecord,
} from '../types';

export type DialogueInputClassification =
  | {
      kind: 'matched_skill';
      normalizedMessage: string;
      skillEntry: DialogueModeSkillCatalogEntry;
    }
  | {
      kind: 'skill_request';
      normalizedMessage: string;
    }
  | {
      kind: 'free_chat';
      normalizedMessage: string;
    };

export interface DialogueModeSkillCatalogEntry {
  skillId: string;
  displayName: string;
  summary: string;
  keywords: string[];
  gameplayGuide: string;
  requiredHardware: DialogueModeHardwareRequirement[];
  initialPhysicalCue?: DialogueModePhysicalCue;
}

const DIALOGUE_WRAPPER_RE = /<\/?user-query>/gi;
const FREE_CHAT_PATTERNS = [
  /^(你好|您好|嗨|hello|hi)\b/i,
  /你是谁/,
  /介绍一下(你自己|自己)/,
  /你会什么/,
  /在吗/,
  /能听到吗/,
  /谢谢/,
  /再见/,
  /今天天气/,
  /聊聊/,
  /你还好吗/,
];
const ACTION_VERB_PATTERNS = [
  /(帮我|请你|替我|让我|给我|我想让你|我希望你|教你|学习|训练|创建|生成|部署|启动|停止|打开|关闭|执行|完成|开始|跟我玩|一起玩)/,
  /(浇水|避障|巡线|跟随|识别|检测|监控|拍照|播放|播报|提醒|抓取|搬运|挥手|跳舞|开灯|关灯|导航|测距|对话)/,
  /(新的技能|新技能|工作流|教学模式)/,
];

export function normalizeDialogueInput(message: string): string {
  return String(message || '')
    .replace(DIALOGUE_WRAPPER_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyDialogueInput(message: string): DialogueInputClassification {
  return classifyDialogueInputByRules(message, []);
}

export function classifyDialogueInputByRules(
  message: string,
  catalog: DialogueModeSkillCatalogEntry[]
): DialogueInputClassification {
  const normalizedMessage = normalizeDialogueInput(message);
  const skillEntry = matchDialogueSkill(normalizedMessage, catalog);
  if (skillEntry) {
    return {
      kind: 'matched_skill',
      normalizedMessage,
      skillEntry,
    };
  }

  return isSpecificSkillExpression(normalizedMessage)
    ? {
        kind: 'skill_request',
        normalizedMessage,
      }
    : {
        kind: 'free_chat',
        normalizedMessage,
    };
}

export function matchDialogueSkill(
  message: string,
  catalog: DialogueModeSkillCatalogEntry[]
): DialogueModeSkillCatalogEntry | null {
  const normalized = normalizeDialogueInput(message).toLowerCase();
  return (
    catalog.find((skill) =>
      [skill.displayName, skill.summary, ...skill.keywords].some((keyword) =>
        normalized.includes(String(keyword || '').toLowerCase())
      )
    ) ?? null
  );
}

export function toDialogueSkillCatalogEntry(skill: SkillLibraryRecord): DialogueModeSkillCatalogEntry {
  return {
    skillId: skill.skillId,
    displayName: skill.displayName,
    summary: skill.summary,
    keywords: skill.keywords,
    gameplayGuide: skill.gameplayGuide,
    requiredHardware: skill.requiredHardware,
    initialPhysicalCue: skill.initialPhysicalCue,
  };
}

export function toMatchedSkill(
  entry: DialogueModeSkillCatalogEntry,
  status: DialogueModeSkillMatchStatus,
  confidence: number
): DialogueModeMatchedSkill {
  return {
    skillId: entry.skillId,
    displayName: entry.displayName,
    matchStatus: status,
    confidence,
    gameplayGuide: entry.gameplayGuide,
    requiredHardware: entry.requiredHardware,
    initialPhysicalCue: entry.initialPhysicalCue,
  };
}

function isSpecificSkillExpression(normalizedMessage: string): boolean {
  if (!normalizedMessage) {
    return false;
  }

  if (FREE_CHAT_PATTERNS.some((pattern) => pattern.test(normalizedMessage))) {
    return false;
  }

  return ACTION_VERB_PATTERNS.some((pattern) => pattern.test(normalizedMessage));
}
