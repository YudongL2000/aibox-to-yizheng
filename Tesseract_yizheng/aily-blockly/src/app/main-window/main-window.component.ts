import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { FooterComponent } from './components/footer/footer.component';
import { HeaderComponent } from './components/header/header.component';
import { CommonModule } from '@angular/common';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzResizableModule, NzResizeEvent } from 'ng-zorro-antd/resizable';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { AilyChatComponent } from '../tools/aily-chat/aily-chat.component';
import { TerminalComponent } from '../tools/terminal/terminal.component';
import { LogComponent } from '../tools/log/log.component';
import { UiService } from '../services/ui.service';
import { SerialMonitorComponent } from '../tools/serial-monitor/serial-monitor.component';
import { CodeViewerComponent } from '../editors/blockly-editor/tools/code-viewer/code-viewer.component';
import { ProjectService } from '../services/project.service';
import { SimplebarAngularModule } from 'simplebar-angular';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AppStoreComponent } from '../tools/app-store/app-store.component';
import { UpdateService } from '../services/update.service';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NpmService } from '../services/npm.service';
import { SimulatorComponent } from '../tools/simulator/simulator.component';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { ConfigService } from '../services/config.service';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { FloatSiderComponent } from '../components/float-sider/float-sider.component';
import { CloudSpaceComponent } from '../tools/cloud-space/cloud-space.component';
import { UserCenterComponent } from '../tools/user-center/user-center.component';
import { ModelStoreComponent } from '../tools/model-store/model-store.component';
import { OnboardingComponent } from '../components/onboarding/onboarding.component';
import { OnboardingService } from '../services/onboarding.service';
import { DigitalTwinPanelComponent } from '../components/digital-twin-panel/digital-twin-panel.component';
import { HardwareRuntimeService, HardwareRuntimeSnapshot } from '../services/hardware-runtime.service';
import { SupportPanelComponent } from './components/support-panel/support-panel.component';

@Component({
  selector: 'app-main-window',
  imports: [
    CommonModule,
    HeaderComponent,
    FooterComponent,
    NzLayoutModule,
    NzResizableModule,
    NzTabsModule,
    AilyChatComponent,
    TerminalComponent,
    LogComponent,
    SerialMonitorComponent,
    CodeViewerComponent,
    SimplebarAngularModule,
    AppStoreComponent,
    NzModalModule,
    SimulatorComponent,
    RouterModule,
    NzToolTipModule,
    NzModalModule,
    FloatSiderComponent,
    CloudSpaceComponent,
    UserCenterComponent,
    ModelStoreComponent,
    OnboardingComponent,
    DigitalTwinPanelComponent,
    SupportPanelComponent,
  ],
  templateUrl: './main-window.component.html',
  styleUrl: './main-window.component.scss',
})
export class MainWindowComponent {
  @ViewChild('logComponent') logComponent!: LogComponent;
  @ViewChild('terminalComponent') terminalComponent!: TerminalComponent;

  showRbox = false;
  showBbox = false;
  terminalTab = 'log';
  selectedTabIndex = 0;

  get topTool() {
    return this.uiService.topTool;
  }

  get openToolList() {
    return this.uiService.openToolList;
  }

  get digitalTwinPanelState() {
    return this.uiService.getWorkbenchPayload<Record<string, unknown>>('digital-twin');
  }

  get supportPanelState() {
    return this.uiService.getSupportPanelState();
  }

  get hardwareRuntimeStatus$() {
    return this.hardwareRuntimeService.status$;
  }

  options = {
    autoHide: true,
    clickOnTrack: true,
    scrollbarMinSize: 50,
  };

  // 新手引导相关
  showOnboarding = false;
  onboardingConfig = null;

  constructor(
    private uiService: UiService,
    private projectService: ProjectService,
    private message: NzMessageService,
    private cd: ChangeDetectorRef,
    private updateService: UpdateService,
    private npmService: NpmService,
    private router: Router,
    private configService: ConfigService,
    private modal: NzModalService,
    private onboardingService: OnboardingService,
    private hardwareRuntimeService: HardwareRuntimeService
  ) { }

