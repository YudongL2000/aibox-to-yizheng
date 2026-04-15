/**
 * [INPUT]: 依赖 UiService 的底部面板状态总线、硬件运行时快照与 footer 配置按钮。
 * [OUTPUT]: 对外提供 FooterComponent，渲染常驻底部 launcher，并把日志/终端/硬件连接映射到底部面板切换。
 * [POS]: main-window/components/footer 的底栏入口层，负责在主窗口最底部暴露轻量入口与状态摘要。
 * [PROTOCOL]: 变更时更新父级 main-window/AGENTS.md
 */

import { Component, ChangeDetectorRef } from '@angular/core';
import { ActionState, UiService } from '../../../services/ui.service';
import { FOOTER_BTNS, IMenuItem } from '../../../configs/menu.config';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { AsyncPipe, NgClass } from '@angular/common';
import { HardwareRuntimeService, HardwareRuntimeSnapshot } from '../../../services/hardware-runtime.service';

@Component({
  selector: 'app-footer',
  imports: [NzToolTipModule, AsyncPipe, NgClass],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  actionData: ActionState | null;
  timer;

  FOOTER_BTNS = FOOTER_BTNS;

  get hardwareRuntimeStatus$() {
    return this.hardwareRuntimeService.status$;
  }

  constructor(
    private uiService: UiService,
    private cd: ChangeDetectorRef,
    private hardwareRuntimeService: HardwareRuntimeService
  ) {
    this.uiService.stateSubject.subscribe((state: ActionState) => {
      this.changeState(state);
    });
    // 其他窗口通过electron侧改变主窗口状态
    window['ipcRenderer'].on('state-update', (event, state: ActionState) => {
      this.changeState(state);
    });
  }

  changeState(e: ActionState) {
    this.actionData = e;
    this.cd.detectChanges();
    // 默认超时设置10秒, warn 和 error 不超时 
    if (!this.actionData.timeout && this.actionData.state === 'loading' || this.actionData.state === 'done') {
      this.actionData.timeout = 10000;
    }
    if (this.actionData.timeout) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.actionData = null;
        this.cd.detectChanges();
      }, this.actionData.timeout);
    }
  }

  async process(item: IMenuItem) {
    switch (item.action) {
      case 'log-open':
        this.uiService.turnBottomSider('log');
        break;
      case 'terminal-open':
        this.uiService.turnBottomSider('terminal');
        break;
      case 'hardware-open':
        this.uiService.turnBottomSider('hardware');
        break;
      default:
        console.log('未处理的操作:', item.action);
        break;
    }
  }

  isButtonActive(item: IMenuItem): boolean {
    switch (item.action) {
      case 'log-open':
        return this.uiService.terminalIsOpen && this.uiService.currentBottomTab === 'log';
      case 'terminal-open':
        return this.uiService.terminalIsOpen && this.uiService.currentBottomTab === 'terminal';
      case 'hardware-open':
        return this.uiService.terminalIsOpen && this.uiService.currentBottomTab === 'hardware';
      default:
        return false;
    }
  }

  getHardwareTone(snapshot: HardwareRuntimeSnapshot | null): 'healthy' | 'warning' | 'danger' {
    const state = String(snapshot?.hardware?.connectionState ?? snapshot?.transportState ?? 'connecting')
      .trim()
      .toLowerCase();
    if (state === 'connected') {
      return 'healthy';
    }
    if (state === 'error' || state === 'disconnected') {
      return 'danger';
    }
    return 'warning';
  }
}
