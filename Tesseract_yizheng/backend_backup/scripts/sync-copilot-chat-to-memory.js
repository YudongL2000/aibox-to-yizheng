#!/usr/bin/env node

/**
 * [INPUT]: 依赖 Node.js 内置 fs/path/http/https/os/crypto，依赖 VS Code workspaceStorage 下各工作区的 chatSessions JSONL 持久化文件，依赖 Memory MCP 的 HTTP `tools/call` 接口。
 * [OUTPUT]: 对外提供 Copilot 聊天到 Memory MCP 的自动同步进程，支持 `--once`、`--dry-run`、`--backfill`。
 * [POS]: scripts/ 的本地同步器，把 GitHub Copilot Chat 可见会话镜像到 Memory MCP；与 `mcp-http-client.js` 同属仓库外部桥接脚本。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const https = require('https');
const os = require('os');
const path = require('path');

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);

function readOption(name) {
  const prefix = `${name}=`;
  for (let index = 0; index < rawArgs.length; index += 1) {
    const value = rawArgs[index];
    if (value === name) {
      return rawArgs[index + 1] || '';
    }

    if (value.startsWith(prefix)) {
      return value.slice(prefix.length);
    }
  }

  return '';
}

const isDryRun = args.has('--dry-run');
const isOnce = args.has('--once');
const shouldBackfill = args.has('--backfill');
const isVerbose = args.has('--verbose') || process.env.COPILOT_SYNC_VERBOSE === '1';

const appDataDir = detectAppDataDir();

const memoryMcpUrl = readOption('--memory-mcp-url') || process.env.MEMORY_MCP_URL || '';
const workspaceStorageRoot =
  readOption('--workspace-storage') ||
  process.env.COPILOT_WORKSPACE_STORAGE ||
  detectCurrentWorkspaceStorage(path.resolve(__dirname, '..')) ||
  '';
const explicitLogFilePath = readOption('--log-path') || process.env.COPILOT_SYNC_LOG_PATH || '';
const syncScopeHash = crypto
  .createHash('sha256')
  .update(`${workspaceStorageRoot}|${memoryMcpUrl}`)
  .digest('hex')
  .slice(0, 12);
const singleSessionFile = process.env.COPILOT_CHAT_SESSION_FILE || '';
const pollIntervalMs = parseInteger(process.env.COPILOT_SYNC_POLL_MS, 2000);
const requestTimeoutMs = parseInteger(process.env.COPILOT_SYNC_REQUEST_TIMEOUT_MS, 15000);
const lockStaleAfterMs = parseInteger(process.env.COPILOT_SYNC_LOCK_STALE_MS, 120000);
const stateFilePath =
  process.env.COPILOT_SYNC_STATE_PATH ||
  path.join(
    appDataDir,
    'Code',
    'User',
    'globalStorage',
    'github.copilot-chat',
    `memory-mcp-sync-state-${syncScopeHash}.json`
  );
const lockFilePath = `${stateFilePath}.lock`;
const stateSchemaVersion = 3;
let lockHeartbeatTimer = null;

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function detectAppDataDir() {
  const username = process.env.USER || os.userInfo().username || '';
  const cwdMatch = process.cwd().match(/^\/mnt\/([a-z])\/Users\/([^/]+)/i);
  const mountedWindowsHome = cwdMatch
    ? path.join('/mnt', cwdMatch[1].toLowerCase(), 'Users', cwdMatch[2])
    : '';
  const candidates = [
    process.env.APPDATA,
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Roaming') : '',
    process.env.HOME ? path.join(process.env.HOME, 'AppData', 'Roaming') : '',
    username ? path.join('/mnt/c/Users', username, 'AppData', 'Roaming') : '',
    mountedWindowsHome ? path.join(mountedWindowsHome, 'AppData', 'Roaming') : '',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return process.env.APPDATA || '';
}

function normalizeComparablePath(value) {
  if (!value) {
    return '';
  }

  let normalized = String(value).replace(/\\/g, '/');
  normalized = normalized.replace(/^file:\/\//i, '');
  normalized = normalized.replace(/^\/mnt\/([a-z])\//i, '$1:/');
  normalized = normalized.replace(/^\/([a-z]:\/)/i, '$1');
  normalized = normalized.replace(/\/+/g, '/');
  normalized = normalized.replace(/\/$/, '');
  return normalized.toLowerCase();
}

function decodeWorkspaceLocation(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function detectCurrentWorkspaceStorage(repoRoot) {
  const storageRoot = appDataDir ? path.join(appDataDir, 'Code', 'User', 'workspaceStorage') : '';
  if (!storageRoot || !fs.existsSync(storageRoot)) {
    return '';
  }

  const repoRootKey = normalizeComparablePath(repoRoot);
  const exactMatches = [];
  const repoWorkspaceMatches = [];

  for (const entry of fs.readdirSync(storageRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const workspaceJsonPath = path.join(storageRoot, entry.name, 'workspace.json');
    if (!fs.existsSync(workspaceJsonPath)) {
      continue;
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(workspaceJsonPath, 'utf8'));
      const folderPath = normalizeComparablePath(decodeWorkspaceLocation(parsed.folder));
      const workspacePath = normalizeComparablePath(decodeWorkspaceLocation(parsed.workspace));

      if (folderPath === repoRootKey) {
        exactMatches.push(path.join(storageRoot, entry.name));
        continue;
      }

      if (workspacePath && (workspacePath === repoRootKey || workspacePath.startsWith(`${repoRootKey}/`))) {
        repoWorkspaceMatches.push(path.join(storageRoot, entry.name));
      }
    } catch (error) {
      debug(`Failed to inspect workspace.json for ${entry.name}: ${error.message}`);
    }
  }

  return exactMatches[0] || repoWorkspaceMatches[0] || '';
}

function log(message) {
  const line = `[copilot-memory-sync] ${message}`;
  process.stdout.write(`${line}\n`);
  if (explicitLogFilePath) {
    try {
      fs.mkdirSync(path.dirname(explicitLogFilePath), { recursive: true });
      fs.appendFileSync(explicitLogFilePath, `${line}\n`, 'utf8');
    } catch {
    }
  }
}

function debug(message) {
  if (isVerbose) {
    log(message);
  }
}

function redactUrl(urlString) {
  try {
    const url = new URL(urlString);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return 'invalid-url';
  }
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeText(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

function deepClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function isArrayIndexKey(value) {
  return typeof value === 'number';
}

function ensureChildContainer(parent, key, nextKey) {
  if (parent[key] !== undefined && parent[key] !== null) {
    return parent[key];
  }

  parent[key] = isArrayIndexKey(nextKey) ? [] : {};
  return parent[key];
}

function setAtPath(root, keys, value) {
  if (!Array.isArray(keys) || keys.length === 0) {
    return;
  }

  let cursor = root;
  for (let index = 0; index < keys.length - 1; index += 1) {
    cursor = ensureChildContainer(cursor, keys[index], keys[index + 1]);
  }

  cursor[keys[keys.length - 1]] = value;
}

function appendAtPath(root, keys, values) {
  if (!Array.isArray(keys) || keys.length === 0) {
    return;
  }

  let cursor = root;
  for (let index = 0; index < keys.length - 1; index += 1) {
    cursor = ensureChildContainer(cursor, keys[index], keys[index + 1]);
  }

  const finalKey = keys[keys.length - 1];
  if (!Array.isArray(cursor[finalKey])) {
    cursor[finalKey] = [];
  }

  cursor[finalKey].push(...values);
}

function loadState() {
  try {
    const raw = fs.readFileSync(stateFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    if (!parsed.sent || typeof parsed.sent !== 'object') {
      parsed.sent = {};
    }

    return parsed;
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      log(`Failed to read state file: ${error.message}`);
    }

    return null;
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
  fs.writeFileSync(stateFilePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function findSessionFiles() {
  if (singleSessionFile) {
    return fs.existsSync(singleSessionFile) ? [singleSessionFile] : [];
  }

  if (!workspaceStorageRoot || !fs.existsSync(workspaceStorageRoot)) {
    return [];
  }

  const directChatSessionsDir = path.join(workspaceStorageRoot, 'chatSessions');
  if (fs.existsSync(directChatSessionsDir)) {
    return fs
      .readdirSync(directChatSessionsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'))
      .map((entry) => path.join(directChatSessionsDir, entry.name))
      .sort();
  }

  const files = [];
  const workspaceEntries = fs.readdirSync(workspaceStorageRoot, { withFileTypes: true });

  for (const entry of workspaceEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const chatSessionsDir = path.join(workspaceStorageRoot, entry.name, 'chatSessions');
    if (!fs.existsSync(chatSessionsDir)) {
      continue;
    }

    for (const child of fs.readdirSync(chatSessionsDir, { withFileTypes: true })) {
      if (child.isFile() && child.name.endsWith('.jsonl')) {
        files.push(path.join(chatSessionsDir, child.name));
      }
    }
  }

  files.sort();
  return files;
}

function parseSessionFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  let sessionState = null;

  for (const line of lines) {
    if (!line) {
      continue;
    }

    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }

    if (event.kind === 0 && event.v && typeof event.v === 'object') {
      sessionState = deepClone(event.v);
      continue;
    }

    if (!sessionState) {
      continue;
    }

    if (event.kind === 1 && Array.isArray(event.k)) {
      setAtPath(sessionState, event.k, deepClone(event.v));
      continue;
    }

    if (event.kind === 2 && Array.isArray(event.k)) {
      const values = Array.isArray(event.v) ? deepClone(event.v) : [deepClone(event.v)];
      appendAtPath(sessionState, event.k, values);
    }
  }

  return sessionState;
}

function requestCompleted(request) {
  return request && request.modelState && request.modelState.value === 1;
}

function collectVisibleAssistantTexts(responseItems, isComplete) {
  if (!Array.isArray(responseItems)) {
    return '';
  }

  const collected = [];
  for (const item of responseItems) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    if (typeof item.value !== 'string') {
      continue;
    }

    if (item.kind && item.kind !== 'markdownContent') {
      continue;
    }

    const text = normalizeText(item.value);
    if (!text) {
      continue;
    }

    collected.push(text);
  }

  if (!isComplete) {
    return '';
  }

  return normalizeText(collected.join('\n\n'));
}

function extractMessages(sessionState, filePath) {
  if (!sessionState || !Array.isArray(sessionState.requests)) {
    return [];
  }

  const sessionId = sessionState.sessionId || path.basename(filePath, '.jsonl');
  const workspaceId = path.basename(path.dirname(path.dirname(filePath)));
  const messages = [];

  sessionState.requests.forEach((request, requestIndex) => {
    if (!request || typeof request !== 'object') {
      return;
    }

    const requestId = request.requestId || `request-${requestIndex}`;
    const timestamp = request.timestamp || sessionState.creationDate || Date.now();
    const userText = normalizeText(request.message && request.message.text);

    if (userText) {
      const fingerprint = sha256(userText);
      messages.push({
        key: `${sessionId}:${requestId}:user`,
        fingerprint,
        sessionId,
        workspaceId,
        requestId,
        role: 'user',
        timestamp,
        ordinal: 0,
        text: userText,
      });
    }

    const assistantText = collectVisibleAssistantTexts(request.response, requestCompleted(request));
    if (assistantText) {
      const fingerprint = sha256(assistantText);
      messages.push({
        key: `${sessionId}:${requestId}:assistant`,
        fingerprint,
        sessionId,
        workspaceId,
        requestId,
        role: 'assistant',
        timestamp,
        ordinal: 0,
        text: assistantText,
      });
    }
  });

  return messages;
}

function postJson(urlString, body, headers) {
  const url = new URL(urlString);
  const transport = url.protocol === 'https:' ? https : http;
  const payload = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    let settled = false;
    const request = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...headers,
        },
      },
      (response) => {
        let responseText = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          responseText += chunk;
        });
        response.on('end', () => {
          if (settled) {
            return;
          }
          settled = true;
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(`HTTP ${response.statusCode}: ${responseText}`));
            return;
          }

          try {
            resolve(JSON.parse(responseText));
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${error.message}`));
          }
        });
      }
    );

    request.setTimeout(requestTimeoutMs, () => {
      if (settled) {
        return;
      }
      settled = true;
      request.destroy(new Error(`Request timed out after ${requestTimeoutMs}ms`));
    });

    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

function readLockInfo() {
  try {
    const raw = fs.readFileSync(lockFilePath, 'utf8').trim();
    if (!raw) {
      return null;
    }

    if (raw.startsWith('{')) {
      return JSON.parse(raw);
    }

    const pid = Number.parseInt(raw, 10);
    return Number.isFinite(pid) ? { pid, platform: 'unknown', legacy: true } : null;
  } catch {
    return null;
  }
}

function getLockAgeMs() {
  try {
    const stat = fs.statSync(lockFilePath);
    return Math.max(0, Date.now() - stat.mtimeMs);
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function isProcessRunning(pid) {
  if (!Number.isFinite(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !(error && error.code === 'ESRCH');
  }
}

function writeLockFile() {
  const payload = {
    pid: process.pid,
    platform: process.platform,
    hostname: os.hostname(),
    startedAt: new Date().toISOString(),
  };

  fs.writeFileSync(lockFilePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

function touchLockFile() {
  try {
    const now = new Date();
    fs.utimesSync(lockFilePath, now, now);
  } catch (error) {
    debug(`Failed to update lock heartbeat: ${error.message}`);
  }
}

function isLockStale(lockInfo) {
  const lockAgeMs = getLockAgeMs();
  if (lockAgeMs > lockStaleAfterMs) {
    return true;
  }

  if (!lockInfo || !Number.isFinite(lockInfo.pid)) {
    return false;
  }

  if (lockInfo.platform && lockInfo.platform !== process.platform && lockInfo.platform !== 'unknown') {
    return false;
  }

  return !isProcessRunning(lockInfo.pid);
}

function acquireLock() {
  try {
    fs.mkdirSync(path.dirname(lockFilePath), { recursive: true });
    fs.writeFileSync(lockFilePath, '', { encoding: 'utf8', flag: 'wx' });
    writeLockFile();
  } catch (error) {
    if (error && error.code === 'EEXIST') {
      const lockInfo = readLockInfo();
      if (isLockStale(lockInfo)) {
        fs.unlinkSync(lockFilePath);
        acquireLock();
        return;
      }

      const pid = lockInfo && Number.isFinite(lockInfo.pid) ? lockInfo.pid : 'unknown';
      const platform = lockInfo && lockInfo.platform ? lockInfo.platform : 'unknown';
      throw new Error(
        `Another sync process is already running (pid=${pid}, platform=${platform}). Remove ${lockFilePath} if it is stale.`
      );
    }

    throw error;
  }

  const heartbeatIntervalMs = Math.max(5000, Math.floor(lockStaleAfterMs / 3));
  lockHeartbeatTimer = setInterval(touchLockFile, heartbeatIntervalMs);
  if (typeof lockHeartbeatTimer.unref === 'function') {
    lockHeartbeatTimer.unref();
  }
}

function releaseLock() {
  if (lockHeartbeatTimer) {
    clearInterval(lockHeartbeatTimer);
    lockHeartbeatTimer = null;
  }

  try {
    fs.unlinkSync(lockFilePath);
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      debug(`Failed to remove lock file: ${error.message}`);
    }
  }
}

async function storeMemory(message) {
  const headers = {};
  if (process.env.MCP_API_KEY) {
    headers.Authorization = `Bearer ${process.env.MCP_API_KEY}`;
  }

  const tags = [
    'copilot-chat',
    `role:${message.role}`,
    `workspace:${message.workspaceId}`,
    `session:${message.sessionId}`,
    `request:${message.requestId}`,
  ];

  if (message.timestamp) {
    tags.push(`date:${new Date(message.timestamp).toISOString().slice(0, 10)}`);
  }

  const invokeStoreMemory = async (content) => {
    const result = await postJson(
      memoryMcpUrl,
      {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'store_memory',
          arguments: {
            content,
            tags,
            memory_type: 'note',
            client_hostname: os.hostname(),
          },
        },
      },
      headers
    );

    if (result.error) {
      throw new Error(result.error.message || 'Unknown MCP error');
    }

    const toolText =
      result &&
      result.result &&
      Array.isArray(result.result.content) &&
      result.result.content[0] &&
      typeof result.result.content[0].text === 'string'
        ? result.result.content[0].text
        : '';

    if (!toolText) {
      throw new Error('Memory MCP returned no tool result text.');
    }

    let toolPayload;
    try {
      toolPayload = JSON.parse(toolText);
    } catch (error) {
      throw new Error(`Memory MCP returned invalid tool payload: ${error.message}`);
    }

    return toolPayload;
  };

  let toolPayload = await invokeStoreMemory(message.text);
  if (
    !toolPayload.success &&
    /(duplicate content detected|unique constraint failed: memories\.content_hash)/i.test(String(toolPayload.message || ''))
  ) {
    const requestSuffix = message.requestId.slice(-8);
    const marker = message.role === 'assistant' ? ` ~a:${requestSuffix}` : ` ~u:${requestSuffix}`;
    toolPayload = await invokeStoreMemory(`${message.text}${marker}`);
  }

  if (!toolPayload.success) {
    throw new Error(toolPayload.message || 'Memory MCP store_memory reported failure.');
  }

  return toolPayload;
}

function bootstrapState(messages) {
  const sent = {};
  for (const message of messages) {
    sent[message.key] = message.fingerprint;
  }

  return {
    schemaVersion: stateSchemaVersion,
    createdAt: new Date().toISOString(),
    sent,
  };
}

function isAlreadyStoredFailure(message) {
  return /(duplicate content detected|unique constraint failed: memories\.content_hash|exact match)/i.test(
    String(message || '')
  );
}

async function syncOnce(state) {
  const files = findSessionFiles();
  if (files.length === 0) {
    debug('No chat session files found.');
    return { state, changed: false, syncedCount: 0, discoveredCount: 0 };
  }

  const allMessages = [];
  for (const filePath of files) {
    try {
      const sessionState = parseSessionFile(filePath);
      allMessages.push(...extractMessages(sessionState, filePath));
    } catch (error) {
      log(`Failed to parse ${filePath}: ${error.message}`);
    }
  }

  if (!state || state.schemaVersion !== stateSchemaVersion) {
    if (!shouldBackfill) {
      const initialState = bootstrapState(allMessages);
      saveState(initialState);
      const bootstrapReason = state ? 'State schema changed' : 'Bootstrap complete';
      log(`${bootstrapReason}. Baseline recorded for ${allMessages.length} message entries; waiting for new chat activity.`);
      return { state: initialState, changed: true, syncedCount: 0, discoveredCount: allMessages.length };
    }

    state = {
      schemaVersion: stateSchemaVersion,
      createdAt: new Date().toISOString(),
      sent: {},
    };
    saveState(state);
  }

  let syncedCount = 0;
  let changed = false;

  for (const message of allMessages) {
    if (state.sent[message.key] === message.fingerprint) {
      continue;
    }

    if (isDryRun) {
      log(`DRY RUN ${message.key}`);
      syncedCount += 1;
      continue;
    }

    try {
      await storeMemory(message);
      debug(`Stored ${message.key}`);
      state.sent[message.key] = message.fingerprint;
      syncedCount += 1;
      changed = true;
    } catch (error) {
      if (isAlreadyStoredFailure(error && error.message)) {
        debug(`Marked already-present ${message.key}`);
        state.sent[message.key] = message.fingerprint;
        changed = true;
        continue;
      }

      log(`Sync failed for ${message.key}: ${error.message}`);
    }
  }

  if (changed) {
    saveState(state);
  }

  return { state, changed, syncedCount, discoveredCount: allMessages.length };
}

async function main() {
  if (!memoryMcpUrl) {
    throw new Error('MEMORY_MCP_URL is required. Configure it explicitly before running the sync.');
  }

  if (!singleSessionFile && !workspaceStorageRoot) {
    throw new Error(
      'Could not resolve the current workspaceStorage entry. Set COPILOT_WORKSPACE_STORAGE or COPILOT_CHAT_SESSION_FILE explicitly.'
    );
  }

  if (!singleSessionFile && !process.env.COPILOT_WORKSPACE_STORAGE && !appDataDir) {
    throw new Error('Could not resolve VS Code AppData. Set COPILOT_WORKSPACE_STORAGE or COPILOT_CHAT_SESSION_FILE explicitly.');
  }

  acquireLock();
  process.on('exit', releaseLock);
  process.on('SIGINT', () => {
    releaseLock();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    releaseLock();
    process.exit(0);
  });

  log(`Watching Copilot chat sessions in ${workspaceStorageRoot}`);
  log(`Memory MCP endpoint: ${redactUrl(memoryMcpUrl)}`);
  if (isDryRun) {
    log('Dry-run mode enabled. No memory writes will be sent.');
  }

  let state = loadState();
  let running = false;

  const run = async () => {
    if (running) {
      return;
    }

    running = true;
    try {
      const result = await syncOnce(state);
      state = result.state;
      if (result.syncedCount > 0) {
        log(`Synced ${result.syncedCount} message entries.`);
      }
    } catch (error) {
      log(`Sync failed: ${error.message}`);
    } finally {
      running = false;
    }
  };

  await run();

  if (isOnce) {
    return;
  }

  setInterval(run, pollIntervalMs);
}

main().catch((error) => {
  log(error.message);
  process.exitCode = 1;
});