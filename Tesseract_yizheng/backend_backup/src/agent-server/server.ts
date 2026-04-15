/**
 * [INPUT]: 依赖 AgentService、WorkflowDeployer 与 Express
 * [OUTPUT]: 对外提供 HTTP API 服务、dialogue-mode 显式路由、MQTT hardware status / command 接口与运行时诊断接口，并为 workflow upload/ack 增加结构化日志；当 n8n API 缺席时，workflow create 显式返回 unavailable 而不是阻塞整站启动。
 * [POS]: agent-server 的 HTTP 入口，也是对话模式、硬件 runtime 与配置态 scene 的唯一 HTTP 入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENT.md
 */

import express from 'express';
import cors from 'cors';
import http from 'http';
import { AgentService } from './agent-service';
import { WorkflowDeployer } from '../agents/workflow-service';
import { attachWebSocketServer } from './websocket';
import { logger } from '../utils/logger';
import { buildDigitalTwinSceneFromConfigState } from '../agents/digital-twin-scene';
import { RuntimeStatusMonitor } from './runtime-status';
import type { DialogueModeHardwareEventInput, DialogueModeInteractionMode } from '../agents/types';

export interface AgentHttpServerOptions {
  port?: number;
  host?: string;
}

export class AgentHttpServer {
  private server?: http.Server;

  constructor(
    private agentService: AgentService,
    private workflowDeployer: WorkflowDeployer,
    private runtimeStatusMonitor?: RuntimeStatusMonitor
  ) {}

