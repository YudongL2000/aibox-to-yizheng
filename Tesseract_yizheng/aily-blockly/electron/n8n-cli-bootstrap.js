/**
 * [INPUT]: 依赖 Node Module 解析器、n8n CLI workspace 的 pnpm virtual store 布局，以及 Electron/Node 注入的 `N8N_CLI_ROOT` 与 `N8N_ENTRY`。
 * [OUTPUT]: 对外提供 embedded n8n 的 bootstrap 入口，修正 `@/` alias 与 pnpm 嵌套依赖解析，让 CLI 能在 Electron 进程中稳定启动。
 * [POS]: electron 层的 n8n 启动胶水，被 n8n-runtime.js 作为唯一 CLI 启动入口；它决定 bare-package 请求会不会误命中错误的 pnpm store 变体。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

const fs = require("fs");
const path = require("path");
const Module = require("module");

const cliRoot =
  process.env.N8N_CLI_ROOT ||
  path.resolve(__dirname, "..", "..", "n8n", "n8n-master", "packages", "cli");
const distRoot = path.join(cliRoot, "dist");
const workspaceRoot = fs.existsSync(path.join(cliRoot, "node_modules"))
  ? cliRoot
  : path.resolve(cliRoot, "..", "..");
const workspaceNodeModules = path.join(workspaceRoot, "node_modules");
const pnpmStoreRoot = path.join(workspaceNodeModules, ".pnpm");
const entry = process.env.N8N_ENTRY || path.join(cliRoot, "bin", "n8n");
const aliasPrefix = "@/";
const n8nPackageJson = path.join(cliRoot, "package.json");
const cliNodeModules = path.join(cliRoot, "node_modules");

const originalResolveFilename = Module._resolveFilename;
const fallbackPathsCache = new Map();

function isBarePackageRequest(request) {
  return Boolean(request) && !request.startsWith(".") && !path.isAbsolute(request);
}

function splitBarePackageRequest(request) {
  if (!isBarePackageRequest(request)) {
    return null;
  }

  if (request.startsWith("@")) {
    const [scope, name] = request.split("/");
    if (!scope || !name) {
      return null;
    }

    return `${scope}/${name}`;
  }

  return request.split("/")[0];
}

function normalizePathForPattern(filePath) {
  return String(filePath || "").replace(/\\/g, "/");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractStoreEntryName(parentFilename) {
  const normalized = normalizePathForPattern(parentFilename);
  const match = normalized.match(/\/\.pnpm\/([^/]+)\/node_modules\//);
  return match?.[1] || "";
}

function extractVersionFromStoreEntry(storeEntry, packageName) {
  if (!storeEntry || !packageName) {
    return "";
  }

  const encodedPackageName = packageName.replace("/", "+");
  const directPrefix = `${encodedPackageName}@`;
  if (storeEntry.startsWith(directPrefix)) {
    const directVersion = storeEntry.slice(directPrefix.length).split("_")[0];
    return directVersion || "";
  }

  const peerPattern = new RegExp(`(?:^|_)${escapeRegExp(encodedPackageName)}@([^_]+)`);
  const peerMatch = storeEntry.match(peerPattern);
  return peerMatch?.[1] || "";
}

function compareVersionParts(leftParts, rightParts) {
  const maxLength = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] ?? "";
    const rightPart = rightParts[index] ?? "";
    const leftNumber = Number(leftPart);
    const rightNumber = Number(rightPart);
    const bothNumeric = !Number.isNaN(leftNumber) && !Number.isNaN(rightNumber);

    if (bothNumeric && leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }

    if (!bothNumeric && leftPart !== rightPart) {
      return leftPart.localeCompare(rightPart);
    }
  }

  return 0;
}

function compareSemverish(leftVersion, rightVersion) {
  const leftParts = String(leftVersion || "").split(/[^0-9A-Za-z]+/).filter(Boolean);
  const rightParts = String(rightVersion || "").split(/[^0-9A-Za-z]+/).filter(Boolean);
  return compareVersionParts(leftParts, rightParts);
}

function sortStoreEntries(request, storeEntries, parent) {
  const packageName = splitBarePackageRequest(request);
  const parentStoreEntry = extractStoreEntryName(parent?.filename);
  const preferredVersion = extractVersionFromStoreEntry(parentStoreEntry, packageName);

  return [...storeEntries].sort((leftEntry, rightEntry) => {
    const leftVersion = extractVersionFromStoreEntry(leftEntry, packageName);
    const rightVersion = extractVersionFromStoreEntry(rightEntry, packageName);
    const leftMatchesPeer = preferredVersion && leftVersion === preferredVersion;
    const rightMatchesPeer = preferredVersion && rightVersion === preferredVersion;

    if (leftMatchesPeer !== rightMatchesPeer) {
      return leftMatchesPeer ? -1 : 1;
    }

    const versionOrder = compareSemverish(rightVersion, leftVersion);
    if (versionOrder !== 0) {
      return versionOrder;
    }

    return rightEntry.localeCompare(leftEntry);
  });
}

function buildFallbackCacheKey(request, parent) {
  return `${request}::${extractStoreEntryName(parent?.filename)}`;
}

function getFallbackResolvePaths(request, parent) {
  const cacheKey = buildFallbackCacheKey(request, parent);
  if (fallbackPathsCache.has(cacheKey)) {
    return fallbackPathsCache.get(cacheKey);
  }

  const packageName = splitBarePackageRequest(request);
  if (!packageName) {
    fallbackPathsCache.set(cacheKey, []);
    return [];
  }

  const resolvePaths = [];
  if (fs.existsSync(cliNodeModules)) {
    resolvePaths.push(cliNodeModules);
  }
  if (fs.existsSync(workspaceNodeModules)) {
    resolvePaths.push(workspaceNodeModules);
  }

  if (fs.existsSync(pnpmStoreRoot)) {
    const storePrefix = `${packageName.replace("/", "+")}@`;
    const storeEntries = sortStoreEntries(
      request,
      fs.readdirSync(pnpmStoreRoot).filter((entryName) => entryName.startsWith(storePrefix)),
      parent
    );

    for (const storeEntry of storeEntries) {
      const storeNodeModules = path.join(pnpmStoreRoot, storeEntry, "node_modules");
      if (fs.existsSync(storeNodeModules)) {
        resolvePaths.push(storeNodeModules);
      }
    }
  }

  const uniqueResolvePaths = [...new Set(resolvePaths)];
  fallbackPathsCache.set(cacheKey, uniqueResolvePaths);
  return uniqueResolvePaths;
}

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request === "n8n/package.json") {
    request = n8nPackageJson;
  }

  if (request === "@" || request.startsWith(aliasPrefix)) {
    request = path.join(distRoot, request.slice(aliasPrefix.length));
  }

  try {
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (error) {
    if (error?.code !== "MODULE_NOT_FOUND" || !isBarePackageRequest(request)) {
      throw error;
    }

    const fallbackPaths = getFallbackResolvePaths(request, parent);
    const inheritedPaths =
      options?.paths ||
      parent?.paths ||
      Module._nodeModulePaths(path.dirname(parent?.filename || cliRoot));
    for (const resolvePath of fallbackPaths) {
      try {
        return originalResolveFilename.call(this, request, parent, isMain, {
          ...options,
          paths: [resolvePath, ...inheritedPaths],
        });
      } catch (fallbackError) {
        if (fallbackError?.code !== "MODULE_NOT_FOUND") {
          throw fallbackError;
        }
      }
    }

    throw error;
  }
};

require(entry);