  ngOnInit(): void {
    this.uiService.init();
    this.projectService.init();
    this.updateService.init();
    this.npmService.init();
    this.hardwareRuntimeService.start();
    // 重置 footer 状态
    this.uiService.updateFooterState({ text: '', timeout: 0 });

    // 监听路由变化，重置 footer 状态
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.uiService.updateFooterState({ text: '', timeout: 0 });
      this.syncFloatSiderRoute(this.router.url);
    });

    this.syncFloatSiderRoute(this.router.url);

    // 订阅 onboarding 服务
    this.onboardingService.show$.subscribe((show) => {
      this.showOnboarding = show;
      this.cd.detectChanges();
    });
    this.onboardingService.config$.subscribe((config) => {
      this.onboardingConfig = config;
      this.cd.detectChanges();
    });

    // 语言设置变化后，重新加载项目
    window['ipcRenderer'].on('setting-changed', async (event, data) => {
      await this.configService.load();
      if (data.action == 'language-changed' && this.router.url.includes('/main/blockly-editor')) {
        console.log('mainwindow setLanguage', data);
        this.projectService.save();
        setTimeout(() => {
          this.projectService.projectOpen();
        }, 100);
      }
    });
  }

  ngAfterViewInit(): void {
    this.uiService.actionSubject.subscribe((e: any) => {
      // console.log(e);
      switch (e.type) {
        case 'tool':
          if (e.action === 'open') {
            this.showRbox = true;
          } else {
            if (this.topTool === null) {
              this.showRbox = false;
            }
          }
          break;
        case 'bottom-sider':
          if (e.action === 'open') {
            this.showBbox = true;
            this.terminalTab = e.data;
            this.uiService.currentBottomTab = e.data;
            // 根据数据设置选中的tab
            if (e.data === 'log') {
              this.selectedTabIndex = 0;
            } else if (e.data === 'terminal') {
              this.selectedTabIndex = 1;
            } else if (e.data === 'hardware') {
              this.selectedTabIndex = 2;
            }
          } else if (e.action === 'switch-tab') {
            // 切换tab，不改变面板的显示状态
            this.terminalTab = e.data;
            this.uiService.currentBottomTab = e.data;
            if (e.data === 'log') {
              this.selectedTabIndex = 0;
            } else if (e.data === 'terminal') {
              this.selectedTabIndex = 1;
            } else if (e.data === 'hardware') {
              this.selectedTabIndex = 2;
            }
          } else {
            this.showBbox = false;
            this.uiService.currentBottomTab = '';
          }
          break;
        default:
          break;
      }
      this.cd.detectChanges();
    });

    this.projectService.stateSubject.subscribe((state) => {
      switch (state) {
        case 'loading':
          // this.loaded = false;
          setTimeout(() => {
            this.message.loading('Project Loading...');
            // this.loaded = true;
          }, 20);
          break;
        case 'loaded':
          this.message.remove();
          this.message.success('Project Loaded');
          break;
        case 'saving':
          this.message.loading('Project Saving...');
          break;
        case 'saved':
          this.message.remove();
          this.message.success('Project Saved');
          break;
        case 'default':
          // this.message.success('Project Closed');
          // this.loaded = false;
          break;
        default:
          break;
      }
      this.cd.detectChanges();
    });
  }

  closeRightBox() {
    this.showRbox = false;
  }

  bottomHeight = 210;
  siderWidth = 450;

  onSideResize({ width }: NzResizeEvent): void {
    this.siderWidth = width!;
  }

  onContentResize({ height }: NzResizeEvent): void {
    this.bottomHeight = height!;
  }

  // 处理底部tab的切换
  onTabChange(index: number): void {
    this.selectedTabIndex = index;
    if (index === 0) {
      this.terminalTab = 'log';
      this.uiService.currentBottomTab = 'log';
    } else if (index === 1) {
      this.terminalTab = 'terminal';
      this.uiService.currentBottomTab = 'terminal';
    } else if (index === 2) {
      this.terminalTab = 'hardware';
      this.uiService.currentBottomTab = 'hardware';
    }
  }

  // 关闭底部面板
  closeBottomPanel(): void {
    this.showBbox = false;
    this.uiService.terminalIsOpen = false;
    this.uiService.currentBottomTab = '';
  }

  // 清空当前选中的组件
  clearCurrentComponent(): void {
    if (this.selectedTabIndex === 0) {
      // 清空日志
      this.logComponent?.clear();
    } else if (this.selectedTabIndex === 1) {
      // 清空终端
      this.terminalComponent?.clear();
    }
  }

  getHardwareConnectionTone(snapshot: HardwareRuntimeSnapshot | null): 'healthy' | 'warning' | 'danger' {
    const state = this.normalizeHardwareState(snapshot?.hardware?.connectionState ?? snapshot?.transportState ?? 'connecting');
    if (state === 'connected') {
      return 'healthy';
    }
    if (state === 'error' || state === 'disconnected') {
      return 'danger';
    }
    return 'warning';
  }

  getHardwareConnectionLabel(snapshot: HardwareRuntimeSnapshot | null): string {
    const hardware = snapshot?.hardware;
    const state = this.normalizeHardwareState(hardware?.connectionState ?? snapshot?.transportState ?? 'connecting');
    if (hardware?.deviceId) {
      return `${hardware.deviceId} · ${state}`;
    }
    return state;
  }

  getHardwareHeartbeatText(snapshot: HardwareRuntimeSnapshot | null): string {
    const heartbeat = snapshot?.hardware?.lastHeartbeatAt || snapshot?.hardware?.latestHeartbeat?.timestamp;
    if (!heartbeat) {
      return 'heartbeat: n/a';
    }
    return `heartbeat: ${this.compactTimestamp(heartbeat)}`;
  }

  getHardwareCommandText(snapshot: HardwareRuntimeSnapshot | null): string {
    const command = snapshot?.hardware?.lastCommand;
    if (!command) {
      return 'command: none';
    }
    return `command: ${command.kind} · ${command.status ?? 'ack'}`;
  }

  getHardwareEndpointText(snapshot: HardwareRuntimeSnapshot | null): string {
    const hardware = snapshot?.hardware;
    if (!hardware) {
      return '等待本地 runtime 返回硬件连接状态';
    }
    const broker = hardware.broker ? `${hardware.broker}:${hardware.port ?? '1883'}` : 'broker: n/a';
    const deviceId = hardware.deviceId ? `device: ${hardware.deviceId}` : 'device: n/a';
    return `${broker} · ${deviceId}`;
  }

  getHardwareDeviceSummary(snapshot: HardwareRuntimeSnapshot | null): string {
    const devices = snapshot?.hardware?.latestHeartbeat?.devices ?? [];
    if (!devices.length) {
      return '当前没有在线设备';
    }

    const labels = devices
      .map((device) => device.deviceName || device.deviceType || device.devicePort || device.devicePath)
      .filter((label) => Boolean(label))
      .slice(0, 3);

    if (!labels.length) {
      return `在线设备 ${devices.length} 个`;
    }

    const summary = labels.join(' / ');
    return devices.length > labels.length ? `${summary} 等 ${devices.length} 个设备` : summary;
  }

  private normalizeHardwareState(state: string): string {
    const normalized = state.trim().toLowerCase();
    if (
      normalized === 'connected'
      || normalized === 'connecting'
      || normalized === 'disconnected'
      || normalized === 'error'
      || normalized === 'disabled'
    ) {
      return normalized;
    }
    return 'connecting';
  }

  private compactTimestamp(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  showFloatSider = false;
  private isPinnedFloatSiderRoute = false;

  // 监听鼠标位置，当鼠标在右边缘70px范围内时显示浮动侧边栏
  onMouseMove(event: MouseEvent): void {
    if (this.isPinnedFloatSiderRoute) {
      this.showFloatSider = true;
      return;
    }

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const mouseX = event.clientX;
    const rightEdge = rect.right;
    const threshold = 70; // 右边缘阈值距离

    // 当鼠标在右边缘70px范围内时显示浮动侧边栏
    if (rightEdge - mouseX <= threshold) {
      this.showFloatSider = true;
    } else {
      this.showFloatSider = false;
    }
  }

  // 鼠标离开时隐藏浮动侧边栏
  onMouseLeave(): void {
    if (this.isPinnedFloatSiderRoute) {
      this.showFloatSider = true;
      return;
    }

    this.showFloatSider = false;
  }

  private syncFloatSiderRoute(url: string): void {
    this.isPinnedFloatSiderRoute = url.includes('/main/tesseract-studio');
    this.showFloatSider = this.isPinnedFloatSiderRoute;
  }

  exportLog() {
    this.logComponent?.exportData();
  }

  // 新手引导关闭事件
  onOnboardingClosed() {
    this.onboardingService.close();
  }

  // 新手引导完成事件
  onOnboardingCompleted() {
    this.onboardingService.complete();
  }

}
