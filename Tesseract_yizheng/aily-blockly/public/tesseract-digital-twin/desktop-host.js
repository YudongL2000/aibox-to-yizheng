const VIEWER_SOURCE = "digital-twin-viewer";
const VIEWER_HOST_SOURCE = "flutter-digital-twin";
const VIEWER_CHANNEL = "desktop-digital-twin-viewer";

const viewerFrame = document.getElementById("viewer-frame");
const overlay = document.getElementById("overlay");
const statusTitle = document.getElementById("status-title");
const statusCopy = document.getElementById("status-copy");

const state = {
  revision: null,
  currentEnvelope: null,
  previewEnvelope: null,
  assetSignature: "",
  transformSignature: "",
  modelIds: [],
  viewerReady: false,
};

function normalizePayload(raw) {
  if (typeof raw === "string" && raw.trim()) {
    try {
      return normalizePayload(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw;
  }

  return null;
}

function extractEnvelope(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  if (payload.envelope && typeof payload.envelope === "object") {
    return payload.envelope;
  }
  if (payload.sceneEnvelope && typeof payload.sceneEnvelope === "object") {
    return payload.sceneEnvelope;
  }
  return payload;
}

function extractScene(envelope) {
  if (envelope && typeof envelope === "object" && envelope.scene && typeof envelope.scene === "object") {
    return envelope.scene;
  }
  return envelope;
}

function asVector(raw, fallback = [0, 0, 0]) {
  if (Array.isArray(raw)) {
    return [
      Number(raw[0] ?? fallback[0]) || fallback[0],
      Number(raw[1] ?? fallback[1]) || fallback[1],
      Number(raw[2] ?? fallback[2]) || fallback[2],
    ];
  }

  if (raw && typeof raw === "object") {
    return [
      Number(raw.x ?? fallback[0]) || fallback[0],
      Number(raw.y ?? fallback[1]) || fallback[1],
      Number(raw.z ?? fallback[2]) || fallback[2],
    ];
  }

  return [...fallback];
}

function toVectorQuery(raw, fallback = [0, 0, 0]) {
  const [x, y, z] = asVector(raw, fallback);
  return `${x},${y},${z}`;
}

function getSceneModels(envelope) {
  const scene = extractScene(envelope);
  const models = Array.isArray(scene?.models) ? scene.models : [];
  return models
    .filter((item) => item && typeof item === "object")
    .map((item, index) => ({
      id: String(item.id ?? `model_${index + 1}`),
      url: String(item.url ?? "").trim(),
      position: asVector(item.position ?? item.pos),
      rotation: asVector(item.rotation ?? item.rot),
      scale: asVector(item.scale ?? item.scl, [1, 1, 1]),
    }))
    .filter((item) => item.url);
}

function buildAssetSignature(models) {
  return JSON.stringify(
    models.map((item) => ({
      id: item.id,
      url: item.url,
    }))
  );
}

function buildTransformSignature(models) {
  return JSON.stringify(
    models.map((item) => ({
      id: item.id,
      position: item.position,
      rotation: item.rotation,
      scale: item.scale,
    }))
  );
}

function buildViewerUrl(models) {
  const url = new URL("./viewer-frame.html", window.location.href);
  url.searchParams.set("channel", VIEWER_CHANNEL);
  url.searchParams.set("layout", "center");
  url.searchParams.set("spacing", "1.5");
  url.searchParams.set("drag", "false");
  url.searchParams.set("t", String(Date.now()));

  const positionRows = [];
  const rotationRows = [];
  const scaleRows = [];

  for (const model of models) {
    url.searchParams.append("file", model.url);
    url.searchParams.append("id", model.id);
    positionRows.push(toVectorQuery(model.position));
    rotationRows.push(toVectorQuery(model.rotation));
    scaleRows.push(toVectorQuery(model.scale, [1, 1, 1]));
  }

  url.searchParams.set("pos", positionRows.join("|"));
  url.searchParams.set("rot", rotationRows.join("|"));
  url.searchParams.set("scl", scaleRows.join("|"));
  return url.toString();
}

function postToParent(payload) {
  if (!window.parent || window.parent === window) {
    return;
  }
  window.parent.postMessage(JSON.stringify(payload), "*");
}

function postToViewer(type, payload = {}) {
  const target = viewerFrame.contentWindow;
  if (!target) {
    return;
  }
  target.postMessage(
    JSON.stringify({
      source: VIEWER_HOST_SOURCE,
      version: 1,
      channel: VIEWER_CHANNEL,
      type,
      ...payload,
    }),
    "*"
  );
}

function setStatus(title, message, tone = "muted") {
  statusTitle.textContent = title;
  statusCopy.textContent = message;
  statusCopy.classList.toggle("error", tone === "error");
}

function showOverlay(title, message, tone = "muted") {
  setStatus(title, message, tone);
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function notifyConsumed(stage) {
  postToParent({
    type: "tesseract-digital-twin-consumed",
    stage,
    revision: state.revision,
    modelCount: state.modelIds.length,
    modelIds: state.modelIds,
  });
}

function notifyViewerReady() {
  postToParent({
    type: "tesseract-digital-twin-viewer-ready",
    stage: "viewer-ready",
    revision: state.revision,
    modelCount: state.modelIds.length,
    modelIds: state.modelIds,
  });
  notifyConsumed("viewer-ready");
}

function applyTransforms(models) {
  postToViewer("setTransforms", {
    models: models.map((item, index) => ({
      index,
      modelId: item.id,
      position: {
        x: item.position[0],
        y: item.position[1],
        z: item.position[2],
      },
      rotation: {
        x: item.rotation[0],
        y: item.rotation[1],
        z: item.rotation[2],
      },
      scale: {
        x: item.scale[0],
        y: item.scale[1],
        z: item.scale[2],
      },
    })),
  });
}

function applySceneEnvelope(rawEnvelope) {
  const envelope = extractEnvelope(rawEnvelope);
  if (!envelope) {
    return;
  }

  const models = getSceneModels(envelope);
  state.currentEnvelope = envelope;
  state.revision = envelope.revision ?? rawEnvelope?.revision ?? null;
  state.modelIds = models.map((item) => item.id);

  const assetSignature = buildAssetSignature(models);
  const transformSignature = buildTransformSignature(models);

  if (models.length === 0) {
    state.assetSignature = "";
    state.transformSignature = "";
    state.viewerReady = false;
    viewerFrame.removeAttribute("src");
    showOverlay("Digital Twin", "当前场景没有可渲染的 3D 模型。");
    notifyConsumed("scene-applied");
    return;
  }

  if (assetSignature !== state.assetSignature) {
    state.assetSignature = assetSignature;
    state.transformSignature = transformSignature;
    state.viewerReady = false;
    showOverlay("Digital Twin", "正在同步 3D 资产与场景布局…");
    viewerFrame.src = buildViewerUrl(models);
    notifyConsumed("scene-applied");
    return;
  }

  if (transformSignature !== state.transformSignature) {
    state.transformSignature = transformSignature;
    applyTransforms(models);
    notifyConsumed("scene-applied");
  }
}

window.addEventListener("message", (event) => {
  if (event.source === viewerFrame.contentWindow) {
    const payload = normalizePayload(event.data);
    if (!payload || payload.source !== VIEWER_SOURCE || payload.channel !== VIEWER_CHANNEL) {
      return;
    }

    switch (payload.type) {
      case "viewerReady":
        state.viewerReady = true;
        hideOverlay();
        notifyViewerReady();
        break;
      case "viewerError":
        showOverlay("Digital Twin", payload.message || "3D viewer failed", "error");
        postToParent({
          type: "tesseract-digital-twin-consumed",
          stage: "viewer-error",
          revision: state.revision,
          modelCount: state.modelIds.length,
          modelIds: state.modelIds,
          message: payload.message || "3D viewer failed",
        });
        break;
      case "selectionChanged":
        postToParent({
          type: "tesseract-digital-twin-model-click",
          revision: state.revision,
          modelId: payload.modelId ?? null,
        });
        break;
      default:
        break;
    }
    return;
  }

  const payload = normalizePayload(event.data);
  if (!payload) {
    return;
  }

  switch (payload.type) {
    case "tesseract-digital-twin-scene":
      applySceneEnvelope(payload.envelope ?? payload);
      break;
    case "tesseract-digital-twin-preview-state":
      state.previewEnvelope = payload.envelope ?? payload;
      break;
    default:
      break;
  }
});

viewerFrame.addEventListener("load", () => {
  if (state.currentEnvelope) {
    const models = getSceneModels(state.currentEnvelope);
    if (models.length > 0) {
      applyTransforms(models);
    }
  }
});

showOverlay("Digital Twin", "等待主工作区下发场景数据…");
postToParent({ type: "tesseract-digital-twin-ready" });
