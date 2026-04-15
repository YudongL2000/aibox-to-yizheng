/**
 * [INPUT]: 依赖 Node fs/net，与 logger 的结构化落盘能力，为 runtime 层提供文件、HTTP、端口与子进程日志工具。
 * [OUTPUT]: 对外提供 ensureDir/readJson/writeJson/findAvailablePort/waitForJson/postJson/attachProcessLogger/terminateChild。
 * [POS]: electron runtime 的公共基础设施，专门给 n8n-runtime 与 tesseract-runtime 复用。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

const fs = require("fs");
const net = require("net");
const { getStructuredLogger } = require("./logger");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDir(require("path").dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function isPortAvailable(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => resolve(false));
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(preferredPort, host = "127.0.0.1", attempts = 25) {
  for (let index = 0; index < attempts; index += 1) {
    const port = preferredPort + index;
    if (await isPortAvailable(port, host)) {
      return port;
    }
  }
  throw new Error(`No available port found near ${preferredPort}`);
}

async function waitForJson(url, options = {}) {
  const {
    timeoutMs = 30000,
    intervalMs = 500,
    validate = () => true,
  } = options;
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.includes("application/json")
          ? await response.json()
          : await response.text();
        if (validate(payload)) {
          return payload;
        }
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(intervalMs);
  }

  throw new Error(
    `Timed out waiting for ${url}${lastError ? `: ${lastError.message}` : ""}`
  );
}

async function postJson(url, payload, options = {}) {
  const { method = "POST", timeoutMs = 30000, headers = {} } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message =
        typeof data === "string"
          ? data
          : data?.error || data?.message || response.statusText;
      throw new Error(message || `HTTP ${response.status}`);
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function deriveModuleFromPrefix(logPrefix) {
  const match = String(logPrefix || "").match(/\[([^\]]+)\]/);
  if (!match) {
    return "runtime-process";
  }

  return String(match[1])
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .toLowerCase();
}

function normalizeProcessLoggerOptions(logPrefixOrOptions, sink) {
  if (typeof logPrefixOrOptions === "object" && logPrefixOrOptions !== null) {
    return {
      logPrefix: "[runtime]",
      sink: Array.isArray(logPrefixOrOptions.sink) ? logPrefixOrOptions.sink : [],
      module: logPrefixOrOptions.module || "runtime-process",
      source: logPrefixOrOptions.source || "child-process",
      stdoutLevel: logPrefixOrOptions.stdoutLevel || "info",
      stderrLevel: logPrefixOrOptions.stderrLevel || "warn",
      logger:
        logPrefixOrOptions.logger ||
        getStructuredLogger({
          module: logPrefixOrOptions.module || "runtime-process",
          source: logPrefixOrOptions.source || "child-process",
          processType: "main",
        }),
    };
  }

  const logPrefix = String(logPrefixOrOptions || "[runtime]");
  const moduleName = deriveModuleFromPrefix(logPrefix);
  return {
    logPrefix,
    sink: Array.isArray(sink) ? sink : [],
    module: moduleName,
    source: "child-process",
    stdoutLevel: "info",
    stderrLevel: "warn",
    logger: getStructuredLogger({
      module: moduleName,
      source: "child-process",
      processType: "main",
    }),
  };
}

function appendBufferedLine(sink, line) {
  if (!Array.isArray(sink)) {
    return;
  }

  sink.push(line);
  if (sink.length > 200) {
    sink.shift();
  }
}

function attachProcessLogger(child, logPrefixOrOptions, sink) {
  const options = normalizeProcessLoggerOptions(logPrefixOrOptions, sink);
  const appendLine = (streamName, chunk) => {
    const lines = String(chunk)
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean);

    for (const line of lines) {
      appendBufferedLine(options.sink, `[${streamName}] ${line}`);
      options.logger.write({
        level: streamName === "stderr" ? options.stderrLevel : options.stdoutLevel,
        module: options.module,
        source: `${options.source}:${streamName}`,
        message: line,
        processType: "main",
        mirrorToConsole: true,
      });
    }
  };

  if (child.stdout) {
    child.stdout.on("data", (chunk) => appendLine("stdout", chunk));
  }
  if (child.stderr) {
    child.stderr.on("data", (chunk) => appendLine("stderr", chunk));
  }
}

async function terminateChild(child) {
  if (!child || child.killed || !child.pid) {
    return;
  }

  if (process.platform === "win32") {
    const { spawn } = require("child_process");
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore",
        windowsHide: true,
      });
      killer.on("exit", () => resolve());
      killer.on("error", () => resolve());
    });
    return;
  }

  child.kill("SIGTERM");
  await sleep(300);
  if (!child.killed) {
    child.kill("SIGKILL");
  }
}

module.exports = {
  attachProcessLogger,
  ensureDir,
  findAvailablePort,
  postJson,
  readJson,
  sleep,
  terminateChild,
  waitForJson,
  writeJson,
};
