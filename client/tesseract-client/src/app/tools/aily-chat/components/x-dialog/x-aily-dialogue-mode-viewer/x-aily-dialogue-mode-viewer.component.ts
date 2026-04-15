/**
 * [INPUT]: 依赖 CommonModule 与对话模式 card payload。
 * [OUTPUT]: 对外提供 x-aily-dialogue-mode-viewer，自定义渲染 OpenClaw 对话模式卡片并派发动作事件。
 * [POS]: x-dialog 的对话模式可视化块，承载技能唤醒、状态说明、校验 loading 与 CTA。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  DialogueCardAction,
  DialogueCardPayload,
  DialogueWakeupSkill,
} from '../../../services/tesseract-dialogue.models';

@Component({
  selector: 'x-aily-dialogue-mode-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dialogue-card">
      <div class="card-header">
        <div>
          <div class="eyebrow">Tess Skill Repository</div>
          <div class="headline">{{ headline }}</div>
        </div>
        <div class="meta">{{ connectedSummary }}</div>
      </div>

      @if ((data?.skills || []).length > 0) {
        <div class="skill-grid">
          @for (skill of data?.skills || []; track skill.id) {
            <button
              class="skill-card"
              type="button"
              [class.active]="skill.active"
              [class.disabled]="skill.disabled"
              (click)="triggerSkill(skill)"
            >
              <div class="skill-icon">{{ skill.icon || '◉' }}</div>
              <div class="skill-title">{{ skill.title }}</div>
              @if (skill.summary) {
                <div class="skill-summary">{{ skill.summary }}</div>
              }
              <div class="skill-tags">
                @for (tag of hardwareTags(skill); track tag) {
                  <span class="tag" [class.tag-missing]="isMissingHardware(skill, tag)">{{ tag }}</span>
                }
              </div>
              <div class="skill-status" [class.ready]="isSkillReady(skill)" [class.blocked]="!isSkillReady(skill)">
                {{ skillStatusText(skill) }}
              </div>
            </button>
          }
        </div>
      } @else {
        <div class="empty-skills">
          当前 Skills 库里还没有可唤醒的技能。先切到教学模式完成一个技能，再回来对话模式直接唤醒它。
        </div>
      }

      <div class="conversation">
        <div class="bubble agent">
          {{ data?.message || '你好！我是 Tess。' }}
        </div>

        @if (statusText) {
          <div class="status-box">
            <div class="status-label">{{ statusText }}</div>
            @if (showLoadingBar) {
              <div class="loading-track">
                <div class="loading-bar"></div>
              </div>
            }
          </div>
        }
      </div>

      @if (data?.actions?.length) {
        <div class="actions">
          @for (action of data.actions; track action.action + action.text) {
            <button
              class="cta"
              type="button"
              [class.secondary]="action.type !== 'primary'"
              [disabled]="action.disabled"
              (click)="dispatchAction(action)"
            >
              {{ action.text }}
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .dialogue-card {
      display: grid;
      gap: 16px;
      padding: 16px;
      border-radius: 18px;
      border: 1px solid rgba(171, 99, 255, 0.25);
      background:
        radial-gradient(circle at top right, rgba(138, 80, 255, 0.18), transparent 34%),
        linear-gradient(180deg, rgba(20, 20, 28, 0.98), rgba(14, 14, 20, 0.98));
      color: #f3ecff;
      box-shadow: 0 24px 48px rgba(8, 8, 14, 0.35);
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .eyebrow {
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: rgba(222, 203, 255, 0.7);
    }

    .headline {
      margin-top: 6px;
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
    }

    .meta {
      font-size: 12px;
      color: rgba(215, 204, 255, 0.68);
      white-space: nowrap;
    }

    .skill-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(136px, 1fr));
      gap: 12px;
    }

    .skill-card {
      display: grid;
      gap: 10px;
      padding: 14px;
      border-radius: 16px;
      border: 1px solid rgba(176, 110, 255, 0.18);
      background: rgba(24, 22, 34, 0.92);
      color: inherit;
      text-align: left;
      cursor: pointer;
      transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
    }

    .skill-card:hover:not(.disabled) {
      transform: translateY(-1px);
      border-color: rgba(197, 135, 255, 0.45);
      box-shadow: 0 10px 26px rgba(153, 79, 255, 0.18);
    }

    .skill-card.active {
      border-color: rgba(200, 121, 255, 0.72);
      background: linear-gradient(180deg, rgba(43, 30, 64, 0.98), rgba(22, 19, 34, 0.98));
    }

    .skill-card.disabled {
      opacity: 0.55;
      cursor: default;
    }

    .skill-icon {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(171, 99, 255, 0.18);
      color: #d4a8ff;
      font-size: 14px;
      font-weight: 700;
    }

    .skill-title {
      font-size: 15px;
      font-weight: 600;
      color: #ffffff;
    }

    .skill-summary {
      color: rgba(232, 223, 255, 0.78);
      font-size: 12px;
      line-height: 1.55;
    }

    .skill-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .tag {
      padding: 3px 8px;
      border-radius: 999px;
      background: rgba(128, 255, 181, 0.12);
      border: 1px solid rgba(128, 255, 181, 0.18);
      color: #7ef0b1;
      font-size: 11px;
    }

    .tag.tag-missing {
      background: rgba(255, 104, 128, 0.12);
      border-color: rgba(255, 104, 128, 0.18);
      color: #ff8e9e;
    }

    .skill-status {
      margin-top: auto;
      font-size: 12px;
      font-weight: 700;
      color: rgba(232, 223, 255, 0.76);
    }

    .skill-status.ready {
      color: #7ef0b1;
    }

    .skill-status.blocked {
      color: #ff8e9e;
    }

    .conversation {
      display: grid;
      gap: 12px;
    }

    .empty-skills {
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px dashed rgba(171, 99, 255, 0.25);
      background: rgba(24, 22, 34, 0.76);
      color: rgba(232, 221, 255, 0.84);
      line-height: 1.7;
    }

    .bubble {
      max-width: 82%;
      padding: 14px 16px;
      border-radius: 16px;
      line-height: 1.6;
      background: rgba(32, 29, 45, 0.98);
      border: 1px solid rgba(196, 138, 255, 0.14);
      color: #f8f5ff;
    }

    .status-box {
      display: grid;
      gap: 10px;
      padding: 14px 16px;
      border-radius: 14px;
      background: rgba(22, 21, 30, 0.94);
      border: 1px solid rgba(171, 99, 255, 0.16);
    }

    .status-label {
      color: rgba(241, 236, 255, 0.88);
      font-size: 13px;
    }

    .loading-track {
      height: 6px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
    }

    .loading-bar {
      width: 36%;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #8f4dff, #da93ff);
      animation: slide 1.1s ease-in-out infinite;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .cta {
      min-width: 132px;
      padding: 11px 18px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(90deg, #8c45ff, #c65dff);
      color: #ffffff;
      font-weight: 600;
      cursor: pointer;
      transition: transform 160ms ease, opacity 160ms ease;
    }

    .cta.secondary {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.92);
    }

    .cta:hover:not(:disabled) { transform: translateY(-1px); }
    .cta:disabled { opacity: 0.55; cursor: default; }

    @keyframes slide {
      0% { transform: translateX(-120%); }
      100% { transform: translateX(320%); }
    }
  `],
})
export class XAilyDialogueModeViewerComponent {
  @Input() data: DialogueCardPayload | null = null;

  get headline(): string {
    if (this.data?.skill?.displayName) {
      return this.data.skill.displayName;
    }
    if (this.data?.branch === 'teaching_handoff') {
      return '新技能教学接力';
    }
    return 'Tess 对话模式';
  }

  get connectedSummary(): string {
    const count = this.data?.hardware?.connectedComponents?.length || 0;
    return `${count} 个已连接`;
  }

  get statusText(): string {
    if (this.data?.localStatusText) {
      return this.data.localStatusText;
    }
    if (this.data?.deploymentPrompt?.visible) {
      return this.data.deploymentPrompt.message;
    }
    if (this.data?.phase === 'validating_insert') {
      return '正在校验硬件/同步数据...';
    }
    if (this.data?.hardware?.failureReason) {
      return this.data.hardware.failureReason;
    }
    return '';
  }

  get showLoadingBar(): boolean {
    return this.data?.phase === 'validating_insert';
  }

  triggerSkill(skill: DialogueWakeupSkill): void {
    if (skill.disabled || (!skill.prompt && !skill.workflow)) {
      return;
    }

    document.dispatchEvent(new CustomEvent('aily-chat-action', {
      detail: {
        action: skill.action || 'tesseract-dialogue-send-prompt',
        data: skill.payload || {
          prompt: skill.prompt,
        },
      },
    }));
  }

  dispatchAction(action: DialogueCardAction): void {
    document.dispatchEvent(new CustomEvent('aily-chat-action', {
      detail: {
        action: action.action,
        data: action.payload ?? {},
      },
    }));
  }

  hardwareTags(skill: DialogueWakeupSkill): string[] {
    if (Array.isArray(skill.requiredHardware) && skill.requiredHardware.length > 0) {
      return skill.requiredHardware.map((item) => item.displayName || item.componentId).filter(Boolean);
    }
    return skill.tags || [];
  }

  isSkillReady(skill: DialogueWakeupSkill): boolean {
    if (!skill.workflow || Object.keys(skill.workflow).length === 0) {
      return false;
    }
    const requirements = Array.isArray(skill.requiredHardware) ? skill.requiredHardware : [];
    if (requirements.length === 0) {
      return true;
    }
    const connected = new Set((this.data?.hardware?.connectedComponents || []).map((item) => item.componentId));
    return requirements.every((item) => item.isOptional || connected.has(item.componentId));
  }

  isMissingHardware(skill: DialogueWakeupSkill, label: string): boolean {
    const requirements = Array.isArray(skill.requiredHardware) ? skill.requiredHardware : [];
    const requirement = requirements.find((item) => (item.displayName || item.componentId) === label);
    if (!requirement) {
      return false;
    }
    const connected = new Set((this.data?.hardware?.connectedComponents || []).map((item) => item.componentId));
    return !requirement.isOptional && !connected.has(requirement.componentId);
  }

  skillStatusText(skill: DialogueWakeupSkill): string {
    if (!skill.workflow || Object.keys(skill.workflow).length === 0) {
      return '缺失工作流绑定';
    }
    return this.isSkillReady(skill) ? '硬件已就绪，点击后直接进入工作区' : '硬件未齐，点击后进入热插拔/配置';
  }
}
