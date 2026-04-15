import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConfigAgent } from '../../../src/agents/config-agent';
import { SessionService } from '../../../src/agents/session-service';
import type { WorkflowDefinition } from '../../../src/agents/types';

function buildWorkflow(nodes: Array<Record<string, unknown>>): WorkflowDefinition {
  return {
    name: 'Config Agent Test Workflow',
    nodes,
    connections: {},
  };
}

describe('ConfigAgent', () => {
  let sessionService: SessionService;
  let n8nClient: {
    getWorkflow: ReturnType<typeof vi.fn>;
    updateWorkflow: ReturnType<typeof vi.fn>;
  };
  let agent: ConfigAgent;

  beforeEach(() => {
    sessionService = new SessionService();
    n8nClient = {
      getWorkflow: vi.fn(),
      updateWorkflow: vi.fn().mockResolvedValue({}),
    };
    agent = new ConfigAgent(sessionService, n8nClient as any);
  });

  it('extractConfigurableNodes 仅提取 set/httpRequest/code 节点', () => {
    const workflow = buildWorkflow([
      { name: 'Webhook', type: 'n8n-nodes-base.webhook' },
      { name: 'Set A', type: 'n8n-nodes-base.set', notes: { category: 'TTS', extra: 'pending' } },
      { name: 'HTTP', type: 'n8n-nodes-base.httpRequest', notes: { category: 'CAM', extra: 'pending' } },
      { name: 'Code', type: 'n8n-nodes-base.code', notes: { category: 'HAND', extra: 'pending' } },
      { name: 'IF', type: 'n8n-nodes-base.if' },
    ]);

    agent.initializeConfigState('s1', 'wf-1', workflow);
    const state = sessionService.getConfigAgentState('s1');

    expect(state?.configurableNodes.map((node) => node.name)).toEqual(['Set A', 'HTTP', 'Code']);
    // progress 只计软件配置节点（TTS），纯硬件节点（CAM、HAND）由数字孪生管理
    expect(state?.progress).toEqual({ total: 1, completed: 0, percentage: 0 });
  });

  it('同类硬件节点仅保留一个待配置项（按首次出现）', () => {
    const workflow = buildWorkflow([
      { name: 'hand_rock', type: 'n8n-nodes-base.code', notes: { category: 'HAND', extra: 'pending' } },
      { name: 'hand_paper', type: 'n8n-nodes-base.code', notes: { category: 'HAND', extra: 'pending' } },
      { name: 'screen_draw', type: 'n8n-nodes-base.httpRequest', notes: { category: 'SCREEN', extra: 'pending' } },
      { name: 'screen_win', type: 'n8n-nodes-base.httpRequest', notes: { category: 'SCREEN', extra: 'pending' } },
      { name: 'set_tts', type: 'n8n-nodes-base.set', notes: { category: 'TTS', extra: 'pending' } },
    ]);

    agent.initializeConfigState('s1', 'wf-1', workflow);
    const state = sessionService.getConfigAgentState('s1');

    // 排序：软件配置节点在前（TTS），再按硬件原序（SCREEN 有 emoji 选择也非纯硬件，HAND 纯硬件）
    expect(state?.configurableNodes.map((node) => node.name)).toEqual(['set_tts', 'hand_rock', 'screen_draw']);
    expect(state?.configurableNodes.map((node) => node.category)).toEqual(['TTS', 'HAND', 'SCREEN']);
    // progress 只计软件配置节点：TTS + SCREEN（有 emoji 选择）= 2，HAND 纯硬件排除
    expect(state?.progress).toEqual({ total: 2, completed: 0, percentage: 0 });
  });

  it('startConfigureCurrentNode 将节点状态置为 configuring', async () => {
    const workflow = buildWorkflow([
      { name: 'set_TTS', type: 'n8n-nodes-base.set', notes: { category: 'TTS', extra: 'pending' } },
    ]);

    n8nClient.getWorkflow.mockResolvedValue({
      id: 'wf-1',
      name: workflow.name,
      nodes: [{ name: 'set_TTS', type: 'n8n-nodes-base.set', notes: { category: 'TTS', extra: 'pending' } }],
      connections: {},
    });

    await agent.initializeFromWorkflow('s1', 'wf-1', workflow);
    const current = await agent.startConfigureCurrentNode('s1');

    expect(current?.status).toBe('configuring');
    expect(current?.extra).toBe('configuring');
    expect(n8nClient.updateWorkflow).toHaveBeenCalledTimes(1);
  });

  it('confirmNodeConfig 更新节点并推进到下一个节点', async () => {
    const workflow = buildWorkflow([
      {
        name: 'set_TTS',
        type: 'n8n-nodes-base.set',
        notes: { category: 'TTS', title: 'TTS节点', subtitle: '语音', session_ID: 'sess_1', extra: 'pending' },
      },
      {
        name: 'http_CAM',
        type: 'n8n-nodes-base.httpRequest',
        notes: { category: 'CAM', title: '摄像头', subtitle: '抓拍', session_ID: 'sess_1', extra: 'pending' },
      },
    ]);

    n8nClient.getWorkflow.mockImplementation(async () => ({
      id: 'wf-1',
      name: workflow.name,
      nodes: [
        {
          name: 'set_TTS',
          type: 'n8n-nodes-base.set',
          notes: { category: 'TTS', title: 'TTS节点', subtitle: '语音', session_ID: 'sess_1', extra: 'pending', sub: {} },
        },
        {
          name: 'http_CAM',
          type: 'n8n-nodes-base.httpRequest',
          notes: { category: 'CAM', title: '摄像头', subtitle: '抓拍', session_ID: 'sess_1', extra: 'pending', sub: {} },
        },
      ],
      connections: {},
    }));

    await agent.initializeFromWorkflow('s1', 'wf-1', workflow);
    await agent.startConfigureCurrentNode('s1');

    const result = await agent.confirmNodeConfig('s1', 'set_TTS', {
      TTS_input: '欢迎来到猜拳游戏',
      sub: {
        audio_name: 'count_down',
      },
    });

    expect(result.success).toBe(true);
    expect(result.nextNode?.name).toBe('http_CAM');
    // TTS 是唯一软件节点，配置后 100%；CAM 是纯硬件，不计入进度
    expect(result.progress).toEqual({ total: 1, completed: 1, percentage: 100 });

    const [, payload] = n8nClient.updateWorkflow.mock.calls.at(-1) as [string, Record<string, unknown>];
    const updatedNode = (payload.nodes as Array<Record<string, unknown>>).find((node) => node.name === 'set_TTS');
    expect((updatedNode?.notes as any).extra).toBe('configured');
    expect((updatedNode?.notes as any).sub.TTS_input).toBe('欢迎来到猜拳游戏');
    expect((updatedNode?.notes as any).sub.audio_name).toBe('count_down');

    const sessionWorkflow = sessionService.getWorkflow('s1');
    const sessionNode = sessionWorkflow?.nodes.find((node) => node.name === 'set_TTS') as Record<string, any> | undefined;
    expect(sessionNode?.notes?.extra).toBe('configured');
    expect(sessionNode?.notes?.sub?.TTS_input).toBe('欢迎来到猜拳游戏');
  });

  it('纯硬件节点工作流进入 hot_plugging 并等待组装确认', () => {
    const workflow = buildWorkflow([
      {
        name: 'http_CAM',
        type: 'n8n-nodes-base.httpRequest',
        notes: { category: 'CAM', title: '摄像头', subtitle: '抓拍', session_ID: 'sess_1', extra: 'pending' },
      },
    ]);

    agent.initializeConfigState('s1', 'wf-1', workflow);
    const response = agent.startConfiguration('s1');

    expect(response.type).toBe('hot_plugging');
    if (response.type !== 'hot_plugging') {
      throw new Error('Expected hot_plugging response');
    }
    expect(response.metadata?.allPendingHardwareNodeNames).toEqual(['http_CAM']);
  });

  it('混合工作流中 hot_plugging 响应会暴露 5 个真实接口选项', () => {
    const workflow = buildWorkflow([
      {
        name: 'set_TTS',
        type: 'n8n-nodes-base.set',
        notes: { category: 'TTS', title: 'TTS节点', subtitle: '语音', session_ID: 'sess_1', extra: 'configured', sub: { TTS_input: '你好' } },
      },
      {
        name: 'http_CAM',
        type: 'n8n-nodes-base.httpRequest',
        notes: { category: 'CAM', title: '摄像头', subtitle: '抓拍', session_ID: 'sess_1', extra: 'pending' },
      },
    ]);

    // TTS 已 configured，只剩 CAM（纯硬件） → 软件配置完成但仍需进入硬件组装
    agent.initializeConfigState('s1', 'wf-1', workflow);
    const response = agent.startConfiguration('s1');
    expect(response.type).toBe('hot_plugging');
    if (response.type !== 'hot_plugging') {
      throw new Error('Expected hot_plugging response');
    }
    expect(response.metadata?.allPendingHardwareNodeNames).toEqual(['http_CAM']);
  });

  it('纯硬件多组件工作流同样进入 hot_plugging', () => {
    const workflow = buildWorkflow([
      {
        name: 'http_CAM',
        type: 'n8n-nodes-base.httpRequest',
        notes: { category: 'CAM', title: '摄像头', subtitle: '抓拍', session_ID: 'sess_1', extra: 'pending' },
      },
      {
        name: 'code_WHEEL',
        type: 'n8n-nodes-base.code',
        notes: { category: 'WHEEL', title: '底盘移动', subtitle: '向前移动', session_ID: 'sess_1', extra: 'pending' },
      },
    ]);

    agent.initializeConfigState('s1', 'wf-1', workflow);
    const response = agent.startConfiguration('s1');

    expect(response.type).toBe('hot_plugging');
    if (response.type !== 'hot_plugging') {
      throw new Error('Expected hot_plugging response');
    }
    expect(response.metadata?.allPendingHardwareNodeNames).toEqual([
      'http_CAM',
      'code_WHEEL',
    ]);
  });

  it('硬件确认支持通过 portId 回传接口位置并写回 topology', async () => {
    const workflow = buildWorkflow([
      {
        name: 'http_CAM',
        type: 'n8n-nodes-base.httpRequest',
        notes: { category: 'CAM', title: '摄像头', subtitle: '抓拍', session_ID: 'sess_1', extra: 'pending' },
      },
    ]);

    n8nClient.getWorkflow.mockResolvedValue({
      id: 'wf-1',
      name: workflow.name,
      nodes: structuredClone(workflow.nodes),
      connections: {},
    });

    await agent.initializeFromWorkflow('s1', 'wf-1', workflow);
    await agent.startConfigureCurrentNode('s1');

    const result = await agent.confirmNodeConfig('s1', 'http_CAM', {
      portId: 'port_6',
      device_ID: 'camera-live-001',
    });

    expect(result.success).toBe(true);

    const [, payload] = n8nClient.updateWorkflow.mock.calls.at(-1) as [string, Record<string, unknown>];
    const updatedNode = (payload.nodes as Array<Record<string, unknown>>).find((node) => node.name === 'http_CAM');
    expect((updatedNode?.notes as any).topology).toBe('port_3');
    expect((updatedNode?.notes as any).device_ID).toBe('camera-live-001');

    const state = agent.getState('s1');
    expect(state?.configurableNodes[0].configValues?.portId).toBe('port_3');
    expect(state?.configurableNodes[0].configValues?.topology).toBe('port_3');
  });

  it('支持解析字符串 notes.sub 并暴露为可交互字段', () => {
    const workflow = buildWorkflow([
      {
        name: 'set_countdown_config',
        type: 'n8n-nodes-base.set',
        notes: {
          category: 'TTS',
          extra: 'pending',
          sub: 'TTS_input: 三、二、一！, audio_name: count_down',
        },
      },
    ]);

    agent.initializeConfigState('s1', 'wf-1', workflow);
    const state = sessionService.getConfigAgentState('s1');
    const node = state?.configurableNodes[0];

    expect(node?.configFields?.subKeys).toContain('TTS_input');
    expect(node?.configFields?.subKeys).toContain('audio_name');
    expect(node?.configValues?.sub?.TTS_input).toBe('三、二、一！');
    expect(node?.configValues?.sub?.audio_name).toBe('count_down');
  });

  it('extra 状态机: pending -> configuring -> configured', async () => {
    const workflow = buildWorkflow([
      {
        name: 'set_TTS',
        type: 'n8n-nodes-base.set',
        notes: { category: 'TTS', title: 'TTS节点', subtitle: '语音', session_ID: 'sess_1', extra: 'pending' },
      },
    ]);

    n8nClient.getWorkflow.mockResolvedValue({
      id: 'wf-1',
      name: workflow.name,
      nodes: [
        {
          name: 'set_TTS',
          type: 'n8n-nodes-base.set',
          notes: { category: 'TTS', title: 'TTS节点', subtitle: '语音', session_ID: 'sess_1', extra: 'pending', sub: {} },
        },
      ],
      connections: {},
    });

    await agent.initializeFromWorkflow('s1', 'wf-1', workflow);

    const before = agent.getCurrentNode('s1');
    expect(before?.extra).toBe('pending');

    const configuring = await agent.startConfigureCurrentNode('s1');
    expect(configuring?.extra).toBe('configuring');

    const result = await agent.confirmNodeConfig('s1', 'set_TTS', { TTS_input: '测试' });
    expect(result.isComplete).toBe(true);

    const state = agent.getState('s1');
    expect(state?.configurableNodes[0].extra).toBe('configured');
  });

  it('confirmNodeDeployed 纯硬件节点已初始化即 completed', async () => {
    const workflow = buildWorkflow([
      {
        name: 'http_camera',
        type: 'n8n-nodes-base.httpRequest',
        notes: { category: 'CAM', title: '摄像头', subtitle: '抓拍', session_ID: 'sess_1', extra: 'pending' },
      },
    ]);

    n8nClient.getWorkflow.mockResolvedValue({
      id: 'wf-1',
      name: workflow.name,
      nodes: [
        {
          name: 'http_camera',
          type: 'n8n-nodes-base.httpRequest',
          notes: { category: 'CAM', title: '摄像头', subtitle: '抓拍', session_ID: 'sess_1', extra: 'pending', sub: {} },
        },
      ],
      connections: {},
    });

    agent.initializeConfigState('s1', 'wf-1', workflow);
    // 纯硬件工作流直接进入硬件组装阶段
    const start = agent.startConfiguration('s1');
    expect(start.type).toBe('hot_plugging');

    const response = await agent.confirmNodeDeployed('s1');
    expect(response.type).toBe('config_complete');
  });

  it('同类硬件组件确认一次后，同类节点全部标记 configured', async () => {
    const workflow = buildWorkflow([
      {
        name: 'code_hand_rock',
        type: 'n8n-nodes-base.code',
        notes: { category: 'HAND', title: '机械手-石头', session_ID: 'sess_1', extra: 'pending' },
      },
      {
        name: 'code_hand_paper',
        type: 'n8n-nodes-base.code',
        notes: { category: 'HAND', title: '机械手-布', session_ID: 'sess_1', extra: 'pending' },
      },
      {
        name: 'code_hand_scissors',
        type: 'n8n-nodes-base.code',
        notes: { category: 'HAND', title: '机械手-剪刀', session_ID: 'sess_1', extra: 'pending' },
      },
    ]);

    n8nClient.getWorkflow.mockResolvedValue({
      id: 'wf-1',
      name: workflow.name,
      nodes: structuredClone(workflow.nodes),
      connections: {},
    });

    agent.initializeConfigState('s1', 'wf-1', workflow);
    // 纯硬件工作流（HAND only）在初始化后等待组装确认
    const start = agent.startConfiguration('s1');
    expect(start.type).toBe('hot_plugging');
  });

  it('TTS 节点通过对话输入 TTS_input 后完成配置', async () => {
    const workflow = buildWorkflow([
      {
        name: 'set_tts',
        type: 'n8n-nodes-base.set',
        notes: {
          category: 'TTS',
          title: 'TTS 节点',
          subtitle: '语音播报',
          session_ID: 'sess_1',
          extra: 'pending',
          sub: { TTS_input: '' },
        },
      },
    ]);

    const storedWorkflow: WorkflowDefinition & { id?: string } = {
      id: 'wf-1',
      ...workflow,
    };
    n8nClient.getWorkflow.mockImplementation(async () => structuredClone(storedWorkflow));
    n8nClient.updateWorkflow.mockImplementation(async (_workflowId: string, payload: WorkflowDefinition) => {
      storedWorkflow.name = payload.name;
      storedWorkflow.nodes = payload.nodes;
      storedWorkflow.connections = payload.connections;
      storedWorkflow.settings = payload.settings;
      storedWorkflow.meta = payload.meta;
      return { success: true };
    });

    agent.initializeConfigState('s1', 'wf-1', workflow);
    const start = agent.startConfiguration('s1');
    expect(start.type).toBe('config_input');
    if (start.type !== 'config_input') {
      throw new Error('Expected config_input response');
    }
    expect(start.metadata?.showConfirmButton).toBe(false);

    const response = await agent.processConfigurationInput('s1', 'TTS_input: 欢迎来到猜拳游戏');
    expect(response.type).toBe('config_complete');

    const notes = (storedWorkflow.nodes[0] as Record<string, any>).notes;
    expect(notes.sub.TTS_input).toBe('欢迎来到猜拳游戏');
  });

  it('TTS 节点已有默认值时先二选一确认是否修改', async () => {
    const workflow = buildWorkflow([
      {
        name: 'set_tts',
        type: 'n8n-nodes-base.set',
        notes: {
          category: 'TTS',
          title: 'TTS 节点',
          subtitle: '语音播报',
          session_ID: 'sess_1',
          extra: 'pending',
          sub: { TTS_input: '默认播报文案' },
        },
      },
    ]);

    const storedWorkflow: WorkflowDefinition & { id?: string } = {
      id: 'wf-1',
      ...workflow,
    };
    n8nClient.getWorkflow.mockImplementation(async () => structuredClone(storedWorkflow));
    n8nClient.updateWorkflow.mockImplementation(async (_workflowId: string, payload: WorkflowDefinition) => {
      storedWorkflow.name = payload.name;
      storedWorkflow.nodes = payload.nodes;
      storedWorkflow.connections = payload.connections;
      storedWorkflow.settings = payload.settings;
      storedWorkflow.meta = payload.meta;
      return { success: true };
    });

    agent.initializeConfigState('s1', 'wf-1', workflow);
    const start = agent.startConfiguration('s1');
    expect(start.type).toBe('select_single');

    const step2 = await agent.processConfigurationInput('s1', 'yes');
    expect(step2.type).toBe('config_input');

    const done = await agent.processConfigurationInput('s1', '新的播报文案');
    expect(done.type).toBe('config_complete');

    const notes = (storedWorkflow.nodes[0] as Record<string, any>).notes;
    expect(notes.sub.TTS_input).toBe('新的播报文案');
  });

  it('TTS 默认值确认支持前端消息格式“音色 no”并保持默认', async () => {
    const workflow = buildWorkflow([
      {
        name: 'set_tts',
        type: 'n8n-nodes-base.set',
        notes: {
          category: 'TTS',
          title: 'TTS 节点',
          subtitle: '语音播报',
          session_ID: 'sess_1',
          extra: 'pending',
          sub: { TTS_input: '默认播报文案' },
        },
      },
    ]);

    const storedWorkflow: WorkflowDefinition & { id?: string } = {
      id: 'wf-1',
      ...workflow,
    };
    n8nClient.getWorkflow.mockImplementation(async () => structuredClone(storedWorkflow));
    n8nClient.updateWorkflow.mockImplementation(async (_workflowId: string, payload: WorkflowDefinition) => {
      storedWorkflow.name = payload.name;
      storedWorkflow.nodes = payload.nodes;
      storedWorkflow.connections = payload.connections;
      storedWorkflow.settings = payload.settings;
      storedWorkflow.meta = payload.meta;
      return { success: true };
    });

    agent.initializeConfigState('s1', 'wf-1', workflow);
    const start = agent.startConfiguration('s1');
    expect(start.type).toBe('select_single');

    const done = await agent.processConfigurationInput('s1', '音色 no');
    expect(done.type).toBe('config_complete');

    const notes = (storedWorkflow.nodes[0] as Record<string, any>).notes;
    expect(notes.sub.TTS_input).toBe('默认播报文案');
  });

  it('SCREEN 节点支持二步对话：是否修改 + 表情选择', async () => {
    const workflow = buildWorkflow([
      {
        name: 'http_screen',
        type: 'n8n-nodes-base.httpRequest',
        notes: {
          category: 'SCREEN',
          title: '屏幕节点',
          subtitle: '表情显示',
          session_ID: 'sess_1',
          extra: 'pending',
          sub: { execute_emoji: 'Peace' },
        },
      },
    ]);

    const storedWorkflow: WorkflowDefinition & { id?: string } = {
      id: 'wf-1',
      ...workflow,
    };
    n8nClient.getWorkflow.mockImplementation(async () => structuredClone(storedWorkflow));
    n8nClient.updateWorkflow.mockImplementation(async (_workflowId: string, payload: WorkflowDefinition) => {
      storedWorkflow.name = payload.name;
      storedWorkflow.nodes = payload.nodes;
      storedWorkflow.connections = payload.connections;
      storedWorkflow.settings = payload.settings;
      storedWorkflow.meta = payload.meta;
      return { success: true };
    });

    agent.initializeConfigState('s1', 'wf-1', workflow);
    const start = agent.startConfiguration('s1');
    expect(start.type).toBe('select_single');

    const step2 = await agent.processConfigurationInput('s1', '屏幕 emoji yes');
    expect(step2.type).toBe('select_single');

    const done = await agent.processConfigurationInput('s1', '屏幕 emoji Angry');
    expect(done.type).toBe('config_complete');
    const notes = (storedWorkflow.nodes[0] as Record<string, any>).notes;
    expect(notes.sub.execute_emoji).toBe('Angry');
  });

  it('分支执行器配置提示带上条件分支标题', () => {
    const workflow: WorkflowDefinition = {
      name: 'Emotion Branch Workflow',
      nodes: [
        {
          name: 'if_emotion_is_happy',
          type: 'n8n-nodes-base.if',
          notes: {
            category: 'BASE',
            title: '',
            subtitle: '',
            session_ID: 'sess_1',
            extra: 'configured',
          },
        },
        {
          name: 'code_screen_execute_emoji_happy',
          type: 'n8n-nodes-base.code',
          notes: {
            category: 'SCREEN',
            title: '胜负表情展示-开心',
            subtitle: '物理显示单元，根据结果显示开心表情。',
            session_ID: 'sess_1',
            extra: 'pending',
            sub: { execute_emoji: 'Happy' },
          },
        },
      ],
      connections: {
        if_emotion_is_happy: {
          main: [[{ node: 'code_screen_execute_emoji_happy', type: 'main', index: 0 }], []],
        },
      },
    };

    agent.initializeConfigState('s1', 'wf-1', workflow);
    const start = agent.startConfiguration('s1');

    expect(start.type).toBe('select_single');
    if (start.type !== 'select_single') {
      throw new Error('Expected select_single response');
    }
    expect(start.message).toContain('如果用户的情绪是开心');
    expect(start.message).toContain('当前屏幕默认表情为「开心」');
  });

  it('人物身份分支下的配置提示带上中文条件标题', () => {
    const workflow: WorkflowDefinition = {
      name: 'Identity Branch Workflow',
      nodes: [
        {
          name: 'if_identity_is_liu',
          type: 'n8n-nodes-base.if',
          notes: {
            category: 'BASE',
            title: '',
            subtitle: '',
            session_ID: 'sess_1',
            extra: 'configured',
          },
        },
        {
          name: 'set_tts_liu_reply',
          type: 'n8n-nodes-base.set',
          notes: {
            category: 'TTS',
            title: '对战脚本合成',
            subtitle: '表达转换单元，将对战结果文本实时转成语音。',
            session_ID: 'sess_1',
            extra: 'pending',
            sub: { TTS_input: '' },
          },
        },
      ],
      connections: {
        if_identity_is_liu: {
          main: [[{ node: 'set_tts_liu_reply', type: 'main', index: 0 }], []],
        },
      },
    };

    agent.initializeConfigState('s1', 'wf-1', workflow);
    const start = agent.startConfiguration('s1');

    expect(start.type).toBe('config_input');
    expect(start.message).toContain('如果识别到的人物是老刘');
    expect(start.message).toContain('请你输入希望语音合成的文字内容');
  });

  it('FACE-NET 节点返回 image_upload 交互并隐藏确认按钮', () => {
    const workflow = buildWorkflow([
      {
        name: 'set_facenet',
        type: 'n8n-nodes-base.set',
        notes: {
          category: 'FACE-NET',
          title: 'FaceNet 节点',
          subtitle: '人脸识别',
          session_ID: 'sess_1',
          extra: 'pending',
          sub: { face_info: '老刘' },
        },
      },
    ]);

    const session = sessionService.getOrCreate();
    sessionService.updateConfirmedEntities(session.id, { person_name: '老刘' });
    agent.initializeConfigState(session.id, 'wf-1', workflow);
    const start = agent.startConfiguration(session.id);

    expect(start.type).toBe('image_upload');
    if (start.type !== 'image_upload') {
      throw new Error('Expected image_upload response');
    }
    expect(start.interaction?.mode).toBe('image');
    expect(start.interaction?.field).toBe('face_profiles');
    expect(start.interaction?.allowUpload).toBe(true);
    expect(start.metadata?.showConfirmButton).toBe(false);
    expect(start.interaction?.options.some((option) => option.value === '老刘')).toBe(true);
  });

  it('FACE-NET 上传图片后推进到下一个节点配置', async () => {
    const workflow = buildWorkflow([
      {
        name: 'set_facenet',
        type: 'n8n-nodes-base.set',
        notes: {
          category: 'FACE-NET',
          title: 'FaceNet 节点',
          subtitle: '人脸识别',
          session_ID: 'sess_1',
          extra: 'pending',
          sub: {},
        },
      },
    ]);

    const storedWorkflow: WorkflowDefinition & { id?: string } = {
      id: 'wf-1',
      ...workflow,
    };
    n8nClient.getWorkflow.mockImplementation(async () => structuredClone(storedWorkflow));
    n8nClient.updateWorkflow.mockImplementation(async (_workflowId: string, payload: WorkflowDefinition) => {
      storedWorkflow.name = payload.name;
      storedWorkflow.nodes = payload.nodes;
      storedWorkflow.connections = payload.connections;
      storedWorkflow.settings = payload.settings;
      storedWorkflow.meta = payload.meta;
      return { success: true };
    });

    const session = sessionService.getOrCreate();
    sessionService.updateConfirmedEntities(session.id, { person_name: '老刘' });
    agent.initializeConfigState(session.id, 'wf-1', workflow);
    const start = agent.startConfiguration(session.id);
    expect(start.type).toBe('image_upload');

    const done = await agent.processConfigurationInput(
      session.id,
      '人脸识别 老刘 图片 /uploads/laoliu_test.png'
    );
    expect(done.type).toBe('config_complete');

    const notes = (storedWorkflow.nodes[0] as Record<string, any>).notes;
    expect(notes.sub.face_info).toBe('老刘');
    expect(notes.sub.face_url).toBe('/uploads/laoliu_test.png');
  });

  it('FACE-NET 支持解析嵌套 JSON 上传负载', async () => {
    const workflow = buildWorkflow([
      {
        name: 'set_face_net_recognition_liu',
        type: 'n8n-nodes-base.set',
        notes: {
          category: 'FACE-NET',
          title: 'AI 特征识别器-老刘',
          subtitle: '人脸识别',
          session_ID: 'sess_1',
          extra: 'pending',
          sub: { face_info: '老刘' },
        },
      },
    ]);

    const storedWorkflow: WorkflowDefinition & { id?: string } = {
      id: 'wf-1',
      ...workflow,
    };
    n8nClient.getWorkflow.mockImplementation(async () => structuredClone(storedWorkflow));
    n8nClient.updateWorkflow.mockImplementation(async (_workflowId: string, payload: WorkflowDefinition) => {
      storedWorkflow.name = payload.name;
      storedWorkflow.nodes = payload.nodes;
      storedWorkflow.connections = payload.connections;
      storedWorkflow.settings = payload.settings;
      storedWorkflow.meta = payload.meta;
      return { success: true };
    });

    const session = sessionService.getOrCreate();
    sessionService.updateConfirmedEntities(session.id, { person_name: '老刘' });
    agent.initializeConfigState(session.id, 'wf-1', workflow);
    const start = agent.startConfiguration(session.id);
    expect(start.type).toBe('image_upload');

    const done = await agent.processConfigurationInput(
      session.id,
      JSON.stringify({
        payload: {
          upload: {
            url: 'https://example.com/faces/laoliu.png',
          },
        },
      })
    );
    expect(done.type).toBe('config_complete');

    const notes = (storedWorkflow.nodes[0] as Record<string, any>).notes;
    expect(notes.sub.face_info).toBe('老刘');
    expect(notes.sub.face_url).toBe('https://example.com/faces/laoliu.png');
  });

  it('多个人脸识别节点按节点默认人物逐个上传配置', async () => {
    const workflow = buildWorkflow([
      {
        name: 'set_face_net_recognition_liu',
        type: 'n8n-nodes-base.set',
        notes: {
          category: 'FACE-NET',
          title: 'AI 特征识别器-老刘',
          subtitle: '人脸识别',
          session_ID: 'sess_1',
          extra: 'pending',
          sub: { face_info: '老刘' },
        },
      },
      {
        name: 'set_face_net_recognition_fu',
        type: 'n8n-nodes-base.set',
        notes: {
          category: 'FACE-NET',
          title: 'AI 特征识别器-老付',
          subtitle: '人脸识别',
          session_ID: 'sess_1',
          extra: 'pending',
          sub: { face_info: '老付' },
        },
      },
    ]);

    const storedWorkflow: WorkflowDefinition & { id?: string } = {
      id: 'wf-1',
      ...workflow,
    };
    n8nClient.getWorkflow.mockImplementation(async () => structuredClone(storedWorkflow));
    n8nClient.updateWorkflow.mockImplementation(async (_workflowId: string, payload: WorkflowDefinition) => {
      storedWorkflow.name = payload.name;
      storedWorkflow.nodes = payload.nodes;
      storedWorkflow.connections = payload.connections;
      storedWorkflow.settings = payload.settings;
      storedWorkflow.meta = payload.meta;
      return { success: true };
    });

    const session = sessionService.getOrCreate();
    sessionService.updateConfirmedEntities(session.id, { person_name: '老刘,老付' });
    agent.initializeConfigState(session.id, 'wf-1', workflow);
    const start = agent.startConfiguration(session.id);
    expect(start.type).toBe('image_upload');
    if (start.type !== 'image_upload') {
      throw new Error('Expected image_upload response');
    }
    expect(start.interaction?.selected).toBe('老刘');
    expect(start.interaction?.options.map((item) => item.value)).toEqual(['老刘']);

    const next = await agent.processConfigurationInput(session.id, '/uploads/laoliu.png');
    expect(next.type).toBe('image_upload');
    if (next.type !== 'image_upload') {
      throw new Error('Expected image_upload response');
    }
    expect(next.interaction?.selected).toBe('老付');
    expect(next.interaction?.options.map((item) => item.value)).toEqual(['老付']);

    const done = await agent.processConfigurationInput(session.id, '/uploads/laofu.png');
    expect(done.type).toBe('config_complete');

    const firstNotes = (storedWorkflow.nodes[0] as Record<string, any>).notes;
    const secondNotes = (storedWorkflow.nodes[1] as Record<string, any>).notes;
    expect(firstNotes.sub.face_info).toBe('老刘');
    expect(firstNotes.sub.face_url).toBe('/uploads/laoliu.png');
    expect(secondNotes.sub.face_info).toBe('老付');
    expect(secondNotes.sub.face_url).toBe('/uploads/laofu.png');
  });

  it('FACE-NET 节点缺少 face_info 时按节点名绑定单人物选项', async () => {
    const workflow = buildWorkflow([
      {
        name: 'set_face_net_recognition_liu',
        type: 'n8n-nodes-base.set',
        notes: {
          category: 'FACE-NET',
          title: 'AI 特征识别器-老刘',
          subtitle: '人脸识别',
          session_ID: 'sess_1',
          extra: 'pending',
          sub: {},
        },
      },
      {
        name: 'set_face_net_recognition_fu',
        type: 'n8n-nodes-base.set',
        notes: {
          category: 'FACE-NET',
          title: 'AI 特征识别器-老付',
          subtitle: '人脸识别',
          session_ID: 'sess_1',
          extra: 'pending',
          sub: {},
        },
      },
    ]);

    const storedWorkflow: WorkflowDefinition & { id?: string } = { id: 'wf-1', ...workflow };
    n8nClient.getWorkflow.mockImplementation(async () => structuredClone(storedWorkflow));
    n8nClient.updateWorkflow.mockImplementation(async (_workflowId: string, payload: WorkflowDefinition) => {
      storedWorkflow.name = payload.name;
      storedWorkflow.nodes = payload.nodes;
      storedWorkflow.connections = payload.connections;
      storedWorkflow.settings = payload.settings;
      storedWorkflow.meta = payload.meta;
      return { success: true };
    });

    const session = sessionService.getOrCreate();
    sessionService.updateConfirmedEntities(session.id, { person_name: '老刘,老付' });
    agent.initializeConfigState(session.id, 'wf-1', workflow);
    const first = agent.startConfiguration(session.id);
    expect(first.type).toBe('image_upload');
    if (first.type !== 'image_upload') {
      throw new Error('Expected image_upload response');
    }
    expect(first.interaction?.options.map((item) => item.value)).toEqual(['老刘']);

    const second = await agent.processConfigurationInput(session.id, '/uploads/laoliu.png');
    expect(second.type).toBe('image_upload');
    if (second.type !== 'image_upload') {
      throw new Error('Expected image_upload response');
    }
    expect(second.interaction?.options.map((item) => item.value)).toEqual(['老付']);
  });

  it('FACE-NET 无人物信息时提供通用选项兜底', () => {
    const workflow = buildWorkflow([
      {
        name: 'set_facenet',
        type: 'n8n-nodes-base.set',
        notes: {
          category: 'FACE-NET',
          title: 'FaceNet 节点',
          subtitle: '人脸识别',
          session_ID: 'sess_1',
          extra: 'pending',
          sub: {},
        },
      },
    ]);

    const session = sessionService.getOrCreate();
    agent.initializeConfigState(session.id, 'wf-1', workflow);
    const start = agent.startConfiguration(session.id);

    expect(start.type).toBe('image_upload');
    if (start.type !== 'image_upload') {
      throw new Error('Expected image_upload response');
    }
    expect(start.interaction?.options.some((option) => option.value === '目标人物')).toBe(true);
  });

  // ============================================================
  // CONFIG_SKIP_CATEGORIES 跳过逻辑测试
  // ============================================================

  it('跳过 YOLO-RPS 类别节点（处理器，无硬件配置需求）', () => {
    const workflow = buildWorkflow([
      {
        name: 'set_yolo',
        type: 'n8n-nodes-base.set',
        notes: { category: 'YOLO-RPS', extra: 'pending', sub: { yolov_input: 'camera1' } },
      },
      {
        name: 'set_tts',
        type: 'n8n-nodes-base.set',
        notes: { category: 'TTS', extra: 'pending', sub: { TTS_input: '' } },
      },
    ]);

    agent.initializeConfigState('s1', 'wf-1', workflow);
    const state = sessionService.getConfigAgentState('s1');

    // YOLO-RPS 被跳过，只有 TTS 进入配置列表
    expect(state?.configurableNodes.map((n) => n.name)).toEqual(['set_tts']);
    expect(state?.configurableNodes.map((n) => n.category)).toEqual(['TTS']);
  });

  it('跳过 RAM 类别节点（随机处理器）', () => {
    const workflow = buildWorkflow([
      {
        name: 'set_ram',
        type: 'n8n-nodes-base.set',
        notes: { category: 'RAM', extra: 'pending', sub: { random_rule: 3 } },
      },
      {
        name: 'http_cam',
        type: 'n8n-nodes-base.httpRequest',
        notes: { category: 'CAM', extra: 'pending' },
      },
    ]);

    agent.initializeConfigState('s1', 'wf-1', workflow);
    const state = sessionService.getConfigAgentState('s1');

    // RAM 被跳过，只有 CAM 进入配置列表
    expect(state?.configurableNodes.map((n) => n.name)).toEqual(['http_cam']);
  });

  it('跳过 ASSIGN 类别节点（状态存储器）', () => {
    const workflow = buildWorkflow([
      {
        name: 'set_assign',
        type: 'n8n-nodes-base.set',
        notes: { category: 'ASSIGN', extra: 'pending', sub: { robotGesture: 'rock' } },
      },
      {
        name: 'code_hand',
        type: 'n8n-nodes-base.code',
        notes: { category: 'HAND', extra: 'pending' },
      },
    ]);

    agent.initializeConfigState('s1', 'wf-1', workflow);
    const state = sessionService.getConfigAgentState('s1');

    // ASSIGN 被跳过，只有 HAND 进入配置列表
    expect(state?.configurableNodes.map((n) => n.name)).toEqual(['code_hand']);
  });

  it('跳过 BASE 类别节点（触发器/逻辑节点）', () => {
    const workflow = buildWorkflow([
      {
        name: 'set_base',
        type: 'n8n-nodes-base.set',
        notes: { category: 'BASE', extra: 'pending' },
      },
      {
        name: 'code_speaker',
        type: 'n8n-nodes-base.code',
        notes: { category: 'SPEAKER', extra: 'pending' },
      },
    ]);

    agent.initializeConfigState('s1', 'wf-1', workflow);
    const state = sessionService.getConfigAgentState('s1');

    // BASE 被跳过，只有 SPEAKER 进入配置列表
    expect(state?.configurableNodes.map((n) => n.name)).toEqual(['code_speaker']);
  });

  it('保留所有 CONFIG_REQUIRED_CATEGORIES 节点', () => {
    const workflow = buildWorkflow([
      { name: 'set_tts', type: 'n8n-nodes-base.set', notes: { category: 'TTS', extra: 'pending' } },
      { name: 'code_speaker', type: 'n8n-nodes-base.code', notes: { category: 'SPEAKER', extra: 'pending' } },
      { name: 'http_cam', type: 'n8n-nodes-base.httpRequest', notes: { category: 'CAM', extra: 'pending' } },
      { name: 'code_hand', type: 'n8n-nodes-base.code', notes: { category: 'HAND', extra: 'pending' } },
      { name: 'http_screen', type: 'n8n-nodes-base.httpRequest', notes: { category: 'SCREEN', extra: 'pending' } },
    ]);

    agent.initializeConfigState('s1', 'wf-1', workflow);
    const state = sessionService.getConfigAgentState('s1');

    // 所有 CONFIG_REQUIRED_CATEGORIES 都保留
    expect(state?.configurableNodes.map((n) => n.category)).toEqual([
      'TTS',
      'SPEAKER',
      'CAM',
      'HAND',
      'SCREEN',
    ]);
  });

  it('混合工作流：跳过处理器，保留硬件节点', () => {
    const workflow = buildWorkflow([
      { name: 'trigger', type: 'n8n-nodes-base.scheduleTrigger', notes: { category: 'BASE', extra: 'pending' } },
      { name: 'http_cam', type: 'n8n-nodes-base.httpRequest', notes: { category: 'CAM', extra: 'pending' } },
      { name: 'set_yolo', type: 'n8n-nodes-base.set', notes: { category: 'YOLO-RPS', extra: 'pending' } },
      { name: 'set_ram', type: 'n8n-nodes-base.set', notes: { category: 'RAM', extra: 'pending' } },
      { name: 'code_hand', type: 'n8n-nodes-base.code', notes: { category: 'HAND', extra: 'pending' } },
      { name: 'set_assign', type: 'n8n-nodes-base.set', notes: { category: 'ASSIGN', extra: 'pending' } },
      { name: 'set_tts', type: 'n8n-nodes-base.set', notes: { category: 'TTS', extra: 'pending' } },
      { name: 'code_speaker', type: 'n8n-nodes-base.code', notes: { category: 'SPEAKER', extra: 'pending' } },
      { name: 'http_screen', type: 'n8n-nodes-base.httpRequest', notes: { category: 'SCREEN', extra: 'pending' } },
    ]);

    agent.initializeConfigState('s1', 'wf-1', workflow);
    const state = sessionService.getConfigAgentState('s1');

    // 跳过: BASE, YOLO-RPS, RAM, ASSIGN
    // 保留: CAM, HAND, TTS, SPEAKER, SCREEN
    // 排序：软件节点在前（TTS、SCREEN），硬件节点在后
    expect(state?.configurableNodes.map((n) => n.category)).toEqual([
      'TTS',
      'CAM',
      'HAND',
      'SPEAKER',
      'SCREEN',
    ]);
    // progress 只计软件配置节点：TTS + SCREEN = 2（SCREEN 有 emoji 选择不是纯硬件）
    expect(state?.progress?.total).toBe(2);
  });

  it('软件配置完成后保留 completed，但 actionReady 仍等待硬件组装', async () => {
    const workflow = buildWorkflow([
      {
        name: 'set_tts',
        type: 'n8n-nodes-base.set',
        notes: { category: 'TTS', title: 'TTS', extra: 'pending', sub: {} },
      },
      {
        name: 'code_hand',
        type: 'n8n-nodes-base.code',
        notes: { category: 'HAND', title: '机械手', extra: 'pending' },
      },
    ]);

    n8nClient.getWorkflow.mockResolvedValue({
      id: 'wf-1',
      name: workflow.name,
      nodes: structuredClone(workflow.nodes),
      connections: {},
    });

    await agent.initializeFromWorkflow('s1', 'wf-1', workflow);
    await agent.startConfigureCurrentNode('s1');

    // 配置 TTS（唯一的软件节点）
    const result = await agent.confirmNodeConfig('s1', 'set_tts', {
      TTS_input: '你好世界',
      sub: { TTS_input: '你好世界' },
    });

    // TTS 完成后，HAND 是纯硬件 → 软件配置 100%，但最终可操作态尚未完成
    expect(result.isComplete).toBe(false);
    expect(result.progress).toEqual({ total: 1, completed: 1, percentage: 100 });

    // ConfigAgentState.completed 代表软件配置已完成
    const state = sessionService.getConfigAgentState('s1');
    expect(state?.completed).toBe(true);
    expect(state?.assemblyCompleted).toBe(false);
    expect(state?.actionReady).toBe(false);
    expect(state?.pendingHardwareNodeNames).toEqual(['code_hand']);

    // HAND 节点仍在列表中，且阻塞最终 actionReady
    const handNode = state?.configurableNodes.find((n) => n.category === 'HAND');
    expect(handNode).toBeDefined();
    expect(handNode?.status).not.toBe('configured');
  });
});
