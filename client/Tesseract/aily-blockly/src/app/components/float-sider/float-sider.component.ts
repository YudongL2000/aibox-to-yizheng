/**
 * [INPUT]: 依赖 ProjectService 的项目上下文、UiService 的子窗口能力、Electron env 配置与侧边栏点击事件。
 * [OUTPUT]: 对外提供 FloatSiderComponent 浮动侧边栏，暴露项目设置、模型库、数字孪生等快捷入口。
 * [POS]: components/float-sider 的交互入口层，挂载在 Tesseract/legacy 工作区右侧，负责把用户动作路由到工具或子窗口。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { Component, Input, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../services/project.service';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ElectronService } from '../../services/electron.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { UiService } from '../../services/ui.service';
import { ConnectionGraphService } from '../../services/connection-graph.service';
import { BackgroundAgentService } from '../../services/background-agent.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ImageViewerComponent } from '../image-viewer/image-viewer.component';

const DEFAULT_DIGITAL_TWIN_URL = 'http://127.0.0.1:18082/index.html';
const DIGITAL_TWIN_WINDOW_TITLE = '数字孪生工作台';

@Component({
  selector: 'app-float-sider',
  imports: [
    NzToolTipModule,
    CommonModule,
    TranslateModule,
    ImageViewerComponent
  ],
  templateUrl: './float-sider.component.html',
  styleUrl: './float-sider.component.scss'
})
export class FloatSiderComponent implements OnInit, OnDestroy {
  @Input() show = false;
  @ViewChild('imageViewer') imageViewer!: ImageViewerComponent;

  loaded = false;
  workspaceMode: 'none' | 'legacy' | 'tesseract' = 'none';
  private routerSubscription: Subscription | undefined;

  constructor(
    private projectService: ProjectService,
    private router: Router,
    private electronService: ElectronService,
    private message: NzMessageService,
    private uiService: UiService,
    private connectionGraphService: ConnectionGraphService,
    private backgroundAgent: BackgroundAgentService,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    // 监听路由变化
    this.syncWorkspaceMode(this.router.url);
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.syncWorkspaceMode(event.url);
      });
  }

  ngOnDestroy() {
    // 清理订阅
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  boardPackagePath;
  get hasProjectContext(): boolean {
    return Boolean(this.projectService.currentProjectPath);
  }

  async loadBoardInfo() {
    if (!this.hasProjectContext) {
      this.boardPackagePath = null;
      return;
    }

    setTimeout(async () => {
      try {
        this.boardPackagePath = await this.projectService.getBoardPackagePath();
        console.log('Board Package Path:', this.boardPackagePath);
      } catch (error) {
        this.boardPackagePath = null;
        console.warn('[FloatSider] loadBoardInfo failed:', error);
      }
    }, 1000); // 延时1秒，确保项目服务已准备好
  }

  private syncWorkspaceMode(url: string): void {
    if (url.indexOf('/main/tesseract-studio') !== -1) {
      this.loaded = true;
      this.workspaceMode = 'tesseract';
      if (this.hasProjectContext) {
        this.loadBoardInfo();
      } else {
        this.boardPackagePath = null;
      }
      return;
    }

    if (url.indexOf('/main/blockly-editor') !== -1) {
      this.loaded = true;
      this.workspaceMode = 'legacy';
      this.loadBoardInfo();
      return;
    }

    this.loaded = false;
    this.workspaceMode = 'none';
    this.boardPackagePath = null;
  }

  showPinmap() {
    const pinmapJsonPath = this.boardPackagePath + '/pinmap.json';
    if (this.electronService.exists(pinmapJsonPath)) {
      // 使用子窗口打开，通过 URL 查询参数传递文件路径
      // this.uiService.openWindow({
      //   path: `pinjson?filePath=${encodeURIComponent(pinjsonPath)}`,
      //   width: 800,
      //   height: 600
      // });
      this.uiService.openWindow({
        path: `iframe?url=${encodeURIComponent('https://tool.aily.pro/component-viewer?type=json&theme=dark')}`,
        // path: `iframe?url=${encodeURIComponent('http://localhost:3051/component-viewer?type=json')}`,
        data: this.electronService.readFile(pinmapJsonPath),
        width: 800,
        height: 600
      });
      return;
    }
    const pinmapWebpPath = this.boardPackagePath + '/pinmap.webp';
    if (this.electronService.exists(pinmapWebpPath)) {
      this.imageViewer.open(pinmapWebpPath);
      return;
    }
    this.message.error(this.translate.instant('FLOAT_SIDER.NO_PINMAP'));
  }


  async openDocUrl() {
    let data = await this.projectService.getPackageJson();
    if (data.doc_url) {
      this.electronService.openUrl(data.doc_url);
      return;
    }

    data = JSON.parse(this.electronService.readFile(this.boardPackagePath + '/package.json'))
    if (data.url) {
      this.electronService.openUrl(data.url)
      return;
    }
    this.message.error(this.translate.instant('FLOAT_SIDER.NO_DOCUMENTATION'));
  }

  openSettings() {
    this.uiService.openProjectSettings();
  }

  openFeedback() {
    this.uiService.openFeedback();
  }

  openHistory() {
    this.uiService.openHistory();
  }

  showCircuit() {
    // this.message.warning(this.translate.instant('COMING SOON'));
    // return;
    if (!this.electronService.isElectron || !this.boardPackagePath) {
      this.message.warning(this.translate.instant('FLOAT_SIDER.NO_PINMAP'));
      return;
    }

    const windowUrl = 'https://tool.aily.pro/connection-graph?type=json&theme=dark';
    // const windowUrl = 'http://localhost:4201/connection-graph?type=json&theme=dark';

    // 构建连线图 payload
    const payload = this.connectionGraphService.buildPayload(this.boardPackagePath);
    console.log('[showCircuit] payload:', payload ? JSON.stringify(payload).slice(0, 500) + '...' : 'null');

    if (payload) {
      // 场景1: 有连线数据 → 直接展示 + 显示操作按钮
      this.uiService.openWindow({
        path: `iframe?url=${encodeURIComponent(windowUrl)}`,
        data: payload,
        width: 900,
        height: 700,
      });
    } else {
      // 场景2: 无连线数据 → 打开窗口 + 启动后台 Agent 自动生成
      this.uiService.openWindow({
        path: `iframe?url=${encodeURIComponent(windowUrl)}&mode=generating`,
        data: null,
        width: 900,
        height: 700,
      });
      // 延迟确保子窗口已打开并注册 IPC 监听，再启动生成
      setTimeout(() => {
        this.backgroundAgent.generateSchematic();
      }, 800);
    }
  }

  openModelLibrary() {
    this.uiService.openTool('model-store');
  }

  async openWorkflowTemplates() {
    const digitalTwinUrl = await this.resolveDigitalTwinUrl();
    this.uiService.openWindow({
      path: `iframe?url=${encodeURIComponent(digitalTwinUrl)}`,
      title: DIGITAL_TWIN_WINDOW_TITLE,
      keepAboveMain: true,
      windowRole: 'digital-twin',
      width: 1600,
      height: 960,
    });
  }

  private async resolveDigitalTwinUrl(): Promise<string> {
    const env = window['env'];
    const envKeys = [
      'AILY_TESSERACT_FRONTEND_URL',
      'TESSERACT_FRONTEND_URL',
    ];

    for (const key of envKeys) {
      try {
        const value = await env?.get?.(key);
        const resolved = this.buildDigitalTwinUrl(value);
        if (resolved) {
          return resolved;
        }
      } catch (error) {
        console.warn(`[FloatSider] resolveDigitalTwinUrl env ${key} failed:`, error);
      }
    }

    return this.buildDigitalTwinUrl(DEFAULT_DIGITAL_TWIN_URL)!;
  }

  private buildDigitalTwinUrl(baseUrl: string | null | undefined): string | null {
    const trimmed = baseUrl?.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const url = new URL(trimmed);
      if (url.pathname === '/' || url.pathname.length === 0) {
        url.pathname = '/index.html';
      }
      url.searchParams.set('entry', 'digital-twin');
      url.searchParams.set('source', 'aily-blockly');
      return url.toString();
    } catch (error) {
      console.warn('[FloatSider] invalid digital twin url:', trimmed, error);
      return null;
    }
  }

  async openThreeDModel() {
    try {
      const packagePath = this.boardPackagePath
        ? window['path'].join(this.boardPackagePath, 'package.json')
        : null;
      const boardPackage = packagePath && this.electronService.exists(packagePath)
        ? JSON.parse(this.electronService.readFile(packagePath))
        : null;

      const modelUrl = boardPackage?.model3dUrl || boardPackage?.model_3d_url || boardPackage?.model_url;
      if (modelUrl) {
        this.electronService.openUrl(modelUrl);
        return;
      }
    } catch (error) {
      console.warn('[FloatSider] openThreeDModel failed:', error);
    }

    this.uiService.openTool('model-store');
  }
}
