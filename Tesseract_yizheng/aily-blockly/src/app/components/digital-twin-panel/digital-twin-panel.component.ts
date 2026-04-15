/**
 * [INPUT]: 依赖主窗口 workbench payload、renderer 侧数字孪生状态服务、UiService 与嵌入式 iframe bridge。
 * [OUTPUT]: 对外提供 DigitalTwinPanelComponent，作为单窗口桌面端的数字孪生内容宿主，负责挂载嵌入式 iframe、桥接 payload，并把 Electron 当前 theme 显式带给 Flutter 页面，同时保持外层 chrome 极简，并与 workflow surface 共享同一套基底配色。
 * [POS]: components 层的单窗口数字孪生内容面板，挂载在 main-window 或 tesseract-studio 的 digital-twin surface 内部。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IframeComponent } from '../../windows/iframe/iframe.component';
import {
  AssemblyOrchestratorService,
  AssemblySessionState,
} from '../../services/assembly-orchestrator.service';

@Component({
  selector: 'app-digital-twin-panel',
  imports: [CommonModule, IframeComponent],
  templateUrl: './digital-twin-panel.component.html',
  styleUrl: './digital-twin-panel.component.scss',
})
export class DigitalTwinPanelComponent {
  @Input() panelState?: Record<string, unknown>;

  constructor(
    private readonly assemblyOrchestrator: AssemblyOrchestratorService,
  ) {}

  get frameTitle(): string {
    return this.isAssemblyMode ? '硬件组装检测台' : '数字孪生工作台';
  }

  get frameData(): Record<string, unknown> | AssemblySessionState | undefined {
    if (this.panelState && Object.keys(this.panelState).length > 0) {
      return this.panelState;
    }

    return this.assemblyOrchestrator.session || undefined;
  }

  get iframeUrl(): string {
    if (this.shouldUseFlutterWorkspace) {
      const compatUrl =
        window.electronAPI?.runtimeFlags?.desktopTwinUrl?.trim();
      const url = new URL(
        compatUrl || 'http://127.0.0.1:18082/',
        window.location.href,
      );
      url.searchParams.set('entry', 'digital-twin');
      url.searchParams.set('source', 'aily-blockly');
      url.searchParams.set('theme', this.currentTheme);
      if (this.isAssemblyMode) {
        url.searchParams.set('mode', 'hardware-assembly');
      }
      return url.toString();
    }

    const baseHref =
      window.location.protocol === 'file:'
        ? window.location.href
        : `${window.location.origin}/`;
    const url = new URL('tesseract-digital-twin/index.html', baseHref);
    url.searchParams.set('entry', 'digital-twin');
    url.searchParams.set('source', 'aily-blockly');
    url.searchParams.set('theme', this.currentTheme);
    if (this.isAssemblyMode) {
      url.searchParams.set('mode', 'hardware-assembly');
    }
    return url.toString();
  }

  get currentTheme(): 'light' | 'dark' {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'light' ? 'light' : 'dark';
  }

  get isAssemblyMode(): boolean {
    const mode =
      this.panelState?.['mode'] ?? this.assemblyOrchestrator.session?.mode;
    return mode === 'hardware-assembly';
  }

  get shouldUseFlutterWorkspace(): boolean {
    const mode =
      window.electronAPI?.runtimeFlags?.desktopTwinMode || 'flutter-workspace';
    return mode === 'flutter-workspace';
  }
}
