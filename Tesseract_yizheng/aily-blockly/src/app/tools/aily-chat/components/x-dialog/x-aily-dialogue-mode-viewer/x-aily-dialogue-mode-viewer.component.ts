/**
 * [INPUT]: 依赖 CommonModule 与对话模式 card payload。
 * [OUTPUT]: 对外提供 x-aily-dialogue-mode-viewer，自定义渲染 OpenClaw 对话模式卡片并派发动作事件，并统一成低圆角矩形对话卡。
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
                  <span
                    class="tag"
                    [class.tag-missing]="isMissingHardware(skill, tag)"
                    >{{ tag }}</span
                  >
                }
              </div>
              <div
                class="skill-status"
                [class.ready]="isSkillReady(skill)"
                [class.blocked]="!isSkillReady(skill)"
              >
                {{ skillStatusText(skill) }}
              </div>
            </button>
          }
        </div>
      } @else {
        <div class="empty-skills">
          当前 Skills
          库里还没有可唤醒的技能。先切到教学模式完成一个技能，再回来对话模式直接唤醒它。
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
  styles: [
    `
      .dialogue-card {
        display: grid;
        gap: 16px;
        padding: 16px;
        border-radius: var(--radius-base);
        border: 1px solid
          color-mix(in srgb, var(--accent) 24%, var(--border-subtle));
        background: color-mix(in srgb, var(--accent) 8%, var(--surface-panel));
        color: var(--text-primary);
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
        color: var(--accent);
        font-family: var(--font-mono);
      }

      .headline {
        margin-top: 6px;
        font-size: 22px;
        font-weight: 700;
        color: var(--text-primary);
      }

      .meta {
        font-size: 12px;
        color: var(--text-muted);
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
        border-radius: var(--radius-sm);
        border: 1px solid var(--border-subtle);
        background: var(--surface-muted);
        color: inherit;
        text-align: left;
        cursor: pointer;
        transition:
          transform 160ms ease,
          border-color 160ms ease,
          box-shadow 160ms ease;
      }

      .skill-card:hover:not(.disabled) {
        transform: translateY(-1px);
        border-color: color-mix(in srgb, var(--accent) 34%, transparent);
      }

      .skill-card.active {
        border-color: color-mix(in srgb, var(--accent) 42%, transparent);
        background: color-mix(in srgb, var(--accent) 12%, var(--surface-panel));
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
        background: color-mix(in srgb, var(--accent) 14%, transparent);
        color: var(--accent);
        font-size: 14px;
        font-weight: 700;
      }

      .skill-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .skill-summary {
        color: var(--text-secondary);
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
        border-radius: var(--radius-sm);
        background: color-mix(
          in srgb,
          var(--sem-success) 10%,
          var(--surface-panel)
        );
        border: 1px solid
          color-mix(in srgb, var(--sem-success) 22%, transparent);
        color: var(--sem-success);
        font-size: 11px;
        font-family: var(--font-mono);
      }

      .tag.tag-missing {
        background: color-mix(
          in srgb,
          var(--sem-danger) 10%,
          var(--surface-panel)
        );
        border-color: color-mix(in srgb, var(--sem-danger) 22%, transparent);
        color: var(--sem-danger);
      }

      .skill-status {
        margin-top: auto;
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
      }

      .skill-status.ready {
        color: var(--sem-success);
      }

      .skill-status.blocked {
        color: var(--sem-danger);
      }

      .conversation {
        display: grid;
        gap: 12px;
      }

      .empty-skills {
        padding: 14px 16px;
        border-radius: var(--radius-sm);
        border: 1px dashed color-mix(in srgb, var(--accent) 24%, transparent);
        background: var(--surface-muted);
        color: var(--text-secondary);
        line-height: 1.7;
      }

      .bubble {
        max-width: 82%;
        padding: 14px 16px;
        border-radius: var(--radius-sm);
        line-height: 1.6;
        background: var(--surface-muted);
        border: 1px solid var(--border-subtle);
        color: var(--text-primary);
      }

      .status-box {
        display: grid;
        gap: 10px;
        padding: 14px 16px;
        border-radius: var(--radius-sm);
        background: var(--surface-overlay);
        border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
      }

      .status-label {
        color: var(--text-primary);
        font-size: 13px;
      }

      .loading-track {
        height: 6px;
        overflow: hidden;
        border-radius: var(--radius-sm);
        background: var(--surface-elevated);
      }

      .loading-bar {
        width: 36%;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--accent), var(--sem-info));
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
        border: 1px solid color-mix(in srgb, var(--accent) 36%, transparent);
        border-radius: var(--radius-sm);
        background: var(--accent);
        color: var(--text-inverse);
        font-weight: 600;
        cursor: pointer;
        transition:
          transform 160ms ease,
          opacity 160ms ease;
      }

      .cta.secondary {
        background: var(--surface-muted);
        border: 1px solid var(--border-subtle);
        color: var(--text-primary);
      }

      .cta:hover:not(:disabled) {
        transform: translateY(-1px);
      }
      .cta:disabled {
        opacity: 0.55;
        cursor: default;
      }

      @keyframes slide {
        0% {
          transform: translateX(-120%);
        }
        100% {
          transform: translateX(320%);
        }
      }
    `,
  ],
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

    document.dispatchEvent(
      new CustomEvent('aily-chat-action', {
        detail: {
          action: skill.action || 'tesseract-dialogue-send-prompt',
          data: skill.payload || {
            prompt: skill.prompt,
          },
        },
      }),
    );
  }

  dispatchAction(action: DialogueCardAction): void {
    document.dispatchEvent(
      new CustomEvent('aily-chat-action', {
        detail: {
          action: action.action,
          data: action.payload ?? {},
        },
      }),
    );
  }

  hardwareTags(skill: DialogueWakeupSkill): string[] {
    if (
      Array.isArray(skill.requiredHardware) &&
      skill.requiredHardware.length > 0
    ) {
      return skill.requiredHardware
        .map((item) => item.displayName || item.componentId)
        .filter(Boolean);
    }
    return skill.tags || [];
  }

  isSkillReady(skill: DialogueWakeupSkill): boolean {
    if (!skill.workflow || Object.keys(skill.workflow).length === 0) {
      return false;
    }
    const requirements = Array.isArray(skill.requiredHardware)
      ? skill.requiredHardware
      : [];
    if (requirements.length === 0) {
      return true;
    }
    const connected = new Set(
      (this.data?.hardware?.connectedComponents || []).map(
        (item) => item.componentId,
      ),
    );
    return requirements.every(
      (item) => item.isOptional || connected.has(item.componentId),
    );
  }

  isMissingHardware(skill: DialogueWakeupSkill, label: string): boolean {
    const requirements = Array.isArray(skill.requiredHardware)
      ? skill.requiredHardware
      : [];
    const requirement = requirements.find(
      (item) => (item.displayName || item.componentId) === label,
    );
    if (!requirement) {
      return false;
    }
    const connected = new Set(
      (this.data?.hardware?.connectedComponents || []).map(
        (item) => item.componentId,
      ),
    );
    return !requirement.isOptional && !connected.has(requirement.componentId);
  }

  skillStatusText(skill: DialogueWakeupSkill): string {
    if (!skill.workflow || Object.keys(skill.workflow).length === 0) {
      return '缺失工作流绑定';
    }
    return this.isSkillReady(skill)
      ? '硬件已就绪，点击后直接进入工作区'
      : '硬件未齐，点击后进入热插拔/配置';
  }
}
