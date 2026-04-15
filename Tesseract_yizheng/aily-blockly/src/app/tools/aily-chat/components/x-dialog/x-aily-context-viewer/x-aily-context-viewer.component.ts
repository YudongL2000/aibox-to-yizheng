import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'x-aily-context-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ac-context">
      <div class="ac-context-header">
        <i class="fa-light fa-file-code"></i>
        <span>{{ data?.label || '代码上下文' }}</span>
      </div>
      <pre class="ac-context-body"><code>{{ content }}</code></pre>
    </div>
  `,
  styles: [
    `
      .ac-context {
        border-radius: var(--radius-md);
        padding: 10px 12px;
        background-color: color-mix(
          in srgb,
          var(--sem-warning) 10%,
          var(--surface-panel)
        );
        border: 1px solid
          color-mix(in srgb, var(--sem-warning) 22%, transparent);
        color: var(--text-primary);
        overflow: hidden;
        margin: 4px 0;
      }
      .ac-context-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0;
        font-size: 12px;
        color: var(--sem-warning);
        font-family: var(--font-mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .ac-context-header i {
        font-size: 13px;
        flex-shrink: 0;
      }
      .ac-context-body {
        margin: 8px 0 0 0;
        padding: 0;
        font-size: 12px;
        line-height: 1.6;
        overflow-x: auto;
        color: var(--text-secondary);
        max-height: 200px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: var(--font-mono);
      }
    `,
  ],
})
export class XAilyContextViewerComponent {
  @Input() data: {
    label?: string;
    content?: string;
    encoded?: boolean;
  } | null = null;

  get content(): string {
    if (!this.data?.content) return '';
    if (this.data.encoded) {
      try {
        return decodeURIComponent(atob(this.data.content));
      } catch {
        try {
          return atob(this.data.content);
        } catch {
          return this.data.content;
        }
      }
    }
    return this.data.content;
  }
}
