/**
 * [INPUT]: 依赖 SessionService、dialogue-mode 技能目录与硬件校验工具
 * [OUTPUT]: 对外提供 OpenClaw 对话模式真相源编排，并明确区分“进入互动”和“上传到硬件”两类动作语义
 * [POS]: dialogue-mode 的业务中枢，负责技能匹配、MimicLaw 兜底对话、MQTT runtime 硬件校验、部署确认与教学接力
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { SessionService } from '../session-service';
import type {
  AgentResponse,
  AgentTraceEventInput,
  DialogueModeEnvelope,
  DialogueModeHardwareEventInput,
  DialogueModeHardwareSnapshot,
  DialogueModeInteractionMode,
  DialogueModeSessionState,
  DialogueModeTeachingHandoff,
  DialogueModeUiAction,
} from '../types';
import {
  applyHardwareEvent,
  createEmptyHardwareSnapshot,
  describeMissingRequirements,
  evaluateHardwareReadiness,
  markHardwareValidationStatus,
} from './hardware-validation';
import {
  classifyDialogueInputByRules,
  matchDialogueSkill,
  toDialogueSkillCatalogEntry,
} from './dialogue-mode-catalog';
import type { DialogueModeRouter } from './dialogue-mode-router';
import type { MqttHardwareRuntime } from '../mqtt-hardware-runtime';
import {
  SkillLibraryRepository,
  toDialogueModeLibrarySkillPreview,
  toDialogueModeMatchedSkill,
} from './skill-library-repository';

export interface DialogueModeChatOptions {
  interactionMode?: DialogueModeInteractionMode;
  teachingContext?: {
    originalPrompt?: string;
    prefilledGoal?: string;
    sourceSessionId?: string;
  } | null;
}

const OPEN_TEACHING_ACTION: DialogueModeUiAction = {
  id: 'open_teaching_mode',
  label: '开启教学模式',
  kind: 'primary',
  enabled: true,
};

const START_DEPLOY_ACTION: DialogueModeUiAction = {
  id: 'start_deploy',
  label: '开始互动',
  kind: 'primary',
  enabled: true,
};

const MAX_RELAY_CHAT_ID_LENGTH = 30;
const RELAY_CHAT_ID_PREFIX = 'dlg';

export class DialogueModeService {
  constructor(
    private sessionService: SessionService,
    private readonly skillLibraryRepository: SkillLibraryRepository,
    private readonly router?: DialogueModeRouter,
    private readonly hardwareRuntime?: MqttHardwareRuntime
  ) {}

  async handleChat(
    message: string,
    sessionId: string,
    options: DialogueModeChatOptions = {}
  ): Promise<AgentResponse | null> {
    if (options.interactionMode !== 'dialogue') {
      return null;
    }

    const session = this.sessionService.getOrCreate(sessionId);
    const currentState = this.getState(sessionId);
    const skillLibrary = this.skillLibraryRepository.buildCatalog();
    const skillCatalog = skillLibrary.map(toDialogueSkillCatalogEntry);
    const librarySkills = skillLibrary.map(toDialogueModeLibrarySkillPreview);
    const runtimeSnapshot = this.resolveHardwareSnapshot(currentState);
    const classification = await this.classifyInput(message, session.id, skillCatalog);
    const normalizedMessage = classification.normalizedMessage || String(message || '').trim();

    if (classification.kind === 'free_chat') {
      const response = this.buildResponse({
        sessionId,
        branch: 'proxy_chat',
        phase: 'interacting',
        message: '这句话我先转给 MimiClaw 来接住。',
        skill: currentState?.matchedSkill ?? null,
        librarySkills,
        hardwareSnapshot: runtimeSnapshot,
        teachingHandoff: currentState?.teachingHandoff ?? null,
        deploymentPrompt: currentState?.deploymentPrompt,
        relay: {
          target: 'mimiclaw_ws',
          message: normalizedMessage,
          chatId: this.buildRelayChatId(session.id),
        },
      });
      this.saveState(sessionId, response.dialogueMode, currentState?.userGoal ?? normalizedMessage);
      return response;
    }

    if (classification.kind === 'skill_request') {
      const handoff = this.buildTeachingHandoff(sessionId, normalizedMessage, options.teachingContext);
      const response = this.buildResponse({
        sessionId,
        branch: 'teaching_handoff',
        phase: 'handoff_ready',
        message: `“${normalizedMessage}”？听起来是个高级技能，我现在的技能库里还没这一项。你想现在进入教学模式，教教我怎么做吗？`,
        teachingHandoff: handoff,
        uiActions: [OPEN_TEACHING_ACTION],
        librarySkills,
        hardwareSnapshot: runtimeSnapshot,
      });
      this.saveState(sessionId, response.dialogueMode, normalizedMessage);
      return response;
    }

    const skillEntry = classification.skillEntry;
    const matchedSkill = toDialogueModeMatchedSkill(
      skillLibrary.find((item) => item.skillId === skillEntry.skillId)!
    );
    const readiness = evaluateHardwareReadiness(
      skillEntry.requiredHardware,
      runtimeSnapshot
    );

    if (readiness.isReady) {
      const response = this.buildResponse({
        sessionId,
        branch: 'instant_play',
        phase: 'interacting',
        message: skillEntry.gameplayGuide,
        skill: matchedSkill,
        librarySkills,
        hardwareSnapshot: readiness.snapshot,
        physicalCue: skillEntry.initialPhysicalCue,
      });
      this.saveState(sessionId, response.dialogueMode, normalizedMessage);
      return response;
    }

    const response = this.buildResponse({
      sessionId,
      branch: 'hardware_guidance',
      phase: runtimeSnapshot.validationStatus === 'failure'
        ? 'failed'
        : 'waiting_for_insert',
      message: this.buildHardwareGuidanceMessage(skillEntry.displayName, readiness.snapshot),
      skill: matchedSkill,
      librarySkills,
      hardwareSnapshot: {
        ...readiness.snapshot,
        validationStatus: 'pending',
      },
      deploymentPrompt: {
        visible: false,
        status: 'hidden',
        message: '正在等待硬件补齐',
      },
    });
    this.saveState(sessionId, response.dialogueMode, normalizedMessage);
    return response;
  }

  validateHardware(
    sessionId: string,
    event: DialogueModeHardwareEventInput
  ): AgentResponse {
    const currentState = this.getState(sessionId);
    const baseSnapshot = this.resolveHardwareSnapshot(currentState, event.source);
    const updatedSnapshot = applyHardwareEvent(baseSnapshot, event);
    const skill = currentState?.matchedSkill;
    const librarySkills = this.skillLibraryRepository.list().map(toDialogueModeLibrarySkillPreview);

    if (!skill) {
      const response = this.buildResponse({
        sessionId,
        branch: 'hardware_guidance',
        phase: 'waiting_for_insert',
        message: '我已经收到硬件变化，但还没有匹配到可以直接玩的技能。',
        librarySkills,
        hardwareSnapshot: updatedSnapshot,
      });
      this.saveState(sessionId, response.dialogueMode, currentState?.userGoal ?? '');
      return response;
    }

    const readiness = evaluateHardwareReadiness(skill.requiredHardware, updatedSnapshot);
    if (event.eventType === 'device_removed') {
      const response = this.buildResponse({
        sessionId,
        branch: 'hardware_guidance',
        phase: 'waiting_for_insert',
        message: `刚才少了点什么，我还在等：${describeMissingRequirements(readiness.missingRequirements) || '必要硬件'}`,
        skill,
        librarySkills,
        hardwareSnapshot: {
          ...readiness.snapshot,
          validationStatus: 'pending',
        },
        deploymentPrompt: {
          visible: false,
          status: 'revoked',
          message: '硬件已移除，等待重新插入',
        },
      });
      this.saveState(sessionId, response.dialogueMode, currentState?.userGoal ?? '');
      return response;
    }

    if (readiness.isReady) {
      const response = this.buildResponse({
        sessionId,
        branch: 'hardware_guidance',
        phase: 'ready_to_deploy',
        message: '感应到了！数据同步完成。我已经准备好大显身手了，我们要开始吗？',
        skill,
        librarySkills,
        hardwareSnapshot: {
          ...readiness.snapshot,
          validationStatus: 'success',
        },
        uiActions: [START_DEPLOY_ACTION],
        deploymentPrompt: {
          visible: true,
          status: 'visible',
          message: '点击开始互动即可进入交互',
          wakeCue: {
            action: 'wake',
            autoTrigger: false,
            targetComponentId: skill.requiredHardware[0]?.componentId,
          },
        },
      });
      this.saveState(sessionId, response.dialogueMode, currentState?.userGoal ?? '');
      return response;
    }

    const failureReason = readiness.missingRequirements.length > 0
      ? `好像还缺少：${describeMissingRequirements(readiness.missingRequirements)}`
      : '好像没插对哦，再检查一下接口？';
    const response = this.buildResponse({
      sessionId,
      branch: 'validation_failed',
      phase: 'failed',
      message: `好像没插对哦，再检查一下接口？${readiness.missingRequirements.length > 0 ? ` 还缺少：${describeMissingRequirements(readiness.missingRequirements)}` : ''}`,
      skill,
      librarySkills,
      hardwareSnapshot: markHardwareValidationStatus(
        {
          ...readiness.snapshot,
          missingRequirements: readiness.missingRequirements,
        },
        'failure',
        failureReason
      ),
      deploymentPrompt: {
        visible: false,
        status: 'hidden',
        message: '等待硬件校验通过',
      },
    });
    this.saveState(sessionId, response.dialogueMode, currentState?.userGoal ?? '');
    return response;
  }

  startDeploy(sessionId: string): AgentResponse {
    const currentState = this.getState(sessionId);
    const librarySkills = this.skillLibraryRepository.list().map(toDialogueModeLibrarySkillPreview);
    const runtimeSnapshot = this.resolveHardwareSnapshot(currentState);
    if (!currentState?.matchedSkill) {
      return this.buildResponse({
        sessionId,
        branch: 'hardware_guidance',
        phase: 'failed',
        message: '当前没有可部署的对话技能，请先完成技能匹配和硬件校验。',
        librarySkills,
        hardwareSnapshot: runtimeSnapshot,
      });
    }

    const response = this.buildResponse({
      sessionId,
      branch: 'hardware_guidance',
      phase: 'interacting',
      message: '装备齐全，来玩吧！',
      skill: currentState.matchedSkill,
      librarySkills,
      hardwareSnapshot: {
        ...runtimeSnapshot,
        validationStatus: 'success',
      },
      physicalCue: {
        action: 'wake',
        autoTrigger: true,
        targetComponentId: currentState.matchedSkill.requiredHardware[0]?.componentId,
      },
      deploymentPrompt: {
        visible: false,
        status: 'confirmed',
        message: '已进入互动',
      },
    });
    this.saveState(sessionId, response.dialogueMode, currentState.userGoal);
    return response;
  }

  getState(sessionId: string): DialogueModeSessionState | null {
    return this.sessionService.getDialogueModeState(sessionId);
  }

  private buildTeachingHandoff(
    sessionId: string,
    originalPrompt: string,
    teachingContext?: DialogueModeChatOptions['teachingContext']
  ): DialogueModeTeachingHandoff {
    return {
      sourceSessionId: teachingContext?.sourceSessionId ?? sessionId,
      originalPrompt,
      prefilledGoal: teachingContext?.prefilledGoal ?? `学习${originalPrompt}`,
      entryMode: 'dialogue_handoff',
      createdAt: new Date().toISOString(),
    };
  }

  private buildHardwareGuidanceMessage(
    skillName: string,
    snapshot: DialogueModeHardwareSnapshot
  ): string {
    const missingNames = snapshot.missingRequirements.map((item) => item.displayName);
    if (missingNames.length === 0) {
      return `${skillName}，但我现在还没准备好。麻烦帮我把需要的硬件都接上。`;
    }

    return `${skillName}，但我现在还没“长出手”来。麻烦帮我把【${missingNames.join('、')}】插上。`;
  }

  private buildResponse(params: {
    sessionId: string;
    branch: DialogueModeEnvelope['branch'];
    phase: DialogueModeEnvelope['phase'];
    message: string;
    skill?: DialogueModeEnvelope['skill'];
    librarySkills?: DialogueModeEnvelope['librarySkills'];
    hardwareSnapshot: DialogueModeHardwareSnapshot;
    uiActions?: DialogueModeUiAction[];
    physicalCue?: DialogueModeEnvelope['physicalCue'];
    relay?: DialogueModeEnvelope['relay'];
    teachingHandoff?: DialogueModeEnvelope['teachingHandoff'];
    deploymentPrompt?: DialogueModeEnvelope['deploymentPrompt'];
  }): AgentResponse & { dialogueMode: DialogueModeEnvelope } {
    const dialogueMode: DialogueModeEnvelope = {
      branch: params.branch,
      phase: params.phase,
      skill: params.skill ?? null,
      librarySkills: params.librarySkills ?? [],
      hardware: {
        ...params.hardwareSnapshot,
      },
      uiActions: params.uiActions ?? [],
      physicalCue: params.physicalCue ?? null,
      relay: params.relay ?? null,
      teachingHandoff: params.teachingHandoff ?? null,
      deploymentPrompt: params.deploymentPrompt ?? {
        visible: false,
        status: 'hidden',
        message: '',
      },
    };

    return {
      type: 'dialogue_mode',
      message: params.message,
      dialogueMode,
    };
  }

  private buildRelayChatId(sessionId: string): string {
    const timestamp = Date.now().toString(36);
    const digest = this.hashToken(`${sessionId}:${timestamp}`);
    return `${RELAY_CHAT_ID_PREFIX}-${timestamp}-${digest}`
      .slice(0, MAX_RELAY_CHAT_ID_LENGTH);
  }

  private resolveHardwareSnapshot(
    currentState: DialogueModeSessionState | null,
    fallbackSource: DialogueModeHardwareSnapshot['source'] = 'backend_cache'
  ): DialogueModeHardwareSnapshot {
    if (!this.hardwareRuntime) {
      return currentState?.hardwareSnapshot ?? createEmptyHardwareSnapshot(fallbackSource);
    }

    if (typeof this.hardwareRuntime.getStatus !== 'function') {
      return this.hardwareRuntime.getDialogueHardwareSnapshot() ?? currentState?.hardwareSnapshot ?? createEmptyHardwareSnapshot(fallbackSource);
    }

    const runtimeStatus = this.hardwareRuntime.getStatus();
    if (runtimeStatus.connectionState !== 'disabled') {
      return this.hardwareRuntime.getDialogueHardwareSnapshot() ?? createEmptyHardwareSnapshot(fallbackSource);
    }

    return currentState?.hardwareSnapshot ?? createEmptyHardwareSnapshot(fallbackSource);
  }

  private hashToken(value: string): string {
    let hash = 2166136261;
    for (const char of value) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0).toString(36).slice(0, 8);
  }

  private async classifyInput(
    message: string,
    sessionId: string,
    skillCatalog: ReturnType<typeof toDialogueSkillCatalogEntry>[]
  ) {
    const directMatch = matchDialogueSkill(message, skillCatalog);
    if (directMatch) {
      return {
        kind: 'matched_skill' as const,
        normalizedMessage: String(message || '').trim(),
        skillEntry: directMatch,
      };
    }

    const fallback = classifyDialogueInputByRules(message, skillCatalog);
    if (!this.router) {
      return fallback;
    }

    try {
      return await this.router.classify({
        message: fallback.normalizedMessage,
        catalog: skillCatalog,
        fallback,
        trace: (event: AgentTraceEventInput) => this.sessionService.appendTrace(sessionId, event),
      });
    } catch (error) {
      this.sessionService.appendTrace(sessionId, {
        source: 'agent_service',
        phase: 'intake',
        kind: 'llm',
        status: 'fallback',
        title: 'DialogueMode 语义分流回退规则模式',
        detail: error instanceof Error ? error.message : '未知错误',
        data: {
          fallbackDecision: fallback.kind,
        },
      });
      return fallback;
    }
  }

  private saveState(sessionId: string, dialogueMode: DialogueModeEnvelope, userGoal: string): void {
    const skill = dialogueMode.skill;
    this.sessionService.setDialogueModeState(sessionId, {
      sessionId,
      interactionMode: 'dialogue',
      userGoal,
      branch: dialogueMode.branch,
      phase: dialogueMode.phase,
      matchedSkill: skill ?? null,
      hardwareSnapshot: dialogueMode.hardware,
      deploymentPrompt: dialogueMode.deploymentPrompt,
      teachingHandoff: dialogueMode.teachingHandoff ?? null,
      lastAgentUtterance:
        dialogueMode.branch === 'teaching_handoff'
          ? '开启教学模式'
          : dialogueMode.branch === 'instant_play'
            ? skill?.gameplayGuide ?? ''
            : dialogueMode.branch === 'hardware_guidance'
              ? dialogueMode.deploymentPrompt?.message ?? ''
              : dialogueMode.branch === 'proxy_chat'
                ? '转发 MimicLaw 对话'
              : '',
      updatedAt: new Date().toISOString(),
    });
  }
}
