import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'x-aily-blockly-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ac-blockly">
      @if (data?.title) {
        <div class="ac-blockly-header">
          <i class="fa-light fa-puzzle-piece"></i>
          <span>{{ data.title }}</span>
        </div>
      }
      @if (data?.blocks?.length) {
        <div class="ac-blockly-chips">
          @for (blk of data.blocks; track blk.id ?? blk.type ?? $index) {
            <span class="ac-chip">
              {{ blk.type }}
              @if (blk.pin != null) {
                <em>Pin:{{ blk.pin }}</em>
              }
              @if (blk.time != null) {
                <em>{{ blk.time }}ms</em>
              }
            </span>
          }
        </div>
      }
      @if (data?.code) {
        <pre class="ac-blockly-code"><code>{{ data.code }}</code></pre>
      }
    </div>
  `,
  styles: [
    `
      .ac-blockly {
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-base);
        margin: 12px 0;
        overflow: hidden;
        background: var(--surface-panel);
      }
      .ac-blockly:hover {
        background: var(--surface-elevated);
      }
      .ac-blockly-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 12px;
        border-bottom: 1px dashed var(--border-subtle);
        font-size: 12px;
        font-weight: 700;
        color: var(--text-primary);
        font-family: var(--font-mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .ac-blockly-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        padding: 8px 12px;
      }
      .ac-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        background: color-mix(
          in srgb,
          var(--sem-info) 10%,
          var(--surface-panel)
        );
        border: 1px solid color-mix(in srgb, var(--sem-info) 24%, transparent);
        font-size: 11px;
        color: var(--sem-info);
      }
      .ac-chip em {
        font-style: normal;
        color: var(--text-muted);
        font-size: 10px;
      }
      .ac-blockly-code {
        margin: 0;
        padding: 12px;
        font-size: 12px;
        line-height: 1.4;
        overflow-x: auto;
        background: var(--surface-overlay);
        color: var(--text-secondary);
        border-top: 1px dashed var(--border-subtle);
        font-family: var(--font-mono);
        border-radius: 0;
      }
    `,
  ],
})
export class XAilyBlocklyViewerComponent {
  @Input() data: {
    title?: string;
    blocks?: Array<{ id: string; type: string; pin?: number; time?: number }>;
    code?: string;
  } | null = null;
}
