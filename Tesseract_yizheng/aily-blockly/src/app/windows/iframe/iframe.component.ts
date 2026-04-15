/**
 * [INPUT]: 依赖 Angular 路由参数、Electron 子窗口初始化数据、Penpal 窗口通信、ConnectionGraphService 的桥接能力，以及 DialogueHardwareBridgeService 与 HardwareRuntimeService 的硬件状态，并消费数字孪生子页 ready-handshake。
 * [OUTPUT]: 对外提供 IframeComponent 子窗口承载器，负责展示外部页面并按需建立数据桥，同时在数字孪生场景下重放当前 scene，在硬件组装模式下转发组件需求与桥接状态、接收完成通知并直接执行端侧 workflow upload/stop 且回传真实 receipt 状态；组装 checklist 现在保留 workflow 显式要求的 speaker/microphone，避免“只剩音频设备”时检测台被错误判成空清单。在预览模式下继续将 MQTT 心跳设备映射为常驻的 mic/speaker/camera preview session 注入 Flutter 面板，并中继设备控制命令（麦克风/扬声器）到 Electron IPC，并使用更长加载窗容纳 Flutter Web DDC 启动；同 revision 的数字孪生硬刷新会重开 bootstrap grace，避免宿主 5 秒重试与 Flutter DDC fallback 互相打断；iframe 首帧 load/ready 触发的 loading/empty UI 状态改为异步提交，避免 Angular dev-mode 初次检查抛出 NG0100。
 * [POS]: windows/iframe 的通用嵌入窗口，被侧边栏工具、连线图与数字孪生入口复用，是“页面承载”和“数据桥接”之间的薄层。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { Component, ElementRef, Inject, Input, NgZone, OnChanges, OnDestroy, OnInit, Optional, SimpleChanges, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { ActivatedRoute } from '@angular/router';
import { ElectronService } from '../../services/electron.service';
import { ConnectionGraphService } from '../../services/connection-graph.service';
import { SubWindowComponent } from '../../components/sub-window/sub-window.component';
import { CommonModule } from '@angular/common';
import { WindowMessenger, connect, Connection } from 'penpal';
import { ProgressEvent } from '../../services/background-agent.service';
import { Subscription } from 'rxjs';
import {
  DialogueHardwareBridgeService,
} from '../../tools/aily-chat/services/dialogue-hardware-bridge.service';
import {
  HardwareRuntimeService,
  HardwareRuntimeHeartbeatDevice,
} from '../../services/hardware-runtime.service';
import { combineLatest, startWith } from 'rxjs';
import { DesktopDigitalTwinStateService } from '../../services/desktop-digital-twin-state.service';
import { AssemblyOrchestratorService } from '../../services/assembly-orchestrator.service';

const FRAME_LOAD_TIMEOUT_MS = 30000;
const DIGITAL_TWIN_FRAME_LOAD_TIMEOUT_MS = 120000;
const DIGITAL_TWIN_REPLAY_CHECK_MS = 5000;
const DIGITAL_TWIN_BOOTSTRAP_GRACE_MS = 20000;
const DIGITAL_TWIN_FLUTTER_WORKSPACE_BOOTSTRAP_GRACE_MS = 45000;
const PENPAL_CONNECT_TIMEOUT_MS = 10000;

export interface IframeModalData {
  /** 要加载的 iframe URL */
  url: string;
  /** 传递给 iframe 页面的数据 */
  data?: unknown;
  /** 窗口标题 */
  title?: string;
}

@Component({
  selector: 'app-iframe',
  imports: [SubWindowComponent, CommonModule],
  templateUrl: './iframe.component.html',
  styleUrl: './iframe.component.scss'
})
export class IframeComponent implements OnInit, OnDestroy, OnChanges {
  @Input() iframeUrl = '';
  @Input() frameData: unknown;
  @Input() frameTitle = '';
  @Input() embeddedMode = false;
  @Input() enableDigitalTwinBridge = false;
  @Input() showWindowChrome = true;
  @Input() sandboxPolicy = '';
  @Input() referrerPolicy = 'no-referrer';
  @ViewChild('embeddedFrame') embeddedFrame?: ElementRef<HTMLIFrameElement>;

  iframeSrc: SafeResourceUrl = '';
  private iframeUrlRaw = '';
  private iframeData: unknown;
  isDigitalTwinWindow = false;
  private allowedOrigins: string[] = ['*'];
  private loadTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private frameUiStateCommitId: ReturnType<typeof setTimeout> | null = null;
  private frameLoaded = false;

  // Penpal 连接
  private penpalConnection: Connection | null = null;
  private remoteApi: any = null;

  // IPC 初始化数据清理函数
  private initDataCleanup: (() => void) | null = null;

  // IPC 监听器清理函数
  private ipcCleanup: (() => void) | null = null;
  private digitalTwinIpcCleanup: (() => void) | null = null;
  private digitalTwinPreviewIpcCleanup: (() => void) | null = null;
  private digitalTwinReadyCleanup: (() => void) | null = null;
  private digitalTwinServiceSceneCleanup: (() => void) | null = null;
  private digitalTwinServicePreviewCleanup: (() => void) | null = null;
  private lastDigitalTwinEnvelopeSummary: Record<string, unknown> | null = null;
  private lastDigitalTwinPreviewEnvelopeSummary: Record<string, unknown> | null = null;
  private lastPushedDigitalTwinRevision = 0;
  private lastConsumedDigitalTwinRevision = 0;
  private digitalTwinReplayTimer: ReturnType<typeof setTimeout> | null = null;
  private digitalTwinReplayAttempts = 0;
  private digitalTwinReplayRevision = 0;
  private digitalTwinFirstPushAt = 0;
  private digitalTwinChildReady = false;

  // 窗口标题
  windowTitle = '';

  // 无数据状态显示控制
  showEmptyState = false;
  // Loading 状态显示控制
  isLoading = true;
  // 文件更新提示
  hasUpdate = false;

  // ===== 连线图自动生成相关 =====
  /** 是否为连线图窗口 */
  isConnectionGraphWindow = false;
  /** 是否正在生成中 */
  isGenerating = false;
  /** 当前通知文本 */
  noticeText = '';
  /** 当前通知状态: doing / done / error */
  noticeState: 'doing' | 'done' | 'error' | '' = '';
  /** 进度 IPC 监听清理函数 */
  private progressIpcCleanup: (() => void) | null = null;
  /** 自动隐藏通知的定时器 */
  private noticeTimer: any = null;

  // 016-twin-assembly-checklist: 组装模式桥接
  private assemblyBridgeSubscription: Subscription | null = null;
  private assemblyRequirementsSent = false;
  private assemblyCompletionForwarded = false;
  private activeAssemblyRelayKey = '';

  // 018-twin-preview-device-control: 设备预览状态注入 + 控制中继
  private previewStateSubscription: Subscription | null = null;
  private deviceControlLastAction = new Map<string, number>();
  private static readonly DEVICE_CONTROL_DEBOUNCE_MS = 300;

