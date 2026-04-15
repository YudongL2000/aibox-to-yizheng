import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'x-aily-state-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ac-state" [attr.data-state]="data?.state">
      <i [class]="stateIconClass"></i>
      <span class="ac-state-text">{{ data?.text }}</span>
      @if (data?.progress != null) {
        <div class="ac-state-progress">
          <div class="ac-state-bar" [style.width.%]="data.progress"></div>
        </div>
        <span class="ac-state-pct">{{ data.progress }}%</span>
      }
    </div>
  `,
  styles: [
    `
      .ac-state {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-radius: var(--radius-md);
        font-size: 13px;
        margin: 0;
        background-color: var(--surface-panel);
        border: 1px solid var(--border-subtle);
        color: var(--text-primary);
        overflow: hidden;
      }
      .ac-state[data-state='doing'] i {
        color: var(--sem-info);
      }
      .ac-state[data-state='done'] i {
        color: var(--sem-success);
      }
      .ac-state[data-state='warn'] i {
        color: var(--sem-warning);
      }
      .ac-state[data-state='error'] i {
        color: var(--sem-danger);
      }
      .ac-state[data-state='info'] i {
        color: var(--sem-info);
      }
      .ac-state i {
        flex-shrink: 0;
        font-size: 14px;
      }
      .ac-state-text {
        flex: 1;
        width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ac-state-progress {
        width: 80px;
        height: 4px;
        background: var(--surface-elevated);
        border-radius: 2px;
        overflow: hidden;
      }
      .ac-state-bar {
        height: 100%;
        background: var(--sem-info);
        border-radius: 2px;
        transition: width 0.3s;
      }
      .ac-state-pct {
        font-size: 11px;
        color: var(--text-muted);
        min-width: 32px;
        text-align: right;
        font-family: var(--font-mono);
      }
      @keyframes ac-spin {
        to {
          transform: rotate(360deg);
        }
      }
      .ac-spin {
        animation: ac-spin 0.8s linear infinite;
        display: inline-block;
      }
    `,
  ],
})
export class XAilyStateViewerComponent {
  @Input() data: { state?: string; text?: string; progress?: number } | null =
    null;

  get stateIconClass(): string {
    const map: Record<string, string> = {
      doing: 'fa-light fa-spinner-third ac-spin',
      done: 'fa-light fa-circle-check',
      warn: 'fa-light fa-triangle-exclamation',
      error: 'fa-light fa-circle-xmark',
      info: 'fa-light fa-circle-info',
    };
    return map[this.data?.state || ''] || 'fa-light fa-circle-info';
  }
}
