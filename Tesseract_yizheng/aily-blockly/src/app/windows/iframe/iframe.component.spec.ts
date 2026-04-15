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
      {
        ensureConnected: jasmine.createSpy('ensureConnected').and.returnValue(Promise.resolve()),
        state$: of({ components: [] }),
        snapshot: { components: [] },
      } as any,
      {
        start: jasmine.createSpy('start'),
        status$: of({ hardware: null }),
      } as any,
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

  it('re-sends assembly requirements when a new assembly session arrives on a ready twin', () => {
    const component = createComponent() as any;
    const postMessage = jasmine.createSpy('postMessage');
    component.embeddedFrame = {
      nativeElement: {
        contentWindow: { postMessage },
      },
    };
    component.allowedOrigins = ['*'];

    component.iframeData = {
      mode: 'hardware-assembly',
      sessionId: 'session-a',
      nodeName: 'hot_plugging_camera',
      components: [{ componentId: 'camera', displayName: '摄像头' }],
      allPendingHardwareNodeNames: ['hot_plugging_camera'],
    };

    component.startAssemblyBridgeRelay();

    component.iframeData = {
      mode: 'hardware-assembly',
      sessionId: 'session-b',
      nodeName: 'hot_plugging_hand',
      components: [{ componentId: 'mechanical_hand', displayName: '机械手' }],
      allPendingHardwareNodeNames: ['hot_plugging_hand'],
    };

    component.startAssemblyBridgeRelay();

    const requirementMessages = postMessage.calls
      .allArgs()
      .map(([rawMessage]) => JSON.parse(rawMessage as string))
      .filter((message) => message.type === 'tesseract-assembly-requirements');

    expect(requirementMessages.length).toBe(2);
    expect(requirementMessages[0].payload.sessionId).toBe('session-a');
    expect(requirementMessages[1].payload.sessionId).toBe('session-b');
  });

  it('keeps speaker requirements in the assembly checklist payload', () => {
    const component = createComponent() as any;
    const postMessage = jasmine.createSpy('postMessage');
    component.embeddedFrame = {
      nativeElement: {
        contentWindow: { postMessage },
      },
    };
    component.allowedOrigins = ['*'];
    component.iframeData = {
      mode: 'hardware-assembly',
      sessionId: 'session-speaker',
      nodeName: 'hot_plugging_speaker',
      components: [{ componentId: 'speaker', displayName: '扬声器' }],
      allPendingHardwareNodeNames: ['hot_plugging_speaker'],
    };

    component.startAssemblyBridgeRelay();

    const requirementMessage = postMessage.calls
      .allArgs()
      .map(([rawMessage]) => JSON.parse(rawMessage as string))
      .find((message) => message.type === 'tesseract-assembly-requirements');

    expect(requirementMessage?.payload?.components).toEqual([
      { componentId: 'speaker', displayName: '扬声器' },
    ]);
  });

  it('maps speaker heartbeat devices into assembly hardware components', () => {
    const component = createComponent() as any;

    const mapped = component.mapMqttDeviceToComponent({
      deviceType: 'speaker',
      deviceName: 'speaker-001',
      deviceStatus: 'online',
      devicePath: '',
      devicePort: 'port_1',
      interfaceId: 'port_1',
    });

    expect(mapped).toEqual({
      componentId: 'speaker',
      deviceId: 'speaker-001',
      displayName: '扬声器',
      status: 'connected',
      portId: 'port_1',
      modelId: '',
    });
  });
});
