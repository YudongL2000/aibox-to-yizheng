import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigAgentService } from '../../../src/agents/config-agent-service';
import { SessionService } from '../../../src/agents/session-service';
import type { WorkflowDefinition } from '../../../src/agents/types';
import { getN8nApiConfig } from '../../../src/config/n8n-api';
import { N8nApiClient } from '../../../src/services/n8n-api-client';

vi.mock('../../../src/config/n8n-api', () => ({
  getN8nApiConfig: vi.fn(),
}));

vi.mock('../../../src/services/n8n-api-client', () => ({
  N8nApiClient: vi.fn(),
}));

describe('ConfigAgentService', () => {
  let sessionService: SessionService;
  let currentConfig: any;
  let storedWorkflow: WorkflowDefinition & { id?: string };
  let getWorkflow: ReturnType<typeof vi.fn>;
  let updateWorkflow: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionService = new SessionService();
    currentConfig = null;
    storedWorkflow = {
      id: 'wf-1',
      name: 'Late Bound Config Workflow',
      nodes: [
        {
          name: 'http_CAM',
          type: 'n8n-nodes-base.httpRequest',
          notes: {
            category: 'CAM',
            title: '摄像头',
            subtitle: '抓拍',
            session_ID: 'sess_1',
            extra: 'pending',
            sub: {},
          },
        },
      ],
      connections: {},
    };
    getWorkflow = vi.fn(async () => structuredClone(storedWorkflow));
    updateWorkflow = vi.fn(async (_workflowId: string, payload: WorkflowDefinition) => {
      storedWorkflow = {
        id: storedWorkflow.id,
        name: payload.name,
        nodes: structuredClone(payload.nodes),
        connections: structuredClone(payload.connections),
        settings: payload.settings,
        meta: payload.meta,
      };
      return { success: true };
    });

    vi.mocked(getN8nApiConfig).mockImplementation(() => currentConfig);
    vi.mocked(N8nApiClient).mockImplementation(
      () =>
        ({
          getWorkflow,
          updateWorkflow,
        }) as any
    );
  });

  it('creates config agents that pick up n8n config after service construction', async () => {
    const service = ConfigAgentService.create(sessionService);
    const agent = service.createAgent();

    currentConfig = {
      baseUrl: 'http://localhost:5678/api/v1',
      publicUrl: 'http://localhost:5678',
      apiKey: 'late-key',
      timeout: 30000,
      maxRetries: 3,
    };

    agent.initializeConfigState('s1', 'wf-1', storedWorkflow);
    await agent.startConfigureCurrentNode('s1');
    const result = await agent.confirmNodeConfig('s1', 'http_CAM', {
      portId: 'port_6',
      device_ID: 'camera-late-001',
    });

    expect(result.success).toBe(true);
    expect(result.isComplete).toBe(true);
    expect(N8nApiClient).toHaveBeenCalledWith(currentConfig);
    expect(getWorkflow).toHaveBeenCalledWith('wf-1');
    expect(updateWorkflow).toHaveBeenCalled();
  });
});
