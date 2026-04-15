import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'x-aily-task-action-viewer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ac-task" [attr.data-type]="data?.actionType">
      <div class="ac-task-header">
        <i class="fa-light" [class]="taskIconClass"></i>
        <span class="ac-task-label">{{ taskLabel }}</span>
      </div>
      @if (data?.message) {
        <p class="ac-task-msg">{{ data.message }}</p>
      }
      @if (!actionTaken && !data?.isHistory) {
        <div class="ac-task-btns">
          @if (data?.actionType === 'max_messages') {
            <button
              class="ac-btn"
              data-type="primary"
              (click)="taskAction('continue')"
            >
              继续对话
            </button>
            <button class="ac-btn" (click)="taskAction('newChat')">
              新建对话
            </button>
          } @else if (
            data?.actionType === 'error' || data?.actionType === 'timeout'
          ) {
            <button
              class="ac-btn"
              data-type="primary"
              (click)="taskAction('retry')"
            >
              重试
            </button>
            <button class="ac-btn" (click)="taskAction('newChat')">
              新建对话
            </button>
          } @else {
            <button
              class="ac-btn"
              data-type="primary"
              (click)="taskAction('continue')"
            >
              继续
            </button>
          }
          <button class="ac-btn ac-btn-ghost" (click)="taskAction('dismiss')">
            关闭
          </button>
        </div>
      } @else if (actionTaken) {
        <span class="ac-task-done">{{ actionTakenText }}</span>
      }
    </div>
  `,
  styles: [
    `
      .ac-task {
        border-radius: var(--radius-base);
        padding: 12px 16px;
        margin: 8px 0;
        background-color: var(--surface-panel);
        border: 1px solid var(--border-subtle);
        color: var(--text-primary);
        overflow: hidden;
      }
      .ac-task[data-type='error'] {
        border-color: color-mix(in srgb, var(--sem-danger) 24%, transparent);
      }
      .ac-task[data-type='timeout'] {
        border-color: color-mix(in srgb, var(--sem-warning) 24%, transparent);
      }
      .ac-task-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 0 12px 0;
        border-bottom: none;
      }
      .ac-task-label {
        font-size: 13px;
        color: var(--text-primary);
        font-weight: 600;
      }
      .ac-task-msg {
        padding: 0 0 12px 0;
        margin: 0;
        font-size: 13px;
        color: var(--text-secondary);
        line-height: 1.5;
      }
      .ac-task-btns {
        display: flex;
        gap: 8px;
        padding-left: 34px;
        flex-wrap: wrap;
      }
      .ac-task-done {
        display: block;
        padding: 4px 0 0 34px;
        font-size: 12px;
        color: var(--text-muted);
      }
      .ac-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: var(--radius-sm);
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid var(--border-subtle);
        outline: none;
        transition: all 0.2s ease;
      }
      .ac-btn[data-type='primary'] {
        background-color: var(--accent);
        border-color: var(--accent);
        color: var(--text-inverse);
      }
      .ac-btn[data-type='primary']:hover:not(:disabled) {
        background-color: var(--text-primary);
        border-color: var(--text-primary);
      }
      .ac-btn:not([data-type='primary']):not(.ac-btn-ghost) {
        background-color: var(--surface-muted);
        color: var(--text-primary);
        border: 1px solid var(--border-subtle);
      }
      .ac-btn:not([data-type='primary']):not(.ac-btn-ghost):hover {
        background-color: var(--surface-elevated);
        border-color: var(--text-primary);
      }
      .ac-btn-ghost {
        background-color: transparent;
        color: var(--text-muted);
        padding: 6px 8px;
      }
      .ac-btn-ghost:hover {
        color: var(--text-primary);
        background-color: var(--surface-muted);
      }
      .ac-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
})
export class XAilyTaskActionViewerComponent {
  @Input() data: {
    actionType?: string;
    message?: string;
    isHistory?: boolean;
  } | null = null;

  actionTaken = false;
  actionTakenText = '';

  constructor(private cdr: ChangeDetectorRef) {}

  get taskIconClass(): string {
    const map: Record<string, string> = {
      max_messages: 'fa-message-exclamation',
      error: 'fa-circle-exclamation',
      timeout: 'fa-clock-rotate-left',
    };
    return map[this.data?.actionType || ''] || 'fa-circle-info';
  }

  get taskLabel(): string {
    const map: Record<string, string> = {
      max_messages: '消息数已达上限',
      error: '任务执行错误',
      timeout: '任务超时',
    };
    return map[this.data?.actionType || ''] || '任务操作';
  }

  taskAction(action: string): void {
    if (this.actionTaken) return;
    this.actionTaken = true;
    const labels: Record<string, string> = {
      continue: '正在继续...',
      retry: '正在重试...',
      newChat: '正在创建新会话...',
      dismiss: '已关闭',
    };
    this.actionTakenText = labels[action] || '处理中...';
    this.cdr.markForCheck();

    document.dispatchEvent(
      new CustomEvent('aily-task-action', {
        bubbles: true,
        detail: { action, data: this.data },
      }),
    );
  }
}
