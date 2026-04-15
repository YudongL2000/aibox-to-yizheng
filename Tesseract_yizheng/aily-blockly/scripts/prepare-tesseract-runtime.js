#!/usr/bin/env node
/**
 * [INPUT]: 依赖 sibling backend/dist、n8n deploy 产物与 `.tesseract-runtime/n8n/api-access.json` 共享凭据文件。
 * [OUTPUT]: 准备桌面端 backend/n8n runtime；n8n deploy 先落临时目录，再在替换正式目录时保留共享 API access 文件。
 * [POS]: scripts 层的本地 runtime 资产准备器，被 Electron 开发入口与本地启动脚本复用。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const backendRoot = path.resolve(repoRoot, "..", "backend");
const backendDist = path.join(backendRoot, "dist");
const backendNodeModules = path.join(backendRoot, "node_modules");
const backendPackageLock = path.join(backendRoot, "package-lock.json");
const n8nRoot = path.resolve(repoRoot, "..", "n8n", "n8n-master");
const n8nNodeModules = path.join(n8nRoot, "node_modules");
const n8nPnpmStore = path.join(n8nNodeModules, ".pnpm");
const n8nCliDist = path.join(n8nRoot, "packages", "cli", "dist");
const pnpmLockPath = path.join(n8nRoot, "pnpm-lock.yaml");
const runtimeRoot = path.join(repoRoot, ".tesseract-runtime");
const targetRoot = path.join(runtimeRoot, "backend");
const targetDist = path.join(targetRoot, "dist");
const n8nTargetRoot = path.join(runtimeRoot, "n8n");
const EMBEDDED_API_ACCESS_FILE = "api-access.json";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function createTempDir(prefix) {
  ensureDir(path.dirname(prefix));
  return fs.mkdtempSync(prefix);
}

function captureSharedN8nRuntimeState() {
  const apiAccessPath = path.join(n8nTargetRoot, EMBEDDED_API_ACCESS_FILE);
  return {
    apiAccessJson: fs.existsSync(apiAccessPath) ? fs.readFileSync(apiAccessPath) : null,
  };
}

function restoreSharedN8nRuntimeState(targetDir, runtimeState) {
  if (!runtimeState?.apiAccessJson) {
    return [];
  }

  const restoredFiles = [];
  const apiAccessPath = path.join(targetDir, EMBEDDED_API_ACCESS_FILE);
  fs.writeFileSync(apiAccessPath, runtimeState.apiAccessJson);
  restoredFiles.push(EMBEDDED_API_ACCESS_FILE);
  return restoredFiles;
}

function copyDir(source, target) {
  ensureDir(target);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
      continue;
    }
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function encodePnpmPackageName(packageName) {
  return String(packageName || "").replace(/\//g, "+");
}

function resolveDeployedPackageStorePath(deployedRoot, packageName) {
  const storeRoot = path.join(deployedRoot, "node_modules", ".pnpm");
  if (!fs.existsSync(storeRoot)) {
    return "";
  }

  const encodedName = encodePnpmPackageName(packageName);
  const storeEntries = fs
    .readdirSync(storeRoot)
    .filter((entry) => entry.startsWith(`${encodedName}@`))
    .sort((left, right) => right.length - left.length || left.localeCompare(right));

  for (const entry of storeEntries) {
    const candidate = path.join(
      storeRoot,
      entry,
      "node_modules",
      ...String(packageName).split("/")
    );
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "";
}

function ensureDeployedPackageLink(deployedRoot, packageName) {
  const sourcePath = resolveDeployedPackageStorePath(deployedRoot, packageName);
  if (!sourcePath) {
    return false;
  }

  const targetPath = path.join(
    deployedRoot,
    "node_modules",
    ...String(packageName).split("/")
  );
  ensureDir(path.dirname(targetPath));

  if (fs.existsSync(targetPath) || fs.lstatSync(path.dirname(targetPath)).isDirectory()) {
    try {
      const stats = fs.lstatSync(targetPath);
      if (stats.isSymbolicLink() || stats.isFile() || stats.isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      }
    } catch (_error) {
      // no-op: targetPath does not exist yet
    }
  }

  const linkTarget = path.relative(path.dirname(targetPath), sourcePath) || ".";
  fs.symlinkSync(linkTarget, targetPath, "dir");
  return true;
}

function materializeDeployedPackageLinks(deployedRoot) {
  const packageJsonPath = path.join(deployedRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return { linked: 0, missing: [] };
  }

  const packageJson = readJson(packageJsonPath);
  const dependencyNames = [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.optionalDependencies || {}),
  ].sort();
  const missing = [];
  let linked = 0;

  for (const dependencyName of dependencyNames) {
    if (ensureDeployedPackageLink(deployedRoot, dependencyName)) {
      linked += 1;
      continue;
    }
    missing.push(dependencyName);
  }

  return { linked, missing };
}

function runBackendCommand(args, description) {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath || (process.platform === "win32" ? "npm.cmd" : "npm");
  const commandArgs = npmExecPath ? [npmExecPath, ...args] : args;
  console.log(`[prepare:tesseract-runtime] ${description}`);

  const result = spawnSync(npmExecPath ? process.execPath : command, commandArgs, {
    cwd: backendRoot,
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    const joinedArgs = commandArgs.join(" ");
    const invokedCommand = npmExecPath ? `${process.execPath} ${joinedArgs}` : `${command} ${joinedArgs}`;
    console.error(
      `[prepare:tesseract-runtime] Failed while running \`${invokedCommand}\` in ${backendRoot}`
    );
    if (result.error) {
      console.error(`[prepare:tesseract-runtime] ${result.error.message}`);
    }
    process.exit(result.status || 1);
  }
}

function resolvePnpmRunner() {
  const nodeDir = path.dirname(process.execPath);
  const pnpmJs = path.join(nodeDir, "node_modules", "corepack", "dist", "pnpm.js");
  if (fs.existsSync(pnpmJs)) {
    return {
      command: process.execPath,
      argsPrefix: [pnpmJs],
      label: `${process.execPath} ${pnpmJs}`,
    };
  }

  return {
    command: process.platform === "win32" ? "pnpm.CMD" : "pnpm",
    argsPrefix: [],
    label: process.platform === "win32" ? "pnpm.CMD" : "pnpm",
  };
}

function runN8nCommand(args, description) {
  const pnpmRunner = resolvePnpmRunner();
  const commandArgs = [...pnpmRunner.argsPrefix, ...args];
  console.log(`[prepare:tesseract-runtime] ${description}`);

  const result = spawnSync(pnpmRunner.command, commandArgs, {
    cwd: n8nRoot,
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    console.error(
      `[prepare:tesseract-runtime] Failed while running \`${pnpmRunner.label} ${args.join(" ")}\` in ${n8nRoot}`
    );
    if (result.error) {
      console.error(`[prepare:tesseract-runtime] ${result.error.message}`);
    }
    process.exit(result.status || 1);
  }
}

function hasN8nPackage(packagePrefix) {
  if (!fs.existsSync(n8nPnpmStore)) {
    return false;
  }

  return fs.readdirSync(n8nPnpmStore).some((entry) => entry.startsWith(`${packagePrefix}@`));
}

if (!fs.existsSync(backendRoot)) {
  console.error(
    "[prepare:tesseract-runtime] Missing sibling backend workspace at ../backend"
  );
  process.exit(1);
}

if (!fs.existsSync(backendNodeModules)) {
  runBackendCommand(
    fs.existsSync(backendPackageLock) ? ["ci"] : ["install"],
    "Installing backend dependencies because ../backend/node_modules is missing"
  );
}

if (!fs.existsSync(backendDist)) {
  runBackendCommand(
    ["run", "build"],
    "Building backend runtime artifacts because ../backend/dist is missing"
  );
}

if (!fs.existsSync(backendDist)) {
  console.error("[prepare:tesseract-runtime] Backend build finished but ../backend/dist is still missing.");
  process.exit(1);
}

if (!fs.existsSync(n8nRoot)) {
  console.error("[prepare:tesseract-runtime] Missing sibling n8n workspace at ../n8n/n8n-master");
  process.exit(1);
}

if (!fs.existsSync(n8nNodeModules) || !hasN8nPackage("delayed-stream")) {
  runN8nCommand(
    fs.existsSync(pnpmLockPath) ? ["install", "--frozen-lockfile"] : ["install"],
    "Installing n8n workspace dependencies because required packages are missing"
  );
}

if (!fs.existsSync(n8nCliDist)) {
  runN8nCommand(
    ["build:n8n"],
    "Building n8n CLI runtime because packages/cli/dist is missing"
  );
}

if (!fs.existsSync(n8nCliDist)) {
  console.error("[prepare:tesseract-runtime] n8n build finished but packages/cli/dist is still missing.");
  process.exit(1);
}

removeDir(targetRoot);
ensureDir(targetRoot);
ensureDir(runtimeRoot);
copyDir(backendDist, targetDist);

for (const fileName of ["package.json", "package-lock.json"]) {
  const source = path.join(backendRoot, fileName);
  const target = path.join(targetRoot, fileName);
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
  }
}

const manifest = {
  preparedAt: new Date().toISOString(),
  backend: {
    sourceRoot: backendRoot,
    copiedFiles: ["dist", "package.json", "package-lock.json"].filter((name) =>
      fs.existsSync(path.join(backendRoot, name))
    ),
  },
};

const preservedN8nRuntimeState = captureSharedN8nRuntimeState();
const n8nDeployTempRoot = createTempDir(path.join(runtimeRoot, "n8n-deploy-"));
runN8nCommand(
  ["--filter", "n8n", "deploy", "--legacy", "--prod", n8nDeployTempRoot],
  `Deploying n8n runtime into temporary root ${path.relative(repoRoot, n8nDeployTempRoot)}`
);

const deployedN8nEntry = path.join(n8nDeployTempRoot, "bin", "n8n");
const deployedN8nDist = path.join(n8nDeployTempRoot, "dist");
if (!fs.existsSync(deployedN8nEntry) || !fs.existsSync(deployedN8nDist)) {
  removeDir(n8nDeployTempRoot);
  console.error(
    "[prepare:tesseract-runtime] n8n deploy finished but temporary runtime is incomplete."
  );
  process.exit(1);
}

const deployedLinkResult = materializeDeployedPackageLinks(n8nDeployTempRoot);
if (deployedLinkResult.missing.length > 0) {
  console.warn(
    `[prepare:tesseract-runtime] Missing deployed top-level n8n links for ${deployedLinkResult.missing.join(", ")}`
  );
}

const restoredSharedFiles = restoreSharedN8nRuntimeState(
  n8nDeployTempRoot,
  preservedN8nRuntimeState
);

removeDir(n8nTargetRoot);
fs.renameSync(n8nDeployTempRoot, n8nTargetRoot);

manifest.n8n = {
  sourceRoot: n8nRoot,
  deployedRoot: n8nTargetRoot,
  copiedFiles: ["bin/n8n", "dist"],
  linkedDependencies: deployedLinkResult.linked,
  missingDependencies: deployedLinkResult.missing,
  preservedFiles: restoredSharedFiles,
};

fs.writeFileSync(
  path.join(runtimeRoot, "manifest.json"),
  JSON.stringify(manifest, null, 2)
);

console.log("[prepare:tesseract-runtime] Prepared backend and n8n runtime artifacts");
