const fs = require("fs");
const path = require("path");

function getDevServerBaseUrl() {
  return (process.env.AILY_BLOCKLY_DEV_SERVER_URL || "http://localhost:4200").replace(/\/+$/, "");
}

function buildDevServerUrl(targetPath = "") {
  const baseUrl = getDevServerBaseUrl();
  if (!targetPath) {
    return baseUrl;
  }

  if (targetPath.startsWith("#")) {
    return `${baseUrl}/${targetPath}`;
  }

  return `${baseUrl}/${targetPath.replace(/^\/+/, "")}`;
}

function resolveRendererIndexPath(baseDir = __dirname) {
  const candidates = [
    path.join(baseDir, "..", "renderer", "index.html"),
    path.join(baseDir, "..", "dist", "aily-blockly", "browser", "index.html"),
    path.join(baseDir, "renderer", "index.html"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Renderer entry not found. Checked: ${candidates.join(", ")}`
  );
}

module.exports = {
  buildDevServerUrl,
  getDevServerBaseUrl,
  resolveRendererIndexPath,
};
