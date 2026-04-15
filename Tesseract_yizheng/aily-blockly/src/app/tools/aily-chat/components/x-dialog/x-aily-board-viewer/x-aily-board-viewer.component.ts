import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../services/chat.service';
import { ConfigService } from '../../../../../services/config.service';

@Component({
  selector: 'x-aily-board-viewer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ac-card ac-board">
      @if (isLoading) {
        <div class="ac-card-loading">
          <i class="fa-light fa-spinner-third ac-spin"></i> 加载中...
        </div>
      } @else if (boardInfo) {
        <div class="ac-card-header">
          <i class="fa-light fa-microchip-ai ac-card-icon"></i>
          <div class="ac-card-title">
            <strong>{{ boardInfo.nickname || boardInfo.name }}</strong>
            @if (boardInfo.version) {
              <span class="ac-badge">v{{ boardInfo.version }}</span>
            }
          </div>
          @if (boardInfo.brand) {
            <span class="ac-tag">{{ boardInfo.brand }}</span>
          }
        </div>
        @if (boardInfo.description) {
          <p class="ac-card-desc">{{ boardInfo.description }}</p>
        }
        <div class="ac-card-meta">
          <span>📦 {{ boardInfo.name }}</span>
          @if (boardInfo.author) {
            <span>👤 {{ boardInfo.author }}</span>
          }
        </div>
        <div class="ac-card-actions">
          <button class="ac-action-btn" (click)="installBoard()">
            <i class="fa-light fa-download"></i> 安装开发板
          </button>
          @if (boardInfo.url) {
            <button
              class="ac-action-btn ac-action-link"
              (click)="openUrl(boardInfo.url)"
            >
              <i class="fa-light fa-arrow-up-right-from-square"></i> 查看文档
            </button>
          }
        </div>
      } @else {
        <div class="ac-card-err">
          <i class="fa-light fa-triangle-exclamation"></i> 开发板信息加载失败
        </div>
      }
    </div>
  `,
  styles: [
    `
      .ac-card {
        border-radius: var(--radius-base);
        padding: 12px 14px;
        margin: 4px 0;
        background-color: var(--surface-panel);
        color: var(--text-primary);
        min-height: 60px;
        border: 1px solid var(--border-subtle);
      }
      .ac-card:hover {
        background-color: var(--surface-elevated);
      }
      .ac-card-loading {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 50px;
        gap: 10px;
        color: var(--text-muted);
        font-size: 13px;
      }
      .ac-card-err {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 50px;
        color: var(--text-secondary);
        font-size: 13px;
      }
      .ac-card-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      .ac-card-icon {
        font-size: 18px;
        color: var(--sem-info);
        flex-shrink: 0;
      }
      .ac-card-title {
        flex: 1;
        display: flex;
        align-items: baseline;
        gap: 6px;
      }
      .ac-card-title strong {
        font-size: 14px;
        color: var(--text-primary);
      }
      .ac-badge {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: var(--radius-sm);
        background: color-mix(
          in srgb,
          var(--sem-info) 10%,
          var(--surface-panel)
        );
        color: var(--sem-info);
        border: 1px solid color-mix(in srgb, var(--sem-info) 22%, transparent);
        font-family: var(--font-mono);
      }
      .ac-tag {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: var(--radius-sm);
        background: var(--surface-muted);
        color: var(--text-muted);
        border: 1px solid var(--border-subtle);
        font-family: var(--font-mono);
      }
      .ac-card-desc {
        font-size: 12px;
        color: var(--text-secondary);
        margin: 0 0 8px 0;
        line-height: 1.6;
        white-space: break-spaces;
      }
      .ac-card-meta {
        display: flex;
        gap: 12px;
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 8px;
      }
      .ac-card-actions {
        display: flex;
        gap: 6px;
      }
      .ac-action-btn {
        font-size: 12px;
        padding: 6px 12px;
        border-radius: var(--radius-sm);
        cursor: pointer;
        border: 1px solid var(--border-subtle);
        background: var(--surface-muted);
        color: var(--text-primary);
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s;
      }
      .ac-action-btn:hover {
        border-color: var(--text-primary);
        color: var(--text-inverse);
        background: var(--text-primary);
      }
      .ac-action-link {
        background: none;
        border-color: transparent;
        color: var(--sem-info);
      }
      .ac-action-link:hover {
        background: none !important;
        border-color: transparent !important;
        color: var(--text-primary) !important;
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
export class XAilyBoardViewerComponent implements OnInit, OnDestroy, OnChanges {
  @Input() data: { name?: string; board?: { name?: string } } | null = null;

  isLoading = false;
  boardInfo: any = null;
  private retryTimer: any = null;
  private retryCount = 0;
  private readonly MAX_RETRY = 3;

  constructor(
    private cdr: ChangeDetectorRef,
    private chatService: ChatService,
    private configService: ConfigService,
  ) {}

  ngOnInit(): void {
    this.tryLoad();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) this.tryLoad();
  }

  private tryLoad(): void {
    const name = this.data?.name || this.data?.board?.name;
    if (name) this.loadBoardInfo(name);
  }

  ngOnDestroy(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  private loadBoardInfo(name: string): void {
    this.isLoading = true;
    this.boardInfo = this.configService.boardDict?.[name] || null;
    if (this.boardInfo) {
      this.isLoading = false;
      this.retryCount = 0;
    } else {
      this.scheduleRetry(() => this.loadBoardInfo(name));
    }
    this.cdr.markForCheck();
  }

  installBoard(): void {
    if (!this.boardInfo?.name) return;
    this.chatService.sendTextToChat(`安装开发板: ${this.boardInfo.name}`, {
      sender: 'board',
      type: 'install',
      autoSend: true,
    });
  }

  openUrl(url: string): void {
    if (url) window.open(url, '_blank');
  }

  private scheduleRetry(fn: () => void): void {
    if (this.retryCount < this.MAX_RETRY) {
      this.retryCount++;
      this.retryTimer = setTimeout(() => {
        this.retryCount = 0;
        fn();
      }, 300 * this.retryCount);
    } else {
      this.isLoading = false;
      this.retryCount = 0;
      this.cdr.markForCheck();
    }
  }
}
