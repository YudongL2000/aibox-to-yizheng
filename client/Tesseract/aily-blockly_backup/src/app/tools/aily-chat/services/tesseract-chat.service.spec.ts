/**
 * [INPUT]: 依赖 TesseractChatService、window.electronAPI mock 与 TesseractProjectService stub。
 * [OUTPUT]: 对外提供 TesseractChatService 的 backend-first 回归测试。
 * [POS]: tools/aily-chat/services 的服务层契约测试，防止“无项目路径就失败”的回归。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { TesseractChatService } from './tesseract-chat.service';
import { DialogueHardwareEvent } from './tesseract-dialogue.models';

describe('TesseractChatService', () => {
  let service: TesseractChatService;
  let electronAPI: any;
  let projectServiceStub: any;

  beforeEach(() => {
    electronAPI = {
      tesseract: {
        start: jasmine.createSpy('start').and.resolveTo({}),
        chat: jasmine.createSpy('chat').and.resolveTo({
          sessionId: 'session-1',
          response: {
            type: 'summary_ready',
            message: 'summary',
            blueprint: {
              intentSummary: 'demo',
              triggers: [],
              logic: [],
              executors: [],
              missingFields: [],
            },
          },
        }),
        validateHardware: jasmine.createSpy('validateHardware').and.resolveTo({
          sessionId: 'session-1',
          response: {
            type: 'dialogue_mode',
            message: '感应到了，数据同步完成。',
            dialogueMode: {
              branch: 'hardware_guidance',
              phase: 'ready_to_deploy',
              skill: null,
              hardware: {
                source: 'backend_cache',
                connectedComponents: [
                  {
                    componentId: 'mechanical_hand',
                    deviceId: 'hand-001',
                    modelId: 'claw-v1',
                    displayName: '机械手',
                    portId: 'port_2',
                    status: 'connected',
                  },
                ],
                missingRequirements: [],
                validationStatus: 'success',
              },
              uiActions: [],
              physicalCue: null,
              teachingHandoff: null,
            },
            digitalTwinScene: {
              display_mode: 'multi_scene',
              base_model_id: 'model_5',
              models: [
                {
                  id: 'model_5',
                  url: '/assets/assets/models/5.glb',
                },
                {
                  id: 'claw-v1',
                  url: '/assets/assets/models/4.glb',
                  interface_id: 'port_2',
                },
              ],
            },
          },
        }),
        startDeploy: jasmine.createSpy('startDeploy').and.resolveTo({
          sessionId: 'session-1',
          response: {
            type: 'dialogue_mode',
            message: '硬件苏醒，开始交互。',
            dialogueMode: {
              branch: 'instant_play',
              phase: 'interacting',
              skill: null,
              hardware: {
                source: 'backend_cache',
                connectedComponents: [],
                missingRequirements: [],
                validationStatus: 'success',
              },
              uiActions: [],
              physicalCue: null,
              teachingHandoff: null,
            },
          },
        }),
        confirmWorkflow: jasmine.createSpy('confirmWorkflow').and.resolveTo({
          sessionId: 'session-1',
          response: {
            type: 'workflow_ready',
            message: 'workflow',
            workflow: {
              name: 'Demo Workflow',
              nodes: [{ name: 'Trigger' }, { name: 'Action' }],
              connections: {
                Trigger: {
                  main: [[{ node: 'Action' }]],
                },
              },
            },
          },
        }),
        createWorkflow: jasmine.createSpy('createWorkflow').and.resolveTo({
          workflowId: 'wf-1',
          workflowName: 'Demo Workflow',
          workflowUrl: 'http://127.0.0.1:5678/workflow/wf-1',
        }),
        startConfig: jasmine.createSpy('startConfig').and.resolveTo({
          sessionId: 'session-1',
          response: {
            type: 'config_complete',
            message: '配置完成',
            totalConfigured: 0,
            metadata: {
              workflowId: 'wf-1',
            },
          },
        }),
        confirmNode: jasmine.createSpy('confirmNode').and.resolveTo({
          sessionId: 'session-1',
          response: {
            type: 'config_complete',
            message: '节点完成',
            totalConfigured: 1,
            metadata: {
              workflowId: 'wf-1',
            },
          },
        }),
        getConfigState: jasmine.createSpy('getConfigState').and.resolveTo({
          success: true,
          data: {
            digitalTwinScene: {
              display_mode: 'multi_scene',
              base_model_id: 'model_5',
              models: [
                {
                  id: 'model_5',
                  url: '/assets/assets/models/5.glb',
                },
                {
                  id: 'model_speaker',
                  url: '/assets/assets/models/4.glb',
                  interface_id: 'port_2',
                },
              ],
            },
          },
        }),
      },
      digitalTwin: {
        setScene: jasmine.createSpy('setScene').and.resolveTo({ success: true }),
        getScene: jasmine.createSpy('getScene').and.resolveTo(null),
      },
      n8n: {
        start: jasmine.createSpy('start').and.resolveTo({
          healthy: true,
          port: 5678,
        }),
        openWorkflow: jasmine.createSpy('openWorkflow').and.resolveTo({
          success: true,
          url: 'http://127.0.0.1:5678/workflow/wf-1',
        }),
      },
      other: {
        openByBrowser: jasmine.createSpy('openByBrowser').and.resolveTo(true),
      },
    };

    (window as any).electronAPI = electronAPI;
    projectServiceStub = {
      persistWorkflowSnapshot: jasmine.createSpy('persistWorkflowSnapshot').and.callFake(
        (_projectPath: string, snapshot: Record<string, unknown>) => snapshot
      ),
      syncWorkflowSnapshotAndView: jasmine.createSpy('syncWorkflowSnapshotAndView').and.callFake(
        (_projectPath: string, snapshot: Record<string, unknown>) => snapshot
      ),
      publishWorkflowViewTarget: jasmine.createSpy('publishWorkflowViewTarget').and.callFake(
        (payload: Record<string, unknown>) => payload
      ),
    };

    service = new TesseractChatService(projectServiceStub);
  });

  it('forwards dialogue interaction mode and teaching context to backend chat', async () => {
    await service.chat('跟我玩石头剪刀布', 'session-1', '', {
      interactionMode: 'dialogue',
      teachingContext: {
        originalPrompt: '帮我给花浇水',
        prefilledGoal: '学习给花浇水',
        sourceSessionId: 'session-0',
      },
    });

    expect(electronAPI.tesseract.chat).toHaveBeenCalledWith({
      message: '跟我玩石头剪刀布',
      sessionId: 'session-1',
      interactionMode: 'dialogue',
      teachingContext: {
        originalPrompt: '帮我给花浇水',
        prefilledGoal: '学习给花浇水',
        sourceSessionId: 'session-0',
      },
    });
  });

  it('confirms workflow without requiring a project path', async () => {
    const result = await service.confirmWorkflow('session-1');

    expect(electronAPI.tesseract.start).toHaveBeenCalledWith({});
    expect(electronAPI.tesseract.confirmWorkflow).toHaveBeenCalledWith({
      sessionId: 'session-1',
    });
    expect(electronAPI.digitalTwin.setScene).toHaveBeenCalledWith({
      scene: null,
    });
    expect(result.markdown).toContain('```aily-mermaid');
    expect(result.markdown).not.toContain('创建工作流');
  });

  it('creates workflow from backend session instead of local snapshot', async () => {
    const result = await service.deployWorkflowAndStartConfig('session-1');

    expect(electronAPI.tesseract.createWorkflow).toHaveBeenCalledWith({
      sessionId: 'session-1',
    });
    expect(electronAPI.n8n.start).toHaveBeenCalledWith({});
    expect(electronAPI.tesseract.startConfig).toHaveBeenCalledWith({
      sessionId: 'session-1',
    });
    expect(electronAPI.digitalTwin.setScene).not.toHaveBeenCalled();
    expect(projectServiceStub.persistWorkflowSnapshot).not.toHaveBeenCalled();
    expect(projectServiceStub.publishWorkflowViewTarget).toHaveBeenCalledWith(
      jasmine.objectContaining({
        workflowId: 'wf-1',
        workflowUrl: 'http://127.0.0.1:5678/workflow/wf-1',
        source: 'chat-create',
      })
    );
    expect(result.snapshot).toEqual(jasmine.objectContaining({
      workflowId: 'wf-1',
      workflowUrl: 'http://127.0.0.1:5678/workflow/wf-1',
    }));
    expect(result.workflowRef).toEqual(jasmine.objectContaining({
      workflowId: 'wf-1',
      workflowUrl: 'http://127.0.0.1:5678/workflow/wf-1',
    }));
    expect(result.markdown).toContain('wf-1');
    expect(result.markdown).toContain('http://127.0.0.1:5678/workflow/wf-1');
  });

  it('persists workflow reference into project snapshot before opening in-app workspace', async () => {
    await service.deployWorkflowAndStartConfig('session-1', '/demo');

    expect(electronAPI.n8n.start).toHaveBeenCalledWith({
      projectPath: '/demo',
    });
    expect(projectServiceStub.syncWorkflowSnapshotAndView).toHaveBeenCalledWith(
      '/demo',
      jasmine.objectContaining({
        sessionId: 'session-1',
        workflowId: 'wf-1',
        workflowUrl: 'http://127.0.0.1:5678/workflow/wf-1',
      }),
      'chat-create'
    );
  });

  it('can deploy a saved skill workflow through the shared create/start-config pipeline', async () => {
    await service.deployWorkflowAndStartConfigWithOptions('session-1', '/demo', {
      workflow: {
        name: 'Skill Workflow',
        nodes: [{ name: 'Trigger' }],
        connections: {},
      },
      source: 'skill-card',
    });

    expect(electronAPI.tesseract.createWorkflow).toHaveBeenCalledWith({
      projectPath: '/demo',
      sessionId: 'session-1',
      workflow: jasmine.objectContaining({
        name: 'Skill Workflow',
      }),
    });
    expect(electronAPI.tesseract.startConfig).toHaveBeenCalledWith({
      projectPath: '/demo',
      sessionId: 'session-1',
      workflowId: 'wf-1',
      workflowJson: jasmine.objectContaining({
        name: 'Skill Workflow',
      }),
    });
  });

  it('pushes backend digital twin scene into electron bridge', async () => {
    electronAPI.tesseract.confirmNode.and.resolveTo({
      sessionId: 'session-1',
      response: {
        type: 'hot_plugging',
        message: '请插上摄像头',
        digitalTwinScene: {
          display_mode: 'multi_scene',
          base_model_id: 'model_5',
          models: [
            {
              id: 'model_5',
              url: '/assets/assets/models/5.glb',
            },
            {
              id: 'stale-scene',
              url: '/assets/assets/models/3.glb',
              interface_id: 'port_1',
            },
          ],
        },
      },
    });

    await service.confirmNode({
      sessionId: 'session-1',
      nodeName: 'camera_node',
    });

    expect(electronAPI.digitalTwin.setScene).toHaveBeenCalledWith({
      scene: jasmine.objectContaining({
        base_model_id: 'model_5',
        models: jasmine.arrayContaining([
          jasmine.objectContaining({
            id: 'model_speaker',
            interface_id: 'port_2',
          }),
        ]),
      }),
    });
    expect(electronAPI.tesseract.getConfigState).toHaveBeenCalledWith({
      sessionId: 'session-1',
    });
  });

  it('normalizes confirm-node portId into topology before invoking electron bridge', async () => {
    await service.confirmNode({
      sessionId: 'session-1',
      nodeName: 'camera_node',
      portId: 'port_6',
    });

    expect(electronAPI.tesseract.confirmNode).toHaveBeenCalledWith(jasmine.objectContaining({
      sessionId: 'session-1',
      nodeName: 'camera_node',
      portId: 'port_6',
      topology: 'port_6',
    }));
  });

  it('prefers backend workflowUrl when opening workflow', async () => {
    await service.openWorkflow({
      sessionId: 'session-1',
      workflowId: 'wf-1',
      workflowUrl: 'http://127.0.0.1:5678/workflow/wf-1',
    });

    expect(electronAPI.other.openByBrowser).toHaveBeenCalledWith(
      'http://127.0.0.1:5678/workflow/wf-1'
    );
    expect(electronAPI.n8n.openWorkflow).not.toHaveBeenCalled();
  });

  it('validates dialogue hardware through backend session api', async () => {
    const event: DialogueHardwareEvent = {
      source: 'miniclaw_ws',
      eventType: 'snapshot',
      timestamp: '2026-04-01T00:00:00.000Z',
      component: {
        componentId: 'mechanical_hand',
        deviceId: 'claw-001',
        modelId: 'claw-v1',
        displayName: '机械手',
        portId: 'port_2',
        status: 'connected',
      },
      connectedComponents: [
        {
          componentId: 'mechanical_hand',
          deviceId: 'claw-001',
          modelId: 'claw-v1',
          displayName: '机械手',
          portId: 'port_2',
          status: 'connected',
        },
        {
          componentId: 'camera',
          deviceId: 'camera-001',
          modelId: 'cam-001',
          displayName: '摄像头',
          portId: 'port_7',
          status: 'connected',
        },
      ],
      raw: { content: '机械手已插入 2号口' },
    };

    const result = await service.validateDialogueHardware('session-1', event);

    expect(electronAPI.tesseract.validateHardware).toHaveBeenCalledWith({
      sessionId: 'session-1',
      event,
    });
    expect(electronAPI.digitalTwin.setScene).toHaveBeenCalledWith({
      scene: jasmine.objectContaining({
        base_model_id: 'model_5',
      }),
    });
    expect(result.markdown).toContain('```aily-dialogue-mode');
  });

  it('starts dialogue deploy through backend session api', async () => {
    const result = await service.startDialogueDeploy('session-1');

    expect(electronAPI.tesseract.startDeploy).toHaveBeenCalledWith({
      sessionId: 'session-1',
    });
    expect(result.markdown).toContain('```aily-dialogue-mode');
  });
});
