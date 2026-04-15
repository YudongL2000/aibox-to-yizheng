/**
 * [INPUT]: 依赖 Electron Tesseract/n8n IPC、浏览器打开能力与 TesseractProjectService 的可选本地快照持久化。
 * [OUTPUT]: 对外提供 TesseractChatService，按 backend session/workflow 真相源桥接教学/对话聊天、硬件校验、确认、创建、配置与 workflow 打开上下文。
 * [POS]: tools/aily-chat/services 的 Tesseract 后端访问层，被 AilyChatComponent 直接消费并回灌客户端工作区。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

import { Injectable } from '@angular/core';
import { TesseractProjectService } from '../../../services/tesseract-project.service';
import { adaptTesseractAgentResponse } from './tesseract-agent-response-adapter';
import {
  DialogueHardwareEvent,
  DialogueTeachingContext,
  TesseractInteractionMode,
} from './tesseract-dialogue.models';

type WorkflowReference = {
  workflowId?: string | null;
  workflowUrl?: string | null;
};

@Injectable({
  providedIn: 'root',
})
export class TesseractChatService {
  private workflowRefs = new Map<string, WorkflowReference>();
  private readonly baseSceneResponseTypes = new Set([
    'guidance',
    'summary_ready',
    'workflow_ready',
    'error',
  ]);
  private readonly configStateSceneResponseTypes = new Set([
    'select_single',
    'select_multi',
    'image_upload',
    'hot_plugging',
    'config_input',
    'config_complete',
  ]);

  constructor(private tesseractProjectService: TesseractProjectService) {}

  private get electronAPI() {
    return window.electronAPI;
  }

  async chat(
    message: string,
    sessionId?: string,
    projectPath?: string,
    options: {
      interactionMode?: TesseractInteractionMode;
      teachingContext?: DialogueTeachingContext | null;
    } = {}
  ) {
    await this.startRuntime(projectPath);
    const result = await this.electronAPI.tesseract.chat({
      ...this.buildProjectPayload(projectPath),
      message,
      sessionId,
      interactionMode: options.interactionMode,
      teachingContext: options.teachingContext || null,
    });
    return await this.handleAgentEnvelope(result, { projectPath });
  }

  async validateDialogueHardware(
    sessionId: string,
    event: DialogueHardwareEvent,
    projectPath?: string
  ) {
    this.requireSessionId(sessionId, '校验硬件');
    await this.startRuntime(projectPath);
    const result = await this.electronAPI.tesseract.validateHardware({
      ...this.buildProjectPayload(projectPath),
      sessionId,
      event,
    });
    return await this.handleAgentEnvelope(result, { projectPath });
  }

  async startDialogueDeploy(sessionId: string, projectPath?: string) {
    this.requireSessionId(sessionId, '开始部署');
    await this.startRuntime(projectPath);
    const result = await this.electronAPI.tesseract.startDeploy({
      ...this.buildProjectPayload(projectPath),
      sessionId,
    });
    return await this.handleAgentEnvelope(result, { projectPath });
  }

  async confirmWorkflow(sessionId: string, projectPath?: string) {
    this.requireSessionId(sessionId, '确认并生成工作流');
    await this.startRuntime(projectPath);
    try {
      const result = await this.electronAPI.tesseract.confirmWorkflow({
        ...this.buildProjectPayload(projectPath),
        sessionId,
      });
      return await this.handleAgentEnvelope(result, { projectPath });
    } catch (err: any) {
      // ── 020-workflow-gen-resilience: IPC / AbortError 降级为结构化响应 ──
      const isTimeout = /abort|timeout|ETIMEDOUT/i.test(err?.message ?? '');
      const fallbackResponse = {
        sessionId,
        response: {
          type: 'error' as const,
          message: isTimeout
            ? '生成工作流超时了。这一步会经历 AI 生成、校验修复与创建准备，请稍后重试，或先简化需求描述。'
            : `工作流确认失败: ${err?.message || '未知错误'}`,
        },
      };
      return await this.handleAgentEnvelope(fallbackResponse, { projectPath });
    }
  }

  async deployWorkflowAndStartConfig(sessionId: string, projectPath?: string) {
    return this.deployWorkflowAndStartConfigWithOptions(sessionId, projectPath);
  }

  async deployWorkflowAndStartConfigWithOptions(
    sessionId: string,
    projectPath?: string,
    options: {
      workflow?: Record<string, unknown> | null;
      source?: 'chat-create' | 'chat-confirm' | 'skill-card';
    } = {}
  ) {
    this.requireSessionId(sessionId, '创建工作流');
    await this.startRuntime(projectPath);
    await this.ensureN8nRuntime(projectPath);
    const deployResult = await this.electronAPI.tesseract.createWorkflow({
      ...this.buildProjectPayload(projectPath),
      sessionId,
      workflow: options.workflow || undefined,
    });
    const workflowRef = this.rememberWorkflowRef(sessionId, deployResult);
    const initialProjectSnapshot = projectPath
      ? this.tesseractProjectService.syncWorkflowSnapshotAndView(projectPath, {
          sessionId,
          ...this.toSnapshotPatch(workflowRef),
        }, options.source || 'chat-create')
      : null;
    if (!projectPath) {
      this.tesseractProjectService.publishWorkflowViewTarget({
        workflowId: workflowRef.workflowId,
        workflowUrl: workflowRef.workflowUrl,
        source: options.source || 'chat-create',
      });
    }

    const configResult = await this.electronAPI.tesseract.startConfig({
      ...this.buildProjectPayload(projectPath),
      sessionId,
      workflowId: workflowRef.workflowId || undefined,
      workflowJson: options.workflow || undefined,
    });

    const adapted = await this.handleAgentEnvelope(configResult, {
      projectPath,
      workflowRef,
    });
    const workflowPatch = this.toSnapshotPatch(workflowRef);
    const snapshot = adapted.snapshot || initialProjectSnapshot || Object.keys(workflowPatch).length
      ? {
          ...(adapted.snapshot || initialProjectSnapshot || {}),
          ...workflowPatch,
        }
      : null;
    const deployState = [
      '```aily-state',
      JSON.stringify({ state: 'done', text: `已创建 backend 工作流: ${deployResult.workflowId}` }, null, 2),
      '```',
      '',
      '```aily-button',
      JSON.stringify([
        {
          text: '打开工作流',
          action: 'tesseract-open-workflow',
          type: 'default',
          payload: {
            sessionId,
            workflowId: deployResult.workflowId,
            workflowUrl: deployResult.workflowUrl,
            projectPath: projectPath || null,
          },
        },
      ], null, 2),
      '```',
    ].join('\n');

    return {
      ...adapted,
      workflowRef,
      workflowId: workflowRef.workflowId || null,
      workflowUrl: workflowRef.workflowUrl || null,
      snapshot,
      markdown: [deployState, adapted.markdown].filter(Boolean).join('\n\n'),
    };
  }

  async confirmNode(
    payload: { sessionId: string; nodeName?: string; [key: string]: unknown },
    projectPath?: string
  ) {
    this.requireSessionId(payload.sessionId, '确认节点配置');
    await this.startRuntime(projectPath);
    await this.ensureN8nRuntime(projectPath);
    const normalizedPayload = this.normalizeConfirmNodePayload(payload);
    const result = await this.electronAPI.tesseract.confirmNode({
      ...this.buildProjectPayload(projectPath),
      ...normalizedPayload,
    });
    return await this.handleAgentEnvelope(result, { projectPath });
  }

  async uploadFaceImage(payload: {
    profile: string;
    fileName: string;
    contentBase64: string;
  }, projectPath?: string) {
    await this.startRuntime(projectPath);
    return this.electronAPI.tesseract.uploadFaceImage({
      ...this.buildProjectPayload(projectPath),
      ...payload,
    });
  }

  async openWorkflow(
    payload: { sessionId?: string; workflowId?: string | null; workflowUrl?: string | null },
    projectPath?: string
  ) {
    const workflowRef = this.resolveWorkflowRef(payload.sessionId, payload);
    if (workflowRef.workflowUrl) {
      await this.electronAPI.other.openByBrowser(workflowRef.workflowUrl);
      return { success: true, url: workflowRef.workflowUrl, source: 'backend-workflow-url' };
    }

    await this.ensureN8nRuntime(projectPath);
    return this.electronAPI.n8n.openWorkflow({
      ...this.buildProjectPayload(projectPath),
      workflowId: workflowRef.workflowId,
    });
  }

  private async startRuntime(projectPath?: string): Promise<void> {
    await this.electronAPI.tesseract.start(this.buildProjectPayload(projectPath));
  }

  private async ensureN8nRuntime(projectPath?: string): Promise<void> {
    await this.electronAPI.n8n.start(this.buildProjectPayload(projectPath));
  }

  private normalizeConfirmNodePayload(
    payload: { sessionId: string; nodeName?: string; [key: string]: unknown }
  ) {
    const portId = typeof payload['portId'] === 'string' ? payload['portId'].trim() : '';
    const topology = typeof payload['topology'] === 'string' ? payload['topology'].trim() : '';
    if (!portId || topology) {
      return payload;
    }
    return {
      ...payload,
      topology: portId,
    };
  }

  private async handleAgentEnvelope(
    envelope: any,
    context: {
      projectPath?: string;
      workflowRef?: WorkflowReference;
    } = {}
  ) {
    const sessionId = envelope?.sessionId || '';
    await this.syncDigitalTwinScene(
      sessionId,
      envelope?.response,
      context.projectPath,
    );
    const workflowRef = this.rememberWorkflowRef(sessionId, {
      ...context.workflowRef,
      workflowId:
        envelope?.response?.metadata?.workflowId
        || context.workflowRef?.workflowId
        || null,
    });
    const adapted = adaptTesseractAgentResponse(envelope?.response, {
      sessionId,
      workflowId: workflowRef.workflowId || undefined,
      workflowUrl: workflowRef.workflowUrl || undefined,
      projectPath: context.projectPath || undefined,
    });
    const snapshotPatch = {
      sessionId,
      ...adapted.snapshot,
      ...this.toSnapshotPatch(workflowRef),
    };
    const hasWorkflowRef = Boolean(workflowRef.workflowId || workflowRef.workflowUrl);
    const snapshot = context.projectPath
      ? hasWorkflowRef
        ? this.tesseractProjectService.syncWorkflowSnapshotAndView(
            context.projectPath,
            snapshotPatch,
            'agent-envelope'
          )
        : this.tesseractProjectService.persistWorkflowSnapshot(context.projectPath, snapshotPatch)
      : null;
    if (!context.projectPath && hasWorkflowRef) {
      this.tesseractProjectService.publishWorkflowViewTarget({
        workflowId: workflowRef.workflowId,
        workflowUrl: workflowRef.workflowUrl,
        source: 'agent-envelope',
      });
    }

    return {
      sessionId,
      response: envelope?.response,
      workflowRef,
      markdown: adapted.markdown,
      snapshot,
    };
  }

  private async syncDigitalTwinScene(
    sessionId: string,
    response: any,
    projectPath?: string,
  ): Promise<void> {
    const digitalTwinApi = this.electronAPI?.digitalTwin;
    if (!digitalTwinApi?.setScene) {
      return;
    }

    const scene = await this.resolveCanonicalDigitalTwinScene(
      sessionId,
      response,
      projectPath,
    );
    const shouldResetToBase = this.baseSceneResponseTypes.has(response?.type);
    if (scene == null && !shouldResetToBase) {
      return;
    }

    try {
      console.info('[TesseractChatService][DigitalTwin] syncing canonical scene', {
        sessionId,
        projectPath: projectPath || null,
        responseType: response?.type || null,
        sourcePhase: 'configuring',
        sceneSummary: this.summarizeDigitalTwinScene(scene),
      });
      const setSceneResult = await digitalTwinApi.setScene({
        sessionId,
        projectPath: projectPath || null,
        sourcePhase: 'configuring',
        responseType: response?.type || null,
        scene: scene ?? null,
      });
      console.info('[TesseractChatService][DigitalTwin] scene cached in electron', {
        sessionId,
        projectPath: projectPath || null,
        responseType: response?.type || null,
        setSceneResult,
      });
    } catch (error) {
      console.warn('[TesseractChatService] syncDigitalTwinScene failed:', error);
    }
  }

  private async resolveCanonicalDigitalTwinScene(
    sessionId: string,
    response: any,
    projectPath?: string,
  ): Promise<any | null> {
    if (
      sessionId
      && this.configStateSceneResponseTypes.has(response?.type)
      && this.electronAPI?.tesseract?.getConfigState
    ) {
      try {
        const configStateResult = await this.electronAPI.tesseract.getConfigState({
          ...this.buildProjectPayload(projectPath),
          sessionId,
        });
        const configStateScene =
          configStateResult?.data?.digitalTwinScene
          ?? configStateResult?.digitalTwinScene
          ?? null;
        console.info('[TesseractChatService][DigitalTwin] canonical config-state scene read', {
          sessionId,
          projectPath: projectPath || null,
          responseType: response?.type || null,
          sceneSummary: this.summarizeDigitalTwinScene(configStateScene),
        });
        if (configStateScene) {
          return configStateScene;
        }
      } catch (error) {
        console.warn('[TesseractChatService] resolveCanonicalDigitalTwinScene fallback to envelope:', error);
      }
    }

    if (response?.digitalTwinScene || response?.digital_twin_scene) {
      console.info('[TesseractChatService][DigitalTwin] fallback response scene read', {
        sessionId,
        projectPath: projectPath || null,
        responseType: response?.type || null,
        sceneSummary: this.summarizeDigitalTwinScene(
          response?.digitalTwinScene ?? response?.digital_twin_scene ?? null,
        ),
      });
    }
    return response?.digitalTwinScene ?? response?.digital_twin_scene ?? null;
  }

  private buildProjectPayload(projectPath?: string): { projectPath?: string } {
    const normalizedPath = (projectPath || '').trim();
    return normalizedPath ? { projectPath: normalizedPath } : {};
  }

  private summarizeDigitalTwinScene(scene: any) {
    const models = Array.isArray(scene?.models) ? scene.models : [];
    return {
      baseModelId: scene?.base_model_id || scene?.baseModelId || null,
      modelCount: models.length,
      modelIds: models
        .map((item: any) => item?.id)
        .filter(Boolean)
        .slice(0, 8),
    };
  }

  private rememberWorkflowRef(sessionId: string, candidate?: WorkflowReference | null): WorkflowReference {
    const normalizedSessionId = (sessionId || '').trim();
    const previous = normalizedSessionId ? this.workflowRefs.get(normalizedSessionId) : undefined;
    const nextRef: WorkflowReference = {
      workflowId: candidate?.workflowId || previous?.workflowId || null,
      workflowUrl: candidate?.workflowUrl || previous?.workflowUrl || null,
    };

    if (normalizedSessionId) {
      this.workflowRefs.set(normalizedSessionId, nextRef);
    }

    return nextRef;
  }

  private resolveWorkflowRef(sessionId?: string, fallback?: WorkflowReference): WorkflowReference {
    const normalizedSessionId = (sessionId || '').trim();
    return {
      workflowId: fallback?.workflowId || this.workflowRefs.get(normalizedSessionId)?.workflowId || null,
      workflowUrl: fallback?.workflowUrl || this.workflowRefs.get(normalizedSessionId)?.workflowUrl || null,
    };
  }

  private toSnapshotPatch(workflowRef: WorkflowReference): Partial<WorkflowReference> {
    const patch: Partial<WorkflowReference> = {};
    if (workflowRef.workflowId) {
      patch.workflowId = workflowRef.workflowId;
    }
    if (workflowRef.workflowUrl) {
      patch.workflowUrl = workflowRef.workflowUrl;
    }
    return patch;
  }

  private requireSessionId(sessionId: string, actionLabel: string): void {
    if (!sessionId) {
      throw new Error(`缺少 sessionId，无法${actionLabel}`);
    }
  }
}
