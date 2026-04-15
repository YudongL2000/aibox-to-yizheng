/**
 * [INPUT]: 依赖 NZ_MODAL_DATA/NzModalRef 提供初始视图与关闭能力，依赖 TesseractSkillLibraryService 提供真实 skills 列表与入库动画信号。
 * [OUTPUT]: 对外提供 SkillCenterComponent 与 SkillCenterPrimaryView，承载“我的库 / Skill 广场”模态界面。
 * [POS]: tools/skill-center 的核心弹层，被主窗口 Header 与聊天动作唤起，统一呈现本地 skills 库真相源与广场占位页。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { TesseractSkillLibraryService } from '../../services/tesseract-skill-library.service';
import { DialogueLibrarySkillPreview } from '../aily-chat/services/tesseract-dialogue.models';

export type SkillCenterPrimaryView = 'library' | 'market';
type SkillCenterView = SkillCenterPrimaryView | 'backup';

interface SkillCenterNavItem {
  key: SkillCenterView;
  label: string;
  icon: string;
  disabled?: boolean;
}

interface SkillCenterModalData {
  initialView?: SkillCenterPrimaryView;
  highlightSkillId?: string | null;
}

@Component({
  selector: 'app-skill-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skill-center.component.html',
  styleUrl: './skill-center.component.scss',
})
export class SkillCenterComponent implements OnInit, OnDestroy {
  private readonly modalRef = inject(NzModalRef<SkillCenterComponent>);
  private readonly modalData = inject(NZ_MODAL_DATA, {
    optional: true,
  }) as SkillCenterModalData | null;
  private readonly skillLibraryService = inject(TesseractSkillLibraryService);
  private readonly subscriptions = new Subscription();

  activeView: SkillCenterView = this.modalData?.initialView ?? 'library';
  librarySkills: DialogueLibrarySkillPreview[] = [];
  incomingSkillId: string | null = this.modalData?.highlightSkillId ?? null;

  readonly navItems: SkillCenterNavItem[] = [
    { key: 'library', label: '我的本地库', icon: 'fa-light fa-folder' },
    { key: 'market', label: 'Skill 广场', icon: 'fa-light fa-globe' },
    { key: 'backup', label: '云端备份', icon: 'fa-light fa-cloud-arrow-up', disabled: true },
  ];

  readonly versionLabel = 'skills 库与教学完成成果会在这里汇总';

  ngOnInit(): void {
    this.subscriptions.add(
      this.skillLibraryService.skills$.subscribe((skills) => {
        this.librarySkills = skills;
      })
    );
    this.subscriptions.add(
      this.skillLibraryService.incomingSkillId$.subscribe((skillId) => {
        this.incomingSkillId = skillId;
      })
    );

    void this.skillLibraryService.load();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  setActiveView(view: SkillCenterView): void {
    this.activeView = view;
    if (view === 'library') {
      void this.skillLibraryService.load();
    }
  }

  close(): void {
    this.modalRef.close({ view: this.activeView });
  }

  isIncoming(skillId: string): boolean {
    return Boolean(skillId) && this.incomingSkillId === skillId;
  }

  trackSkill(_index: number, skill: DialogueLibrarySkillPreview): string {
    return skill.skillId;
  }

  requiredHardwareLabels(skill: DialogueLibrarySkillPreview): string[] {
    return (skill.requiredHardware || []).map((item) => item.displayName || item.componentId).filter(Boolean);
  }

  canTrace(skill: DialogueLibrarySkillPreview): boolean {
    return Boolean(skill.sourceSessionId);
  }

  canPublish(skill: DialogueLibrarySkillPreview): boolean {
    return Boolean(skill.workflow && Object.keys(skill.workflow || {}).length > 0);
  }

  traceSkill(skill: DialogueLibrarySkillPreview): void {
    if (!this.canTrace(skill)) {
      return;
    }

    document.dispatchEvent(new CustomEvent('aily-chat-action', {
      detail: {
        action: 'tesseract-open-history-session',
        data: {
          sessionId: skill.sourceSessionId,
        },
      },
    }));
    this.close();
  }

  publishSkill(skill: DialogueLibrarySkillPreview): void {
    document.dispatchEvent(new CustomEvent('aily-chat-action', {
      detail: {
        action: 'tesseract-publish-skill',
        data: {
          skillId: skill.skillId,
          displayName: skill.displayName,
        },
      },
    }));
  }
}
