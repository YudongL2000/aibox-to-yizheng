/**
 * [INPUT]: 依赖 TesseractProjectService 与浏览器侧 fs/path mock。
 * [OUTPUT]: 对外提供 TesseractProjectService 的模式判定、快照持久化与 workflow 视图同步目标测试。
 * [POS]: services 层的项目真相源测试文件，锁住占位态与 workflow 目标同步契约。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { TesseractProjectService } from './tesseract-project.service';

describe('TesseractProjectService', () => {
  let service: TesseractProjectService;
  let files: Map<string, string>;

  const normalize = (...parts: string[]) => parts.join('/').replace(/\/+/g, '/');

  beforeEach(() => {
    files = new Map<string, string>();

    (window as any).path = {
      join: (...parts: string[]) => normalize(...parts),
      basename: (value: string) => value.split('/').filter(Boolean).pop() || value,
    };

    (window as any).fs = {
      existsSync: (filePath: string) => files.has(filePath),
      mkdirSync: (dirPath: string) => {
        files.set(dirPath, '__dir__');
      },
      writeFileSync: (filePath: string, content: string) => {
        files.set(filePath, content);
      },
      readFileSync: (filePath: string) => files.get(filePath),
    };

    service = new TesseractProjectService();
  });

  it('routes tesseract, blockly, and code projects by marker file', () => {
    files.set(normalize('/demo', '.tesseract', 'manifest.json'), '{}');
    expect(service.getProjectMode('/demo')).toBe('tesseract');

    files.delete(normalize('/demo', '.tesseract', 'manifest.json'));
    files.set(normalize('/demo', 'project.abi'), '{}');
    expect(service.getProjectMode('/demo')).toBe('blockly');

    files.delete(normalize('/demo', 'project.abi'));
    expect(service.getProjectMode('/demo')).toBe('code');
  });

  it('creates manifest and workflow snapshot for new tesseract projects', () => {
    service.ensureProjectScaffold('/demo', {
      projectName: 'demo',
      board: {
        name: 'esp32',
        nickname: 'ESP32',
        version: '1.0.0',
      },
      devmode: 'arduino',
    });

    const manifest = JSON.parse(files.get(normalize('/demo', '.tesseract', 'manifest.json')) || '{}');
    const workflow = JSON.parse(files.get(normalize('/demo', '.tesseract', 'workflow.json')) || '{}');

    expect(manifest.projectName).toBe('demo');
    expect(manifest.preferredChatMode).toBe('tesseract');
    expect(workflow.projectName).toBe('demo');
    expect(workflow.workflow).toBeNull();
  });

  it('publishes workflow view targets for the active workspace', () => {
    const events: any[] = [];
    const subscription = service.workflowViewTarget$.subscribe((value) => {
      events.push(value);
    });

    const target = service.publishWorkflowViewTarget({
      projectPath: '/demo',
      workflowId: 'wf-42',
      workflowUrl: 'http://127.0.0.1:5678/workflow/wf-42',
      source: 'chat-create',
    });

    expect(target).toEqual(jasmine.objectContaining({
      workspaceKey: '/demo',
      projectPath: '/demo',
      workflowId: 'wf-42',
      workflowUrl: 'http://127.0.0.1:5678/workflow/wf-42',
      source: 'chat-create',
    }));
    expect(events.at(-1)).toEqual(jasmine.objectContaining({
      workspaceKey: '/demo',
      projectPath: '/demo',
      workflowId: 'wf-42',
    }));

    subscription.unsubscribe();
  });

  it('syncs workflow snapshot and live view target together', () => {
    service.ensureProjectScaffold('/demo', {
      projectName: 'demo',
    });

    const snapshot = service.syncWorkflowSnapshotAndView('/demo', {
      sessionId: 'session-1',
      workflowId: 'wf-1',
      workflowUrl: 'http://127.0.0.1:5678/workflow/wf-1',
    }, 'agent-envelope');

    expect(snapshot).toEqual(jasmine.objectContaining({
      sessionId: 'session-1',
      workflowId: 'wf-1',
      workflowUrl: 'http://127.0.0.1:5678/workflow/wf-1',
    }));
    expect(service.workflowViewTarget$).toBeDefined();
  });

  it('merges workflow metadata patches instead of replacing the whole metadata object', () => {
    service.ensureProjectScaffold('/demo', {
      projectName: 'demo',
    });

    service.persistWorkflowSnapshot('/demo', {
      metadata: {
        phase: 'hot_plugging',
        assemblyResume: {
          nodeName: 'camera_node',
          components: [{ componentId: 'camera', displayName: '摄像头' }],
          allPendingHardwareNodeNames: ['camera_node'],
        },
      },
    });

    const snapshot = service.persistHardwareDispatch('/demo', {
      lastAction: 'upload',
      receiptStatus: 'acknowledged',
      responseStatus: 'started',
      successful: true,
      updatedAt: '2026-04-15T00:00:00.000Z',
    });

    expect(snapshot.metadata).toEqual(jasmine.objectContaining({
      phase: 'hot_plugging',
      assemblyResume: jasmine.objectContaining({
        nodeName: 'camera_node',
      }),
      hardwareDispatch: jasmine.objectContaining({
        lastAction: 'upload',
        successful: true,
      }),
    }));
  });

  it('uses a stable global workspace key when project path is absent', () => {
    expect(service.getWorkspaceKey('')).toBe(service.globalWorkspaceKey);

    const target = service.publishWorkflowViewTarget({
      workflowId: 'wf-global',
      workflowUrl: 'http://127.0.0.1:5678/workflow/wf-global',
      source: 'chat-open',
    });

    expect(target).toEqual(jasmine.objectContaining({
      workspaceKey: service.globalWorkspaceKey,
      projectPath: null,
      workflowId: 'wf-global',
      source: 'chat-open',
    }));
  });

  it('keeps workflow view targets scoped to their workspace key', () => {
    service.publishWorkflowViewTarget({
      projectPath: '/project-a',
      workflowId: 'wf-a',
    });

    expect(service.peekWorkflowViewTarget('/project-a')).toEqual(jasmine.objectContaining({
      workflowId: 'wf-a',
    }));
    expect(service.peekWorkflowViewTarget('/project-b')).toBeNull();
    expect(service.peekWorkflowViewTarget(null)).toBeNull();
  });
});
