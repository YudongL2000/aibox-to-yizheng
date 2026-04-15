import { describe, expect, it, vi } from 'vitest';
import { SessionService } from '../../../src/agents/session-service';
import { ConfigWorkflowOrchestrator } from '../../../src/agents/config-workflow-orchestrator';
import type { ConfigAgentState } from '../../../src/agents/types';

function buildState(workflowId: string, total: number): ConfigAgentState {
  return {
    workflowId,
    workflowSnapshot: {
      name: 'WF',
      nodes: [],
      connections: {},
    },
    configurableNodes: [],
    currentNodeIndex: 0,
    completed: false,
    progress: { total, completed: 0, percentage: 0 },
  };
}

describe('ConfigWorkflowOrchestrator', () => {
  it('initializes ConfigAgent state via orchestrator', async () => {
    const sessionService = new SessionService();
    const session = sessionService.getOrCreate();
    const workflow = {
      name: 'WF',
      nodes: [{ name: 'set_tts', type: 'n8n-nodes-base.set' }],
      connections: {},
    };
    const state = buildState('wf_123', 1);
    const mockAgent = {
      initializeFromWorkflow: vi.fn().mockResolvedValue(state),
      startConfigureCurrentNode: vi.fn(),
      confirmNodeConfig: vi.fn(),
      buildCurrentNodeResponse: vi.fn().mockReturnValue({
        type: 'hot_plugging',
        message: 'pending',
        currentNode: {
          name: 'set_tts',
          type: 'n8n-nodes-base.set',
          index: 0,
          status: 'pending',
          displayName: 'set_tts',
        },
        progress: { completed: 0, total: 1 },
        metadata: { workflowId: 'wf_123', showConfirmButton: true },
      }),
    } as any;
    const orchestrator = new ConfigWorkflowOrchestrator(sessionService, mockAgent);

    const result = await orchestrator.initializeConfigAgent(session.id, 'wf_123', workflow);

    expect(result.workflowId).toBe('wf_123');
    expect(orchestrator.getConfigState(session.id)?.workflowId).toBe('wf_123');
    expect(mockAgent.initializeFromWorkflow).toHaveBeenCalledWith(session.id, 'wf_123', workflow);
  });

  it('returns config_complete when all nodes are configured', async () => {
    const sessionService = new SessionService();
    const session = sessionService.getOrCreate();
    const workflow = {
      name: 'WF',
      nodes: [{ name: 'set_tts', type: 'n8n-nodes-base.set' }],
      connections: {},
    };
    const state = buildState('wf_123', 1);
    const mockAgent = {
      initializeFromWorkflow: vi.fn().mockResolvedValue(state),
      startConfigureCurrentNode: vi.fn().mockResolvedValue(null),
      confirmNodeConfig: vi.fn().mockResolvedValue({
        success: true,
        nextNode: null,
        isComplete: true,
        progress: { total: 1, completed: 1, percentage: 100 },
      }),
      buildCurrentNodeResponse: vi.fn(),
    } as any;
    const orchestrator = new ConfigWorkflowOrchestrator(sessionService, mockAgent);

    await orchestrator.initializeConfigAgent(session.id, 'wf_123', workflow);
    const response = await orchestrator.confirmNodeConfiguration(session.id, 'set_tts', {
      TTS_input: '测试语音',
    });

    expect(response.type).toBe('config_complete');
    if (response.type !== 'config_complete') {
      throw new Error('Expected config_complete response');
    }
    expect(response.totalConfigured).toBe(1);
    expect(response.metadata?.workflowId).toBe('wf_123');
  });

  it('returns hot_plugging when there are remaining nodes', async () => {
    const sessionService = new SessionService();
    const session = sessionService.getOrCreate();
    const workflow = {
      name: 'WF',
      nodes: [
        { name: 'set_tts', type: 'n8n-nodes-base.set' },
        { name: 'http_screen', type: 'n8n-nodes-base.httpRequest' },
      ],
      connections: {},
    };
    const state = buildState('wf_123', 2);
    const nextNode = {
      name: 'http_screen',
      type: 'n8n-nodes-base.httpRequest',
      index: 1,
      status: 'pending',
      displayName: 'HTTP Request - 屏幕显示',
    };
    const mockAgent = {
      initializeFromWorkflow: vi.fn().mockResolvedValue(state),
      startConfigureCurrentNode: vi.fn().mockResolvedValue(nextNode),
      confirmNodeConfig: vi.fn().mockResolvedValue({
        success: true,
        nextNode,
        isComplete: false,
        progress: { total: 2, completed: 1, percentage: 50 },
      }),
      buildCurrentNodeResponse: vi.fn().mockReturnValue({
        type: 'hot_plugging',
        message: '请配置下一节点',
        currentNode: nextNode,
        progress: { completed: 1, total: 2 },
        metadata: { workflowId: 'wf_123', showConfirmButton: true },
      }),
    } as any;
    const orchestrator = new ConfigWorkflowOrchestrator(sessionService, mockAgent);

    await orchestrator.initializeConfigAgent(session.id, 'wf_123', workflow);
    const response = await orchestrator.confirmNodeConfiguration(session.id, 'set_tts', {
      TTS_input: '继续',
    });

    expect(response.type).toBe('hot_plugging');
    if (response.type !== 'hot_plugging') {
      throw new Error('Expected hot_plugging response');
    }
    expect(response.currentNode?.name).toBe('http_screen');
    expect(response.progress?.completed).toBe(1);
    expect(response.metadata?.showConfirmButton).toBe(true);
    expect(mockAgent.startConfigureCurrentNode).toHaveBeenCalled();
    expect(mockAgent.buildCurrentNodeResponse).toHaveBeenCalled();
  });
});
