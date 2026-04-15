/**
 * [INPUT]: 依赖 SkillCenterComponent 与 TesseractSkillLibraryService stub。
 * [OUTPUT]: 对外提供 Skill Center 回归测试，锁住真实空态与新技能入库高亮。
 * [POS]: tools/skill-center 的 UI 守护测试，防止“我的库”重新回退到 mock 卡片。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { TesseractSkillLibraryService } from '../../services/tesseract-skill-library.service';
import { SkillCenterComponent } from './skill-center.component';

describe('SkillCenterComponent', () => {
  let fixture: ComponentFixture<SkillCenterComponent>;
  let skillsSubject: BehaviorSubject<any[]>;
  let incomingSkillIdSubject: BehaviorSubject<string | null>;
  let loadSpy: jasmine.Spy;

  beforeEach(async () => {
    skillsSubject = new BehaviorSubject<any[]>([]);
    incomingSkillIdSubject = new BehaviorSubject<string | null>(null);
    loadSpy = jasmine.createSpy('load').and.resolveTo([]);

    await TestBed.configureTestingModule({
      imports: [SkillCenterComponent],
      providers: [
        {
          provide: TesseractSkillLibraryService,
          useValue: {
            skills$: skillsSubject.asObservable(),
            incomingSkillId$: incomingSkillIdSubject.asObservable(),
            load: loadSpy,
          },
        },
        {
          provide: NZ_MODAL_DATA,
          useValue: {
            initialView: 'library',
          },
        },
        {
          provide: NzModalRef,
          useValue: {
            close: jasmine.createSpy('close'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SkillCenterComponent);
    fixture.detectChanges();
  });

  it('renders trusted empty state instead of mock library cards', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('这里暂时还是空的');
    expect(text).not.toContain('VISION INTELLIGENCE');
    expect(loadSpy).toHaveBeenCalled();
  });

  it('highlights the incoming real skill when the library updates', () => {
    skillsSubject.next([
      {
        skillId: 'skill-rps',
        displayName: '石头剪刀布',
        workflowName: '石头剪刀布控制流',
        summary: '识别手势并驱动机械手回应。',
        tags: ['摄像头', '机械手'],
        wakePrompt: '跟我玩石头剪刀布',
        requiredHardware: [{ displayName: '摄像头' }, { displayName: '机械手' }],
        sourceSessionId: 'trace-rps',
        workflowId: 'wf-rps',
        workflow: { name: '石头剪刀布控制流' },
      },
    ]);
    incomingSkillIdSubject.next('skill-rps');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    const highlighted = fixture.nativeElement.querySelector('.skill-card.incoming');

    expect(text).toContain('石头剪刀布');
    expect(text).toContain('石头剪刀布控制流');
    expect(text).toContain('回溯教学流程');
    expect(text).toContain('发布到广场');
    expect(highlighted).not.toBeNull();
    expect(highlighted.textContent).toContain('NEW');
  });
});
