/**
 * [INPUT]: 依赖 n8n API 配置解析与 N8nApiClient 工作流创建能力。
 * [OUTPUT]: 对外提供 WorkflowDeployer，负责在 n8n API 已配置时创建工作流，并在缺少配置或 embedded n8n 稍后才就绪时按请求重解配置、回落为可查询的 unavailable 状态。
 * [POS]: agents 层的工作流部署门面，被 agent-server 复用来对外暴露 workflow create 能力。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { getN8nApiConfig } from '../config/n8n-api';
import { N8nApiClient } from '../services/n8n-api-client';
import type { WorkflowDefinition } from './types';

export interface WorkflowCreateResult {
  workflowId: string;
  workflowName: string;
  workflowUrl: string;
}

type WorkflowCreateClient = Pick<N8nApiClient, 'createWorkflow'>;
type WorkflowDeployerState = {
  n8nClient: WorkflowCreateClient | null;
  n8nBaseUrl: string;
  unavailableReason: string | null;
};

const N8N_API_UNAVAILABLE_MESSAGE =
  'N8N API 未配置，工作流创建功能不可用。请设置 N8N_API_URL 和 N8N_API_KEY。';

export class WorkflowDeployer {
  constructor(
    private n8nClient: WorkflowCreateClient | null,
    private n8nBaseUrl: string,
    private unavailableReason: string | null = null,
    private readonly resolveState?: () => WorkflowDeployerState
  ) {}

  static create(): WorkflowDeployer {
    return new WorkflowDeployer(
      null,
      '',
      N8N_API_UNAVAILABLE_MESSAGE,
      resolveWorkflowDeployerState
    );
  }

  isAvailable(): boolean {
    this.refreshState();
    return Boolean(this.n8nClient);
  }

  getUnavailableReason(): string | null {
    this.refreshState();
    return this.unavailableReason;
  }

  async createWorkflow(workflow: WorkflowDefinition): Promise<WorkflowCreateResult> {
    this.refreshState();
    if (!this.n8nClient) {
      throw new Error(this.unavailableReason ?? N8N_API_UNAVAILABLE_MESSAGE);
    }

    const created = await this.n8nClient.createWorkflow({
      name: workflow.name,
      nodes: workflow.nodes as any,
      connections: workflow.connections as any,
      settings: workflow.settings as any,
      meta: workflow.meta as any,
    });

    return {
      workflowId: created.id as string,
      workflowName: created.name as string,
      workflowUrl: `${this.n8nBaseUrl}/workflow/${created.id}`,
    };
  }

  private refreshState(): void {
    if (!this.resolveState) {
      return;
    }

    const nextState = this.resolveState();
    this.n8nClient = nextState.n8nClient;
    this.n8nBaseUrl = nextState.n8nBaseUrl;
    this.unavailableReason = nextState.unavailableReason;
  }
}

function stripApiBase(url: string): string {
  return url.replace(/\/api\/v\d+\/?$/, '');
}

function resolveWorkflowDeployerState(): WorkflowDeployerState {
  const config = getN8nApiConfig();
  if (!config) {
    return {
      n8nClient: null,
      n8nBaseUrl: '',
      unavailableReason: N8N_API_UNAVAILABLE_MESSAGE,
    };
  }

  return {
    n8nClient: new N8nApiClient(config),
    n8nBaseUrl: stripApiBase(config.publicUrl ?? config.baseUrl),
    unavailableReason: null,
  };
}
