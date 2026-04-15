/**
 * [INPUT]: 依赖 IntakeAgent/ConfigAgent/SessionService
 * [OUTPUT]: 对外提供 Agent 交互、dialogue-mode 真相源桥接、MQTT hardware runtime 门面、audio-test/raw publish、publishImageViaMqtt rec_img 图片发布、配置流程入口与会话级 trace 订阅能力，并把配置/对话阶段响应补齐 digital twin scene；save-skill 在 backend 重启后可回退到项目 workflow snapshot 恢复保存上下文；031 起 upload/save-skill 统一按 actionReady 门禁判定；`workflow_ready` 与 hardware workflow upload 时自动把对应 workflow JSON 归档到 `backend/data/workflow/`。
 * [POS]: agent-server 层的服务编排器，也是 HTTP/WS 共享的调试流桥接点、对话模式桥接点、硬件 runtime 门面与统一数字孪生投影出口。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { IntakeAgent } from '../agents/intake-agent';
import { SessionService } from '../agents/session-service';
import { ConfigAgent } from '../agents/config-agent';
import { ConfigWorkflowOrchestrator } from '../agents/config-workflow-orchestrator';
import {
  buildDigitalTwinSceneFromConfigState,
  buildDigitalTwinSceneFromDialogueHardware,
} from '../agents/digital-twin-scene';
import { DialogueModeService } from '../agents/dialogue-mode/dialogue-mode-service';
import type { DialogueModeRouter } from '../agents/dialogue-mode/dialogue-mode-router';
import {
  MqttHardwareRuntime,
  type MqttHardwareRuntimeAudioTestMessageType,
  type MqttHardwareRuntimeCommandKind,
  type MqttHardwareRuntimeCommandReceipt,
  type MqttHardwareRuntimeRawPublishReceipt,
  MqttHardwareRuntimeStatus,
} from '../agents/mqtt-hardware-runtime';
import {
  buildSkillSaveCandidateFromSession,
  buildSkillSaveCandidateFromSnapshot,
  readPersistedWorkflowSnapshot,
  SkillLibraryRepository,
  toDialogueModeLibrarySkillPreview,
} from '../agents/dialogue-mode/skill-library-repository';
import {
  AgentResponse,
  ClarificationCategory,
  AgentTraceEvent,
  ConfigAgentState,
  DialogueModeHardwareEventInput,
  DialogueModeHardwareSnapshot,
  DialogueModeInteractionMode,
  SkillSaveCandidate,
  WorkflowDefinition,
} from '../agents/types';
import { logger, toBeijingFilenameTimestamp } from '../utils/logger';

type DigitalTwinAttachableResponse = Extract<
  AgentResponse,
  {
    type:
      | 'select_single'
      | 'select_multi'
      | 'image_upload'
      | 'hot_plugging'
      | 'config_input'
      | 'config_complete'
      | 'dialogue_mode';
  }
>;

type NodeConfigPayload = {
  portId?: string;
  topology?: string;
  device_ID?: string;
  TTS_input?: string;
  execute_emoji?: string;
  sub?: Record<string, string>;
};

const WORKFLOW_ARCHIVE_DIRECTORY_SEGMENTS = ['data', 'workflow'] as const;
const MAX_WORKFLOW_ARCHIVE_COLLISION_ATTEMPTS = 100;
const CONFIG_UPLOAD_ARCHIVE_TAG = 'config_upload';

export interface AgentChatOptions {
  interactionMode?: DialogueModeInteractionMode;
  teachingContext?: {
    originalPrompt?: string;
    prefilledGoal?: string;
    sourceSessionId?: string;
  } | null;
  clarificationContext?: {
    category: ClarificationCategory;
  };
}

export class AgentService {
  private configOrchestrator: ConfigWorkflowOrchestrator;
  private configAgentInstance: ConfigAgent;
  private dialogueModeService: DialogueModeService;

  constructor(
    private intakeAgent: IntakeAgent,
    private sessionService: SessionService,
    configAgent?: ConfigAgent,
    private skillLibraryRepository: SkillLibraryRepository = new SkillLibraryRepository(),
    dialogueModeRouter?: DialogueModeRouter,
    private hardwareRuntime?: MqttHardwareRuntime,
    private workflowArchiveDirectory = path.resolve(
      process.cwd(),
      ...WORKFLOW_ARCHIVE_DIRECTORY_SEGMENTS
    )
  ) {
    this.configAgentInstance = configAgent ?? new ConfigAgent(
      this.sessionService,
      createDisabledN8nClient()
    );
    this.dialogueModeService = new DialogueModeService(
      this.sessionService,
      this.skillLibraryRepository,
      dialogueModeRouter,
      this.hardwareRuntime
    );
    this.configOrchestrator = new ConfigWorkflowOrchestrator(
      this.sessionService,
      this.configAgentInstance
    );
  }

  async chat(
    message: string,
    sessionId?: string,
    options: AgentChatOptions = {}
  ): Promise<{ sessionId: string; response: AgentResponse }> {
    logger.debug('AgentService: chat request', {
      sessionId: sessionId ?? null,
      messageLength: message.length,
      interactionMode: options.interactionMode ?? null,
    });
    const session = this.sessionService.getOrCreate(sessionId);
    this.sessionService.appendTrace(session.id, {
      source: 'agent_service',
      phase: 'intake',
      kind: 'phase',
      status: 'started',
      title: '收到用户输入',
      detail: this.preview(message),
      data: {
        phase: session.phase,
        messageLength: message.length,
      },
    });
    try {
      const dialogueResponse = await this.dialogueModeService.handleChat(message, session.id, options);
      const rawResponse =
        dialogueResponse ??
        (session.phase === 'configuring'
          ? await this.configAgentInstance.processConfigurationInput(session.id, message)
          : await this.intakeAgent.processUserInput(message, session.id, {
              clarificationContext: options.clarificationContext,
            }));
      const response = this.attachDigitalTwinScene(session.id, rawResponse);
      this.enrichWithSkillRecommendations(response, message);
      logger.debug('AgentService: chat response', {
        sessionId: session.id,
        responseType: response.type,
      });
      logger.info('AgentService: AI response generated', {
        sessionId: session.id,
        responseType: response.type,
        messageLength: response.message.length,
        messagePreview: this.preview(response.message),
      });
      this.sessionService.appendTrace(session.id, {
        source: 'agent_service',
        phase: 'response',
        kind: 'result',
        status: 'completed',
        title: `AgentService 返回 ${response.type}`,
        detail: this.preview(response.message),
        data: {
          responseType: response.type,
        },
      });
      return { sessionId: session.id, response };
    } catch (error) {
      this.sessionService.appendTrace(session.id, {
        source: 'agent_service',
        phase: 'response',
        kind: 'result',
        status: 'failed',
        title: 'AgentService 处理失败',
        detail: error instanceof Error ? error.message : '未知错误',
      });
      throw error;
    }
  }

  validateDialogueHardware(
    sessionId: string,
    event: DialogueModeHardwareEventInput
  ): AgentResponse {
    return this.attachDigitalTwinScene(
      sessionId,
      this.dialogueModeService.validateHardware(sessionId, event)
    );
  }

  startDialogueDeploy(sessionId: string): AgentResponse {
    return this.attachDigitalTwinScene(
      sessionId,
      this.dialogueModeService.startDeploy(sessionId)
    );
  }

  getHardwareRuntimeStatus(): MqttHardwareRuntimeStatus | null {
    return this.hardwareRuntime?.getStatus() ?? null;
  }

  getHardwareRuntimeSnapshot() {
    return this.hardwareRuntime?.getDialogueHardwareSnapshot() ?? null;
  }

  subscribeHardwareRuntime(listener: (status: MqttHardwareRuntimeStatus) => void): (() => void) | null {
    if (!this.hardwareRuntime) {
      return null;
    }

    return this.hardwareRuntime.subscribe(listener);
  }

  async uploadHardwareWorkflow(
    workflow: WorkflowDefinition | Record<string, unknown> | null | undefined,
    sessionId?: string
  ): Promise<MqttHardwareRuntimeCommandReceipt> {
    if (sessionId) {
      this.assertSessionReadyForHardwareUpload(sessionId);
    }

    const resolvedWorkflow = workflow
      ?? (sessionId ? this.sessionService.getWorkflow(sessionId) : null)
      ?? (sessionId ? this.sessionService.getConfigAgentState(sessionId)?.workflowSnapshot : null);
    if (!resolvedWorkflow) {
      throw new Error('workflow or sessionId is required');
    }

    if (sessionId) {
      this.archiveWorkflowSnapshot(sessionId, resolvedWorkflow, CONFIG_UPLOAD_ARCHIVE_TAG);
    }

    return this.hardwareRuntime?.uploadWorkflow(resolvedWorkflow as WorkflowDefinition)
      ?? this.createDisabledReceipt('workflow_upload');
  }

  async stopHardwareWorkflow(): Promise<MqttHardwareRuntimeCommandReceipt> {
    return this.hardwareRuntime?.stopWorkflow()
      ?? this.createDisabledReceipt('workflow_stop');
  }

  async sendHardwareCommand(params: {
    deviceType: string;
    cmd: string;
    extra?: Record<string, unknown>;
  }): Promise<MqttHardwareRuntimeCommandReceipt> {
    return this.hardwareRuntime?.sendHardwareCommand(params)
      ?? this.createDisabledReceipt(this.resolveCommandKind(params.deviceType, params.cmd));
  }

  async publishAudioTest(
    messageType: MqttHardwareRuntimeAudioTestMessageType,
  ): Promise<MqttHardwareRuntimeRawPublishReceipt> {
    if (!this.hardwareRuntime) {
      throw new Error('设备未连接，请先连接硬件后再测试');
    }
    logger.info('AgentService: publishing audio test over MQTT', {
      messageType,
    });
    const receipt = await this.hardwareRuntime.publishAudioTestMessage(messageType);
    logger.info('AgentService: audio test publish succeeded', {
      messageType,
      topic: receipt.topic,
      publishedAt: receipt.publishedAt,
    });
    return receipt;
  }

  // ── 021-mqtt-image-upload: 以 rec_img 协议将图片发送至硬件 ──
  async publishImageViaMqtt(params: {
    profile: string;
    fileName: string;
    contentBase64: string;
    width?: number;
    height?: number;
  }): Promise<{ success: boolean; profile: string; imageId: string; error?: string }> {
    const { profile, fileName, contentBase64 } = params;
    if (!this.hardwareRuntime) {
      throw new Error('设备未连接，请先连接硬件后再发送图片');
    }
    const dataBase64 = contentBase64.replace(/^data:[^;]+;base64,/, '');
    const extMatch = fileName.match(/\.(\w+)$/);
    const mimeMatch = contentBase64.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,/i);
    const format = (extMatch?.[1] ?? mimeMatch?.[1] ?? 'jpeg')
      .toLowerCase()
      .replace('jpg', 'jpeg');
    const safeProfile = profile.replace(/[^a-zA-Z0-9_-]/g, '') || 'profile';
    const imageId = `${safeProfile}_${randomUUID().slice(0, 6)}`;
    const width = Number.isFinite(params.width) ? Math.max(0, Math.trunc(params.width ?? 0)) : 0;
    const height = Number.isFinite(params.height) ? Math.max(0, Math.trunc(params.height ?? 0)) : 0;
    logger.info('AgentService: publishing face image over MQTT', {
      profile,
      imageId,
      format,
      width,
      height,
      dataLength: dataBase64.length,
    });
    await this.hardwareRuntime.publishRecImg({
      imageId,
      format,
      dataBase64,
      width,
      height,
    });
    logger.info('AgentService: face image publish succeeded', {
      profile,
      imageId,
    });
    return { success: true, profile, imageId };
  }

  async openMicrophone(): Promise<MqttHardwareRuntimeCommandReceipt> {
    return this.hardwareRuntime?.openMicrophone() ?? this.createDisabledReceipt('microphone_open');
  }

  async closeMicrophone(): Promise<MqttHardwareRuntimeCommandReceipt> {
    return this.hardwareRuntime?.closeMicrophone() ?? this.createDisabledReceipt('microphone_close');
  }

  async playSpeaker(params: { audioName?: string; path?: string; text?: string }): Promise<MqttHardwareRuntimeCommandReceipt> {
    return this.hardwareRuntime?.playSpeaker(params) ?? this.createDisabledReceipt('speaker_play');
  }

  listSkills() {
    return this.skillLibraryRepository.list().map(toDialogueModeLibrarySkillPreview);
  }

  deleteSkill(skillId: string): boolean {
    return this.skillLibraryRepository.deleteBySkillId(skillId);
  }

  saveSkill(sessionId: string, projectPath?: string) {
    const session = this.sessionService.getSession(sessionId);
    const recovered = this.restoreSaveSkillContextFromProject(sessionId, projectPath);
    const workflow = session?.workflow
      ?? session?.configAgentState?.workflowSnapshot
      ?? recovered?.workflow
      ?? null;
    if (!workflow) {
      throw new Error('当前会话没有可保存的工作流');
    }

    const candidate = (session ? buildSkillSaveCandidateFromSession(session) : null) ?? recovered?.candidate ?? null;
    if (!candidate) {
      if (session?.configAgentState && !this.isConfigActionReady(session.configAgentState)) {
        throw new Error(this.buildConfigActionBlockedMessage(session.configAgentState, '存入 Skills 库'));
      }
      throw new Error('当前会话还没有可存入技能库的教学成果');
    }

    return this.skillLibraryRepository.save(candidate, workflow);
  }

  private assertSessionReadyForHardwareUpload(sessionId: string): void {
    const configState = this.sessionService.getConfigAgentState(sessionId);
    if (configState && !this.isConfigActionReady(configState)) {
      throw new Error(this.buildConfigActionBlockedMessage(configState, '下发工作流'));
    }
  }

  private isConfigActionReady(configState: ConfigAgentState | null | undefined): boolean {
    if (!configState) {
      return true;
    }

    if (typeof configState.actionReady === 'boolean') {
      return configState.actionReady;
    }

    const pendingHardwareNodeNames = Array.isArray(configState.pendingHardwareNodeNames)
      ? configState.pendingHardwareNodeNames
      : [];
    const assemblyCompleted = typeof configState.assemblyCompleted === 'boolean'
      ? configState.assemblyCompleted
      : pendingHardwareNodeNames.length === 0;
    return configState.completed && assemblyCompleted;
  }

  private buildConfigActionBlockedMessage(
    configState: ConfigAgentState,
    actionLabel: '下发工作流' | '存入 Skills 库'
  ): string {
    if (!configState.completed) {
      return `当前会话仍处于软件配置阶段，请先完成全部配置再${actionLabel}`;
    }

    return `当前会话仍处于硬件组装阶段，请先完成全部拼装再${actionLabel}`;
  }

  private restoreSaveSkillContextFromProject(
    sessionId: string,
    projectPath?: string
  ): { workflow: WorkflowDefinition; candidate: SkillSaveCandidate } | null {
    const normalizedProjectPath = String(projectPath || '').trim();
    if (!normalizedProjectPath) {
      return null;
    }

    const snapshot = readPersistedWorkflowSnapshot(normalizedProjectPath);
    if (!snapshot) {
      return null;
    }

    const snapshotSessionId = String(snapshot.sessionId || '').trim();
    if (snapshotSessionId && snapshotSessionId !== sessionId) {
      logger.warn('AgentService: save-skill snapshot session mismatch', {
        sessionId,
        snapshotSessionId,
        projectPath: normalizedProjectPath,
      });
      return null;
    }

    const workflow = snapshot.workflow && typeof snapshot.workflow === 'object'
      ? snapshot.workflow as WorkflowDefinition
      : null;
    const candidate = buildSkillSaveCandidateFromSnapshot(snapshot, sessionId);
    if (!workflow || !candidate) {
      return null;
    }

    logger.info('AgentService: restored save-skill context from workflow snapshot', {
      sessionId,
      projectPath: normalizedProjectPath,
      workflowId: candidate.workflowId || snapshot.workflowId || null,
    });

    return { workflow, candidate };
  }

  async confirm(sessionId: string): Promise<{ sessionId: string; response: AgentResponse }> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    logger.debug('AgentService: confirm request', { sessionId });
    this.sessionService.appendTrace(sessionId, {
      source: 'agent_service',
      phase: 'intake',
      kind: 'phase',
      status: 'started',
      title: '收到确认构建请求',
      detail: '准备进入组合与验证',
    });
    try {
      const response = await this.intakeAgent.confirmBlueprint(sessionId);
      logger.debug('AgentService: confirm response', {
        sessionId,
        responseType: response.type,
      });
      logger.info('AgentService: confirm response generated', {
        sessionId,
        responseType: response.type,
        messageLength: response.message.length,
        messagePreview: this.preview(response.message),
      });
      this.logWorkflowDocument(sessionId, response);
      this.archiveWorkflowDocument(sessionId, response);
      this.sessionService.appendTrace(sessionId, {
        source: 'agent_service',
        phase: 'response',
        kind: 'result',
        status: response.type === 'workflow_ready' ? 'completed' : response.type === 'error' ? 'failed' : 'info',
        title: `确认构建返回 ${response.type}`,
        detail: this.preview(response.message),
        data: {
          responseType: response.type,
        },
      });
      return { sessionId: session.id, response };
    } catch (error) {
      this.sessionService.appendTrace(sessionId, {
        source: 'agent_service',
        phase: 'response',
        kind: 'result',
        status: 'failed',
        title: '确认构建失败',
        detail: error instanceof Error ? error.message : '未知错误',
      });
      const response: AgentResponse = {
        type: 'error',
        message: '构建过程中发生异常，请稍后重试或尝试简化需求描述。',
      };
      return { sessionId: session.id, response };
    }
  }

  async initializeConfigAgent(
    sessionId: string,
    workflowId: string,
    workflow: WorkflowDefinition
  ): Promise<ConfigAgentState> {
    return this.configOrchestrator.initializeConfigAgent(sessionId, workflowId, workflow);
  }

  startHardwareConfig(sessionId: string): AgentResponse {
    return this.attachDigitalTwinScene(
      sessionId,
      this.configAgentInstance.startConfiguration(sessionId)
    );
  }

  async confirmNodeDeployed(sessionId: string): Promise<AgentResponse> {
    return this.attachDigitalTwinScene(
      sessionId,
      await this.configAgentInstance.confirmNodeDeployed(sessionId)
    );
  }

  async confirmNodeConfiguration(
    sessionId: string,
    nodeName: string,
    config: NodeConfigPayload
  ) {
    const response = await this.configOrchestrator.confirmNodeConfiguration(
      sessionId,
      nodeName,
      config
    );
    return this.attachDigitalTwinScene(sessionId, response);
  }

  getConfigState(sessionId: string): ConfigAgentState | null {
    return this.configOrchestrator.getConfigState(sessionId);
  }

  getSession(sessionId: string) {
    return this.sessionService.getSession(sessionId);
  }

  getWorkflow(sessionId: string) {
    return this.sessionService.getWorkflow(sessionId);
  }

  ensureSession(sessionId?: string): string {
    return this.sessionService.getOrCreate(sessionId).id;
  }

  getTraceEvents(sessionId: string): AgentTraceEvent[] {
    return this.sessionService.getTraceEvents(sessionId);
  }

  subscribeTrace(sessionId: string, listener: (event: AgentTraceEvent) => void): () => void {
    return this.sessionService.subscribeTrace(sessionId, listener);
  }

  resetSession(sessionId: string) {
    this.sessionService.resetSession(sessionId);
  }

  private preview(message: string): string {
    const normalized = message.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 160) {
      return normalized;
    }
    return `${normalized.slice(0, 157)}...`;
  }

  // ── Skills 推荐注入 ────────────────────────────────────────
  private enrichWithSkillRecommendations(response: AgentResponse, userMessage: string): void {
    if (response.type !== 'summary_ready') return;
    try {
      const keywords = userMessage
        .replace(/[，。！？、\s]+/g, ' ')
        .split(' ')
        .filter((w) => w.length >= 2);
      const matches = this.skillLibraryRepository.findByKeywords(keywords);
      if (matches.length === 0) return;
      const recommendations = matches
        .map((s) => `- **${s.displayName}**：${s.summary ?? ''}`)
        .join('\n');
      response.message += `\n\n**已有类似技能**\n${recommendations}\n> 你可以直接使用已有技能，或继续构建新版本。`;
    } catch {
      // 静默降级：不影响主流程
    }
  }

  private logWorkflowDocument(sessionId: string, response: AgentResponse): void {
    if (response.type !== 'workflow_ready') {
      return;
    }

    logger.info(
      'AgentService: workflow JSON document for session %s\n%s',
      sessionId,
      JSON.stringify(response.workflow, null, 2)
    );
  }

  private archiveWorkflowDocument(sessionId: string, response: AgentResponse): void {
    if (response.type !== 'workflow_ready') {
      return;
    }

    this.archiveWorkflowSnapshot(sessionId, response.workflow);
  }

  private archiveWorkflowSnapshot(
    sessionId: string,
    workflow: WorkflowDefinition | Record<string, unknown>,
    archiveTag?: string
  ): void {
    const workflowDocument = JSON.stringify(workflow, null, 2);
    this.writeWorkflowArchive(sessionId, workflowDocument, archiveTag);
  }

  private writeWorkflowArchive(
    sessionId: string,
    workflowDocument: string,
    archiveTag?: string
  ): void {
    const archiveDirectory = this.workflowArchiveDirectory;
    const timestampToken = toBeijingFilenameTimestamp();
    let attemptedFileName = this.buildWorkflowArchiveFileName(timestampToken, sessionId, 0, archiveTag);

    try {
      fs.mkdirSync(archiveDirectory, { recursive: true });

      for (
        let collisionIndex = 0;
        collisionIndex < MAX_WORKFLOW_ARCHIVE_COLLISION_ATTEMPTS;
        collisionIndex += 1
      ) {
        attemptedFileName = this.buildWorkflowArchiveFileName(
          timestampToken,
          sessionId,
          collisionIndex,
          archiveTag
        );
        const archivePath = path.join(archiveDirectory, attemptedFileName);

        try {
          fs.writeFileSync(archivePath, workflowDocument, {
            encoding: 'utf-8',
            flag: 'wx',
          });
          logger.info('AgentService: workflow archive written', {
            sessionId,
            archiveTag: archiveTag ?? 'workflow_ready',
            fileName: attemptedFileName,
            archivePath,
          });
          return;
        } catch (error) {
          if (this.isArchiveCollision(error)) {
            continue;
          }
          throw error;
        }
      }

      logger.warn('AgentService: workflow archive failed', {
        sessionId,
        archiveTag: archiveTag ?? 'workflow_ready',
        attemptedFileName,
        errorMessage: 'No unique workflow archive file name available',
        errorCode: 'ARCHIVE_NAME_EXHAUSTED',
      });
    } catch (error) {
      logger.warn('AgentService: workflow archive failed', {
        sessionId,
        archiveTag: archiveTag ?? 'workflow_ready',
        attemptedFileName,
        errorMessage: error instanceof Error ? error.message : 'Unknown archive error',
        errorCode: this.getArchiveErrorCode(error),
      });
    }
  }

  private buildWorkflowArchiveFileName(
    timestampToken: string,
    sessionId: string,
    collisionIndex: number,
    archiveTag?: string
  ): string {
    const archiveTagSuffix = archiveTag ? `__${archiveTag}` : '';
    const collisionSuffix = collisionIndex === 0 ? '' : `__${String(collisionIndex).padStart(2, '0')}`;
    return `${timestampToken}_${sessionId}${archiveTagSuffix}${collisionSuffix}.json`;
  }

  private isArchiveCollision(error: unknown): boolean {
    return this.getArchiveErrorCode(error) === 'EEXIST';
  }

  private getArchiveErrorCode(error: unknown): string | null {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return null;
    }

    return typeof error.code === 'string' ? error.code : null;
  }

  private attachDigitalTwinScene(
    sessionId: string,
    response: AgentResponse
  ): AgentResponse {
    const responseWithSkillCandidate = this.attachSkillSaveCandidate(sessionId, response);

    if (!this.shouldAttachDigitalTwinScene(responseWithSkillCandidate)) {
      return responseWithSkillCandidate;
    }

    const digitalTwinScene =
      responseWithSkillCandidate.type === 'dialogue_mode'
        ? buildDigitalTwinSceneFromDialogueHardware(this.resolveDialogueHardwareSnapshot(
            responseWithSkillCandidate.dialogueMode.hardware
          ))
        : buildDigitalTwinSceneFromConfigState(this.sessionService.getConfigState(sessionId));
    if (!digitalTwinScene) {
      return responseWithSkillCandidate;
    }

    return {
      ...responseWithSkillCandidate,
      digitalTwinScene,
    };
  }

  private attachSkillSaveCandidate(
    sessionId: string,
    response: AgentResponse
  ): AgentResponse {
    if (response.type !== 'config_complete') {
      return response;
    }

    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      return response;
    }

    const candidate = buildSkillSaveCandidateFromSession(session);
    if (!candidate) {
      return response;
    }

    return {
      ...response,
      skillSaveCandidate: candidate,
    };
  }

  private shouldAttachDigitalTwinScene(
    response: AgentResponse
  ): response is DigitalTwinAttachableResponse {
    switch (response.type) {
      case 'select_single':
      case 'select_multi':
      case 'image_upload':
      case 'hot_plugging':
      case 'config_input':
      case 'config_complete':
      case 'dialogue_mode':
        return true;
      default:
        return false;
    }
  }

  private resolveCommandKind(deviceType: string, cmd: string): MqttHardwareRuntimeCommandKind {
    if (deviceType === 'microphone' && cmd === 'open') {
      return 'microphone_open';
    }
    if (deviceType === 'microphone' && cmd === 'close') {
      return 'microphone_close';
    }
    if (deviceType === 'speaker' && cmd === 'play') {
      return 'speaker_play';
    }
    if (cmd === 'stop' || cmd === 'stop_workflow') {
      return 'workflow_stop';
    }
    return 'workflow_upload';
  }

  private createDisabledReceipt(kind: MqttHardwareRuntimeCommandKind): MqttHardwareRuntimeCommandReceipt {
    return {
      kind,
      requestId: 'disabled',
      topic: '',
      payload: {},
      publishedAt: new Date().toISOString(),
      status: 'queued',
      response: null,
      responseAt: null,
    };
  }

  private resolveDialogueHardwareSnapshot(
    fallback: DialogueModeHardwareSnapshot
  ): DialogueModeHardwareSnapshot {
    if (!this.hardwareRuntime) {
      return fallback;
    }

    if (typeof this.hardwareRuntime.getStatus !== 'function') {
      return this.hardwareRuntime.getDialogueHardwareSnapshot() ?? fallback;
    }

    if (this.hardwareRuntime.getStatus().connectionState === 'disabled') {
      return fallback;
    }

    return this.hardwareRuntime.getDialogueHardwareSnapshot() ?? fallback;
  }
}

function createDisabledN8nClient() {
  return {
    async getWorkflow() {
      throw new Error('N8N API 未配置，无法读取工作流');
    },
    async updateWorkflow() {
      throw new Error('N8N API 未配置，无法更新工作流');
    },
  } as any;
}