  constructor(
    @Optional() @Inject(NZ_MODAL_DATA) public data: IframeModalData | null,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private electronService: ElectronService,
    private connectionGraphService: ConnectionGraphService,
    private ngZone: NgZone,
    private dialogueHardwareBridgeService: DialogueHardwareBridgeService,
    private hardwareRuntimeService: HardwareRuntimeService,
    private desktopDigitalTwinState: DesktopDigitalTwinStateService,
    private assemblyOrchestrator: AssemblyOrchestratorService,
  ) {
    // 如果是从 modal 打开，使用 modal data
    if (this.data) {
      if (this.data.url) {
        this.setIframeUrl(this.data.url);
      }
      if (this.data.data !== undefined) {
        this.iframeData = this.data.data;
      }
      if (this.data.title) {
        this.windowTitle = this.data.title;
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['frameTitle'] && this.frameTitle) {
      this.windowTitle = this.frameTitle;
    }

    if (changes['frameData'] && changes['frameData'].currentValue !== undefined) {
      this.iframeData = this.frameData;
      this.handleDigitalTwinFrameDataChange();
      if (this.frameLoaded) {
        void this.pushDataToRemote();
      }
    }

    if (changes['iframeUrl'] && this.iframeUrl) {
      this.setIframeUrl(this.iframeUrl);
    }
  }

  ngOnInit() {
    if (this.embeddedMode) {
      if (this.frameTitle) {
        this.windowTitle = this.frameTitle;
      }
      if (this.frameData !== undefined) {
        this.iframeData = this.frameData;
      }
      if (this.iframeUrl) {
        this.setIframeUrl(this.iframeUrl);
      }
    } else if (!this.data) {
      // 如果不是 modal 模式，从 URL 查询参数读取
      this.route.queryParams.subscribe(params => {
        const url = params['url'];
        if (url) {
          this.setIframeUrl(url);
        }

        // 检测生成模式
        const mode = params['mode'];
        if (mode === 'generating') {
          this.isGenerating = true;
          this.safeUpdateNotice('正在准备生成连线图...', 'doing');
          this.startProgressIpcListener();
        }

        const filePath = params['filePath'];
        if (filePath && this.electronService.isElectron) {
          try {
            if (this.electronService.exists(filePath)) {
              const content = this.electronService.readFile(filePath);
              this.iframeData = JSON.parse(content);
            } else {
              console.error('文件不存在:', filePath);
            }
          } catch (error) {
            console.error('读取文件失败:', error);
          }
        }
      });

      // 监听来自 openWindow 的 IPC 初始化数据
      if (this.electronService.isElectron && window['subWindow']?.onInitData) {
        this.initDataCleanup = window['subWindow'].onInitData((initData: any) => {
          this.handleInitData(initData);
        });
      }
    }

    this.startDigitalTwinSceneListener();
    this.startDigitalTwinPreviewStateListener();
    this.startDigitalTwinReadyListener();
  }

  /**
   * 处理来自 openWindow 传递的 IPC 初始化数据
   */
  private handleInitData(initData: any): void {
    console.log('[IframeComponent] handleInitData received:', initData ? 'has data' : 'null');
    if (!initData) return;

    if (initData.title) {
      this.windowTitle = initData.title;
    }

    if (initData.url) {
      this.setIframeUrl(initData.url);
    }

    if (Object.prototype.hasOwnProperty.call(initData, 'data')) {
      this.iframeData = initData.data;
    }
    console.log('[IframeComponent] iframeData set:', this.iframeData ? JSON.stringify(this.iframeData).slice(0, 300) + '...' : 'null');

    if (this.frameLoaded && this.shouldConnectBridge() && !this.penpalConnection && this.embeddedFrame?.nativeElement?.contentWindow) {
      void this.setupPenpalConnection(this.embeddedFrame.nativeElement);
    }

    // 如果 penpal 连接已建立且有数据，立即推送给子页面
    this.pushDataToRemote();
    if (this.frameLoaded) {
      void this.syncCurrentDigitalTwinScene();
      void this.syncCurrentDigitalTwinPreviewState();
    }
  }

  /**
   * iframe 加载完成后，使用 penpal 建立连接
   */
  onIframeLoad(event: Event): void {
    const iframe = event.target as HTMLIFrameElement;
    if (!iframe.contentWindow) {
      this.handleLoadError();
      return;
    }

    console.info('[IframeComponent] iframe load event fired', {
      url: this.iframeUrlRaw,
      isDigitalTwinWindow: this.isDigitalTwinWindow,
    });

    this.frameLoaded = true;
    this.markFrameLoaded();
    void this.syncCurrentDigitalTwinScene();
    void this.syncCurrentDigitalTwinPreviewState();

    if (!this.shouldConnectBridge()) {
      return;
    }

    // 销毁旧连接，避免连接残留
    if (this.penpalConnection) {
      this.penpalConnection.destroy();
      this.penpalConnection = null;
      this.remoteApi = null;
    }

    void this.setupPenpalConnection(iframe);
  }

  /**
   * 使用 penpal 建立与 iframe 的双向通信
   */
  private async setupPenpalConnection(iframe: HTMLIFrameElement): Promise<void> {
    try {
      const messenger = new WindowMessenger({
        remoteWindow: iframe.contentWindow!,
        allowedOrigins: this.allowedOrigins,
      });

      // 父窗口暴露给子页面的方法
      this.penpalConnection = connect({
        messenger,
        timeout: PENPAL_CONNECT_TIMEOUT_MS,
        methods: {
          // 子页面调用此方法获取数据
          getData: () => {
            return this.iframeData ?? null;
          },
          // 子页面编辑连线后回调此方法，持久化更新
          onConnectionsChanged: (connections: any) => {
            try {
              if (connections && Array.isArray(connections)) {
                // 获取当前 payload 数据（包含 componentConfigs, components, connections）
                const currentPayload = this.iframeData as any;
                if (currentPayload && currentPayload.components) {
                  // 通过 IPC 让主窗口保存数据（子窗口无法直接访问 projectPath）
                  if (this.electronService.isElectron && window['ipcRenderer']) {
                    const updatedData = {
                      version: '1.0.0',
                      description: '',
                      components: currentPayload.components,
                      connections: connections,
                    };
                    window['ipcRenderer'].send('save-connection-graph', updatedData);
                    // 同步本地 iframeData（payload 格式）
                    this.iframeData = {
                      ...currentPayload,
                      connections: connections,
                    };
                    console.log('[IframeComponent] 已发送保存请求:', connections.length);
                  }
                }
              }
            } catch (e) {
              console.warn('onConnectionsChanged 持久化失败:', e);
            }
          },
        },
      });

      const remote = await this.penpalConnection.promise;
      this.remoteApi = remote;

      // 将 remote API 注册到 ConnectionGraphService，供 Agent 工具推送数据
      this.connectionGraphService.setIframeApi(remote);

      // 如果有数据，主动推送给子页面
      this.pushDataToRemote();

      // 开始监听 IPC 通知
      this.startIpcListener();
    } catch (error) {
      console.error('Penpal 连接失败:', error);
      this.penpalConnection?.destroy();
      this.penpalConnection = null;
      this.remoteApi = null;
    }
  }

  /**
   * 推送数据给已连接的子页面（penpal 方式）
   */
  private async pushDataToRemote(): Promise<void> {
    console.log('[IframeComponent] pushDataToRemote called, hasRemoteApi:', !!this.remoteApi, 'hasData:', !!this.iframeData);
    if (!this.remoteApi || !this.iframeData) return;
    try {
      if (typeof this.remoteApi['receiveData'] === 'function') {
        console.log('[IframeComponent] calling remoteApi.receiveData...');
        await (this.remoteApi['receiveData'] as (data: unknown) => Promise<void>)(this.iframeData);
        console.log('[IframeComponent] receiveData completed');
      }
    } catch (error) {
      console.warn('推送数据给子页面失败:', error);
    }
  }

  /**
   * 处理加载错误
   */
  handleLoadError(): void {
    this.clearLoadTimeout();
    this.scheduleFrameUiStateCommit(false, true);
    console.warn('[IframeComponent] iframe load error', {
      url: this.iframeUrlRaw,
      isDigitalTwinWindow: this.isDigitalTwinWindow,
    });
  }

  /**
   * 调用子页面暴露的远程方法
   */
  async callRemote(method: string, ...args: any[]): Promise<any> {
    if (!this.remoteApi || typeof this.remoteApi[method] !== 'function') {
      console.warn(`远程方法 ${method} 不可用`);
      return null;
    }
    return this.remoteApi[method](...args);
  }

  ngOnDestroy(): void {
    this.clearLoadTimeout();
    this.clearPendingFrameUiStateCommit();
    this.clearDigitalTwinReplayTimer();
    // 清除 ConnectionGraphService 中的 iframe API 引用
    this.connectionGraphService.clearIframeApi();
    if (this.penpalConnection) {
      this.penpalConnection.destroy();
      this.penpalConnection = null;
    }
    if (this.initDataCleanup) {
      this.initDataCleanup();
      this.initDataCleanup = null;
    }
    // 停止 IPC 监听
    this.stopIpcListener();
    this.stopDigitalTwinSceneListener();
    this.stopDigitalTwinPreviewStateListener();
    this.stopDigitalTwinReadyListener();
    this.stopProgressIpcListener();
    this.stopAssemblyBridgeRelay();
    this.desktopDigitalTwinState.setVisibility(false);
  }

  // =====================================================
  // IPC 监听相关
  // =====================================================

  /**
   * 开始监听连线图更新 IPC 通知
   */
  private startIpcListener(): void {
    if (!this.electronService.isElectron || !window['ipcRenderer']) return;

    console.log('[IframeComponent] 开始监听 IPC connection-graph-updated');

    const handler = (_event: any, data: any) => {
      console.log('[IframeComponent] 收到 IPC connection-graph-updated');
      this.ngZone.run(() => {
        this.handleConnectionGraphUpdate(data);
      });
    };

    window['ipcRenderer'].on('connection-graph-updated', handler);

    // 保存清理函数
    this.ipcCleanup = () => {
      window['ipcRenderer'].removeListener('connection-graph-updated', handler);
    };
  }

  private startDigitalTwinSceneListener(): void {
    if (!this.isDigitalTwinWindow) {
      this.stopDigitalTwinSceneListener();
      return;
    }

    this.stopDigitalTwinSceneListener();
    if (this.shouldUseRendererDigitalTwinState()) {
      const subscription = this.desktopDigitalTwinState.scene$.subscribe((scene) => {
        this.ngZone.run(() => {
          this.lastDigitalTwinEnvelopeSummary = this.summarizeDigitalTwinEnvelope(scene);
          this.pushDigitalTwinSceneToFrame(scene ?? null);
        });
      });
      this.digitalTwinServiceSceneCleanup = () => subscription.unsubscribe();
      return;
    }

    if (!window['electronAPI']?.digitalTwin?.onSceneUpdated) {
      return;
    }

    this.digitalTwinIpcCleanup = window['electronAPI'].digitalTwin.onSceneUpdated((scene: unknown) => {
      this.ngZone.run(() => {
        this.lastDigitalTwinEnvelopeSummary = this.summarizeDigitalTwinEnvelope(scene);
        console.info('[IframeComponent][DigitalTwin] received scene envelope from electron', this.lastDigitalTwinEnvelopeSummary);
        this.pushDigitalTwinSceneToFrame(scene ?? null);
      });
    });
  }

  private startDigitalTwinPreviewStateListener(): void {
    if (!this.isDigitalTwinWindow) {
      this.stopDigitalTwinPreviewStateListener();
      return;
    }

    this.stopDigitalTwinPreviewStateListener();
    if (this.shouldUseRendererDigitalTwinState()) {
      const subscription = this.desktopDigitalTwinState.previewState$.subscribe((previewState) => {
        this.ngZone.run(() => {
          this.lastDigitalTwinPreviewEnvelopeSummary = this.summarizeDigitalTwinPreviewEnvelope(previewState);
          this.pushDigitalTwinPreviewStateToFrame(previewState ?? null);
        });
      });
      this.digitalTwinServicePreviewCleanup = () => subscription.unsubscribe();
      return;
    }

    if (!window['electronAPI']?.digitalTwin?.onPreviewStateUpdated) {
      return;
    }

    this.digitalTwinPreviewIpcCleanup = window['electronAPI'].digitalTwin.onPreviewStateUpdated((previewState: unknown) => {
      this.ngZone.run(() => {
        this.lastDigitalTwinPreviewEnvelopeSummary = this.summarizeDigitalTwinPreviewEnvelope(previewState);
        console.info('[IframeComponent][DigitalTwin] received preview-state envelope from electron', this.lastDigitalTwinPreviewEnvelopeSummary);
        this.pushDigitalTwinPreviewStateToFrame(previewState ?? null);
      });
    });
  }

  private stopDigitalTwinSceneListener(): void {
    if (this.digitalTwinServiceSceneCleanup) {
      this.digitalTwinServiceSceneCleanup();
      this.digitalTwinServiceSceneCleanup = null;
    }
    if (this.digitalTwinIpcCleanup) {
      this.digitalTwinIpcCleanup();
      this.digitalTwinIpcCleanup = null;
    }
  }

  private stopDigitalTwinPreviewStateListener(): void {
    if (this.digitalTwinServicePreviewCleanup) {
      this.digitalTwinServicePreviewCleanup();
      this.digitalTwinServicePreviewCleanup = null;
    }
    if (this.digitalTwinPreviewIpcCleanup) {
      this.digitalTwinPreviewIpcCleanup();
      this.digitalTwinPreviewIpcCleanup = null;
    }
  }

  private startDigitalTwinReadyListener(): void {
    this.stopDigitalTwinReadyListener();
    if (!this.isDigitalTwinWindow) {
      return;
    }

    const handler = (event: MessageEvent) => {
      const iframeWindow = this.embeddedFrame?.nativeElement?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) {
        return;
      }

      const payload = this.normalizeWindowMessagePayload(event.data);
      const messageType = payload?.['type'];
      if (
        !payload
        || (
          messageType !== 'tesseract-digital-twin-ready'
          && messageType !== 'tesseract-digital-twin-consumed'
          && messageType !== 'tesseract-digital-twin-viewer-ready'
          && messageType !== 'tesseract-digital-twin-preview-state'
          && messageType !== 'tesseract-digital-twin-model-click'
          && messageType !== 'tesseract-digital-twin-top-control'
          && messageType !== 'tesseract-digital-twin-control'
          && messageType !== 'tesseract-digital-twin-workflow-action'
          && messageType !== 'tesseract-digital-twin-preview-session'
          && messageType !== 'tesseract-assembly-workflow-action'
          && messageType !== 'tesseract-assembly-complete'
        )
      ) {
        if (typeof messageType === 'string' && this.isDigitalTwinPreviewMessageType(messageType)) {
          this.forwardDigitalTwinPreviewState(payload);
        }
        return;
      }

      if (messageType === 'tesseract-assembly-workflow-action') {
        this.digitalTwinChildReady = true;
        this.assemblyOrchestrator.handleWorkflowAction(payload);
        this.handleAssemblyWorkflowActionFromTwin(payload);
        return;
      }

      if (messageType === 'tesseract-digital-twin-workflow-action') {
        this.digitalTwinChildReady = true;
        this.handleDigitalTwinWorkflowActionFromTwin(payload);
        return;
      }

      // 016-twin-assembly-checklist: 组装完成通知转发
      if (messageType === 'tesseract-assembly-complete') {
        this.digitalTwinChildReady = true;
        this.assemblyOrchestrator.completeSession(payload);
        this.handleAssemblyCompleteFromTwin(payload);
        return;
      }

      if (messageType === 'tesseract-digital-twin-consumed') {
        this.digitalTwinChildReady = true;
        this.markFrameLoaded();
        const revision = Number(payload['revision'] ?? 0);
        this.lastConsumedDigitalTwinRevision = revision;
        this.clearDigitalTwinReplayTimer();
        if (this.shouldUseRendererDigitalTwinState()) {
          this.desktopDigitalTwinState.handleConsumedAck(payload);
        }
        console.info('[IframeComponent][DigitalTwin] child consumed scene', {
          ...payload,
          expected: this.lastDigitalTwinEnvelopeSummary,
        });
        return;
      }

      if (messageType === 'tesseract-digital-twin-viewer-ready') {
        this.digitalTwinChildReady = true;
        this.markFrameLoaded();
        if (this.shouldUseRendererDigitalTwinState()) {
          this.desktopDigitalTwinState.handleViewerReady(payload);
        }
        console.info('[IframeComponent][DigitalTwin] embedded viewer ready', {
          ...payload,
          expected: this.lastDigitalTwinEnvelopeSummary,
        });
        this.startAssemblyBridgeRelay();
        this.startPreviewStateRelay();
        return;
      }

      if (
        messageType === 'tesseract-digital-twin-preview-state'
        || messageType === 'tesseract-digital-twin-model-click'
        || messageType === 'tesseract-digital-twin-preview-session'
      ) {
        this.digitalTwinChildReady = true;
        if (this.shouldUseRendererDigitalTwinState()) {
          this.desktopDigitalTwinState.handleViewerEvent(payload);
        }
        this.forwardDigitalTwinPreviewState(payload);
        return;
      }

      // 018: 拦截顶栏按钮控制 → 触发 MQTT 命令 + 同时转发
      if (
        messageType === 'tesseract-digital-twin-top-control'
        || messageType === 'tesseract-digital-twin-control'
      ) {
        this.digitalTwinChildReady = true;
        if (this.shouldUseRendererDigitalTwinState()) {
          this.desktopDigitalTwinState.handleViewerEvent(payload);
        }
        this.handleDeviceControlFromTwin(payload);
        this.forwardDigitalTwinPreviewState(payload);
        return;
      }

      console.info('[IframeComponent][DigitalTwin] child ready, replaying latest canonical scene', payload);
      this.digitalTwinChildReady = true;
      this.markFrameLoaded();
      if (this.shouldUseRendererDigitalTwinState()) {
        this.desktopDigitalTwinState.handleViewerReady(payload);
      }
      void this.syncCurrentDigitalTwinScene();
      this.startAssemblyBridgeRelay();
      this.startPreviewStateRelay();
    };

    window.addEventListener('message', handler);
    this.digitalTwinReadyCleanup = () => {
      window.removeEventListener('message', handler);
    };
  }

