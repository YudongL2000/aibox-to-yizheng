/**
 * [INPUT]: 依赖 XAilyDialogueModeViewerComponent 与对话模式 card payload。
 * [OUTPUT]: 对外提供对话模式 viewer 回归测试，锁住空库提示与真实技能唤醒派发。
 * [POS]: x-dialog 的对话模式视觉测试，防止 UI 重新长出 mock 技能和硬编码快捷项。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { XAilyDialogueModeViewerComponent } from './x-aily-dialogue-mode-viewer.component';

describe('XAilyDialogueModeViewerComponent', () => {
  let fixture: ComponentFixture<XAilyDialogueModeViewerComponent>;
  let component: XAilyDialogueModeViewerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [XAilyDialogueModeViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(XAilyDialogueModeViewerComponent);
    component = fixture.componentInstance;
  });

  it('renders a trusted empty-library message when backend returns no skills', () => {
    component.data = {
      branch: 'proxy_chat',
      phase: 'interacting',
      message: '先看看库里有没有现成技能。',
      skills: [],
      actions: [],
      hardware: {
        connectedComponents: [],
        missingRequirements: [],
      } as any,
    };
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('当前 Skills 库里还没有可唤醒的技能');
  });

  it('dispatches backend-provided wakeup prompt instead of hardcoded quick prompts', () => {
    const dispatchSpy = spyOn(document, 'dispatchEvent');
    component.data = {
      branch: 'instant_play',
      phase: 'interacting',
      message: '来玩吧。',
      skills: [
        {
          id: 'skill-rps',
          title: '石头剪刀布',
          prompt: '跟我玩石头剪刀布',
          action: 'tesseract-dialogue-send-prompt',
          tags: ['摄像头', '机械手'],
          icon: 'R',
          payload: {
            prompt: '跟我玩石头剪刀布',
          },
        },
      ],
      actions: [],
      hardware: {
        connectedComponents: [],
        missingRequirements: [],
      } as any,
    };
    fixture.detectChanges();

    const skillButton = fixture.nativeElement.querySelector('.skill-card') as HTMLButtonElement;
    skillButton.click();

    const event = dispatchSpy.calls.mostRecent().args[0] as CustomEvent;
    expect(event.detail.action).toBe('tesseract-dialogue-send-prompt');
    expect(event.detail.data.prompt).toBe('跟我玩石头剪刀布');
  });
});
