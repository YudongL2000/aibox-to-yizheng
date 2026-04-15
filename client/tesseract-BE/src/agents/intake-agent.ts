/**
 * [INPUT]: 依赖 SessionService、Orchestrator 与兼容旧调用方的构造参数
 * [OUTPUT]: 对外提供 IntakeAgent.processUserInput/confirmBlueprint 入口
 * [POS]: agents 的轻量入口代理，负责把用户请求转交给 Orchestrator
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { AgentConfig } from './agent-config';
import { ComponentSelector } from './component-selector';
import { HARDWARE_COMPONENTS, HardwareComponent } from './hardware-components';
import { HardwareService } from './hardware-service';
import { LLMClient } from './llm-client';
import type { MCPClient } from './mcp-client';
import { Orchestrator } from './orchestrator';
import { SessionService } from './session-service';
import { AgentResponse } from './types';
import { WorkflowArchitect } from './workflow-architect';

type WorkflowValidationClient = Pick<MCPClient, 'validateWorkflow' | 'autofixWorkflow'>;

export class IntakeAgent {
  private readonly orchestrator: Orchestrator;

  constructor(
    config: AgentConfig,
    llmClient: LLMClient,
    workflowArchitect: WorkflowArchitect,
    private hardwareService: HardwareService,
    sessionService: SessionService,
    hardwareComponents: HardwareComponent[],
    private componentSelector?: ComponentSelector,
    orchestrator?: Orchestrator,
    workflowValidator?: WorkflowValidationClient
  ) {
    this.orchestrator = orchestrator ?? new Orchestrator(
      config,
      llmClient,
      sessionService,
      hardwareComponents.length > 0 ? hardwareComponents : HARDWARE_COMPONENTS,
      workflowArchitect,
      workflowValidator
    );

    void this.hardwareService;
    void this.componentSelector;
  }

  async processUserInput(userMessage: string, sessionId: string): Promise<AgentResponse> {
    return this.orchestrator.process(userMessage, sessionId);
  }

  async confirmBlueprint(sessionId: string): Promise<AgentResponse> {
    return this.orchestrator.confirm(sessionId);
  }
}
