/**
 * [INPUT]: 依赖 TesseractSkillLibraryService 与 window.electronAPI mock。
 * [OUTPUT]: 对外提供 skills 库真相源测试，锁住列表归一化与存入后高亮信号。
 * [POS]: app/services 的 Tesseract skills 测试文件，防止 renderer 再退回 mock skills 数组。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { TesseractSkillLibraryService } from './tesseract-skill-library.service';

describe('TesseractSkillLibraryService', () => {
  let service: TesseractSkillLibraryService;
  let electronAPI: any;

  beforeEach(() => {
    electronAPI = {
      tesseract: {
        start: jasmine.createSpy('start').and.resolveTo({}),
        listSkills: jasmine.createSpy('listSkills').and.resolveTo({
          success: true,
          skills: [
            {
              skillId: 'skill-rps',
              displayName: '石头剪刀布',
              summary: '识别手势并同步机械手响应。',
              tags: ['摄像头', '机械手'],
              wakePrompt: '跟我玩石头剪刀布',
              requiredHardware: [{ displayName: '摄像头' }, { displayName: '机械手' }],
              sourceSessionId: 'trace-rps',
              workflowId: 'wf-rps',
              workflowName: '石头剪刀布控制流',
              workflow: { name: '石头剪刀布控制流' },
            },
          ],
        }),
        saveSkill: jasmine.createSpy('saveSkill').and.resolveTo({
          success: true,
          skill: {
            skillId: 'skill-water',
            displayName: '给花浇水',
            summary: '检测盆栽状态并控制执行浇水动作。',
            requiredHardware: [
              { displayName: '水泵' },
              { displayName: '机械手' },
            ],
            sourceSessionId: 'trace-water',
            workflowId: 'wf-water',
            workflowName: '浇水工作流',
            workflow: { name: '浇水工作流' },
          },
        }),
      },
    };

    (window as any).electronAPI = electronAPI;
    service = new TesseractSkillLibraryService();
  });

  it('loads real skill previews from backend result', async () => {
    const result = await service.load('/demo');

    expect(electronAPI.tesseract.start).toHaveBeenCalledWith({
      projectPath: '/demo',
    });
    expect(electronAPI.tesseract.listSkills).toHaveBeenCalledWith({
      projectPath: '/demo',
    });
    expect(result).toEqual([
      jasmine.objectContaining({
        skillId: 'skill-rps',
        displayName: '石头剪刀布',
        workflowName: '石头剪刀布控制流',
      }),
    ]);
    expect(service.snapshot[0].wakePrompt).toBe('跟我玩石头剪刀布');
  });

  it('upserts saved skill and emits incoming highlight id', async () => {
    let incomingSkillId: string | null = null;
    const subscription = service.incomingSkillId$.subscribe((value) => {
      incomingSkillId = value;
    });

    const saved = await service.save('session-1');

    expect(electronAPI.tesseract.saveSkill).toHaveBeenCalledWith({
      sessionId: 'session-1',
    });
    expect(saved).toEqual(jasmine.objectContaining({
      skillId: 'skill-water',
      tags: ['水泵', '机械手'],
      sourceSessionId: 'trace-water',
      workflowName: '浇水工作流',
    }));
    expect(service.snapshot[0].skillId).toBe('skill-water');
    expect(incomingSkillId).toBe('skill-water');

    subscription.unsubscribe();
  });
});
