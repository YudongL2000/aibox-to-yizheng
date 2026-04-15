/**
 * [INPUT]: 依赖 Electron preload 暴露的 tesseract runtime、rxjs 状态流与对话模式 skill preview 协议。
 * [OUTPUT]: 对外提供 TesseractSkillLibraryService，统一管理本地 skills 库列表、保存动作与新技能入库动画信号。
 * [POS]: app/services 的 Tesseract skills 真相源，被 Skill Center 与聊天动作共享，避免 renderer 再长第二套 skills 状态。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DialogueLibrarySkillPreview } from '../tools/aily-chat/services/tesseract-dialogue.models';

@Injectable({
  providedIn: 'root',
})
export class TesseractSkillLibraryService {
  private readonly skillsSubject = new BehaviorSubject<DialogueLibrarySkillPreview[]>([]);
  private readonly incomingSkillIdSubject = new BehaviorSubject<string | null>(null);
  private incomingResetTimer: ReturnType<typeof setTimeout> | null = null;

  readonly skills$ = this.skillsSubject.asObservable();
  readonly incomingSkillId$ = this.incomingSkillIdSubject.asObservable();

  private get electronAPI() {
    return window.electronAPI;
  }

  get snapshot(): DialogueLibrarySkillPreview[] {
    return this.skillsSubject.value;
  }

  async load(projectPath?: string): Promise<DialogueLibrarySkillPreview[]> {
    await this.electronAPI.tesseract.start(this.buildProjectPayload(projectPath));
    const result = await this.electronAPI.tesseract.listSkills(
      this.buildProjectPayload(projectPath)
    );
    const skills = this.normalizeSkillList(result?.skills || result);
    this.skillsSubject.next(skills);
    return skills;
  }

  async save(sessionId: string, projectPath?: string): Promise<DialogueLibrarySkillPreview> {
    if (!sessionId) {
      throw new Error('缺少 sessionId，无法存入 Skills 库');
    }

    await this.electronAPI.tesseract.start(this.buildProjectPayload(projectPath));
    const result = await this.electronAPI.tesseract.saveSkill({
      ...this.buildProjectPayload(projectPath),
      sessionId,
    });
    const savedSkill = this.normalizeSkill(result?.skill);
    if (!savedSkill) {
      throw new Error('Skills 库返回了空结果');
    }

    this.upsertSkill(savedSkill);
    this.markIncoming(savedSkill.skillId);
    return savedSkill;
  }

  async delete(skillId: string): Promise<boolean> {
    if (!skillId) {
      return false;
    }
    const result = await this.electronAPI.tesseract.deleteSkill({ skillId });
    if (result?.success) {
      this.skillsSubject.next(this.snapshot.filter((s) => s.skillId !== skillId));
    }
    return result?.success ?? false;
  }

  private upsertSkill(nextSkill: DialogueLibrarySkillPreview): void {
    const deduped = this.snapshot.filter((item) => item.skillId !== nextSkill.skillId);
    this.skillsSubject.next([nextSkill, ...deduped]);
  }

  private markIncoming(skillId: string): void {
    this.incomingSkillIdSubject.next(skillId);
    if (this.incomingResetTimer) {
      clearTimeout(this.incomingResetTimer);
    }

    this.incomingResetTimer = setTimeout(() => {
      this.incomingSkillIdSubject.next(null);
      this.incomingResetTimer = null;
    }, 2200);
  }

  private normalizeSkillList(value: unknown): DialogueLibrarySkillPreview[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => this.normalizeSkill(item))
      .filter((item): item is DialogueLibrarySkillPreview => Boolean(item));
  }

  private normalizeSkill(value: any): DialogueLibrarySkillPreview | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const skillId = typeof value.skillId === 'string' ? value.skillId.trim() : '';
    const displayName = typeof value.displayName === 'string' ? value.displayName.trim() : '';
    if (!skillId || !displayName) {
      return null;
    }

    const tags = Array.isArray(value.tags)
      ? value.tags.filter((item: unknown) => typeof item === 'string' && item.trim().length > 0)
      : Array.isArray(value.requiredHardware)
        ? value.requiredHardware
          .map((item: any) => typeof item?.displayName === 'string' ? item.displayName.trim() : '')
          .filter(Boolean)
        : [];

    return {
      skillId,
      displayName,
      summary: typeof value.summary === 'string' ? value.summary : '',
      tags: tags.slice(0, 4),
      wakePrompt:
        typeof value.wakePrompt === 'string' && value.wakePrompt.trim().length > 0
          ? value.wakePrompt
          : displayName,
      requiredHardware: Array.isArray(value.requiredHardware)
        ? value.requiredHardware.filter((item: unknown) => Boolean(item))
        : [],
      workflowId: typeof value.workflowId === 'string' ? value.workflowId : '',
      workflowName:
        typeof value.workflowName === 'string' && value.workflowName.trim().length > 0
          ? value.workflowName
          : displayName,
      sourceSessionId:
        typeof value.sourceSessionId === 'string' ? value.sourceSessionId : '',
      workflow: value.workflow && typeof value.workflow === 'object' ? value.workflow : {},
    };
  }

  private buildProjectPayload(projectPath?: string): { projectPath?: string } {
    const normalizedPath = (projectPath || '').trim();
    return normalizedPath ? { projectPath: normalizedPath } : {};
  }
}
