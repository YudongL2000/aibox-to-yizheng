import { AssemblyOrchestratorService } from '../../services/assembly-orchestrator.service';
import { DigitalTwinPanelComponent } from './digital-twin-panel.component';

describe('DigitalTwinPanelComponent', () => {
  function createComponent(orchestrator = new AssemblyOrchestratorService()) {
    return new DigitalTwinPanelComponent(orchestrator);
  }

  it('prefers the active assembly session over stale panel payload', () => {
    const orchestrator = new AssemblyOrchestratorService();
    const component = createComponent(orchestrator);
    component.panelState = {
      source: 'float-sider',
      openedAt: '2026-04-15T09:00:00.000Z',
    };

    const session = orchestrator.startSession({
      mode: 'hardware-assembly',
      sessionId: 'session-next',
      nodeName: 'hot_plugging_camera',
      components: [{ componentId: 'camera', displayName: '摄像头' }],
      allPendingHardwareNodeNames: ['hot_plugging_camera'],
    });

    expect(component.isAssemblyMode).toBeTrue();
    expect(component.frameData).toEqual(
      jasmine.objectContaining({
        source: 'float-sider',
        sessionId: session.sessionId,
        nodeName: session.nodeName,
        components: session.components,
        allPendingHardwareNodeNames: session.allPendingHardwareNodeNames,
        mode: 'hardware-assembly',
      }),
    );
  });

  it('drops stale assembly payload when there is no active assembly session', () => {
    const component = createComponent();
    component.panelState = {
      mode: 'hardware-assembly',
      sessionId: 'session-stale',
      nodeName: 'hot_plugging_camera',
      components: [{ componentId: 'camera', displayName: '摄像头' }],
      allPendingHardwareNodeNames: ['hot_plugging_camera'],
      source: 'float-sider',
    };

    expect(component.isAssemblyMode).toBeFalse();
    expect(component.frameData).toEqual(
      jasmine.objectContaining({
        source: 'float-sider',
      }),
    );
    expect((component.frameData as Record<string, unknown>)['mode']).toBeUndefined();
    expect((component.frameData as Record<string, unknown>)['components']).toBeUndefined();
  });
});
