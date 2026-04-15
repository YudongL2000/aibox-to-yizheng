/**
 * [INPUT]: 依赖 CommonModule、NzButtonModule 与 ChatService，并消费 aily-button payload。
 * [OUTPUT]: 对外提供 x-aily-button-viewer，渲染低圆角 wireframe 操作按钮，并为真实硬件端口确认补齐接口选择。
 * [POS]: x-dialog 的通用动作入口，负责把按钮点击折叠成统一的 `aily-chat-action` 事件。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../services/chat.service';
import { NzButtonModule } from 'ng-zorro-antd/button';

interface ButtonData {
  text: string;
  action: string;
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  size?: 'small' | 'default' | 'large';
  danger?: boolean;
  payload?: any;
}

interface PortOption {
  label: string;
  value: string;
}

@Component({
  selector: 'x-aily-button-viewer',
  standalone: true,
  imports: [CommonModule, NzButtonModule],
  template: `
    @if (!isHistory && buttons.length) {
      <div class="ac-btns">
        @for (btn of buttons; track btn.action || $index) {
          <div class="ac-btn-wrap">
            @if (isHotplugButton(btn)) {
              <div class="port-picker">
                <div class="port-picker__title">
                  {{ btn.payload?.portSelectionTitle || '选择接口' }}
                </div>
                <div class="port-picker__grid">
                  @for (port of getPortOptions(btn); track port.value) {
                    <button
                      class="port-chip"
                      type="button"
                      [class.active]="getSelectedPort(btn) === port.value"
                      [disabled]="isDisabled || btn.disabled"
                      (click)="selectPort(btn, port.value)"
                    >
                      {{ port.label }}
                    </button>
                  }
                </div>
              </div>
            }

            <button
              class="ac-btn"
              nz-button
              [nzType]="btn.type"
              [attr.data-type]="btn.type"
              [disabled]="isDisabled || btn.disabled"
              [nzSize]="btn.size"
              [nzDanger]="btn.danger"
              (click)="onButtonClick(btn)"
            >
              @if (btn.icon) {
                <i class="fa-light" [class]="btn.icon"></i>
              }
              {{ btn.text }}
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .ac-btns {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 2px 0;
      }
      .ac-btn-wrap {
        display: grid;
        gap: 10px;
      }
      .ac-btn {
        align-items: center;
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
        border-color: var(--border-subtle);
        background: var(--surface-muted);
        color: var(--text-primary);

        > i {
          margin-right: 6px;
        }
      }
      .ac-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color: var(--text-primary);
        background: var(--text-primary);
        color: var(--text-inverse);
      }
      .ac-btn:active:not(:disabled) {
        transform: translateY(0);
      }
      .ac-btn[data-type='primary'] {
        background: var(--accent);
        border-color: var(--accent);
        color: var(--text-inverse);
      }
      .ac-btn[data-type='primary']:hover:not(:disabled) {
        background: var(--text-primary);
        border-color: var(--text-primary);
        color: var(--text-inverse);
      }
      .ac-btn[data-type='dashed'] {
        border-style: dashed;
      }
      .ac-btn[data-type='link'] {
        border: none;
        background: none;
        color: var(--accent);
        padding: 4px 6px;
        min-width: auto;
        height: auto;
      }
      .ac-btn[data-type='link']:hover {
        color: var(--text-primary);
        transform: none;
        box-shadow: none;
        background: none;
      }
      .ac-btn[data-type='text'] {
        border: none;
        background: none;
        min-width: auto;
        height: auto;
      }
      .ac-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .port-picker {
        display: grid;
        gap: 10px;
        min-width: min(100%, 340px);
        padding: 12px;
        border-radius: var(--radius-base);
        background: var(--surface-overlay);
        border: 1px solid var(--border-subtle);
      }

      .port-picker__title {
        font-size: 12px;
        color: var(--text-muted);
        font-family: var(--font-mono);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .port-picker__grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .port-chip {
        border: 1px solid var(--border-subtle);
        background: var(--surface-muted);
        color: var(--text-primary);
        border-radius: var(--radius-sm);
        padding: 8px 10px;
        text-align: left;
        cursor: pointer;
        transition:
          border-color 0.2s ease,
          background 0.2s ease,
          transform 0.2s ease;
      }

      .port-chip:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color: color-mix(in srgb, var(--accent) 34%, transparent);
      }

      .port-chip.active {
        background: color-mix(in srgb, var(--accent) 12%, var(--surface-panel));
        border-color: color-mix(in srgb, var(--accent) 42%, transparent);
        color: var(--text-primary);
      }
    `,
  ],
})
export class XAilyButtonViewerComponent implements OnChanges {
  @Input() data: any = null;

  buttons: ButtonData[] = [];
  isDisabled = false;
  isHistory = false;
  private readonly hotplugSelections = new Map<string, string>();

  constructor(private chatService: ChatService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) this.processData();
  }

  private processData(): void {
    if (!this.data) {
      this.buttons = [];
      return;
    }
    this.isHistory = this.data.isHistory === true;
    try {
      const buttonsData = this.data.buttons ?? this.data;
      if (Array.isArray(buttonsData)) {
        this.buttons = buttonsData.map((b: any) => this.normalizeButton(b));
      } else if (typeof buttonsData === 'object') {
        this.buttons = [this.normalizeButton(buttonsData)];
      } else {
        this.buttons = [];
      }
    } catch {
      this.buttons = [];
    }
  }

  private normalizeButton(b: any): ButtonData {
    return {
      text: b.text ?? b.label ?? '按钮',
      action: b.action ?? b.command ?? b.value ?? '',
      type: b.type ?? 'primary',
      icon: b.icon,
      disabled: b.disabled,
      loading: b.loading,
      size: b.size ?? 'default',
      danger: b.danger ?? false,
      payload: b.payload ?? null,
    };
  }

  isHotplugButton(btn: ButtonData): boolean {
    return (
      btn.action === 'tesseract-confirm-node' &&
      this.getPortOptions(btn).length > 0
    );
  }

  getPortOptions(btn: ButtonData): PortOption[] {
    const options = btn.payload?.portOptions;
    if (!Array.isArray(options)) {
      return [];
    }
    return options
      .filter((option: any) => option && typeof option.value === 'string')
      .map((option: any) => ({
        label:
          typeof option.label === 'string' && option.label.trim().length > 0
            ? option.label
            : option.value,
        value: option.value,
      }));
  }

  getSelectedPort(btn: ButtonData): string {
    const key = this.getButtonKey(btn);
    if (this.hotplugSelections.has(key)) {
      return this.hotplugSelections.get(key) as string;
    }
    const initial = btn.payload?.selectedPortId;
    if (typeof initial === 'string' && initial.length > 0) {
      return initial;
    }
    return this.getPortOptions(btn)[0]?.value || '';
  }

  selectPort(btn: ButtonData, portId: string): void {
    if (!portId) {
      return;
    }
    this.hotplugSelections.set(this.getButtonKey(btn), portId);
  }

  onButtonClick(btn: ButtonData): void {
    if (btn.action?.startsWith('tesseract-')) {
      const payload = this.buildActionPayload(btn);
      document.dispatchEvent(
        new CustomEvent('aily-chat-action', {
          detail: {
            action: btn.action,
            data: payload,
          },
        }),
      );
      return;
    }
    this.chatService.sendTextToChat(btn.text, {
      sender: 'button',
      type: 'button',
      cover: false,
    });
  }

  private buildActionPayload(btn: ButtonData): Record<string, unknown> {
    const payload =
      btn.payload && typeof btn.payload === 'object'
        ? { ...btn.payload }
        : { ...btn };
    if (!this.isHotplugButton(btn)) {
      return payload;
    }

    const selectedPortId = this.getSelectedPort(btn);
    return {
      ...payload,
      portId: selectedPortId,
      topology: selectedPortId,
    };
  }

  private getButtonKey(btn: ButtonData): string {
    return [
      btn.action || '',
      btn.payload?.sessionId || '',
      btn.payload?.nodeName || btn.payload?.componentId || btn.text || '',
    ].join(':');
  }
}
