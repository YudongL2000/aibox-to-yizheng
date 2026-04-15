import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'x-aily-think-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ac-think" [class.expanded]="thinkExpanded">
      <div class="ac-think-header" (click)="thinkExpanded = !thinkExpanded">
        @if (data?.isComplete) {
          <i class="fa-light fa-circle-check ac-think-icon done"></i>
        } @else {
          <i
            class="fa-duotone fa-solid fa-loader ac-think-icon loading ac-spin"
          ></i>
        }
        <span>{{ data?.isComplete ? 'Think' : 'Thinking...' }}</span>
        <i class="fa-light fa-chevron-down ac-think-arrow"></i>
      </div>
      @if (thinkExpanded) {
        <div class="ac-think-body" #thinkBody>{{ thinkContent }}</div>
      }
    </div>
  `,
  styles: [
    `
      .ac-think {
        border-radius: var(--radius-md);
        padding: 10px 12px;
        margin: 0;
        overflow: hidden;
        background-color: var(--surface-panel);
        color: var(--text-primary);
        border: 1px solid var(--border-subtle);
      }
      .ac-think-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0;
        cursor: pointer;
        font-size: 12px;
        user-select: none;
        transition: background 0.2s;
        font-family: var(--font-mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .ac-think-header:hover {
        background: var(--surface-muted);
        margin: -10px -12px;
        padding: 10px 12px;
      }
      .ac-think-icon {
        flex-shrink: 0;
        margin-right: 5px;
      }
      .ac-think-icon.loading {
        color: var(--sem-info);
      }
      .ac-think-icon.done {
        color: var(--sem-success);
      }
      .ac-think-arrow {
        margin-left: auto;
        font-size: 10px;
        color: var(--text-muted);
        transition: transform 0.2s;
      }
      .ac-think.expanded .ac-think-arrow {
        transform: rotate(180deg);
      }
      .ac-think-body {
        padding: 8px 2px;
        margin: 5px -10px 0 0;
        font-size: 12px;
        line-height: 1.6;
        color: var(--text-secondary);
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 200px;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--border-subtle) transparent;
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
export class XAilyThinkViewerComponent implements AfterViewChecked, OnChanges {
  @Input() data: {
    content?: string;
    encoded?: boolean;
    isComplete?: boolean;
  } | null = null;
  @ViewChild('thinkBody') thinkBodyRef?: ElementRef<HTMLElement>;

  thinkContent = '';
  thinkExpanded = false;
  private shouldScrollThink = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      if (!this.data) return;
      let raw = this.data.content || '';
      if (this.data.encoded) {
        try {
          raw = decodeURIComponent(atob(raw));
        } catch {
          /* ignore */
        }
      }
      const prev = this.thinkContent;
      this.thinkContent = raw;
      if (raw.length > prev.length) this.shouldScrollThink = true;
      this.thinkExpanded = !this.data.isComplete;
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollThink && this.thinkBodyRef?.nativeElement) {
      const el = this.thinkBodyRef.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScrollThink = false;
    }
  }
}
