/**
 * [INPUT]: 依赖路由 query path/workflowId/surface、ProjectService、TesseractProjectService、UiService、DigitalTwinPanelComponent 与 Electron IPC 提供的本地 runtime/n8n 能力。
 * [OUTPUT]: 对外提供 TesseractStudioComponent，承载项目级 Tesseract 工作区、本地 n8n 编辑器与由 shell header 驱动的 workflow/digital-twin 主视图；项目工作区默认优先落到 digital-twin，显式 workflow 引用则优先打开 workflow。
 * [POS]: editors/tesseract-studio 的页面入口，负责同步当前工作区上下文、聚焦指定 workflow、对齐 shell 顶部 tab 状态、清理 embedded n8n 干扰提示，并把 workflow 画布与 digital twin 组织成同级主页面。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  NO_ERRORS_SCHEMA,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subscription } from 'rxjs';
import { DigitalTwinPanelComponent } from '../../components/digital-twin-panel/digital-twin-panel.component';
import { ProjectService } from '../../services/project.service';
import {
  TesseractManifest,
  TesseractProjectService,
  TesseractWorkflowSnapshot,
  TesseractWorkflowViewTarget,
} from '../../services/tesseract-project.service';
import { UiService } from '../../services/ui.service';

const STUDIO_SURFACE_STORAGE_PREFIX = 'tesseract-studio.surface.';
type StudioSurface = 'workflow' | 'digital-twin';

@Component({
  selector: 'app-tesseract-studio',
  standalone: true,
  imports: [CommonModule, NzButtonModule, DigitalTwinPanelComponent],
  templateUrl: './tesseract-studio.component.html',
  styleUrl: './tesseract-studio.component.scss',
  schemas: [NO_ERRORS_SCHEMA],
})
export class TesseractStudioComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('workspaceFrame') workspaceFrame?: ElementRef<any>;

  projectPath = '';
  requestedWorkflowId = '';
  manifest: TesseractManifest | null = null;
  snapshot: TesseractWorkflowSnapshot | null = null;
  safeEditorUrl: SafeResourceUrl | null = null;
  editorUrl = '';
  agentStatus: any = null;
  n8nStatus: any = null;
  loading = true;
  embeddedCredentials: { email: string; password: string } | null = null;
  embeddedAutoLoginAttempted = false;
  pendingWorkflowTarget: TesseractWorkflowViewTarget | null = null;
  activeSurface: StudioSurface = 'workflow';

  private boundWorkspaceFrame: any = null;
  private routeSubscription?: Subscription;
  private workflowViewSyncSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private message: NzMessageService,
    private projectService: ProjectService,
    private tesseractProjectService: TesseractProjectService,
    private uiService: UiService
  ) {}

  private get electronAPI() {
    return window.electronAPI;
  }

  get hasProjectWorkspace(): boolean {
    return Boolean(this.projectPath);
  }

  get isChromelessWorkspace(): boolean {
    return !this.hasProjectWorkspace;
  }

  get workspaceTitle(): string {
    return this.manifest?.projectName || (this.hasProjectWorkspace ? 'Tesseract Project' : 'Local n8n Workspace');
  }

  get workspaceDescription(): string {
    if (this.hasProjectWorkspace) {
      return this.projectPath;
    }

    return '当前还没有生成目标工作流，生成完成后这里会自动切换到对应画布。';
  }

  get activeWorkflowId(): string {
    return this.requestedWorkflowId || this.snapshot?.workflowId || '';
  }

  get showEmbeddedDigitalTwinPanel(): boolean {
    return true;
  }

  get showSurfaceTabs(): boolean {
    return this.showEmbeddedDigitalTwinPanel && !this.useShellHeaderTabs;
  }

  get useShellHeaderTabs(): boolean {
    return this.uiService.isSingleWindowUi;
  }

  get isWorkflowSurfaceActive(): boolean {
    return this.activeSurface === 'workflow';
  }

  get isDigitalTwinSurfaceActive(): boolean {
    return this.activeSurface === 'digital-twin' && this.showEmbeddedDigitalTwinPanel;
  }

  get hasGeneratedWorkflow(): boolean {
    return Boolean(this.activeWorkflowId);
  }

  get showWorkflowPlaceholder(): boolean {
    return !this.hasGeneratedWorkflow;
  }

  get showWorkflowSyncPending(): boolean {
    return !this.loading && !this.showWorkflowPlaceholder && !this.safeEditorUrl && !this.hasRuntimeFailure;
  }

  get hasRuntimeFailure(): boolean {
    return Boolean(this.agentStatus?.healthy === false || this.n8nStatus?.healthy === false);
  }

  get isAgentOffline(): boolean {
    return this.agentStatus?.healthy === false;
  }

  get isN8nOffline(): boolean {
    return this.n8nStatus?.healthy === false;
  }

  get canUseAgentActions(): boolean {
    return !this.isAgentOffline;
  }

  get runtimeErrorSummary(): string {
    return this.n8nStatus?.lastError || this.agentStatus?.lastError || '本地运行时未能启动。';
  }

  get workflowTabSubtitle(): string {
    if (this.loading) {
      return '正在初始化本地 n8n 画布';
    }
    if (this.hasGeneratedWorkflow) {
      return this.activeWorkflowId
        ? `n8n / ${this.activeWorkflowId}`
        : '目标 workflow 已就绪';
    }
    return '等待 AI 生成 workflow';
  }

  get workflowTabStatusLabel(): string {
    if (this.loading) {
      return '启动中';
    }
    return this.hasGeneratedWorkflow ? '已就绪' : '待生成';
  }

  get digitalTwinTabSubtitle(): string {
    return '硬件挂载、组装检测与现场联调';
  }

  get digitalTwinTabStatusLabel(): string {
    if (this.loading) {
      return '初始化';
    }
    return this.agentStatus?.healthy === false ? '只读' : '实时';
  }

  get digitalTwinPanelState(): Record<string, unknown> | undefined {
    return this.uiService.getWorkbenchPayload<Record<string, unknown>>('digital-twin');
  }

  ngOnInit(): void {
    this.workflowViewSyncSubscription = this.tesseractProjectService.workflowViewTarget$.subscribe((target) => {
      void this.handleWorkflowViewTarget(target);
    });

    this.routeSubscription = this.route.queryParams.subscribe(async (params) => {
      const nextProjectPath = this.resolveRouteProjectPath(params['path']);
      const nextWorkflowId = this.resolveRequestedWorkflowId(
        nextProjectPath,
        params['workflowId']
      );
      const nextSurface = this.resolveRequestedSurface(
        nextProjectPath || null,
        params['surface'],
        nextWorkflowId
      );
      const workspaceChanged =
        nextProjectPath !== this.projectPath
        || nextWorkflowId !== this.requestedWorkflowId;

      this.projectPath = nextProjectPath;
      this.requestedWorkflowId = nextWorkflowId;
      this.applyActiveSurface(nextSurface);

      if (this.projectPath) {
        this.projectService.currentProjectPath = this.projectPath;
      }

      if (String(params['surface'] || '').trim() !== this.activeSurface) {
        void this.syncSurfaceQueryParam();
      }

      if (workspaceChanged || this.loading) {
        await this.loadWorkspace();
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.workflowViewSyncSubscription?.unsubscribe();
  }

  ngAfterViewChecked(): void {
    this.bindWorkspaceWebview();
  }

  setActiveSurface(surface: StudioSurface): void {
    if (surface === 'digital-twin' && !this.showEmbeddedDigitalTwinPanel) {
      return;
    }

    if (this.activeSurface === surface) {
      return;
    }

    this.applyActiveSurface(surface);
    void this.syncSurfaceQueryParam();
  }

  openDigitalTwinSurface(): void {
    this.setActiveSurface('digital-twin');
  }

  async loadWorkspace(): Promise<void> {
    this.loading = true;
    this.embeddedAutoLoginAttempted = false;
    this.editorUrl = '';
    this.safeEditorUrl = null;
    this.boundWorkspaceFrame = null;
    this.pendingWorkflowTarget = this.tesseractProjectService.peekWorkflowViewTarget(
      this.projectPath || null
    );

    if (!this.requestedWorkflowId && this.pendingWorkflowTarget?.workflowId) {
      this.requestedWorkflowId = this.pendingWorkflowTarget.workflowId;
    }

    this.manifest = this.hasProjectWorkspace
      ? this.tesseractProjectService.readManifest(this.projectPath)
      : null;
    this.snapshot = this.hasProjectWorkspace
      ? this.tesseractProjectService.readWorkflowSnapshot(this.projectPath)
      : null;
    this.embeddedCredentials = this.hasProjectWorkspace
      ? null
      : await this.readEmbeddedCredentials();

    if (this.hasProjectWorkspace) {
      try {
        this.agentStatus = await this.electronAPI.tesseract.start({
          projectPath: this.projectPath,
          port: this.manifest?.runtime.agentPort,
        });
      } catch (error: any) {
        this.agentStatus = { healthy: false, lastError: error?.message || String(error) };
      }
    } else {
      this.agentStatus = null;
    }

    try {
      this.n8nStatus = await this.electronAPI.n8n.start({
        projectPath: this.projectPath || undefined,
        port: this.manifest?.runtime.n8nPort,
      });

      if (!this.showWorkflowPlaceholder) {
        await this.refreshEditorUrl();
      }
    } catch (error: any) {
      this.n8nStatus = { healthy: false, lastError: error?.message || String(error) };
      this.editorUrl = '';
      this.safeEditorUrl = null;
    }

    if (
      this.pendingWorkflowTarget?.workflowId
      && !this.safeEditorUrl
      && !this.showWorkflowPlaceholder
      && this.n8nStatus?.healthy
    ) {
      await this.refreshEditorUrl();
    }

    this.loading = false;
  }

  async refreshWorkspace(): Promise<void> {
    await this.loadWorkspace();
  }

  async retryN8nRuntime(): Promise<void> {
    try {
      this.n8nStatus = await this.electronAPI.n8n.start({
        projectPath: this.projectPath || undefined,
        port: this.manifest?.runtime.n8nPort,
      });
      if (this.n8nStatus?.healthy && !this.showWorkflowPlaceholder) {
        await this.refreshEditorUrl();
      }
    } catch (error: any) {
      this.n8nStatus = { healthy: false, lastError: error?.message || 'n8n 启动失败' };
    }
  }

  async openLogDirectory(): Promise<void> {
    try {
      await this.electronAPI.log.openArchiveDirectory();
    } catch (error: any) {
      this.message.error(error?.message || '打开日志目录失败');
    }
  }

  async copyRuntimeErrorSummary(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.runtimeErrorSummary);
      this.message.success('已复制最近错误摘要');
    } catch (error: any) {
      this.message.error(error?.message || '复制错误摘要失败');
    }
  }

  async saveSnapshot(): Promise<void> {
    if (!this.canUseAgentActions) {
      this.message.warning('Agent offline，当前不可保存工作流快照。');
      return;
    }

    if (!this.hasProjectWorkspace) {
      this.message.warning('当前是全局 n8n 工作区，只有项目模式才会保存工作流快照。');
      return;
    }

    try {
      const result = await this.electronAPI.n8n.persistWorkflowSnapshot({
        projectPath: this.projectPath,
        snapshot: this.snapshot || {
          schemaVersion: 1,
          projectName: this.manifest?.projectName || this.electronAPI.path.basename(this.projectPath),
          metadata: {
            savedFrom: 'tesseract-studio',
          },
        },
      });
      this.snapshot = result.snapshot;
      this.message.success('工作流快照已保存');
    } catch (error: any) {
      this.message.error(error?.message || '保存工作流快照失败');
    }
  }

  async deployWorkflow(): Promise<void> {
    if (!this.canUseAgentActions) {
      this.message.warning('Agent offline，当前不可部署工作流。');
      return;
    }

    if (!this.hasProjectWorkspace) {
      this.message.warning('请先打开一个 Tesseract 项目，再把工作流部署到本地 n8n。');
      return;
    }

    if (!this.snapshot?.workflow) {
      this.message.warning('当前项目还没有可部署的工作流，请先通过 Tesseract Chat 生成流程');
      return;
    }

    try {
      await this.electronAPI.n8n.start({
        projectPath: this.projectPath,
        port: this.manifest?.runtime.n8nPort,
      });
      const result = await this.electronAPI.tesseract.deployWorkflow({
        projectPath: this.projectPath,
        workflow: this.snapshot.workflow,
      });
      this.snapshot = this.tesseractProjectService.readWorkflowSnapshot(this.projectPath);
      this.message.success(`已部署到本地 n8n: ${result.workflowId}`);
      await this.refreshEditorUrl();
    } catch (error: any) {
      this.message.error(error?.message || '部署到本地 n8n 失败');
    }
  }

  async openExternally(): Promise<void> {
    if (!this.hasGeneratedWorkflow) {
      this.message.warning('当前工作区还没有生成工作流，生成完成后这里才会打开对应画布。');
      return;
    }

    try {
      await this.electronAPI.n8n.openWorkflow({
        projectPath: this.projectPath || undefined,
        workflowId: this.activeWorkflowId || undefined,
      });
    } catch (error: any) {
      this.message.error(error?.message || '打开本地 n8n 失败');
    }
  }

  private async refreshEditorUrl(): Promise<void> {
    const workflowId = this.activeWorkflowId || undefined;
    if (!workflowId) {
      this.editorUrl = '';
      this.safeEditorUrl = null;
      return;
    }

    const result = await this.electronAPI.n8n.getEditorUrl({
      projectPath: this.projectPath || undefined,
      workflowId,
    });
    if (this.hasProjectWorkspace) {
      this.snapshot = this.tesseractProjectService.persistWorkflowSnapshot(this.projectPath, {
        workflowId,
        workflowUrl: result?.url || this.snapshot?.workflowUrl || null,
      });
    }
    this.editorUrl = this.buildEmbeddedEditorUrl(result?.url || '');
    this.safeEditorUrl = this.editorUrl
      ? this.sanitizer.bypassSecurityTrustResourceUrl(this.editorUrl)
      : null;
    await this.syncWorkspaceFrameUrl();

    this.pendingWorkflowTarget = null;
    this.tesseractProjectService.acknowledgeWorkflowViewTarget(this.projectPath || null, workflowId);
  }

  private resolveRouteProjectPath(routeProjectPath: unknown): string {
    const explicitProjectPath = String(routeProjectPath || '').trim();
    if (explicitProjectPath) {
      return explicitProjectPath;
    }

    const currentProjectPath = String(this.projectService.currentProjectPath || '').trim();
    if (!currentProjectPath) {
      return '';
    }

    return this.tesseractProjectService.getProjectMode(currentProjectPath) === 'tesseract'
      ? currentProjectPath
      : '';
  }

  private resolveRequestedWorkflowId(projectPath: string, routeWorkflowId: unknown): string {
    const explicitWorkflowId = String(routeWorkflowId || '').trim();
    if (explicitWorkflowId) {
      return explicitWorkflowId;
    }

    return this.tesseractProjectService.peekWorkflowViewTarget(projectPath || null)?.workflowId || '';
  }

  private async handleWorkflowViewTarget(target: TesseractWorkflowViewTarget | null): Promise<void> {
    const targetProjectPath = String(target?.projectPath || '').trim();
    const targetWorkflowId = String(target?.workflowId || '').trim();
    if (!target || !targetWorkflowId) {
      return;
    }

    const routeProjectPath = String(this.projectPath || '').trim();
    const liveProjectPath = String(this.projectService.currentProjectPath || '').trim();
    const currentWorkspaceKey = this.tesseractProjectService.getWorkspaceKey(routeProjectPath || null);
    const liveWorkspaceKey = this.tesseractProjectService.getWorkspaceKey(
      liveProjectPath && this.tesseractProjectService.getProjectMode(liveProjectPath) === 'tesseract'
        ? liveProjectPath
        : null
    );
    const canAdoptIntoEmptyWorkspace =
      currentWorkspaceKey === this.tesseractProjectService.globalWorkspaceKey
      && !this.activeWorkflowId
      && (
        liveWorkspaceKey === this.tesseractProjectService.globalWorkspaceKey
        || liveWorkspaceKey === target.workspaceKey
      );

    if (
      currentWorkspaceKey !== target.workspaceKey
      && !canAdoptIntoEmptyWorkspace
    ) {
      return;
    }

    this.pendingWorkflowTarget = target;
    const routeWorkflowId = String(this.route.snapshot.queryParamMap.get('workflowId') || '').trim();
    const routeNeedsSync =
      routeProjectPath !== targetProjectPath
      || routeWorkflowId !== targetWorkflowId;

    if (routeNeedsSync) {
      const queryParams: Record<string, string> = {
        workflowId: targetWorkflowId,
      };
      if (targetProjectPath) {
        queryParams['path'] = targetProjectPath;
      }

      await this.router.navigate(['/main/tesseract-studio'], {
        queryParams,
        replaceUrl: true,
      });
      return;
    }

    this.requestedWorkflowId = targetWorkflowId;
    if (targetProjectPath) {
      this.snapshot = this.tesseractProjectService.persistWorkflowSnapshot(targetProjectPath, {
        workflowId: targetWorkflowId,
        workflowUrl: target.workflowUrl || null,
      });
    }

    if (this.loading) {
      return;
    }

    await this.refreshEditorUrl();
  }

  private buildEmbeddedEditorUrl(url: string): string {
    if (!url) {
      return '';
    }

    try {
      const nextUrl = new URL(url);
      nextUrl.searchParams.set('embedded', 'electron');
      nextUrl.searchParams.set('ts', String(Date.now()));
      return nextUrl.toString();
    } catch {
      return url;
    }
  }

  private async readEmbeddedCredentials(): Promise<{ email: string; password: string } | null> {
    try {
      return await this.electronAPI.n8n.getEmbeddedCredentials();
    } catch (error) {
      console.warn('[TesseractStudio] Failed to read embedded n8n credentials', error);
      return null;
    }
  }

  private resolveRequestedSurface(
    projectPath: string | null,
    routeSurface: unknown,
    workflowId: string
  ): StudioSurface {
    const explicitSurface = String(routeSurface || '').trim();
    if (explicitSurface === 'digital-twin') {
      return 'digital-twin';
    }
    if (explicitSurface === 'workflow') {
      return 'workflow';
    }

    if (workflowId) {
      return 'workflow';
    }

    return this.readStoredActiveSurface(projectPath);
  }

  private applyActiveSurface(surface: StudioSurface): void {
    this.activeSurface = surface;
    this.persistActiveSurface();
  }

  private async syncSurfaceQueryParam(): Promise<void> {
    const queryParams: Record<string, string> = {
      surface: this.activeSurface,
    };
    if (this.projectPath) {
      queryParams['path'] = this.projectPath;
    }
    if (this.requestedWorkflowId) {
      queryParams['workflowId'] = this.requestedWorkflowId;
    }

    await this.router.navigate(['/main/tesseract-studio'], {
      queryParams,
      replaceUrl: true,
    });
  }

  private readStoredActiveSurface(projectPath: string | null): StudioSurface {
    if (!projectPath) {
      return 'workflow';
    }

    try {
      const rawValue = String(
        window.localStorage.getItem(this.buildSurfaceStorageKey(projectPath)) || ''
      ).trim();
      return rawValue === 'workflow' ? 'workflow' : 'digital-twin';
    } catch {
      return 'digital-twin';
    }
  }

  private persistActiveSurface(): void {
    if (!this.showEmbeddedDigitalTwinPanel) {
      return;
    }

    try {
      window.localStorage.setItem(
        this.buildSurfaceStorageKey(this.projectPath || null),
        this.activeSurface
      );
    } catch {
      // Ignore storage failures and keep the current in-memory workspace tab.
    }
  }

  private buildSurfaceStorageKey(projectPath: string | null): string {
    return `${STUDIO_SURFACE_STORAGE_PREFIX}${this.tesseractProjectService.getWorkspaceKey(projectPath)}`;
  }

  private bindWorkspaceWebview(): void {
    const webview = this.workspaceFrame?.nativeElement;
    if (!webview || this.boundWorkspaceFrame === webview) {
      return;
    }

    this.boundWorkspaceFrame = webview;
    webview.addEventListener('dom-ready', () => {
      void this.handleWorkspaceDomReady();
    });
    webview.addEventListener('did-stop-loading', () => {
      void this.syncWorkspaceFrameUrl();
    });
  }

  private async handleWorkspaceDomReady(): Promise<void> {
    const webview = this.workspaceFrame?.nativeElement;
    if (!webview) {
      return;
    }

    await this.syncWorkspaceFrameUrl();
    await this.suppressEmbeddedN8nPrompts(webview);

    if (this.hasProjectWorkspace || this.embeddedAutoLoginAttempted || !this.embeddedCredentials) {
      return;
    }

    try {
      const pageInfo = await webview.executeJavaScript(
        `(() => ({
          href: window.location.href,
          isSignIn: window.location.pathname.includes('/signin')
            || ((document.body?.innerText || '').includes('Sign in')
              && !!document.querySelector('input[type="password"]'))
        }))();`,
        true
      );

      if (!pageInfo?.isSignIn) {
        return;
      }

      this.embeddedAutoLoginAttempted = true;
      const email = JSON.stringify(this.embeddedCredentials.email);
      const password = JSON.stringify(this.embeddedCredentials.password);
      const targetUrl = JSON.stringify(this.editorUrl);
      const loginResult = await webview.executeJavaScript(
        `(async () => {
          const browserIdKey = 'n8n-browserId';
          let browserId = localStorage.getItem(browserIdKey);
          if (!browserId) {
            browserId = (globalThis.crypto?.randomUUID?.() || ('electron-' + Date.now()));
            localStorage.setItem(browserIdKey, browserId);
          }

          const response = await fetch('/rest/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'browser-id': browserId,
            },
            body: JSON.stringify({
              emailOrLdapLoginId: ${email},
              password: ${password},
            }),
          });

          const text = response.ok ? '' : await response.text();
          if (response.ok) {
            window.location.replace(${targetUrl});
          }

          return {
            ok: response.ok,
            status: response.status,
            text,
          };
        })();`,
        true
      );

      if (!loginResult?.ok) {
        throw new Error(loginResult?.text || `HTTP ${loginResult?.status || 'unknown'}`);
      }

      console.info('[TesseractStudio] Embedded n8n auto-login succeeded', loginResult);
    } catch (error) {
      console.warn('[TesseractStudio] Embedded n8n auto-login failed', error);
    }
  }

  private async syncWorkspaceFrameUrl(): Promise<void> {
    const webview = this.workspaceFrame?.nativeElement;
    if (!webview || !this.editorUrl) {
      return;
    }

    const currentUrl = String(
      typeof webview.getURL === 'function'
        ? webview.getURL()
        : webview.getAttribute?.('src') || webview.src || ''
    ).trim();
    if (currentUrl === this.editorUrl) {
      return;
    }

    try {
      if (typeof webview.loadURL === 'function') {
        await Promise.resolve(webview.loadURL(this.editorUrl));
        return;
      }

      if (typeof webview.setAttribute === 'function') {
        webview.setAttribute('src', this.editorUrl);
      }
      webview.src = this.editorUrl;
    } catch (error) {
      console.warn('[TesseractStudio] Failed to sync embedded workflow url', error);
    }
  }

  private async suppressEmbeddedN8nPrompts(webview: any): Promise<void> {
    try {
      await webview.executeJavaScript(
        `(() => {
          const STYLE_ID = 'tesseract-embedded-n8n-cleanup';
          const MARKER_KEY = '__tesseractN8nPromptCleanupInstalled';
          const shouldHideByText = (value) => {
            const text = String(value || '').replace(/\\s+/g, ' ').trim().toLowerCase();
            if (!text) return false;
            return text.includes('one click credential setup')
              || text.includes('setting up credentials on n8n cloud is easier for supported services');
          };

          const hidePromptNode = (node) => {
            if (!(node instanceof HTMLElement)) return;
            const host =
              node.closest('[role="tooltip"], [role="dialog"], [class*="tooltip"], [class*="popover"], [class*="notice"], [class*="toast"], [class*="callout"]')
              || node;
            host.style.setProperty('display', 'none', 'important');
            host.setAttribute('data-tesseract-hidden', 'credential-setup');
          };

          const scrub = () => {
            const trigger = document.querySelector('[data-test-id="setup-credentials-button"]');
            if (trigger instanceof HTMLElement) {
              hidePromptNode(trigger);
            }

            const elements = document.body ? Array.from(document.body.querySelectorAll('*')) : [];
            for (const element of elements) {
              if (element instanceof HTMLElement && shouldHideByText(element.innerText)) {
                hidePromptNode(element);
              }
            }
          };

          if (!document.getElementById(STYLE_ID)) {
            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.textContent = [
              '[data-test-id="setup-credentials-button"] { display: none !important; }',
              '[data-tesseract-hidden="credential-setup"] { display: none !important; }',
            ].join('\\n');
            document.head.appendChild(style);
          }

          scrub();

          if (!window[MARKER_KEY]) {
            let scheduled = false;
            const observer = new MutationObserver(() => {
              if (scheduled) return;
              scheduled = true;
              requestAnimationFrame(() => {
                scheduled = false;
                scrub();
              });
            });

            if (document.body) {
              observer.observe(document.body, {
                childList: true,
                subtree: true,
              });
            }

            window[MARKER_KEY] = true;
          }

          return true;
        })();`,
        true
      );
    } catch (error) {
      console.warn('[TesseractStudio] Failed to suppress embedded n8n prompts', error);
    }
  }
}
