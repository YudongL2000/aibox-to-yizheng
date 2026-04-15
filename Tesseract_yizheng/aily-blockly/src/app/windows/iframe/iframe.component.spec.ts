import { NgZone } from '@angular/core';
import { of } from 'rxjs';

import { AssemblyOrchestratorService } from '../../services/assembly-orchestrator.service';
import { DesktopDigitalTwinStateService } from '../../services/desktop-digital-twin-state.service';
import { IframeComponent } from './iframe.component';

describe('IframeComponent digital twin bootstrap window', () => {
  function createComponent(): IframeComponent {
    return new IframeComponent(
      null,
      {
        bypassSecurityTrustResourceUrl: (value: string) => value as any,
      } as any,
      {
        queryParams: of({}),
      } as any,
      {
        isElectron: false,
      } as any,
      {
        clearIframeApi: jasmine.createSpy('clearIframeApi'),
      } as any,
      new NgZone({ enableLongStackTrace: false }),
      {} as any,
      {} as any,
      new DesktopDigitalTwinStateService(),
      new AssemblyOrchestratorService(),
    );
  }

  afterEach(() => {
    delete (window as any).electronAPI;
  });

  it('restarts bootstrap grace when forcing a reload for the same revision', () => {
    const component = createComponent() as any;
    component.isDigitalTwinWindow = true;
    component.iframeUrlRaw = 'http://127.0.0.1:18082/?entry=digital-twin&source=aily-blockly';
    component.lastPushedDigitalTwinRevision = 12;
    component.digitalTwinReplayRevision = 12;
    component.digitalTwinReplayAttempts = 9;
    component.digitalTwinFirstPushAt = 1234;
    component.digitalTwinChildReady = true;
    component.lastDigitalTwinEnvelopeSummary = {
      revision: 12,
      modelCount: 1,
      modelIds: ['main-board'],
    };
    (window as any).electronAPI = {
      runtimeFlags: {
        desktopTwinMode: 'flutter-workspace',
      },
    };

    const setIframeUrlSpy = spyOn<any>(component, 'setIframeUrl');
    spyOn(Date, 'now').and.returnValue(987654321);

    component.forceReloadDigitalTwinFrame(12);

    expect(component.digitalTwinReplayAttempts).toBe(0);
    expect(component.digitalTwinFirstPushAt).toBe(987654321);
    expect(component.digitalTwinChildReady).toBeFalse();
    expect(setIframeUrlSpy).toHaveBeenCalledTimes(1);

    const reloadedUrl = setIframeUrlSpy.calls.mostRecent().args[0] as string;
    expect(reloadedUrl).toContain('dt_revision=12');
    expect(reloadedUrl).toContain('dt_reload=987654321');
  });
});
