/**
 * [INPUT]: 依赖 adaptTesseractAgentResponse 协议适配函数。
 * [OUTPUT]: 对外提供 Tesseract AgentResponse -> aily block 的协议回归测试。
 * [POS]: tools/aily-chat/services 的协议测试文件，锁定 backend-first 渲染契约。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { adaptTesseractAgentResponse } from './tesseract-agent-response-adapter';

describe('adaptTesseractAgentResponse', () => {
  it('maps summary responses into markdown plus confirm control only', () => {
    const result = adaptTesseractAgentResponse({
      type: 'summary_ready',
      message: 'summary',
      blueprint: {
        intentSummary: 'robot reacts',
        triggers: [{ type: 'scheduleTrigger' }],
        logic: [{ type: 'if' }],
        executors: [{ type: 'set' }],
        missingFields: [],
        componentSelection: {
          topology: 'screen-speaker',
          inputs: ['camera'],
          processes: ['llm'],
          decisions: [],
          outputs: ['speaker'],
          trigger: 'schedule',
          minimumNodes: 3,
          componentAssembly: ['screen'],
        },
      },
    }, { sessionId: 's1' });

    expect(result.markdown).toContain('tesseract-confirm-workflow');
    expect(result.markdown).not.toContain('```aily-workflow-blueprint');
    expect(result.markdown).not.toContain('```aily-component-recommendation');
  });

  it('maps workflow responses into mermaid without legacy deploy controls', () => {
    const result = adaptTesseractAgentResponse({
      type: 'workflow_ready',
      message: 'workflow',
      workflow: {
        name: 'demo',
        nodes: [{ name: 'Trigger' }, { name: 'Speaker' }],
        connections: {
          Trigger: {
            main: [[{ node: 'Speaker' }]],
          },
        },
      },
    }, { sessionId: 's2' });

    expect(result.markdown).toContain('```aily-mermaid');
    expect(result.markdown).not.toContain('tesseract-deploy-workflow');
    expect(result.markdown).not.toContain('tesseract-open-workflow');
  });

  it('maps config prompts into config-guide blocks', () => {
    const result = adaptTesseractAgentResponse({
      type: 'config_input',
      message: 'config',
      currentNode: { name: 'SpeakerNode', displayName: 'Speaker Node' },
      interaction: {
        title: 'Select output',
        options: [{ label: 'speaker', value: 'speaker' }],
      },
      progress: { completed: 1, total: 3 },
    }, { sessionId: 's3' });

    expect(result.markdown).toContain('```aily-config-guide');
    expect(result.markdown).toContain('tesseract-confirm-node');
  });

  it('keeps guidance clarification interaction inside config-guide blocks', () => {
    const result = adaptTesseractAgentResponse({
      type: 'guidance',
      message: '**当前先确认**\n触发方式',
      interaction: {
        id: 'clarification_trigger_action',
        mode: 'single',
        field: 'clarification_action',
        title: '先确认触发方式',
        description: '这一步只确认触发方式。',
        options: [
          { label: '对着机器人说话', value: '我希望用户通过对机器人说话来表达情绪。' },
          { label: '识别到对应人脸表情', value: '我希望机器人通过摄像头识别人脸表情来判断情绪。' },
        ],
      },
    }, { sessionId: 's-guidance' });

    expect(result.markdown).toContain('```aily-config-guide');
    expect(result.markdown).toContain('clarification_action');
    expect(result.markdown).toContain('对着机器人说话');
    expect(result.markdown).toContain('识别到对应人脸表情');
  });

  it('carries backend hotplug port options into confirm-node payload', () => {
    const result = adaptTesseractAgentResponse({
      type: 'hot_plugging',
      message: '请插上机械手',
      currentNode: {
        name: 'hand_node',
        displayName: '机械手',
        configValues: {
          topology: 'port_5',
        },
      },
      interaction: {
        field: 'hardware_port',
        title: '选择接口',
        options: [
          { label: '接口5 · 侧面E', value: 'port_5' },
          { label: '接口7 · 顶部', value: 'port_7' },
        ],
        selected: 'port_5',
      },
    }, { sessionId: 's-hotplug' });

    expect(result.markdown).toContain('portOptions');
    expect(result.markdown).toContain('port_5');
    expect(result.markdown).toContain('portSelectionTitle');
  });

  it('maps terminal states into aily-state blocks', () => {
    const result = adaptTesseractAgentResponse({
      type: 'error',
      message: 'failed',
    }, { sessionId: 's4' });

    expect(result.markdown).toContain('```aily-state');
    expect(result.markdown).toContain('"state": "error"');
  });

  it('propagates backend workflow url into config-complete action payloads', () => {
    const result = adaptTesseractAgentResponse({
      type: 'config_complete',
      message: 'done',
      totalConfigured: 2,
      metadata: {
        workflowId: 'wf-1',
      },
    }, {
      sessionId: 's5',
      projectPath: '/demo',
      workflowUrl: 'http://127.0.0.1:5678/workflow/wf-1',
    });

    expect(result.markdown).toContain('上传到硬件');
    expect(result.markdown).toContain('停止工作流');
    expect(result.markdown).toContain('tesseract-open-workflow');
    expect(result.markdown).toContain('http://127.0.0.1:5678/workflow/wf-1');
    expect(result.markdown).toContain('/demo');
  });

  it('keeps project workflow context even when config-complete lacks metadata workflow id', () => {
    const result = adaptTesseractAgentResponse({
      type: 'config_complete',
      message: 'done',
      totalConfigured: 1,
      metadata: {},
    }, {
      sessionId: 's5b',
      projectPath: '/demo',
      workflowId: 'wf-context',
      workflowUrl: 'http://127.0.0.1:5678/workflow/wf-context',
    });

    expect(result.markdown).toContain('上传到硬件');
    expect(result.markdown).toContain('停止工作流');
    expect(result.markdown).toContain('tesseract-open-workflow');
    expect(result.markdown).toContain('wf-context');
    expect(result.markdown).toContain('/demo');
  });

  it('keeps config-complete open action usable without projectPath', () => {
    const result = adaptTesseractAgentResponse({
      type: 'config_complete',
      message: 'done',
      totalConfigured: 2,
      metadata: {
        workflowId: 'wf-1',
      },
    }, {
      sessionId: 's5',
      workflowUrl: 'http://127.0.0.1:5678/workflow/wf-1',
    });

    expect(result.markdown).toContain('上传到硬件');
    expect(result.markdown).toContain('停止工作流');
    expect(result.markdown).toContain('tesseract-open-workflow');
    expect(result.markdown).toContain('wf-1');
    expect(result.markdown).toContain('http://127.0.0.1:5678/workflow/wf-1');
  });

  it('adds save-to-skills actions when config-complete carries a skill candidate', () => {
    const result = adaptTesseractAgentResponse({
      type: 'config_complete',
      message: 'done',
      totalConfigured: 2,
      skillSaveCandidate: {
        skillId: 'skill-rps',
        displayName: '石头剪刀布',
        summary: '通过摄像头识别用户手势，再让机械手回应。',
        keywords: ['石头剪刀布'],
        workflowId: 'wf-1',
        workflowName: '石头剪刀布',
        sourceSessionId: 's-save',
      },
      metadata: {
        workflowId: 'wf-1',
      },
    }, {
      sessionId: 's-save',
      projectPath: '/demo',
      workflowUrl: 'http://127.0.0.1:5678/workflow/wf-1',
    });

    expect(result.markdown).toContain('tesseract-save-skill');
    expect(result.markdown).toContain('石头剪刀布');
    expect(result.markdown).toContain('tesseract-dismiss-save-skill');
  });

  it('maps dialogue-mode responses into dialogue card payloads', () => {
    const result = adaptTesseractAgentResponse({
      type: 'dialogue_mode',
      message: '装备齐了，来玩吧。',
      dialogueMode: {
        branch: 'instant_play',
        phase: 'interacting',
        skill: {
          skillId: 'skill_rps',
          displayName: '石头剪刀布',
          gameplayGuide: '出拳后把手伸到摄像头前。',
          requiredHardware: [],
        },
        librarySkills: [
          {
            skillId: 'skill_rps',
            displayName: '石头剪刀布',
            summary: '识别手势并同步机械手响应。',
            tags: ['摄像头', '机械手'],
            wakePrompt: '跟我玩石头剪刀布',
            requiredHardware: [
              { componentId: 'camera', displayName: '摄像头' },
              { componentId: 'mechanical_hand', displayName: '机械手' },
            ],
            sourceSessionId: 'trace-rps',
            workflowId: 'wf-rps',
            workflowName: '石头剪刀布控制流',
            workflow: {
              name: '石头剪刀布控制流',
              nodes: [{ name: 'Trigger' }],
              connections: {},
            },
          },
        ],
        hardware: {
          source: 'backend_cache',
          connectedComponents: [
            {
              componentId: 'camera',
              deviceId: 'camera-001',
              modelId: 'cam-001',
              displayName: '摄像头',
              portId: 'port_1',
              status: 'ready',
            },
          ],
          missingRequirements: [],
          validationStatus: 'success',
        },
        uiActions: [
          {
            id: 'start_deploy',
            label: '开始部署',
            kind: 'primary',
            enabled: true,
          },
          {
            id: 'open_teaching_mode',
            label: '开启教学模式',
            kind: 'secondary',
            enabled: true,
          },
        ],
        physicalCue: {
          action: 'hand_stretch',
          autoTrigger: true,
        },
        teachingHandoff: {
          sourceSessionId: 's6',
          originalPrompt: '帮我给花浇水',
          prefilledGoal: '学习给花浇水',
          entryMode: 'dialogue',
          createdAt: '2026-04-01T00:00:00.000Z',
        },
        deploymentPrompt: {
          visible: true,
          status: 'visible',
          message: '准备好了，点击开始部署。',
        },
      },
    }, { sessionId: 's6' });

    expect(result.markdown).toContain('```aily-dialogue-mode');
    expect(result.markdown).toContain('石头剪刀布');
    expect(result.markdown).not.toContain('自动避障');
    expect(result.markdown).toContain('tesseract-dialogue-run-skill');
    expect(result.markdown).toContain('tesseract-dialogue-start-deploy');
    expect(result.markdown).toContain('tesseract-dialogue-open-teaching-mode');
    expect(result.markdown).toContain('学习给花浇水');
  });

  it('omits mock hotplug buttons for dialogue-mode hardware guidance', () => {
    const result = adaptTesseractAgentResponse({
      type: 'dialogue_mode',
      message: '麻烦帮我把【机械手】插上。',
      dialogueMode: {
        branch: 'hardware_guidance',
        phase: 'waiting_for_insert',
        skill: {
          skillId: 'skill_rps',
          displayName: '石头剪刀布',
          gameplayGuide: '来玩吧',
          requiredHardware: [
            {
              componentId: 'mechanical_hand',
              displayName: '机械手',
              acceptablePorts: ['port_5'],
            },
          ],
        },
        librarySkills: [],
        hardware: {
          source: 'backend_cache',
          connectedComponents: [],
          missingRequirements: [
            {
              componentId: 'mechanical_hand',
              displayName: '机械手',
              acceptablePorts: ['port_5'],
            },
          ],
          validationStatus: 'pending',
        },
        uiActions: [
          {
            id: 'confirm_insert_hardware',
            label: '确认插入【机械手】',
            kind: 'primary',
            enabled: true,
            payload: {
              componentId: 'mechanical_hand',
              displayName: '机械手',
              selectedPortId: 'port_5',
              portSelectionTitle: '选择【机械手】插入位置',
              portOptions: [
                { label: '接口5 · 侧面E', value: 'port_5' },
              ],
            },
          },
        ],
        physicalCue: null,
        teachingHandoff: null,
        deploymentPrompt: {
          visible: false,
          status: 'hidden',
          message: '等待硬件补齐',
        },
      },
    }, { sessionId: 's7' });

    expect(result.markdown).toContain('```aily-dialogue-mode');
    expect(result.markdown).toContain('```aily-button');
    expect(result.markdown).toContain('tesseract-dialogue-confirm_insert_hardware');
    expect(result.markdown).not.toContain('tesseract-dialogue-mock-insert');
    expect(result.markdown).not.toContain('mock_insert_missing_hardware');
  });
});
