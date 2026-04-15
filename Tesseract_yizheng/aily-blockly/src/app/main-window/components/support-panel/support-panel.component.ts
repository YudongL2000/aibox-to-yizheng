/**
 * [INPUT]: 依赖 UiService 的右侧支持层单路径 payload、SkillCenter 模态与现有 AI/Skills/Model Store/Serial Tools 组件。
 * [OUTPUT]: 对外提供 SupportPanelComponent，把 header 一级入口映射成单页内容面板；SupportPanel 内不再保留跨维度二级 tab，避免出现“库里套模型页”这类错位层级。
 * [POS]: main-window/components/support-panel 的右侧支持层容器，负责 support panel 的单页切换，以及完整 Skill Center 管理态入口。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { ToolContainerComponent } from '../../../components/tool-container/tool-container.component';
import { UiService, SkillPanelViewId, SupportPanelState, SupportPanelViewId } from '../../../services/ui.service';
import { AilyChatComponent } from '../../../tools/aily-chat/aily-chat.component';
import { ModelStoreComponent } from '../../../tools/model-store/model-store.component';
import { SerialMonitorComponent } from '../../../tools/serial-monitor/serial-monitor.component';
import { SkillCenterComponent, SkillCenterPrimaryView } from '../../../tools/skill-center/skill-center.component';
import { SkillsPanelComponent } from '../../../tools/skill-center/skills-panel.component';
import { DialogueLibrarySkillPreview } from '../../../tools/aily-chat/services/tesseract-dialogue.models';

@Component({
  selector: 'app-support-panel',
  standalone: true,
  imports: [
    CommonModule,
    ToolContainerComponent,
    AilyChatComponent,
    SkillsPanelComponent,
    ModelStoreComponent,
    SerialMonitorComponent,
  ],
  templateUrl: './support-panel.component.html',
  styleUrl: './support-panel.component.scss',
})
export class SupportPanelComponent implements OnInit, OnChanges {
  @Input() panelState: SupportPanelState | null = null;

  activeView: SupportPanelViewId = 'assistant';
  highlightedSkillId: string | null = null;

  private skillCenterModalRef?: NzModalRef;

  get supportWindowTitle(): string {
    switch (this.activeView) {
      case 'skills-library':
        return '我的库';
      case 'skills-market':
        return 'Skill 广场';
      case 'model-store':
        return '模型广场';
      case 'serial-monitor':
        return '串口';
      default:
        return 'AI';
    }
  }

  get activeSkillView(): SkillPanelViewId | null {
    if (this.activeView === 'skills-market') {
      return 'market';
    }
    if (this.activeView === 'skills-library') {
      return 'library';
    }
    return null;
  }

  constructor(
    private uiService: UiService,
    private modal: NzModalService,
  ) {}

  ngOnInit(): void {
    this.applyState(this.panelState);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['panelState']) {
      this.applyState(this.panelState);
    }
  }

  close(): void {
    this.uiService.closeTool('support-panel');
  }

  setSkillView(view: SkillPanelViewId): void {
    this.activeView = view === 'market' ? 'skills-market' : 'skills-library';
    this.syncState();
  }

  openSkillManager(view: SkillCenterPrimaryView, highlightSkillId?: string | null): void {
    const openComponent = (this.skillCenterModalRef as any)?.getContentComponent?.() as
      | SkillCenterComponent
      | undefined;
    if (openComponent) {
      openComponent.setActiveView(view);
      return;
    }

    const modalRef = this.modal.create({
      nzTitle: null,
      nzFooter: null,
      nzClosable: false,
      nzMaskClosable: true,
      nzZIndex: 1200,
      nzBodyStyle: {
        padding: '0',
        background: 'transparent',
      },
      nzWidth: 'min(1290px, calc(100vw - 112px))',
      nzStyle: {
        top: '26px',
      },
      nzContent: SkillCenterComponent,
      nzData: {
        initialView: view,
        highlightSkillId: highlightSkillId || null,
      },
    });

    this.skillCenterModalRef = modalRef;
    modalRef.afterClose.subscribe(() => {
      if (this.skillCenterModalRef === modalRef) {
        this.skillCenterModalRef = undefined;
      }
    });
  }

  runSkill(skill: DialogueLibrarySkillPreview): void {
    document.dispatchEvent(new CustomEvent('aily-chat-action', {
      detail: {
        action: 'tesseract-dialogue-run-skill',
        data: {
          skillId: skill.skillId,
          displayName: skill.displayName,
          workflowName: skill.workflowName,
          workflowId: skill.workflowId,
          workflow: skill.workflow,
        },
      },
    }));
    this.activeView = 'assistant';
    this.syncState();
  }

  traceSkill(skill: DialogueLibrarySkillPreview): void {
    document.dispatchEvent(new CustomEvent('aily-chat-action', {
      detail: {
        action: 'tesseract-open-history-session',
        data: {
          sessionId: skill.sourceSessionId,
        },
      },
    }));
    this.activeView = 'assistant';
    this.syncState();
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
    this.activeView = 'skills-market';
    this.highlightedSkillId = skill.skillId;
    this.syncState();
  }

  private applyState(state: SupportPanelState | null | undefined): void {
    const resolvedState = state || this.uiService.getSupportPanelState() || {};
    this.activeView = resolvedState.view || 'assistant';
    this.highlightedSkillId = resolvedState.highlightSkillId || null;
  }

  private syncState(): void {
    this.uiService.updateSupportPanelState({
      view: this.activeView,
      highlightSkillId: this.highlightedSkillId,
    });
  }
}
