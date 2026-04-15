import { ComponentFixture, TestBed } from '@angular/core/testing';

import { XAilyConfigGuideViewerComponent } from './x-aily-config-guide-viewer.component';

describe('XAilyConfigGuideViewerComponent', () => {
  let component: XAilyConfigGuideViewerComponent;
  let fixture: ComponentFixture<XAilyConfigGuideViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [XAilyConfigGuideViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(XAilyConfigGuideViewerComponent);
    component = fixture.componentInstance;
  });

  it('dispatches config interaction event for single select payloads', () => {
    const dispatchSpy = spyOn(document, 'dispatchEvent');

    component.data = {
      sessionId: 'session-1',
      type: 'select_single',
      interaction: {
        options: [
          { label: '否，保持默认', value: 'no' },
          { label: '是，立即修改', value: 'yes' },
        ],
        selected: 'no',
      },
    };
    component.ngOnChanges({
      data: {
        currentValue: component.data,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    component.toggleOption('yes');
    component.submit();

    const event = dispatchSpy.calls.mostRecent().args[0] as CustomEvent;
    expect(event.detail.action).toBe('tesseract-submit-config-interaction');
    expect(event.detail.data).toEqual(
      jasmine.objectContaining({
        sessionId: 'session-1',
        type: 'select_single',
        message: 'yes',
        displayValue: '是，立即修改',
      }),
    );
  });

  it('renders guidance clarification options as selectable interaction', () => {
    const dispatchSpy = spyOn(document, 'dispatchEvent');

    component.data = {
      sessionId: 'session-guidance',
      type: 'guidance',
      interaction: {
        mode: 'single',
        field: 'clarification_action',
        title: '先确认触发方式',
        options: [
          {
            label: '对着机器人说话',
            value: '我希望用户通过对机器人说话来表达情绪。',
            reason: '这一步只确认触发方式。',
            category: 'trigger',
          },
          {
            label: '识别到对应人脸表情',
            value: '我希望机器人通过摄像头识别人脸表情来判断情绪。',
            reason: '这一步只确认触发方式。',
            category: 'trigger',
          },
        ],
      },
    };
    component.ngOnChanges({
      data: {
        currentValue: component.data,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    expect(component.showSelectOptions).toBeTrue();
    expect(component.canSubmit).toBeFalse();

    component.toggleOption('我希望用户通过对机器人说话来表达情绪。');

    expect(component.canSubmit).toBeTrue();

    component.submit();

    const event = dispatchSpy.calls.mostRecent().args[0] as CustomEvent;
    expect(event.detail.action).toBe('tesseract-submit-config-interaction');
    expect(event.detail.data).toEqual(
      jasmine.objectContaining({
        sessionId: 'session-guidance',
        type: 'guidance',
        message: '我希望用户通过对机器人说话来表达情绪。',
        agentMessage: '我希望用户通过对机器人说话来表达情绪。',
        displayValue: '对着机器人说话',
        clarificationCategory: 'trigger',
      }),
    );
  });

  it('dispatches upload interaction when image and profile are ready', async () => {
    const dispatchSpy = spyOn(document, 'dispatchEvent');

    component.data = {
      sessionId: 'session-2',
      type: 'image_upload',
      currentNode: { name: 'face_node' },
      interaction: {
        options: [{ label: '老刘', value: '老刘' }],
        selected: '老刘',
      },
    };
    component.ngOnChanges({
      data: {
        currentValue: component.data,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    component.selectedFileName = 'face.png';
    component.selectedFileBase64 = 'YmFzZTY0';
    component.submit();

    const event = dispatchSpy.calls.mostRecent().args[0] as CustomEvent;
    expect(event.detail.data).toEqual(
      jasmine.objectContaining({
        sessionId: 'session-2',
        type: 'image_upload',
        nodeName: 'face_node',
        profile: '老刘',
        fileName: 'face.png',
        contentBase64: 'YmFzZTY0',
      }),
    );
  });
});
