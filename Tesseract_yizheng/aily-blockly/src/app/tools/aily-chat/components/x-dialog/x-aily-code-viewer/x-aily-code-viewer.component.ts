import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'x-aily-code-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (block) {
      <pre><code [class]="'language-' + lang" [innerHTML]="children"></code></pre>
    } @else {
      <code [innerHTML]="children"></code>
    }
  `,
  styles: [
    `
      pre {
        margin: 0;
        border-radius: var(--radius-md);
        overflow-x: auto;
        background: var(--surface-overlay);
        padding: 12px;
        border: 1px solid var(--border-subtle);
        scrollbar-width: thin !important;
        scrollbar-color: var(--border-subtle) transparent;
      }
      pre code {
        font-size: 12px;
        line-height: 1.4;
        color: var(--text-secondary);
        font-family: var(--font-mono);
      }
      code {
        font-size: 12px;
        color: var(--sem-warning);
        padding: 0;
        border-radius: var(--radius-sm);
      }
    `,
  ],
})
export class XAilyCodeViewerComponent {
  @Input() children: string = '';
  @Input() block: boolean = false;
  @Input() lang: string = '';
}
