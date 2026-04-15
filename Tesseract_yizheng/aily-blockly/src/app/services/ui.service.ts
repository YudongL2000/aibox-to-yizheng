/**
 * [INPUT]: 依赖 ElectronService、TerminalService、Router、Modal 与主窗口/子窗口通信桥。
 * [OUTPUT]: 对外提供 UiService、WindowOpts/ToolOpts/ActionState，统一分发工具开关、底部面板与子窗口打开意图。
 * [POS]: app/services 的 UI 编排层，负责把组件意图折成可跨窗口复用的动作与窗口 profile。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */
import { Injectable } from '@angular/core';
import { filter, Subject } from 'rxjs';
import { ElectronService } from './electron.service';
import { TerminalService } from '../tools/terminal/terminal.service';
import { NavigationEnd, Router } from '@angular/router';
import { FeedbackDialogComponent } from '../components/feedback-dialog/feedback-dialog.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ProjectSettingDialogComponent } from '../components/project-setting-dialog/project-setting-dialog.component';
import { HistoryDialogComponent } from '../editors/blockly-editor/components/history-dialog/history-dialog.component';
import { AuthService } from './auth.service';

export type WorkbenchPanelId =
  | 'support-panel'
  | 'aily-chat'
  | 'digital-twin'
  | 'model-store'
  | 'serial-monitor';

export type WorkbenchSurfaceId = 'workflow' | 'digital-twin';
export type SkillPanelViewId = 'library' | 'market';
export type SupportPanelViewId =
  | 'assistant'
  | 'skills-library'
  | 'skills-market'
  | 'model-store'
  | 'serial-monitor';

export interface SupportPanelState {
  view?: SupportPanelViewId;
  highlightSkillId?: string | null;
}

export type ModalId =
  | 'project-new'
  | 'settings'
  | 'history'
  | 'about'
  | 'project-settings'
  | 'feedback';

@Injectable({
  providedIn: 'root',
})
export class UiService {
  private readonly supportPanelAliases = new Set([
    'support-panel',
    'aily-chat',
    'model-store',
    'serial-monitor',
  ]);
  private readonly workbenchPayloadMap = new Map<WorkbenchPanelId, unknown>();

  // 用来控制窗口和工具的显示和隐藏
  actionSubject = new Subject();

  // 用来更新footer右下角的状态
  stateSubject = new Subject<ActionState>();

  // 用来记录当前已打开的工具
  openToolList: string[] = [];

  // 用来获取当前最上层的工具
  get topTool() {
    return this.openToolList[this.openToolList.length - 1] || null;
  }

  // 用来记录terminal是否打开
  terminalIsOpen = false;
  // 当前选中的底部面板tab
  currentBottomTab = '';
  theme = 'dark';
  isMainWindow = false;

  get isSingleWindowUi(): boolean {
    const mode = window.electronAPI?.runtimeFlags?.desktopUiMode || 'single-window';
    return mode === 'single-window';
  }


  constructor(
    private electronService: ElectronService,
    private terminalService: TerminalService,
    private router: Router,
    private modal: NzModalService,
    private authService: AuthService
  ) { }


  // 初始化UI服务，这个init函数仅供main-window使用
  init(): void {
    if (this.electronService.isElectron) {
      this.isMainWindow = true;
      window['ipcRenderer'].on('window-go-main', (event, toolName) => {
        this.openTool(toolName);
      });

      window['ipcRenderer'].on('window-receive', async (event, message) => {
        console.log('window-receive', message);
        let data;
        if (message.data?.action === 'logout') {
          // 处理登出请求
          try {
            await this.authService.logout();
            data = { success: true };
          } catch (error) {
            console.error('登出失败:', error);
            data = { success: false, error: error.message };
          }
        }
        // if (message.data.action == 'open-terminal') {
        //   data = await this.openTerminal();
        //   // console.log('open-terminal', pid);
        // } else if (message.data.action == 'close-terminal') {
        //   this.closeTerminal();
        // } else {
        //   return;
        // }
        // 反馈完成结果
        if (message.messageId) {
          window['ipcRenderer'].send('main-window-response', {
            messageId: message.messageId,
            result: "success",
            data,
          });
        }
      });
    }

  }

  openWindow(opt: WindowOpts) {
    window['subWindow'].open(opt);
  }

  // 这个方法是给header用的
  turnTool(opt: ToolOpts) {
    const supportState = this.resolveSupportPanelState(opt.data);
    if (supportState) {
      if (this.isToolOpen(opt.data)) {
        this.closeTool('support-panel');
      } else {
        this.openSupportPanel(supportState);
      }
      return;
    }

    if (this.topTool == opt.data) {
      this.closeTool(opt.data);
    } else {
      this.openTool(opt.data);
    }
  }

  // 如果其它组件/程序要打开工具，调用这个方法
  openTool(name: string, payload?: unknown) {
    const supportState = this.resolveSupportPanelState(name, payload);
    if (supportState) {
      this.openSupportPanel(supportState);
      return;
    }

    if (payload !== undefined) {
      this.workbenchPayloadMap.set(name as WorkbenchPanelId, payload);
    }

    // if (name == 'terminal') {
    //   this.openTerminal();
    //   return;
    // }
    this.openToolList = this.openToolList.filter((e) => e !== name);
    this.openToolList.push(name);
    this.actionSubject.next({ action: 'open', type: 'tool', data: name });
  }