  private stopDigitalTwinReadyListener(): void {
    if (this.digitalTwinReadyCleanup) {
      this.digitalTwinReadyCleanup();
      this.digitalTwinReadyCleanup = null;
    }
  }

  // =========================================================================
  // 016-twin-assembly-checklist: 组装模式桥接转发
  // =========================================================================

  private startAssemblyBridgeRelay(): void {
    const windowData = this.iframeData as Record<string, unknown> | null;
    if (!windowData || windowData['mode'] !== 'hardware-assembly') return;

    const relayKey = this.buildAssemblyRelayKey(windowData);
    if (relayKey !== this.activeAssemblyRelayKey) {
      this.activeAssemblyRelayKey = relayKey;
      this.assemblyRequirementsSent = false;
      this.assemblyCompletionForwarded = false;
    }

    const iframeWindow = this.embeddedFrame?.nativeElement?.contentWindow;
    if (!iframeWindow) return;

    // 子窗口拥有独立 Angular 注入树，必须在这里显式启动运行时数据源。
    this.hardwareRuntimeService.start();
    void this.dialogueHardwareBridgeService.ensureConnected().catch(() => {
      console.warn('[IframeComponent][Assembly] dialogue hardware bridge connect failed, falling back to MQTT runtime only');
    });

    const targetOrigin =
      this.allowedOrigins[0] && this.allowedOrigins[0] !== '*'
        ? this.allowedOrigins[0]
        : '*';

    // 发送组件需求列表。speaker / microphone 虽然在 twin 顶栏有 builtin controls，
    // 但如果 workflow 显式把它们作为当前硬件节点要求，仍必须保留在 checklist 中，
    // 否则“只剩扬声器/麦克风”时会被错误判成空清单，后续下发入口无法出现。
    const components = Array.isArray(windowData['components'])
      ? windowData['components'] as Array<Record<string, unknown>>
      : [];
    const sessionId = windowData['sessionId'] ?? '';
    const nodeName = windowData['nodeName'] ?? '';
    const allPendingHardwareNodeNames = Array.isArray(windowData['allPendingHardwareNodeNames'])
      ? windowData['allPendingHardwareNodeNames']
      : [];
    if (!this.assemblyRequirementsSent) {
      iframeWindow.postMessage(JSON.stringify({
        type: 'tesseract-assembly-requirements',
        payload: { sessionId, nodeName, components, allPendingHardwareNodeNames },
      }), targetOrigin);
      this.assemblyRequirementsSent = true;
      console.info('[IframeComponent][Assembly] sent requirements to embedded twin', { componentCount: (components as unknown[]).length });
    }

    // 订阅硬件桥状态 + MQTT 运行时状态，合并推送
    this.stopAssemblyBridgeRelay();
    this.assemblyBridgeSubscription = combineLatest([
      this.dialogueHardwareBridgeService.state$.pipe(startWith(this.dialogueHardwareBridgeService.snapshot)),
      this.hardwareRuntimeService.status$,
    ]).subscribe(([bridgeState, runtimeSnapshot]) => {
      const childWindow = this.embeddedFrame?.nativeElement?.contentWindow;
      if (!childWindow) return;

      // 合并三个数据源的组件列表：
      // 1) backend canonical dialogueHardware（优先保证 screen/hand/wheel 语义一致）
      // 2) MQTT 原始 heartbeat（兜底）
      // 3) MiniClaw WebSocket 桥接（最高优先级，覆盖同类型）
      const merged = new Map<string, {
        componentId: string;
        deviceId: string;
        displayName: string;
        status: string;
        portId: string;
        modelId: string;
      }>();

      const runtimeDialogueHardware = runtimeSnapshot?.hardware?.dialogueHardware as Record<string, unknown> | null | undefined;
      const runtimeComponents = Array.isArray(runtimeDialogueHardware?.['connectedComponents'])
        ? runtimeDialogueHardware?.['connectedComponents'] as Array<Record<string, unknown>>
        : [];

      for (const component of runtimeComponents) {
        const componentId = String(component['componentId'] ?? '').trim();
        if (!componentId) {
          continue;
        }
        merged.set(componentId, {
          componentId,
          deviceId: String(component['deviceId'] ?? `${componentId}-001`),
          displayName: String(component['displayName'] ?? componentId),
          status: String(component['status'] ?? 'connected'),
          portId: String(component['portId'] ?? component['port_id'] ?? ''),
          modelId: String(component['modelId'] ?? component['model_id'] ?? ''),
        });
      }

      // 来自 MQTT 原始 heartbeat 的设备，补齐 canonical snapshot 未覆盖的场景
      const mqttDevices = runtimeSnapshot?.hardware?.latestHeartbeat?.devices ?? [];
      for (const device of mqttDevices) {
        const mapped = this.mapMqttDeviceToComponent(device);
        if (mapped && !merged.has(mapped.componentId)) {
          merged.set(mapped.componentId, mapped);
        }
      }

      // 来自 MiniClaw WebSocket 桥接的组件（优先级更高，覆盖同类型）
      for (const c of bridgeState.components) {
        merged.set(c.componentId, {
          componentId: c.componentId,
          deviceId: c.deviceId,
          displayName: c.displayName,
          status: c.status,
          portId: c.portId,
          modelId: c.modelId,
        });
      }

      console.info('[IframeComponent][Assembly] relaying hardware state to twin', {
        runtimeComponentCount: runtimeComponents.length,
        mqttDeviceCount: mqttDevices.length,
        bridgeComponentCount: bridgeState.components.length,
        mergedComponentIds: Array.from(merged.keys()),
        runtimeSource: runtimeSnapshot?.source ?? null,
      });

      childWindow.postMessage(JSON.stringify({
        type: 'tesseract-assembly-hardware-state',
        payload: { components: Array.from(merged.values()) },
      }), targetOrigin);
    });
  }

