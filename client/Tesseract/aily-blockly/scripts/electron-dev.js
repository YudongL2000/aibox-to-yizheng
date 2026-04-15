#!/usr/bin/env node

/**
 * [INPUT]: 依赖 Node.js 的 net/path/child_process、Electron 二进制入口、Angular dev server 端口探测与本地环境变量。
 * [OUTPUT]: 对外提供桌面端开发启动流程，顺序拉起 runtime 准备、Angular dev server 与 Electron 主进程。
 * [POS]: scripts/ 的本地开发编排器，负责把渲染端热更新与桌面壳层稳定拼接成可运行链路。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

const net = require("net");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const electronBinary = require("electron");

const repoRoot = path.resolve(__dirname, "..");
const devHost = "127.0.0.1";
const cliOptions = parseCliArgs(process.argv.slice(2));
const defaultDevPort = Number(process.env.AILY_BLOCKLY_DEV_PORT || 4200);
const defaultDevServerWaitMs = (() => {
  const configuredWaitMs = Number(process.env.AILY_BLOCKLY_DEV_SERVER_WAIT_MS);
  if (Number.isFinite(configuredWaitMs) && configuredWaitMs > 0) {
    return configuredWaitMs;
  }

  return 420000;
})();
const defaultElectronMirror = "https://npmmirror.com/mirrors/electron/";
const defaultElectronBuilderMirror =
  "https://npmmirror.com/mirrors/electron-builder-binaries/";

function parseCliArgs(argv) {
  const options = {
    reuseDevServer: false,
    devServerUrl: "",
    backendMode: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--reuse-dev-server") {
      options.reuseDevServer = true;
      continue;
    }

    if (arg === "--dev-server-url") {
      options.devServerUrl = String(argv[index + 1] || "").trim();
      index += 1;
      continue;
    }

    if (arg === "--backend-mode") {
      options.backendMode = String(argv[index + 1] || "").trim().toLowerCase();
      index += 1;
      continue;
    }
  }

  return options;
}

function isWindowsElectronBinary(binaryPath) {
  return process.platform === "linux" && /\.exe$/i.test(binaryPath);
}

function toWindowsPath(filePath) {
  const mountPathMatch = filePath.match(/^\/mnt\/([a-zA-Z])\/(.*)$/);
  if (!mountPathMatch) {
    return filePath;
  }

  const [, driveLetter, remainder] = mountPathMatch;
  const windowsRemainder = remainder.split("/").join("\\");
  return `${driveLetter.toUpperCase()}:\\${windowsRemainder}`;
}

function resolveElectronEntryPath() {
  const entryPath = path.join(repoRoot, "electron", "main.js");
  if (!isWindowsElectronBinary(electronBinary)) {
    return entryPath;
  }

  return toWindowsPath(entryPath);
}

function createChildEnv(overrides = {}) {
  return {
    ...process.env,
    ELECTRON_MIRROR:
      overrides.ELECTRON_MIRROR ||
      process.env.ELECTRON_MIRROR ||
      defaultElectronMirror,
    ELECTRON_BUILDER_BINARIES_MIRROR:
      overrides.ELECTRON_BUILDER_BINARIES_MIRROR ||
      process.env.ELECTRON_BUILDER_BINARIES_MIRROR ||
      defaultElectronBuilderMirror,
    ...overrides,
  };
}

function getNpmRunner() {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) {
    return {
      command: process.execPath,
      argsPrefix: [npmExecPath],
      label: `${process.execPath} ${npmExecPath}`,
    };
  }

  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  return {
    command,
    argsPrefix: [],
    label: command,
  };
}

function spawnNpm(args, options = {}) {
  const npmRunner = getNpmRunner();
  return spawn(npmRunner.command, [...npmRunner.argsPrefix, ...args], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
    env: createChildEnv(options.env),
    ...options,
  });
}

function createElectronEnv(devServerUrl) {
  const env = createChildEnv({
    DEV: "true",
    AILY_BLOCKLY_DEV_SERVER_URL: devServerUrl,
  });

  if (cliOptions.backendMode) {
    env.TESSERACT_BACKEND_MODE = cliOptions.backendMode;
  }

  if (env.ELECTRON_RUN_AS_NODE) {
    console.log(
      `[electron-dev] Removing ELECTRON_RUN_AS_NODE=${env.ELECTRON_RUN_AS_NODE} before spawning Electron`
    );
    delete env.ELECTRON_RUN_AS_NODE;
  }

  return env;
}

function isMuslRuntime() {
  if (process.platform !== "linux") {
    return false;
  }

  const report = process.report?.getReport?.();
  return !report?.header?.glibcVersionRuntime;
}

function getRollupNativePackageName() {
  switch (process.platform) {
    case "linux":
      if (process.arch === "x64") {
        return isMuslRuntime()
          ? "@rollup/rollup-linux-x64-musl"
          : "@rollup/rollup-linux-x64-gnu";
      }
      if (process.arch === "arm64") {
        return isMuslRuntime()
          ? "@rollup/rollup-linux-arm64-musl"
          : "@rollup/rollup-linux-arm64-gnu";
      }
      return null;
    case "darwin":
      if (process.arch === "arm64") {
        return "@rollup/rollup-darwin-arm64";
      }
      if (process.arch === "x64") {
        return "@rollup/rollup-darwin-x64";
      }
      return null;
    case "win32":
      if (process.arch === "arm64") {
        return "@rollup/rollup-win32-arm64-msvc";
      }
      if (process.arch === "ia32") {
        return "@rollup/rollup-win32-ia32-msvc";
      }
      if (process.arch === "x64") {
        return "@rollup/rollup-win32-x64-msvc";
      }
      return null;
    default:
      return null;
  }
}

function resolveRollupPackageJsonPath() {
  return path.join(
    repoRoot,
    "node_modules",
    "vite",
    "node_modules",
    "rollup",
    "package.json"
  );
}

function hasRollupNativePackage(packageName, resolutionPath) {
  if (!packageName) {
    return true;
  }

  try {
    require.resolve(packageName, { paths: [resolutionPath] });
    return true;
  } catch (_error) {
    return false;
  }
}

async function ensureRollupNativePackage() {
  const packageName = getRollupNativePackageName();
  if (!packageName) {
    console.log(
      `[electron-dev] No Rollup native package mapping for ${process.platform}/${process.arch}, skipping preflight`
    );
    return;
  }

  const rollupPackageJsonPath = resolveRollupPackageJsonPath();
  if (!fs.existsSync(rollupPackageJsonPath)) {
    throw new Error(
      "Missing vite/rollup installation. Run npm install in aily-blockly first."
    );
  }

  const rollupPackageJson = JSON.parse(fs.readFileSync(rollupPackageJsonPath, "utf8"));
  const rollupResolutionPath = path.dirname(rollupPackageJsonPath);

  if (hasRollupNativePackage(packageName, rollupResolutionPath)) {
    return;
  }

  console.log(
    `[electron-dev] Missing ${packageName}; installing ${packageName}@${rollupPackageJson.version} to work around npm optional dependency bug`
  );
  const install = spawnNpm([
    "install",
    "--no-save",
    "--include=optional",
    `${packageName}@${rollupPackageJson.version}`,
  ]);
  await waitForExit(install, `install ${packageName}`);

  if (!hasRollupNativePackage(packageName, rollupResolutionPath)) {
    throw new Error(
      `Failed to install ${packageName}@${rollupPackageJson.version}`
    );
  }
}

function spawnElectron(devServerUrl) {
  const electronEntryPath = resolveElectronEntryPath();
  console.log(`[electron-dev] Launching Electron with entry ${electronEntryPath}`);

  return spawn(electronBinary, [electronEntryPath, "--serve"], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: false,
    env: createElectronEnv(devServerUrl),
  });
}

function shouldReuseDevServer() {
  if (cliOptions.reuseDevServer) {
    return true;
  }

  return /^(1|true|yes)$/i.test(String(process.env.AILY_BLOCKLY_REUSE_DEV_SERVER || "").trim());
}

function resolveConfiguredDevServerUrl() {
  const explicitUrl = String(
    cliOptions.devServerUrl || process.env.AILY_BLOCKLY_DEV_SERVER_URL || ""
  ).trim();
  if (explicitUrl) {
    return explicitUrl.replace(/\/+$/, "");
  }

  return `http://${devHost}:${defaultDevPort}`;
}

function parseDevServerTarget(devServerUrl) {
  const parsed = new URL(devServerUrl);
  const port = Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80));
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid dev server port in ${devServerUrl}`);
  }

  return {
    host: parsed.hostname,
    port,
    url: `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/+$/, ""),
  };
}

function waitForExit(child, description) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${description} exited with ${code ?? "null"}${signal ? ` (${signal})` : ""}`
        )
      );
    });
  });
}

function isPortAvailable(port, host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve(false);
        return;
      }
      reject(error);
    });
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(startPort, host) {
  let port = startPort;
  while (port < startPort + 100) {
    if (await isPortAvailable(port, host)) {
      return port;
    }
    port += 1;
  }

  throw new Error(`Unable to find an available dev server port near ${startPort}`);
}

function waitForPort(port, host, timeoutMs = 60000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.connect({ port, host });
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for dev server on ${host}:${port}`));
          return;
        }
        setTimeout(tryConnect, 500);
      });
    };

    tryConnect();
  });
}

function formatExitStatus(code, signal) {
  if (signal) {
    return `${code ?? "null"} (${signal})`;
  }

  return `${code ?? "null"}`;
}

function waitForDevServer(child, port, host, timeoutMs = defaultDevServerWaitMs) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      child.off("error", onError);
      child.off("exit", onExit);
    };

    const settle = (handler) => (value) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      handler(value);
    };

    const onError = settle((error) => reject(error));
    const onExit = settle(({ code, signal }) =>
      reject(
        new Error(
          `Angular dev server exited before listening on ${host}:${port} with ${formatExitStatus(
            code,
            signal
          )}`
        )
      )
    );

    child.once("error", onError);
    child.once("exit", (code, signal) => onExit({ code, signal }));

    waitForPort(port, host, timeoutMs).then(settle(resolve)).catch(settle(reject));
  });
}

function terminateChild(child, signal = "SIGTERM") {
  if (!child || child.killed) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const fallbackTimer = setTimeout(() => {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    }, 5000);

    child.once("exit", () => {
      clearTimeout(fallbackTimer);
      resolve();
    });

    child.kill(signal);
  });
}

async function main() {
  await ensureRollupNativePackage();

  const prepare = spawnNpm(["run", "prepare:tesseract-runtime"]);
  await waitForExit(prepare, "prepare:tesseract-runtime");

  const reuseDevServer = shouldReuseDevServer();
  const configuredDevServerUrl = resolveConfiguredDevServerUrl();
  let ngProcess = null;
  let devServerUrl = configuredDevServerUrl;
  let electronProcess;
  let shuttingDown = false;

  const shutdown = async (exitCode = 0) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    await Promise.allSettled([
      terminateChild(electronProcess),
      terminateChild(ngProcess),
    ]);

    process.exit(exitCode);
  };

  process.on("SIGINT", () => void shutdown(130));
  process.on("SIGTERM", () => void shutdown(143));

  if (reuseDevServer) {
    const target = parseDevServerTarget(configuredDevServerUrl);
    devServerUrl = target.url;
    console.log(`[electron-dev] Reusing Angular dev server at ${devServerUrl}`);
    console.log(
      `[electron-dev] Waiting up to ${Math.ceil(
        defaultDevServerWaitMs / 1000
      )}s for reused dev server to become reachable`
    );

    try {
      await waitForPort(target.port, target.host, defaultDevServerWaitMs);
    } catch (error) {
      console.error(`[electron-dev] ${error.message}`);
      console.error(
        `[electron-dev] Start 'npm start -- --host ${target.host} --port ${target.port}' first, or run 'npm run electron' for one-shot startup.`
      );
      await shutdown(1);
      return;
    }
  } else {
    const devPort = await findAvailablePort(defaultDevPort, devHost);
    devServerUrl = `http://${devHost}:${devPort}`;

    console.log(`[electron-dev] Using Angular dev server at ${devServerUrl}`);
    console.log(
      `[electron-dev] Waiting up to ${Math.ceil(
        defaultDevServerWaitMs / 1000
      )}s for Angular dev server to become reachable`
    );

    ngProcess = spawnNpm(["start", "--", "--host", devHost, "--port", String(devPort)]);

    try {
      await waitForDevServer(ngProcess, devPort, devHost, defaultDevServerWaitMs);
    } catch (error) {
      console.error(`[electron-dev] ${error.message}`);
      await shutdown(1);
      return;
    }
  }

  electronProcess = spawnElectron(devServerUrl);

  if (ngProcess) {
    ngProcess.once("exit", async (code, signal) => {
      if (shuttingDown) {
        return;
      }

      console.error(
        `[electron-dev] Angular dev server exited early with ${code ?? "null"}${
          signal ? ` (${signal})` : ""
        }`
      );
      await shutdown(code || 1);
    });
  }

  electronProcess.once("exit", async (code, signal) => {
    if (shuttingDown) {
      return;
    }

    if (signal && signal !== "SIGTERM") {
      console.error(`[electron-dev] Electron exited with signal ${signal}`);
    }

    await shutdown(code || 0);
  });
}

main().catch((error) => {
  console.error(`[electron-dev] ${error.message}`);
  process.exit(1);
});