  // 如果其它组件/程序要关闭工具，调用这个方法
  closeTool(name: string) {
    if (this.supportPanelAliases.has(name)) {
      name = 'support-panel';
    }
    if (name == 'terminal') {
      this.closeTerminal();
      return;
    }
    this.openToolList = this.openToolList.filter((e) => e !== name);
    this.actionSubject.next({ action: 'close', type: 'tool', data: name });
  }

  closeToolAll() {
    this.openToolList.forEach((name) => {
      this.closeTool(name);
    });
    this.openToolList = [];
  }

  // 发送工具信号，格式为 "toolname:action"，如 "serial-monitor:disconnect"
  sendToolSignal(signal: string) {
    this.actionSubject.next({ action: 'signal', type: 'tool', data: signal });
  }

  // 判断某个工具是否打开
  isToolOpen(name: string): boolean {
    if (name === 'support-panel') {
      return this.openToolList.includes('support-panel');
    }

    if (this.supportPanelAliases.has(name)) {
      const supportState = this.getSupportPanelState();
      if (!this.openToolList.includes('support-panel') || !supportState) {
        return false;
      }

      if (name === 'aily-chat') {
        return supportState.view === 'assistant';
      }
      if (name === 'model-store') {
        return supportState.view === 'model-store';
      }
      if (name === 'serial-monitor') {
        return supportState.view === 'serial-monitor';
      }
    }

    return this.openToolList.includes(name);
  }

  turnBottomSider(data = 'default') {
    if (this.terminalIsOpen && this.currentBottomTab === data) {
      // 如果底部面板已经打开且当前选中的就是要打开的tab，则关闭面板
      this.closeTerminal();
    } else if (this.terminalIsOpen) {
      // 如果底部面板已经打开但选中的不是要打开的tab，则切换到指定的tab
      this.switchBottomSiderTab(data);
    } else {
      // 如果底部面板未打开，则打开面板并显示指定的组件
      this.openBottomSider(data);
    }
  }

  // 切换底部面板的tab
  switchBottomSiderTab(data: string) {
    this.currentBottomTab = data;
    if (this.isMainWindow) {
      this.actionSubject.next({ action: 'switch-tab', type: 'bottom-sider', data });
    } else {
      window['iWindow'].send({ to: 'main', data: { action: 'switch-terminal-tab', tab: data } });
    }
  }

  async openBottomSider(data = 'default'): Promise<{ pid: number }> {
    return new Promise(async (resolve, reject) => {
      this.currentBottomTab = data;
      if (this.isMainWindow) {
        this.actionSubject.next({ action: 'open', type: 'bottom-sider', data });
        this.terminalIsOpen = true;
        const intervalId = setInterval(() => {
          if (this.terminalService.currentPid) {
            clearInterval(intervalId);
            resolve({ pid: this.terminalService.currentPid });
          }
        }, 100);
      } else {
        // 其它窗口调用
        let { pid } = await window['iWindow'].send({ to: 'main', data: { action: 'open-terminal' } });
        // console.log('open-terminal', pid);
        resolve({ pid });
      }
    });
  }

  closeTerminal() {
    if (this.isMainWindow) {
      this.actionSubject.next({ action: 'close', type: 'bottom-sider' });
      this.terminalIsOpen = false;
      this.currentBottomTab = '';
    } else {
      window['iWindow'].send({ to: 'main', data: { action: 'close-terminal' } });
    }
  }

  // 更新footer右下角的状态
  updateFooterState(state: ActionState) {
    // 判断当前url是否是main-window
    if (this.isMainWindow) {
      this.stateSubject.next(state);
    } else {
      window['ipcRenderer'].send('state-update', state);
    }
  }

  // 关闭当前窗口
  closeWindow() {
    window['iWindow'].close();
  }


  openFeedback() {
    const modalRef = this.modal.create({
      nzTitle: null,
      nzFooter: null,
      nzClosable: false,
      nzBodyStyle: {
        padding: '0',
      },
      nzContent: FeedbackDialogComponent,
      nzWidth: '520px',
    });

    // 处理反馈结果
    modalRef.afterClose.subscribe(result => {
      if (result?.result === 'success') {
        console.log('反馈已提交:', result.data);
      }
    });
  }

  openHistory() {
    const modalRef = this.modal.create({
      nzTitle: null,
      nzFooter: null,
      nzClosable: false,
      nzBodyStyle: {
        padding: '0',
      },
      nzContent: HistoryDialogComponent,
      nzWidth: '520px',
    });

    // 处理反馈结果
    // modalRef.afterClose.subscribe(result => {
    //   if (result?.result === 'success') {
    //     console.log('反馈已提交:', result.data);
    //   }
    // });
  }