  private stopAssemblyBridgeRelay(): void {
    if (this.assemblyBridgeSubscription) {
      this.assemblyBridgeSubscription.unsubscribe();
      this.assemblyBridgeSubscription = null;
    }
  }

  private handleDigitalTwinFrameDataChange(): void {
    if (!this.isDigitalTwinWindow) {
      return;
    }

    const windowData = this.iframeData as Record<string, unknown> | null;
    if (!windowData || windowData['mode'] !== 'hardware-assembly') {
      this.activeAssemblyRelayKey = '';
      this.assemblyRequirementsSent = false;
      this.assemblyCompletionForwarded = false;
      this.stopAssemblyBridgeRelay();
      return;
    }

    if (this.frameLoaded && this.digitalTwinChildReady) {
      this.startAssemblyBridgeRelay();
    }
  }

  private buildAssemblyRelayKey(windowData: Record<string, unknown>): string {
    const rawComponents = Array.isArray(windowData['components'])
      ? windowData['components'] as Array<Record<string, unknown>>
      : [];

    return JSON.stringify({
      sessionId: String(windowData['sessionId'] ?? ''),
      nodeName: String(windowData['nodeName'] ?? ''),
      allPendingHardwareNodeNames: Array.isArray(windowData['allPendingHardwareNodeNames'])
        ? windowData['allPendingHardwareNodeNames']
        : [],
      components: rawComponents.map((component) => ({
        componentId: String(component['componentId'] ?? component['id'] ?? ''),
        displayName: String(component['displayName'] ?? component['name'] ?? ''),
      })),
    });
  }

  private mapMqttDeviceToComponent(
    device: HardwareRuntimeHeartbeatDevice,
  ): {
    componentId: string;
    deviceId: string;
    displayName: string;
    status: string;
    portId: string;
    modelId: string;
  } | null {
    const type = (device.deviceType || '').toLowerCase();
    const name = (device.deviceName || '').toLowerCase();
    const token = `${type} ${name}`;
    let componentId = '';
    let displayName = '';
    if (/\bcam\b|camera/.test(token)) { componentId = 'camera'; displayName = '摄像头'; }
    else if (/\bhand\b|hand/.test(token)) { componentId = 'mechanical_hand'; displayName = '机械手'; }
    else if (/\bcar\b|\bwheel\b|chassis/.test(token)) { componentId = 'chassis'; displayName = '底盘'; }
    else if (/\bhdmi\b|\bscreen(?:[_ -]?\d+)?\b|\bdisplay(?:[_ -]?\d+)?\b|屏幕|显示屏/.test(token)) { componentId = 'screen'; displayName = '屏幕'; }
    else if (/\bmic\b|microphone/.test(token)) { componentId = 'microphone'; displayName = '麦克风'; }
    else if (/\bspeaker\b/.test(token)) { componentId = 'speaker'; displayName = '扬声器'; }
    if (!componentId) return null;
    const rawStatus = (device.deviceStatus || 'online').toLowerCase();
    const status = /offline|disconnected|removed/.test(rawStatus) ? 'removed' : 'connected';
    return {
      componentId,
      deviceId: device.deviceName || `${componentId}-001`,
      displayName,
      status,
      portId: String(device.interfaceId || device.devicePort || ''),
      modelId: '',
    };
  }

