/**
 * [INPUT]: 依赖 backend dist 入口、runtime-utils 的端口探测/HTTP/进程管理能力，以及 backend/.env 的 AGENT_PORT/AGENT_LLM_TIMEOUT_MS/TESSERACT_HTTP_TIMEOUT_MS 配置。
 * [OUTPUT]: 对外提供 TesseractRuntime，负责复用已启动 Agent 服务或按需拉起本地 backend，并统一管理 IPC->HTTP 请求超时、dialogue-mode 调用、skills 库访问、external backend 缺席时的被动状态降级、避免空 env 覆盖 backend/.env，以及结构化运行日志。
 * [POS]: electron 层的 Tesseract Agent runtime 管理器，被 tesseract-ipc 暴露给 renderer，同时负责把 backend 运行态汇入统一日志总线。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { getStructuredLogger } = require("./logger");
const {
  attachProcessLogger,
  findAvailablePort,
  postJson,
  terminateChild,
  waitForJson,
} = require("./runtime-utils");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3005;
const DEFAULT_HTTP_TIMEOUT_MS = 30000;
const HTTP_TIMEOUT_BUFFER_MS = 30000;
const HTTP_TIMEOUT_LLM_MULTIPLIER = 1.2;
const EMBEDDED_N8N_API_ACCESS_FILE = path.join(
  ".tesseract-runtime",
  "n8n",
  "api-access.json"
);
const LOCAL_N8N_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

class TesseractRuntime {
  constructor() {
    this.process = null;
    this.external = false;
    this.backendMode = "auto";
    this.host = DEFAULT_HOST;
    this.port = DEFAULT_PORT;
    this.httpTimeoutMs = DEFAULT_HTTP_TIMEOUT_MS;
    this.projectPath = "";
    this.logs = [];
    this.lastError = "";
    this.lastStartedAt = null;
    this.logger = getStructuredLogger({
      module: "tesseract-runtime",
      source: "runtime",
      processType: "main",
    });
  }

  appendLog(message, level = "info", source = "runtime", context = null) {
    const line = String(message || "").trim();
    if (!line) {
      return;
    }

    this.logs.push(line);
    if (this.logs.length > 200) {
      this.logs.shift();
    }

    this.logger.write({
      level,
      source,
      message: line.replace(/^\[tesseract-runtime\]\s*/, ""),
      context,
      mirrorToConsole: true,
    });
  }

  resolveBackendRoot() {
    const siblingRoot = path.resolve(__dirname, "..", "..", "backend");
    const siblingEntry = path.join(siblingRoot, "dist", "agent-server", "index.js");
    if (
      fs.existsSync(siblingRoot) &&
      fs.existsSync(path.join(siblingRoot, "node_modules")) &&
      fs.existsSync(siblingEntry)
    ) {
      return {
        root: siblingRoot,
        entry: siblingEntry,
        source: "workspace-backend",
      };
    }

    const preparedRoot = path.resolve(__dirname, "..", ".tesseract-runtime", "backend");
    const preparedEntry = path.join(preparedRoot, "dist", "agent-server", "index.js");
    if (fs.existsSync(preparedEntry)) {
      return {
        root: preparedRoot,
        entry: preparedEntry,
        source: "prepared-runtime",
      };
    }

    throw new Error(
      "Tesseract backend runtime not found. Expected ../backend/dist/agent-server/index.js. Run ../backend npm run build first."
    );
  }

  normalizeApiBaseUrl(baseUrl) {
    const normalizedBaseUrl = String(baseUrl || "")
      .trim()
      .replace(/\/+$/, "")
      .replace(/\/api\/v1$/, "/api/v1");

    if (!normalizedBaseUrl) {
      return "";
    }

    try {
      const parsedUrl = new URL(normalizedBaseUrl);
      if (LOCAL_N8N_HOSTNAMES.has(parsedUrl.hostname)) {
        parsedUrl.hostname = "127.0.0.1";
      }

      return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`
        .replace(/\/+$/, "")
        .replace(/\/api\/v1$/, "/api/v1");
    } catch (_error) {
      return normalizedBaseUrl;
    }
  }

  getEmbeddedApiAccessCandidates(runtimeRoot) {
    return [
      path.resolve(__dirname, "..", EMBEDDED_N8N_API_ACCESS_FILE),
      path.resolve(runtimeRoot, "..", "n8n", "api-access.json"),
      path.resolve(runtimeRoot, "..", "..", "aily-blockly", EMBEDDED_N8N_API_ACCESS_FILE),
      path.resolve(process.cwd(), EMBEDDED_N8N_API_ACCESS_FILE),
      path.resolve(process.cwd(), "..", "aily-blockly", EMBEDDED_N8N_API_ACCESS_FILE),
    ];
  }

  readEmbeddedApiAccess(runtimeRoot) {
    const candidates = this.getEmbeddedApiAccessCandidates(runtimeRoot);
    for (const candidatePath of candidates) {
      if (!candidatePath || !fs.existsSync(candidatePath)) {
        continue;
      }

      try {
        const payload = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
        if (payload?.baseUrl && payload?.apiKey) {
          return payload;
        }
      } catch (_error) {
        // 忽略损坏的共享凭据文件，继续尝试其他候选路径。
      }
    }

    return null;
  }

  resolveN8nApiAccess(runtimeRoot) {
    const configuredBaseUrl = this.normalizeApiBaseUrl(process.env.N8N_API_URL);
    const configuredApiKey = String(process.env.N8N_API_KEY || "").trim();
    const embeddedApiAccess = this.readEmbeddedApiAccess(runtimeRoot);
    const embeddedBaseUrl = this.normalizeApiBaseUrl(embeddedApiAccess?.baseUrl);

    if (
      embeddedApiAccess?.apiKey &&
      embeddedBaseUrl &&
      (!configuredBaseUrl || configuredBaseUrl === embeddedBaseUrl)
    ) {
      return {
        baseUrl: embeddedBaseUrl,
        apiKey: embeddedApiAccess.apiKey,
        source: "embedded-runtime",
      };
    }

    return {
      baseUrl: configuredBaseUrl,
      apiKey: configuredApiKey,
      source: configuredBaseUrl && configuredApiKey ? "process-env" : "unconfigured",
    };
  }

  parsePort(value) {
    const normalizedValue = String(value ?? "").trim();
    if (!normalizedValue) {
      return null;
    }

    const parsedPort = Number(normalizedValue);
    if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      return null;
    }

    return parsedPort;
  }

  readConfiguredAgentPort(runtimeRoot) {
    return this.readConfiguredInteger(runtimeRoot, "AGENT_PORT", (value) =>
      this.parsePort(value)
    );
  }

  parsePositiveInteger(value) {
    const normalizedValue = String(value ?? "").trim();
    if (!normalizedValue) {
      return null;
    }

    const parsedValue = Number(normalizedValue);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      return null;
    }

    return parsedValue;
  }

  readConfiguredInteger(runtimeRoot, keyName, parser) {
    const parseValue =
      typeof parser === "function" ? parser : (value) => this.parsePositiveInteger(value);
    const envValue = parseValue(process.env[keyName]);
    if (envValue) {
      return envValue;
    }

    const envFileList = [".env", ".env copy"];
    for (const envFileName of envFileList) {
      const envFilePath = path.join(runtimeRoot, envFileName);
      if (!fs.existsSync(envFilePath)) {
        continue;
      }

      const content = fs.readFileSync(envFilePath, "utf8");
      const match = content.match(
        new RegExp(`^\\s*${keyName}\\s*=\\s*(\\d+)\\s*$`, "m")
      );
      const fileValue = parseValue(match?.[1]);
      if (fileValue) {
        return fileValue;
      }
    }

    return null;
  }

  resolveHttpTimeoutMs(runtimeRoot) {
    const explicitTimeout = this.readConfiguredInteger(
      runtimeRoot,
      "TESSERACT_HTTP_TIMEOUT_MS"
    );
    if (explicitTimeout) {
      return explicitTimeout;
    }

    const llmTimeout = this.readConfiguredInteger(runtimeRoot, "AGENT_LLM_TIMEOUT_MS");
    if (llmTimeout) {
      return Math.max(DEFAULT_HTTP_TIMEOUT_MS, llmTimeout * HTTP_TIMEOUT_LLM_MULTIPLIER + HTTP_TIMEOUT_BUFFER_MS);
    }

    return DEFAULT_HTTP_TIMEOUT_MS;
  }

  resolveBackendMode(runtimeRoot) {
    const configuredMode = String(
      process.env.TESSERACT_BACKEND_MODE
      || this.readConfiguredString(runtimeRoot, "TESSERACT_BACKEND_MODE")
      || "auto"
    )
      .trim()
      .toLowerCase();

    return configuredMode === "external" ? "external" : "auto";
  }

  resolveNodeBinary() {
    const candidates = [
      process.env.TESSERACT_NODE_BINARY,
      process.env.NODE,
      process.env.npm_node_execpath,
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (candidate && fs.existsSync(candidate)) {
        return candidate;
      }
    }

    if (
      process.execPath &&
      fs.existsSync(process.execPath) &&
      !/electron/i.test(process.execPath)
    ) {
      return process.execPath;
    }

    return process.platform === "win32" ? "node.exe" : "node";
  }

  readConfiguredString(runtimeRoot, keyName) {
    const envValue = String(process.env[keyName] || "").trim();
    if (envValue) {
      return envValue;
    }

    const envFileList = [".env", ".env copy"];
    for (const envFileName of envFileList) {
      const envFilePath = path.join(runtimeRoot, envFileName);
      if (!fs.existsSync(envFilePath)) {
        continue;
      }

      const content = fs.readFileSync(envFilePath, "utf8");
      const match = content.match(
        new RegExp(`^\\s*${keyName}\\s*=\\s*(.+?)\\s*$`, "m")
      );
      const value = String(match?.[1] || "")
        .replace(/\s+#.*$/, "")
        .replace(/^['"]|['"]$/g, "")
        .trim();
      if (value) {
        return value;
      }
    }

    return "";
  }

  buildCandidatePorts(requestedPort, configuredPort) {
    const candidatePorts = [configuredPort, requestedPort, this.port, DEFAULT_PORT]
      .map((port) => this.parsePort(port))
      .filter(Boolean);
    return [...new Set(candidatePorts)];
  }

  buildExternalBackendUnavailableMessage(port) {
    return `External backend mode is enabled, but no backend is listening on ${this.host}:${port}`;
  }

  isExternalBackendUnavailableError(error) {
    return (
      this.backendMode === "external"
      && error instanceof Error
      && Boolean(this.lastError)
      && error.message === this.lastError
      && /no backend is listening/i.test(error.message)
    );
  }

  buildUnavailableHardwareStatusResponse(errorMessage) {
    return {
      success: true,
      data: {
        connectionState: "disconnected",
        lastError: errorMessage,
        message: errorMessage,
      },
    };
  }

  async tryAttachExistingServer(port, host) {
    const targetPort = this.parsePort(port);
    if (!targetPort) {
      return false;
    }

    const previousHost = this.host;
    const previousPort = this.port;

    this.host = host || DEFAULT_HOST;
    this.port = targetPort;

    try {
      await waitForJson(this.getHealthUrl(), {
        timeoutMs: 1200,
        intervalMs: 250,
        validate: (payload) => payload?.status === "ok",
      });
      this.external = true;
      this.lastError = "";
      return true;
    } catch (_error) {
      this.host = previousHost;
      this.port = previousPort;
      return false;
    }
  }

  async start(options = {}) {
    if (options.projectPath) {
      this.projectPath = options.projectPath;
    }

    if (this.process && !this.process.killed) {
      return this.status();
    }

    const runtime = this.resolveBackendRoot();
    this.host = options.host || this.host || DEFAULT_HOST;
    this.httpTimeoutMs = this.resolveHttpTimeoutMs(runtime.root);
    this.backendMode = this.resolveBackendMode(runtime.root);
    const configuredPort = this.readConfiguredAgentPort(runtime.root);
    const requestedPort = this.parsePort(options.port);
    const candidatePorts = this.buildCandidatePorts(requestedPort, configuredPort);

    for (const candidatePort of candidatePorts) {
      if (await this.tryAttachExistingServer(candidatePort, this.host)) {
        return this.status();
      }
    }

    if (this.backendMode === "external") {
      const unavailablePort = candidatePorts[0] || configuredPort || DEFAULT_PORT;
      const unavailableMessage = this.buildExternalBackendUnavailableMessage(unavailablePort);
      const shouldLogUnavailableState = this.lastError !== unavailableMessage;
      this.external = true;
      this.lastError = unavailableMessage;
      if (shouldLogUnavailableState) {
        this.appendLog(
          `[tesseract-runtime] External backend mode requires a running backend on ${this.host}:${unavailablePort}`,
          "warn",
          "runtime"
        );
      }
      throw new Error(this.lastError);
    }

    this.external = false;
    this.port = await findAvailablePort(candidatePorts[0] || DEFAULT_PORT, this.host);
    const n8nApiAccess = this.resolveN8nApiAccess(runtime.root);

    const env = {
      ...process.env,
      AGENT_PORT: String(this.port),
      AGENT_HOST: this.host,
      TESSERACT_PROJECT_PATH: this.projectPath || "",
    };

    if (n8nApiAccess.baseUrl) {
      env.N8N_API_URL = n8nApiAccess.baseUrl;
    } else {
      delete env.N8N_API_URL;
    }

    if (n8nApiAccess.apiKey) {
      env.N8N_API_KEY = n8nApiAccess.apiKey;
    } else {
      delete env.N8N_API_KEY;
    }

    this.logs = [];
    this.lastError = "";
    if (n8nApiAccess.baseUrl && n8nApiAccess.apiKey) {
      this.appendLog(`[tesseract-runtime] Using n8n API config from ${n8nApiAccess.source}`);
    } else {
      this.appendLog(
        "[tesseract-runtime] No n8n API config injected; backend runtime will resolve backend/.env on startup"
      );
    }
    this.process = spawn(this.resolveNodeBinary(), [runtime.entry], {
      cwd: runtime.root,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    this.lastStartedAt = new Date().toISOString();

    attachProcessLogger(this.process, {
      module: "tesseract-runtime",
      source: "backend-agent",
      sink: this.logs,
    });
    this.process.once("exit", (code, signal) => {
      this.appendLog(`[exit] code=${code} signal=${signal}`, "warn", "process");
      this.process = null;
    });

    try {
      await waitForJson(this.getHealthUrl(), {
        timeoutMs: 45000,
        validate: (payload) => payload?.status === "ok",
      });
      return this.status();
    } catch (error) {
      this.lastError = error.message;
      await this.stop();
      throw error;
    }
  }

  async stop() {
    if (this.process) {
      await terminateChild(this.process);
      this.process = null;
    }

    this.external = false;
    return this.status();
  }

  async status() {
    let healthy = false;
    try {
      const payload = await waitForJson(this.getHealthUrl(), {
        timeoutMs: 1500,
        intervalMs: 300,
        validate: (data) => data?.status === "ok",
      });
      healthy = payload?.status === "ok";
    } catch (error) {
      if (this.process && !this.process.killed) {
        this.lastError = error.message;
      }
    }

    return {
      running: Boolean((this.process && !this.process.killed) || (this.external && healthy)),
      healthy,
      external: this.external,
      backendMode: this.backendMode,
      host: this.host,
      port: this.port,
      baseUrl: this.getBaseUrl(),
      requestTimeoutMs: this.httpTimeoutMs,
      projectPath: this.projectPath || null,
      pid: this.process?.pid || null,
      lastError: this.lastError || null,
      lastStartedAt: this.lastStartedAt,
      logs: this.logs.slice(-20),
    };
  }

  async chat(payload = {}) {
    await this.start(payload);
    return postJson(`${this.getBaseUrl()}/api/agent/chat`, {
      message: payload.message,
      sessionId: payload.sessionId,
      interactionMode: payload.interactionMode,
      teachingContext: payload.teachingContext,
      clarificationContext: payload.clarificationContext || null,
    }, {
      timeoutMs: this.httpTimeoutMs,
    });
  }

  async validateHardware(payload = {}) {
    await this.start(payload);
    return postJson(`${this.getBaseUrl()}/api/agent/dialogue/validate-hardware`, {
      sessionId: payload.sessionId,
      event: payload.event,
      interactionMode: payload.interactionMode || 'dialogue',
      teachingContext: payload.teachingContext || null,
    }, {
      timeoutMs: this.httpTimeoutMs,
    });
  }

  async getHardwareStatus(payload = {}) {
    try {
      await this.start(payload);
    } catch (error) {
      if (this.isExternalBackendUnavailableError(error)) {
        return this.buildUnavailableHardwareStatusResponse(error.message);
      }
      throw error;
    }
    return postJson(`${this.getBaseUrl()}/api/agent/hardware/status`, undefined, {
      method: "GET",
      timeoutMs: this.httpTimeoutMs,
    });
  }

  async uploadHardwareWorkflow(payload = {}) {
    await this.start(payload);
    return postJson(`${this.getBaseUrl()}/api/agent/hardware/workflow/upload`, {
      sessionId: payload.sessionId,
      workflow: payload.workflow,
      workflowJson: payload.workflowJson,
    }, {
      timeoutMs: this.httpTimeoutMs,
    });
  }

  async stopHardwareWorkflow(payload = {}) {
    await this.start(payload);
    return postJson(`${this.getBaseUrl()}/api/agent/hardware/workflow/stop`, {}, {
      timeoutMs: this.httpTimeoutMs,
    });
  }

  async sendHardwareCommand(payload = {}) {
    await this.start(payload);
    return postJson(`${this.getBaseUrl()}/api/agent/hardware/command`, {
      deviceType: payload.deviceType,
      cmd: payload.cmd,
      extra: payload.extra,
    }, {
      timeoutMs: this.httpTimeoutMs,
    });
  }

  async openMicrophone(payload = {}) {
    await this.start(payload);
    return postJson(`${this.getBaseUrl()}/api/agent/hardware/microphone/open`, {}, {
      timeoutMs: this.httpTimeoutMs,
    });
  }

  async closeMicrophone(payload = {}) {
    await this.start(payload);
    return postJson(`${this.getBaseUrl()}/api/agent/hardware/microphone/close`, {}, {
      timeoutMs: this.httpTimeoutMs,
    });
  }

  async playSpeaker(payload = {}) {
    await this.start(payload);
    return postJson(`${this.getBaseUrl()}/api/agent/hardware/speaker/play`, {
      audioName: payload.audioName,
      path: payload.path,
      text: payload.text,
    }, {
      timeoutMs: this.httpTimeoutMs,
    });
  }

  async startDeploy(payload = {}) {
    await this.start(payload);
    return postJson(`${this.getBaseUrl()}/api/agent/dialogue/start-deploy`, {
      sessionId: payload.sessionId,
      interactionMode: payload.interactionMode || 'dialogue',
      teachingContext: payload.teachingContext || null,
    }, {
      timeoutMs: this.httpTimeoutMs,
    });
  }

  async confirmWorkflow(payload = {}) {
    await this.start(payload);
    // 020-workflow-gen-resilience: confirm 涉及完整生成+验证循环，使用更宽超时
    const confirmTimeoutMs = Math.max(this.httpTimeoutMs, this.httpTimeoutMs * 1.5);
    return postJson(`${this.getBaseUrl()}/api/agent/confirm`, {
      sessionId: payload.sessionId,
    }, {
      timeoutMs: confirmTimeoutMs,
    });
  }

  async createWorkflow(payload = {}) {
    await this.start(payload);
    return postJson(`${this.getBaseUrl()}/api/workflow/create`, {
      sessionId: payload.sessionId,
      workflow: payload.workflow,
    }, {
      timeoutMs: this.httpTimeoutMs,
    });
  }

  async startConfig(payload = {}) {
    await this.start(payload);
    return postJson(`${this.getBaseUrl()}/api/agent/start-config`, {
      sessionId: payload.sessionId,
      workflowId: payload.workflowId,
      workflowJson: payload.workflowJson,
    }, {
      timeoutMs: this.httpTimeoutMs,
    });
  }

  async confirmNode(payload = {}) {
    await this.start(payload);
    return postJson(`${this.getBaseUrl()}/api/agent/confirm-node`, payload, {
      timeoutMs: this.httpTimeoutMs,
    });
  }

  async uploadFaceImage(payload = {}) {
    await this.start(payload);
    return postJson(`${this.getBaseUrl()}/api/agent/upload-face`, {
      profile: payload.profile,
      fileName: payload.fileName,
      contentBase64: payload.contentBase64,
    }, {
      timeoutMs: this.httpTimeoutMs,
    });
  }

  async listSkills(payload = {}) {
    await this.start(payload);
    return postJson(`${this.getBaseUrl()}/api/agent/skills`, undefined, {
      method: "GET",
      timeoutMs: this.httpTimeoutMs,
    });
  }

  async saveSkill(payload = {}) {
    await this.start(payload);
    return postJson(`${this.getBaseUrl()}/api/agent/save-skill`, {
      sessionId: payload.sessionId,
    }, {
      timeoutMs: this.httpTimeoutMs,
    });
  }

  async deleteSkill(payload = {}) {
    await this.start(payload);
    const skillId = payload.skillId || '';
    return postJson(`${this.getBaseUrl()}/api/agent/skills/${encodeURIComponent(skillId)}`, undefined, {
      method: "DELETE",
      timeoutMs: this.httpTimeoutMs,
    });
  }

  async getConfigState(payload = {}) {
    await this.start(payload);
    return postJson(
      `${this.getBaseUrl()}/api/agent/config-state?sessionId=${encodeURIComponent(
        payload.sessionId || ""
      )}`,
      undefined,
      {
        method: "GET",
        timeoutMs: this.httpTimeoutMs,
      }
    );
  }

  getBaseUrl() {
    return `http://${this.host}:${this.port}`;
  }

  getHealthUrl() {
    return `${this.getBaseUrl()}/api/health`;
  }
}

module.exports = {
  TesseractRuntime,
};