  openProjectSettings() {
    // 这里参考 USAGE_EXAMPLE.ts 中的代码实现
    const modalRef = this.modal.create({
      nzTitle: null,
      nzFooter: null,
      nzClosable: false,
      nzBodyStyle: {
        padding: '0',
      },
      nzContent: ProjectSettingDialogComponent,
      nzWidth: '520px',
    });

    // 处理反馈结果
    modalRef.afterClose.subscribe(result => {
      if (result?.result === 'success') {
        console.log('反馈已提交:', result.data);
      }
    });
  }

  getActiveWorkbenchSurface(): WorkbenchSurfaceId {
    const queryParams = this.router.parseUrl(this.router.url).queryParams;
    const surface = String(queryParams['surface'] || '').trim();
    if (surface === 'digital-twin' || surface === 'workflow') {
      return surface;
    }

    const workflowId = String(queryParams['workflowId'] || '').trim();
    if (workflowId) {
      return 'workflow';
    }

    const projectPath = String(queryParams['path'] || '').trim();
    return projectPath ? 'digital-twin' : 'workflow';
  }

  openWorkbenchSurface(surface: WorkbenchSurfaceId) {
    const currentQueryParams = this.router.parseUrl(this.router.url).queryParams;
    const queryParams: Record<string, unknown> = {
      surface,
    };

    const projectPath = String(currentQueryParams['path'] || '').trim();
    const workflowId = String(currentQueryParams['workflowId'] || '').trim();

    if (projectPath) {
      queryParams['path'] = projectPath;
    }
    if (workflowId) {
      queryParams['workflowId'] = workflowId;
    }

    return this.router.navigate(['/main/tesseract-studio'], { queryParams });
  }

  openWorkbenchPanel(panelId: WorkbenchPanelId, payload?: unknown) {
    if (payload !== undefined) {
      this.workbenchPayloadMap.set(panelId, payload);
    }

    if (panelId === 'digital-twin') {
      void this.openWorkbenchSurface('digital-twin');
      return;
    }

    this.openTool(panelId, payload);
  }

  openSupportPanel(state?: Partial<SupportPanelState>) {
    const nextState = this.normalizeSupportPanelState(state);
    this.workbenchPayloadMap.set('support-panel', nextState);
    this.openToolList = this.openToolList.filter((item) => item !== 'support-panel');
    this.openToolList.push('support-panel');
    this.actionSubject.next({ action: 'open', type: 'tool', data: 'support-panel' });
  }

  updateSupportPanelState(state: Partial<SupportPanelState>) {
    const currentState = this.getSupportPanelState();
    this.workbenchPayloadMap.set('support-panel', this.normalizeSupportPanelState({
      ...currentState,
      ...state,
    }));
  }

  getSupportPanelState(): SupportPanelState | undefined {
    return this.getWorkbenchPayload<SupportPanelState>('support-panel');
  }

  getWorkbenchPayload<T = unknown>(panelId: WorkbenchPanelId): T | undefined {
    return this.workbenchPayloadMap.get(panelId) as T | undefined;
  }

  openModal(modalId: ModalId): void {
    switch (modalId) {
      case 'project-new':
        void this.router.navigate(['/main/project-new']);
        break;
      case 'settings':
        this.openWindow({
          path: 'settings',
          title: 'settings',
          width: 1120,
          height: 760,
        });
        break;
      case 'history':
        this.openHistory();
        break;
      case 'about':
        this.openWindow({
          path: 'about',
          title: 'about',
          width: 720,
          height: 560,
        });
        break;
      case 'project-settings':
        this.openProjectSettings();
        break;
      case 'feedback':
        this.openFeedback();
        break;
      default:
        break;
    }
  }

  private resolveSupportPanelState(name: string, payload?: unknown): SupportPanelState | null {
    const customState = this.asSupportPanelState(payload);
    switch (name) {
      case 'support-panel':
        return this.normalizeSupportPanelState(customState || {});
      case 'aily-chat':
        return this.normalizeSupportPanelState({
          ...customState,
          view: 'assistant',
        });
      case 'model-store':
        return this.normalizeSupportPanelState({
          ...customState,
          view: 'model-store',
        });
      case 'serial-monitor':
        return this.normalizeSupportPanelState({
          ...customState,
          view: 'serial-monitor',
        });
      default:
        return null;
    }
  }

  private normalizeSupportPanelState(state?: Partial<SupportPanelState>): SupportPanelState {
    return {
      view: state?.view || 'assistant',
      highlightSkillId: state?.highlightSkillId || null,
    };
  }

  private asSupportPanelState(payload?: unknown): Partial<SupportPanelState> | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    return payload as Partial<SupportPanelState>;
  }
}

export interface WindowOpts {
  path: string;
  data?: any;
  title?: string;
  alwaysOnTop?: boolean;
  keepAboveMain?: boolean;
  windowRole?: string;
  width?: number;
  height?: number;
}

export interface ToolOpts {
  type: string;
  data: string;
  title?: string;
}

export interface ActionState {
  text: string;
  desc?: string;
  state?: 'done' | 'doing' | 'error' | 'warn' | 'loading' | string,
  color?: string;
  icon?: string;
  timeout?: number;
}