  // =========================================================================
  // 018-twin-preview-device-control: 设备预览状态注入
  // =========================================================================

  private startPreviewStateRelay(): void {
    if (!this.isDigitalTwinWindow) return;
    const iframeWindow = this.embeddedFrame?.nativeElement?.contentWindow;
    if (!iframeWindow) return;

    // 子窗口独立注入树，显式启动运行时数据源
    this.hardwareRuntimeService.start();
    void this.dialogueHardwareBridgeService.ensureConnected().catch(() => {
      console.warn('[IframeComponent][Preview] dialogue bridge connect failed, MQTT only');
    });

    this.stopPreviewStateRelay();
    const targetOrigin = this.allowedOrigins[0] && this.allowedOrigins[0] !== '*'
      ? this.allowedOrigins[0] : '*';

    this.previewStateSubscription = combineLatest([
      this.dialogueHardwareBridgeService.state$.pipe(startWith(this.dialogueHardwareBridgeService.snapshot)),
      this.hardwareRuntimeService.status$,
    ]).subscribe(([_bridgeState, runtimeSnapshot]) => {
      const childWindow = this.embeddedFrame?.nativeElement?.contentWindow;
      if (!childWindow) return;

      const devices = runtimeSnapshot?.hardware?.latestHeartbeat?.devices ?? [];
      const sessions = this.mapDevicesToPreviewSessions(devices);
      for (const entry of sessions) {
        childWindow.postMessage(JSON.stringify(entry), targetOrigin);
      }
      console.info('[IframeComponent][Preview] relaying preview state', {
        deviceCount: devices.length,
        sessionCount: sessions.length,
      });
    });
  }

  private stopPreviewStateRelay(): void {
    if (this.previewStateSubscription) {
      this.previewStateSubscription.unsubscribe();
      this.previewStateSubscription = null;
    }
  }

  private mapDevicesToPreviewSessions(
    devices: HardwareRuntimeHeartbeatDevice[],
  ): Array<Record<string, unknown>> {
    const microphoneSession: Record<string, unknown> = {
      sessionId: 'mic-preview',
      kind: 'microphone',
      label: '内置麦克风',
      active: false,
      muted: false,
      amplitude: 0.0,
      runtimeState: { device_status: 'offline' },
    };
    const speakerSession: Record<string, unknown> = {
      sessionId: 'speaker-preview',
      kind: 'speaker',
      label: '内置扬声器',
      active: false,
      muted: false,
      amplitude: 0.0,
      runtimeState: { device_status: 'offline' },
    };
    const cameraSession: Record<string, unknown> = {
      sessionId: 'camera-preview',
      kind: 'camera',
      label: 'Camera P2P',
      active: false,
      muted: false,
      amplitude: 0.0,
      streamUrl: '',
      runtimeState: { device_status: 'offline' },
    };
    const microphoneControl: Record<string, unknown> = {
      id: 'builtin-mic',
      kind: 'microphone',
      label: '麦克风',
      sessionId: 'mic-preview',
      active: false,
      enabled: false,
      level: 0,
    };
    const speakerControl: Record<string, unknown> = {
      id: 'builtin-speaker',
      kind: 'speaker',
      label: '扬声器',
      sessionId: 'speaker-preview',
      active: false,
      enabled: false,
      level: 0,
    };

    for (const device of devices) {
      const type = (device.deviceType || '').toLowerCase();
      const name = (device.deviceName || '').toLowerCase();
      const token = `${type} ${name}`;
      const rawStatus = (device.deviceStatus || '').toLowerCase();
      const isOnline = !/offline|disconnected|removed/.test(rawStatus);
      const isRunning = /\bactiv(?:e|ing)?\b|recording|playing|streaming|live|opened/.test(rawStatus);

      if (/\baudio\b|\bmic\b|\bmicrophone\b|audio_input|voice/.test(token)) {
        microphoneSession['active'] = isRunning;
        microphoneSession['amplitude'] = isRunning ? 0.35 : 0.0;
        microphoneSession['runtimeState'] = {
          device_status: device.deviceStatus,
          device_name: device.deviceName,
          online: isOnline,
        };
        microphoneControl['active'] = isRunning;
        microphoneControl['enabled'] = isOnline;
        microphoneControl['level'] = isRunning ? 0.35 : 0.0;
      }

      if (/\bspeaker\b|\bspk\b|audio_output|sound/.test(token)) {
        speakerSession['active'] = isRunning;
        speakerSession['amplitude'] = isRunning ? 0.35 : 0.0;
        speakerSession['runtimeState'] = {
          device_status: device.deviceStatus,
          device_name: device.deviceName,
          online: isOnline,
        };
        speakerControl['active'] = isRunning;
        speakerControl['enabled'] = isOnline;
        speakerControl['level'] = isRunning ? 0.35 : 0.0;
      }

      if (/\bcam\b|\bcamera\b/.test(token)) {
        cameraSession['active'] = isRunning;
        cameraSession['streamUrl'] = device.devicePath || '';
        cameraSession['runtimeState'] = {
          device_status: device.deviceStatus,
          device_name: device.deviceName,
          device_path: device.devicePath || '',
          online: isOnline,
        };
      }
    }

    return [
      {
        type: 'tesseract-digital-twin-preview-state',
        session: microphoneSession,
        control: microphoneControl,
      },
      {
        type: 'tesseract-digital-twin-preview-state',
        session: speakerSession,
        control: speakerControl,
      },
      {
        type: 'tesseract-digital-twin-preview-state',
        session: cameraSession,
      },
    ];
  }

  // =========================================================================
  // 018-twin-preview-device-control: 设备控制中继（顶栏按钮 → MQTT）
  // =========================================================================

  private handleDeviceControlFromTwin(payload: Record<string, unknown>): void {
    const control = (payload['control'] ?? payload) as Record<string, unknown>;
    const kind = String(control['kind'] ?? '').toLowerCase();
    const active = control['active'] === true;
    const action = String(payload['action'] ?? '').toLowerCase();

    // 防抖: 300ms 内同一设备不重复发送
    const debounceKey = kind || action;
    const now = Date.now();
    const last = this.deviceControlLastAction.get(debounceKey) ?? 0;
    if (now - last < IframeComponent.DEVICE_CONTROL_DEBOUNCE_MS) {
      console.info('[IframeComponent][DeviceControl] debounced', { kind, action, elapsed: now - last });
      return;
    }
    this.deviceControlLastAction.set(debounceKey, now);

    const electronAPI = (window as any)['electronAPI'];
    if (!electronAPI?.tesseract) {
      console.warn('[IframeComponent][DeviceControl] electronAPI.tesseract not available');
      return;
    }

    console.info('[IframeComponent][DeviceControl] dispatching', { kind, active, action });

    if (kind === 'microphone' || action === 'toggle-microphone') {
      const method = active
        ? electronAPI.tesseract.hardwareMicrophoneOpen
        : electronAPI.tesseract.hardwareMicrophoneClose;
      if (method) {
        void method({}).then((result: any) => {
          console.info('[IframeComponent][DeviceControl] microphone result', result);
        }).catch((err: any) => {
          console.warn('[IframeComponent][DeviceControl] microphone error', err);
        });
      }
    } else if (kind === 'speaker' || action === 'toggle-speaker') {
      const method = active
        ? electronAPI.tesseract.hardwareSpeakerPlay
        : electronAPI.tesseract.hardwareCommand;
      if (active && electronAPI.tesseract.hardwareSpeakerPlay) {
        void electronAPI.tesseract.hardwareSpeakerPlay({}).then((result: any) => {
          console.info('[IframeComponent][DeviceControl] speaker play result', result);
        }).catch((err: any) => {
          console.warn('[IframeComponent][DeviceControl] speaker play error', err);
        });
      } else if (!active && electronAPI.tesseract.hardwareCommand) {
        void electronAPI.tesseract.hardwareCommand({ deviceType: 'speaker', cmd: 'stop' }).then((result: any) => {
          console.info('[IframeComponent][DeviceControl] speaker stop result', result);
        }).catch((err: any) => {
          console.warn('[IframeComponent][DeviceControl] speaker stop error', err);
        });
      }
    }
  }

  private handleAssemblyCompleteFromTwin(payload: Record<string, unknown>): void {
    this.stopAssemblyBridgeRelay();
    console.info('[IframeComponent][Assembly] received completion from embedded twin', payload);
    this.forwardAssemblyCompletionToChat(payload, payload['triggerWorkflowDeploy'] === true);
  }