  async start(options: AgentHttpServerOptions = {}): Promise<{ port: number; host: string }> {
    const port = options.port ?? Number(process.env.AGENT_PORT || 3005);
    const host = options.host ?? process.env.AGENT_HOST ?? '0.0.0.0';

    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '6mb' }));

    app.get('/api/health', (_req, res) => {
      res.json({
        status: 'ok',
        runtime: this.runtimeStatusMonitor?.getSnapshot() ?? null,
        hardware: this.agentService.getHardwareRuntimeStatus(),
      });
    });

    app.get('/api/agent/runtime-status', async (_req, res) => {
      try {
        const status = this.runtimeStatusMonitor
          ? await this.runtimeStatusMonitor.getStatus()
          : null;
        res.json({
          success: true,
          data: status,
        });
      } catch (error) {
        logger.warn('Runtime status probe error', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Runtime status error',
        });
      }
    });

    app.get('/api/agent/hardware/status', (_req, res) => {
      try {
        res.json({
          success: true,
          data: this.agentService.getHardwareRuntimeStatus(),
        });
      } catch (error) {
        logger.warn('HTTP hardware status error', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Hardware runtime error',
        });
      }
    });

    app.get('/api/agent/skills', (_req, res) => {
      try {
        const skills = this.agentService.listSkills();
        res.json({
          success: true,
          skills,
        });
      } catch (error) {
        logger.warn('HTTP list-skills error', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Skill list error',
        });
      }
    });

    app.delete('/api/agent/skills/:skillId', (req, res) => {
      const { skillId } = req.params;
      if (!skillId) {
        res.status(400).json({ success: false, error: 'skillId is required' });
        return;
      }

      try {
        logger.debug('HTTP delete-skill request', { skillId });
        const deleted = this.agentService.deleteSkill(skillId);
        res.json({ success: deleted });
      } catch (error) {
        logger.warn('HTTP delete-skill error', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Delete skill error',
        });
      }
    });

    app.post('/api/agent/save-skill', (req, res) => {
      const sessionId = req.body?.sessionId as string | undefined;
      if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
      }

      try {
        logger.debug('HTTP save-skill request', { sessionId });
        const skill = this.agentService.saveSkill(sessionId);
        res.json({
          success: true,
          skill,
        });
      } catch (error) {
        logger.warn('HTTP save-skill error', error);
        res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : 'Save skill error',
        });
      }
    });

    app.post('/api/agent/chat', async (req, res) => {
      const message = req.body?.message as string | undefined;
      const sessionId = req.body?.sessionId as string | undefined;
      const interactionMode = req.body?.interactionMode as DialogueModeInteractionMode | undefined;

      if (!message) {
        res.status(400).json({ error: 'message is required' });
        return;
      }

      try {
        logger.debug('HTTP chat request', {
          sessionId: sessionId ?? null,
          messageLength: message.length,
          interactionMode: interactionMode ?? null,
        });
        const result = await this.agentService.chat(message, sessionId, {
          interactionMode,
          teachingContext: req.body?.teachingContext ?? null,
          clarificationContext: req.body?.clarificationContext ?? undefined,
        });
        res.json(result);
      } catch (error) {
        logger.warn('HTTP chat error', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Agent error' });
      }
    });

    app.post('/api/agent/confirm', async (req, res) => {
      const sessionId = req.body?.sessionId as string | undefined;
      if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
      }

      try {
        logger.debug('HTTP confirm request', { sessionId });
        const result = await this.agentService.confirm(sessionId);
        res.json(result);
      } catch (error) {
        logger.warn('HTTP confirm error', error);
        res.json({
          sessionId: req.body?.sessionId ?? null,
          response: {
            type: 'error',
            message: '服务处理异常，请稍后重试。',
          },
        });
      }
    });

    app.post('/api/agent/confirm-build', async (req, res) => {
      const sessionId = req.body?.sessionId as string | undefined;
      if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
      }

      try {
        logger.debug('HTTP confirm-build request', { sessionId });
        const result = await this.agentService.confirm(sessionId);
        res.json(result);
      } catch (error) {
        logger.warn('HTTP confirm-build error', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Agent error' });
      }
    });

    app.post('/api/agent/reset-session', async (req, res) => {
      const sessionId = req.body?.sessionId as string | undefined;
      if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
      }

      this.agentService.resetSession(sessionId);
      res.json({ success: true });
    });

    // ── 021-mqtt-image-upload: 以 rec_img 协议发送图片至硬件，不再写磁盘 ──
    app.post('/api/agent/upload-face', async (req, res) => {
      const profile = typeof req.body?.profile === 'string' ? req.body.profile : 'profile';
      const fileName = typeof req.body?.fileName === 'string' ? req.body.fileName : 'image.jpeg';
      const contentBase64 = typeof req.body?.contentBase64 === 'string' ? req.body.contentBase64 : '';
      const width = typeof req.body?.width === 'number' ? req.body.width : undefined;
      const height = typeof req.body?.height === 'number' ? req.body.height : undefined;

      if (!contentBase64) {
        res.status(400).json({ error: 'contentBase64 is required' });
        return;
      }

      try {
        logger.info('HTTP upload-face request', {
          profile,
          fileName,
          width: width ?? 0,
          height: height ?? 0,
          contentBase64Length: contentBase64.length,
        });
        const result = await this.agentService.publishImageViaMqtt({
          profile,
          fileName,
          contentBase64,
          width,
          height,
        });
        logger.info('HTTP upload-face success', {
          profile,
          imageId: result.imageId,
        });
        res.json(result);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : '图片发送失败，请检查硬件连接';
        logger.warn('HTTP upload-face failed', {
          profile,
          fileName,
          error: errMsg,
        });
        res.json({ success: false, profile, imageId: '', error: errMsg });
      }
    });

    app.post('/api/workflow/create', async (req, res) => {
      try {
        const workflow = req.body?.workflow as Record<string, unknown> | undefined;
        const sessionId = req.body?.sessionId as string | undefined;

        const resolvedWorkflow =
          (workflow as any) ?? (sessionId ? this.agentService.getWorkflow(sessionId) : null);

        if (!resolvedWorkflow) {
          res.status(400).json({ error: 'workflow or sessionId is required' });
          return;
        }

        logger.debug('HTTP workflow create request', {
          workflowName: resolvedWorkflow.name ?? null,
          nodeCount: Array.isArray(resolvedWorkflow.nodes) ? resolvedWorkflow.nodes.length : 0,
        });

        if (!this.workflowDeployer.isAvailable()) {
          const errorMessage =
            this.workflowDeployer.getUnavailableReason() ??
            'N8N API 未配置，暂时无法创建工作流。';
          logger.warn('HTTP workflow create rejected: workflow deployer unavailable', {
            error: errorMessage,
          });
          res.status(503).json({
            error: errorMessage,
            code: 'n8n_api_unavailable',
          });
          return;
        }

        const result = await this.workflowDeployer.createWorkflow(resolvedWorkflow as any);

        if (sessionId && result.workflowId) {
          await this.agentService.initializeConfigAgent(sessionId, result.workflowId, resolvedWorkflow as any);
        }

        res.json(result);
      } catch (error) {
        logger.warn('HTTP workflow create error', error);
        res.status(400).json({ error: error instanceof Error ? error.message : 'Workflow error' });
      }
    });

    app.post('/api/agent/start-config', async (req, res) => {
      const sessionId = req.body?.sessionId as string | undefined;
      const workflowId = req.body?.workflowId as string | undefined;
      const workflowJson = req.body?.workflowJson as Record<string, unknown> | undefined;
      if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
      }

      try {
        logger.debug('HTTP start-config request', {
          sessionId,
          hasWorkflowPayload: Boolean(workflowId && workflowJson),
        });

        if (workflowId && workflowJson) {
          await this.agentService.initializeConfigAgent(sessionId, workflowId, workflowJson as any);
        }

        const response = this.agentService.startHardwareConfig(sessionId);
        res.json({ sessionId, response });
      } catch (error) {
        logger.warn('HTTP start-config error', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Config error' });
      }
    });

    app.post('/api/agent/confirm-node', async (req, res) => {
      const sessionId = req.body?.sessionId as string | undefined;
      const nodeName = req.body?.nodeName as string | undefined;
      if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
      }

      try {
        logger.debug('HTTP confirm-node request', {
          sessionId,
          nodeName: nodeName ?? null,
          portId: req.body?.portId ?? null,
        });
        const response = nodeName
          ? await this.agentService.confirmNodeConfiguration(sessionId, nodeName, {
              portId: req.body?.portId as string | undefined,
              topology: req.body?.topology as string | undefined,
              device_ID: req.body?.device_ID as string | undefined,
              TTS_input: req.body?.TTS_input as string | undefined,
              execute_emoji: req.body?.execute_emoji as string | undefined,
              sub:
                req.body?.sub && typeof req.body.sub === 'object' && !Array.isArray(req.body.sub)
                  ? (req.body.sub as Record<string, string>)
                  : undefined,
            })
          : await this.agentService.confirmNodeDeployed(sessionId);

        res.json({ sessionId, response });
      } catch (error) {
        logger.warn('HTTP confirm-node error', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Config error' });
      }
    });

    app.post('/api/agent/dialogue/validate-hardware', async (req, res) => {
      const sessionId = req.body?.sessionId as string | undefined;
      const event = req.body?.event as DialogueModeHardwareEventInput | undefined;
      if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
      }
      if (!event) {
        res.status(400).json({ error: 'event is required' });
        return;
      }

      try {
        logger.debug('HTTP dialogue validate-hardware request', {
          sessionId,
          eventType: event.eventType,
          source: event.source,
        });
        const response = this.agentService.validateDialogueHardware(sessionId, event);
        res.json({ sessionId, response });
      } catch (error) {
        logger.warn('HTTP dialogue validate-hardware error', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Dialogue error' });
      }
    });

    app.post('/api/agent/dialogue/start-deploy', async (req, res) => {
      const sessionId = req.body?.sessionId as string | undefined;
      if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
      }

      try {
        logger.debug('HTTP dialogue start-deploy request', { sessionId });
        const response = this.agentService.startDialogueDeploy(sessionId);
        res.json({ sessionId, response });
      } catch (error) {
        logger.warn('HTTP dialogue start-deploy error', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Dialogue error' });
      }
    });

    app.post('/api/agent/hardware/workflow/upload', async (req, res) => {
      const sessionId = req.body?.sessionId as string | undefined;
      const workflow = req.body?.workflow as Record<string, unknown> | undefined;
      const workflowJson = req.body?.workflowJson as Record<string, unknown> | undefined;

      try {
        const inlineWorkflow = workflow ?? workflowJson;
        logger.info('HTTP hardware workflow upload request', {
          sessionId: sessionId ?? null,
          hasInlineWorkflow: Boolean(inlineWorkflow),
          workflowName:
            inlineWorkflow && typeof inlineWorkflow.name === 'string'
              ? inlineWorkflow.name
              : null,
          nodeCount:
            inlineWorkflow && Array.isArray(inlineWorkflow.nodes)
              ? inlineWorkflow.nodes.length
              : null,
        });
        const response = await this.agentService.uploadHardwareWorkflow(
          inlineWorkflow,
          sessionId
        );
        logger.info('HTTP hardware workflow upload receipt', {
          sessionId: sessionId ?? null,
          kind: response.kind,
          requestId: response.requestId,
          status: response.status,
          topic: response.topic,
          responseType:
            response.response && typeof response.response.msg_type === 'string'
              ? response.response.msg_type
              : null,
          responseStatus:
            response.response && typeof response.response.status === 'string'
              ? response.response.status
              : null,
          responseMessage:
            response.response && typeof response.response.message === 'string'
              ? response.response.message
              : null,
          workflowFile:
            response.response && typeof response.response.workflow_file === 'string'
              ? response.response.workflow_file
              : null,
        });
        res.json({
          success: true,
          data: response,
        });
      } catch (error) {
        logger.warn('HTTP hardware workflow upload error', {
          sessionId: sessionId ?? null,
          error: error instanceof Error ? error.message : 'Hardware workflow upload error',
        });
        res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : 'Hardware workflow upload error',
        });
      }
    });

    app.post('/api/agent/hardware/workflow/stop', async (_req, res) => {
      try {
        const response = await this.agentService.stopHardwareWorkflow();
        res.json({
          success: true,
          data: response,
        });
      } catch (error) {
        logger.warn('HTTP hardware workflow stop error', error);
        res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : 'Hardware workflow stop error',
        });
      }
    });

    app.post('/api/agent/hardware/command', async (req, res) => {
      const deviceType = req.body?.deviceType as string | undefined;
      const cmd = req.body?.cmd as string | undefined;

      if (!deviceType || !cmd) {
        res.status(400).json({ error: 'deviceType and cmd are required' });
        return;
      }

      try {
        const response = await this.agentService.sendHardwareCommand({
          deviceType,
          cmd,
          extra:
            req.body?.extra && typeof req.body.extra === 'object' && !Array.isArray(req.body.extra)
              ? (req.body.extra as Record<string, unknown>)
              : undefined,
        });
        res.json({
          success: true,
          data: response,
        });
      } catch (error) {
        logger.warn('HTTP hardware command error', error);
        res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : 'Hardware command error',
        });
      }
    });

    app.post('/api/agent/hardware/microphone/open', async (_req, res) => {
      try {
        const response = await this.agentService.openMicrophone();
        res.json({ success: true, data: response });
      } catch (error) {
        logger.warn('HTTP microphone open error', error);
        res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : 'Microphone open error',
        });
      }
    });

    app.post('/api/agent/hardware/microphone/close', async (_req, res) => {
      try {
        const response = await this.agentService.closeMicrophone();
        res.json({ success: true, data: response });
      } catch (error) {
        logger.warn('HTTP microphone close error', error);
        res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : 'Microphone close error',
        });
      }
    });

    app.post('/api/agent/hardware/speaker/play', async (req, res) => {
      try {
        const response = await this.agentService.playSpeaker({
          audioName: typeof req.body?.audioName === 'string' ? req.body.audioName : undefined,
          path: typeof req.body?.path === 'string' ? req.body.path : undefined,
          text: typeof req.body?.text === 'string' ? req.body.text : undefined,
        });
        res.json({ success: true, data: response });
      } catch (error) {
        logger.warn('HTTP speaker play error', error);
        res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : 'Speaker play error',
        });
      }
    });

    app.get('/api/agent/config-state', (req, res) => {
      const sessionId = req.query?.sessionId as string | undefined;
      if (!sessionId) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
      }

      const configState = this.agentService.getConfigState(sessionId);
      if (!configState) {
        res.status(404).json({ error: 'ConfigAgent not initialized' });
        return;
      }

      res.json({
        success: true,
        data: {
          workflowId: configState.workflowId,
          currentNode: configState.configurableNodes[configState.currentNodeIndex] ?? null,
          progress: configState.progress ?? null,
          pendingCount: (configState.progress?.total ?? 0) - (configState.progress?.completed ?? 0),
          configuredCount: configState.progress?.completed ?? 0,
          digitalTwinScene: buildDigitalTwinSceneFromConfigState(configState),
        },
      });
    });

    this.server = http.createServer(app);
    attachWebSocketServer(this.server, this.agentService, this.runtimeStatusMonitor);

    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject);
      this.server?.listen(port, host, () => resolve());
    });

    const address = this.server.address();
    const actualPort = typeof address === 'object' && address ? address.port : port;

    return { port: actualPort, host };
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.server?.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
}
