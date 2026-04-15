#!/usr/bin/env node

/**
 * [INPUT]: 依赖 sibling frontend workspace 的 model_viewer 静态资源与 Flutter assets 目录。
 * [OUTPUT]: 对外提供 prepare:desktop-assets，把桌面数字孪生资源同步到 Angular public 目录并生成 asset-manifest。
 * [POS]: scripts 层的桌面资源同步器，被 dev/build/CI 链路复用。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(repoRoot, "..");
const frontendRoot = path.join(workspaceRoot, "frontend");
const manifestPath = path.join(
  repoRoot,
  "public",
  "tesseract-digital-twin",
  "asset-manifest.json"
);
const cliOptions = parseArgs(process.argv.slice(2));

const syncEntries = [
  {
    name: "viewer",
    source: path.join(frontendRoot, "web", "model_viewer"),
    target: path.join(repoRoot, "public", "tesseract-digital-twin"),
  },
  {
    name: "viewer-host-shell",
    source: path.join(repoRoot, "scripts", "templates", "tesseract-digital-twin-host"),
    target: path.join(repoRoot, "public", "tesseract-digital-twin"),
    overlay: true,
  },
  {
    name: "models-compat",
    source: path.join(frontendRoot, "assets", "models"),
    target: path.join(repoRoot, "public", "assets", "assets", "models"),
  },
  {
    name: "config-compat",
    source: path.join(frontendRoot, "assets", "config"),
    target: path.join(repoRoot, "public", "assets", "assets", "config"),
  },
  {
    name: "videos-compat",
    source: path.join(frontendRoot, "assets", "videos"),
    target: path.join(repoRoot, "public", "assets", "assets", "videos"),
  },
];

function parseArgs(argv) {
  return {
    check: argv.includes("--check"),
  };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeDirIfExists(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function listFiles(dirPath, prefix = "") {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const results = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const nextPrefix = prefix ? path.join(prefix, entry.name) : entry.name;
    const sourcePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFiles(sourcePath, nextPrefix));
      continue;
    }
    results.push(nextPrefix);
  }
  return results.sort();
}

function hashFile(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function buildEntrySummary(entry) {
  if (!fs.existsSync(entry.source)) {
    throw new Error(`Missing asset source: ${entry.source}`);
  }

  const files = listFiles(entry.source);
  const hash = crypto.createHash("sha256");
  for (const relativePath of files) {
    hash.update(relativePath);
    hash.update(hashFile(path.join(entry.source, relativePath)));
  }

  return {
    name: entry.name,
    source: entry.source,
    target: entry.target,
    fileCount: files.length,
    hash: hash.digest("hex"),
  };
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
    ensureDir(path.dirname(targetPath));
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function loadExistingManifest() {
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function manifestsMatch(current, existing) {
  if (!existing || !Array.isArray(existing.entries)) {
    return false;
  }

  const normalizeEntries = (entries) => entries.map(({ name, source, target, fileCount, hash }) => ({
    name,
    source,
    target,
    fileCount,
    hash,
  }));
  const currentEntries = normalizeEntries(current.entries);
  const existingEntries = normalizeEntries(existing.entries);
  return JSON.stringify(currentEntries) === JSON.stringify(existingEntries);
}

function buildManifest() {
  return {
    preparedAt: new Date().toISOString(),
    mode: "build-time-copy",
    entries: syncEntries.map(buildEntrySummary),
  };
}

function writeManifest(manifest) {
  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

function syncAssets(manifest) {
  const clearedTargets = new Set();
  for (const entry of syncEntries) {
    if (!entry.overlay && !clearedTargets.has(entry.target)) {
      removeDirIfExists(entry.target);
      clearedTargets.add(entry.target);
    }
    copyDir(entry.source, entry.target);
    if (entry.name === "viewer") {
      const viewerIndexPath = path.join(entry.target, "index.html");
      const viewerFramePath = path.join(entry.target, "viewer-frame.html");
      if (fs.existsSync(viewerIndexPath)) {
        fs.copyFileSync(viewerIndexPath, viewerFramePath);
      }
    }
  }
  writeManifest(manifest);
}

function main() {
  const manifest = buildManifest();

  if (cliOptions.check) {
    const existing = loadExistingManifest();
    if (!manifestsMatch(manifest, existing)) {
      console.error(
        "[prepare:desktop-assets] Asset manifest is stale. Run `npm run prepare:desktop-assets` in aily-blockly."
      );
      process.exit(1);
    }
    console.log("[prepare:desktop-assets] Asset manifest is up to date");
    return;
  }

  syncAssets(manifest);
  console.log(
    `[prepare:desktop-assets] Synced ${manifest.entries.reduce(
      (sum, entry) => sum + entry.fileCount,
      0
    )} files into public/tesseract-digital-twin and compatibility assets`
  );
}

main();
