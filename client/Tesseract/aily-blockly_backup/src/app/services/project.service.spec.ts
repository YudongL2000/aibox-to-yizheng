import { TesseractProjectService } from './tesseract-project.service';

describe('ProjectService.projectOpen', () => {
  let ProjectServiceClass: any;
  let service: any;
  let router: any;
  let files: Map<string, string>;

  const normalize = (...parts: string[]) => parts.join('/').replace(/\/+/g, '/');

  beforeAll(async () => {
    (window as any).electronAPI = {
      platform: { pt: '/' },
    };
    const module = await import('./project.service');
    ProjectServiceClass = module.ProjectService;
  });

  beforeEach(() => {
    files = new Map<string, string>();

    (window as any).path = {
      join: (...parts: string[]) => normalize(...parts),
      basename: (value: string) => value.split('/').filter(Boolean).pop() || value,
    };
    (window as any).fs = {
      existsSync: (filePath: string) => files.has(filePath),
      writeFileSync: (filePath: string, content: string) => files.set(filePath, content),
      readFileSync: (filePath: string) => files.get(filePath),
      mkdirSync: () => undefined,
    };

    router = {
      navigate: jasmine.createSpy('navigate'),
    };

    const tesseractProjectService = new TesseractProjectService();
    service = new ProjectServiceClass(
      { closeTerminal: () => undefined } as any,
      { exists: () => true } as any,
      { error: () => undefined } as any,
      router,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { instant: (key: string) => key } as any,
      {} as any,
      tesseractProjectService,
    );

    spyOn(service, 'close').and.resolveTo(undefined);
  });

  it('opens tesseract studio when manifest exists', async () => {
    files.set(normalize('/demo', '.tesseract', 'manifest.json'), '{}');

    await service.projectOpen('/demo');

    expect(router.navigate).toHaveBeenCalledWith(
      ['/main/tesseract-studio'],
      jasmine.objectContaining({ queryParams: { path: '/demo' } }),
    );
  });

  it('opens blockly editor for legacy abi projects', async () => {
    files.set(normalize('/demo', 'project.abi'), '{}');

    await service.projectOpen('/demo');

    expect(router.navigate).toHaveBeenCalledWith(
      ['/main/blockly-editor'],
      jasmine.objectContaining({ queryParams: { path: '/demo' } }),
    );
  });

  it('opens code editor for plain source projects', async () => {
    await service.projectOpen('/demo');

    expect(router.navigate).toHaveBeenCalledWith(
      ['/main/code-editor'],
      jasmine.objectContaining({ queryParams: { path: '/demo' } }),
    );
  });
});
