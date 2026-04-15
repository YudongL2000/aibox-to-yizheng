/**
 * [INPUT]: 依赖 XAilyButtonViewerComponent 与 document 事件派发。
 * [OUTPUT]: 对外提供按钮 viewer 的硬件端口回归测试。
 * [POS]: x-dialog 的动作组件测试，锁住 backend 端口选项会折叠成 confirm-node 的 portId/topology。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { SimpleChange } from '@angular/core';
import { XAilyButtonViewerComponent } from './x-aily-button-viewer.component';

describe('XAilyButtonViewerComponent', () => {
  let component: XAilyButtonViewerComponent;

  beforeEach(() => {
    component = new XAilyButtonViewerComponent({
      sendTextToChat: jasmine.createSpy('sendTextToChat'),
    } as any);
  });

  it('dispatches selected hotplug port as portId and topology', () => {
    const dispatchSpy = spyOn(document, 'dispatchEvent');
    component.data = [
      {
        text: '标记节点已处理',
        action: 'tesseract-confirm-node',
        payload: {
          sessionId: 'session-1',
          nodeName: 'camera_node',
          selectedPortId: 'port_1',
          portOptions: [
            { label: '接口1 · 侧面A', value: 'port_1' },
            { label: '接口6 · 侧面F', value: 'port_6' },
          ],
        },
      },
    ];

    component.ngOnChanges({
      data: new SimpleChange(null, component.data, true),
    });

    const button = component.buttons[0];
    component.selectPort(button, 'port_6');
    component.onButtonClick(button);

    const event = dispatchSpy.calls.mostRecent().args[0] as CustomEvent;
    expect(event.detail.action).toBe('tesseract-confirm-node');
    expect(event.detail.data.portId).toBe('port_6');
    expect(event.detail.data.topology).toBe('port_6');
  });

  it('does not render port picker for non-port actions', () => {
    component.data = [
      {
        text: '上传到硬件',
        action: 'tesseract-upload-to-hardware',
        payload: {
          sessionId: 'session-1',
        },
      },
    ];

    component.ngOnChanges({
      data: new SimpleChange(null, component.data, true),
    });

    const button = component.buttons[0];
    expect(component.isHotplugButton(button)).toBeFalse();
  });
});