  private handleAssemblyWorkflowActionFromTwin(payload: Record<string, unknown>): void {
    this.executeWorkflowActionFromTwin(payload, true);
  }

  private handleDigitalTwinWorkflowActionFromTwin(payload: Record<string, unknown>): void {
    this.executeWorkflowActionFromTwin(payload, false);
  }

  private executeWorkflowActionFromTwin(
    payload: Record<string, unknown>,
    forwardAssemblyCompletion: boolean,
  ): void {
    const action = String(payload['action'] ?? '').toLowerCase();
    const electronAPI = (window as any)['electronAPI'];
    if (!electronAPI?.tesseract) {
      this.postAssemblyWorkflowStatus({
        action,
        success: false,
        message: 'electronAPI.tesseract 不可用，无法执行端侧工作流操作',
      });
      return;
    }

    if (action === 'upload') {
      if (forwardAssemblyCompletion) {
        this.forwardAssemblyCompletionToChat(payload, false);
      }
      void electronAPI.tesseract.hardwareUpload({
        sessionId: payload['sessionId'] ?? null,
      }).then((result: any) => {
        this.postAssemblyWorkflowStatus({
          action,
          success: Boolean(result?.success) && String(result?.data?.status || '').toLowerCase() === 'acknowledged',
          message: this.describeAssemblyWorkflowResult(result, 'upload'),
          result,
        });
      }).catch((error: any) => {
        this.postAssemblyWorkflowStatus({
          action,
          success: false,
          message: error?.message || '下发工作流失败',
        });
      });
      return;
    }

    if (action === 'stop') {
      void electronAPI.tesseract.hardwareStop({}).then((result: any) => {
        this.postAssemblyWorkflowStatus({
          action,
          success: Boolean(result?.success) && String(result?.data?.status || '').toLowerCase() === 'acknowledged',
          message: this.describeAssemblyWorkflowResult(result, 'stop'),
          result,
        });
      }).catch((error: any) => {
        this.postAssemblyWorkflowStatus({
          action,
          success: false,
          message: error?.message || '停止工作流失败',
        });
      });
      return;
    }

    this.postAssemblyWorkflowStatus({
      action,
      success: false,
      message: `未知组装工作流动作: ${action || 'n/a'}`,
    });
  }

  private describeAssemblyWorkflowResult(
    result: any,
    action: 'upload' | 'stop'
  ): string {
    if (!result?.success) {
      return result?.error || (action === 'upload' ? '下发工作流失败' : '停止工作流失败');
    }

    const receipt = result?.data || {};
    const status = String(receipt?.status || '').trim().toLowerCase();
    const response = receipt?.response || {};
    const responseStatus = String(response?.status || '').trim().toLowerCase();
    const responseMessage = String(response?.message || '').trim();
    const workflowFile = String(response?.workflow_file || '').trim();

    if (action === 'upload') {
      if (status === 'acknowledged' && responseStatus === 'started') {
        return workflowFile
          ? `工作流已下发到端侧并启动，端侧文件：${workflowFile}`
          : '工作流已下发到端侧并启动';
      }
      if (status === 'acknowledged') {
        return responseMessage || '端侧已确认收到工作流';
      }
      if (status === 'sent') {
        return '工作流已发送到端侧，正在等待设备确认';
      }
      if (status === 'queued') {
        const isDisabled = receipt?.requestId === 'disabled' || !receipt?.topic;
        return isDisabled
          ? '后端未启用硬件下发能力，请先检查 MQTT/运行时配置'
          : '工作流已入队，等待端侧链路可用';
      }
      if (status === 'failed') {
        return responseMessage || '下发工作流失败';
      }
      return responseMessage || '工作流下发状态未知';
    }

    if (status === 'acknowledged') {
      return responseMessage || '端侧已确认停止工作流';
    }
    if (status === 'sent') {
      return '停止指令已发送，正在等待设备确认';
    }
    if (status === 'queued') {
      const isDisabled = receipt?.requestId === 'disabled' || !receipt?.topic;
      return isDisabled
        ? '后端未启用硬件停止能力，请先检查 MQTT/运行时配置'
        : '停止指令已入队，等待端侧链路可用';
    }
    if (status === 'failed') {
      return responseMessage || '停止工作流失败';
    }
    return responseMessage || '停止工作流状态未知';
  }

  private forwardAssemblyCompletionToChat(payload: Record<string, unknown>, triggerWorkflowDeploy: boolean): void {
    if (this.assemblyCompletionForwarded) {
      return;
    }
    this.assemblyCompletionForwarded = true;
    document.dispatchEvent(new CustomEvent('aily-chat-action', {
      detail: {
        action: 'tesseract-assembly-completed-from-twin',
        data: {
          sessionId: payload['sessionId'] ?? null,
          nodeName: payload['nodeName'] ?? null,
          triggerWorkflowDeploy,
          allPendingHardwareNodeNames: Array.isArray(payload['allPendingHardwareNodeNames'])
            ? payload['allPendingHardwareNodeNames']
            : [],
        },
      },
    }));
  }

  private postAssemblyWorkflowStatus(payload: Record<string, unknown>): void {
    const iframeWindow = this.embeddedFrame?.nativeElement?.contentWindow;
    if (!iframeWindow) {
      return;
    }

    const targetOrigin = this.allowedOrigins[0] && this.allowedOrigins[0] !== '*'
      ? this.allowedOrigins[0]
      : '*';
    iframeWindow.postMessage(JSON.stringify({
      type: 'tesseract-assembly-workflow-status',
      ...payload,
    }), targetOrigin);
  }

  private clearDigitalTwinReplayTimer(): void {
    if (this.digitalTwinReplayTimer) {
      clearTimeout(this.digitalTwinReplayTimer);
      this.digitalTwinReplayTimer = null;
    }
  }

  /**
   * 停止 IPC 监听
   */
  private stopIpcListener(): void {
    if (this.ipcCleanup) {
      this.ipcCleanup();
      this.ipcCleanup = null;
    }
  }

  /**
   * 处理连线图更新通知
   */
  private async handleConnectionGraphUpdate(data: any): Promise<void> {
    if (!data) return;

    try {
      // 使用 IPC 发送过来的完整 payload（包含最新的 componentConfigs）
      const currentPayload = this.iframeData as any;
      const newPayload = {
        // 优先使用新的 componentConfigs，如果没有则保留旧的
        componentConfigs: data.componentConfigs || currentPayload?.componentConfigs || {},
        components: data.components || [],
        connections: data.connections || [],
        theme: data.theme || currentPayload?.theme || 'dark',
      };
      this.iframeData = newPayload;
      // 推送给 iframe
      await this.pushDataToRemote();
      console.log('[IframeComponent] 连线图已自动更新');
      
      // 显示更新提示，3秒后自动隐藏
      this.hasUpdate = true;
      setTimeout(() => {
        this.ngZone.run(() => {
          this.hasUpdate = false;
        });
      }, 3000);
    } catch (error) {
      console.error('[IframeComponent] 处理连线图更新失败:', error);
    }
  }

  /**
   * 关闭更新提示（用户选择不刷新）
   */
  dismissUpdate(): void {
    this.hasUpdate = false;
  }

  private setIframeUrl(url: string): void {
    // 路由 queryParams、IPC initData、modal data 可能对同一地址各调用一次 setIframeUrl。
    // 第二次会再次 resetFrameLoadingState() 把 isLoading 置回 true，但 iframe src 未变则不会触发
    // 新的 load 事件，onIframeLoad 不会跑 → 骨架屏「数字孪生加载中」永久卡住（macOS Electron 上常见）。
    if (this.iframeUrlRaw) {
      const prev = this.canonicalizeIframeUrlForCompare(this.iframeUrlRaw);
      const next = this.canonicalizeIframeUrlForCompare(url);
      if (prev === next) {
        console.info('[IframeComponent] setIframeUrl skipped — same canonical URL (avoid stuck loading)', {
          url,
        });
        return;
      }
    }

    this.iframeUrlRaw = url;
    this.iframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.isConnectionGraphWindow = url.includes('connection-graph');
    this.isDigitalTwinWindow = this.enableDigitalTwinBridge || url.includes('entry=digital-twin');

    try {
      this.allowedOrigins = [new URL(url).origin];
    } catch {
      this.allowedOrigins = ['*'];
    }

    this.startDigitalTwinSceneListener();
    this.startDigitalTwinPreviewStateListener();
    this.startDigitalTwinReadyListener();
    if (this.isDigitalTwinWindow) {
      this.desktopDigitalTwinState.setVisibility(true);
    }
    this.resetFrameLoadingState();
  }

