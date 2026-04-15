/**
 * [INPUT]: 依赖 runtime-utils 的端口探测/HTTP/JSON/进程管理能力，以及 n8n CLI 构建产物与 Electron session/cookie 能力。
 * [OUTPUT]: 对外提供 N8nRuntime，负责启动 embedded n8n、建立工作区会话、确保 public API 与 agent 专用 API key，并把凭据与运行日志写入共享运行时文件/结构化归档。
 * [POS]: electron 层的 embedded n8n 真相源，被 tesseract-ipc 与 tesseract-runtime 消费；它决定 WebUI `/settings/api` 是否可见、backend 是否拿得到可用的 `X-N8N-API-KEY`，以及 n8n 运行态如何进入统一日志总线，不得再偷偷向项目工作区注入默认示例 workflow。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { app, shell, session } = require("electron");
const { getStructuredLogger } = require("./logger");
const {
  attachProcessLogger,
  ensureDir,
  findAvailablePort,
  postJson,
  readJson,
  terminateChild,
  waitForJson,
  writeJson,
} = require("./runtime-utils");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 5678;
const DEFAULT_BROKER_PORT = 5679;
const AUTH_COOKIE_NAME = "n8n-auth";
const DEFAULT_WORKSPACE_ROUTE = "/home/workflows";
const EMBEDDED_DISABLED_MODULES = [
  "insights",
  "external-secrets",
  "community-packages",
  "data-table",
  "mcp",
  "provisioning",
  "breaking-changes",
  "source-control",
  "dynamic-credentials",
  "chat-hub",
  "sso-oidc",
  "sso-saml",
  "log-streaming",
].join(",");
const PRIMARY_EMBEDDED_OWNER = Object.freeze({
  email: "123@qq.com",
  firstName: "Sam",
  lastName: "Workspace",
  password: "A1234567",
});
const EMBEDDED_AUTH_RESET_COMMAND = ["user-management:reset"];
const EMBEDDED_AGENT_API_KEY_LABEL = "tesseract-embedded-agent";
const EMBEDDED_API_ACCESS_FILE = "api-access.json";

class N8nRuntime {
  constructor() {
    this.process = null;
    this.host = DEFAULT_HOST;
    this.port = DEFAULT_PORT;
    this.brokerPort = DEFAULT_BROKER_PORT;
    this.logs = [];
    this.lastError = "";
    this.lastStartedAt = null;
    this.lastAuthToken = "";
    this.authHeaderHookInstalled = false;
    this.authDebugHookInstalled = false;
    this.apiAccess = null;
    this.publicApiEnabled = false;
    this.logger = getStructuredLogger({
      module: "n8n-runtime",
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
      message: line.replace(/^\[n8n-runtime\]\s*/, ""),
      context,
      mirrorToConsole: true,
    });
  }

  async waitForEditorReady(url = this.getBaseUrl(), timeoutMs = 60000) {
    await waitForJson(url, {
      timeoutMs,
      intervalMs: 500,
      validate: (payload) =>
        typeof payload === "string" &&
        payload.includes("<div id=\"app\">") &&
        payload.includes("n8n"),
    });
  }

  getUserFolder() {
    const userFolder = path.join(
      app.getPath("appData"),
      app.getName(),
      "tesseract",
      "n8n",
      "embedded-workspace"
    );
    ensureDir(userFolder);
    return userFolder;
  }

  getSharedRuntimeRoot() {
    const runtimeRoot = path.join(__dirname, "..", ".tesseract-runtime", "n8n");
    ensureDir(runtimeRoot);
    return runtimeRoot;
  }

  getApiAccessFilePath() {
    return path.join(this.getSharedRuntimeRoot(), EMBEDDED_API_ACCESS_FILE);
  }

  readStoredApiAccess() {
    return readJson(this.getApiAccessFilePath(), null);
  }

  writeStoredApiAccess(apiAccess) {
    writeJson(this.getApiAccessFilePath(), {
      ...apiAccess,
      updatedAt: new Date().toISOString(),
    });
  }

  clearStoredApiAccess() {
    this.apiAccess = null;
    try {
      fs.unlinkSync(this.getApiAccessFilePath());
    } catch (_error) {
      // 忽略不存在的共享凭据文件，保持清理幂等。
    }
  }

  buildRuntimeEnv(runtime) {
    return {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      N8N_CLI_ROOT: runtime.cliRoot,
      N8N_ENTRY: runtime.entry,
      PATH: this.buildRuntimePathEnv(),
      N8N_PORT: String(this.port),
      N8N_LISTEN_ADDRESS: this.host,
      N8N_EDITOR_BASE_URL: this.getBaseUrl(),
      N8N_USER_FOLDER: this.getUserFolder(),
      N8N_RUNNERS_MODE: process.env.N8N_RUNNERS_MODE || "external",
      N8N_RUNNERS_AUTH_TOKEN:
        process.env.N8N_RUNNERS_AUTH_TOKEN || "tesseract-embedded-runner-token",
      N8N_RUNNERS_BROKER_PORT: String(this.brokerPort),
      N8N_RUNNERS_BROKER_LISTEN_ADDRESS:
        process.env.N8N_RUNNERS_BROKER_LISTEN_ADDRESS || this.host,
      N8N_PERSONALIZATION_ENABLED: "false",
      N8N_DIAGNOSTICS_ENABLED: "false",
      N8N_SECURE_COOKIE: process.env.N8N_SECURE_COOKIE || "false",
      N8N_PYTHON_ENABLED: process.env.N8N_PYTHON_ENABLED || "false",
      N8N_PUBLIC_API_DISABLED: process.env.N8N_PUBLIC_API_DISABLED || "false",
      N8N_COMMUNITY_PACKAGES_ENABLED:
        process.env.N8N_COMMUNITY_PACKAGES_ENABLED || "false",
      N8N_COMMUNITY_PACKAGES_PREVENT_LOADING:
        process.env.N8N_COMMUNITY_PACKAGES_PREVENT_LOADING || "true",
      N8N_DISABLED_MODULES:
        process.env.N8N_DISABLED_MODULES || EMBEDDED_DISABLED_MODULES,
    };
  }

  async readResponsePayload(response) {
    const contentType = response.headers.get("content-type") || "";
    return contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  }

  extractCookieValue(setCookieHeader, cookieName) {
    if (!setCookieHeader) {
      return "";
    }

    const firstCookie = String(setCookieHeader).split(/,(?=\s*[A-Za-z0-9_.-]+=)/)[0];
    const prefix = `${cookieName}=`;
    const startedAt = firstCookie.indexOf(prefix);
    if (startedAt === -1) {
      return "";
    }

    const rawValue = firstCookie.slice(startedAt + prefix.length).split(";")[0];
    return rawValue.trim();
  }

  async setAuthCookie(token) {
    if (!token) {
      throw new Error("Missing n8n auth token");
    }

    this.lastAuthToken = token;
    this.ensureAuthHeaderHook();
    this.ensureAuthDebugHook();
    await session.defaultSession.cookies.remove(this.getBaseUrl(), AUTH_COOKIE_NAME);
    await session.defaultSession.cookies.set({
      url: this.getBaseUrl(),
      name: AUTH_COOKIE_NAME,
      value: token,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    const storedCookies = await session.defaultSession.cookies.get({ url: this.getBaseUrl() });
    this.appendLog(
      `[n8n-runtime] Stored cookies for ${this.getBaseUrl()}: ${storedCookies
        .map((cookie) => cookie.name)
        .join(",")}`
    );
  }

  async clearAuthCookie() {
    this.lastAuthToken = "";
    try {
      await session.defaultSession.cookies.remove(this.getBaseUrl(), AUTH_COOKIE_NAME);
    } catch (_error) {
      // Ignore cookie cleanup failures during runtime recovery.
    }
  }

  buildWorkspaceHeaders(extraHeaders = {}) {
    const headers = { ...extraHeaders };
    if (this.lastAuthToken) {
      headers.Cookie = `${AUTH_COOKIE_NAME}=${this.lastAuthToken}`;
    }
    return headers;
  }

  async requestWorkspaceJson(endpoint, options = {}) {
    const method = options.method || "GET";
    const requestHeaders = this.buildWorkspaceHeaders({
      Accept: "application/json",
      ...(options.headers || {}),
    });
    const requestInit = {
      method,
      headers: requestHeaders,
    };

    if (options.body !== undefined) {
      requestHeaders["Content-Type"] = "application/json";
      requestInit.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${this.getBaseUrl()}${endpoint}`, requestInit);
    const payload = await this.readResponsePayload(response);
    if (!response.ok) {
      const message =
        typeof payload === "string"
          ? payload
          : payload?.message || payload?.error || `HTTP ${response.status}`;
      throw new Error(message);
    }

    return payload?.data ?? payload;
  }

  async validatePublicApiKey(apiKey) {
    if (!apiKey) {
      return false;
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/api/v1/workflows?limit=1`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-N8N-API-KEY": apiKey,
        },
      });

      if (!response.ok) {
        return false;
      }

      const payload = await this.readResponsePayload(response);
      return Boolean(payload);
    } catch (_error) {
      return false;
    }
  }

  async ensureEmbeddedApiAccess() {
    const settings = await this.requestWorkspaceJson("/rest/settings");
    const publicApi = settings?.publicApi || {};
    this.publicApiEnabled = publicApi.enabled === true;

    if (!this.publicApiEnabled) {
      this.clearStoredApiAccess();
      throw new Error(
        "Embedded n8n public API is disabled. Set N8N_PUBLIC_API_DISABLED=false before launch."
      );
    }

    const baseUrl = `${this.getBaseUrl()}/api/v1`;
    const storedApiAccess = this.readStoredApiAccess();
    if (
      storedApiAccess?.apiKey &&
      storedApiAccess?.baseUrl === baseUrl &&
      (await this.validatePublicApiKey(storedApiAccess.apiKey))
    ) {
      this.apiAccess = storedApiAccess;
      this.appendLog("[n8n-runtime] Reused embedded API key from shared runtime file");
      return storedApiAccess;
    }

    const scopes = await this.requestWorkspaceJson("/rest/api-keys/scopes");
    if (!Array.isArray(scopes) || scopes.length === 0) {
      throw new Error("Embedded n8n returned no API key scopes for the owner account");
    }

    const existingApiKeys = await this.requestWorkspaceJson("/rest/api-keys");
    if (Array.isArray(existingApiKeys)) {
      for (const apiKey of existingApiKeys) {
        if (apiKey?.label !== EMBEDDED_AGENT_API_KEY_LABEL || !apiKey?.id) {
          continue;
        }
        await this.requestWorkspaceJson(`/rest/api-keys/${apiKey.id}`, {
          method: "DELETE",
        });
      }
    }

    const createdApiKey = await this.requestWorkspaceJson("/rest/api-keys", {
      method: "POST",
      body: {
        label: EMBEDDED_AGENT_API_KEY_LABEL,
        expiresAt: null,
        scopes,
      },
    });

    if (!createdApiKey?.rawApiKey) {
      throw new Error("Embedded n8n did not return the raw API key value");
    }

    const apiAccess = {
      apiKey: createdApiKey.rawApiKey,
      apiKeyId: createdApiKey.id || null,
      label: createdApiKey.label || EMBEDDED_AGENT_API_KEY_LABEL,
      baseUrl,
      publicUrl: this.getBaseUrl(),
      ownerEmail: PRIMARY_EMBEDDED_OWNER.email,
      createdAt: createdApiKey.createdAt || new Date().toISOString(),
    };

    this.writeStoredApiAccess(apiAccess);
    this.apiAccess = apiAccess;
    this.appendLog("[n8n-runtime] Created embedded API key and wrote shared runtime access file");
    return apiAccess;
  }

  ensureAuthHeaderHook() {
    if (this.authHeaderHookInstalled) {
      return;
    }

    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      if (!details.url.startsWith(this.getBaseUrl()) || !this.lastAuthToken) {
        callback({ requestHeaders: details.requestHeaders });
        return;
      }

      const requestHeaders = { ...details.requestHeaders };
      const existingCookie = requestHeaders.Cookie || requestHeaders.cookie || "";
      const authCookie = `${AUTH_COOKIE_NAME}=${this.lastAuthToken}`;

      if (!String(existingCookie).includes(`${AUTH_COOKIE_NAME}=`)) {
        requestHeaders.Cookie = existingCookie
          ? `${existingCookie}; ${authCookie}`
          : authCookie;
        if (/(\/workflow\/|\/signin|\/rest\/me|\/rest\/login|\/rest\/push)/.test(details.url)) {
          this.appendLog(
            `[n8n-auth-hook] Injected cookie into ${details.resourceType} ${details.method} ${details.url}`,
            "info",
            "auth-hook"
          );
        }
      }

      callback({ requestHeaders });
    });

    this.authHeaderHookInstalled = true;
  }

  ensureAuthDebugHook() {
    if (this.authDebugHookInstalled) {
      return;
    }

    session.defaultSession.webRequest.onCompleted((details) => {
      if (
        details.url.startsWith(this.getBaseUrl()) &&
        /(\/workflow\/|\/signin|\/rest\/me|\/rest\/login|\/rest\/push)/.test(details.url)
      ) {
        this.appendLog(
          `[n8n-auth-hook] ${details.statusCode} ${details.resourceType} ${details.method} ${details.url}`,
          "info",
          "auth-hook"
        );
      }
    });

    this.authDebugHookInstalled = true;
  }

  getEmbeddedCredentials() {
    return {
      email: PRIMARY_EMBEDDED_OWNER.email,
      password: PRIMARY_EMBEDDED_OWNER.password,
      firstName: PRIMARY_EMBEDDED_OWNER.firstName,
      lastName: PRIMARY_EMBEDDED_OWNER.lastName,
    };
  }

  isEmbeddedAuthFailure(error) {
    const message = String(error?.message || error || "");
    return /wrong username or password/i.test(message) || /http 401/i.test(message);
  }

  async resetEmbeddedWorkspaceUserManagement() {
    this.appendLog("[n8n-runtime] Resetting embedded workspace owner state", "warn");
    await this.clearAuthCookie();
    await this.runCliCommand(EMBEDDED_AUTH_RESET_COMMAND, "[n8n-reset-user]");
  }

  async postForWorkspaceSession(endpoint, payload) {
    const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await this.readResponsePayload(response);
    if (!response.ok) {
      const message =
        typeof data === "string"
          ? data
          : data?.message || data?.error || `HTTP ${response.status}`;
      throw new Error(message);
    }

    const authToken = this.extractCookieValue(
      response.headers.get("set-cookie"),
      AUTH_COOKIE_NAME
    );
    await this.setAuthCookie(authToken);
    return data;
  }

  async ensureWorkspaceSession() {
    const settingsResponse = await waitForJson(`${this.getBaseUrl()}/rest/settings`, {
      timeoutMs: 10000,
      intervalMs: 500,
      validate: (payload) => Boolean(payload?.data || payload?.userManagement),
    });
    const settings = settingsResponse?.data || settingsResponse;
    const needsOwnerSetup = Boolean(settings?.userManagement?.showSetupOnFirstLoad);

    if (needsOwnerSetup) {
      await this.postForWorkspaceSession("/rest/owner/setup", PRIMARY_EMBEDDED_OWNER);
      this.appendLog("[n8n-runtime] Embedded owner setup completed");
      return;
    }

    await this.postForWorkspaceSession("/rest/login", {
      emailOrLdapLoginId: PRIMARY_EMBEDDED_OWNER.email,
      password: PRIMARY_EMBEDDED_OWNER.password,
    });
    this.appendLog("[n8n-runtime] Embedded owner login completed");
  }

  async runCliCommand(args, logPrefix) {
    const runtime = this.resolveN8nRoot();
    const env = this.buildRuntimeEnv(runtime);

    return await new Promise((resolve, reject) => {
      const lines = [];
      const child = spawn(this.resolveNodeBinary(), [runtime.bootstrapPath, ...args], {
        cwd: runtime.cliRoot,
        env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
      attachProcessLogger(child, {
        module: String(logPrefix || "").replace(/^\[|\]$/g, "") || "n8n-cli",
        source: "cli",
        sink: lines,
      });
      child.once("exit", (code) => {
        if (code === 0) {
          resolve(lines);
          return;
        }

        reject(new Error(lines.join("\n") || `${logPrefix} exited with ${code}`));
      });
    });
  }

  buildRuntimePathEnv() {
    const delimiter = process.platform === "win32" ? ";" : ":";
    const binaryName = process.platform === "win32" ? "node.exe" : "node";
    const existing = process.env.PATH || "";
    const resolvedNodeBinary = this.resolveNodeBinary();
    const candidates = [
      path.isAbsolute(resolvedNodeBinary) ? path.dirname(resolvedNodeBinary) : "",
      path.dirname(process.env.NODE || ""),
      path.dirname(process.env.npm_node_execpath || ""),
      process.platform === "win32"
        ? path.join(process.env.ProgramFiles || "C:\\Program Files", "nodejs")
        : "",
      process.platform === "win32"
        ? path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "nodejs")
        : "",
    ].filter(Boolean);

    const validCandidates = candidates.filter((candidate) =>
      fs.existsSync(path.join(candidate, binaryName))
    );

    return [...new Set([...validCandidates, existing].filter(Boolean))].join(delimiter);
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

  resolveN8nRoot() {
    const bootstrapPath = path.join(__dirname, "n8n-cli-bootstrap.js");
    const deployedRoot = path.join(__dirname, "..", ".tesseract-runtime", "n8n");
    const deployedEntry = path.join(deployedRoot, "bin", "n8n");
    const deployedDist = path.join(deployedRoot, "dist");
    const deployedCriticalPackage = path.join(
      deployedRoot,
      "node_modules",
      "@n8n",
      "backend-common"
    );
    if (
      fs.existsSync(deployedRoot) &&
      fs.existsSync(deployedEntry) &&
      fs.existsSync(deployedDist) &&
      fs.existsSync(deployedCriticalPackage) &&
      fs.existsSync(bootstrapPath)
    ) {
      return {
        root: deployedRoot,
        cliRoot: deployedRoot,
        entry: deployedEntry,
        bootstrapPath,
        source: "deployed",
      };
    }

    if (
      fs.existsSync(deployedRoot) &&
      fs.existsSync(deployedEntry) &&
      fs.existsSync(deployedDist) &&
      !fs.existsSync(deployedCriticalPackage)
    ) {
      this.appendLog(
        "[n8n-runtime] Deployed runtime is missing top-level workspace package links, falling back to workspace n8n",
        "warn"
      );
    }

    const root = path.resolve(__dirname, "..", "..", "n8n", "n8n-master");
    const cliRoot = path.join(root, "packages", "cli");
    const entry = path.join(root, "packages", "cli", "bin", "n8n");
    const distDir = path.join(root, "packages", "cli", "dist");
    if (
      !fs.existsSync(root) ||
      !fs.existsSync(cliRoot) ||
      !fs.existsSync(entry) ||
      !fs.existsSync(distDir) ||
      !fs.existsSync(bootstrapPath)
    ) {
      throw new Error(
        "n8n runtime not found. Expected .tesseract-runtime/n8n or ../n8n/n8n-master/packages/cli/dist. Build/deploy the n8n workspace first."
      );
    }
    return { root, cliRoot, entry, bootstrapPath: entry, source: "workspace" };
  }

  async start(options = {}) {
    if (this.process && !this.process.killed) {
      return this.status();
    }

    const runtime = this.resolveN8nRoot();
    this.host = options.host || this.host || DEFAULT_HOST;
    this.port =
      options.port ||
      (await findAvailablePort(this.port || DEFAULT_PORT, this.host));
    const preferredBrokerPort =
      options.runnerBrokerPort ||
      (this.brokerPort === this.port ? this.port + 1 : this.brokerPort) ||
      DEFAULT_BROKER_PORT;
    this.brokerPort = await findAvailablePort(
      preferredBrokerPort === this.port ? this.port + 1 : preferredBrokerPort,
      this.host
    );
    if (this.brokerPort === this.port) {
      this.brokerPort = await findAvailablePort(this.port + 1, this.host);
    }

    const env = this.buildRuntimeEnv(runtime);

    this.logs = [];
    this.lastError = "";
    this.publicApiEnabled = false;
    this.process = spawn(this.resolveNodeBinary(), [runtime.bootstrapPath, "start"], {
      cwd: runtime.cliRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    this.lastStartedAt = new Date().toISOString();

    attachProcessLogger(this.process, {
      module: "n8n-runtime",
      source: "embedded-n8n",
      sink: this.logs,
    });
    this.process.once("exit", (code, signal) => {
      this.appendLog(`[exit] code=${code} signal=${signal}`, "warn", "process");
      this.process = null;
    });

    const failWhenProcessExits = new Promise((_, reject) => {
      this.process.once("exit", (code, signal) => {
        const recentLogs = this.logs.slice(-20).join("\n").trim();
        const reason = recentLogs || `embedded n8n exited before ready (code=${code}, signal=${signal})`;
        reject(new Error(reason));
      });
    });

    try {
      await Promise.race([
        (async () => {
          await waitForJson(`${this.getBaseUrl()}/healthz`, {
            timeoutMs: 60000,
            validate: (payload) => Boolean(payload),
          });
          await this.waitForEditorReady();
          await this.ensureWorkspaceSession();
          await this.ensureEmbeddedApiAccess();
        })(),
        failWhenProcessExits,
      ]);
      return this.status();
    } catch (error) {
      if (!options.authRecoveryAttempted && this.isEmbeddedAuthFailure(error)) {
        this.appendLog("[n8n-runtime] Embedded auth failed, attempting owner reset", "warn");
        await this.stop();
        await this.resetEmbeddedWorkspaceUserManagement();
        return this.start({
          ...options,
          authRecoveryAttempted: true,
        });
      }
      this.lastError = error.message;
      await this.stop();
      throw error;
    }
  }

  async stop() {
    await this.clearAuthCookie();
    this.publicApiEnabled = false;
    if (this.process) {
      await terminateChild(this.process);
      this.process = null;
    }
    return this.status();
  }

  async status() {
    let healthy = false;
    let editorReady = false;
    try {
      await waitForJson(`${this.getBaseUrl()}/healthz`, {
        timeoutMs: 1500,
        intervalMs: 300,
        validate: (payload) => Boolean(payload),
      });
      healthy = true;
      await this.waitForEditorReady(this.getBaseUrl(), 1500);
      editorReady = true;
    } catch (error) {
      if (this.process && !this.process.killed) {
        this.lastError = error.message;
      }
    }

    return {
      running: Boolean(this.process && !this.process.killed),
      healthy: healthy && editorReady,
      healthzReady: healthy,
      editorReady,
      host: this.host,
      port: this.port,
      brokerPort: this.brokerPort,
      baseUrl: this.getBaseUrl(),
      editorUrl: this.getEditorUrl(),
      publicApiEnabled: this.publicApiEnabled,
      apiAccessConfigured: Boolean(this.apiAccess?.apiKey),
      embeddedOwnerEmail: PRIMARY_EMBEDDED_OWNER.email,
      pid: this.process?.pid || null,
      lastError: this.lastError || null,
      lastStartedAt: this.lastStartedAt,
      logs: this.logs.slice(-20),
    };
  }

  getEditorUrl(payload = {}) {
    const workflowId = payload.workflowId || "";
    if (workflowId) {
      return `${this.getBaseUrl()}/workflow/${encodeURIComponent(workflowId)}`;
    }
    return `${this.getBaseUrl()}${DEFAULT_WORKSPACE_ROUTE}`;
  }

  async openWorkflow(payload = {}) {
    await this.start(payload);
    const url = this.getEditorUrl(payload);
    await shell.openExternal(url);
    return { success: true, url };
  }

  async persistWorkflowSnapshot(payload = {}) {
    if (!payload.projectPath) {
      throw new Error("projectPath is required to persist workflow snapshot");
    }

    const workflowPath = this.getWorkflowSnapshotPath(payload.projectPath);
    const previous = readJson(workflowPath, {});
    const nextSnapshot = {
      ...previous,
      ...(payload.snapshot || {}),
      updatedAt: new Date().toISOString(),
    };
    writeJson(workflowPath, nextSnapshot);
    return {
      success: true,
      path: workflowPath,
      snapshot: nextSnapshot,
    };
  }

  async importWorkflow(payload = {}) {
    if (!payload.projectPath) {
      throw new Error("projectPath is required to deploy workflow");
    }

    await this.start(payload);

    const workflowPath = this.getWorkflowSnapshotPath(payload.projectPath);
    const currentSnapshot = readJson(workflowPath, {});
    const workflow = payload.workflow || currentSnapshot.workflow;
    if (!workflow) {
      throw new Error("No workflow payload found in current project snapshot");
    }

    const normalizedWorkflow = {
      ...workflow,
      id: workflow.id || `tesseract_${Date.now()}`,
      name: workflow.name || path.basename(payload.projectPath),
    };

    const importPath = path.join(
      payload.projectPath,
      ".tesseract",
      "workflow.deploy.json"
    );
    writeJson(importPath, normalizedWorkflow);

    const output = await this.runCliCommand(
      ["import:workflow", `--input=${importPath}`],
      "[n8n-import]"
    );

    const result = {
      workflowId: normalizedWorkflow.id,
      workflowName: normalizedWorkflow.name,
      workflowUrl: this.getEditorUrl({ workflowId: normalizedWorkflow.id }),
      output,
    };

    await this.persistWorkflowSnapshot({
      projectPath: payload.projectPath,
      snapshot: {
        ...currentSnapshot,
        workflow: normalizedWorkflow,
        workflowId: result.workflowId,
        workflowUrl: result.workflowUrl,
        lastDeployedAt: new Date().toISOString(),
      },
    });

    return result;
  }

  getWorkflowSnapshotPath(projectPath) {
    return path.join(projectPath, ".tesseract", "workflow.json");
  }

  getBaseUrl() {
    return `http://${this.host}:${this.port}`;
  }
}

module.exports = {
  N8nRuntime,
};
