#!/usr/bin/env node

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
const targetRoot = path.join(repoRoot, ".tesseract-runtime", "backend");
const targetDist = path.join(targetRoot, "dist");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
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

ensureDir(targetRoot);
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
  sourceRoot: backendRoot,
  copiedFiles: ["dist", "package.json", "package-lock.json"].filter((name) =>
    fs.existsSync(path.join(backendRoot, name))
  ),
};

fs.writeFileSync(
  path.join(repoRoot, ".tesseract-runtime", "manifest.json"),
  JSON.stringify(manifest, null, 2)
);

console.log("[prepare:tesseract-runtime] Prepared backend runtime artifacts");