  /** 归一化 query 顺序与 hash，用于判断 iframe 地址是否实质相同。 */
  private canonicalizeIframeUrlForCompare(raw: string): string {
    try {
      const u = new URL(raw);
      u.hash = '';
      const entries = Array.from(u.searchParams.entries()).sort((a, b) =>
        a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0]),
      );
      const next = new URLSearchParams(entries);
      u.search = next.toString();
      return u.toString();
    } catch {
      return raw.trim();
    }
  }

  private resetFrameLoadingState(): void {
    this.frameLoaded = false;
    this.assemblyRequirementsSent = false;
    this.assemblyCompletionForwarded = false;
    this.activeAssemblyRelayKey = '';
    this.stopAssemblyBridgeRelay();
    this.stopPreviewStateRelay();
    this.penpalConnection?.destroy();
    this.penpalConnection = null;
    this.remoteApi = null;
    this.connectionGraphService.clearIframeApi();
    this.clearLoadTimeout();
    this.clearPendingFrameUiStateCommit();
    this.isLoading = true;
    this.showEmptyState = false;
    this.loadTimeoutId = setTimeout(() => {
      if (this.isLoading) {
        console.warn('[IframeComponent] frame load timed out', {
          url: this.iframeUrlRaw,
          isDigitalTwinWindow: this.isDigitalTwinWindow,
          timeoutMs: this.frameLoadTimeoutMs(),
        });
        this.handleLoadError();
      }
    }, this.frameLoadTimeoutMs());
  }

  private frameLoadTimeoutMs(): number {
    return this.isDigitalTwinWindow
      ? DIGITAL_TWIN_FRAME_LOAD_TIMEOUT_MS
      : FRAME_LOAD_TIMEOUT_MS;
  }

  private clearLoadTimeout(): void {
    if (this.loadTimeoutId) {
      clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }
  }

  private markFrameLoaded(): void {
    this.clearLoadTimeout();
    this.scheduleFrameUiStateCommit(false, false);
  }

  private scheduleFrameUiStateCommit(isLoading: boolean, showEmptyState: boolean): void {
    this.clearPendingFrameUiStateCommit();
    // iframe load / postMessage ready 可能在首轮变更检测中同步返回，延后提交 UI 状态可避免
    // Angular dev-mode 的 ExpressionChangedAfterItHasBeenCheckedError。
    this.frameUiStateCommitId = setTimeout(() => {
      this.frameUiStateCommitId = null;
      this.ngZone.run(() => {
        this.isLoading = isLoading;
        this.showEmptyState = showEmptyState;
      });
    }, 0);
  }

  private clearPendingFrameUiStateCommit(): void {
    if (this.frameUiStateCommitId) {
      clearTimeout(this.frameUiStateCommitId);
      this.frameUiStateCommitId = null;
    }
  }

  private shouldConnectBridge(): boolean {
    if (this.isDigitalTwinWindow) {
      return false;
    }
    return this.isConnectionGraphWindow || this.iframeData !== undefined;
  }

  private async syncCurrentDigitalTwinScene(): Promise<void> {
    if (!this.isDigitalTwinWindow) {
      return;
    }

    try {
      const scene = this.shouldUseRendererDigitalTwinState()
        ? this.desktopDigitalTwinState.scene
        : await window['electronAPI'].digitalTwin.getScene();
      this.lastDigitalTwinEnvelopeSummary = this.summarizeDigitalTwinEnvelope(scene);
      console.info('[IframeComponent][DigitalTwin] fetched current scene envelope', this.lastDigitalTwinEnvelopeSummary);
      this.pushDigitalTwinSceneToFrame(scene ?? null);
    } catch (error) {
      console.warn('[IframeComponent] syncCurrentDigitalTwinScene failed:', error);
    }
  }

  private async syncCurrentDigitalTwinPreviewState(): Promise<void> {
    if (!this.isDigitalTwinWindow) {
      return;
    }

    try {
      const previewState = this.shouldUseRendererDigitalTwinState()
        ? this.desktopDigitalTwinState.previewState
        : await window['electronAPI'].digitalTwin.getPreviewState();
      this.lastDigitalTwinPreviewEnvelopeSummary = this.summarizeDigitalTwinPreviewEnvelope(previewState);
      console.info('[IframeComponent][DigitalTwin] fetched current preview-state envelope', this.lastDigitalTwinPreviewEnvelopeSummary);
      this.pushDigitalTwinPreviewStateToFrame(previewState ?? null);
    } catch (error) {
      console.warn('[IframeComponent] syncCurrentDigitalTwinPreviewState failed:', error);
    }
  }

  private pushDigitalTwinSceneToFrame(scene: unknown): void {
    if (!this.isDigitalTwinWindow) {
      return;
    }

    const iframeWindow = this.embeddedFrame?.nativeElement?.contentWindow;
    if (!iframeWindow) {
      return;
    }

    const targetOrigin =
      this.allowedOrigins[0] && this.allowedOrigins[0] !== '*'
        ? this.allowedOrigins[0]
        : '*';

    const payload = JSON.stringify({
      type: 'tesseract-digital-twin-scene',
      envelope: scene ?? null,
      scene: this.extractDigitalTwinScene(scene),
    });

    this.lastDigitalTwinEnvelopeSummary = this.summarizeDigitalTwinEnvelope(scene);
    this.lastPushedDigitalTwinRevision = Number(this.lastDigitalTwinEnvelopeSummary['revision'] ?? 0);
    if (this.digitalTwinReplayRevision !== this.lastPushedDigitalTwinRevision) {
      this.digitalTwinReplayRevision = this.lastPushedDigitalTwinRevision;
      this.restartDigitalTwinBootstrapWindow('revision-change');
    }
    console.info('[IframeComponent][DigitalTwin] pushing scene to embedded frame', this.lastDigitalTwinEnvelopeSummary);
    iframeWindow.postMessage(payload, targetOrigin);
    this.scheduleDigitalTwinReplayCheck();
  }

  private pushDigitalTwinPreviewStateToFrame(previewState: unknown): void {
    if (!this.isDigitalTwinWindow) {
      return;
    }

    const iframeWindow = this.embeddedFrame?.nativeElement?.contentWindow;
    if (!iframeWindow) {
      return;
    }

    const targetOrigin =
      this.allowedOrigins[0] && this.allowedOrigins[0] !== '*'
        ? this.allowedOrigins[0]
        : '*';

    const payload = JSON.stringify({
      type: 'tesseract-digital-twin-preview-state',
      envelope: previewState ?? null,
      previewState: this.extractDigitalTwinPreviewState(previewState),
    });

    this.lastDigitalTwinPreviewEnvelopeSummary = this.summarizeDigitalTwinPreviewEnvelope(previewState);
    console.info('[IframeComponent][DigitalTwin] pushing preview-state to embedded frame', this.lastDigitalTwinPreviewEnvelopeSummary);
    iframeWindow.postMessage(payload, targetOrigin);
  }

  private normalizeWindowMessagePayload(raw: unknown): Record<string, unknown> | null {
    if (typeof raw === 'string') {
      try {
        return this.normalizeWindowMessagePayload(JSON.parse(raw));
      } catch {
        return null;
      }
    }

    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }

    return null;
  }

  private extractDigitalTwinScene(raw: unknown): unknown {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const record = raw as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(record, 'scene')) {
        return record['scene'] ?? null;
      }
    }
    return raw ?? null;
  }

  private extractDigitalTwinPreviewState(raw: unknown): unknown {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const record = raw as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(record, 'previewState')) {
        return record['previewState'] ?? null;
      }
    }
    return raw ?? null;
  }

  private summarizeDigitalTwinEnvelope(raw: unknown): Record<string, unknown> {
    const scene = this.extractDigitalTwinScene(raw) as Record<string, unknown> | null;
    const models = Array.isArray(scene?.['models']) ? scene?.['models'] as Array<Record<string, unknown>> : [];
    const record = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : {};
    return {
      revision: record['revision'] ?? null,
      sourcePhase: record['sourcePhase'] ?? null,
      responseType: record['responseType'] ?? null,
      modelCount: models.length,
      modelIds: models.map((item) => item?.['id']).filter(Boolean).slice(0, 8),
    };
  }

  private summarizeDigitalTwinPreviewEnvelope(raw: unknown): Record<string, unknown> {
    const previewState = this.extractDigitalTwinPreviewState(raw) as Record<string, unknown> | null;
    const controls = previewState?.['controls'] && typeof previewState['controls'] === 'object'
      ? previewState['controls'] as Record<string, unknown>
      : {};
    const record = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : {};
    return {
      revision: record['revision'] ?? null,
      sourcePhase: record['sourcePhase'] ?? null,
      responseType: record['responseType'] ?? null,
      sessionId: record['sessionId'] ?? null,
      controlKeys: Object.keys(controls).slice(0, 8),
      previewKeys: previewState ? Object.keys(previewState).slice(0, 8) : [],
    };
  }

  private isDigitalTwinPreviewMessageType(messageType: string): boolean {
    return [
      'tesseract-digital-twin-preview-state',
      'tesseract-digital-twin-model-click',
      'tesseract-digital-twin-top-control',
      'tesseract-digital-twin-control',
      'tesseract-digital-twin-preview-session',
    ].includes(messageType);
  }

  private forwardDigitalTwinPreviewState(payload: Record<string, unknown>): void {
    if (this.shouldUseRendererDigitalTwinState()) {
      this.desktopDigitalTwinState.applyPreviewState(payload);
      return;
    }

    if (!window['electronAPI']?.digitalTwin?.setPreviewState) {
      return;
    }

    console.info('[IframeComponent][DigitalTwin] forwarding child preview-state event', {
      type: payload['type'] || null,
      summary: this.summarizeDigitalTwinPreviewEnvelope(payload),
    });
    void window['electronAPI'].digitalTwin.setPreviewState(payload).catch((error: unknown) => {
      console.warn('[IframeComponent][DigitalTwin] setPreviewState failed:', error);
    });
  }

  private shouldUseRendererDigitalTwinState(): boolean {
    return this.embeddedMode && this.enableDigitalTwinBridge;
  }

  private scheduleDigitalTwinReplayCheck(): void {
    this.clearDigitalTwinReplayTimer();
    if (!this.lastPushedDigitalTwinRevision) {
      return;
    }

    this.digitalTwinReplayTimer = setTimeout(() => {
      if (this.lastConsumedDigitalTwinRevision >= this.lastPushedDigitalTwinRevision) {
        return;
      }

      this.digitalTwinReplayAttempts += 1;
      const bootstrapAgeMs = this.digitalTwinFirstPushAt > 0
        ? Date.now() - this.digitalTwinFirstPushAt
        : 0;

      console.warn('[IframeComponent][DigitalTwin] no consume ack after push', {
        expectedRevision: this.lastPushedDigitalTwinRevision,
        consumedRevision: this.lastConsumedDigitalTwinRevision,
        replayAttempts: this.digitalTwinReplayAttempts,
        childReady: this.digitalTwinChildReady,
        bootstrapAgeMs,
        summary: this.lastDigitalTwinEnvelopeSummary,
      });

      if (!this.digitalTwinChildReady && bootstrapAgeMs < this.digitalTwinBootstrapGraceMs()) {
        void this.syncCurrentDigitalTwinScene();
        return;
      }

      if (this.digitalTwinReplayAttempts >= 4) {
        this.forceReloadDigitalTwinFrame(this.lastPushedDigitalTwinRevision);
        return;
      }

      void this.syncCurrentDigitalTwinScene();
    }, DIGITAL_TWIN_REPLAY_CHECK_MS);
  }

  private forceReloadDigitalTwinFrame(revision: number): void {
    if (!this.isDigitalTwinWindow || !this.iframeUrlRaw) {
      return;
    }

    try {
      const nextUrl = new URL(this.iframeUrlRaw);
      nextUrl.searchParams.set('dt_revision', String(revision || Date.now()));
      nextUrl.searchParams.set('dt_reload', String(Date.now()));
      this.restartDigitalTwinBootstrapWindow('forced-reload');
      console.warn('[IframeComponent][DigitalTwin] forcing embedded frame reload', {
        revision,
        bootstrapGraceMs: this.digitalTwinBootstrapGraceMs(),
        url: nextUrl.toString(),
        summary: this.lastDigitalTwinEnvelopeSummary,
      });
      this.setIframeUrl(nextUrl.toString());
    } catch (error) {
      console.warn('[IframeComponent][DigitalTwin] forceReloadDigitalTwinFrame failed:', error);
    }
  }

  private digitalTwinBootstrapGraceMs(): number {
    const mode = window.electronAPI?.runtimeFlags?.desktopTwinMode || 'embedded-panel';
    if (mode === 'flutter-workspace') {
      return DIGITAL_TWIN_FLUTTER_WORKSPACE_BOOTSTRAP_GRACE_MS;
    }
    return DIGITAL_TWIN_BOOTSTRAP_GRACE_MS;
  }

  private restartDigitalTwinBootstrapWindow(
    reason: 'revision-change' | 'forced-reload',
  ): void {
    this.digitalTwinReplayAttempts = 0;
    this.digitalTwinFirstPushAt = Date.now();
    this.digitalTwinChildReady = false;

    if (reason === 'forced-reload') {
      console.info('[IframeComponent][DigitalTwin] restarting bootstrap grace window after forced reload', {
        revision: this.lastPushedDigitalTwinRevision,
        graceMs: this.digitalTwinBootstrapGraceMs(),
        summary: this.lastDigitalTwinEnvelopeSummary,
      });
    }
  }

  // =====================================================
  // 连线图自动生成 - 进度监听 & 操作按钮
  // =====================================================

  /**
   * 开始监听生成进度 IPC
   */
  private startProgressIpcListener(): void {
    if (!this.electronService.isElectron || !window['ipcRenderer']) return;

    console.log('[IframeComponent] 开始监听 schematic-generation-progress');

    const handler = (_event: any, data: ProgressEvent) => {
      this.ngZone.run(() => {
        this.handleProgressEvent(data);
      });
    };

    window['ipcRenderer'].on('schematic-generation-progress', handler);

    this.progressIpcCleanup = () => {
      window['ipcRenderer'].removeListener('schematic-generation-progress', handler);
    };
  }

  /**
   * 停止生成进度 IPC 监听
   */
  private stopProgressIpcListener(): void {
    if (this.progressIpcCleanup) {
      this.progressIpcCleanup();
      this.progressIpcCleanup = null;
    }
  }

  /**
   * 处理进度事件 → 更新 notice 通知栏
   */
  private handleProgressEvent(event: ProgressEvent): void {
    if (!event) return;

    switch (event.type) {
      case 'thinking':
        this.safeUpdateNotice(event.content || '正在分析项目...', 'doing');
        break;
      case 'tool_call':
        this.safeUpdateNotice(event.content || '正在执行工具...', 'doing');
        break;
      case 'tool_result':
        this.safeUpdateNotice(event.content || '工具执行完成', 'doing');
        break;
      case 'complete':
        this.isGenerating = false;
        this.safeUpdateNotice('连线图生成完成', 'done', 3000);
        break;
      case 'error':
        this.isGenerating = false;
        this.safeUpdateNotice(event.content || '生成失败', 'error', 5000);
        break;
      default:
        if (event.content) {
          this.safeUpdateNotice(event.content, 'doing');
        }
    }
  }

  /**
   * 安全更新通知栏
   * @param text 通知文本
   * @param state 通知状态
   * @param autoHideMs 自动隐藏毫秒数，0 表示不自动隐藏
   */
  private safeUpdateNotice(text: string, state: 'doing' | 'done' | 'error', autoHideMs = 0): void {
    this.noticeText = text;
    this.noticeState = state;

    // 清除之前的自动隐藏定时器
    if (this.noticeTimer) {
      clearTimeout(this.noticeTimer);
      this.noticeTimer = null;
    }

    if (autoHideMs > 0) {
      this.noticeTimer = setTimeout(() => {
        this.ngZone.run(() => {
          this.noticeText = '';
          this.noticeState = '';
        });
      }, autoHideMs);
    }
  }

  /**
   * 操作按钮: 重新生成
   */
  onRegenerate(): void {
    this.isGenerating = true;
    this.safeUpdateNotice('正在重新生成连线图...', 'doing');

    // 开始监听进度（如果之前已停止）
    if (!this.progressIpcCleanup) {
      this.startProgressIpcListener();
    }

    // 发送 IPC 到主窗口触发 BackgroundAgentService 重新生成
    if (this.electronService.isElectron && window['ipcRenderer']) {
      window['ipcRenderer'].send('schematic-regenerate-request');
    }
  }

  /**
   * 操作按钮: 同步到代码
   */
  onSyncToCode(): void {
    if (this.electronService.isElectron && window['ipcRenderer']) {
      window['ipcRenderer'].send('schematic-sync-to-code-request');
    }
  }
}
