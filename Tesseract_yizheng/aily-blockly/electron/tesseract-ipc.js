/**
 * [INPUT]: 依赖 Electron ipcMain、TesseractRuntime、N8nRuntime 与 runtime-utils 的 JSON 读取能力。
 * [OUTPUT]: 对外提供 registerTesseractHandlers/stopAllRuntimes，把 renderer IPC 映射到 backend Agent、dialogue-mode 与本地 n8n runtime，并在 workflow create 前先补齐 embedded n8n API access。
 * [POS]: electron 层的运行时路由器，位于 preload bridge 与真实 runtime 之间。
 * [PROTOCOL]: 变更时更新此头部，然后检查 AGENTS.md
 */

const { ipcMain } = require("electron");
const { TesseractRuntime } = require("./tesseract-runtime");
const { N8nRuntime } = require("./n8n-runtime");
const { readJson } = require("./runtime-utils");

const tesseractRuntime = new TesseractRuntime();
const n8nRuntime = new N8nRuntime();

function registerTesseractHandlers() {
  ipcMain.handle("tesseract-start", async (_event, payload = {}) => {
    return tesseractRuntime.start(payload);
  });

  ipcMain.handle("tesseract-stop", async () => {
    return tesseractRuntime.stop();
  });

  ipcMain.handle("tesseract-status", async () => {
    return tesseractRuntime.status();
  });

  ipcMain.handle("tesseract-chat", async (_event, payload = {}) => {
    return tesseractRuntime.chat(payload);
  });

  ipcMain.handle("tesseract-validate-hardware", async (_event, payload = {}) => {
    return tesseractRuntime.validateHardware(payload);
  });

  ipcMain.handle("tesseract-hardware-status", async (_event, payload = {}) => {
    return tesseractRuntime.getHardwareStatus(payload);
  });

  ipcMain.handle("tesseract-hardware-upload", async (_event, payload = {}) => {
    return tesseractRuntime.uploadHardwareWorkflow(payload);
  });

  ipcMain.handle("tesseract-hardware-stop", async (_event, payload = {}) => {
    return tesseractRuntime.stopHardwareWorkflow(payload);
  });

  ipcMain.handle("tesseract-hardware-command", async (_event, payload = {}) => {
    return tesseractRuntime.sendHardwareCommand(payload);
  });

  ipcMain.handle("tesseract-hardware-microphone-open", async (_event, payload = {}) => {
    return tesseractRuntime.openMicrophone(payload);
  });

  ipcMain.handle("tesseract-hardware-microphone-close", async (_event, payload = {}) => {
    return tesseractRuntime.closeMicrophone(payload);
  });

  ipcMain.handle("tesseract-hardware-speaker-play", async (_event, payload = {}) => {
    return tesseractRuntime.playSpeaker(payload);
  });

  ipcMain.handle("tesseract-start-deploy", async (_event, payload = {}) => {
    return tesseractRuntime.startDeploy(payload);
  });

  ipcMain.handle("tesseract-confirm-workflow", async (_event, payload = {}) => {
    return tesseractRuntime.confirmWorkflow(payload);
  });

  ipcMain.handle("tesseract-create-workflow", async (_event, payload = {}) => {
    await n8nRuntime.start(payload);
    return tesseractRuntime.createWorkflow(payload);
  });

  ipcMain.handle("tesseract-start-config", async (_event, payload = {}) => {
    return tesseractRuntime.startConfig(payload);
  });

  ipcMain.handle("tesseract-confirm-node", async (_event, payload = {}) => {
    return tesseractRuntime.confirmNode(payload);
  });

  ipcMain.handle("tesseract-upload-face-image", async (_event, payload = {}) => {
    return tesseractRuntime.uploadFaceImage(payload);
  });

  ipcMain.handle("tesseract-list-skills", async (_event, payload = {}) => {
    return tesseractRuntime.listSkills(payload);
  });

  ipcMain.handle("tesseract-save-skill", async (_event, payload = {}) => {
    return tesseractRuntime.saveSkill(payload);
  });

  ipcMain.handle("tesseract-delete-skill", async (_event, payload = {}) => {
    return tesseractRuntime.deleteSkill(payload);
  });

  ipcMain.handle("tesseract-get-config-state", async (_event, payload = {}) => {
    return tesseractRuntime.getConfigState(payload);
  });

  ipcMain.handle("tesseract-deploy-workflow", async (_event, payload = {}) => {
    await n8nRuntime.start(payload);
    const snapshot = payload.projectPath
      ? readJson(n8nRuntime.getWorkflowSnapshotPath(payload.projectPath), {})
      : {};
    const workflow = payload.workflow || snapshot?.workflow;
    return n8nRuntime.importWorkflow({
      ...payload,
      workflow,
    });
  });

  ipcMain.handle("n8n-start", async (_event, payload = {}) => {
    return n8nRuntime.start(payload);
  });

  ipcMain.handle("n8n-stop", async () => {
    return n8nRuntime.stop();
  });

  ipcMain.handle("n8n-status", async () => {
    return n8nRuntime.status();
  });

  ipcMain.handle("n8n-get-editor-url", async (_event, payload = {}) => {
    await n8nRuntime.start(payload);
    return {
      url: n8nRuntime.getEditorUrl(payload),
    };
  });

  ipcMain.handle("n8n-open-workflow", async (_event, payload = {}) => {
    return n8nRuntime.openWorkflow(payload);
  });

  ipcMain.handle("n8n-persist-workflow-snapshot", async (_event, payload = {}) => {
    return n8nRuntime.persistWorkflowSnapshot(payload);
  });

  ipcMain.handle("n8n-get-embedded-credentials", async () => {
    return n8nRuntime.getEmbeddedCredentials();
  });
}

async function stopAllRuntimes() {
  await Promise.allSettled([tesseractRuntime.stop(), n8nRuntime.stop()]);
}

module.exports = {
  registerTesseractHandlers,
  stopAllRuntimes,
};
