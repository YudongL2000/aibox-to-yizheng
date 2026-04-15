/**
 * [INPUT]: 依赖 Node fs/path/os/util，与 Electron ipcMain/shell，用于接收主进程、renderer 与 runtime 子进程的日志事件。
 * [OUTPUT]: 对外提供 initLogger/registerLoggerHandlers/getStructuredLogger/getLogArchiveStatus，统一产出 session 级总日志、模块日志与 JSONL 归档。
 * [POS]: electron 日志单一真相源；main/preload/runtime-utils/n8n-runtime/tesseract-runtime 都必须经过这里落盘。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const util = require("util");

const LOGGER_STATE = {
  initialized: false,
  sessionId: "",
  startedAt: "",
  rootDir: "",
  sessionDir: "",
  moduleDir: "",
  aggregateLogPath: "",
  aggregateJsonlPath: "",
  errorLogPath: "",
  manifestPath: "",
  overviewPath: "",
  latestSessionPath: "",
  consoleLevel: "warn",
  originalConsole: {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug:
      typeof console.debug === "function"
        ? console.debug.bind(console)
        : console.log.bind(console),
  },
};

const CONSOLE_LEVEL_MAP = {
  log: "info",
  info: "info",
  warn: "warn",
  error: "error",
  debug: "debug",
};

const LOG_LEVEL_PRIORITY = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

function pad(value, width = 2) {
  return String(value).padStart(width, "0");
}

function formatTimestamp(input = new Date()) {
  const date = input instanceof Date ? input : new Date(input);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

function formatSessionTimestamp(input = new Date()) {
  const date = input instanceof Date ? input : new Date(input);
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours()
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}-${pad(date.getMilliseconds(), 3)}`;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function appendLine(filePath, content) {
  fs.appendFileSync(filePath, `${content}\n`, "utf8");
}

function sanitizeSegment(value, fallback = "unknown") {
  const normalized = String(value || "")
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return normalized || fallback;
}

function serializeValue(value) {
  if (value === undefined) {
    return "";
  }

  if (value instanceof Error) {
    return value.stack || `${value.name}: ${value.message}`;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch (_error) {
    return util.inspect(value, { depth: 4, breakLength: 120 });
  }
}

function buildMessage(args) {
  return args
    .map((entry) => serializeValue(entry))
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normalizeLevel(level) {
  const candidate = String(level || "info").trim().toLowerCase();
  if (candidate === "warning") {
    return "warn";
  }
  if (["debug", "info", "warn", "error"].includes(candidate)) {
    return candidate;
  }
  return "info";
}

function normalizeConsoleLevel(level) {
  const candidate = String(level || "").trim().toLowerCase();
  if (candidate in LOG_LEVEL_PRIORITY) {
    return candidate;
  }
  return "warn";
}

function normalizeContext(context) {
  if (context === undefined) {
    return null;
  }
  if (context instanceof Error) {
    return {
      name: context.name,
      message: context.message,
      stack: context.stack,
    };
  }
  return context;
}

function buildContextSuffix(context) {
  if (context === null || context === undefined || context === "") {
    return "";
  }

  const serialized = serializeValue(context);
  return serialized ? ` | ${serialized}` : "";
}

function extractStackPath(stackLine) {
  const pathMatch =
    stackLine.match(/\((.*?):\d+:\d+\)$/) ||
    stackLine.match(/at (.*?):\d+:\d+$/);
  return pathMatch?.[1] || "";
}

function inferCallerOrigin(stack) {
  const stackLines = String(stack || "")
    .split("\n")
    .slice(1);

  for (const line of stackLines) {
    const filePath = extractStackPath(line);
    if (!filePath) {
      continue;
    }

    if (
      filePath.includes(`${path.sep}internal${path.sep}`) ||
      filePath.includes(`${path.sep}node:internal${path.sep}`) ||
      filePath.includes(`${path.sep}node_modules${path.sep}`) ||
      filePath.endsWith(`${path.sep}logger.js`)
    ) {
      continue;
    }

    return {
      module: sanitizeSegment(path.basename(filePath, path.extname(filePath)), "main"),
      source: path.relative(process.cwd(), filePath).replace(/\\/g, "/"),
    };
  }

  return {
    module: "main",
    source: "main",
  };
}

function normalizeRendererModule(message, fallback = "renderer") {
  const prefixMatch = String(message || "")
    .trim()
    .match(/^\[([^\]]+)\]/);

  if (!prefixMatch) {
    return fallback;
  }

  return sanitizeSegment(prefixMatch[1], fallback);
}

function buildHumanLine(record) {
  const levelLabel = record.level.toUpperCase();
  const sourceLabel = record.source ? ` [${record.source}]` : "";
  return `[${formatTimestamp(record.timestamp)}] [${levelLabel}] [${record.module}]${sourceLabel} ${record.message}${buildContextSuffix(
    record.context
  )}`.trim();
}

function getLogArchiveStatus() {
  if (!LOGGER_STATE.initialized) {
    return null;
  }

  return {
    sessionId: LOGGER_STATE.sessionId,
    startedAt: LOGGER_STATE.startedAt,
    rootDir: LOGGER_STATE.rootDir,
    sessionDir: LOGGER_STATE.sessionDir,
    moduleDir: LOGGER_STATE.moduleDir,
    aggregateLogPath: LOGGER_STATE.aggregateLogPath,
    aggregateJsonlPath: LOGGER_STATE.aggregateJsonlPath,
    errorLogPath: LOGGER_STATE.errorLogPath,
    manifestPath: LOGGER_STATE.manifestPath,
    overviewPath: LOGGER_STATE.overviewPath,
    latestSessionPath: LOGGER_STATE.latestSessionPath,
  };
}

function writeManifest() {
  const manifest = {
    sessionId: LOGGER_STATE.sessionId,
    startedAt: LOGGER_STATE.startedAt,
    pid: process.pid,
    platform: process.platform,
    hostname: os.hostname(),
    nodeVersion: process.version,
    paths: {
      rootDir: LOGGER_STATE.rootDir,
      sessionDir: LOGGER_STATE.sessionDir,
      moduleDir: LOGGER_STATE.moduleDir,
      aggregateLogPath: LOGGER_STATE.aggregateLogPath,
      aggregateJsonlPath: LOGGER_STATE.aggregateJsonlPath,
      errorLogPath: LOGGER_STATE.errorLogPath,
    },
  };

  fs.writeFileSync(LOGGER_STATE.manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  fs.writeFileSync(LOGGER_STATE.latestSessionPath, JSON.stringify(manifest, null, 2), "utf8");
  fs.writeFileSync(
    LOGGER_STATE.overviewPath,
    [
      `sessionId: ${LOGGER_STATE.sessionId}`,
      `startedAt: ${LOGGER_STATE.startedAt}`,
      `aggregate log: ${LOGGER_STATE.aggregateLogPath}`,
      `aggregate jsonl: ${LOGGER_STATE.aggregateJsonlPath}`,
      `error log: ${LOGGER_STATE.errorLogPath}`,
      `module logs: ${LOGGER_STATE.moduleDir}`,
      "",
      "说明:",
      "- timeline.log: 按时间汇总的可读日志",
      "- timeline.jsonl: 结构化记录，适合脚本检索",
      "- errors.log: 仅错误级别",
      "- modules/*.log: 按模块拆分的日志",
    ].join("\n"),
    "utf8"
  );
}

function mirrorToConsole(record) {
  const line = buildHumanLine(record);
  const method =
    record.level === "error"
      ? LOGGER_STATE.originalConsole.error
      : record.level === "warn"
        ? LOGGER_STATE.originalConsole.warn
        : record.level === "debug"
          ? LOGGER_STATE.originalConsole.debug
          : LOGGER_STATE.originalConsole.log;
  method(line);
}

function shouldMirrorToConsole(record, entry = {}) {
  if (entry.forceConsole === true) {
    return true;
  }

  if (entry.mirrorToConsole === false) {
    return false;
  }

  const configuredLevel = normalizeConsoleLevel(
    entry.consoleLevel || LOGGER_STATE.consoleLevel || process.env.AILY_LOG_CONSOLE_LEVEL
  );
  const recordPriority = LOG_LEVEL_PRIORITY[record.level] ?? LOG_LEVEL_PRIORITY.info;
  const thresholdPriority = LOG_LEVEL_PRIORITY[configuredLevel];
  return recordPriority >= thresholdPriority;
}

function recordLog(entry = {}) {
  if (!LOGGER_STATE.initialized) {
    return null;
  }

  const timestamp = entry.timestamp || new Date().toISOString();
  const moduleName = sanitizeSegment(entry.module, entry.processType === "renderer" ? "renderer" : "main");
  const sourceName = entry.source ? String(entry.source).trim() : "";
  const message = String(entry.message || "").trim() || "(empty log message)";
  const record = {
    timestamp,
    sessionId: LOGGER_STATE.sessionId,
    pid: process.pid,
    processType: entry.processType || "main",
    level: normalizeLevel(entry.level),
    module: moduleName,
    source: sourceName,
    message,
    context: normalizeContext(entry.context),
  };

  const humanLine = buildHumanLine(record);
  appendLine(LOGGER_STATE.aggregateLogPath, humanLine);
  appendLine(LOGGER_STATE.aggregateJsonlPath, JSON.stringify(record));
  appendLine(path.join(LOGGER_STATE.moduleDir, `${moduleName}.log`), humanLine);

  if (record.level === "error") {
    appendLine(LOGGER_STATE.errorLogPath, humanLine);
  }

  if (shouldMirrorToConsole(record, entry)) {
    mirrorToConsole(record);
  }

  return record;
}

function createConsoleProxy(methodName) {
  const level = CONSOLE_LEVEL_MAP[methodName] || "info";
  return (...args) => {
    const caller = inferCallerOrigin(new Error().stack);
    recordLog({
      level,
      module: caller.module,
      source: caller.source,
      message: buildMessage(args),
      processType: "main",
      mirrorToConsole: true,
    });
  };
}

function installConsoleCapture() {
  console.log = createConsoleProxy("log");
  console.info = createConsoleProxy("info");
  console.warn = createConsoleProxy("warn");
  console.error = createConsoleProxy("error");
  console.debug = createConsoleProxy("debug");
}

function initLogger(appDataPath) {
  if (LOGGER_STATE.initialized) {
    return LOGGER_STATE.aggregateLogPath;
  }

  const rootDir = path.join(appDataPath, "logs");
  const sessionId = `${formatSessionTimestamp()}-${process.pid}`;
  const sessionDir = path.join(rootDir, "sessions", sessionId);
  const moduleDir = path.join(sessionDir, "modules");

  ensureDir(rootDir);
  ensureDir(sessionDir);
  ensureDir(moduleDir);

  LOGGER_STATE.initialized = true;
  LOGGER_STATE.sessionId = sessionId;
  LOGGER_STATE.startedAt = new Date().toISOString();
  LOGGER_STATE.rootDir = rootDir;
  LOGGER_STATE.sessionDir = sessionDir;
  LOGGER_STATE.moduleDir = moduleDir;
  LOGGER_STATE.aggregateLogPath = path.join(sessionDir, "timeline.log");
  LOGGER_STATE.aggregateJsonlPath = path.join(sessionDir, "timeline.jsonl");
  LOGGER_STATE.errorLogPath = path.join(sessionDir, "errors.log");
  LOGGER_STATE.manifestPath = path.join(sessionDir, "manifest.json");
  LOGGER_STATE.overviewPath = path.join(sessionDir, "overview.txt");
  LOGGER_STATE.latestSessionPath = path.join(rootDir, "latest-session.json");
  LOGGER_STATE.consoleLevel = normalizeConsoleLevel(process.env.AILY_LOG_CONSOLE_LEVEL);

  writeManifest();
  installConsoleCapture();
  LOGGER_STATE.originalConsole.log(
    `[logger] archive=${LOGGER_STATE.sessionDir} consoleLevel=${LOGGER_STATE.consoleLevel}`
  );

  process.on("uncaughtException", (error) => {
    recordLog({
      level: "error",
      module: "main",
      source: "process:uncaughtException",
      message: error?.message || "Uncaught Exception",
      context: {
        stack: error?.stack || null,
      },
      forceConsole: true,
    });
  });

  process.on("unhandledRejection", (reason) => {
    recordLog({
      level: "error",
      module: "main",
      source: "process:unhandledRejection",
      message: "Unhandled Rejection",
      context: reason,
      forceConsole: true,
    });
  });

  recordLog({
    level: "info",
    module: "logger",
    source: "init",
    message: "Structured log archive initialized",
    context: getLogArchiveStatus(),
    mirrorToConsole: false,
  });

  return LOGGER_STATE.aggregateLogPath;
}

function buildRendererEntry(level, payload = {}) {
  const message =
    typeof payload === "string"
      ? payload
      : String(payload.message || "").trim();
  const fallbackModule =
    typeof payload === "object" && payload && payload.processType === "renderer"
      ? normalizeRendererModule(message, "renderer")
      : "renderer";

  return {
    level,
    module: payload.module || fallbackModule,
    source: payload.source || (payload.processType === "renderer" ? "renderer" : "ipc"),
    message,
    context: payload.context || null,
    processType: payload.processType || "renderer",
    mirrorToConsole: payload.mirrorToConsole !== false,
  };
}

function registerLoggerHandlers() {
  const { ipcMain, shell } = require("electron");

  ipcMain.on("log-write", (_event, payload) => {
    recordLog(buildRendererEntry(payload?.level || "info", payload));
  });

  ipcMain.handle("log-error", (_event, message, error, meta = {}) => {
    return recordLog(
      buildRendererEntry("error", {
        ...meta,
        message,
        context: error
          ? {
              ...meta?.context,
              error,
            }
          : meta?.context || null,
      })
    );
  });

  ipcMain.handle("log-warn", (_event, message, meta = {}) => {
    return recordLog(buildRendererEntry("warn", { ...meta, message }));
  });

  ipcMain.handle("log-info", (_event, message, meta = {}) => {
    return recordLog(buildRendererEntry("info", { ...meta, message }));
  });

  ipcMain.handle("log-get-status", () => getLogArchiveStatus());
  ipcMain.handle("log-open-directory", async () => {
    const archive = getLogArchiveStatus();
    if (!archive?.sessionDir) {
      return "";
    }
    await shell.openPath(archive.sessionDir);
    return archive.sessionDir;
  });
}

function getStructuredLogger(defaults = {}) {
  return {
    write(entry = {}) {
      return recordLog({
        ...defaults,
        ...entry,
      });
    },
    info(message, context, extra = {}) {
      return recordLog({
        ...defaults,
        ...extra,
        level: "info",
        message,
        context,
      });
    },
    warn(message, context, extra = {}) {
      return recordLog({
        ...defaults,
        ...extra,
        level: "warn",
        message,
        context,
      });
    },
    error(message, context, extra = {}) {
      return recordLog({
        ...defaults,
        ...extra,
        level: "error",
        message,
        context,
      });
    },
    debug(message, context, extra = {}) {
      return recordLog({
        ...defaults,
        ...extra,
        level: "debug",
        message,
        context,
      });
    },
  };
}

module.exports = {
  getLogArchiveStatus,
  getStructuredLogger,
  initLogger,
  recordLog,
  registerLoggerHandlers,
};
