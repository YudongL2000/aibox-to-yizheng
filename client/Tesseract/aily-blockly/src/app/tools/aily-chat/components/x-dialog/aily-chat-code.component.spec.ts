import { SimpleChange } from '@angular/core';
import { AilyChatCodeComponent } from './aily-chat-code.component';

describe('AilyChatCodeComponent', () => {
  let component: AilyChatCodeComponent;

  beforeEach(() => {
    component = new AilyChatCodeComponent(
      { markForCheck: () => undefined, detectChanges: () => undefined } as any,
      { create: jasmine.createSpy('create') } as any,
    );
  });

  it('parses workflow blueprint payloads', () => {
    component.block = true;
    component.lang = 'aily-workflow-blueprint';
    component.children = JSON.stringify({ intentSummary: 'robot blueprint' });

    component.ngOnChanges({
      children: new SimpleChange(null, component.children, true),
    });

    expect(component.parsedData.intentSummary).toBe('robot blueprint');
    expect(component.isType('aily-workflow-blueprint')).toBeTrue();
  });

  it('parses component recommendation payloads', () => {
    component.block = true;
    component.lang = 'aily-component-recommendation';
    component.children = JSON.stringify({ topology: 'screen-speaker' });

    component.ngOnChanges({
      children: new SimpleChange(null, component.children, true),
    });

    expect(component.parsedData.topology).toBe('screen-speaker');
  });

  it('parses config guide payloads', () => {
    component.block = true;
    component.lang = 'aily-config-guide';
    component.children = JSON.stringify({
      currentNode: { displayName: 'Speaker Node' },
      progress: { completed: 1, total: 2 },
    });

    component.ngOnChanges({
      children: new SimpleChange(null, component.children, true),
    });

    expect(component.parsedData.currentNode.displayName).toBe('Speaker Node');
    expect(component.parsedData.progress.total).toBe(2);
  });
});
