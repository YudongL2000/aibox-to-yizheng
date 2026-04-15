/**
 * [INPUT]: 依赖 TesseractStudioComponent、路由/项目服务 stub 与 Electron IPC mock。
 * [OUTPUT]: 对外提供 TesseractStudioComponent 的活动工作区同步回归测试。
 * [POS]: editors/tesseract-studio 的契约测试，锁住全局活动工作区 `workflowId` 聚焦与延迟结果防串台。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { of } from 'rxjs';
import { TesseractStudioComponent } from './tesseract-studio.component';

describe('TesseractStudioComponent', () => {
  let component: TesseractStudioComponent;
  let router: jasmine.SpyObj<any>;
  let sanitizer: jasmine.SpyObj<any>;
  let message: jasmine.SpyObj<any>;
  let projectService: any;
  let tesseractProjectService: any;

  function createQueryMap(values: Record<string, string>) {
    return {
      get: (key: string) => values[key] || null,
    };
  }

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    sanitizer = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustResourceUrl']);
    sanitizer.bypassSecurityTrustResourceUrl.and.callFake((value: string) => value);
    message = jasmine.createSpyObj('NzMessageService', ['warning', 'success', 'error']);
    projectService = {
      currentProjectPath: '',
    };
    tesseractProjectService = {
      globalWorkspaceKey: '__global_tesseract_workspace__',
      workflowViewTarget$: of(null),
      getWorkspaceKey: jasmine.createSpy('getWorkspaceKey').and.callFake((projectPath?: string | null) => {
        const normalized = String(projectPath || '').trim();
        return normalized || '__global_tesseract_workspace__';
      }),
      getProjectMode: jasmine.createSpy('getProjectMode').and.returnValue('code'),
      persistWorkflowSnapshot: jasmine
        .createSpy('persistWorkflowSnapshot')
        .and.callFake((_projectPath: string, snapshot: Record<string, unknown>) => snapshot),
      readManifest: jasmine.createSpy('readManifest').and.returnValue(null),
      readWorkflowSnapshot: jasmine.createSpy('readWorkflowSnapshot').and.returnValue(null),
      acknowledgeWorkflowViewTarget: jasmine.createSpy('acknowledgeWorkflowViewTarget'),
    };

    (window as any).electronAPI = {
      n8n: {
        start: jasmine.createSpy('start').and.resolveTo({
          healthy: true,
          port: 5678,
        }),
        getEmbeddedCredentials: jasmine.createSpy('getEmbeddedCredentials').and.resolveTo(null),
      },
      tesseract: {
        start: jasmine.createSpy('start').and.resolveTo({ healthy: true }),
      },
    };

    component = new TesseractStudioComponent(
      {
        queryParams: of({}),
        snapshot: {
          queryParamMap: createQueryMap({}),
        },
      } as any,
      router,
      sanitizer,
      message,
      projectService,
      tesseractProjectService
    );
  });

  it('routes global workspace targets with workflowId only', async () => {
    component.projectPath = '';
    component.requestedWorkflowId = '';

    await (component as any).handleWorkflowViewTarget({
      workspaceKey: '__global_tesseract_workspace__',
      projectPath: null,
      workflowId: 'wf-1',
      workflowUrl: 'http://127.0.0.1:5678/workflow/wf-1',
      source: 'chat-create',
      updatedAt: '2026-04-02T00:00:00.000Z',
    });

    expect(router.navigate).toHaveBeenCalledWith(['/main/tesseract-studio'], {
      queryParams: {
        workflowId: 'wf-1',
      },
      replaceUrl: true,
    });
  });

  it('ignores delayed workflow targets from a different live workspace', async () => {
    component.projectPath = '';
    component.requestedWorkflowId = '';
    projectService.currentProjectPath = '/project-b';
    tesseractProjectService.getProjectMode.and.returnValue('tesseract');

    await (component as any).handleWorkflowViewTarget({
      workspaceKey: '/project-a',
      projectPath: '/project-a',
      workflowId: 'wf-1',
      workflowUrl: 'http://127.0.0.1:5678/workflow/wf-1',
      source: 'chat-create',
      updatedAt: '2026-04-02T00:00:00.000Z',
    });

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('warms embedded n8n even when the workspace is still showing placeholder state', async () => {
    component.projectPath = '';
    component.requestedWorkflowId = '';

    await component.loadWorkspace();

    expect((window as any).electronAPI.n8n.start).toHaveBeenCalledWith({
      projectPath: undefined,
      port: undefined,
    });
    expect(component.showWorkflowPlaceholder).toBeTrue();
    expect(component.safeEditorUrl).toBeNull();
  });
});
