/**
 * [INPUT]: 依赖 TesseractSkillLibraryService 提供本地 skills 真相源，依赖 support panel 传入当前一级页面与高亮信号。
 * [OUTPUT]: 对外提供 SkillsPanelComponent，作为右侧支持层里的轻量 Skills 单页，承接“我的库 / 广场”各自页面下的调用与展开管理动作，并保持一层式极简结构。
 * [POS]: tools/skill-center 的轻量 Skills 页面组件，服务于 AI + Digital Twin / AI + Workflow 同屏协作，不再额外叠内部 tab。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { TesseractSkillLibraryService } from '../../services/tesseract-skill-library.service';
import { SkillPanelViewId } from '../../services/ui.service';
import { DialogueLibrarySkillPreview } from '../aily-chat/services/tesseract-dialogue.models';

type SkillManagerView = SkillPanelViewId;

@Component({
  selector: 'app-skills-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skills-panel.component.html',
  styleUrl: './skills-panel.component.scss',
})
export class SkillsPanelComponent implements OnInit, OnDestroy {
  @Input() page: SkillPanelViewId = 'library';
  @Input() highlightSkillId: string | null = null;

  @Output() manageRequested = new EventEmitter<SkillManagerView>();
  @Output() runSkill = new EventEmitter<DialogueLibrarySkillPreview>();
  @Output() traceRequested = new EventEmitter<DialogueLibrarySkillPreview>();
  @Output() publishRequested = new EventEmitter<DialogueLibrarySkillPreview>();

  private readonly subscriptions = new Subscription();

  librarySkills: DialogueLibrarySkillPreview[] = [];
  incomingSkillId: string | null = null;

  constructor(private skillLibraryService: TesseractSkillLibraryService) {}

  get manageLabel(): string {
    return this.page === 'market' ? '打开' : '管理';
  }

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

  requestManage(view: SkillManagerView): void {
    this.manageRequested.emit(view);
  }

  triggerRun(skill: DialogueLibrarySkillPreview): void {
    if (!this.canRun(skill)) {
      return;
    }
    this.runSkill.emit(skill);
  }

  triggerTrace(skill: DialogueLibrarySkillPreview): void {
    if (!this.canTrace(skill)) {
      return;
    }
    this.traceRequested.emit(skill);
  }

  triggerPublish(skill: DialogueLibrarySkillPreview): void {
    if (!this.canPublish(skill)) {
      return;
    }
    this.publishRequested.emit(skill);
  }

  trackSkill(_index: number, skill: DialogueLibrarySkillPreview): string {
    return skill.skillId;
  }

  isIncoming(skillId: string): boolean {
    return Boolean(skillId) && (this.highlightSkillId === skillId || this.incomingSkillId === skillId);
  }

  requiredHardwareLabels(skill: DialogueLibrarySkillPreview): string[] {
    return (skill.requiredHardware || [])
      .map((item) => item.displayName || item.componentId)
      .filter(Boolean)
      .slice(0, 4);
  }

  canTrace(skill: DialogueLibrarySkillPreview): boolean {
    return Boolean(skill.sourceSessionId);
  }

  canPublish(skill: DialogueLibrarySkillPreview): boolean {
    return this.canRun(skill);
  }

  canRun(skill: DialogueLibrarySkillPreview): boolean {
    return Boolean(skill.workflow && Object.keys(skill.workflow || {}).length > 0);
  }
}
