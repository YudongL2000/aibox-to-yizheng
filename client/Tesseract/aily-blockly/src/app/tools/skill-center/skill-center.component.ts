/**
 * [INPUT]: 依赖 NZ_MODAL_DATA/NzModalRef/NzModalService 提供初始视图、关闭、确认对话能力，依赖 NzPaginationModule 分页，依赖 TesseractSkillLibraryService 提供 skills CRUD 与入库动画信号。
 * [OUTPUT]: 对外提供 SkillCenterComponent 与 SkillCenterPrimaryView，承载"我的库 / Skill 广场"模态界面，支持删除、分页、摘要截断。
 * [POS]: tools/skill-center 的核心弹层，被主窗口 Header 与聊天动作唤起，统一呈现本地 skills 库真相源与广场占位页。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { NZ_MODAL_DATA, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
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
  imports: [CommonModule, NzPaginationModule],
  templateUrl: './skill-center.component.html',
  styleUrl: './skill-center.component.scss',
})
export class SkillCenterComponent implements OnInit, OnDestroy {
  private readonly modalRef = inject(NzModalRef<SkillCenterComponent>);
  private readonly modalService = inject(NzModalService);
  private readonly modalData = inject(NZ_MODAL_DATA, {
    optional: true,
  }) as SkillCenterModalData | null;
  private readonly skillLibraryService = inject(TesseractSkillLibraryService);
  private readonly subscriptions = new Subscription();

  activeView: SkillCenterView = this.modalData?.initialView ?? 'library';
  librarySkills: DialogueLibrarySkillPreview[] = [];
  incomingSkillId: string | null = this.modalData?.highlightSkillId ?? null;
  pageIndex = 1;
  pageSize = 6;

  get currentPageSkills(): DialogueLibrarySkillPreview[] {
    const start = (this.pageIndex - 1) * this.pageSize;
    return this.librarySkills.slice(start, start + this.pageSize);
  }

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

  deleteSkill(skill: DialogueLibrarySkillPreview): void {
    this.modalService.confirm({
      nzTitle: '确认删除',
      nzContent: `确定要从本地库中删除「${skill.workflowName || skill.displayName}」吗？此操作不可撤销。`,
      nzOkText: '删除',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzZIndex: 1300,
      nzOnOk: async () => {
        const success = await this.skillLibraryService.delete(skill.skillId);
        if (success) {
          const maxPage = Math.ceil(this.librarySkills.length / this.pageSize) || 1;
          if (this.pageIndex > maxPage) {
            this.pageIndex = maxPage;
          }
        }
      },
    });
  }

  onPageChange(page: number): void {
    this.pageIndex = page;
  }
}
