/**
 * [INPUT]: 依赖 Node.js fs/path、AgentSession 与 dialogue-mode 领域类型。
 * [OUTPUT]: 对外提供 SkillLibraryRepository、skills JSON 持久化、skill save candidate 构造与对话库摘要折叠。
 * [POS]: dialogue-mode 的技能库真相源，负责把教学完成产物落为可检索 skill JSON，并为对话分流与前端库视图提供统一数据。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import fs from 'fs';
import path from 'path';
import type {
  AgentSession,
  ConfigAgentState,
  DialogueModeHardwareRequirement,
  DialogueModeLibrarySkillPreview,
  DialogueModeMatchedSkill,
  DialogueModePhysicalCue,
  SkillLibraryRecord,
  SkillSaveCandidate,
  WorkflowDefinition,
} from '../types';

const DEFAULT_SKILL_LIBRARY_DIR = path.resolve(process.cwd(), 'data', 'skills');

const HARDWARE_REQUIREMENT_PRESETS: Record<
  string,
  Pick<DialogueModeHardwareRequirement, 'componentId' | 'displayName' | 'requiredCapability'>
> = {
  CAM: {
    componentId: 'camera',
    displayName: '摄像头',
    requiredCapability: 'camera_capture',
  },
  MIC: {
    componentId: 'microphone',
    displayName: '麦克风',
    requiredCapability: 'audio_capture',
  },
  HAND: {
    componentId: 'mechanical_hand',
    displayName: '机械手',
    requiredCapability: 'hand_execute',
  },
  SPEAKER: {
    componentId: 'speaker',
    displayName: '喇叭',
    requiredCapability: 'audio_playback',
  },
  SCREEN: {
    componentId: 'screen',
    displayName: '屏幕',
    requiredCapability: 'screen_display',
  },
  WHEEL: {
    componentId: 'chassis',
    displayName: '底盘',
    requiredCapability: 'chassis_motion',
  },
};

export class SkillLibraryRepository {
  constructor(private readonly rootDir = DEFAULT_SKILL_LIBRARY_DIR) {}

  list(): SkillLibraryRecord[] {
    this.ensureRootDir();
    return fs.readdirSync(this.rootDir)
      .filter((fileName) => fileName.endsWith('.json'))
      .map((fileName) => this.readSkillFile(path.join(this.rootDir, fileName)))
      .filter((item): item is SkillLibraryRecord => Boolean(item))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  save(candidate: SkillSaveCandidate, workflow: WorkflowDefinition): SkillLibraryRecord {
    this.ensureRootDir();
    const existing = this.findBySkillId(candidate.skillId);
    const now = new Date().toISOString();
    const nextRecord: SkillLibraryRecord = {
      skillId: candidate.skillId,
      displayName: candidate.displayName,
      summary: candidate.summary,
      keywords: uniqueStrings(candidate.keywords),
      gameplayGuide: candidate.gameplayGuide,
      requiredHardware: candidate.requiredHardware,
      initialPhysicalCue: candidate.initialPhysicalCue,
      workflowId: candidate.workflowId,
      workflowName: candidate.workflowName,
      workflow,
      sourceSessionId: candidate.sourceSessionId,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    fs.writeFileSync(
      this.getSkillFilePath(nextRecord.skillId),
      JSON.stringify(nextRecord, null, 2),
      'utf-8'
    );
    return nextRecord;
  }

  deleteBySkillId(skillId: string): boolean {
    const filePath = this.getSkillFilePath(skillId);
    if (!fs.existsSync(filePath)) {
      return false;
    }
    fs.unlinkSync(filePath);
    return true;
  }

  buildCatalog(): SkillLibraryRecord[] {
    return this.list();
  }

  // ── 关键词模糊搜索 ─────────────────────────────────────────
  findByKeywords(keywords: string[], limit = 2): SkillLibraryRecord[] {
    if (keywords.length === 0) return [];
    const lowerKeywords = keywords.map((k) => k.toLowerCase());
    const scored = this.list()
      .map((record) => {
        const haystack = [
          record.displayName,
          record.summary,
          ...(record.keywords ?? []),
        ].join(' ').toLowerCase();
        const hits = lowerKeywords.filter((kw) => haystack.includes(kw)).length;
        return { record, hits };
      })
      .filter((entry) => entry.hits > 0)
      .sort((a, b) => b.hits - a.hits);
    return scored.slice(0, limit).map((entry) => entry.record);
  }

  private findBySkillId(skillId: string): SkillLibraryRecord | null {
    const filePath = this.getSkillFilePath(skillId);
    return fs.existsSync(filePath) ? this.readSkillFile(filePath) : null;
  }

  private getSkillFilePath(skillId: string): string {
    return path.join(this.rootDir, `${skillId}.json`);
  }

  private ensureRootDir(): void {
    if (!fs.existsSync(this.rootDir)) {
      fs.mkdirSync(this.rootDir, { recursive: true });
    }
  }

  private readSkillFile(filePath: string): SkillLibraryRecord | null {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as SkillLibraryRecord;
      if (!parsed || typeof parsed !== 'object' || !parsed.skillId || !parsed.displayName) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}

export function buildSkillSaveCandidateFromSession(session: AgentSession): SkillSaveCandidate | null {
  if (!session.workflow || !session.configAgentState?.completed) {
    return null;
  }

  const displayName = deriveDisplayName(session);
  const summary = deriveSummary(session, displayName);
  const keywords = deriveKeywords(session, displayName, summary);
  const requiredHardware = buildRequiredHardware(session.configAgentState);
  const workflowId = session.configAgentState.workflowId;

  return {
    skillId: buildSkillId(displayName),
    displayName,
    summary,
    keywords,
    gameplayGuide: `没问题！我已经学会“${displayName}”了。你只要像平时一样提出这个需求，我会先检查硬件，再带你开始交互。`,
    requiredHardware,
    initialPhysicalCue: deriveInitialPhysicalCue(requiredHardware),
    workflowId,
    workflowName: session.workflow.name || displayName,
    sourceSessionId: session.id,
  };
}

export function toDialogueModeLibrarySkillPreview(
  skill: SkillLibraryRecord
): DialogueModeLibrarySkillPreview {
  return {
    skillId: skill.skillId,
    displayName: skill.displayName,
    summary: skill.summary,
    tags: uniqueStrings(skill.requiredHardware.map((item) => item.displayName)).slice(0, 4),
    wakePrompt: skill.displayName,
    requiredHardware: skill.requiredHardware,
    workflowId: skill.workflowId,
    workflowName: skill.workflowName,
    sourceSessionId: skill.sourceSessionId,
    workflow: skill.workflow,
  };
}

export function toDialogueModeMatchedSkill(skill: SkillLibraryRecord): DialogueModeMatchedSkill {
  return {
    skillId: skill.skillId,
    displayName: skill.displayName,
    matchStatus: 'matched',
    confidence: 0.97,
    gameplayGuide: skill.gameplayGuide,
    requiredHardware: skill.requiredHardware,
    initialPhysicalCue: skill.initialPhysicalCue,
  };
}

function buildRequiredHardware(configState: ConfigAgentState): DialogueModeHardwareRequirement[] {
  const requirements = new Map<string, DialogueModeHardwareRequirement>();

  for (const node of configState.configurableNodes) {
    const preset = node.category ? HARDWARE_REQUIREMENT_PRESETS[node.category] : null;
    if (!preset) {
      continue;
    }

    const topology = String(
      node.configValues?.portId
      || node.configValues?.topology
      || ''
    ).trim();
    const requirementKey = `${preset.componentId}:${topology || 'any'}`;

    if (!requirements.has(requirementKey)) {
      requirements.set(requirementKey, {
        componentId: preset.componentId,
        displayName: preset.displayName,
        requiredCapability: preset.requiredCapability,
        acceptablePorts: topology ? [topology] : [],
        requiredModelIds: [],
        isOptional: false,
      });
    }
  }

  return Array.from(requirements.values());
}

function deriveInitialPhysicalCue(
  requiredHardware: DialogueModeHardwareRequirement[]
): DialogueModePhysicalCue | undefined {
  const mechanicalHand = requiredHardware.find((item) => item.componentId === 'mechanical_hand');
  if (mechanicalHand) {
    return {
      action: 'hand_stretch',
      autoTrigger: true,
      targetComponentId: mechanicalHand.componentId,
    };
  }

  const primaryHardware = requiredHardware[0];
  if (!primaryHardware) {
    return undefined;
  }

  return {
    action: 'wake',
    autoTrigger: true,
    targetComponentId: primaryHardware.componentId,
  };
}

function deriveDisplayName(session: AgentSession): string {
  const candidates = [
    session.dialogueModeState?.teachingHandoff?.prefilledGoal,
    session.dialogueModeState?.userGoal,
    session.workflowSummary,
    session.workflow?.name,
    findLastUserTurn(session),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeHumanLabel(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return '新技能';
}

function deriveSummary(session: AgentSession, displayName: string): string {
  const summary = normalizeSentence(session.workflowSummary);
  if (summary) {
    return summary;
  }

  const userGoal = normalizeSentence(session.dialogueModeState?.userGoal || findLastUserTurn(session));
  if (userGoal) {
    return `通过教学模式学会“${displayName}”，目标是：${userGoal}`;
  }

  return `通过教学模式创建的技能：${displayName}`;
}

function deriveKeywords(session: AgentSession, displayName: string, summary: string): string[] {
  return uniqueStrings(
    [displayName, session.dialogueModeState?.userGoal, session.workflow?.name, summary]
      .flatMap((value) => splitKeywords(value))
  ).slice(0, 12);
}

function buildSkillId(displayName: string): string {
  const normalized = displayName
    .normalize('NFKD')
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  const asciiSafe = normalized
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return asciiSafe || `skill-${Date.now().toString(36)}`;
}

function findLastUserTurn(session: AgentSession): string {
  for (let index = session.history.length - 1; index >= 0; index -= 1) {
    const turn = session.history[index];
    if (turn?.role === 'user' && turn.content) {
      return turn.content;
    }
  }
  return '';
}

function normalizeHumanLabel(value: string | undefined | null): string {
  const normalized = normalizeSentence(value)
    .replace(/^学习/, '')
    .replace(/^教(我|你)/, '')
    .replace(/^帮我/, '')
    .replace(/^请你/, '')
    .replace(/^实现/, '')
    .replace(/^创建/, '')
    .replace(/^生成/, '')
    .trim();
  return normalized || '';
}

function normalizeSentence(value: string | undefined | null): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .trim();
}

function splitKeywords(value: string | undefined | null): string[] {
  const normalized = normalizeSentence(value);
  if (!normalized) {
    return [];
  }

  const phrases = normalized
    .split(/[，。！？、,/.|;；:\n\r]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return phrases.length > 0 ? phrases : [normalized];
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )
  );
}
